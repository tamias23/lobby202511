const db     = require('../../db');
const logger = require('../../utils/logger');

const JOB_TYPE = 'leaderboard_builder';

/**
 * Builds the top-50 leaderboards for each rating category.
 * Saves the result to 'leaderboards/global'.
 */
async function execute(job) {
    logger.info('Leaderboard', 'Starting leaderboard build job...');
    
    const categories = [
        { id: 'bullet',    field: 'rating_bullet',    label: 'Bullet' },
        { id: 'blitz',     field: 'rating_blitz',     label: 'Blitz' },
        { id: 'rapid',     field: 'rating_rapid',     label: 'Rapid' },
        { id: 'classical', field: 'rating_classical', label: 'Classical' },
    ];

    const results = {};
    
    for (const cat of categories) {
        try {
            results[cat.id] = {
                label:   cat.label,
                players: await db.getTopPlayers(cat.field, 50),
            };
        } catch (e) {
            logger.error('Leaderboard', `Failed to build leaderboard for ${cat.id}: ${e.message}`);
            results[cat.id] = { label: cat.label, players: [] };
        }
    }

    await db.saveLeaderboard('global', results);
    logger.info('Leaderboard', 'Leaderboard build complete.');
}

module.exports = { execute };
