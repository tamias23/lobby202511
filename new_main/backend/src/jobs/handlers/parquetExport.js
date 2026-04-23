const { offloadOldGames } = require('../../gcsSync');
const db     = require('../../db');
const logger = require('../../utils/logger');

async function execute(job) {
    logger.info('Jobs', 'Executing parquet_export job.');
    await offloadOldGames(db);
}

module.exports = { execute };
