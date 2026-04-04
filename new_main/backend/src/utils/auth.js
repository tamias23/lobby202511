const crypto = require('crypto');

/**
 * Generates a guest ID: "guest_" + sha-256 hash of a random string (500+ characters)
 * @returns {string} The formatted guest ID
 */
const generateGuestId = () => {
    // Generate a long random string (using base64 to ensure length and complexity)
    // 500+ characters: 400 bytes gives ~534 characters in base64
    const randomString = crypto.randomBytes(400).toString('base64');
    
    // Create SHA-256 hash
    const hash = crypto.createHash('sha256').update(randomString).digest('hex');
    
    return `guest_${hash}`;
};

/**
 * Verifies if a given ID is a guest ID
 * @param {string} id 
 * @returns {boolean}
 */
const isGuestId = (id) => {
    return id.startsWith('guest_');
};

module.exports = {
    generateGuestId,
    isGuestId
};
