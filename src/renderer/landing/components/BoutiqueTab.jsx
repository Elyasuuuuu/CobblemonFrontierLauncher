import { useState } from 'react'

const CATEGORIES = ['Rangs', 'Riozs', 'Émeraudes', 'Boosts', 'Âmes']

const RANKS = [
    {
        name: 'Rang Dresseur',
        price: '4,99 €',
        accent: '#7CB342',
        perks: ['Préfixe et pseudo coloré en jeu', 'Cosmétiques exclusifs']
    },
    {
        name: 'Rang Capitaine',
        price: '9,99 €',
        accent: '#3AAFD9',
        perks: ['Préfixe et pseudo coloré en jeu', 'Cosmétiques exclusifs', 'Passe en priorité si un mode est plein']
    },
    {
        name: 'Rang Champion',
        price: '19,99 €',
        accent: '#FED83D',
        featured: true,
        perks: ['Préfixe et pseudo coloré en jeu', 'Cosmétiques exclusifs', 'Passe en priorité si un mode est plein', 'Accès anticipé aux nouveautés']
    },
    {
        name: 'Rang Maître',
        price: '34,99 €',
        accent: '#B02E26',
        perks: ['Préfixe et pseudo coloré en jeu', 'Cosmétiques exclusifs', 'Passe en priorité si un mode est plein', 'Accès anticipé aux nouveautés']
    }
]

export default function BoutiqueTab() {
    const [category, setCategory] = useState('Rangs')
    const [toast, setToast] = useState(false)

    const showToast = () => {
        setToast(true)
        setTimeout(() => setToast(false), 2500)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4.5">
                <div className="flex gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={'cf-pill' + (category === cat ? ' cf-pill-active' : '')}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <button onClick={showToast} className="cf-btn-secondary text-sm px-4 py-2">
                    Panier
                </button>
            </div>

            <h1 className="cf-section-title mb-1">{category}</h1>
            <div className="text-cf-textDim text-sm mb-4.5">
                {category === 'Rangs' ? '4 offres' : 'Bientôt disponible'}
            </div>

            <div className="bg-cf-orange/10 border border-cf-orange/35 text-[#ffb37a] text-sm font-avenirMedium px-4 py-2.5 rounded-[10px] mb-6">
                Bientôt disponible — aperçu de la future boutique, aucun paiement réel pour l'instant.
            </div>

            {category === 'Rangs' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
                    {RANKS.map(rank => (
                        <div
                            key={rank.name}
                            className={
                                'cf-card relative p-5.5 pt-6 flex flex-col gap-3 overflow-hidden ' +
                                (rank.featured ? '!border-cf-orange' : '')
                            }
                        >
                            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: rank.accent }} />
                            {rank.featured && (
                                <span className="cf-badge-orange absolute top-3.5 -right-8 rotate-45 py-0.5 px-10 rounded-none">
                                    Meilleur rang
                                </span>
                            )}
                            <div className="font-avenirMedium text-lg mt-1.5">{rank.name}</div>
                            <div className="font-avenirHeavy font-bold text-2xl">{rank.price}</div>
                            <ul className="flex flex-col gap-1.5 flex-1">
                                {rank.perks.map(perk => (
                                    <li key={perk} className="text-xs text-cf-textDim pl-4 relative">
                                        <span className="absolute left-0 text-cf-green">✓</span>
                                        {perk}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={showToast} className="cf-btn-secondary text-sm py-2.5 hover:!bg-gradient-to-br hover:!from-cf-accent hover:!to-cf-accentDark hover:!border-transparent hover:!text-white">
                                Ajouter
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-cf-textDim text-sm">Cette catégorie n'a pas encore de contenu.</div>
            )}

            <div className={'cf-toast' + (toast ? ' is-visible' : '')}>
                Boutique bientôt disponible !
            </div>
        </div>
    )
}
