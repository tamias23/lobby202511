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

// ─── Helper: Inject UTC Date strings ─────────────────────────────────────────

function formatUtcString(ts) {
    if (!ts || typeof ts !== 'number') return null;
    const d = new Date(ts);
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function injectUtcFields(data) {
    if (!data || typeof data !== 'object') return data;
    const res = { ...data };
    for (const key of Object.keys(res)) {
        if (key.endsWith('_at') || key === 'timestamp' || key === 'subscriber_until') {
            if (typeof res[key] === 'number') {
                res[key + '_utc'] = formatUtcString(res[key]);
            }
        }
    }
    return res;
}

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

/**
 * Search users by username prefix (case-sensitive, Firestore range query).
 * Also returns bots. Limit 50.
 */
async function searchUsers(query, limit = 50) {
    if (!_isUp()) return [];
    try {
        const db = _db();
        let snap;
        if (query && query.trim()) {
            const q = query.trim();
            // Firestore range query for prefix match on username
            snap = await db.collection('users')
                .where('username', '>=', q)
                .where('username', '<=', q + '\uf8ff')
                .limit(limit)
                .get();
        } else {
            snap = await db.collection('users')
                .orderBy('username')
                .limit(limit)
                .get();
        }
        return snap.docs
            .filter(d => d.id !== '_meta')
            .map(d => d.data());
    } catch (e) {
        logger.error('DB', `searchUsers(${query}) failed:`, e.message);
        return [];
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

    const userData = {
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
        is_subscriber: data.is_subscriber || 0,
        subscription_source: data.subscription_source || null,
        subscriber_until: data.subscriber_until || null,
        subscription_id: data.subscription_id || null,
        is_admin: data.is_admin || 0,
        rated_games_played_today: data.rated_games_played_today || 0,
        bot_games_played_today: data.bot_games_played_today || 0,
        timezone: data.timezone || 'UTC',
        // Per-category ratings
        rating_bullet: data.rating_bullet || 1500,
        rating_blitz: data.rating_blitz || 1500,
        rating_rapid: data.rating_rapid || 1500,
        rating_classical: data.rating_classical || 1500,
        created_at: data.created_at || Date.now(),
    };
    await db.collection('users').doc(data.id).set(injectUtcFields(userData));
}

async function updateUser(id, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('users').doc(id).update(injectUtcFields(fields));
    } catch (e) {
        logger.error('DB', `updateUser(${id}) failed:`, e.message);
    }
}

async function updateUserRating(id, rating, ratingDeviation, ratingVolatility, ratingField = 'rating') {
    if (!_isUp()) return;
    try {
        await _db().collection('users').doc(id).update({
            [ratingField]: rating,
            rating_deviation: ratingDeviation,
            rating_volatility: ratingVolatility,
            rating: rating, // Keep 'rating' in sync with the last category played
        });
    } catch (e) {
        logger.error('DB', `updateUserRating(${id}, ${ratingField}) failed:`, e.message);
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
            injectUtcFields({ user_id: userId, ...data }),
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
        const gameData = {
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
            white_score: data.white_score || 0,
            black_score: data.black_score || 0,
            started_at: data.started_at || data.timestamp,
            completed_at: data.completed_at || null,
            time_control_minutes: data.time_control_minutes || null,
            time_control_increment: data.time_control_increment || null,
        };
        await _db().collection('games').doc(data.game_id).set(injectUtcFields(gameData));
        logger.debug('DB', `Game ${data.game_id} saved.`);
    } catch (e) {
        logger.error('DB', `saveGame(${data.game_id}) failed:`, e.message);
    }
}

async function updateGame(gameId, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('games').doc(gameId).update(injectUtcFields(fields));
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
        await _db().collection('tournaments').doc(data.id).set(injectUtcFields(data));
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
        await _db().collection('tournaments').doc(id).update(injectUtcFields(fields));
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
        await _db().collection('tournament_participants').doc(docId).set(injectUtcFields(data));
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

async function getGamesByPlayer(userId, side, limit = 50) {
    if (!_isUp()) return [];
    try {
        const field = side === 'white' ? 'white_player_id' : 'black_player_id';
        const snap = await _db().collection('games')
            .where(field, '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snap.docs
            .filter(d => d.id !== '_meta')
            .map(d => d.data());
    } catch (e) {
        logger.error('DB', `getGamesByPlayer(${userId}, ${side}) failed:`, e.message);
        return [];
    }
}

// ─── Cron Jobs (persistent schedule table, one row per job type) ────────────

async function getCronJobs() {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('cron_jobs').orderBy('type').get();
        return snap.docs
            .filter(d => d.id !== '_meta')
            .map(d => d.data());
    } catch (e) {
        logger.error('DB', `getCronJobs failed:`, e.message);
        return [];
    }
}

async function upsertCronJob(data) {
    if (!_isUp()) return;
    try {
        await _db().collection('cron_jobs').doc(data.type).set(injectUtcFields(data), { merge: true });
    } catch (e) {
        logger.error('DB', `upsertCronJob(${data.type}) failed:`, e.message);
    }
}

async function updateCronJob(type, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('cron_jobs').doc(type).update(injectUtcFields(fields));
    } catch (e) {
        logger.error('DB', `updateCronJob(${type}) failed:`, e.message);
    }
}

// ─── Jobs (run-log: one record per execution) ────────────────────────────────

async function saveJob(data) {
    if (!_isUp()) return;
    try {
        await _db().collection('jobs').doc(data.id).set(injectUtcFields(data));
    } catch (e) {
        logger.error('DB', `saveJob(${data.id}) failed:`, e.message);
    }
}

async function getJob(id) {
    if (!_isUp()) return null;
    try {
        const doc = await _db().collection('jobs').doc(id).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        logger.error('DB', `getJob(${id}) failed:`, e.message);
        return null;
    }
}

async function updateJob(id, fields) {
    if (!_isUp()) return;
    try {
        await _db().collection('jobs').doc(id).update(injectUtcFields(fields));
    } catch (e) {
        logger.error('DB', `updateJob(${id}) failed:`, e.message);
    }
}

async function getDueJobs(timestamp) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('jobs')
            .where('status', '==', 'SCHEDULED')
            .where('scheduled_at', '<=', timestamp)
            .get();
        return snap.docs.map(d => d.data());
    } catch (e) {
        logger.error('DB', `getDueJobs failed:`, e.message);
        return [];
    }
}

async function getJobsOlderThan(timestamp) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('jobs')
            .where('completed_at', '<=', timestamp)
            .get();
        return snap.docs.filter(d => d.id !== '_meta').map(d => d.data());
    } catch (e) {
        logger.error('DB', `getJobsOlderThan failed:`, e.message);
        return [];
    }
}

async function getAllJobs() {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('jobs')
            .orderBy('scheduled_at', 'desc')
            .get();
        return snap.docs.filter(d => d.id !== '_meta').map(d => d.data());
    } catch (e) {
        logger.error('DB', `getAllJobs failed:`, e.message);
        return [];
    }
}

async function deleteJobsByIds(jobIds) {
    if (!_isUp() || jobIds.length === 0) return;
    try {
        const dbInstance = _db();
        const batchSize = 500;
        for (let i = 0; i < jobIds.length; i += batchSize) {
            const batch = dbInstance.batch();
            const chunk = jobIds.slice(i, i + batchSize);
            for (const id of chunk) {
                batch.delete(dbInstance.collection('jobs').doc(id));
            }
            await batch.commit();
        }
        logger.info('DB', `Deleted ${jobIds.length} job(s) from Firestore.`);
    } catch (e) {
        logger.error('DB', `deleteJobsByIds failed:`, e.message);
    }
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

async function saveSubscription(data) {
    if (!_isUp()) return;
    try {
        await _db().collection('subscriptions').doc(data.id).set(injectUtcFields(data));
    } catch (e) {
        logger.error('DB', `saveSubscription(${data.id}) failed:`, e.message);
    }
}

async function getSubscriptionsForUser(userId) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('subscriptions')
            .where('user_id', '==', userId)
            .orderBy('created_at', 'desc')
            .get();
        return snap.docs.map(d => d.data());
    } catch (e) {
        logger.error('DB', `getSubscriptionsForUser(${userId}) failed:`, e.message);
        return [];
    }
}

async function resetDailyLimits() {
    if (!_isUp()) return;
    try {
        const dbInstance = _db();
        
        // Find users with rated_games_played_today > 0
        const ratedSnap = await dbInstance.collection('users')
            .where('rated_games_played_today', '>', 0)
            .get();
            
        // Find users with bot_games_played_today > 0
        const botSnap = await dbInstance.collection('users')
            .where('bot_games_played_today', '>', 0)
            .get();

        const userIdsToUpdate = new Set();
        ratedSnap.docs.forEach(d => userIdsToUpdate.add(d.id));
        botSnap.docs.forEach(d => userIdsToUpdate.add(d.id));

        const idsArray = Array.from(userIdsToUpdate);
        if (idsArray.length === 0) return;

        const batchSize = 500;
        for (let i = 0; i < idsArray.length; i += batchSize) {
            const batch = dbInstance.batch();
            const chunk = idsArray.slice(i, i + batchSize);
            for (const id of chunk) {
                batch.update(dbInstance.collection('users').doc(id), {
                    rated_games_played_today: 0,
                    bot_games_played_today: 0
                });
            }
            await batch.commit();
        }
        logger.info('DB', `Reset daily limits for ${idsArray.length} users.`);
    } catch (e) {
        logger.error('DB', 'resetDailyLimits failed:', e.message);
    }
}

// ─── Leaderboards ───────────────────────────────────────────────────────────

async function getTopPlayers(ratingField, limit = 50) {
    if (!_isUp()) return [];
    try {
        const snap = await _db().collection('users')
            .orderBy(ratingField, 'desc')
            .limit(limit * 2) // Fetch extra to account for potential bots
            .get();
            
        return snap.docs
            .map(d => ({ ...d.data(), id: d.id }))
            .slice(0, limit)
            .map(u => ({
                id: u.id,
                username: u.username,
                rating: Math.round(u[ratingField] || 1500),
                is_bot: u.role === 'bot',
            }));
    } catch (e) {
        logger.error('DB', `getTopPlayers(${ratingField}) failed:`, e.message);
        return [];
    }
}

async function saveLeaderboard(id, data) {
    if (!_isUp()) return;
    try {
        await _db().collection('leaderboards').doc(id).set(injectUtcFields({
            ...data,
            updated_at: Date.now(),
        }));
    } catch (e) {
        logger.error('DB', `saveLeaderboard(${id}) failed:`, e.message);
    }
}

async function getLeaderboard(id) {
    if (!_isUp()) return null;
    try {
        const doc = await _db().collection('leaderboards').doc(id).get();
        return doc.exists ? doc.data() : null;
    } catch (e) {
        logger.error('DB', `getLeaderboard(${id}) failed:`, e.message);
        return null;
    }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
    initDb,
    isDbUp: _isUp,

    // Users
    getUser,
    searchUsers,
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
    getGamesForTournament,
    getGamesByPlayer,

    // Tournaments
    saveTournament,
    getTournament,
    updateTournament,
    getActiveTournaments,

    // Tournament Participants
    addParticipant,
    removeParticipant,
    updateParticipantScore,
    // Jobs (run-log)
    saveJob,
    getJob,
    updateJob,
    getDueJobs,
    getJobsOlderThan,
    getAllJobs,
    deleteJobsByIds,
    // Cron Jobs (schedule table)
    getCronJobs,
    upsertCronJob,
    updateCronJob,
    // Subscriptions
    saveSubscription,
    getSubscriptionsForUser,
    resetDailyLimits,
    // Leaderboards
    getTopPlayers,
    saveLeaderboard,
    getLeaderboard,
};
