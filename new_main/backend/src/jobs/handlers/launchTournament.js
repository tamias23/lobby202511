const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const tournamentManager = require('../../tournament/tournamentManager');
const logger = require('../../utils/logger');

async function execute(job) {
    logger.info('Jobs', `Executing launch_tournament job with payload: ${JSON.stringify(job.payload || {})}`);
    
    // Default config per user request: "10+10, arena, max participants"
    const payload = job.payload || {};
    const format = payload.format || 'arena';
    const tcMin = payload.timeControlMinutes || 10;
    const tcInc = payload.timeControlIncrement || 10;
    
    const opts = {
        creatorId: 'system',
        creatorUsername: 'System',
        format: format,
        timeControlMinutes: tcMin,
        timeControlIncrement: tcInc,
        launchMode: payload.launchMode || 'when_complete', 
        name: payload.name || undefined, 
        maxParticipants: payload.maxParticipants || 200, 
        invitedBots: payload.invitedBots || 0,
        creatorPlays: false,
    };
    
    const tournament = await tournamentManager.createTournament(opts);
    logger.info('Jobs', `Created tournament ${tournament.id} from job.`);
    
    // Auto-start if requested in payload
    if (payload.startImmediately) {
        await tournamentManager.startTournament(tournament.id);
    }
}

async function scheduleNext(job) {
    if (!job.payload || !job.payload.repeat) return;
    
    const nextDate = new Date(job.scheduled_at || Date.now());
    if (job.payload.repeat === 'daily') {
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    } else if (job.payload.repeat === 'weekly') {
        nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    } else if (job.payload.repeat === 'monthly') {
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    } else {
        return;
    }
    
    const nextJob = {
        id: uuidv4(),
        type: 'launch_tournament',
        status: 'SCHEDULED',
        scheduled_at: nextDate.getTime(),
        payload: job.payload,
        created_at: Date.now(),
    };
    
    await db.saveJob(nextJob);
    logger.info('Jobs', `Scheduled next launch_tournament (${job.payload.repeat}) for ${nextDate.toISOString()}`);
}

module.exports = { execute, scheduleNext };
