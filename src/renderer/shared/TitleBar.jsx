import WindowControls from './WindowControls.jsx'

/**
 * Barre du haut des écrans React : zone de déplacement de la fenêtre, un
 * contenu à gauche (logo, retour…) et les boutons de fenêtre à droite.
 */
export default function TitleBar({ children, right }) {
    return (
        <div className="relative z-20 flex items-center justify-between h-14 px-3 flex-shrink-0" style={{ WebkitAppRegion: 'drag' }}>
            <div className="flex items-center gap-3 min-w-0" style={{ WebkitAppRegion: 'no-drag' }}>
                {children}
            </div>
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
                {right}
                <WindowControls />
            </div>
        </div>
    )
}
