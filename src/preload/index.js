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
const { SKIN_API_BASE, SERVEUR_COMPTE } = require(path.join(legacyJsDir, 'ipcconstants.js'))

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
    return acc == null ? null : { uuid: acc.uuid, username: acc.username, displayName: acc.displayName, connecte: Boolean(acc.jeton) }
}

// ---- compte Cobblemon Frontier (0.4.0) : connexion dans le launcher, plus de mot de passe à taper en jeu ----
// L'API (infra/launcher-api du dépôt principal) vérifie le mot de passe d'AuthMe et rend un jeton de session ; au clic
// sur Jouer, elle donne un ticket à usage unique que le mod envoie au serveur (connexion sans la fenêtre du jeu).

async function appelCompte(chemin, { methode = 'POST', corps, jeton } = {}) {
    const entetes = {}
    if (corps !== undefined) entetes['Content-Type'] = 'application/json'
    if (jeton) entetes.Authorization = `Bearer ${jeton}`
    const controle = new AbortController()
    const minuteur = setTimeout(() => controle.abort(), 15000)
    let res
    try {
        res = await fetch(`${SKIN_API_BASE}${chemin}`, {
            method: methode, headers: entetes, body: corps === undefined ? undefined : JSON.stringify(corps), signal: controle.signal
        })
    } catch {
        const erreur = new Error('Impossible de joindre le serveur : vérifie ta connexion internet.')
        erreur.code = 'reseau'
        throw erreur
    } finally {
        clearTimeout(minuteur)
    }
    const donnees = await res.json().catch(() => ({}))
    if (!res.ok) {
        const erreur = new Error(donnees.error || `Erreur ${res.status}`)
        erreur.code = donnees.code || (res.status === 401 ? 'session' : String(res.status))
        erreur.status = res.status
        throw erreur
    }
    return donnees
}

/** Garde le compte connecté (pseudo exact d'AuthMe, qui fait l'UUID du joueur) et son jeton ; c'est le seul compte. */
async function enregistrerCompte(pseudo, jeton) {
    for (const acc of Object.values(ConfigManager.getAuthAccounts())) {
        if (acc.username !== pseudo) ConfigManager.removeAuthAccount(acc.uuid)
    }
    const acc = await AuthManager.addOfflineAccount(pseudo)
    acc.jeton = jeton
    ConfigManager.setSelectedAccount(acc.uuid)
    ConfigManager.save()
    if (typeof updateSelectedAccount === 'function') updateSelectedAccount(acc)
    emit('cobblemon:account', publicAccount(acc))
    return publicAccount(acc)
}

/** Session refusée par l'API (mot de passe changé, jeton expiré) : on oublie le jeton, le launcher redemandera. */
function oublierJeton() {
    const acc = ConfigManager.getSelectedAccount()
    if (acc?.jeton) {
        delete acc.jeton
        ConfigManager.save()
        emit('cobblemon:account', publicAccount(acc))
    }
}

/**
 * Appelé par landing.js juste avant de lancer le jeu : dépose le ticket de la partie dans le dossier du jeu, où le mod
 * le lit à la connexion au serveur. Sans réseau ou sans session, rien : la fenêtre du mot de passe s'ouvrira en jeu.
 */
window.cobblemonPreparerTicket = async function (serverId) {
    const fichier = path.join(ConfigManager.getInstanceDirectory(), String(serverId), 'cobblemonfrontier-ticket')
    try { fs.rmSync(fichier, { force: true }) } catch { /* rien */ }
    const acc = ConfigManager.getSelectedAccount()
    if (!acc?.jeton) return false
    try {
        const { ticket } = await appelCompte('/compte/ticket', { corps: {}, jeton: acc.jeton })
        fs.mkdirSync(path.dirname(fichier), { recursive: true })
        fs.writeFileSync(fichier, ticket, { mode: 0o600 })
        return true
    } catch (err) {
        if (err.status === 401) oublierJeton()
        return false
    }
}

/** Au démarrage : le jeton vaut-il encore ? Sinon, retour à l'écran de connexion (pseudo prérempli). */
setTimeout(async () => {
    const acc = ConfigManager.getSelectedAccount()
    if (!acc?.jeton) return
    try {
        await appelCompte('/compte/moi', { methode: 'GET', jeton: acc.jeton })
    } catch (err) {
        if (err.status === 401) {
            oublierJeton()
            emit('cobblemon:onboarding', { step: 'pseudo' })
            goTo(VIEWS.onboarding)
        }
    }
}, 4000)

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

/**
 * Une seule fois (0.3.2, 2026-11-08) : la valeur par défaut des versions précédentes était celle de la distribution,
 * « 8192M », pour le maximum ET la mémoire réservée au démarrage. Sur un PC de 16 Go, c'était trop (95 % de mémoire
 * utilisée, jeu figé). Seules ces valeurs jamais touchées sont corrigées : un choix fait dans les paramètres s'écrit
 * « 8G », « 6G »… et n'est jamais changé.
 */
function adaptDefaultMemoryOnce() {
    try {
        const marker = path.join(ConfigManager.getLauncherDirectory(), 'memoire-adaptee-0.3.2')
        if (fs.existsSync(marker)) return
        const ram = { minimum: 4096 }
        const conseillee = ConfigManager.memoireConseillee(ram)
        let change = false
        for (const sid of ConfigManager.getJavaConfigServerIds()) {
            let max = ramToGB(ConfigManager.getMaxRAM(sid))
            if (ConfigManager.getMaxRAM(sid) === '8192M' && conseillee < 8) {
                ConfigManager.setMaxRAM(sid, `${conseillee}G`)
                max = conseillee
                change = true
            }
            if (ConfigManager.getMinRAM(sid) === '8192M' || ramToGB(ConfigManager.getMinRAM(sid)) > max) {
                ConfigManager.setMinRAM(sid, `${ConfigManager.memoireAuDemarrage(ram, max)}G`)
                change = true
            }
        }
        if (change) ConfigManager.save()
        fs.writeFileSync(marker, `Mémoire adaptée à l'ordinateur (conseillé : ${conseillee} Go).\n`)
    } catch {
        // Pas encore de configuration : la valeur par défaut, adaptée, viendra à la première sélection du serveur.
    }
}
adaptDefaultMemoryOnce()

// Dernier état connu de la mise à jour automatique, gardé dès le chargement :
// les évènements peuvent arriver avant que React soit monté.
let updateStatus = null

function publierMiseAJour(etat) {
    updateStatus = etat
    emit('cobblemon:update', updateStatus)
}

// Mise à jour sans clic (0.4.1, demande de l'utilisateur) : une version téléchargée s'installe toute seule, en silence,
// puis le launcher redémarre. Jamais pendant le téléchargement ou le lancement du jeu, ni pendant une partie : on attend
// que le launcher soit au repos, puis on prévient DECOMPTE_S secondes avant. Un clic sur Jouer pendant le décompte
// l'annule, et on attend de nouveau. Si le launcher est fermé avant, electron-updater installe en silence à la fermeture.
const DECOMPTE_S = 5
// Version téléchargée et prête : gardée à part, car les vérifications suivantes (toutes les 30 min) refont passer
// l'état par « checking » puis « downloading ».
let versionPrete = null
let minuterieInstallation = null

function launcherOccupe() {
    return Boolean(window.cobblemonLaunchState?.loading) || (typeof proc !== 'undefined' && proc != null)
}

function installerQuandCalme() {
    if (minuterieInstallation != null) return
    let reste = DECOMPTE_S
    minuterieInstallation = setInterval(() => {
        if (launcherOccupe()) {
            if (updateStatus?.state !== 'ready') publierMiseAJour({ state: 'ready', version: versionPrete })
            reste = DECOMPTE_S
            return
        }
        if (reste <= 0) {
            clearInterval(minuterieInstallation)
            // Remis à zéro : si l'installation échoue, le prochain « update-downloaded » (vérification suivante) relance.
            minuterieInstallation = null
            ipcRenderer.send('autoUpdateAction', 'installUpdateNow')
            return
        }
        publierMiseAJour({ state: 'installing', version: versionPrete, secondes: reste })
        reste--
    }, 1000)
}

ipcRenderer.on('autoUpdateNotification', (_event, arg, info) => {
    if (arg === 'update-downloaded') {
        versionPrete = info?.version ?? ''
        if (updateStatus?.state !== 'installing') publierMiseAJour({ state: 'ready', version: versionPrete })
        installerQuandCalme()
    }
    // Une version est prête : son installation (décompte ou attente de la fin de la partie) garde l'affichage.
    if (versionPrete != null) return
    const next = {
        'checking-for-update': { state: 'checking' },
        'update-available': { state: 'downloading', version: info?.version ?? '' },
        'update-downloaded': { state: 'ready', version: info?.version ?? '' },
        'update-not-available': { state: 'latest' },
        realerror: { state: 'error' }
    }[arg]
    if (next == null) return
    // « À jour » ne remplace pas une mise à jour déjà trouvée, et une erreur ne remplace pas une mise à jour prête à
    // installer. Mais une erreur pendant le téléchargement doit se voir : sinon « en téléchargement » restait affiché (0.3.3).
    if (next.state === 'latest' && (updateStatus?.state === 'downloading' || updateStatus?.state === 'ready')) return
    if (next.state === 'error' && updateStatus?.state === 'ready') return
    updateStatus = next
    emit('cobblemon:update', updateStatus)
})

/** Le skin ne change que pour le compte connecté : l'API le lit dans le jeton (0.4.0). */
function enteteSession() {
    const jeton = ConfigManager.getSelectedAccount()?.jeton
    if (!jeton) throw new Error('Connecte-toi à ton compte pour changer de skin.')
    return { Authorization: `Bearer ${jeton}` }
}

async function postSkin(endpoint, init) {
    const res = await fetch(`${SKIN_API_BASE}${endpoint}`, init)
    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 401) oublierJeton()
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

        /**
         * Connexion au compte (pseudo + mot de passe du jeu) ; creer = créer le compte. Rend le compte public, ou lève une
         * erreur au message lisible (code : inconnu, existe, mot_de_passe, mot_de_passe_refuse, reseau…).
         */
        async connexion(pseudo, motDePasse, creer = false) {
            const corps = { serveur: SERVEUR_COMPTE, pseudo: String(pseudo ?? '').trim(), motDePasse: String(motDePasse ?? '') }
            const reponse = await appelCompte(creer ? '/compte/inscription' : '/compte/connexion', { corps })
            return enregistrerCompte(reponse.pseudo, reponse.jeton)
        },

        /** Crée (ou reprend) le pseudo hors ligne et le sélectionne (ancien parcours, sans compte). */
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
            if (current?.jeton) await appelCompte('/compte/deconnexion', { corps: {}, jeton: current.jeton }).catch(() => {})
            if (current != null) await AuthManager.removeMojangAccount(current.uuid)
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
                headers: { 'Content-Type': 'application/json', ...enteteSession() },
                body: JSON.stringify({ mojangName: minecraftName })
            })
        },

        /** Envoie une image de skin (PNG 64×64 ou 64×32). */
        upload(file) {
            const form = new FormData()
            form.append('skin', file)
            return postSkin('/skin/upload', { method: 'POST', headers: enteteSession(), body: form })
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
                ramRecommended: ConfigManager.memoireConseillee(ram),
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
        // Seulement des liens web (0.3.3) : l'interface ne doit pas pouvoir lancer un fichier ou un protocole local.
        openExternal: (url) => (/^https?:\/\//i.test(String(url)) ? shell.openExternal(url) : Promise.resolve()),
        // Seulement le dossier des données du jeu ou ce qu'il contient (0.3.3) : l'interface n'ouvre pas n'importe quel fichier.
        openPath: (target) => {
            const cible = path.resolve(String(target || ''))
            const base = path.resolve(ConfigManager.getDataDirectory())
            if (cible !== base && !cible.startsWith(base + path.sep)) return Promise.resolve('chemin refusé')
            return shell.openPath(cible)
        }
    },

    // Liens du serveur, pris dans app/assets/lang/_custom.toml.
    links: {
        discord: LangLoader.queryEJS('landing.mediaDiscordURL'),
        site: LangLoader.queryEJS('landing.mediaGitHubURL'),
        // Page des sites de vote (0.3.3) : voter rapporte des récompenses en jeu.
        vote: `${String(LangLoader.queryEJS('landing.mediaGitHubURL') || 'https://cobblemon-frontier.fr').replace(/\/+$/, '')}/voter`
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
