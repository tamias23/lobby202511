const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const { offloadOldGames } = require('../../gcsSync');
const logger = require('../../utils/logger');

async function execute(job) {
    logger.info('Jobs', 'Executing parquet_export job.');
    await offloadOldGames(db);
}

async function scheduleNext(job) {
    // Schedule exactly 24 hours from the job's intended schedule, or 20:00 UTC next day
    const nextDate = new Date(job.scheduled_at || Date.now());
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(20, 0, 0, 0); // 20:00 UTC
    
    const nextJob = {
        id: uuidv4(),
        type: 'parquet_export',
        status: 'SCHEDULED',
        scheduled_at: nextDate.getTime(),
        payload: {},
        created_at: Date.now(),
    };
    
    await db.saveJob(nextJob);
    logger.info('Jobs', `Scheduled next parquet_export job for ${nextDate.toISOString()}`);
}

async function ensureInitialJob() {
    // Check if there are any parquet_export jobs SCHEDULED
    // If not, create one for today at 20:00 UTC (or tomorrow if today is past 20:00)
    const dueJobs = await db.getDueJobs(Date.now() + 365*24*60*60*1000);
    const hasParquet = dueJobs.some(j => j.type === 'parquet_export');
    
    if (!hasParquet) {
        const nextDate = new Date();
        if (nextDate.getUTCHours() >= 20) {
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        }
        nextDate.setUTCHours(20, 0, 0, 0);
        
        const nextJob = {
            id: uuidv4(),
            type: 'parquet_export',
            status: 'SCHEDULED',
            scheduled_at: nextDate.getTime(),
            payload: {},
            created_at: Date.now(),
        };
        await db.saveJob(nextJob);
        logger.info('Jobs', `Created initial parquet_export job for ${nextDate.toISOString()}`);
    }
}

module.exports = { execute, scheduleNext, ensureInitialJob };
