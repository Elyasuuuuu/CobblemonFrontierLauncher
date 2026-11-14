import { api } from './hooks.js'

/** « Discord » cliquable : ouvre l'invitation du serveur (_custom.toml) dans le navigateur (0.4.4). */
export default function LienDiscord({ children = 'Discord' }) {
    const url = api()?.links?.discord
    if (!url) return children
    return (
        <button type="button" onClick={() => api()?.shell?.openExternal?.(url)} className="cf-link underline">
            {children}
        </button>
    )
}
