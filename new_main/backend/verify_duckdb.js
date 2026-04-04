const { initDb, getDb } = require('./src/db');

async function test() {
    console.log("Starting DuckDB Neo Verification...");
    try {
        await initDb();
        console.log("✓ DuckDB Neo initialized correctly.");
        
        const con = await getDb().connect();
        const reader = await con.runAndReadAll("SELECT * FROM users");
        const rows = reader.getRows();
        
        console.log("✓ Success! Users found:", rows.length);
        process.exit(0);
    } catch (e) {
        console.error("✗ Error during DuckDB Neo initialization:", e);
        process.exit(1);
    }
}

test();
