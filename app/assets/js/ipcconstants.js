// Plus d'identifiant Azure d'Helios (0.4.4) : la connexion Microsoft n'existe plus, le compte du jeu passe par l'API
// du launcher. Les codes MSFT ci-dessous restent seulement parce que l'ancien écran des paramètres (settings.js, jamais
// affiché) s'y abonne encore.

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

// API du launcher (comptes, tickets de connexion, skins). Depuis la 0.4.0, tout passe par le jeton du compte connecté
// (Authorization: Bearer) ; l'ancienne clé partagée des skins est retirée du launcher en 0.4.4.
exports.SKIN_API_BASE = 'https://cobblemon-frontier.fr/cobblemon-launcher/api'
// Serveur dont le compte (AuthMe) est utilisé par la connexion du launcher. build-launcher-test.sh le remplace par 'test'.
exports.SERVEUR_COMPTE = 'prod'
