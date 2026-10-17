// Application Microsoft (Entra) de Cobblemon Frontier, enregistrée par le propriétaire du serveur
// (docs/MicrosoftAuth.md) ; l'identifiant d'Helios d'origine n'est pas le nôtre. Vide tant qu'elle
// n'existe pas : la connexion Microsoft est alors refusée proprement.
exports.AZURE_CLIENT_ID = ''

// Comptes acceptés : 'pseudo' (serveur hors ligne + AuthMe, aujourd'hui), 'microsoft+pseudo'
// (launcher TEST, cf. launcher/build-launcher-test.sh), 'microsoft' (jour du passage aux comptes Microsoft).
exports.AUTH_MODES = 'pseudo'


// Opcodes
exports.MSFT_OPCODE = {
    OPEN_LOGIN: 'MSFT_AUTH_OPEN_LOGIN',
    OPEN_LOGOUT: 'MSFT_AUTH_OPEN_LOGOUT',
    REPLY_LOGIN: 'MSFT_AUTH_REPLY_LOGIN',
    REPLY_LOGOUT: 'MSFT_AUTH_REPLY_LOGOUT'
}
// Reply types for REPLY opcode.
exports.MSFT_REPLY_TYPE = {
    SUCCESS: 'MSFT_AUTH_REPLY_SUCCESS',
    ERROR: 'MSFT_AUTH_REPLY_ERROR'
}
// Error types for ERROR reply.
exports.MSFT_ERROR = {
    ALREADY_OPEN: 'MSFT_AUTH_ERR_ALREADY_OPEN',
    NOT_FINISHED: 'MSFT_AUTH_ERR_NOT_FINISHED'
}

exports.SHELL_OPCODE = {
    TRASH_ITEM: 'TRASH_ITEM'
}

// Cobblemon Frontier Launcher skin selection API. This key only gates
// "set a skin" -- not an admin/server capability -- so shipping it inside
// the launcher binary (where it's trivially extractable) is acceptable.
exports.SKIN_API_BASE = 'https://cobblemon-frontier.fr/cobblemon-launcher/api'
exports.SKIN_API_KEY = '03f62349c8ad1ede57abd092ab0a742978dd2b63662a6f75'