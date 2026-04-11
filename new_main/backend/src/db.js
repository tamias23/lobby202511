const { DuckDBInstance } = require('@duckdb/node-api');
const path = require('path');
const fs = require('fs');

// --- Database Path Resolution ---
const GCS_MOUNT   = '/mnt/db';
const LOCAL_DB_DIR = path.join(__dirname, '../db');
const ENV_DB_PATH   = process.env.DB_PATH;

function resolveDbDir() {
    if (ENV_DB_PATH) {
        console.log(`[DB] Using DB_PATH from environment: ${ENV_DB_PATH}`);
        return ENV_DB_PATH;
    }
    if (fs.existsSync(GCS_MOUNT)) {
        console.log(`[DB] GCS/Persistent Disk mount detected at ${GCS_MOUNT}, using it for database files.`);
        return GCS_MOUNT;
    }
    console.log(`[DB] Using local database directory: ${LOCAL_DB_DIR}`);
    return LOCAL_DB_DIR;
}

const dbDir = resolveDbDir();

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const usersDbPath       = path.join(dbDir, 'users.duckdb');
const gamesDbPath       = path.join(dbDir, 'games.duckdb');
const tournamentsDbPath = path.join(dbDir, 'tournaments.duckdb');

console.log(`[DB] users.duckdb       → ${usersDbPath}`);
console.log(`[DB] games.duckdb       → ${gamesDbPath}`);
console.log(`[DB] tournaments.duckdb → ${tournamentsDbPath}`);

// ─── Lazy Connection Wrapper ────────────────────────────────────────────────
//
// Wraps a DuckDB instance with:
//   • A single long-lived connection (not opened per request)
//   • An idle timer: if no DB activity for IDLE_MS, the connection is closed
//   • Auto-reconnect: next operation after idle silently reopens the connection
//
// Drop-in replacement for the old pattern:
//   const con = await getUsersDb().connect();   // still works
//   await con.run(sql, params);                 // still works
//   await con.runAndReadAll(sql, params);        // still works
//
class LazyDbConnection {
    constructor(dbPath, name, idleMs = 30_000, checkpointMs = 15 * 60_000) {
        this._dbPath       = dbPath;
        this._name         = name;
        this._idleMs       = idleMs;
        this._instance     = null;   // DuckDBInstance
        this._conn         = null;   // DuckDBConnection
        this._timer        = null;   // idle-close timer

        // Periodic CHECKPOINT: flush WAL → main file, but only if connection is alive.
        // Never reopens a closed connection just to checkpoint.
        this._checkpointInterval = setInterval(async () => {
            if (!this._conn) return;  // connection is idle-closed — nothing to flush
            try {
                await this._conn.run('CHECKPOINT');
                console.log(`[DB:${this._name}] CHECKPOINT done.`);
            } catch (e) {
                console.warn(`[DB:${this._name}] CHECKPOINT failed:`, e.message);
            }
        }, checkpointMs);

        // Don't prevent process exit if this is the only pending handle
        if (this._checkpointInterval.unref) this._checkpointInterval.unref();
    }

    // Ensure a raw instance and connection exist and reset the idle timer.
    async _ensure() {
        this._resetTimer();
        if (!this._instance) {
            console.log(`[DB:${this._name}] Creating instance (acquiring lock).`);
            this._instance = await DuckDBInstance.create(this._dbPath);
        }
        if (!this._conn) {
            console.log(`[DB:${this._name}] Opening connection.`);
            this._conn = await this._instance.connect();
        }
        return this._conn;
    }

    _resetTimer() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(async () => {
            console.log(`[DB:${this._name}] Idle timeout — flushing WAL and releasing lock.`);
            try {
                if (this._conn) {
                    await this._conn.run('CHECKPOINT');
                    console.log(`[DB:${this._name}] Final CHECKPOINT done.`);
                    if (this._conn.closeSync) this._conn.closeSync();
                }
            } catch (e) {
                console.warn(`[DB:${this._name}] Final CHECKPOINT failed:`, e.message);
                try { if (this._conn?.closeSync) this._conn.closeSync(); } catch (_) {}
            }
            try { if (this._instance?.closeSync) this._instance.closeSync(); } catch (_) {}
            this._conn  = null;
            this._instance = null;
            this._timer = null;
        }, this._idleMs);
    }

    // connect() returns `this` so existing callers that do
    //   const con = await db.connect(); await con.run(...)
    // continue to work unchanged.
    async connect() {
        await this._ensure();
        return this;
    }

    async run(sql, params = []) {
        const conn = await this._ensure();
        return conn.run(sql, params);
    }

    async runAndReadAll(sql, params = []) {
        const conn = await this._ensure();
        return conn.runAndReadAll(sql, params);
    }

    // Explicit close (e.g. on process shutdown).
    async close() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        if (this._checkpointInterval) { clearInterval(this._checkpointInterval); this._checkpointInterval = null; }
        try { if (this._conn?.closeSync) this._conn.closeSync(); } catch (_) {}
        try { if (this._instance?.closeSync) this._instance.closeSync(); } catch (_) {}
        this._conn = null;
        this._instance = null;
    }
}

// ─── Instances & Lazy Wrappers ───────────────────────────────────────────────

let usersLazy;        // LazyDbConnection for users.duckdb
let gamesLazy;        // LazyDbConnection for games.duckdb
let tournamentsLazy;  // LazyDbConnection for tournaments.duckdb

const initDb = async () => {
    try {
        // ── Users Database ──
        const initialUsersInstance = await DuckDBInstance.create(usersDbPath);
        usersLazy = new LazyDbConnection(usersDbPath, 'users');

        // Bootstrap schema (uses a one-off connection during init — that's fine)
        const userCon = await initialUsersInstance.connect();
        await userCon.run(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR PRIMARY KEY,
                username VARCHAR UNIQUE,
                email VARCHAR UNIQUE,
                password_hash VARCHAR,
                role VARCHAR, -- 'guest' or 'registered'
                is_verified INTEGER DEFAULT 0,
                verification_token VARCHAR,
                token_expires_at TIMESTAMP,
                rating DOUBLE DEFAULT 1500,
                rating_deviation DOUBLE DEFAULT 350,
                rating_volatility DOUBLE DEFAULT 0.06,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS profiles (
                user_id VARCHAR PRIMARY KEY,
                bio VARCHAR,
                avatar_url VARCHAR
            );
        `);

        // Migrate existing users tables that may lack Glicko-2 columns
        try {
            await userCon.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_deviation DOUBLE DEFAULT 350`);
            await userCon.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_volatility DOUBLE DEFAULT 0.06`);
            // Migrate old default 1200 integer ratings → 1500 Glicko-2 scale
            await userCon.run(`UPDATE users SET rating = 1500.0 WHERE rating = 1200`);
        } catch (_) { /* columns already exist */ }

        // Tournament tracking columns
        try {
            await userCon.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nb_tournaments_entered INTEGER DEFAULT 0`);
            await userCon.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nb_tournaments_finished INTEGER DEFAULT 0`);
        } catch (_) { /* columns already exist */ }

        try { if (userCon.closeSync) userCon.closeSync(); } catch (_) {}
        try { if (initialUsersInstance.closeSync) initialUsersInstance.closeSync(); } catch (_) {}

        // ── Games Database ──
        const initialGamesInstance = await DuckDBInstance.create(gamesDbPath);
        gamesLazy = new LazyDbConnection(gamesDbPath, 'games');

        const gameCon = await initialGamesInstance.connect();
        await gameCon.run(`
            CREATE TABLE IF NOT EXISTS games (
                game_id VARCHAR PRIMARY KEY,
                timestamp BIGINT,
                white_name VARCHAR,
                black_name VARCHAR,
                white_player_id VARCHAR,
                black_player_id VARCHAR,
                board_id VARCHAR,
                winner VARCHAR,
                moves TEXT
            );
        `);

        try { if (gameCon.closeSync) gameCon.closeSync(); } catch (_) {}
        try { if (initialGamesInstance.closeSync) initialGamesInstance.closeSync(); } catch (_) {}

        // ── Tournaments Database ──
        const initialTournamentsInstance = await DuckDBInstance.create(tournamentsDbPath);
        tournamentsLazy = new LazyDbConnection(tournamentsDbPath, 'tournaments');

        const tournCon = await initialTournamentsInstance.connect();
        await tournCon.run(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id VARCHAR PRIMARY KEY,
                creator_id VARCHAR NOT NULL,
                status VARCHAR DEFAULT 'open',
                format VARCHAR NOT NULL,
                password_hash VARCHAR,
                has_password INTEGER DEFAULT 0,
                max_participants INTEGER NOT NULL,
                current_count INTEGER DEFAULT 0,
                time_control_minutes INTEGER NOT NULL,
                time_control_increment INTEGER NOT NULL,
                board_id VARCHAR,
                rating_min INTEGER DEFAULT 0,
                rating_max INTEGER DEFAULT 5000,
                duration_value INTEGER NOT NULL,
                invited_bots INTEGER DEFAULT 0,
                creator_plays INTEGER DEFAULT 1,
                launch_mode VARCHAR DEFAULT 'when_complete',
                launch_at BIGINT,
                created_at BIGINT NOT NULL,
                started_at BIGINT,
                completed_at BIGINT,
                remove_at BIGINT NOT NULL,
                current_round INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tournament_participants (
                tournament_id VARCHAR NOT NULL,
                user_id VARCHAR NOT NULL,
                username VARCHAR,
                is_bot INTEGER DEFAULT 0,
                score DOUBLE DEFAULT 0,
                wins INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                tiebreak DOUBLE DEFAULT 0,
                joined_at BIGINT NOT NULL,
                PRIMARY KEY (tournament_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS tournament_games (
                id VARCHAR PRIMARY KEY,
                tournament_id VARCHAR NOT NULL,
                round INTEGER NOT NULL,
                white_id VARCHAR NOT NULL,
                black_id VARCHAR NOT NULL,
                game_hash VARCHAR,
                result VARCHAR,
                white_score DOUBLE DEFAULT 0,
                black_score DOUBLE DEFAULT 0,
                started_at BIGINT,
                completed_at BIGINT
            );
        `);

        try { if (tournCon.closeSync) tournCon.closeSync(); } catch (_) {}
        try { if (initialTournamentsInstance.closeSync) initialTournamentsInstance.closeSync(); } catch (_) {}

        console.log("DuckDB instances (users, games & tournaments) initialized. Locks released for lazy loading.");
    } catch (err) {
        console.error("DuckDB initialization error:", err);
        throw err;
    }
};

// Return the LazyDbConnection for each database.
// Works as a drop-in for the old pattern (callers call .connect() or use run/runAndReadAll directly).
const getUsersDb = () => {
    if (!usersLazy) throw new Error("Users Database not initialized.");
    return usersLazy;
};

const getGamesDb = () => {
    if (!gamesLazy) throw new Error("Games Database not initialized.");
    return gamesLazy;
};

const getTournamentsDb = () => {
    if (!tournamentsLazy) throw new Error("Tournaments Database not initialized.");
    return tournamentsLazy;
};

module.exports = { initDb, getUsersDb, getGamesDb, getTournamentsDb };
