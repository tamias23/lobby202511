const { DuckDBInstance } = require('@duckdb/node-api');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../db/gaming.duckdb');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let instance;

const initDb = async () => {
    try {
        // Initialize DuckDB Instance (Neo API)
        instance = await DuckDBInstance.create(dbPath);
        const con = await instance.connect();
        
        await con.run(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR PRIMARY KEY,
                username VARCHAR UNIQUE,
                email VARCHAR UNIQUE,
                password_hash VARCHAR,
                role VARCHAR, -- 'guest' or 'registered'
                is_verified INTEGER DEFAULT 0,
                verification_token VARCHAR,
                token_expires_at TIMESTAMP,
                rating INTEGER DEFAULT 1200,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS profiles (
                user_id VARCHAR PRIMARY KEY,
                bio VARCHAR,
                avatar_url VARCHAR
            );

            CREATE TABLE IF NOT EXISTS games (
                id VARCHAR PRIMARY KEY,
                white_player_id VARCHAR,
                black_player_id VARCHAR,
                winner_id VARCHAR,
                game_state TEXT, -- JSON stored as string
                history TEXT,    -- Array of moves stored as string
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("DuckDB Neo schema initialized.");
    } catch (err) {
        console.error("DuckDB Neo initialization error:", err);
        throw err;
    }
};

// Getter for the database instance
const getDb = () => {
    if (!instance) throw new Error("Database not initialized. Call initDb() first.");
    return instance;
};

module.exports = { initDb, getDb };
