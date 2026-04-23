const db     = require('../../db');
const tournamentManager = require('../../tournament/tournamentManager');
const logger = require('../../utils/logger');

const FORMATS = ['swiss', 'arena', 'knockout', 'round_robin'];

async function execute(job) {
    logger.info('Jobs', 'Executing daily_tournament_scheduler job.');
    
    const baseTime = new Date();
    baseTime.setUTCHours(0, 0, 0, 0);
    const startOfToday = baseTime.getTime();

    const schedule = [
        { format: 'arena',       min: 5,  inc: 5,  duration: 30, launchInHours: 12, maxP: 100 },
        { format: 'arena',       min: 5,  inc: 5,  duration: 30, launchInHours: 16, maxP: 100 },
        { format: 'arena',       min: 5,  inc: 5,  duration: 30, launchInHours: 20, maxP: 100 },
        { format: 'arena',       min: 10, inc: 10, duration: 60, launchInHours: 20, maxP: 100 },
        { format: 'arena',       min: 15, inc: 30, duration: 60, launchInHours: 20, maxP: 100 },
        { format: 'swiss',       min: 10, inc: 10, duration: 7,  launchInHours: 20, maxP: 100 },
        { format: 'knockout',    min: 10, inc: 10, duration: 3,  launchInHours: 16, maxP: 8 },
        { format: 'round_robin', min: 10, inc: 10, duration: 7,  launchInHours: 17, maxP: 8 },
    ];

    for (const item of schedule) {
        try {
            const launchAt = startOfToday + (item.launchInHours * 60 * 60 * 1000);
            
            // If the launch time has already passed for today, don't create it
            if (launchAt < Date.now()) continue;

            const opts = {
                creatorId: 'system',
                creatorUsername: 'System',
                format: item.format,
                timeControlMinutes: item.min,
                timeControlIncrement: item.inc,
                launchMode: 'both',
                launchAt: launchAt,
                maxParticipants: item.maxP,
                durationValue: item.duration,
                invitedBots: 0, // No bots as requested
                creatorPlays: false,
            };
            
            const tournament = await tournamentManager.createTournament(opts);
            logger.info('Jobs', `Created scheduled ${item.format} tournament: ${tournament.name} at ${new Date(launchAt).toISOString()}`);
        } catch (err) {
            logger.error('Jobs', `Failed to create scheduled tournament: ${err.message}`);
        }
    }
}

module.exports = { execute };
