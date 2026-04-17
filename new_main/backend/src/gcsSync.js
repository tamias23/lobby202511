'use strict';

// ─── GCS Persistence Module ───────────────────────────────────────────────────
//
// Strategy:
//   users.duckdb      ← restore from GCS on startup, sync to GCS every 15 min
//   tournaments.duckdb← same as users
//   games.duckdb      ← always fresh; export all rows to timestamped Parquet every 15 min
//
// Only active when both GCS_BUCKET and DB_PATH env vars are set (i.e. on GCP).
// Locally, restoreFromGcs() and startGcsSync() are silent no-ops.
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const GCS_BUCKET        = process.env.GCS_BUCKET;   // e.g. 'data-bucket-mylittleproject00'
const DB_PATH           = process.env.DB_PATH;       // e.g. '/tmp/db'
const SYNC_INTERVAL_MS  = 15 * 60 * 1000;           // 15 minutes

// Only activate in production (NODE_ENV=production is set automatically by Cloud Run / Dockerfile)
const isGcpMode = !!(GCS_BUCKET && DB_PATH && process.env.NODE_ENV === 'production');

// Lazy-load Storage so the library is never imported locally
let bucket;
function getBucket() {
    if (!bucket) {
        const { Storage } = require('@google-cloud/storage');
        bucket = new Storage().bucket(GCS_BUCKET);
    }
    return bucket;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format: YYYYMMDDThhmmss (UTC) */
function timestamp() {
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
           `T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
}

/**
 * Download a file from GCS to a local path.
 * Returns true if the file was downloaded, false if it didn't exist in GCS.
 */
async function downloadFromGcs(gcsPath, localPath) {
    try {
        await getBucket().file(gcsPath).download({ destination: localPath });
        logger.info('GCS', `✓ Restored  gs://${GCS_BUCKET}/${gcsPath}  →  ${localPath}`);
        return true;
    } catch (e) {
        if (e.code === 404 || (e.message && e.message.includes('No such object'))) {
            logger.info('GCS', `No ${gcsPath} in bucket — starting fresh.`);
            return false;
        }
        throw e;
    }
}

/**
 * Upload a local file to GCS.
 */
async function uploadToGcs(localPath, gcsPath) {
    await getBucket().upload(localPath, { destination: gcsPath });
    logger.info('GCS', `✓ Synced    ${localPath}  →  gs://${GCS_BUCKET}/${gcsPath}`);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called BEFORE initDb() at startup.
 * Downloads users.duckdb and tournaments.duckdb from GCS so DuckDB can open them.
 * games.duckdb is intentionally NOT restored — it always starts fresh.
 */
async function restoreFromGcs() {
    if (!isGcpMode) {
        logger.debug('GCS', 'Local mode — skipping GCS restore.');
        return;
    }
    logger.info('GCS', `Restoring databases from gs://${GCS_BUCKET} → ${DB_PATH}`);
    fs.mkdirSync(DB_PATH, { recursive: true });

    await downloadFromGcs('users.duckdb',            path.join(DB_PATH, 'users.duckdb'));
    await downloadFromGcs('tournaments.duckdb',      path.join(DB_PATH, 'tournaments.duckdb'));
    await downloadFromGcs('tournament_games.duckdb', path.join(DB_PATH, 'tournament_games.duckdb'));
    // games.duckdb always starts fresh — no restore needed
    logger.info('GCS', 'Restore complete. games.duckdb starts fresh.');
}

/**
 * Checkpoint a LazyDbConnection then copy its file to GCS.
 */
async function syncDbFile(lazyDb, fileName) {
    try {
        // Flush WAL into the main file before copying
        await lazyDb.run('CHECKPOINT');
    } catch (e) {
        logger.warn('GCS', `CHECKPOINT failed for ${fileName}:`, e.message);
    }
    await uploadToGcs(path.join(DB_PATH, fileName), fileName);
}

/**
 * Export all games from games.duckdb to a timestamped Parquet file on GCS.
 * Skips if there are 0 rows.
 */
async function exportGamesParquet(getGamesDb) {
    const ts           = timestamp();
    const localParquet = `/tmp/games_${ts}.parquet`;
    const gcsParquet   = `games/games_${ts}.parquet`;

    try {
        // Check row count first
        const res  = await getGamesDb().runAndReadAll('SELECT COUNT(*) FROM games');
        const rows = res.getRows();
        const count = Number(rows[0][0]);

        if (count === 0) {
            logger.debug('GCS', 'No games to export this cycle.');
            return;
        }

        // Write Parquet locally (DuckDB native support)
        await getGamesDb().run(
            `COPY (SELECT * FROM games) TO '${localParquet}' (FORMAT PARQUET)`
        );

        // Upload to GCS
        await uploadToGcs(localParquet, gcsParquet);

        // Only delete after confirmed upload — keeps games.duckdb lean, no duplicates
        await getGamesDb().run('DELETE FROM games');

        logger.info('GCS', `Exported ${count} game(s) → ${gcsParquet} (cleared from local DB)`);
    } catch (e) {
        logger.error('GCS', 'Games Parquet export failed:', e.message);
    } finally {
        // Always clean up the local temp file
        fs.unlink(localParquet, () => {});
    }
}

/**
 * Run one full sync cycle: persist user/tournament DBs and export games.
 */
async function runSync(getUsersDb, getTournamentsDb, getGamesDb, getTournamentGamesDb) {
    logger.info('GCS', 'Running sync cycle…');
    await syncDbFile(getUsersDb(),            'users.duckdb');
    await syncDbFile(getTournamentsDb(),      'tournaments.duckdb');
    await syncDbFile(getTournamentGamesDb(),  'tournament_games.duckdb');
    await exportGamesParquet(getGamesDb);
    logger.info('GCS', 'Sync cycle complete.');
}

/**
 * Start the periodic 15-minute sync.
 * Call this AFTER initDb() is complete.
 */
function startGcsSync(getUsersDb, getTournamentsDb, getGamesDb, getTournamentGamesDb) {
    if (!isGcpMode) {
        logger.debug('GCS', 'Local mode — GCS sync disabled.');
        return;
    }
    logger.info('GCS', `Sync scheduled every ${SYNC_INTERVAL_MS / 60000} minutes.`);
    const timer = setInterval(
        () => runSync(getUsersDb, getTournamentsDb, getGamesDb, getTournamentGamesDb)
                .catch(e => logger.error('GCS', 'Sync error:', e.message)),
        SYNC_INTERVAL_MS
    );
    // Don't prevent clean process exit
    if (timer.unref) timer.unref();
}

module.exports = { restoreFromGcs, startGcsSync };
