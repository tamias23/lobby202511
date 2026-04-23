const db     = require('../../db');
const logger = require('../../utils/logger');

async function execute(job) {
    logger.info('Jobs', 'Executing reset_daily_limits job.');
    await db.resetDailyLimits();
}

module.exports = { execute };
