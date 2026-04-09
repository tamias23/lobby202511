const { initDb, getUsersDb, getGamesDb } = require('../src/db');
const path = require('path');
const fs = require('fs');

async function migrate() {
    console.log("Starting data migration from gaming.duckdb to new segregated databases...");
    
    const oldDbPath = path.resolve(__dirname, '../db/gaming.duckdb');
    
    if (!fs.existsSync(oldDbPath)) {
        console.error(`ERROR: Legacy database not found at ${oldDbPath}`);
        process.exit(1);
    }

    try {
        await initDb();
        
        // 1. Migrate Users and Profiles
        console.log("Migrating users and profiles to users.duckdb...");
        const userCon = await getUsersDb().connect();
        
        // Attach old database
        await userCon.run(`ATTACH '${oldDbPath}' AS old_db`);
        
        // Copy Users
        const userRes = await userCon.run(`INSERT OR IGNORE INTO users SELECT * FROM old_db.users`);
        console.log("✓ Users migration command executed.");
        
        // Copy Profiles
        const profileRes = await userCon.run(`INSERT OR IGNORE INTO profiles SELECT * FROM old_db.profiles`);
        console.log("✓ Profiles migration command executed.");
        
        await userCon.run(`DETACH old_db`);
        
        // 2. Migrate Games
        console.log("Migrating games to games.duckdb...");
        const gameCon = await getGamesDb().connect();
        
        await gameCon.run(`ATTACH '${oldDbPath}' AS old_db`);
        
        // Copy Games
        const gameRes = await gameCon.run(`INSERT OR IGNORE INTO games SELECT * FROM old_db.games`);
        console.log("✓ Games migration command executed.");
        
        await gameCon.run(`DETACH old_db`);
        
        console.log("\nSUCCESS: Migration completed.");
        process.exit(0);
    } catch (e) {
        console.error("CRITICAL ERROR during migration:", e);
        process.exit(1);
    }
}

migrate();
