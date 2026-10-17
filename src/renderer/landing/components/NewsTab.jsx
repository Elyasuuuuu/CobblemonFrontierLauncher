import { useState } from 'react'
import { useNews, typeLabel, formatDate, formatRelative } from '../hooks/useNews.js'

const FILTERS = [
    { id: 'tout', label: 'Tout' },
    { id: 'annonce', label: 'Annonces' },
    { id: 'mise_a_jour', label: 'Mises à jour' }
]

function MetaLine({ article }) {
    return (
        <div className="flex items-center gap-1.5 text-xs text-cf-textDim">
            <span className={'w-1.5 h-1.5 rounded-full ' + (article.type === 'mise_a_jour' ? 'bg-cf-orange' : 'bg-cf-accent')} />
            <span className="font-avenirMedium text-cf-text">Cobblemon Frontier</span>
            <span>· {typeLabel(article.type)} · {formatRelative(article.date)}</span>
        </div>
    )
}

function cardBg(article) {
    if (!article.image) return undefined
    return {
        backgroundImage: `linear-gradient(to top, rgba(12,12,17,0.95), rgba(12,12,17,0.35)), url('${article.image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    }
}

export default function NewsTab() {
    const { articles, error } = useNews()
    const [filter, setFilter] = useState('tout')

    const filtered = filter === 'tout' ? articles : articles.filter(a => a.type === filter)
    const [hero, ...rest] = filtered
    const sideArticles = rest.slice(0, 2)
    const gridArticles = rest.slice(2)

    return (
        <div>
            <h1 className="cf-section-title mb-4.5">News</h1>
            <div className="flex gap-2 mb-5.5">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={'cf-pill' + (filter === f.id ? ' cf-pill-active' : '')}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {error && <div className="text-cf-textDim">Impossible de charger les actus pour le moment.</div>}
            {!error && filtered.length === 0 && <div className="text-cf-textDim">Aucune actu pour l'instant.</div>}

            {hero && (
                <div className="grid grid-cols-3 gap-4.5 mb-4.5">
                    <div
                        onClick={() => hero.link && window.cobblemonAPI?.shell?.openExternal?.(hero.link)}
                        style={cardBg(hero)}
                        className={
                            'cf-card col-span-2 min-h-[280px] p-6 flex flex-col justify-end gap-2 ' +
                            (hero.link ? 'cursor-pointer' : '')
                        }
                    >
                        <MetaLine article={hero} />
                        <div className="font-avenirHeavy font-bold text-3xl uppercase text-cf-text leading-tight">{hero.title}</div>
                        {hero.excerpt && <div className="text-sm text-cf-textDim leading-relaxed max-w-[520px] normal-case font-avenir">{hero.excerpt}</div>}
                        {hero.link && <span className="text-sm font-avenirMedium text-cf-accentLight mt-1">Lire →</span>}
                    </div>

                    <div className="flex flex-col gap-4.5">
                        {sideArticles.map((a, i) => (
                            <div
                                key={i}
                                onClick={() => a.link && window.cobblemonAPI?.shell?.openExternal?.(a.link)}
                                style={cardBg(a)}
                                className={
                                    'cf-card flex-1 min-h-[125px] p-4 flex flex-col justify-end gap-1.5 ' +
                                    (a.link ? 'cursor-pointer' : '')
                                }
                            >
                                <MetaLine article={a} />
                                <div className="font-avenirMedium text-sm text-cf-text leading-tight">{a.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {gridArticles.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4.5">
                    {gridArticles.map((a, i) => (
                        <div
                            key={i}
                            onClick={() => a.link && window.cobblemonAPI?.shell?.openExternal?.(a.link)}
                            style={cardBg(a)}
                            className={
                                'cf-card relative p-4.5 flex flex-col gap-2 min-h-[140px] justify-end ' +
                                (a.link ? 'cursor-pointer' : '')
                            }
                        >
                            <span className="cf-badge-orange absolute top-3 left-3">Nouveau</span>
                            <MetaLine article={a} />
                            <div className="font-avenirMedium text-[15px] text-cf-text">{a.title}</div>
                            <div className="text-[11px] text-cf-textDim">{formatDate(a.date)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
