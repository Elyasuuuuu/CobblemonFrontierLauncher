import { createRoot } from 'react-dom/client'
import './index.css'
import App from './landing/App.jsx'
import OnboardingApp from './onboarding/OnboardingApp.jsx'
import SettingsApp from './settings/SettingsApp.jsx'
import DialogHost from './shared/DialogHost.jsx'

// Un seul bundle pour toute l'interface React : chaque écran se monte dans
// son conteneur d'app.ejs (affiché ou caché par switchView d'uibinder.js).
const mounts = [
    ['landingRoot', App],
    ['onboardingRoot', OnboardingApp],
    ['reactSettingsRoot', SettingsApp],
    ['dialogRoot', DialogHost]
]

for (const [id, Component] of mounts) {
    const container = document.getElementById(id)
    if (container != null) createRoot(container).render(<Component />)
}
