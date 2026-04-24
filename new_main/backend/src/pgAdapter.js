/**
 * pgAdapter.js — PostgreSQL connection manager.
 *
 * Responsibilities:
 *   1. Manage a connection pool to PostgreSQL with 15-second retry on failure.
 *   2. Expose isConnected() and getPool() for use by other modules.
 *   3. On startup, verify connectivity and auto-create schema if needed.
 *   4. Gracefully degrade: if PostgreSQL is unreachable, the website still serves
 *      (game engine works in memory), but auth/storage operations fail gracefully.
 */

'use strict';

const { Pool } = require('pg');
const logger = require('./utils/logger');

const RETRY_INTERVAL_MS = 15000;

let pool = null;
let connected = false;
let _initResolve = null;

/**
 * Initialize the PostgreSQL adapter. Call once at startup.
 * Returns a promise that resolves once the first successful connection is made,
 * or after a configurable timeout (so the server can start even if PG is down).
 */
function init() {
    return new Promise((resolve) => {
        _initResolve = resolve;
        _tryConnect();
        // Don't block startup forever — resolve after 20s even if not connected
        setTimeout(() => {
            if (!connected) {
                logger.warn('PostgreSQL', 'Initial connection timed out — server starting without PostgreSQL.');
                resolve();
            }
        }, 20000);
    });
}

/** @returns {boolean} Whether PostgreSQL is currently connected. */
function isConnected() {
    return connected;
}

/** @returns {Pool|null} The pg Pool instance, or null if not connected. */
function getPool() {
    return connected ? pool : null;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function _tryConnect() {
    const config = {
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT) || 5432,
        database: process.env.PG_DATABASE || 'dedalthegame01',
        user: process.env.PG_USER || 'tamias23',
        password: process.env.PG_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };

    logger.info('PostgreSQL', `Attempting connection (${config.host}:${config.port}/${config.database})…`);

    try {
        pool = new Pool(config);

        // Handle pool-level errors (prevents unhandled rejection on idle client errors)
        pool.on('error', (err) => {
            logger.error('PostgreSQL', 'Unexpected pool error:', err.message);
            connected = false;
            // Attempt reconnect
            setTimeout(_tryConnect, RETRY_INTERVAL_MS);
        });

        // Health check
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        connected = true;
        logger.info('PostgreSQL', `Connected successfully (${config.host}:${config.port}/${config.database}).`);

        // Ensure schema exists
        await _ensureSchema();

        if (_initResolve) {
            _initResolve();
            _initResolve = null;
        }
    } catch (e) {
        connected = false;
        if (pool) { pool.end().catch(() => {}); pool = null; }
        logger.warn('PostgreSQL', `Connection failed (${e.message}), retrying in ${RETRY_INTERVAL_MS / 1000}s…`);
        setTimeout(_tryConnect, RETRY_INTERVAL_MS);
    }
}

async function _ensureSchema() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(SCHEMA_SQL);
        await client.query('COMMIT');
        logger.info('PostgreSQL', 'Schema verified/created.');
    } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        logger.error('PostgreSQL', 'Schema creation failed:', e.message);
        throw e;
    } finally {
        client.release();
    }
}

// ── Schema ───────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
-- users
CREATE TABLE IF NOT EXISTS users (
    id                       TEXT PRIMARY KEY,
    username                 TEXT UNIQUE NOT NULL,
    email                    TEXT UNIQUE NOT NULL,
    password_hash            TEXT,
    role                     TEXT DEFAULT 'registered',
    is_verified              INTEGER DEFAULT 0,
    verification_token       TEXT,
    token_expires_at         BIGINT,
    rating                   DOUBLE PRECISION DEFAULT 1500,
    rating_deviation         DOUBLE PRECISION DEFAULT 350,
    rating_volatility        DOUBLE PRECISION DEFAULT 0.06,
    rating_bullet            DOUBLE PRECISION DEFAULT 1500,
    rating_blitz             DOUBLE PRECISION DEFAULT 1500,
    rating_rapid             DOUBLE PRECISION DEFAULT 1500,
    rating_classical         DOUBLE PRECISION DEFAULT 1500,
    email_hash               TEXT,
    nb_tournaments_entered   INTEGER DEFAULT 0,
    nb_tournaments_finished  INTEGER DEFAULT 0,
    is_subscriber            INTEGER DEFAULT 0,
    subscription_source      TEXT,
    subscriber_until         BIGINT,
    subscription_id          TEXT,
    is_admin                 INTEGER DEFAULT 0,
    rated_games_played_today INTEGER DEFAULT 0,
    bot_games_played_today   INTEGER DEFAULT 0,
    timezone                 TEXT DEFAULT 'UTC',
    created_at               BIGINT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Ensure email_hash column exists before indexing it (idempotent for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_rating_bullet ON users(rating_bullet DESC);
CREATE INDEX IF NOT EXISTS idx_users_rating_blitz ON users(rating_blitz DESC);
CREATE INDEX IF NOT EXISTS idx_users_rating_rapid ON users(rating_rapid DESC);
CREATE INDEX IF NOT EXISTS idx_users_rating_classical ON users(rating_classical DESC);

-- profiles (JSONB for flexible schema)
CREATE TABLE IF NOT EXISTS profiles (
    user_id  TEXT PRIMARY KEY,
    data     JSONB DEFAULT '{}'
);

-- games
CREATE TABLE IF NOT EXISTS games (
    game_id                TEXT PRIMARY KEY,
    "timestamp"            BIGINT,
    white_name             TEXT,
    black_name             TEXT,
    white_player_id        TEXT,
    black_player_id        TEXT,
    board_id               TEXT,
    winner                 TEXT,
    moves                  TEXT,
    tournament_id          TEXT,
    tournament_round_info  TEXT,
    white_score            DOUBLE PRECISION DEFAULT 0,
    black_score            DOUBLE PRECISION DEFAULT 0,
    started_at             BIGINT,
    completed_at           BIGINT,
    time_control_minutes   INTEGER,
    time_control_increment INTEGER
);
CREATE INDEX IF NOT EXISTS idx_games_timestamp ON games("timestamp");
CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_games_white ON games(white_player_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_games_black ON games(black_player_id, "timestamp" DESC);

-- tournaments
CREATE TABLE IF NOT EXISTS tournaments (
    id                     TEXT PRIMARY KEY,
    name                   TEXT,
    creator_id             TEXT,
    creator_username       TEXT,
    status                 TEXT DEFAULT 'open',
    format                 TEXT,
    password_hash          TEXT,
    has_password           INTEGER DEFAULT 0,
    max_participants       INTEGER,
    current_count          INTEGER DEFAULT 0,
    time_control_minutes   INTEGER,
    time_control_increment INTEGER,
    board_id               TEXT,
    rating_min             INTEGER DEFAULT 0,
    rating_max             INTEGER DEFAULT 5000,
    duration_value         INTEGER,
    invited_bots           INTEGER DEFAULT 0,
    creator_plays          INTEGER DEFAULT 0,
    launch_mode            TEXT DEFAULT 'both',
    launch_at              BIGINT,
    created_at             BIGINT,
    started_at             BIGINT,
    completed_at           BIGINT,
    remove_at              BIGINT,
    current_round          INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- tournament_participants
CREATE TABLE IF NOT EXISTS tournament_participants (
    id              TEXT PRIMARY KEY,
    tournament_id   TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    username        TEXT,
    rating          DOUBLE PRECISION DEFAULT 1500,
    score           DOUBLE PRECISION DEFAULT 0,
    games_played    INTEGER DEFAULT 0,
    wins            INTEGER DEFAULT 0,
    losses          INTEGER DEFAULT 0,
    draws           INTEGER DEFAULT 0,
    tiebreaker      DOUBLE PRECISION DEFAULT 0,
    joined_at       BIGINT
);
CREATE INDEX IF NOT EXISTS idx_tp_tournament ON tournament_participants(tournament_id);

-- cron_jobs (schedule table — one row per job type)
CREATE TABLE IF NOT EXISTS cron_jobs (
    type            TEXT PRIMARY KEY,
    description     TEXT,
    minute          TEXT,
    hour            TEXT,
    weekday         TEXT,
    enabled         BOOLEAN DEFAULT TRUE,
    created_at      BIGINT,
    last_run_at     BIGINT,
    last_run_status TEXT,
    last_run_id     TEXT,
    last_error      TEXT
);

-- jobs (execution log — one record per run)
CREATE TABLE IF NOT EXISTS jobs (
    id              TEXT PRIMARY KEY,
    type            TEXT,
    status          TEXT,
    scheduled_at    BIGINT,
    started_at      BIGINT,
    completed_at    BIGINT,
    created_at      BIGINT,
    worker_id       TEXT,
    payload         JSONB DEFAULT '{}',
    error           TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_completed ON jobs(completed_at);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT,
    type            TEXT,
    status          TEXT,
    created_at      BIGINT,
    expires_at      BIGINT,
    platform        TEXT,
    receipt_data    TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- leaderboards (JSONB for nested category data)
CREATE TABLE IF NOT EXISTS leaderboards (
    id              TEXT PRIMARY KEY,
    data            JSONB,
    updated_at      BIGINT
);

-- tournament_schedule (daily tournament template rows — edited via admin UI)
CREATE TABLE IF NOT EXISTS tournament_schedule (
    id               TEXT PRIMARY KEY,
    format           TEXT NOT NULL,
    minutes          INTEGER NOT NULL DEFAULT 10,
    increment        INTEGER NOT NULL DEFAULT 5,
    duration         INTEGER NOT NULL DEFAULT 7,
    launch_hour      INTEGER NOT NULL DEFAULT 20,
    launch_mode      TEXT NOT NULL DEFAULT 'any',
    start_in_minutes INTEGER NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL DEFAULT 100,
    invited_bots     INTEGER NOT NULL DEFAULT 0,
    enabled          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       BIGINT
);
-- Idempotent migrations (safe on re-deploy)
ALTER TABLE tournament_schedule ADD COLUMN IF NOT EXISTS launch_mode TEXT NOT NULL DEFAULT 'any';
ALTER TABLE tournament_schedule ADD COLUMN IF NOT EXISTS start_in_minutes INTEGER NOT NULL DEFAULT 0;
`;

module.exports = {
    init,
    isConnected,
    getPool,
};
