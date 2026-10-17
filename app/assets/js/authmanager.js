/**
 * AuthManager
 *
 * Comptes du launcher Cobblemon Frontier : pseudo hors ligne (serveur en
 * online-mode=false, protégé par AuthMe) et/ou compte Microsoft (serveur en
 * online-mode=true). Les sortes de comptes acceptées viennent de
 * ipcconstants.AUTH_MODES : « pseudo » aujourd'hui, « microsoft+pseudo » pour
 * le launcher TEST, « microsoft » le jour du passage aux comptes Microsoft
 * (préparé le 2026-10-17, cf. docs/MicrosoftAuth.md pour l'application Entra).
 *
 * Le flux Microsoft est celui d'Helios d'origine (retiré le 2026-09-22 par
 * 645d3d9, remis ici) : code OAuth -> jeton Microsoft -> Xbox Live -> XSTS ->
 * jeton Minecraft -> profil.
 *
 * @module authmanager
 */
// Requirements
const crypto                 = require('crypto')
const ConfigManager          = require('./configmanager')
const { LoggerUtil }         = require('helios-core')
const { RestResponseStatus } = require('helios-core/common')
const { MicrosoftAuth, MicrosoftErrorCode } = require('helios-core/microsoft')
const { AZURE_CLIENT_ID, AUTH_MODES } = require('./ipcconstants')
const Lang                   = require('./langloader')

const log = LoggerUtil.getLogger('AuthManager')

const validUsername = /^[a-zA-Z0-9_]{1,16}$/

/** Sortes de comptes acceptées par ce launcher : 'microsoft', 'pseudo'. */
exports.modes = function() {
    return String(AUTH_MODES).split('+').map(m => m.trim()).filter(m => m === 'microsoft' || m === 'pseudo')
}

/** Ce compte (enregistré) est-il encore accepté par ce launcher ? */
exports.accepte = function(acc) {
    const modes = exports.modes()
    return acc != null && (acc.type === 'microsoft' ? modes.includes('microsoft') : modes.includes('pseudo'))
}

// ---- pseudo hors ligne ----

/**
 * Compute the offline UUID for a username, the same way vanilla Minecraft
 * does for offline-mode/cracked accounts: a version-3 (name-based, MD5) UUID
 * of the string "OfflinePlayer:<username>".
 *
 * @param {string} username
 * @returns {string} A UUID string (with dashes).
 */
function offlineUUID(username) {
    const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest()
    // Set version (3) and variant bits per RFC 4122, matching Java's UUID.nameUUIDFromBytes.
    hash[6] = (hash[6] & 0x0f) | 0x30
    hash[8] = (hash[8] & 0x3f) | 0x80
    const hex = hash.toString('hex')
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`
}

/**
 * Add an offline account. No network request is made -- the username is
 * validated locally and an offline UUID is derived from it.
 *
 * @param {string} username The desired in-game username.
 * @returns {Promise.<Object>} Promise which resolves to the created account object.
 */
exports.addOfflineAccount = async function(username) {
    if(!exports.modes().includes('pseudo')) {
        return Promise.reject({
            title: Lang.queryJS('auth.offline.error.disabledTitle'),
            desc: Lang.queryJS('auth.offline.error.disabledDesc')
        })
    }
    if(!validUsername.test(username)) {
        return Promise.reject({
            title: Lang.queryJS('auth.offline.error.invalidUsernameTitle'),
            desc: Lang.queryJS('auth.offline.error.invalidUsernameDesc')
        })
    }
    const uuid = offlineUUID(username)
    const accessToken = crypto.randomBytes(16).toString('hex')
    const ret = ConfigManager.addOfflineAuthAccount(uuid, accessToken, username)
    ConfigManager.save()
    return ret
}

/**
 * Remove an offline account (kept as `removeMojangAccount`: the name the
 * settings code calls for any non-Microsoft account).
 *
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>}
 */
exports.removeMojangAccount = async function(uuid){
    try {
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
        return Promise.resolve()
    } catch (err){
        log.error('Error while removing account', err)
        return Promise.reject(err)
    }
}

// ---- Microsoft ----

function microsoftErrorDisplayable(errorCode) {
    const cle = {
        [MicrosoftErrorCode.NO_PROFILE]: 'noProfile',
        [MicrosoftErrorCode.NO_XBOX_ACCOUNT]: 'noXboxAccount',
        [MicrosoftErrorCode.XBL_BANNED]: 'xblBanned',
        [MicrosoftErrorCode.UNDER_18]: 'under18'
    }[errorCode] ?? 'unknown'
    return {
        title: Lang.queryJS(`auth.microsoft.error.${cle}Title`),
        desc: Lang.queryJS(`auth.microsoft.error.${cle}Desc`)
    }
}

const AUTH_MODE = { FULL: 0, MS_REFRESH: 1, MC_REFRESH: 2 }

/**
 * Full Microsoft Auth Flow.
 *
 * AUTH_MODE.FULL = Full authorization for a new account.
 * AUTH_MODE.MS_REFRESH = Full refresh authorization.
 * AUTH_MODE.MC_REFRESH = Refresh of the MC token, reusing the MS token.
 *
 * @param {string} entryCode FULL-AuthCode. MS_REFRESH=refreshToken, MC_REFRESH=accessToken
 * @param {*} authMode The auth mode.
 * @returns An object with all auth data. AccessToken object will be null when mode is MC_REFRESH.
 */
async function fullMicrosoftAuthFlow(entryCode, authMode) {
    try {
        let accessTokenRaw
        let accessToken
        if(authMode !== AUTH_MODE.MC_REFRESH) {
            const accessTokenResponse = await MicrosoftAuth.getAccessToken(entryCode, authMode === AUTH_MODE.MS_REFRESH, AZURE_CLIENT_ID)
            if(accessTokenResponse.responseStatus === RestResponseStatus.ERROR) {
                return Promise.reject(microsoftErrorDisplayable(accessTokenResponse.microsoftErrorCode))
            }
            accessToken = accessTokenResponse.data
            accessTokenRaw = accessToken.access_token
        } else {
            accessTokenRaw = entryCode
        }

        const xblResponse = await MicrosoftAuth.getXBLToken(accessTokenRaw)
        if(xblResponse.responseStatus === RestResponseStatus.ERROR) {
            return Promise.reject(microsoftErrorDisplayable(xblResponse.microsoftErrorCode))
        }
        const xstsResonse = await MicrosoftAuth.getXSTSToken(xblResponse.data)
        if(xstsResonse.responseStatus === RestResponseStatus.ERROR) {
            return Promise.reject(microsoftErrorDisplayable(xstsResonse.microsoftErrorCode))
        }
        const mcTokenResponse = await MicrosoftAuth.getMCAccessToken(xstsResonse.data)
        if(mcTokenResponse.responseStatus === RestResponseStatus.ERROR) {
            return Promise.reject(microsoftErrorDisplayable(mcTokenResponse.microsoftErrorCode))
        }
        const mcProfileResponse = await MicrosoftAuth.getMCProfile(mcTokenResponse.data.access_token)
        if(mcProfileResponse.responseStatus === RestResponseStatus.ERROR) {
            return Promise.reject(microsoftErrorDisplayable(mcProfileResponse.microsoftErrorCode))
        }
        return {
            accessToken,
            accessTokenRaw,
            xbl: xblResponse.data,
            xsts: xstsResonse.data,
            mcToken: mcTokenResponse.data,
            mcProfile: mcProfileResponse.data
        }
    } catch(err) {
        log.error(err)
        return Promise.reject(microsoftErrorDisplayable(MicrosoftErrorCode.UNKNOWN))
    }
}

/** Expiry date, advanced by 10 seconds to avoid working with an expired token. */
function calculateExpiryDate(nowMs, epiresInS) {
    return nowMs + ((epiresInS-10)*1000)
}

/**
 * Add a Microsoft account from the OAuth code of the login window.
 *
 * @param {string} authCode The authCode obtained from microsoft.
 * @returns {Promise.<Object>} Promise which resolves the authenticated account object.
 */
exports.addMicrosoftAccount = async function(authCode) {
    if(!exports.modes().includes('microsoft') || !AZURE_CLIENT_ID) {
        return Promise.reject({
            title: Lang.queryJS('auth.microsoft.error.unknownTitle'),
            desc: Lang.queryJS('auth.microsoft.error.disabledDesc')
        })
    }
    const fullAuth = await fullMicrosoftAuthFlow(authCode, AUTH_MODE.FULL)
    const now = new Date().getTime()
    const ret = ConfigManager.addMicrosoftAuthAccount(
        fullAuth.mcProfile.id,
        fullAuth.mcToken.access_token,
        fullAuth.mcProfile.name,
        calculateExpiryDate(now, fullAuth.mcToken.expires_in),
        fullAuth.accessToken.access_token,
        fullAuth.accessToken.refresh_token,
        calculateExpiryDate(now, fullAuth.accessToken.expires_in)
    )
    ConfigManager.save()
    return ret
}

/**
 * Remove a Microsoft account. The caller may also open the OAuth logout window
 * through the ipc renderer (to forget the session cookies).
 *
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>}
 */
exports.removeMicrosoftAccount = async function(uuid){
    try {
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
        return Promise.resolve()
    } catch (err){
        log.error('Error while removing account', err)
        return Promise.reject(err)
    }
}

/**
 * Validate the selected Microsoft account: refresh the Minecraft token (and the
 * Microsoft one if needed). False if a new login is required.
 */
async function validateSelectedMicrosoftAccount(){
    const current = ConfigManager.getSelectedAccount()
    const now = new Date().getTime()
    if(now < current.expiresAt) {
        return true
    }
    const msExpired = now >= current.microsoft.expires_at
    try {
        if(msExpired) {
            const res = await fullMicrosoftAuthFlow(current.microsoft.refresh_token, AUTH_MODE.MS_REFRESH)
            ConfigManager.updateMicrosoftAuthAccount(
                current.uuid,
                res.mcToken.access_token,
                res.accessToken.access_token,
                res.accessToken.refresh_token,
                calculateExpiryDate(now, res.accessToken.expires_in),
                calculateExpiryDate(now, res.mcToken.expires_in)
            )
        } else {
            const res = await fullMicrosoftAuthFlow(current.microsoft.access_token, AUTH_MODE.MC_REFRESH)
            ConfigManager.updateMicrosoftAuthAccount(
                current.uuid,
                res.mcToken.access_token,
                current.microsoft.access_token,
                current.microsoft.refresh_token,
                current.microsoft.expires_at,
                calculateExpiryDate(now, res.mcToken.expires_in)
            )
        }
        ConfigManager.save()
        return true
    } catch(_err) {
        return false
    }
}

/**
 * Validate the selected auth account: a Microsoft account is refreshed if needed;
 * an offline account never expires, but is refused when this launcher only
 * accepts Microsoft accounts.
 *
 * @returns {Promise.<boolean>} True if the account can be used, otherwise false.
 */
exports.validateSelected = async function(){
    const current = ConfigManager.getSelectedAccount()
    if(current == null || !exports.accepte(current)) {
        return false
    }
    if(current.type === 'microsoft') {
        return await validateSelectedMicrosoftAccount()
    }
    return true
}
