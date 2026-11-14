import { useEffect, useState } from 'react'

/*
 * Onglet Boutique (0.3.3) : la vraie boutique du serveur, lue sur le site (mêmes données que cobblemon-frontier.fr/boutique).
 * Tebex vend des paquets d'Éclats ; les Éclats paient le rang Soutien et les cosmétiques, jamais d'avantage en jeu.
 * Le launcher n'encaisse rien : chaque achat se fait sur le site.
 */
const SITE = 'https://cobblemon-frontier.fr'
const API_PAQUETS = SITE + '/api/boutique/paquets'
const API_COSMETIQUES = SITE + '/api/cosmetiques'

function ouvrir(chemin) {
    window.cobblemonAPI?.shell?.openExternal?.(SITE + chemin)
}

function prixEuros(prix, devise) {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise || 'EUR' }).format(prix)
    } catch {
        return `${prix} €`
    }
}

/**
 * Phrase d'accroche d'une description Tebex : la première qui dit autre chose que la quantité (« 1 100 Éclats . »). Le reste
 * répète la règle des Éclats, dite une fois en bas de page.
 */
function accroche(texte) {
    if (!texte) return ''
    const phrases = texte.replace(/\s+\./g, '.').split(/(?<=[.!?])\s+/).map(p => p.trim()).filter(Boolean)
    const utile = phrases.find(p => !/^[\d\s\u202f\u00a0]+Éclats\.?$/i.test(p))
    return utile || ''
}

function useBoutique() {
    const [etat, setEtat] = useState({ chargement: true, erreur: false, paquets: null, cosmetiques: null })
    useEffect(() => {
        let annule = false
        const lire = (url) => fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        Promise.allSettled([lire(API_PAQUETS), lire(API_COSMETIQUES)]).then(([p, c]) => {
            if (annule) return
            setEtat({
                chargement: false,
                erreur: p.status !== 'fulfilled',
                paquets: p.status === 'fulfilled' ? p.value : null,
                cosmetiques: c.status === 'fulfilled' ? c.value : null
            })
        })
        return () => { annule = true }
    }, [])
    return etat
}

/**
 * Visuels des paquets (0.4.3), les mêmes que sur le site (originaux dans assets/boutique-eclats du dépôt principal) :
 * du plus petit au plus gros, la bourse, le sac, le wagonnet, le filon. Au-delà de quatre, les suivants reprennent le filon.
 */
const VISUELS = [
    { image: 'assets/images/eclats/bourse.webp', nom: "Une bourse d'Éclats", teinte: 'rgba(255, 140, 60, 0.32)' },
    { image: 'assets/images/eclats/sac.webp', nom: "Un sac d'Éclats", teinte: 'rgba(80, 170, 255, 0.32)' },
    { image: 'assets/images/eclats/wagonnet.webp', nom: "Un wagonnet d'Éclats", teinte: 'rgba(255, 200, 80, 0.30)' },
    { image: 'assets/images/eclats/filon.webp', nom: "Un filon d'Éclats", teinte: 'rgba(170, 110, 255, 0.38)' }
]
const IMAGE_ECLAT = 'assets/images/eclats/eclat.webp'

function IconeEclat({ className = 'w-5 h-5' }) {
    return <img src={IMAGE_ECLAT} alt="" aria-hidden="true" className={className + ' object-contain inline-block shrink-0'} />
}

function nombre(n) {
    return Number(n).toLocaleString('fr-FR')
}

function CartePaquet({ paquet, visuel, devise, ouverte }) {
    return (
        <div className="cf-card group relative flex flex-col overflow-hidden">
            <div
                className="relative aspect-[4/3] overflow-hidden"
                style={{ background: `radial-gradient(70% 75% at 50% 50%, ${visuel.teinte}, transparent)` }}
            >
                <img
                    src={visuel.image}
                    alt={visuel.nom}
                    className="absolute inset-0 m-auto h-[86%] w-[86%] object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105"
                />
                {paquet.bonus > 0 && (
                    <span className="cf-badge-orange absolute top-2.5 left-2.5">+{paquet.bonus} %</span>
                )}
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-center gap-2 font-avenirHeavy font-bold text-lg tabular-nums">
                    <IconeEclat />
                    {paquet.eclats ? `${nombre(paquet.eclats)} Éclats` : paquet.nom}
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-cf-textDim">{paquet.offerts > 0 ? `dont ${nombre(paquet.offerts)} offerts` : 'Le paquet de base'}</span>
                    <span className="font-avenirHeavy font-bold text-base text-white tabular-nums">{prixEuros(paquet.prix, devise)}</span>
                </div>
                <p className="text-xs text-cf-textDim leading-relaxed flex-1">{accroche(paquet.description)}</p>
                <button
                    onClick={() => ouvrir('/boutique')}
                    className={(ouverte ? 'cf-btn-primary' : 'cf-btn-secondary') + ' text-sm py-2.5'}
                >
                    {ouverte ? 'Acheter sur le site' : 'Voir sur le site'}
                </button>
            </div>
        </div>
    )
}

export default function BoutiqueTab() {
    const { chargement, erreur, paquets, cosmetiques } = useBoutique()
    const ouverte = Boolean(paquets?.ouverte)
    const liste = paquets?.paquets || []
    // Visuel selon le rang du paquet, du plus petit au plus gros (l'API les donne déjà dans cet ordre).
    const rangs = [...liste].sort((a, b) => (a.eclats ?? a.prix) - (b.eclats ?? b.prix)).map(p => p.id)
    const visuelDe = (p) => VISUELS[Math.min(Math.max(rangs.indexOf(p.id), 0), VISUELS.length - 1)]
    const prixSoutien = cosmetiques?.prixSoutien ?? 450
    const joursSoutien = cosmetiques?.joursSoutien ?? 30
    const nbCosmetiques = (cosmetiques?.articles || []).filter(a => !a.masque && !a.limite).length

    return (
        <div className="pb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <img
                        src={IMAGE_ECLAT}
                        alt=""
                        aria-hidden="true"
                        className="w-16 h-16 object-contain shrink-0 drop-shadow-[0_0_18px_rgba(90,200,255,0.45)]"
                    />
                    <div>
                        <h1 className="cf-section-title mb-1">Boutique</h1>
                        <div className="text-cf-textDim text-sm max-w-2xl leading-relaxed">
                            Les Éclats paient le rang Soutien et les cosmétiques. Rien ne donne d'avantage en jeu :
                            ton soutien paie l'hébergement du serveur.
                        </div>
                    </div>
                </div>
                <button onClick={() => ouvrir('/boutique')} className="cf-btn-secondary text-sm px-4 py-2 whitespace-nowrap">
                    Ouvrir sur le site
                </button>
            </div>

            {!chargement && !erreur && !ouverte && (
                <div className="bg-cf-orange/10 border border-cf-orange/35 text-[#ffb37a] text-sm font-avenirMedium px-4 py-2.5 rounded-[10px] mb-5">
                    La boutique ouvre bientôt : voici un aperçu des paquets d'Éclats.
                </div>
            )}

            {chargement && <div className="text-cf-textDim text-sm py-8">Chargement de la boutique…</div>}

            {!chargement && erreur && (
                <div className="cf-card p-5 flex items-center justify-between gap-4 mb-5">
                    <span className="text-sm text-cf-text/85">Impossible de charger la boutique pour l'instant. Elle reste accessible sur le site.</span>
                    <button onClick={() => ouvrir('/boutique')} className="cf-btn-primary text-sm px-4 py-2 whitespace-nowrap">Ouvrir le site</button>
                </div>
            )}

            {liste.length > 0 && (
                <>
                    <h2 className="font-avenirMedium text-base text-cf-text mb-3">Paquets d'Éclats</h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-6">
                        {liste.map(p => (
                            <CartePaquet key={p.id} paquet={p} visuel={visuelDe(p)} devise={paquets.devise} ouverte={ouverte} />
                        ))}
                    </div>
                </>
            )}

            {!chargement && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="cf-card p-5 flex flex-col gap-2">
                        <div className="font-avenirMedium text-base">Le rang Soutien</div>
                        <div className="text-sm text-cf-text/85">
                            <span className="text-white font-avenirMedium inline-flex items-center gap-1.5 align-middle">
                                <IconeEclat className="w-4 h-4" />
                                {prixSoutien.toLocaleString('fr-FR')} Éclats les {joursSoutien} jours
                            </span>, cumulables.
                            Pas d'abonnement : tu n'es jamais prélevé.
                        </div>
                        <ul className="text-xs text-cf-textDim space-y-1 leading-relaxed">
                            <li>· un badge Soutien à côté de ton grade, dans le chat et la liste des joueurs ;</li>
                            <li>· la couleur de ton pseudo, au choix ;</li>
                            <li>· une traînée et un effet de capture réservés aux Soutiens ;</li>
                            <li>· un rôle sur le Discord.</li>
                        </ul>
                        <div className="text-xs text-cf-textDim mt-auto pt-1">Il s'achète en jeu : <span className="text-white">/boutique</span>.</div>
                    </div>
                    <div className="cf-card p-5 flex flex-col gap-2">
                        <div className="font-avenirMedium text-base">Les cosmétiques</div>
                        <div className="text-sm text-cf-text/85 leading-relaxed">
                            {nbCosmetiques > 0 ? `${nbCosmetiques} cosmétiques` : 'Des cosmétiques'} : chapeaux, ailes, compagnons, tenues complètes,
                            traînées et effets de capture. Achetés une fois, gardés pour toujours.
                        </div>
                        <div className="text-xs text-cf-textDim">Essaie-les en 3D sur le site, ou en jeu avec <span className="text-white">/cosmetiques</span>.</div>
                        <button onClick={() => ouvrir('/cosmetiques')} className="cf-btn-secondary text-sm py-2.5 mt-auto">
                            Voir les cosmétiques
                        </button>
                    </div>
                </div>
            )}

            {!chargement && (
                <div className="text-xs text-cf-textDim leading-relaxed max-w-3xl">
                    Le paiement est encaissé par Tebex, le revendeur officiel de la boutique. Les Éclats sont liés à ton pseudo,
                    ne s'échangent pas entre joueurs et ne se convertissent pas en Crédits Frontier.
                </div>
            )}
        </div>
    )
}
