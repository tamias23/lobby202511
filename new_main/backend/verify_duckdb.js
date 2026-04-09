const { initDb, getUsersDb, getGamesDb } = require('./src/db');

async function test() {
    console.log("Starting Dual DuckDB Neo Verification...");
    try {
        await initDb();
        console.log("✓ DuckDB instances initialized correctly.");
        
        const userCon = await getUsersDb().connect();
        const userReader = await userCon.runAndReadAll("SELECT COUNT(*) FROM users");
        console.log("✓ Success! Users found:", userReader.getRows()[0][0]);
        
        const gameCon = await getGamesDb().connect();
        const gameReader = await gameCon.runAndReadAll("SELECT COUNT(*) FROM games");
        console.log("✓ Success! Games found:", gameReader.getRows()[0][0]);

        process.exit(0);
    } catch (e) {
        console.error("✗ Error during DuckDB Neo initialization:", e);
        process.exit(1);
    }
}

test();
