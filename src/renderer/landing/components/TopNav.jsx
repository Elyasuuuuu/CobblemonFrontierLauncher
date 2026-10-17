import { useEffect, useRef, useState } from 'react'
import WindowControls from '../../shared/WindowControls.jsx'
import { api, useAccount } from '../../shared/hooks.js'

const TABS = [
    {
        id: 'jeux',
        label: 'Jeux',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="2" y="7" width="20" height="11" rx="5" />
                <line x1="6" y1="10.5" x2="6" y2="14.5" />
                <line x1="4" y1="12.5" x2="8" y2="12.5" />
                <circle cx="16" cy="11" r="1" />
                <circle cx="18.5" cy="14" r="1" />
            </svg>
        )
    },
    {
        id: 'news',
        label: 'News',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <line x1="8" y1="9" x2="16" y2="9" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
        )
    },
    {
        id: 'boutique',
        label: 'Boutique',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M4 8 L6 3 H18 L20 8" />
                <path d="M4 8 H20 V19 A2 2 0 0 1 18 21 H6 A2 2 0 0 1 4 19 Z" />
                <path d="M9 12 A3 3 0 0 0 15 12" />
            </svg>
        )
    }
]

function ChevronDown() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-white/60">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    )
}

/** Menu du compte : changer de skin, paramètres, se déconnecter. */
function AccountMenu() {
    const account = useAccount()
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        window.addEventListener('mousedown', close)
        return () => window.removeEventListener('mousedown', close)
    }, [open])

    const name = account?.displayName ?? 'Invité'
    const item = 'w-full text-left px-3.5 py-2 rounded-lg text-sm text-cf-text hover:bg-white/10 transition-colors'
    const run = (fn) => () => { setOpen(false); fn() }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl text-sm font-avenirMedium text-cf-text transition-colors hover:bg-white/10"
            >
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cf-accent to-cf-accentDark flex items-center justify-center text-xs font-avenirHeavy text-white">
                    {name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate">{name}</span>
                <ChevronDown />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 cf-panel p-1.5 shadow-2xl z-30">
                    <div className="px-3.5 py-2 text-xs text-cf-textDim">Connecté en tant que <span className="text-cf-text font-avenirMedium">{name}</span></div>
                    <button className={item} onClick={run(() => api()?.nav?.showOnboarding?.('skin'))}>Changer de skin</button>
                    <button className={item} onClick={run(() => api()?.nav?.openSettings?.('compte'))}>Paramètres</button>
                    <div className="my-1 h-px bg-white/10" />
                    <button
                        className={item + ' text-[#ff8a80]'}
                        onClick={run(async () => {
                            const next = await api()?.account?.logout?.()
                            if (next == null) api()?.nav?.showOnboarding?.('pseudo')
                        })}
                    >
                        Se déconnecter
                    </button>
                </div>
            )}
        </div>
    )
}

function ServerPill({ status }) {
    const online = status?.online
    const text = status == null ? 'Serveur…' : online ? `${status.playersOnline} en ligne` : 'Hors ligne'
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-avenirMedium text-cf-text" title="Joueurs connectés au serveur">
            <span className={'w-2 h-2 rounded-full ' + (online ? 'bg-cf-green shadow-[0_0_8px_rgba(79,214,122,0.8)]' : 'bg-white/40')} />
            {text}
        </div>
    )
}

export default function TopNav({ tab, onTabChange, status, hasNews }) {
    return (
        <div className="relative z-20 flex items-center justify-between h-14 px-3 flex-shrink-0" style={{ WebkitAppRegion: 'drag' }}>
            <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
                <img src="assets/images/SealCircle.png" className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="cf-glass flex items-center gap-1 rounded-full p-1">
                    {TABS.map(t => {
                        const active = tab === t.id
                        return (
                            <button
                                key={t.id}
                                onClick={() => onTabChange(t.id)}
                                className={
                                    'relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-avenirMedium transition-colors ' +
                                    (active ? 'bg-gradient-to-br from-cf-orange to-cf-orangeDark text-white' : 'text-white/75 hover:text-white')
                                }
                            >
                                {t.icon}
                                {t.label}
                                {t.id === 'news' && hasNews && !active && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-cf-orange" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
                <ServerPill status={status} />
                <AccountMenu />
                <div className="w-px h-6 bg-white/15 mx-1.5" />
                <WindowControls />
            </div>
        </div>
    )
}
