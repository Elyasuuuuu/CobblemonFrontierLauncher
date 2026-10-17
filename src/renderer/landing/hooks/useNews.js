import { useEffect, useState } from 'react'

const NEWS_JSON_URL = 'https://cobblemon-frontier.fr/cobblemon-launcher/news.json'

export function useNews() {
    const [articles, setArticles] = useState([])
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(NEWS_JSON_URL, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (cancelled) return
                const sorted = (data.articles || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))
                setArticles(sorted)
            })
            .catch(() => {
                if (!cancelled) setError(true)
            })
        return () => { cancelled = true }
    }, [])

    return { articles, error }
}

export function typeLabel(type) {
    if (type === 'annonce') return 'Annonce'
    if (type === 'mise_a_jour') return 'Mise à jour'
    return type || ''
}

export function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
        return dateStr
    }
}

/** "le 20 juillet" -- short date form used in the Jeux tab's news preview cards. */
export function formatShortDate(dateStr) {
    try {
        return `le ${new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    } catch {
        return dateStr
    }
}

/** "il y a 4 j", "il y a 2 h" -- short relative form used in the card meta line. */
export function formatRelative(dateStr) {
    try {
        const diffMs = Date.now() - new Date(dateStr).getTime()
        const hours = Math.floor(diffMs / 3600000)
        if (hours < 1) return 'à l\'instant'
        if (hours < 24) return `il y a ${hours} h`
        const days = Math.floor(hours / 24)
        return `il y a ${days} j`
    } catch {
        return ''
    }
}
