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

const usersDbPath = path.join(dbDir, 'users.duckdb');
const gamesDbPath = path.join(dbDir, 'games.duckdb');

console.log(`[DB] users.duckdb → ${usersDbPath}`);
console.log(`[DB] games.duckdb → ${gamesDbPath}`);

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
    constructor(instance, name, idleMs = 30_000) {
        this._instance = instance;
        this._name     = name;
        this._idleMs   = idleMs;
        this._conn     = null;   // raw DuckDB connection
        this._timer    = null;
    }

    // Ensure a raw connection exists and reset the idle timer.
    async _ensure() {
        this._resetTimer();
        if (!this._conn) {
            console.log(`[DB:${this._name}] Opening connection.`);
            this._conn = await this._instance.connect();
        }
        return this._conn;
    }

    _resetTimer() {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(async () => {
            console.log(`[DB:${this._name}] Idle timeout — closing connection.`);
            try { if (this._conn?.close) await this._conn.close(); } catch (_) {}
            this._conn  = null;
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
        try { if (this._conn?.close) await this._conn.close(); } catch (_) {}
        this._conn = null;
    }
}

// ─── Instances & Lazy Wrappers ───────────────────────────────────────────────

let usersInstance;
let gamesInstance;
let usersLazy;    // LazyDbConnection for users.duckdb
let gamesLazy;    // LazyDbConnection for games.duckdb

const initDb = async () => {
    try {
        // ── Users Database ──
        usersInstance = await DuckDBInstance.create(usersDbPath);
        usersLazy = new LazyDbConnection(usersInstance, 'users');

        // Bootstrap schema (uses a one-off connection during init — that's fine)
        const userCon = await usersInstance.connect();
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

        // ── Games Database ──
        gamesInstance = await DuckDBInstance.create(gamesDbPath);
        gamesLazy = new LazyDbConnection(gamesInstance, 'games');

        const gameCon = await gamesInstance.connect();
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

        console.log("DuckDB instances (users & games) initialized.");
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

module.exports = { initDb, getUsersDb, getGamesDb };
