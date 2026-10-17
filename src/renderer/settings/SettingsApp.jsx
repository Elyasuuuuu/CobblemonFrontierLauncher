import { useCallback, useEffect, useMemo, useState } from 'react'
import Backdrop from '../shared/Backdrop.jsx'
import TitleBar from '../shared/TitleBar.jsx'
import Toggle from '../shared/Toggle.jsx'
import { api, useAccount, useUpdateStatus, useWindowEvent, plural } from '../shared/hooks.js'

const TABS = [
    { id: 'compte', label: 'Compte', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0' },
    { id: 'jeu', label: 'Jeu', icon: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M17 6H7a5 5 0 0 0 0 10h10a5 5 0 0 0 0-10Z' },
    { id: 'performances', label: 'Performances', icon: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z' },
    { id: 'mods', label: 'Mods', icon: 'M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 0v20M3 7l9 5 9-5' },
    { id: 'launcher', label: 'Launcher', icon: 'M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' },
    { id: 'apropos', label: 'À propos', icon: 'M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z' }
]

function Icon({ d, className = 'w-4 h-4' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d={d} />
        </svg>
    )
}

function Section({ title, description, children }) {
    return (
        <section className="cf-panel px-6 py-5 mb-4">
            <h2 className="font-avenirHeavy text-lg text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-cf-textDim">{description}</p>}
            <div className="mt-3">{children}</div>
        </section>
    )
}

function Row({ title, description, children }) {
    return (
        <div className="cf-row">
            <div className="min-w-0">
                <div className="text-sm font-avenirMedium text-cf-text">{title}</div>
                {description && <div className="mt-0.5 text-xs text-cf-textDim leading-relaxed">{description}</div>}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    )
}

const gb = (v) => `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Go`

// ---- Compte ----

function AccountTab() {
    const account = useAccount()
    const [confirm, setConfirm] = useState(false)

    const logout = async () => {
        const next = await api()?.account?.logout?.()
        setConfirm(false)
        if (next == null) api()?.nav?.showOnboarding?.('pseudo')
    }

    return (
        <>
            <Section title="Ton compte" description={account?.microsoft ? 'Le compte Minecraft avec lequel tu joues.' : 'Le pseudo avec lequel tu joues sur le serveur.'}>
                <div className="flex items-center gap-4 py-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cf-accent to-cf-accentDark flex items-center justify-center text-2xl font-avenirHeavy text-white">
                        {(account?.displayName ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="font-avenirHeavy text-xl text-white truncate">{account?.displayName ?? 'Aucun pseudo'}</div>
                        <div className="text-xs text-cf-textDim">{account?.microsoft ? 'Compte Microsoft' : 'Compte hors ligne, protégé en jeu par ton mot de passe'}</div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                    <button onClick={() => api()?.nav?.showOnboarding?.('skin')} className="cf-btn-primary px-5 py-2.5 text-sm">Changer de skin</button>
                    {!confirm ? (
                        <button onClick={() => setConfirm(true)} className="cf-btn-secondary px-5 py-2.5 text-sm">{account?.microsoft ? 'Se déconnecter' : 'Changer de pseudo'}</button>
                    ) : (
                        <div className="flex items-center gap-3 rounded-xl bg-[#e5484d]/15 border border-[#e5484d]/40 px-4 py-2.5 text-sm">
                            <span>{account?.microsoft ? 'Te déconnecter de ce compte Microsoft ?' : 'Ta progression en jeu est liée à ton pseudo. Changer quand même ?'}</span>
                            <button onClick={logout} className="cf-btn-red px-4 py-1.5 text-sm">Oui</button>
                            <button onClick={() => setConfirm(false)} className="text-cf-text/80 hover:text-white">Non</button>
                        </div>
                    )}
                </div>
            </Section>
            {!account?.microsoft && <Section title="Mot de passe" description="Il se gère en jeu, pas dans le launcher.">
                <ul className="text-sm text-cf-text/85 space-y-1.5 leading-relaxed">
                    <li>Première connexion : <span className="text-white font-avenirMedium">/register &lt;mot de passe&gt; &lt;mot de passe&gt;</span></li>
                    <li>Ensuite, à chaque connexion : <span className="text-white font-avenirMedium">/login &lt;mot de passe&gt;</span></li>
                    <li>Mot de passe oublié ? Demande à l'équipe sur le Discord.</li>
                </ul>
            </Section>}
        </>
    )
}

// ---- Jeu ----

function GameTab({ config, update }) {
    const [width, setWidth] = useState(String(config.width))
    const [height, setHeight] = useState(String(config.height))
    useEffect(() => { setWidth(String(config.width)); setHeight(String(config.height)) }, [config.width, config.height])

    const commit = (key, raw) => {
        const value = Number.parseInt(raw, 10)
        if (Number.isFinite(value) && value >= 320 && value <= 15360) update(key, value)
        else { setWidth(String(config.width)); setHeight(String(config.height)) }
    }
    const presets = [[1280, 720], [1600, 900], [1920, 1080]]

    return (
        <Section title="Lancement du jeu">
            <Row title="Taille de la fenêtre" description="Ignorée en plein écran.">
                <div className="flex items-center gap-2">
                    <input value={width} onChange={(e) => setWidth(e.target.value.replace(/\D/g, ''))} onBlur={() => commit('width', width)} className="cf-input !w-20 !px-2 !py-1.5 text-center text-sm" />
                    <span className="text-cf-textDim">×</span>
                    <input value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ''))} onBlur={() => commit('height', height)} className="cf-input !w-20 !px-2 !py-1.5 text-center text-sm" />
                    <div className="flex gap-1 ml-2">
                        {presets.map(([w, h]) => (
                            <button key={w} onClick={() => { update('width', w); update('height', h) }} className={'px-2 py-1 rounded-md text-xs ' + (config.width === w && config.height === h ? 'bg-white/20 text-white' : 'text-cf-textDim hover:text-white hover:bg-white/10')}>
                                {h}p
                            </button>
                        ))}
                    </div>
                </div>
            </Row>
            <Row title="Plein écran" description="Le jeu démarre directement en plein écran.">
                <Toggle checked={config.fullscreen} onChange={(v) => update('fullscreen', v)} label="Plein écran" />
            </Row>
            <Row title="Connexion automatique" description="Rejoindre le serveur dès que le jeu a démarré.">
                <Toggle checked={config.autoConnect} onChange={(v) => update('autoConnect', v)} label="Connexion automatique" />
            </Row>
            <Row title="Jeu indépendant du launcher" description="Fermer le launcher ne ferme pas le jeu.">
                <Toggle checked={config.launchDetached} onChange={(v) => update('launchDetached', v)} label="Jeu indépendant" />
            </Row>
        </Section>
    )
}

// ---- Performances ----

function PerformanceTab({ config, update }) {
    const [java, setJava] = useState(undefined)
    const [jvm, setJvm] = useState(config.jvmOptions)
    const [advanced, setAdvanced] = useState(false)
    useEffect(() => { api()?.java?.describe?.().then(setJava) }, [])

    const max = config.maxRAM
    const tooLow = max < config.ramRecommended
    const tooHigh = max > config.totalMemory * 0.75
    const setMax = (v) => {
        update('maxRAM', v)
        if (config.minRAM > v) update('minRAM', v)
    }

    return (
        <>
            <Section title="Mémoire" description={`Ton ordinateur a ${gb(Math.round(config.totalMemory))} de mémoire, dont ${gb(Math.round(config.freeMemory * 10) / 10)} libres en ce moment.`}>
                <div className="py-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-avenirMedium">Mémoire pour le jeu</span>
                        <span className="font-avenirHeavy text-white text-base">{gb(max)}</span>
                    </div>
                    <input type="range" min={config.ramFloor} max={config.ramCeiling} step={0.5} value={max} onChange={(e) => setMax(Number(e.target.value))} className="cf-range mt-3" />
                    <div className="flex justify-between text-xs text-cf-textDim mt-1">
                        <span>{gb(config.ramFloor)}</span>
                        <span>Recommandé : {gb(config.ramRecommended)}</span>
                        <span>{gb(config.ramCeiling)}</span>
                    </div>
                    {tooLow && <p className="mt-3 text-xs text-cf-orange">En dessous de {gb(config.ramRecommended)}, le pack (Cobblemon et une centaine de mods) risque de ramer ou de planter.</p>}
                    {tooHigh && <p className="mt-3 text-xs text-cf-orange">Plus des trois quarts de ta mémoire : ton ordinateur pourrait ralentir pendant que tu joues.</p>}
                </div>
                <div className="cf-row">
                    <div>
                        <div className="text-sm font-avenirMedium">Mémoire réservée au démarrage</div>
                        <div className="text-xs text-cf-textDim">La même valeur que le maximum peut réduire les petites saccades.</div>
                    </div>
                    <div className="flex items-center gap-3 w-64">
                        <input type="range" min={config.ramFloor} max={max} step={0.5} value={Math.min(config.minRAM, max)} onChange={(e) => update('minRAM', Number(e.target.value))} className="cf-range" />
                        <span className="text-sm w-14 text-right">{gb(Math.min(config.minRAM, max))}</span>
                    </div>
                </div>
            </Section>
            <Section title="Java" description={`Le jeu a besoin de Java ${config.javaMajor} (64 bits).`}>
                {java === undefined ? (
                    <p className="text-sm text-cf-textDim py-2">Vérification…</p>
                ) : java === null ? (
                    <p className="text-sm text-cf-text/85 py-2">Automatique : le launcher installe et vérifie Java tout seul. Rien à faire.</p>
                ) : (
                    <div className="py-2 text-sm">
                        <div className={java.valid ? 'text-cf-text' : 'text-[#ff8a80]'}>
                            {java.valid ? `Java ${java.version} (${java.vendor})` : 'Ce Java ne convient pas : le launcher en installera un bon au prochain lancement si tu reviens à l\'automatique.'}
                        </div>
                        <div className="mt-1 text-xs text-cf-textDim break-all">{java.path}</div>
                    </div>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                    <button onClick={async () => { const r = await api()?.java?.choose?.(); if (r !== undefined) setJava(r) }} className="cf-btn-secondary px-4 py-2 text-sm">
                        Choisir un Java…
                    </button>
                    {java !== null && java !== undefined && (
                        <button onClick={async () => { await api()?.java?.reset?.(); setJava(null) }} className="cf-btn-secondary px-4 py-2 text-sm">
                            Revenir à l'automatique
                        </button>
                    )}
                </div>
                <button onClick={() => setAdvanced(!advanced)} className="mt-4 text-xs text-cf-textDim hover:text-white transition-colors">
                    {advanced ? '▾' : '▸'} Options avancées
                </button>
                {advanced && (
                    <div className="mt-2">
                        <div className="cf-label mb-1.5">Options JVM supplémentaires</div>
                        <textarea value={jvm} onChange={(e) => setJvm(e.target.value)} onBlur={() => update('jvmOptions', jvm)} rows={3} spellCheck={false} className="cf-input font-mono text-xs leading-relaxed" />
                        <p className="mt-1 text-xs text-cf-textDim">Sans -Xmx ni -Xms : la mémoire se règle au-dessus. À ne modifier que si tu sais ce que tu fais.</p>
                    </div>
                )}
            </Section>
        </>
    )
}

// ---- Mods ----

function ModsTab() {
    const [mods, setMods] = useState(null)
    const [query, setQuery] = useState('')
    useEffect(() => { api()?.mods?.list?.().then(setMods) }, [])

    const shown = useMemo(() => (mods ?? []).filter(m => m.name.toLowerCase().includes(query.trim().toLowerCase())), [mods, query])
    const optional = (mods ?? []).filter(m => !m.required).length

    const toggle = async (mod, enabled) => {
        setMods(mods.map(m => (m.id === mod.id ? { ...m, enabled } : m)))
        await api()?.mods?.setEnabled?.(mod.id, enabled)
    }

    return (
        <Section
            title="Mods du pack"
            description={mods == null ? 'Chargement…' : `${plural(mods.length, 'mod installé', 'mods installés')} et tenus à jour par le launcher${optional ? `, dont ${optional} facultatif${optional > 1 ? 's' : ''}` : ''}.`}
        >
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un mod…" className="cf-input !py-2 text-sm" />
            <div className="mt-3 max-h-[360px] overflow-y-auto pr-1">
                {shown.map(mod => (
                    <div key={mod.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-b-0">
                        <div className="min-w-0">
                            <div className="text-sm text-cf-text truncate">{mod.name}</div>
                            <div className="text-xs text-cf-textDim">v{mod.version}</div>
                        </div>
                        {mod.required ? (
                            <span className="text-[10px] uppercase tracking-wide text-cf-textDim border border-white/15 rounded-full px-2 py-0.5">Indispensable</span>
                        ) : (
                            <Toggle checked={mod.enabled} onChange={(v) => toggle(mod, v)} label={mod.name} />
                        )}
                    </div>
                ))}
                {mods != null && shown.length === 0 && <p className="text-sm text-cf-textDim py-3">Aucun mod ne correspond.</p>}
            </div>
        </Section>
    )
}

// ---- Launcher ----

function LauncherTab({ config, reload }) {
    const update = useUpdateStatus()
    const [checking, setChecking] = useState(false)
    const version = api()?.updater?.version?.() ?? '?'

    useEffect(() => {
        if (update != null && update.state !== 'checking') setChecking(false)
    }, [update])

    const check = () => {
        setChecking(true)
        api()?.updater?.check?.()
        setTimeout(() => setChecking(false), 15000)
    }

    let status = 'Les mises à jour arrivent toutes seules au démarrage.'
    if (checking || update?.state === 'checking') status = 'Recherche en cours…'
    else if (update?.state === 'latest') status = 'Tu as la dernière version.'
    else if (update?.state === 'downloading') status = `Version ${update.version} en cours de téléchargement…`
    else if (update?.state === 'ready') status = `Version ${update.version} prête à être installée.`
    else if (update?.state === 'error') status = 'Impossible de vérifier pour le moment.'

    return (
        <>
            <Section title="Mises à jour du launcher">
                <Row title={`Version ${version}`} description={status}>
                    {update?.state === 'ready' ? (
                        <button onClick={() => api()?.updater?.installNow?.()} className="cf-btn-primary px-4 py-2 text-sm">Installer et redémarrer</button>
                    ) : (
                        <button onClick={check} disabled={checking} className="cf-btn-secondary px-4 py-2 text-sm disabled:opacity-50">Rechercher</button>
                    )}
                </Row>
            </Section>
            <Section title="Dossier des données" description="Les fichiers du jeu, Java, tes captures d'écran et les réglages du jeu sont rangés ici.">
                <div className="cf-input !py-2 text-xs text-cf-textDim break-all">{config.dataDirectory}</div>
                <div className="flex flex-wrap gap-3 mt-3">
                    <button onClick={() => api()?.shell?.openPath?.(config.dataDirectory)} className="cf-btn-secondary px-4 py-2 text-sm">Ouvrir le dossier</button>
                    <button onClick={async () => { if (await api()?.config?.chooseDataDirectory?.()) reload() }} className="cf-btn-secondary px-4 py-2 text-sm">Changer de dossier…</button>
                </div>
                <p className="mt-2 text-xs text-cf-textDim">Dans un nouveau dossier, le launcher retélécharge les fichiers du jeu au prochain lancement.</p>
            </Section>
        </>
    )
}

// ---- À propos ----

function AboutTab() {
    const links = api()?.links ?? {}
    const version = api()?.updater?.version?.() ?? '?'
    return (
        <Section title="Cobblemon Frontier Launcher">
            <div className="flex items-center gap-4 py-2">
                <img src="assets/images/SealCircle.png" className="w-16 h-16 rounded-full" />
                <div>
                    <div className="font-avenirHeavy text-xl text-white">Cobblemon Frontier</div>
                    <div className="text-sm text-cf-textDim">Launcher, version {version}</div>
                </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
                {links.site && <button onClick={() => api()?.shell?.openExternal?.(links.site)} className="cf-btn-secondary px-4 py-2 text-sm">Site du serveur</button>}
                {links.discord && <button onClick={() => api()?.shell?.openExternal?.(links.discord)} className="cf-btn-secondary px-4 py-2 text-sm">Discord</button>}
            </div>
            <p className="mt-5 text-xs text-cf-textDim leading-relaxed">
                Basé sur Helios Launcher (licence MIT). Minecraft est une marque de Mojang Studios ; Cobblemon Frontier n'est pas affilié à Mojang ni à Microsoft.
            </p>
        </Section>
    )
}

/** Paramètres du launcher et du jeu. */
export default function SettingsApp() {
    const [tab, setTab] = useState('compte')
    const [config, setConfig] = useState(null)

    const reload = useCallback(() => { api()?.config?.get?.().then(setConfig) }, [])
    useEffect(reload, [reload])
    useWindowEvent('cobblemon:settings', useCallback((detail) => {
        setTab(detail?.tab ?? 'compte')
        reload()
    }, [reload]))

    const update = useCallback((key, value) => {
        setConfig((c) => (c == null ? c : { ...c, [key]: value }))
        api()?.config?.set?.(key, value)
    }, [])

    return (
        <div className="relative w-full h-full flex flex-col font-avenir text-cf-text overflow-hidden">
            <Backdrop blurred parallax={false} />
            <TitleBar>
                <button onClick={() => api()?.nav?.closeSettings?.()} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-white/85 hover:text-white hover:bg-white/10 transition-colors">
                    ← Retour
                </button>
                <span className="font-avenirHeavy text-white">Paramètres</span>
            </TitleBar>
            <div className="relative flex-1 min-h-0 flex gap-5 px-6 pb-6">
                <nav className="w-52 flex-shrink-0 cf-panel p-2 h-fit">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-avenirMedium transition-colors ' + (tab === t.id ? 'bg-gradient-to-br from-cf-orange to-cf-orangeDark text-white' : 'text-cf-text/75 hover:text-white hover:bg-white/10')}
                        >
                            <Icon d={t.icon} />
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div className="flex-1 min-w-0 overflow-y-auto pr-1">
                    {tab === 'compte' && <AccountTab />}
                    {tab === 'jeu' && (config ? <GameTab config={config} update={update} /> : null)}
                    {tab === 'performances' && (config ? <PerformanceTab config={config} update={update} /> : null)}
                    {tab === 'mods' && <ModsTab />}
                    {tab === 'launcher' && (config ? <LauncherTab config={config} reload={reload} /> : null)}
                    {tab === 'apropos' && <AboutTab />}
                </div>
            </div>
        </div>
    )
}
