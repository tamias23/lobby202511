const firestoreAdapter = require('./firestoreAdapter');

function formatUtcString(ts) {
    if (!ts || typeof ts !== 'number') return null;
    const d = new Date(ts);
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

async function run() {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIRESTORE_PROJECT_ID = "my-local-firestore";
    
    await firestoreAdapter.init();
    const db = firestoreAdapter.getDb();
    if (!db) {
        console.error("Firestore not available");
        process.exit(1);
    }

    const collections = ['users', 'games', 'tournaments', 'tournament_participants', 'jobs', 'subscriptions', 'leaderboards', 'profiles'];
    
    for (const col of collections) {
        const metaDoc = await db.collection(col).doc('_meta').get();
        if (metaDoc.exists) {
            const data = metaDoc.data();
            if (data._created_at && !data._created_at_utc) {
                await metaDoc.ref.update({
                    _created_at_utc: formatUtcString(data._created_at)
                });
            }
        }
    }
    
    console.log("Done updating meta docs.");
    process.exit(0);
}

run().catch(console.error);
