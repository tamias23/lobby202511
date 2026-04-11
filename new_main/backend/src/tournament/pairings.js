/**
 * pairings.js — Tournament pairing engines
 *
 * Each format exports a generatePairings function:
 *   generatePairings(participants, roundNumber, previousGames) → [{ whiteId, blackId }]
 *
 * participants: [{ user_id, score, ... }]
 * previousGames: [{ white_id, black_id, round, result }]
 */

// ─── Swiss Pairing ───────────────────────────────────────────────────────────
// Standard Swiss: sort by score, pair top-down, avoid rematches.

function swissPairings(participants, roundNumber, previousGames) {
    // Build set of already-played pairings
    const played = new Set();
    for (const g of previousGames) {
        played.add(`${g.white_id}:${g.black_id}`);
        played.add(`${g.black_id}:${g.white_id}`);
    }

    // Sort by score descending, then tiebreak descending
    const sorted = [...participants].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.tiebreak || 0) - (a.tiebreak || 0);
    });

    const paired = new Set();
    const pairings = [];

    for (let i = 0; i < sorted.length; i++) {
        if (paired.has(sorted[i].user_id)) continue;
        const p1 = sorted[i];

        // Find best opponent not yet paired and not previously played
        for (let j = i + 1; j < sorted.length; j++) {
            if (paired.has(sorted[j].user_id)) continue;
            const p2 = sorted[j];
            const key = `${p1.user_id}:${p2.user_id}`;
            if (!played.has(key)) {
                // Alternate colors based on round
                if (roundNumber % 2 === 0) {
                    pairings.push({ whiteId: p1.user_id, blackId: p2.user_id });
                } else {
                    pairings.push({ whiteId: p2.user_id, blackId: p1.user_id });
                }
                paired.add(p1.user_id);
                paired.add(p2.user_id);
                break;
            }
        }

        // If no unpaired, unplayed partner found, try any unpaired
        if (!paired.has(p1.user_id)) {
            for (let j = i + 1; j < sorted.length; j++) {
                if (paired.has(sorted[j].user_id)) continue;
                pairings.push({ whiteId: p1.user_id, blackId: sorted[j].user_id });
                paired.add(p1.user_id);
                paired.add(sorted[j].user_id);
                break;
            }
        }
    }
    // Odd player gets a bye (no pairing — awarded win points by caller)
    return pairings;
}


// ─── Round Robin Pairing ─────────────────────────────────────────────────────
// Circle method: fix player[0], rotate the rest.

function roundRobinPairings(participants, roundNumber, _previousGames) {
    const players = [...participants];
    // If odd count, add a dummy "BYE" player
    const hasBye = players.length % 2 !== 0;
    if (hasBye) players.push({ user_id: '__BYE__' });

    const n = players.length;
    const round = roundNumber - 1; // 0-indexed

    // Generate rotation for this round
    const fixed = players[0];
    const rotating = players.slice(1);

    // Rotate: shift left by `round` positions
    const rotated = [];
    for (let i = 0; i < rotating.length; i++) {
        rotated.push(rotating[(i + round) % rotating.length]);
    }
    const lineup = [fixed, ...rotated];

    const pairings = [];
    for (let i = 0; i < n / 2; i++) {
        const p1 = lineup[i];
        const p2 = lineup[n - 1 - i];
        if (p1.user_id === '__BYE__' || p2.user_id === '__BYE__') continue;
        // Alternate home/away
        if (i % 2 === roundNumber % 2) {
            pairings.push({ whiteId: p1.user_id, blackId: p2.user_id });
        } else {
            pairings.push({ whiteId: p2.user_id, blackId: p1.user_id });
        }
    }
    return pairings;
}


// ─── Knockout Pairing ────────────────────────────────────────────────────────
// Seeded bracket with byes for non-power-of-2 counts.

function knockoutPairings(participants, roundNumber, previousGames) {
    if (roundNumber === 1) {
        // First round: seed by initial score/rating, assign byes
        const seeded = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0));
        const n = seeded.length;
        const bracketSize = nextPowerOf2(n);
        const numByes = bracketSize - n;

        // Top-seeded players get byes
        const byePlayers = seeded.slice(0, numByes);
        const playing = seeded.slice(numByes);

        const pairings = [];
        for (let i = 0; i < playing.length; i += 2) {
            if (i + 1 < playing.length) {
                pairings.push({ whiteId: playing[i].user_id, blackId: playing[i + 1].user_id });
            }
        }
        // Bye players: caller should advance them automatically
        return { pairings, byes: byePlayers.map(p => p.user_id) };
    }

    // Subsequent rounds: winners from previous round
    const prevRoundGames = previousGames.filter(g => g.round === roundNumber - 1);
    const winners = [];
    for (const g of prevRoundGames) {
        if (g.result === 'white') winners.push(g.white_id);
        else if (g.result === 'black') winners.push(g.black_id);
        else if (g.result === 'draw') {
            // Tiebreak: white wins on draw (or random)
            winners.push(Math.random() < 0.5 ? g.white_id : g.black_id);
        }
    }

    // Also include bye winners from previous round (they had no game)
    // The caller must have advanced bye players to the winners list already
    // via the tournament state — they'll be in participants with a "bye_advanced" flag

    const pairings = [];
    for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
            pairings.push({ whiteId: winners[i], blackId: winners[i + 1] });
        }
    }
    return { pairings, byes: [] };
}

function nextPowerOf2(n) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

function knockoutTotalRounds(n) {
    return Math.ceil(Math.log2(n));
}


// ─── Arena Pairing ───────────────────────────────────────────────────────────
// Match idle players randomly. Called repeatedly during the arena duration.

function arenaPairings(idlePlayers, previousGames) {
    // Shuffle idle players
    const shuffled = [...idlePlayers].sort(() => 0.5 - Math.random());
    const pairings = [];

    const paired = new Set();
    for (let i = 0; i < shuffled.length; i++) {
        if (paired.has(shuffled[i].user_id)) continue;
        for (let j = i + 1; j < shuffled.length; j++) {
            if (paired.has(shuffled[j].user_id)) continue;
            pairings.push({ whiteId: shuffled[i].user_id, blackId: shuffled[j].user_id });
            paired.add(shuffled[i].user_id);
            paired.add(shuffled[j].user_id);
            break;
        }
    }
    return pairings;
}


module.exports = {
    swissPairings,
    roundRobinPairings,
    knockoutPairings,
    arenaPairings,
    knockoutTotalRounds,
    nextPowerOf2,
};
