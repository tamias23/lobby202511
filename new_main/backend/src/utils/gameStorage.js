const { getDb } = require('../db');

/**
 * Persists a completed game and updates player ratings.
 * Using modern @duckdb/node-api (Neo).
 */
const saveMatchResult = async (gameId, whiteId, blackId, winnerId, finalState, history) => {
    try {
        const con = await getDb().connect();
        
        await con.run(`
            INSERT INTO games (id, white_player_id, black_player_id, winner_id, game_state, history)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            gameId, 
            whiteId, 
            blackId, 
            winnerId, 
            JSON.stringify(finalState), 
            JSON.stringify(history)
        ]);
        
        // Update Elo Ratings (Simple Example: +20 for winner, -20 for loser)
        const winnerPoints = 20;
        const loserPoints = -20;
        const loserId = (winnerId === whiteId ? blackId : whiteId);
        
        await con.run(`UPDATE users SET rating = rating + ? WHERE id = ?`, [winnerPoints, winnerId]);
        await con.run(`UPDATE users SET rating = rating + ? WHERE id = ?`, [loserPoints, loserId]);
        
        console.log(`Match ${gameId} stored and ratings updated.`);
    } catch (err) {
        console.error("Error saving match result in DuckDB Neo:", err);
        throw err;
    }
};

module.exports = {
    saveMatchResult
};
