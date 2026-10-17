import { useState } from 'react'
import { useNews, typeLabel, formatShortDate } from '../hooks/useNews.js'
import { useGameRunning, useLaunchState, useUpdateStatus } from '../../shared/hooks.js'
import NewsDetailPanel from './NewsDetailPanel.jsx'

function StatusDot({ online }) {
    return <span className={'inline-block w-1.75 h-1.75 rounded-full ' + (online ? 'bg-cf-green' : 'bg-neutral-500')} />
}

function TypeIcon({ type }) {
    if (type === 'annonce') {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" />
                <path d="M16 8a4 4 0 0 1 0 8" />
                <path d="M19 5a8 8 0 0 1 0 14" />
            </svg>
        )
    }
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <rect x="5" y="3" width="14" height="18" rx="1.5" />
            <line x1="8.5" y1="8" x2="15.5" y2="8" />
            <line x1="8.5" y1="12" x2="15.5" y2="12" />
            <line x1="8.5" y1="16" x2="13" y2="16" />
        </svg>
    )
}

function NewsCard({ article, onOpen }) {
    const style = article.image
        ? {
            backgroundImage: `linear-gradient(to top, rgba(12,12,17,0.92), rgba(12,12,17,0.25)), url('${article.image}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }
        : undefined

    return (
        <div
            onClick={() => onOpen(article)}
            style={style}
            className="cf-card relative flex-1 min-w-0 h-[130px] p-3.5 flex flex-col justify-end gap-1 cursor-pointer transition-[border-color,transform,box-shadow] duration-150 hover:border-cf-accent hover:-translate-y-1 hover:shadow-lg"
        >
            <span className="absolute top-3 right-3 text-cf-accentLight">
                <TypeIcon type={article.type} />
            </span>
            <div className="text-xs text-cf-textDim">{typeLabel(article.type)} · {formatShortDate(article.date)}</div>
            <div className="font-avenirMedium text-sm text-cf-text leading-snug line-clamp-2">{article.title}</div>
        </div>
    )
}

function UpdateNotice() {
    const update = useUpdateStatus()
    if (update == null || (update.state !== 'downloading' && update.state !== 'ready')) return null
    if (update.state === 'downloading') {
        return <div className="text-xs text-cf-textDim px-2">Mise à jour {update.version} en téléchargement…</div>
    }
    return (
        <button
            onClick={() => window.cobblemonAPI?.updater?.installNow?.()}
            className="cf-btn-primary text-sm px-4 py-2.5"
            title="Le launcher se ferme, s'installe puis redémarre"
        >
            Mettre à jour ({update.version})
        </button>
    )
}

function LinkButton({ url, icon, children }) {
    if (!url || url === '#') return null
    return (
        <button
            onClick={() => window.cobblemonAPI?.shell?.openExternal?.(url)}
            className="cf-glass flex-1 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-cf-text font-avenirMedium transition-[background-color,transform,box-shadow] duration-150 hover:bg-white/20 hover:-translate-y-1 hover:shadow-lg"
        >
            {icon}
            {children}
        </button>
    )
}

const discordIcon = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.3 5.3A17 17 0 0 0 15 4l-.5 1.1a15.6 15.6 0 0 0-5 0L9 4a17 17 0 0 0-4.3 1.3C2 9.3 1.3 13.2 1.6 17a17 17 0 0 0 5.2 2.7l1.1-1.8a11 11 0 0 1-1.8-.9l.4-.3a12 12 0 0 0 11 0l.4.3c-.6.4-1.2.6-1.8.9l1.1 1.8a17 17 0 0 0 5.2-2.7c.4-4.4-.7-8.3-3.1-11.7ZM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z" />
    </svg>
)

const siteIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </svg>
)

/** Pendant le téléchargement et la vérification des fichiers : étape en cours et barre de progression. */
function LaunchProgress({ details, percent }) {
    const known = percent > 0
    return (
        <div className="cf-glass rounded-2xl px-5 py-3.5 w-[min(440px,100%)] flex-shrink">
            <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-avenirMedium text-cf-text truncate" dangerouslySetInnerHTML={{ __html: details || 'Préparation…' }} />
                {known && <span className="font-avenirHeavy text-cf-text tabular-nums">{percent}%</span>}
            </div>
            <div className="mt-2.5 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                    className={'h-full rounded-full bg-gradient-to-r from-cf-green to-[#2fa85a] transition-[width] duration-300 ' + (known ? '' : 'w-1/3 animate-[cfIndeterminate_1.4s_ease-in-out_infinite]')}
                    style={known ? { width: `${percent}%` } : undefined}
                />
            </div>
        </div>
    )
}

export default function JeuxTab({ status, onNavigateNews }) {
    const { articles } = useNews()
    const recentArticles = articles.slice(0, 3)
    const [selectedArticle, setSelectedArticle] = useState(null)
    const launch = useLaunchState()
    const isRunning = useGameRunning()
    const isLaunching = launch.loading

    const statusText = status == null
        ? 'Connexion au serveur…'
        : status.online
            ? `${status.playersOnline} connecté${status.playersOnline > 1 ? 's' : ''}`
            : 'Hors ligne'

    return (
        <>
            <div className="relative z-10 w-[320px] min-w-[320px] flex flex-col py-5 px-4 flex-shrink-0">

                <div className="flex items-center gap-3.5 p-2 rounded-xl">
                    <div className="cf-glass flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center">
                        <img src="assets/images/cbm.png" className="w-11 h-11 object-contain" />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-avenirMedium text-lg text-cf-text whitespace-nowrap">Cobblemon</span>
                        <div className="flex items-center gap-1.5 text-sm text-white/85 whitespace-nowrap [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
                            <StatusDot online={status?.online} />
                            {statusText}
                        </div>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-3 px-2">
                    <UpdateNotice />
                    <div className="flex gap-2">
                        <LinkButton url={window.cobblemonAPI?.links?.discord} icon={discordIcon}>Discord</LinkButton>
                        <LinkButton url={window.cobblemonAPI?.links?.site} icon={siteIcon}>Site</LinkButton>
                    </div>
                </div>
            </div>

            {/* Voile sombre en bas et à gauche : texte et cartes restent lisibles sur l'image. */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/35 via-transparent to-transparent" />
            <div className="relative flex-1 min-w-0 flex flex-col justify-end gap-5 p-10">
                <div className="flex items-center gap-4">
                    <img src="assets/images/cbm.png" className="w-16 h-16 object-contain flex-shrink-0" />
                    <h1 className="font-avenirHeavy font-bold text-4xl">
                        <span className="text-cf-text">Cobblemon</span>{' '}
                        <span className="text-cf-accentLight">Frontier</span>
                    </h1>
                </div>

                <p className="text-cf-textDim text-base leading-relaxed max-w-xl">
                    Explore un monde ouvert Pokémon, capture et entraîne ton équipe, puis bâtis et fais grandir ta ville avec les autres joueurs.
                </p>

                <div className="flex gap-3">
                    {recentArticles.map((a, i) => <NewsCard key={i} article={a} onOpen={setSelectedArticle} />)}
                    <button
                        onClick={onNavigateNews}
                        className="cf-card flex-shrink-0 w-[140px] h-[130px] p-3.5 flex flex-col justify-between text-left transition-[border-color,transform,box-shadow] duration-150 hover:border-cf-accent hover:-translate-y-1 hover:shadow-lg"
                    >
                        <span className="text-xs text-cf-textDim">{articles.length} posts</span>
                        <span className="text-cf-accentLight">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </span>
                        <span className="font-avenirMedium text-sm text-cf-text">Toutes les actus</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.cobblemonAPI?.nav?.openSettings?.('jeu')}
                        className="cf-glass w-14 h-14 rounded-2xl flex items-center justify-center text-cf-textDim transition-[color,background-color,transform,box-shadow] duration-150 hover:text-cf-text hover:bg-white/20 hover:-translate-y-1 hover:shadow-lg flex-shrink-0"
                        title="Paramètres"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>

                    {isLaunching ? (
                        <LaunchProgress details={launch.details} percent={launch.percent} />
                    ) : (
                    <button
                        onClick={() => {
                            isRunning ? window.cobblemonAPI?.launch?.stop?.() : window.cobblemonAPI?.launch?.trigger?.()
                        }}
                        className={
                            'font-bold text-base px-10 py-4 flex-shrink-0 ' +
                            (isLaunching ? 'cf-btn-secondary cursor-default' : isRunning ? 'cf-btn-red' : 'cf-btn-green')
                        }
                    >
                        {isLaunching ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 animate-spin">
                                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                                <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                            </svg>
                        ) : isRunning ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <rect x="6" y="6" width="12" height="12" rx="1.5" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <polygon points="6 4 20 12 6 20" />
                            </svg>
                        )}
                        {isLaunching ? 'Lancement…' : isRunning ? 'Arrêter' : 'Jouer'}
                    </button>
                    )}

                    <button
                        onClick={() => window.cobblemonAPI?.nav?.openSettings?.('mods')}
                        className="cf-glass rounded-2xl px-6 py-4 flex items-center gap-2 text-cf-text font-avenirMedium transition-[background-color,transform,box-shadow] duration-150 hover:bg-white/20 hover:-translate-y-1 hover:shadow-lg flex-shrink-0"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M20.5 11h-1.8c-.4 0-.7-.2-.9-.6-.2-.4-.1-.8.2-1.1l1.3-1.3c.4-.4.4-1 0-1.4l-1.4-1.4c-.4-.4-1-.4-1.4 0l-1.3 1.3c-.3.3-.7.4-1.1.2-.4-.2-.6-.5-.6-.9V4c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v1.8c0 .4-.2.7-.6.9-.4.2-.8.1-1.1-.2L6.5 5.2c-.4-.4-1-.4-1.4 0L3.7 6.6c-.4.4-.4 1 0 1.4l1.3 1.3c.3.3.4.7.2 1.1-.2.4-.5.6-.9.6H3c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h1.8c.4 0 .7.2.9.6.2.4.1.8-.2 1.1l-1.3 1.3c-.4.4-.4 1 0 1.4l1.4 1.4c.4.4 1 .4 1.4 0l1.3-1.3c.3-.3.7-.4 1.1-.2.4.2.6.5.6.9V22c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-1.8c0-.4.2-.7.6-.9.4-.2.8-.1 1.1.2l1.3 1.3c.4.4 1 .4 1.4 0l1.4-1.4c.4-.4.4-1 0-1.4l-1.3-1.3c-.3-.3-.4-.7-.2-1.1.2-.4.5-.6.9-.6h1.8c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1zM12 15.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
                        </svg>
                        Mods
                    </button>
                </div>
            </div>

            <NewsDetailPanel
                article={selectedArticle}
                gameName="Cobblemon"
                onClose={() => setSelectedArticle(null)}
                onBack={() => { setSelectedArticle(null); onNavigateNews() }}
            />
        </>
    )
}
