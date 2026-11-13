import { useEffect, useState } from 'react'
import TopNav from './components/TopNav.jsx'
import JeuxTab from './components/JeuxTab.jsx'
import NewsTab from './components/NewsTab.jsx'
import BoutiqueTab from './components/BoutiqueTab.jsx'
import NewsDetailPanel from './components/NewsDetailPanel.jsx'
import Backdrop from '../shared/Backdrop.jsx'
import { useNews } from './hooks/useNews.js'
import { useServerStatus } from '../shared/hooks.js'

const CLE_VU = 'cf-actualites-vues-jusqua'

function lireVu() {
    try { return localStorage.getItem(CLE_VU) || '' } catch { return '' }
}

/** Accueil : onglets Jeux (par défaut), Actualités et Boutique. Les actualités sont lues une seule fois, ici (0.3.3). */
export default function App() {
    const [tab, setTab] = useState('jeux')
    const status = useServerStatus()
    const news = useNews()
    const { articles } = news
    const [lu, setLu] = useState(lireVu)
    const [article, setArticle] = useState(null)
    const derniere = articles[0]?.date || ''
    // Le point de l'onglet ne s'allume que s'il y a un article plus récent que la dernière visite de l'onglet.
    const nonLu = derniere !== '' && derniere > lu
    useEffect(() => {
        if (tab === 'news' && derniere && derniere > lu) {
            try { localStorage.setItem(CLE_VU, derniere) } catch { /* stockage indisponible : le point restera allumé */ }
            setLu(derniere)
        }
    }, [tab, derniere, lu])

    return (
        <div className="relative w-full h-full flex flex-col font-avenir text-cf-text overflow-hidden">
            <Backdrop blurred={tab !== 'jeux'} />
            <TopNav tab={tab} onTabChange={setTab} status={status} hasNews={nonLu} />
            <div className="relative flex-1 min-h-0">
                {tab === 'jeux' && (
                    <div className="absolute inset-0 flex">
                        <JeuxTab status={status} news={news} onNavigateNews={() => setTab('news')} />
                    </div>
                )}
                {tab === 'news' && (
                    <div className="absolute inset-0 overflow-y-auto px-8 pt-4 pb-8">
                        <NewsTab news={news} onOpen={setArticle} />
                    </div>
                )}
                {tab === 'news' && (
                    <NewsDetailPanel
                        article={article}
                        gameName="Cobblemon Frontier"
                        onClose={() => setArticle(null)}
                        onBack={() => setArticle(null)}
                    />
                )}
                {tab === 'boutique' && (
                    <div className="absolute inset-0 overflow-y-auto px-8 pt-4 pb-8">
                        <BoutiqueTab />
                    </div>
                )}
            </div>
        </div>
    )
}
