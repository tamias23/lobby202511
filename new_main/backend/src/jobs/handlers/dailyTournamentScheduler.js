const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const tournamentManager = require('../../tournament/tournamentManager');
const logger = require('../../utils/logger');

const FORMATS = ['swiss', 'arena', 'knockout', 'round_robin'];

async function execute(job) {
    logger.info('Jobs', 'Executing daily_tournament_scheduler job.');
    
    for (const format of FORMATS) {
        try {
            const opts = {
                creatorId: 'system',
                creatorUsername: 'System',
                format: format,
                timeControlMinutes: 10,
                timeControlIncrement: 5,
                launchMode: 'both', // Start when full or at time
                maxParticipants: format === 'round_robin' ? 20 : 100,
                invitedBots: 10,
                creatorPlays: false,
                // launchAt will be set by createTournament if launchMode is 'at_time' or 'both'
                // default in createTournament is now + 2 hours
            };
            
            const tournament = await tournamentManager.createTournament(opts);
            logger.info('Jobs', `Created daily ${format} tournament: ${tournament.name} (${tournament.id})`);
        } catch (err) {
            logger.error('Jobs', `Failed to create daily ${format} tournament: ${err.message}`);
        }
    }
}

async function scheduleNext(job) {
    // Schedule exactly for 00:00 UTC tomorrow
    const nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(0, 0, 0, 0); // 00:00 UTC
    
    const nextJob = {
        id: uuidv4(),
        type: 'daily_tournament_scheduler',
        status: 'SCHEDULED',
        scheduled_at: nextDate.getTime(),
        payload: {},
        created_at: Date.now(),
    };
    
    await db.saveJob(nextJob);
    logger.info('Jobs', `Scheduled next daily_tournament_scheduler job for ${nextDate.toISOString()}`);
}

async function ensureInitialJob() {
    // Check if there are any daily_tournament_scheduler jobs SCHEDULED
    const dueJobs = await db.getDueJobs(Date.now() + 365*24*60*60*1000);
    const hasJob = dueJobs.some(j => j.type === 'daily_tournament_scheduler');
    
    if (!hasJob) {
        const nextDate = new Date();
        // If it's already past 00:00 UTC, schedule for tomorrow
        // But maybe we want one today if it's missing? 
        // Let's schedule it for 5 minutes from now if missing, so it runs immediately on first start
        const scheduledAt = Date.now() + 5 * 60 * 1000; 
        
        const nextJob = {
            id: uuidv4(),
            type: 'daily_tournament_scheduler',
            status: 'SCHEDULED',
            scheduled_at: scheduledAt,
            payload: {},
            created_at: Date.now(),
        };
        await db.saveJob(nextJob);
        logger.info('Jobs', `Created initial daily_tournament_scheduler job for ${new Date(scheduledAt).toISOString()}`);
    }
}

module.exports = { execute, scheduleNext, ensureInitialJob };
