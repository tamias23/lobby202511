const db     = require('../../db');
const tournamentManager = require('../../tournament/tournamentManager');
const logger = require('../../utils/logger');

/**
 * Compute the tournament launchAt timestamp for a given template item.
 * Returns { tournamentLaunchMode, launchAt } ready to pass to createTournament.
 *
 * Template launch_mode values:
 *   'when_complete' — starts when max_participants join
 *   'at_time'       — starts at the UTC hour specified by launch_hour
 *   'starts_in'     — starts N minutes after the job runs (relative)
 *   'any' / 'both'  — starts on whichever condition fires first
 */
function _resolveTimings(item, jobStartedAt) {
    const mode           = item.launch_mode || 'any';
    const launchHour     = Number(item.launch_hour)      || 20;
    const startInMinutes = Number(item.start_in_minutes) || 0;

    // Midnight UTC of the current day
    const base = new Date(jobStartedAt);
    base.setUTCHours(0, 0, 0, 0);
    const atTimeTs    = base.getTime() + launchHour * 60 * 60 * 1000;
    const startsInTs  = jobStartedAt  + startInMinutes * 60 * 1000;

    switch (mode) {
        case 'when_complete':
            return { tournamentLaunchMode: 'when_complete', launchAt: null, skip: false };

        case 'at_time': {
            if (atTimeTs < jobStartedAt) return { skip: true, reason: `at_time ${launchHour}:00 UTC already passed` };
            return { tournamentLaunchMode: 'at_time', launchAt: atTimeTs, skip: false };
        }

        case 'starts_in': {
            // Always in the future (relative to now)
            return { tournamentLaunchMode: 'at_time', launchAt: startsInTs, skip: false };
        }

        case 'any':
        case 'both':
        default: {
            // Pick the earliest future time across all applicable conditions.
            // Tournament will launch when EITHER: player count reached, OR earliest time fires.
            const candidates = [];
            if (startInMinutes > 0) candidates.push(startsInTs);
            if (atTimeTs >= jobStartedAt) candidates.push(atTimeTs);

            const launchAt = candidates.length > 0 ? Math.min(...candidates) : null;
            return {
                tournamentLaunchMode: launchAt != null ? 'both' : 'when_complete',
                launchAt,
                skip: false,
            };
        }
    }
}

async function execute(job) {
    logger.info('Jobs', 'Executing daily_tournament_scheduler job.');
    const jobStartedAt = Date.now();

    const schedule = await db.getTournamentSchedule();
    const enabled  = schedule.filter(item => item.enabled !== false);

    if (enabled.length === 0) {
        logger.info('Jobs', 'No enabled tournament schedule entries — nothing to create.');
        return;
    }

    for (const item of enabled) {
        try {
            const { tournamentLaunchMode, launchAt, skip, reason } = _resolveTimings(item, jobStartedAt);

            if (skip) {
                logger.info('Jobs', `Skipping ${item.format}: ${reason}.`);
                continue;
            }

            const opts = {
                creatorId:            'system',
                creatorUsername:      'System',
                format:               item.format,
                timeControlMinutes:   Number(item.minutes)          || 10,
                timeControlIncrement: Number(item.increment)        || 5,
                launchMode:           tournamentLaunchMode,
                launchAt:             launchAt,
                maxParticipants:      Number(item.max_participants)  || 100,
                durationValue:        Number(item.duration)          || 7,
                invitedBots:          Number(item.invited_bots)      || 0,
                creatorPlays:         false,
            };

            const tournament = await tournamentManager.createTournament(opts);
            const timeStr = launchAt ? `at ${new Date(launchAt).toISOString()}` : 'when full';
            logger.info('Jobs', `Created ${item.format} [${item.launch_mode}] → ${tournament.name} ${timeStr}`);
        } catch (err) {
            logger.error('Jobs', `Failed to create tournament (${item.format} mode=${item.launch_mode}): ${err.message}`);
        }
    }
}

module.exports = { execute };
