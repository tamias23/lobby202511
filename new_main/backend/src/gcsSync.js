'use strict';

// ─── Game Offload Module ──────────────────────────────────────────────────────
//
// Strategy:
//   Periodically offload old games from PostgreSQL to Parquet files on /mnt/db.
//   Games older than GAME_RETENTION_DAYS are exported, then deleted from PostgreSQL.
//
// Only active when both GCS_BUCKET and NODE_ENV=production are set (i.e. on GCP).
// Locally, offloadOldGames() is a silent no-op.
//
// DuckDB is used in-memory solely for Parquet file generation.
// Scheduling is handled by the cron runner (parquet_export job, 20:00 UTC daily).
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const GCS_BUCKET          = process.env.GCS_BUCKET;
const GAME_RETENTION_DAYS = parseInt(process.env.GAME_RETENTION_DAYS) || 7;
const GCS_MOUNT                 = '/mnt/db';

// Only activate in production
const isGcpMode = !!(GCS_BUCKET && process.env.NODE_ENV === 'production');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format: YYYYMMDDThhmmss (UTC) */
function timestamp() {
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
           `T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Export old games from PostgreSQL to Parquet, then delete them.
 * Uses DuckDB in-memory for the Parquet export.
 */
async function offloadOldGames(db) {
    const cutoffMs = Date.now() - (GAME_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    logger.info('Offload', `Looking for games older than ${new Date(cutoffMs).toISOString()} (retention: ${GAME_RETENTION_DAYS}d)…`);

    const games = await db.getGamesOlderThan(cutoffMs);
    if (games.length === 0) {
        logger.debug('Offload', 'No games to offload this cycle.');
        return;
    }

    logger.info('Offload', `Found ${games.length} game(s) to offload.`);

    const ts = timestamp();
    const gamesDir = path.join(GCS_MOUNT, 'games');
    fs.mkdirSync(gamesDir, { recursive: true });
    const localParquet = path.join(gamesDir, `games_${ts}.parquet`);

    try {
        // Use DuckDB in-memory for Parquet export
        const { DuckDBInstance } = require('@duckdb/node-api');
        const instance = await DuckDBInstance.create(':memory:');
        const conn = await instance.connect();

        // Create table matching game schema
        await conn.run(`
            CREATE TABLE export_games (
                game_id VARCHAR,
                timestamp BIGINT,
                white_name VARCHAR,
                black_name VARCHAR,
                white_player_id VARCHAR,
                black_player_id VARCHAR,
                board_id VARCHAR,
                winner VARCHAR,
                moves TEXT,
                tournament_id VARCHAR,
                tournament_round_info VARCHAR,
                white_score DOUBLE,
                black_score DOUBLE,
                started_at BIGINT,
                completed_at BIGINT
            )
        `);

        // Insert all games
        for (const g of games) {
            await conn.run(`
                INSERT INTO export_games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                g.game_id, g.timestamp, g.white_name, g.black_name,
                g.white_player_id, g.black_player_id, g.board_id,
                g.winner, typeof g.moves === 'string' ? g.moves : JSON.stringify(g.moves || []),
                g.tournament_id || null, g.tournament_round_info || null,
                g.white_score || 0, g.black_score || 0,
                g.started_at || g.timestamp, g.completed_at || null,
            ]);
        }

        // Export to Parquet
        await conn.run(`COPY (SELECT * FROM export_games) TO '${localParquet}' (FORMAT PARQUET)`);

        // Cleanup DuckDB
        try { if (conn.closeSync) conn.closeSync(); } catch (_) {}
        try { if (instance.closeSync) instance.closeSync(); } catch (_) {}

        logger.info('Offload', `Exported ${games.length} game(s) → ${localParquet}`);

        // Delete from PostgreSQL only after successful export
        const gameIds = games.map(g => g.game_id);
        await db.deleteGamesByIds(gameIds);

        logger.info('Offload', `Offload complete: ${games.length} game(s) exported and removed from PostgreSQL.`);

    } catch (e) {
        logger.error('Offload', 'Game offload failed:', e.message);
    }
}

module.exports = { offloadOldGames };
