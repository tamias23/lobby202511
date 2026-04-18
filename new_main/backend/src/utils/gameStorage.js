/**
 * gameStorage.js — Persists completed games and updates Glicko-2 ratings.
 *
 * Uses Firestore via the db.js facade.
 */

'use strict';

const db = require('../db');
const logger = require('./logger');

// ─── Serial Rating Queue ─────────────────────────────────────────────────────
//
// Glicko-2 rating updates must be applied serially: each update depends on
// the player's current rating. A SerialQueue ensures that even if 100 games
// end at the same instant, rating writes are processed one at a time, each
// reading the value written by the previous one.
//
class SerialQueue {
    constructor() {
        this._queue = [];
        this._processing = false;
    }

    /** Enqueue an async function; returns a promise that resolves when done. */
    enqueue(fn) {
        return new Promise((resolve, reject) => {
            this._queue.push(async () => {
                try { resolve(await fn()); } catch (e) { reject(e); }
            });
            if (!this._processing) this._drain();
        });
    }

    async _drain() {
        this._processing = true;
        while (this._queue.length > 0) {
            const task = this._queue.shift();
            await task();
        }
        this._processing = false;
    }
}

const ratingQueue = new SerialQueue();

// ─── Glicko-2 Implementation ─────────────────────────────────────────────────
// Based on: http://www.glicko.net/glicko/glicko2.pdf (Mark Glickman, 2012)

const GLICKO2_SCALE = 173.7178;
const TAU = 0.5;       // system constant — controls volatility change speed (0.3–1.2)
const EPSILON = 1e-6;  // Illinois algorithm convergence tolerance

function toInternal(r, rd) {
    return { mu: (r - 1500) / GLICKO2_SCALE, phi: rd / GLICKO2_SCALE };
}

function toPublished(mu, phi) {
    return { r: GLICKO2_SCALE * mu + 1500, rd: GLICKO2_SCALE * phi };
}

function g(phi) {
    return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

function E(mu, muJ, phiJ) {
    return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Compute the new Glicko-2 rating for one player given one game result.
 * @param {number} r      - current published rating
 * @param {number} rd     - current published RD
 * @param {number} sigma  - current volatility
 * @param {number} rJ     - opponent published rating
 * @param {number} rdJ    - opponent published RD
 * @param {number} score  - 1 = win, 0.5 = draw, 0 = loss
 * @returns {{ r, rd, sigma }}
 */
function glicko2Update(r, rd, sigma, rJ, rdJ, score) {
    const { mu, phi }     = toInternal(r, rd);
    const { mu: muJ, phi: phiJ } = toInternal(rJ, rdJ);

    const gPhiJ = g(phiJ);
    const eVal  = E(mu, muJ, phiJ);
    const v     = 1 / (gPhiJ * gPhiJ * eVal * (1 - eVal));
    const delta = v * gPhiJ * (score - eVal);

    // New volatility via Illinois algorithm
    const a  = Math.log(sigma * sigma);
    const phi2 = phi * phi;
    function f(x) {
        const ex    = Math.exp(x);
        const denom = 2 * Math.pow(phi2 + v + ex, 2);
        return (ex * (delta * delta - phi2 - v - ex)) / denom - (x - a) / (TAU * TAU);
    }
    let A = a;
    let B = (delta * delta > phi2 + v)
        ? Math.log(delta * delta - phi2 - v)
        : (() => { let k = 1; while (f(a - k * TAU) < 0) k++; return a - k * TAU; })();

    let fA = f(A), fB = f(B);
    for (let i = 0; Math.abs(B - A) > EPSILON && i < 100; i++) {
        const C = A + (A - B) * fA / (fB - fA);
        const fC = f(C);
        if (fC * fB <= 0) { A = B; fA = fB; } else { fA /= 2; }
        B = C; fB = fC;
    }
    const sigmaPrime = Math.exp(A / 2);

    const phiStar  = Math.sqrt(phi2 + sigmaPrime * sigmaPrime);
    const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
    const muPrime  = mu + phiPrime * phiPrime * gPhiJ * (score - eVal);

    const { r: rNew, rd: rdNew } = toPublished(muPrime, phiPrime);
    return {
        r:     Math.round(rNew * 10) / 10,
        rd:    Math.max(30, Math.min(350, Math.round(rdNew * 10) / 10)),
        sigma: Math.round(sigmaPrime * 1e6) / 1e6,
    };
}

// ─── saveMatchResult ─────────────────────────────────────────────────────────

/**
 * Persists a completed game to Firestore and — if both players are
 * registered — enqueues a serial Glicko-2 rating update.
 *
 * Game record writes are direct (append-only, no conflict).
 * Rating writes go through the SerialQueue (each reads the value the
 * previous write left, even under burst load).
 */
const saveMatchResult = async (
    gameId, timestamp, whiteName, blackName,
    whitePlayerId, blackPlayerId, boardId, winner, moves, io,
    tournamentId = null, tournamentRoundInfo = null
) => {
    try {
        // ── 1. Persist game record ──
        await db.saveGame({
            game_id: gameId,
            timestamp,
            white_name: whiteName,
            black_name: blackName,
            white_player_id: whitePlayerId,
            black_player_id: blackPlayerId,
            board_id: boardId,
            winner,
            moves: JSON.stringify(moves),
            tournament_id: tournamentId,
            tournament_round_info: tournamentRoundInfo,
        });

        logger.info('Storage', `Match ${gameId} stored (winner=${winner}).`);

        // ── 2. Update Glicko-2 ratings (serialised) ──
        const isRegistered = (id) => id && !id.startsWith('guest_');
        if (!isRegistered(whitePlayerId) || !isRegistered(blackPlayerId)) return;

        // Fire-and-forget into the queue (don't await — lets the socket handler return fast)
        ratingQueue.enqueue(async () => {
            const white = await db.getUser(whitePlayerId);
            const black = await db.getUser(blackPlayerId);
            if (!white || !black) return;

            const whiteR     = Number(white.rating) || 1500;
            const whiteRd    = Number(white.rating_deviation) || 350;
            const whiteSigma = Number(white.rating_volatility) || 0.06;
            const blackR     = Number(black.rating) || 1500;
            const blackRd    = Number(black.rating_deviation) || 350;
            const blackSigma = Number(black.rating_volatility) || 0.06;

            const whiteScore = winner === 'white' ? 1 : (winner === 'draw' ? 0.5 : 0);
            const newWhite = glicko2Update(whiteR, whiteRd, whiteSigma, blackR, blackRd, whiteScore);
            const newBlack = glicko2Update(blackR, blackRd, blackSigma, whiteR, whiteRd, 1 - whiteScore);

            await db.updateUserRating(whitePlayerId, newWhite.r, newWhite.rd, newWhite.sigma);
            await db.updateUserRating(blackPlayerId, newBlack.r, newBlack.rd, newBlack.sigma);

            logger.info('Rating',
                `Glicko-2 update for ${gameId}: ` +
                `white ${whiteR.toFixed(0)}→${newWhite.r.toFixed(0)} ` +
                `(RD ${whiteRd.toFixed(0)}→${newWhite.rd.toFixed(0)}), ` +
                `black ${blackR.toFixed(0)}→${newBlack.r.toFixed(0)} ` +
                `(RD ${blackRd.toFixed(0)}→${newBlack.rd.toFixed(0)})`
            );

            // Emit rating update to all sockets in the game room
            if (io) {
                io.to(gameId).emit('rating_updated', {
                    whitePlayerId,
                    blackPlayerId,
                    whiteRating: Math.round(newWhite.r),
                    blackRating: Math.round(newBlack.r),
                    whiteRatingOld: Math.round(whiteR),
                    blackRatingOld: Math.round(blackR),
                });
            }
        }).catch(err => logger.error('Rating', 'Rating update failed:', err));

    } catch (err) {
        logger.error('Storage', 'Error saving match result:', err);
        throw err;
    }
};

module.exports = { saveMatchResult };
