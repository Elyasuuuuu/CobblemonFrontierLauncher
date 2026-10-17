import { api } from './hooks.js'

function WindowIcon({ name }) {
    if (name === 'minimize') {
        return <svg viewBox="0 0 12 12" width="12" height="12"><rect fill="currentColor" width="10" height="1.4" x="1" y="5.3" /></svg>
    }
    if (name === 'maximize') {
        return <svg viewBox="0 0 12 12" width="12" height="12"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
    }
    return (
        <svg viewBox="0 0 12 12" width="12" height="12">
            <polygon fill="currentColor" points="11 1.06 6.94 5.12 10.94 9.12 9.88 10.18 5.88 6.18 1.82 10.24 0.76 9.18 4.82 5.12 0.82 1.12 1.88 0.06 5.88 4.06 9.94 0" />
        </svg>
    )
}

/** Réduire / agrandir / fermer : la fenêtre n'a pas de cadre système (frame: false). */
export default function WindowControls() {
    const button = 'flex items-center justify-center w-9 h-9 rounded-lg text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white'
    return (
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
            <button title="Réduire" onClick={() => api()?.window?.minimize?.()} className={button}>
                <WindowIcon name="minimize" />
            </button>
            <button title="Agrandir" onClick={() => api()?.window?.maximize?.()} className={button}>
                <WindowIcon name="maximize" />
            </button>
            <button title="Fermer" onClick={() => api()?.window?.close?.()} className={button + ' hover:!bg-cf-red'}>
                <WindowIcon name="close" />
            </button>
        </div>
    )
}
