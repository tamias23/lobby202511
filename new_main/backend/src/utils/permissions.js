const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let rolesConfig = { permissions: {}, limits: {} };

try {
    const configPath = path.join(__dirname, '../config/roles.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    rolesConfig = JSON.parse(raw);
    logger.info('Permissions', 'roles.json loaded.');
} catch (e) {
    logger.error('Permissions', 'Failed to load roles.json:', e.message);
}

/**
 * Check if a role can perform a specific action.
 * @param {string} role 'guest', 'registered', 'subscriber', 'admin'
 * @param {string} action e.g. 'rated_game_player'
 * @returns {boolean}
 */
function canUser(role, action) {
    if (!role) role = 'guest';
    const allowedRoles = rolesConfig.permissions[action];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role);
}

/**
 * Get the daily limit for a specific role and limit type.
 * @param {string} role 'guest', 'registered', 'subscriber', 'admin'
 * @param {string} limitName e.g. 'rated_games_per_24h'
 * @returns {number} -1 means unlimited
 */
function getLimit(role, limitName) {
    if (!role) role = 'guest';
    const limitsForType = rolesConfig.limits[limitName];
    if (!limitsForType) return 0;
    
    // If the exact role is missing, fallback to guest
    return limitsForType[role] !== undefined ? limitsForType[role] : (limitsForType['guest'] || 0);
}

function getRolesConfig() {
    return rolesConfig;
}

module.exports = {
    canUser,
    getLimit,
    getRolesConfig
};
