const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const logger = require('../../utils/logger');

async function execute(job) {
    logger.info('Jobs', 'Executing reset_daily_limits job.');
    await db.resetDailyLimits();
}

async function scheduleNext(job) {
    // Schedule exactly for 00:00 UTC tomorrow
    const nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(0, 0, 0, 0); // 00:00 UTC
    
    const nextJob = {
        id: uuidv4(),
        type: 'reset_daily_limits',
        status: 'SCHEDULED',
        scheduled_at: nextDate.getTime(),
        payload: {},
        created_at: Date.now(),
    };
    
    await db.saveJob(nextJob);
    logger.info('Jobs', `Scheduled next reset_daily_limits job for ${nextDate.toISOString()}`);
}

async function ensureInitialJob() {
    // Check if there are any reset_daily_limits jobs SCHEDULED
    const dueJobs = await db.getDueJobs(Date.now() + 365*24*60*60*1000);
    const hasResetJob = dueJobs.some(j => j.type === 'reset_daily_limits');
    
    if (!hasResetJob) {
        const nextDate = new Date();
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        nextDate.setUTCHours(0, 0, 0, 0);
        
        const nextJob = {
            id: uuidv4(),
            type: 'reset_daily_limits',
            status: 'SCHEDULED',
            scheduled_at: nextDate.getTime(),
            payload: {},
            created_at: Date.now(),
        };
        await db.saveJob(nextJob);
        logger.info('Jobs', `Created initial reset_daily_limits job for ${nextDate.toISOString()}`);
    }
}

module.exports = { execute, scheduleNext, ensureInitialJob };
