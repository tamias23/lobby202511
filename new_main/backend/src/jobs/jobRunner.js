const db = require('../db');
const logger = require('../utils/logger');
const valkeySync = require('../valkeySync');
const parquetExportHandler = require('./handlers/parquetExport');
const launchTournamentHandler = require('./handlers/launchTournament');
const resetDailyLimitsHandler = require('./handlers/resetDailyLimits');
const dailyTournamentSchedulerHandler = require('./handlers/dailyTournamentScheduler');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RETENTION_DAYS = 30;

const HANDLERS = {
    'parquet_export': parquetExportHandler,
    'launch_tournament': launchTournamentHandler,
    'reset_daily_limits': resetDailyLimitsHandler,
    'daily_tournament_scheduler': dailyTournamentSchedulerHandler,
};

async function checkJobs() {
    try {
        const now = Date.now();
        const dueJobs = await db.getDueJobs(now);
        
        for (const job of dueJobs) {
            // Try to acquire distributed lock
            const locked = await valkeySync.tryLockJob(job.id);
            if (!locked) continue; // Another instance is handling it
            
            // Mark as running (Firestore is no longer doing optimistic locking, but we still update the UI state)
            await db.updateJob(job.id, { status: 'RUNNING', started_at: Date.now(), worker_id: valkeySync.getInstanceId() });
            
            try {
                const handler = HANDLERS[job.type];
                if (!handler) throw new Error(`Unknown job type: ${job.type}`);
                
                await handler.execute(job);
                
                // Mark as DONE
                await db.updateJob(job.id, { status: 'DONE', completed_at: Date.now() });
                
                // If recurring, schedule the next one
                if (handler.scheduleNext) {
                    await handler.scheduleNext(job);
                }
            } catch (err) {
                logger.error('Jobs', `Job ${job.id} (${job.type}) failed: ${err.message}`);
                await db.updateJob(job.id, { status: 'FAILED', completed_at: Date.now(), error: err.message });
            }
        }
    } catch (err) {
        logger.error('Jobs', `Error during job check: ${err.message}`);
    }
}

async function cleanupOldJobs() {
    try {
        const cutoffMs = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const oldJobs = await db.getJobsOlderThan(cutoffMs);
        if (oldJobs.length > 0) {
            const jobIds = oldJobs.map(j => j.id);
            await db.deleteJobsByIds(jobIds);
            logger.info('Jobs', `Cleaned up ${jobIds.length} old jobs.`);
        }
    } catch (err) {
        logger.error('Jobs', `Error during job cleanup: ${err.message}`);
    }
}

function start() {
    logger.info('Jobs', 'Starting job runner loop.');
    setInterval(() => {
        checkJobs();
        cleanupOldJobs();
    }, POLL_INTERVAL_MS);
    
    // Check shortly after startup
    setTimeout(checkJobs, 10000);
    
    // Ensure initial jobs exist
    setTimeout(parquetExportHandler.ensureInitialJob, 15000);
    setTimeout(resetDailyLimitsHandler.ensureInitialJob, 15500);
    setTimeout(dailyTournamentSchedulerHandler.ensureInitialJob, 16000);
}

module.exports = { start, checkJobs };
