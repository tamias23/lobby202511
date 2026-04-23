/**
 * Maps a time control to a specific rating field category.
 * Formula: total = minutes + (increment * 40 / 60)
 * 
 * @param {object} tc - { minutes, increment }
 * @returns {string} - 'rating_bullet' | 'rating_blitz' | 'rating_rapid' | 'rating_classical'
 */
function getRatingField(tc) {
    const category = getCategoryKey(tc);
    return category === 'rating' ? 'rating' : `rating_${category}`;
}

/**
 * Returns the category key ('bullet', 'blitz', etc.) for a time control.
 */
function getCategoryKey(tc) {
    if (!tc || tc.minutes === undefined || tc.increment === undefined) return 'rating';
    
    const total = tc.minutes + (tc.increment * 40 / 60);
    
    // Thresholds as modified by the user
    if (total < 5)  return 'bullet';
    if (total < 12) return 'blitz';
    if (total < 25) return 'rapid';
    return 'classical';
}

/**
 * Returns a human-readable label for a rating category.
 */
function getCategoryLabel(category) {
    const labels = {
        'bullet': 'Bullet',
        'blitz': 'Blitz',
        'rapid': 'Rapid',
        'classical': 'Classical'
    };
    return labels[category] || 'Unknown';
}

module.exports = { getRatingField, getCategoryLabel, getCategoryKey };
