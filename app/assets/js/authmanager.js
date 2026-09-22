/**
 * AuthManager
 *
 * Cobblemon Frontier Launcher note: this fork only supports offline accounts
 * (no Mojang/Microsoft auth). This works because the game server this launcher
 * targets runs with online-mode=false -- verification of game ownership happens
 * server-side (or not at all), never client-side. The client just needs a
 * username and a locally-generated offline UUID, computed the same way vanilla
 * Minecraft does for offline/LAN play.
 *
 * @module authmanager
 */
// Requirements
const crypto                 = require('crypto')
const ConfigManager          = require('./configmanager')
const { LoggerUtil }         = require('helios-core')
const Lang                   = require('./langloader')

const log = LoggerUtil.getLogger('AuthManager')

const validUsername = /^[a-zA-Z0-9_]{1,16}$/

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
 * validated locally and an offline UUID is derived from it. This will fail
 * client-side validation only; the actual game server (running in offline
 * mode) is what decides whether the connection is accepted.
 *
 * @param {string} username The desired in-game username.
 * @returns {Promise.<Object>} Promise which resolves to the created account object.
 */
exports.addOfflineAccount = async function(username) {
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
 * Remove an offline account. There is no remote session to invalidate -- just
 * drop it from the local database. Kept as `removeMojangAccount` since that's
 * the name the settings UI already calls for any non-Microsoft account.
 *
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>} Promise which resolves to void when the action is complete.
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

/**
 * Remove a Microsoft account. It is expected that the caller will invoke the OAuth logout
 * through the ipc renderer.
 * 
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>} Promise which resolves to void when the action is complete.
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
 * Validate the selected auth account. Offline accounts have no remote
 * session to check and never expire, so this is always true as long as
 * one is selected.
 * 
 * @returns {Promise.<boolean>} Promise which resolves to true if an account
 * is selected, otherwise false.
 */
exports.validateSelected = async function(){
    const current = ConfigManager.getSelectedAccount()
    return current != null
}
