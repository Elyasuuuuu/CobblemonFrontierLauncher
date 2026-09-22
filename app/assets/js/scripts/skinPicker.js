/**
 * Script for skinPicker.ejs
 *
 * Shown right after an offline account is created. Lets the player copy an
 * existing Minecraft username's skin, or upload their own, via the small
 * skin API (see /opt/cobblemon-skin-api on the server). Either path just
 * drops a "pending skin" request that the CobblemonFrontierSkins Bukkit
 * plugin picks up and applies the moment the player actually joins --
 * SkinsRestorer can't resolve a player it's never seen before that point.
 */
const { SKIN_API_BASE, SKIN_API_KEY } = require('../ipcconstants')

const validMcUsername = /^[a-zA-Z0-9_]{1,16}$/

const skinPickerModeMojang    = document.getElementById('skinPickerModeMojang')
const skinPickerModeUpload    = document.getElementById('skinPickerModeUpload')
const skinPickerMojangForm    = document.getElementById('skinPickerMojangForm')
const skinPickerUploadForm    = document.getElementById('skinPickerUploadForm')
const skinPickerMojangName    = document.getElementById('skinPickerMojangName')
const skinPickerMojangError   = document.getElementById('skinPickerMojangError')
const skinPickerMojangSubmit  = document.getElementById('skinPickerMojangSubmit')
const skinPickerFileInput     = document.getElementById('skinPickerFileInput')
const skinPickerFileButton    = document.getElementById('skinPickerFileButton')
const skinPickerFileButtonText = document.getElementById('skinPickerFileButtonText')
const skinPickerUploadSubmit  = document.getElementById('skinPickerUploadSubmit')
const skinPickerApiError      = document.getElementById('skinPickerApiError')
const skinPickerSkipButton    = document.getElementById('skinPickerSkipButton')

let skinPickerViewOnDone = VIEWS.landing
let selectedSkinFile = null

function showSkinPickerError(message) {
    skinPickerApiError.innerHTML = message
    skinPickerApiError.style.opacity = 1
}

function clearSkinPickerError() {
    skinPickerApiError.style.opacity = 0
}

function setMode(mode) {
    clearSkinPickerError()
    skinPickerMojangForm.style.display = mode === 'mojang' ? 'flex' : 'none'
    skinPickerUploadForm.style.display = mode === 'upload' ? 'flex' : 'none'
}

skinPickerModeMojang.onclick = () => setMode('mojang')
skinPickerModeUpload.onclick = () => setMode('upload')

skinPickerMojangName.addEventListener('input', (e) => {
    const valid = validMcUsername.test(e.target.value)
    skinPickerMojangError.style.opacity = (e.target.value.length > 0 && !valid) ? 1 : 0
    skinPickerMojangSubmit.disabled = !valid
})

const skinPickerChooseFileDefaultText = skinPickerFileButtonText.textContent

skinPickerFileButton.onclick = () => skinPickerFileInput.click()

skinPickerFileInput.addEventListener('change', () => {
    const file = skinPickerFileInput.files[0]
    selectedSkinFile = file || null
    skinPickerFileButtonText.textContent = file ? file.name : skinPickerChooseFileDefaultText
    skinPickerUploadSubmit.disabled = !file
})

function finishSkinPicker() {
    clearSkinPickerError()
    switchView(VIEWS.skinPicker, skinPickerViewOnDone, 500, 500, async () => {
        if(skinPickerViewOnDone === VIEWS.settings){
            await prepareSettings()
        }
        skinPickerViewOnDone = VIEWS.landing
    })
}

skinPickerSkipButton.onclick = () => finishSkinPicker()

skinPickerMojangSubmit.onclick = async () => {
    skinPickerMojangSubmit.disabled = true
    try {
        const res = await fetch(`${SKIN_API_BASE}/skin/mojang`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': SKIN_API_KEY },
            body: JSON.stringify({
                username: ConfigManager.getSelectedAccount().username,
                mojangName: skinPickerMojangName.value
            })
        })
        if(!res.ok){
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `HTTP ${res.status}`)
        }
        finishSkinPicker()
    } catch(err) {
        showSkinPickerError(Lang.queryJS('skinPicker.error') + ' (' + err.message + ')')
        skinPickerMojangSubmit.disabled = false
    }
}

skinPickerUploadSubmit.onclick = async () => {
    if(!selectedSkinFile) return
    skinPickerUploadSubmit.disabled = true
    try {
        const form = new FormData()
        form.append('username', ConfigManager.getSelectedAccount().username)
        form.append('skin', selectedSkinFile)
        const res = await fetch(`${SKIN_API_BASE}/skin/upload`, {
            method: 'POST',
            headers: { 'X-Api-Key': SKIN_API_KEY },
            body: form
        })
        if(!res.ok){
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `HTTP ${res.status}`)
        }
        finishSkinPicker()
    } catch(err) {
        showSkinPickerError(Lang.queryJS('skinPicker.error') + ' (' + err.message + ')')
        skinPickerUploadSubmit.disabled = false
    }
}
