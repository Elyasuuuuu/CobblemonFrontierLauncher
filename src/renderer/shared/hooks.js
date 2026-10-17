import { useEffect, useState } from 'react'

/** L'API du pont (src/preload/index.js), ou null hors du launcher (aperçu dans un navigateur). */
export const api = () => window.cobblemonAPI ?? null

/** Pseudo choisi, tenu à jour quand il change (création, déconnexion). */
export function useAccount() {
    const [account, setAccount] = useState(() => api()?.account?.getSelected?.() ?? null)
    useEffect(() => api()?.account?.onChange?.(setAccount), [])
    return account
}

/** Progression du lancement : { loading, details, percent }. */
export function useLaunchState() {
    const [state, setState] = useState(() => api()?.launch?.getState?.() ?? { loading: false, details: '', percent: 0 })
    useEffect(() => api()?.launch?.onState?.((s) => setState({ ...s })), [])
    return state
}

/** Jeu en cours d'exécution (processus Minecraft vivant). */
export function useGameRunning() {
    const [running, setRunning] = useState(false)
    useEffect(() => {
        const id = setInterval(() => setRunning(api()?.launch?.isRunning?.() ?? false), 800)
        return () => clearInterval(id)
    }, [])
    return running
}

/** Mise à jour du launcher : null, ou { state: checking | latest | downloading | ready | error, version }. */
export function useUpdateStatus() {
    const [status, setStatus] = useState(() => api()?.updater?.getStatus?.() ?? null)
    useEffect(() => api()?.updater?.onStatus?.(setStatus), [])
    return status
}

/** Statut du serveur (joueurs en ligne), rafraîchi toutes les deux minutes. */
export function useServerStatus() {
    const [status, setStatus] = useState(null)
    useEffect(() => {
        let cancelled = false
        const refresh = () => api()?.server?.getSelectedStatus?.().then((s) => { if (!cancelled) setStatus(s) })
        refresh()
        const id = setInterval(refresh, 120000)
        return () => { cancelled = true; clearInterval(id) }
    }, [])
    return status
}

/** Écoute un évènement window (CustomEvent) pendant la vie du composant. */
export function useWindowEvent(name, handler) {
    useEffect(() => {
        const listener = (e) => handler(e.detail)
        window.addEventListener(name, listener)
        return () => window.removeEventListener(name, listener)
    }, [name, handler])
}

export function plural(n, one, many) {
    return `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`
}
