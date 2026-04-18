/**
 * db.js — Firestore-backed persistence layer.
 *
 * Provides high-level helper functions for all database operations.
 * Replaces the previous DuckDB-based implementation.
 *
 * All functions gracefully return null/empty when Firestore is unavailable,
 * so the game engine can keep running in-memory even if the DB is down.
 */

'use strict';

const firestoreAdapter = require('./firestoreAdapter');
const logger = require('./utils/logger');

// ─── Initialization ─────────────────────────────────────────────────────────

const initDb = async () => {
    await firestoreAdapter.init();
    if (firestoreAdapter.isConnected()) {
        logger.info('DB', 'Firestore initialized successfully.');
    } else {
        logger.warn('DB', 'Firestore not available — server running without persistence.');
    }
};

// ─── Helper: get Firestore db or null ────────────────────────────────────────

function _db() {
    return firestoreAdapter.getDb();
}

function _isUp() {
    return firestoreAdapter.isConnected();
}

// ─── Users ──────────────────────────────────────────────────────────────────

async function getUser(id) {
    if (!_isUp()) return null;
    try {
        const doc = await _db().collection('users').doc(id).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        logger.error('DB', `getUser(${id}) failed:`, e.message);
        return null;
    }
}

async function getUserByEmailOrUsername(identifier) {
    if (!_isUp()) return null;
    try {
        const db = _db();
        // Try email first
        let snap = await db.collection('users').where('email', '==', identifier).limit(1).get();
        if (!snap.empty) return snap.docs[0].data();
        // Try username
        snap = await db.collection('users').where('username', '==', identifier).limit(1).get();
        if (!snap.empty) return snap.docs[0].data();
        return null;
    } catch (e) {
        logger.error('DB', `getUserByEmailOrUsername(${identifier}) failed:`, e.message);
        return null;
    }
}

async function getUserByVerificationToken(token) {
    if (!_isUp()) return null;
    try {
        const snap = await _db().collection('users')
            .where('verification_token', '==', token)
            .limit(1).get();
        if (snap.empty) return null;
        const user = snap.docs[0].data();
        // Check expiry
        if (user.token_expires_at && user.token_expires_at < Date.now()) return null;
        return user;
    } catch (e) {
        logger.error('DB', `getUserByVerificationToken failed:`, e.message);
        return null;
    }
}

/**
 * Create a new user.  Throws if username or email already exists.
 */
async function createUser(data) {
    if (!_isUp()) throw new Error('Database unavailable');
    const db = _db();

    // Check uniqueness manually (Firestore has no UNIQUE constraint)
    const emailSnap = await db.collection('users').where('email', '==', data.email).limit(1).get();
    if (!emailSnap.empty) throw new Error('Username or Email already registered');
    const usernameSnap = await db.collection('users').where('username', '==', data.username).limit(1).get();
    if (!usernameSnap.empty) throw new Error('Username or Email already registered');

    await db.collection('users').doc(data.id).set({
        id: data.id,
        username: data.username,
        email: data.email,
        password_hash: data.password_hash,
        role: data.role || 'registered',
        is_verified: data.is_verified || 0,
        verification_token: data.verification_token || null,
        token_expires_at: data.token_expires_at || null,
        rating: data.rating || 1500,
        rating_deviation: data.rating_deviation || 350,
        rating_volatility: data.rating_volatility || 0.06,
        nb_tournaments_entered: data.nb_tournaments_entered || 0,
        nb_tournaments_finished: data.nb_tournaments_finished || 0,
        created_at: data.created_at || Date.now(),
    });
}

async function updateUser(id, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('users').doc(id).update(fields);
    } catch (e) {
        logger.error('DB', `updateUser(${id}) failed:`, e.message);
    }
}

async function updateUserRating(id, rating, ratingDeviation, ratingVolatility) {
    if (!_isUp()) return;
    try {
        await _db().collection('users').doc(id).update({
            rating,
            rating_deviation: ratingDeviation,
            rating_volatility: ratingVolatility,
        });
    } catch (e) {
        logger.error('DB', `updateUserRating(${id}) failed:`, e.message);
    }
}

async function incrementUserField(id, field, amount = 1) {
    if (!_isUp()) return;
    try {
        const { FieldValue } = require('@google-cloud/firestore');
        await _db().collection('users').doc(id).update({
            [field]: FieldValue.increment(amount),
        });
    } catch (e) {
        logger.error('DB', `incrementUserField(${id}, ${field}) failed:`, e.message);
    }
}

// ─── Profiles ───────────────────────────────────────────────────────────────

async function getProfile(userId) {
    if (!_isUp()) return null;
    try {
        const doc = await _db().collection('profiles').doc(userId).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        logger.error('DB', `getProfile(${userId}) failed:`, e.message);
        return null;
    }
}

async function upsertProfile(userId, data) {
    if (!_isUp()) return;
    try {
        await _db().collection('profiles').doc(userId).set(
            { user_id: userId, ...data },
            { merge: true }
        );
    } catch (e) {
        logger.error('DB', `upsertProfile(${userId}) failed:`, e.message);
    }
}

// ─── Games ──────────────────────────────────────────────────────────────────

async function saveGame(data) {
    if (!_isUp()) return;
    try {
        await _db().collection('games').doc(data.game_id).set({
            game_id: data.game_id,
            timestamp: data.timestamp,
            white_name: data.white_name,
            black_name: data.black_name,
            white_player_id: data.white_player_id,
            black_player_id: data.black_player_id,
            board_id: data.board_id,
            winner: data.winner,
            moves: typeof data.moves === 'string' ? data.moves : JSON.stringify(data.moves || []),
            tournament_id: data.tournament_id || null,
            tournament_round_info: data.tournament_round_info || null,
            // Extra fields for tournament games (unified schema)
            white_score: data.white_score || 0,
            black_score: data.black_score || 0,
            started_at: data.started_at || data.timestamp,
            completed_at: data.completed_at || null,
        });
        logger.debug('DB', `Game ${data.game_id} saved.`);
    } catch (e) {
        logger.error('DB', `saveGame(${data.game_id}) failed:`, e.message);
    }
}

async function updateGame(gameId, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('games').doc(gameId).update(fields);
    } catch (e) {
        logger.error('DB', `updateGame(${gameId}) failed:`, e.message);
    }
}

/**
 * Get games older than `cutoffMs` (epoch timestamp).
 * Used by the offload job to find games to export to Parquet.
 */
async function getGamesOlderThan(cutoffMs) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('games')
            .where('timestamp', '<', cutoffMs)
            .get();
        return snap.docs
            .filter(d => d.id !== '_meta')
            .map(d => d.data());
    } catch (e) {
        logger.error('DB', `getGamesOlderThan failed:`, e.message);
        return [];
    }
}

/**
 * Delete games by their IDs (after successful Parquet export).
 */
async function deleteGamesByIds(gameIds) {
    if (!_isUp() || gameIds.length === 0) return;
    try {
        const db = _db();
        // Firestore batch limit is 500
        const batchSize = 500;
        for (let i = 0; i < gameIds.length; i += batchSize) {
            const batch = db.batch();
            const chunk = gameIds.slice(i, i + batchSize);
            for (const id of chunk) {
                batch.delete(db.collection('games').doc(id));
            }
            await batch.commit();
        }
        logger.info('DB', `Deleted ${gameIds.length} game(s) from Firestore.`);
    } catch (e) {
        logger.error('DB', `deleteGamesByIds failed:`, e.message);
    }
}

/**
 * Count all games in Firestore (excluding _meta).
 */
async function countGames() {
    if (!_isUp()) return 0;
    try {
        const snap = await _db().collection('games').count().get();
        // Subtract 1 for _meta doc if it exists
        const total = snap.data().count;
        return Math.max(0, total - 1);
    } catch (e) {
        logger.error('DB', `countGames failed:`, e.message);
        return 0;
    }
}

// ─── Tournaments ────────────────────────────────────────────────────────────

async function saveTournament(data) {
    if (!_isUp()) return;
    try {
        await _db().collection('tournaments').doc(data.id).set(data);
    } catch (e) {
        logger.error('DB', `saveTournament(${data.id}) failed:`, e.message);
    }
}

async function getTournament(id) {
    if (!_isUp()) return null;
    try {
        const doc = await _db().collection('tournaments').doc(id).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        logger.error('DB', `getTournament(${id}) failed:`, e.message);
        return null;
    }
}

async function updateTournament(id, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('tournaments').doc(id).update(fields);
    } catch (e) {
        logger.error('DB', `updateTournament(${id}) failed:`, e.message);
    }
}

async function getActiveTournaments() {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('tournaments')
            .where('status', 'in', ['open', 'active'])
            .orderBy('created_at')
            .get();
        return snap.docs
            .filter(d => d.id !== '_meta')
            .map(d => d.data());
    } catch (e) {
        logger.error('DB', `getActiveTournaments failed:`, e.message);
        return [];
    }
}

// ─── Tournament Participants ────────────────────────────────────────────────

function _participantDocId(tournamentId, userId) {
    return `${tournamentId}_${userId}`;
}

async function addParticipant(data) {
    if (!_isUp()) return;
    try {
        const docId = _participantDocId(data.tournament_id, data.user_id);
        await _db().collection('tournament_participants').doc(docId).set(data);
    } catch (e) {
        logger.error('DB', `addParticipant(${data.tournament_id}, ${data.user_id}) failed:`, e.message);
    }
}

async function removeParticipant(tournamentId, userId) {
    if (!_isUp()) return;
    try {
        const docId = _participantDocId(tournamentId, userId);
        await _db().collection('tournament_participants').doc(docId).delete();
    } catch (e) {
        logger.error('DB', `removeParticipant(${tournamentId}, ${userId}) failed:`, e.message);
    }
}

async function updateParticipantScore(tournamentId, userId, fields) {
    if (!_isUp()) return;
    try {
        const docId = _participantDocId(tournamentId, userId);
        await _db().collection('tournament_participants').doc(docId).update(fields);
    } catch (e) {
        logger.error('DB', `updateParticipantScore(${tournamentId}, ${userId}) failed:`, e.message);
    }
}

async function getParticipantsForTournament(tournamentId) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('tournament_participants')
            .where('tournament_id', '==', tournamentId)
            .orderBy('score', 'desc')
            .get();
        return snap.docs.map(d => d.data());
    } catch (e) {
        logger.error('DB', `getParticipantsForTournament(${tournamentId}) failed:`, e.message);
        return [];
    }
}

async function getGamesForTournament(tournamentId) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('games')
            .where('tournament_id', '==', tournamentId)
            .orderBy('started_at')
            .get();
        return snap.docs
            .filter(d => d.id !== '_meta')
            .map(d => d.data());
    } catch (e) {
        logger.error('DB', `getGamesForTournament(${tournamentId}) failed:`, e.message);
        return [];
    }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
    initDb,
    isDbUp: _isUp,

    // Users
    getUser,
    getUserByEmailOrUsername,
    getUserByVerificationToken,
    createUser,
    updateUser,
    updateUserRating,
    incrementUserField,

    // Profiles
    getProfile,
    upsertProfile,

    // Games
    saveGame,
    updateGame,
    getGamesOlderThan,
    deleteGamesByIds,
    countGames,

    // Tournaments
    saveTournament,
    getTournament,
    updateTournament,
    getActiveTournaments,

    // Tournament Participants
    addParticipant,
    removeParticipant,
    updateParticipantScore,
    getParticipantsForTournament,
    getGamesForTournament,
};
