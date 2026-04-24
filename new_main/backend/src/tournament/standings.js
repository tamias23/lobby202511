/**
 * standings.js — Scoring and ranking utilities for tournaments.
 */

/**
 * Compute sorted standings from participants + games.
 * @param {Array} participants - [{ user_id, username, score, wins, draws, losses, tiebreak, is_bot }]
 * @param {Array} games       - [{ white_id, black_id, result, white_score, black_score, round }]
 * @param {string} format     - 'swiss' | 'arena' | 'knockout' | 'round_robin'
 * @returns {Array} sorted standings with rank field added
 */
function computeStandings(participants, games, format) {
    // Build lookup
    const pMap = new Map();
    for (const p of participants) {
        pMap.set(p.user_id, { ...p });
    }

    // For Swiss, compute Buchholz tiebreak (sum of opponents' scores)
    if (format === 'swiss') {
        for (const p of participants) {
            let buchholz = 0;
            for (const g of games) {
                let oppId = null;
                if (g.white_id === p.user_id) oppId = g.black_id;
                else if (g.black_id === p.user_id) oppId = g.white_id;
                if (oppId && pMap.has(oppId)) {
                    buchholz += pMap.get(oppId).score || 0;
                }
            }
            const entry = pMap.get(p.user_id);
            if (entry) entry.tiebreak = buchholz;
        }
    }

    const standings = Array.from(pMap.values());

    // Sort: score desc, tiebreak desc, wins desc
    standings.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((b.tiebreak || 0) !== (a.tiebreak || 0)) return (b.tiebreak || 0) - (a.tiebreak || 0);
        return (b.wins || 0) - (a.wins || 0);
    });

    // Add rank + ensure rating is exposed
    standings.forEach((s, i) => {
        s.rank = i + 1;
        s.rating = s.rating ?? 1500;
    });

    return standings;
}


/**
 * Compute a knockout bracket tree for frontend display.
 * @param {Array} participants - all tournament participants
 * @param {Array} games       - all tournament games
 * @param {number} totalRounds - total rounds in the bracket
 * @returns {Array} rounds — each round is an array of matches
 */
function computeKnockoutBracket(participants, games, totalRounds) {
    const rounds = [];
    for (let r = 1; r <= totalRounds; r++) {
        const roundGames = games.filter(g => g.round === r);
        const matches = roundGames.map(g => ({
            white: findParticipant(participants, g.white_id),
            black: findParticipant(participants, g.black_id),
            result: g.result, // 'white' | 'black' | 'draw' | null
            gameHash: g.game_hash,
        }));
        rounds.push({ round: r, matches });
    }
    return rounds;
}

function findParticipant(participants, userId) {
    const p = participants.find(p => p.user_id === userId);
    return p ? { user_id: p.user_id, username: p.username || p.user_id, is_bot: p.is_bot } : { user_id: userId, username: userId, is_bot: 0 };
}


module.exports = { computeStandings, computeKnockoutBracket };
