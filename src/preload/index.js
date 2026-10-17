/**
 * Pont entre l'interface React (src/renderer) et la logique héritée
 * d'Helios (app/assets/js/**). contextIsolation est encore désactivé, donc
 * c'est une simple affectation `window.cobblemonAPI = {...}` ; le jour où
 * il passe à contextBridge, seul ce fichier change, pas les écrans React.
 *
 * Les modules hérités sont chargés par un chemin calculé à l'exécution
 * (path.join(...)) : un bundler ne peut pas le résoudre, il laisse donc un
 * vrai require() et n'embarque jamais cette arborescence ici.
 *
 * Les fonctions globales des anciens scripts (switchView, VIEWS,
 * updateSelectedAccount, proc…) ne sont lues qu'au moment de l'appel : elles
 * n'existent pas encore quand ce preload s'exécute.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { ipcRenderer, shell } = require('electron')
const remote = require('@electron/remote')
const { getServerStatus } = require('helios-core/mojang')
const { validateSelectedJvm, ensureJavaDirIsRoot } = require('helios-core/java')

const legacyJsDir = path.join(__dirname, '..', 'assets', 'js')

// Même démarrage qu'avant (configuration, distribution, dossier natif temporaire).
require(path.join(legacyJsDir, 'preloader.js'))

const ConfigManager = require(path.join(legacyJsDir, 'configmanager.js'))
const { DistroAPI } = require(path.join(legacyJsDir, 'distromanager.js'))
const AuthManager = require(path.join(legacyJsDir, 'authmanager.js'))
const LangLoader = require(path.join(legacyJsDir, 'langloader.js'))
const { SKIN_API_BASE, SKIN_API_KEY, MSFT_OPCODE, MSFT_REPLY_TYPE, MSFT_ERROR, AZURE_CLIENT_ID } = require(path.join(legacyJsDir, 'ipcconstants.js'))

const GiB = 1024 * 1024 * 1024
const MOD_TYPES = ['FabricMod', 'ForgeMod', 'LiteMod', 'LiteLoader']

function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }))
}

function listen(name, callback) {
    const handler = (e) => callback(e.detail)
    window.addEventListener(name, handler)
    return () => window.removeEventListener(name, handler)
}

function publicAccount(acc) {
    return acc == null ? null : { uuid: acc.uuid, username: acc.username, displayName: acc.displayName, microsoft: acc.type === 'microsoft' }
}

/** Un compte vient d'être ajouté : sélectionné, enregistré, annoncé à l'interface. */
function selectionner(acc) {
    ConfigManager.save()
    if (typeof updateSelectedAccount === 'function') updateSelectedAccount(acc)
    emit('cobblemon:account', publicAccount(acc))
    return publicAccount(acc)
}

function stripHtml(text) {
    return String(text ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
}

async function selectedServer() {
    const distro = await DistroAPI.getDistribution()
    const server = distro.getServerById(ConfigManager.getSelectedServer()) ?? distro.getMainServer()
    ConfigManager.ensureJavaConfig(server.rawServer.id, server.effectiveJavaOptions, server.rawServer.javaOptions?.ram)
    return server
}

/** '4G' / '6144M' -> gigaoctets. */
function ramToGB(value) {
    const m = /^(\d+(?:\.\d+)?)([MG])$/i.exec(String(value ?? ''))
    if (!m) return 0
    return m[2].toUpperCase() === 'G' ? Number(m[1]) : Number(m[1]) / 1024
}

function gbToRam(gb) {
    return Number.isInteger(gb) ? `${gb}G` : `${Math.round(gb * 1024)}M`
}

/**
 * Une seule fois : 4 Go, l'ancienne valeur par défaut d'Helios, est trop
 * juste pour ce pack (Cobblemon et une centaine de mods). Passée à 6 Go si
 * l'ordinateur a au moins 12 Go ; un choix fait ensuite par le joueur n'est
 * jamais touché.
 */
function migrateDefaultMemoryOnce() {
    try {
        const marker = path.join(ConfigManager.getLauncherDirectory(), 'memoire-6go-verifiee')
        if (fs.existsSync(marker)) return
        const sid = ConfigManager.getSelectedServer()
        if (sid != null && os.totalmem() >= 12 * GiB && ConfigManager.getMaxRAM(sid) === '4G') {
            ConfigManager.setMaxRAM(sid, '6G')
            ConfigManager.save()
        }
        fs.writeFileSync(marker, 'Mémoire par défaut vérifiée (4 Go -> 6 Go si au moins 12 Go).\n')
    } catch {
        // Pas encore de configuration Java pour ce serveur : la valeur par défaut viendra de la distribution.
    }
}
migrateDefaultMemoryOnce()

// Dernier état connu de la mise à jour automatique, gardé dès le chargement :
// les évènements peuvent arriver avant que React soit monté.
let updateStatus = null
ipcRenderer.on('autoUpdateNotification', (_event, arg, info) => {
    const next = {
        'checking-for-update': { state: 'checking' },
        'update-available': { state: 'downloading', version: info?.version ?? '' },
        'update-downloaded': { state: 'ready', version: info?.version ?? '' },
        'update-not-available': { state: 'latest' },
        realerror: { state: 'error' }
    }[arg]
    if (next == null) return
    // « À jour » ou « erreur » ne remplacent pas une mise à jour déjà trouvée.
    if ((next.state === 'latest' || next.state === 'error') && (updateStatus?.state === 'downloading' || updateStatus?.state === 'ready')) return
    updateStatus = next
    emit('cobblemon:update', updateStatus)
})

async function postSkin(endpoint, init) {
    const res = await fetch(`${SKIN_API_BASE}${endpoint}`, init)
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `erreur ${res.status}`)
    }
}

/* global switchView, getCurrentView, VIEWS, updateSelectedAccount, proc */
function goTo(view) {
    if (typeof switchView !== 'function') return
    if (getCurrentView() === view) return
    switchView(getCurrentView(), view, 250, 250)
}

window.cobblemonAPI = {
    window: {
        minimize: () => ipcRenderer.send('cobblemon:window-minimize'),
        maximize: () => ipcRenderer.send('cobblemon:window-maximize'),
        close: () => ipcRenderer.send('cobblemon:window-close'),
        isMaximized: () => ipcRenderer.invoke('cobblemon:window-is-maximized')
    },

    app: {
        version: () => remote.app.getVersion()
    },

    account: {
        getSelected: () => publicAccount(ConfigManager.getSelectedAccount()),

        /** Sortes de comptes acceptées : ['microsoft'], ['pseudo'] ou les deux (cf. ipcconstants.AUTH_MODES). */
        modes: () => AuthManager.modes(),

        /** Fenêtre de connexion Microsoft (processus principal), puis compte Minecraft du joueur. */
        loginMicrosoft() {
            if (!AZURE_CLIENT_ID) {
                return Promise.reject(new Error("La connexion Microsoft n'est pas encore ouverte sur ce launcher."))
            }
            return new Promise((resolve, reject) => {
                ipcRenderer.once(MSFT_OPCODE.REPLY_LOGIN, async (_event, type, payload) => {
                    if (type !== MSFT_REPLY_TYPE.SUCCESS) {
                        reject(new Error(payload === MSFT_ERROR.ALREADY_OPEN ? 'Une fenêtre de connexion est déjà ouverte.' : 'Connexion annulée.'))
                        return
                    }
                    if (payload?.code == null) {
                        reject(new Error(payload?.error_description ? stripHtml(payload.error_description) : 'Microsoft a refusé la connexion.'))
                        return
                    }
                    try {
                        resolve(selectionner(await AuthManager.addMicrosoftAccount(payload.code)))
                    } catch (err) {
                        reject(new Error(stripHtml(err?.desc ?? err?.message ?? 'Connexion impossible.')))
                    }
                })
                ipcRenderer.send(MSFT_OPCODE.OPEN_LOGIN)
            })
        },

        /** Crée (ou reprend) le pseudo hors ligne et le sélectionne. */
        async create(username) {
            let acc
            try {
                acc = await AuthManager.addOfflineAccount(String(username ?? '').trim())
            } catch (err) {
                throw new Error(stripHtml(err?.desc ?? err?.message ?? 'Pseudo invalide.'))
            }
            ConfigManager.save()
            if (typeof updateSelectedAccount === 'function') updateSelectedAccount(acc)
            emit('cobblemon:account', publicAccount(acc))
            return publicAccount(acc)
        },

        /** Oublie le pseudo choisi ; s'il en reste un autre, il prend sa place. */
        async logout() {
            const current = ConfigManager.getSelectedAccount()
            if (current != null) {
                if (current.type === 'microsoft') {
                    await AuthManager.removeMicrosoftAccount(current.uuid)
                } else {
                    await AuthManager.removeMojangAccount(current.uuid)
                }
            }
            const next = Object.values(ConfigManager.getAuthAccounts())[0] ?? null
            if (next != null) {
                ConfigManager.setSelectedAccount(next.uuid)
                ConfigManager.save()
                if (typeof updateSelectedAccount === 'function') updateSelectedAccount(next)
            }
            emit('cobblemon:account', publicAccount(next))
            return publicAccount(next)
        },

        onChange: (callback) => listen('cobblemon:account', callback)
    },

    skin: {
        /** Copie le skin d'un compte Minecraft existant (appliqué en jeu par le serveur). */
        copyFrom(minecraftName) {
            return postSkin('/skin/mojang', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': SKIN_API_KEY },
                body: JSON.stringify({ username: ConfigManager.getSelectedAccount()?.username, mojangName: minecraftName })
            })
        },

        /** Envoie une image de skin (PNG 64×64 ou 64×32). */
        upload(file) {
            const form = new FormData()
            form.append('username', ConfigManager.getSelectedAccount()?.username ?? '')
            form.append('skin', file)
            return postSkin('/skin/upload', { method: 'POST', headers: { 'X-Api-Key': SKIN_API_KEY }, body: form })
        }
    },

    config: {
        async get() {
            const server = await selectedServer()
            const sid = server.rawServer.id
            const ram = server.rawServer.javaOptions?.ram
            return {
                width: ConfigManager.getGameWidth(),
                height: ConfigManager.getGameHeight(),
                fullscreen: ConfigManager.getFullscreen(),
                autoConnect: ConfigManager.getAutoConnect(),
                launchDetached: ConfigManager.getLaunchDetached(),
                minRAM: ramToGB(ConfigManager.getMinRAM(sid)),
                maxRAM: ramToGB(ConfigManager.getMaxRAM(sid)),
                ramFloor: ConfigManager.getAbsoluteMinRAM(ram),
                ramCeiling: ConfigManager.getAbsoluteMaxRAM(ram),
                ramRecommended: ram?.recommended != null ? ram.recommended / 1024 : 6,
                totalMemory: os.totalmem() / GiB,
                freeMemory: os.freemem() / GiB,
                jvmOptions: (ConfigManager.getJVMOptions(sid) ?? []).join(' '),
                dataDirectory: ConfigManager.getDataDirectory(),
                javaMajor: server.effectiveJavaOptions.suggestedMajor
            }
        },

        async set(key, value) {
            const server = await selectedServer()
            const sid = server.rawServer.id
            switch (key) {
                case 'width': ConfigManager.setGameWidth(value); break
                case 'height': ConfigManager.setGameHeight(value); break
                case 'fullscreen': ConfigManager.setFullscreen(Boolean(value)); break
                case 'autoConnect': ConfigManager.setAutoConnect(Boolean(value)); break
                case 'launchDetached': ConfigManager.setLaunchDetached(Boolean(value)); break
                case 'minRAM': ConfigManager.setMinRAM(sid, gbToRam(value)); break
                case 'maxRAM': ConfigManager.setMaxRAM(sid, gbToRam(value)); break
                case 'jvmOptions': ConfigManager.setJVMOptions(sid, String(value).trim() ? String(value).trim().split(/\s+/) : []); break
                default: throw new Error('Réglage inconnu : ' + key)
            }
            ConfigManager.save()
        },

        async chooseDataDirectory() {
            const res = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
                title: LangLoader.queryEJS('settings.selectDataDirectory'),
                properties: ['openDirectory', 'createDirectory'],
                defaultPath: ConfigManager.getDataDirectory()
            })
            if (res.canceled || res.filePaths.length === 0) return null
            ConfigManager.setDataDirectory(res.filePaths[0])
            ConfigManager.save()
            return res.filePaths[0]
        }
    },

    java: {
        /** Java utilisé pour ce serveur : null s'il sera installé automatiquement au prochain lancement. */
        async describe() {
            const server = await selectedServer()
            const exe = ConfigManager.getJavaExecutable(server.rawServer.id)
            if (exe == null) return null
            const details = await validateSelectedJvm(ensureJavaDirIsRoot(exe), server.effectiveJavaOptions.supported).catch(() => null)
            return details == null ? { path: exe, valid: false } : { path: exe, valid: true, version: details.semverStr, vendor: details.vendor }
        },

        async choose() {
            const res = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
                title: LangLoader.queryEJS('settings.javaExecSelDialogTitle'),
                properties: ['openFile'],
                filters: process.platform === 'win32' ? [{ name: 'Java', extensions: ['exe'] }] : []
            })
            if (res.canceled || res.filePaths.length === 0) return undefined
            const server = await selectedServer()
            ConfigManager.setJavaExecutable(server.rawServer.id, res.filePaths[0])
            ConfigManager.save()
            return this.describe()
        },

        /** Revenir au Java géré par le launcher (vérifié, et installé si besoin, au prochain lancement). */
        async reset() {
            const server = await selectedServer()
            ConfigManager.setJavaExecutable(server.rawServer.id, null)
            ConfigManager.save()
        }
    },

    mods: {
        async list() {
            const server = await selectedServer()
            const conf = ConfigManager.getModConfiguration(server.rawServer.id)?.mods ?? {}
            return server.modules
                .filter(mdl => MOD_TYPES.includes(mdl.rawModule.type))
                .map(mdl => {
                    const id = mdl.getVersionlessMavenIdentifier()
                    const required = mdl.getRequired().value
                    const saved = conf[id]
                    const enabled = required ? true : (saved != null && typeof saved === 'object' ? saved.value : (saved ?? mdl.getRequired().def))
                    return { id, name: mdl.rawModule.name, version: mdl.mavenComponents.version, required, enabled: Boolean(enabled) }
                })
                .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        },

        async setEnabled(id, enabled) {
            const server = await selectedServer()
            const modConf = ConfigManager.getModConfiguration(server.rawServer.id)
            const current = modConf.mods[id]
            if (current != null && typeof current === 'object') current.value = Boolean(enabled)
            else modConf.mods[id] = Boolean(enabled)
            ConfigManager.setModConfiguration(server.rawServer.id, modConf)
            ConfigManager.save()
        }
    },

    server: {
        async getSelectedStatus() {
            try {
                const server = await selectedServer()
                const status = await getServerStatus(47, server.hostname, server.port)
                return { online: true, playersOnline: status.players.online, playersMax: status.players.max }
            } catch {
                return { online: false }
            }
        },

        async info() {
            const server = await selectedServer()
            return { name: server.rawServer.name, version: server.rawServer.version, minecraft: server.rawServer.minecraftVersion }
        }
    },

    shell: {
        openExternal: (url) => shell.openExternal(url),
        openPath: (target) => shell.openPath(target)
    },

    // Liens du serveur, pris dans app/assets/lang/_custom.toml.
    links: {
        discord: LangLoader.queryEJS('landing.mediaDiscordURL'),
        site: LangLoader.queryEJS('landing.mediaGitHubURL')
    },

    updater: {
        version: () => remote.app.getVersion(),
        getStatus: () => updateStatus,
        // Appelle callback(état) tout de suite si un état est connu, puis à chaque changement.
        onStatus(callback) {
            if (updateStatus != null) callback(updateStatus)
            return listen('cobblemon:update', callback)
        },
        check: () => ipcRenderer.send('autoUpdateAction', 'checkForUpdate'),
        installNow: () => ipcRenderer.send('autoUpdateAction', 'installUpdateNow')
    },

    // Le téléchargement et le lancement restent ceux d'Helios (landing.js,
    // caché) : on clique son vrai bouton, et sa progression arrive par
    // l'évènement cobblemon:launch.
    launch: {
        trigger() {
            const btn = document.getElementById('launch_button')
            if (btn != null) btn.click()
        },
        stop() {
            if (typeof proc !== 'undefined' && proc != null) proc.kill()
        },
        isRunning() {
            return typeof proc !== 'undefined' && proc != null
        },
        getState: () => ({ ...(window.cobblemonLaunchState ?? { loading: false, details: '', percent: 0 }) }),
        onState: (callback) => listen('cobblemon:launch', callback)
    },

    // Fenêtres de dialogue d'Helios (overlay.js), dessinées par DialogHost.
    dialog: {
        getState: () => window.cobblemonOverlayState ?? { open: false },
        onChange: (callback) => listen('cobblemon:overlay', callback),
        acknowledge: () => document.getElementById('overlayAcknowledge')?.click(),
        dismiss: () => document.getElementById('overlayDismiss')?.click()
    },

    nav: {
        showLanding: () => goTo(VIEWS.landing),
        showOnboarding(step) {
            emit('cobblemon:onboarding', { step: step ?? 'welcome' })
            goTo(VIEWS.onboarding)
        },
        openSettings(tab) {
            emit('cobblemon:settings', { tab: tab ?? 'compte' })
            goTo(VIEWS.reactSettings)
        },
        closeSettings: () => goTo(VIEWS.landing)
    }
}
