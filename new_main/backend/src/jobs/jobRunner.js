/**
 * jobRunner.js — Crontab-style job scheduler.
 *
 * Each job type has ONE persistent row in the 'cron_jobs' collection with
 * cron fields (minute, hour, weekday) plus metadata.  The runner polls every
 * minute, matches jobs whose cron expression matches the current UTC time, and
 * fires them (with a distributed Valkey lock to avoid duplicate execution on
 * multi-replica deployments).
 *
 * A separate 'jobs' collection stores an execution log (one record per run).
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const db             = require('../db');
const logger         = require('../utils/logger');
const valkeySync     = require('../valkeySync');
const { matchesCron, describeCron } = require('./cronUtils');

const parquetExportHandler          = require('./handlers/parquetExport');
const launchTournamentHandler       = require('./handlers/launchTournament');
const resetDailyLimitsHandler       = require('./handlers/resetDailyLimits');
const dailyTournamentSchedulerHandler = require('./handlers/dailyTournamentScheduler');
const leaderboardBuilderHandler     = require('./handlers/leaderboardBuilder');

const POLL_INTERVAL_MS = 60 * 1000; // 1 minute
const RETENTION_DAYS   = 30;

const HANDLERS = {
    'parquet_export':             parquetExportHandler,
    'launch_tournament':          launchTournamentHandler,
    'reset_daily_limits':         resetDailyLimitsHandler,
    'daily_tournament_scheduler': dailyTournamentSchedulerHandler,
    'leaderboard_builder':        leaderboardBuilderHandler,
};

// ── Default cron schedule (used for first-run seeding) ──────────────────────
const DEFAULT_CRON_JOBS = [
    {
        type:        'reset_daily_limits',
        description: 'Reset per-user daily game counters',
        minute:      0,
        hour:        0,
        weekday:     '*',
        enabled:     true,
    },
    {
        type:        'daily_tournament_scheduler',
        description: 'Create the daily scheduled tournaments',
        minute:      0,
        hour:        0,
        weekday:     '*',
        enabled:     true,
    },
    {
        type:        'parquet_export',
        description: 'Export old games to Parquet/GCS',
        minute:      0,
        hour:        20,
        weekday:     '*',
        enabled:     true,
    },
    {
        type:        'leaderboard_builder',
        description: 'Rebuild the top-50 leaderboard for all rating categories',
        minute:      '*/5',   // every 5 minutes
        hour:        '*',
        weekday:     '*',
        enabled:     true,
    },
];

// ─── Track last-fired minute per job (in-memory, per instance) ───────────────
// Prevents double-firing in the same minute window on multi-replica setups.
const _lastFiredMinute = {};   // type → 'YYYY-MM-DDTHH:MM' string

// ── Cron tick ────────────────────────────────────────────────────────────────

async function checkJobs() {
    try {
        const now       = new Date();
        const nowKey    = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}T${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}`;

        const cronJobs = await db.getCronJobs();

        for (const cronJob of cronJobs) {
            if (!cronJob.enabled) continue;

            const handler = HANDLERS[cronJob.type];
            if (!handler) {
                logger.warn('Jobs', `No handler registered for cron job type: ${cronJob.type}`);
                continue;
            }

            // Standard cron match
            if (!matchesCron(cronJob, now)) continue;
            // Prevent double-firing in the same minute window
            if (_lastFiredMinute[cronJob.type] === nowKey) continue;
            _lastFiredMinute[cronJob.type] = nowKey;

            // Distributed lock — only one instance executes the job
            const lockKey = `${cronJob.type}_${nowKey}`;
            const locked  = await valkeySync.tryLockJob(lockKey);
            if (!locked) continue;

            // Fire the job
            const runId = uuidv4();
            await db.saveJob({
                id:         runId,
                type:       cronJob.type,
                status:     'RUNNING',
                started_at: Date.now(),
                created_at: Date.now(),
                worker_id:  valkeySync.getInstanceId(),
                payload:    {},
            });
            await db.updateCronJob(cronJob.type, {
                last_run_at:     Date.now(),
                last_run_status: 'RUNNING',
                last_run_id:     runId,
            });

            // Execute asynchronously so other jobs aren't blocked
            (async () => {
                try {
                    await handler.execute(cronJob);
                    await db.updateJob(runId, { status: 'DONE', completed_at: Date.now() });
                    await db.updateCronJob(cronJob.type, { last_run_status: 'DONE', last_run_at: Date.now() });
                    logger.info('Jobs', `Cron job '${cronJob.type}' completed successfully.`);
                } catch (err) {
                    logger.error('Jobs', `Cron job '${cronJob.type}' FAILED: ${err.message}`);
                    await db.updateJob(runId, { status: 'FAILED', completed_at: Date.now(), error: err.message });
                    await db.updateCronJob(cronJob.type, { last_run_status: 'FAILED', last_run_at: Date.now(), last_error: err.message });
                }
            })();
        }
    } catch (err) {
        logger.error('Jobs', `Error during cron check: ${err.message}`);
    }
}

// ── Cleanup old run-log entries ───────────────────────────────────────────────

async function cleanupOldJobs() {
    try {
        const cutoffMs = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const oldJobs  = await db.getJobsOlderThan(cutoffMs);
        if (oldJobs.length > 0) {
            await db.deleteJobsByIds(oldJobs.map(j => j.id));
            logger.info('Jobs', `Cleaned up ${oldJobs.length} old job run(s).`);
        }
    } catch (err) {
        logger.error('Jobs', `Error during job cleanup: ${err.message}`);
    }
}

// ── Seed default cron jobs if missing ────────────────────────────────────────

async function seedCronJobs() {
    const existing = await db.getCronJobs();
    const existingTypes = new Set(existing.map(j => j.type));

    for (const def of DEFAULT_CRON_JOBS) {
        if (!existingTypes.has(def.type)) {
            await db.upsertCronJob({
                ...def,
                created_at:      Date.now(),
                last_run_at:     null,
                last_run_status: null,
                last_run_id:     null,
                last_error:      null,
            });
            logger.info('Jobs', `Seeded cron job: ${def.type} — ${describeCron(def)}`);
        }
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

function start() {
    logger.info('Jobs', 'Starting cron job runner (1-minute polling interval).');
    setInterval(() => {
        checkJobs();
        cleanupOldJobs();
    }, POLL_INTERVAL_MS);

    // Seed cron definitions and fire an initial check shortly after startup
    setTimeout(seedCronJobs, 5000);
    setTimeout(checkJobs,    15000);
}

module.exports = { start, checkJobs };
