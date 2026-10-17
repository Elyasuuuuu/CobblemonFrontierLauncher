import { useState } from 'react'
import TopNav from './components/TopNav.jsx'
import JeuxTab from './components/JeuxTab.jsx'
import NewsTab from './components/NewsTab.jsx'
import BoutiqueTab from './components/BoutiqueTab.jsx'
import Backdrop from '../shared/Backdrop.jsx'
import { useNews } from './hooks/useNews.js'
import { useServerStatus } from '../shared/hooks.js'

/** Accueil : onglets Jeux (par défaut), News et Boutique. */
export default function App() {
    const [tab, setTab] = useState('jeux')
    const status = useServerStatus()
    const { articles } = useNews()

    return (
        <div className="relative w-full h-full flex flex-col font-avenir text-cf-text overflow-hidden">
            <Backdrop blurred={tab !== 'jeux'} />
            <TopNav tab={tab} onTabChange={setTab} status={status} hasNews={articles.length > 0} />
            <div className="relative flex-1 min-h-0">
                {tab === 'jeux' && (
                    <div className="absolute inset-0 flex">
                        <JeuxTab status={status} onNavigateNews={() => setTab('news')} />
                    </div>
                )}
                {tab === 'news' && (
                    <div className="absolute inset-0 overflow-y-auto px-8 pt-4 pb-8">
                        <NewsTab />
                    </div>
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
