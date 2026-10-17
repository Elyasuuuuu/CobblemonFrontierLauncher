/**
 * Onglets News / Jeux / Boutique de l'écran principal (refonte), + le
 * système de news à base de cartes (nouveau, indépendant de l'ancien
 * système RSS de landing.js qu'on laisse caché/intact pour ne rien casser).
 *
 * Dépend de variables déclarées globalement par les scripts chargés avant
 * celui-ci (portée de script classique, partagée entre <script> non-module) :
 * shell/path/ConfigManager (uicore.js/uibinder.js), DropinModUtil (settings.js,
 * inclus avant landing.js dans app.ejs).
 */

// ---------------- Bascule d'onglets ----------------

(function initTabs(){
    const tabs = document.querySelectorAll('.topNavTab')
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            document.querySelectorAll('.tabPanel').forEach(p => p.classList.remove('active'))
            const panel = document.getElementById('tabPanel' + capitalize(tab.dataset.tab))
            if(panel){
                panel.classList.add('active')
            }
        })
    })
})()

function capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// ---------------- Toast (retours pour les actions pas encore réelles) ----------------

function cfShowToast(message){
    let toast = document.getElementById('cfToast')
    if(toast == null){
        toast = document.createElement('div')
        toast.id = 'cfToast'
        document.body.appendChild(toast)
    }
    toast.textContent = message
    toast.classList.add('show')
    clearTimeout(cfShowToast._t)
    cfShowToast._t = setTimeout(() => toast.classList.remove('show'), 2500)
}

// ---------------- Bouton Mods (réel : ouvre l'onglet Mods de l'écran Paramètres,
// qui liste déjà les mods installés avec activer/désactiver). ----------------

document.getElementById('jeuxModsButton').addEventListener('click', async () => {
    await prepareSettings()
    switchView(getCurrentView(), VIEWS.settings, 500, 500, () => {
        settingsNavItemListener(document.getElementById('settingsNavMods'), false)
    })
})

// ---------------- Boutique (coquille visuelle, pas de vrai paiement) ----------------

document.querySelectorAll('.boutiqueAddButton').forEach(btn => {
    btn.addEventListener('click', () => {
        cfShowToast('Boutique bientôt disponible !')
    })
})

// ---------------- News (cartes, fichier JSON éditable côté serveur) ----------------

const NEWS_JSON_URL = 'https://cobblemon-frontier.fr/cobblemon-launcher/news.json'

let cfNewsArticles = []
let cfNewsFilter = 'tout'

async function cfLoadNews(){
    const root = document.getElementById('newsCardsRoot')
    try {
        const res = await fetch(NEWS_JSON_URL, { cache: 'no-store' })
        const data = await res.json()
        cfNewsArticles = (data.articles || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))
        cfRenderNews()
        cfRenderJeuxNews()
    } catch (err) {
        if(root) root.innerHTML = '<div id="newsCardsLoading">Impossible de charger les actus pour le moment.</div>'
    }
}

/** Aperçu compact des 4 dernières actus, affiché directement dans l'onglet Jeux. */
function cfRenderJeuxNews(){
    const row = document.getElementById('jeuxNewsRow')
    if(row == null) return
    row.innerHTML = ''
    cfNewsArticles.slice(0, 4).forEach(article => {
        const card = document.createElement('div')
        card.className = 'jeuxNewsCard'

        const typePill = document.createElement('div')
        typePill.className = 'newsCardType type-' + article.type
        typePill.textContent = cfTypeLabel(article.type)
        card.appendChild(typePill)

        const title = document.createElement('div')
        title.className = 'jeuxNewsCardTitle'
        title.textContent = article.title
        card.appendChild(title)

        if(article.link){
            card.style.cursor = 'pointer'
            card.addEventListener('click', () => shell.openExternal(article.link))
        }

        row.appendChild(card)
    })
}

function cfTypeLabel(type){
    if(type === 'annonce') return 'Annonce'
    if(type === 'mise_a_jour') return 'Mise à jour'
    return type || ''
}

function cfFormatDate(dateStr){
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch (e) {
        return dateStr
    }
}

function cfRenderNews(){
    const root = document.getElementById('newsCardsRoot')
    if(root == null) return

    const filtered = cfNewsFilter === 'tout'
        ? cfNewsArticles
        : cfNewsArticles.filter(a => a.type === cfNewsFilter)

    if(filtered.length === 0){
        root.innerHTML = '<div id="newsCardsLoading">Aucune actu pour l\'instant.</div>'
        return
    }

    root.innerHTML = ''
    filtered.forEach((article, index) => {
        const card = document.createElement('div')
        card.className = 'newsCard' + (index === 0 ? ' hero' : '')
        if(article.image){
            card.style.backgroundImage = `linear-gradient(to top, rgba(12,12,17,0.95), rgba(12,12,17,0.35)), url('${article.image}')`
        }

        const typePill = document.createElement('div')
        typePill.className = 'newsCardType type-' + article.type
        typePill.textContent = cfTypeLabel(article.type)
        card.appendChild(typePill)

        const title = document.createElement('div')
        title.className = 'newsCardTitle'
        title.textContent = article.title
        card.appendChild(title)

        if(index === 0 || !article.image){
            const excerpt = document.createElement('div')
            excerpt.className = 'newsCardExcerpt'
            excerpt.textContent = article.excerpt || ''
            card.appendChild(excerpt)
        }

        const date = document.createElement('div')
        date.className = 'newsCardDate'
        date.textContent = cfFormatDate(article.date)
        card.appendChild(date)

        if(article.link){
            card.style.cursor = 'pointer'
            card.addEventListener('click', () => shell.openExternal(article.link))
        }

        root.appendChild(card)
    })
}

document.querySelectorAll('.newsFilterPill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.newsFilterPill').forEach(p => p.classList.remove('active'))
        pill.classList.add('active')
        cfNewsFilter = pill.dataset.newsfilter
        cfRenderNews()
    })
})

cfLoadNews()
