/**
 * db.js — PostgreSQL-backed persistence layer.
 *
 * Provides high-level helper functions for all database operations.
 * All functions gracefully return null/empty when PostgreSQL is unavailable,
 * so the game engine can keep running in-memory even if the DB is down.
 */

'use strict';

const pgAdapter = require('./pgAdapter');
const logger = require('./utils/logger');

// ─── Initialization ─────────────────────────────────────────────────────────

const initDb = async () => {
    await pgAdapter.init();
    if (pgAdapter.isConnected()) {
        logger.info('DB', 'PostgreSQL initialized successfully.');
    } else {
        logger.warn('DB', 'PostgreSQL not available — server running without persistence.');
    }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _pool() { return pgAdapter.getPool(); }
function _isUp() { return pgAdapter.isConnected(); }

const VALID_RATING_FIELDS = new Set([
    'rating', 'rating_bullet', 'rating_blitz', 'rating_rapid', 'rating_classical',
]);

/** Build a dynamic UPDATE query from an object of fields. */
function _buildUpdate(table, idCol, id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`);
    const vals = keys.map(k => {
        const v = fields[k];
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
        return v;
    });
    vals.push(id);
    return { text: `UPDATE ${table} SET ${sets.join(', ')} WHERE "${idCol}" = $${vals.length}`, values: vals };
}

// ─── Users ──────────────────────────────────────────────────────────────────

async function getUser(id) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query('SELECT * FROM users WHERE id = $1', [id]);
        return r.rows[0] || null;
    } catch (e) { logger.error('DB', `getUser(${id}) failed:`, e.message); return null; }
}

async function searchUsers(query, limit = 50) {
    if (!_isUp()) return [];
    try {
        let r;
        if (query && query.trim()) {
            r = await _pool().query(
                'SELECT * FROM users WHERE username ILIKE $1 ORDER BY username LIMIT $2',
                [query.trim() + '%', limit]
            );
        } else {
            r = await _pool().query('SELECT * FROM users ORDER BY username LIMIT $1', [limit]);
        }
        return r.rows;
    } catch (e) { logger.error('DB', `searchUsers(${query}) failed:`, e.message); return []; }
}

async function getUserByEmailOrUsername(identifier) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query(
            'SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1', [identifier]
        );
        return r.rows[0] || null;
    } catch (e) { logger.error('DB', `getUserByEmailOrUsername(${identifier}) failed:`, e.message); return null; }
}

async function getUserByEmailHash(hash) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query(
            'SELECT id FROM users WHERE email_hash = $1 LIMIT 1', [hash]
        );
        return r.rows[0] || null;
    } catch (e) { logger.error('DB', `getUserByEmailHash failed:`, e.message); return null; }
}

async function getUserByVerificationToken(token) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query(
            'SELECT * FROM users WHERE verification_token = $1 AND (token_expires_at IS NULL OR token_expires_at > $2) LIMIT 1',
            [token, Date.now()]
        );
        return r.rows[0] || null;
    } catch (e) { logger.error('DB', `getUserByVerificationToken failed:`, e.message); return null; }
}

async function createUser(data) {
    if (!_isUp()) throw new Error('Database unavailable');
    try {
        await _pool().query(
            `INSERT INTO users (id, username, email, email_hash, password_hash, role, is_verified,
                verification_token, token_expires_at, rating, rating_deviation, rating_volatility,
                rating_bullet, rating_blitz, rating_rapid, rating_classical,
                nb_tournaments_entered, nb_tournaments_finished,
                is_subscriber, subscription_source, subscriber_until, subscription_id,
                is_admin, rated_games_played_today, bot_games_played_today, timezone, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
            [
                data.id, data.username, data.email, data.email_hash || null,
                data.password_hash,
                data.role || 'registered', data.is_verified || 0,
                data.verification_token || null, data.token_expires_at || null,
                data.rating || 1500, data.rating_deviation || 350, data.rating_volatility || 0.06,
                data.rating_bullet || 1500, data.rating_blitz || 1500,
                data.rating_rapid || 1500, data.rating_classical || 1500,
                data.nb_tournaments_entered || 0, data.nb_tournaments_finished || 0,
                data.is_subscriber || 0, data.subscription_source || null,
                data.subscriber_until || null, data.subscription_id || null,
                data.is_admin || 0, data.rated_games_played_today || 0,
                data.bot_games_played_today || 0, data.timezone || 'UTC',
                data.created_at || Date.now(),
            ]
        );
    } catch (e) {
        if (e.code === '23505') throw new Error('Username or Email already registered');
        throw e;
    }
}

async function updateUser(id, fields) {
    if (!_isUp()) return;
    try {
        const q = _buildUpdate('users', 'id', id, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateUser(${id}) failed:`, e.message); }
}

/**
 * Permanently delete a user and all their owned data.
 * Cascades: profiles, subscriptions, tournament_participants, leaderboards.
 * Games are anonymised (player name set to "[deleted]") rather than deleted,
 * so game history remains intact for opponents.
 */
async function deleteUser(id) {
    if (!_isUp()) throw new Error('Database unavailable');
    const pool = _pool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Anonymise past games so opponents' history stays coherent
        await client.query(
            `UPDATE games SET white_player_id = NULL, white_name = '[deleted]'
             WHERE white_player_id = $1`, [id]);
        await client.query(
            `UPDATE games SET black_player_id = NULL, black_name = '[deleted]'
             WHERE black_player_id = $1`, [id]);
        // Remove participation & subscription records
        await client.query('DELETE FROM tournament_participants WHERE user_id = $1', [id]);
        await client.query('DELETE FROM subscriptions              WHERE user_id = $1', [id]);
        await client.query('DELETE FROM leaderboards               WHERE user_id = $1', [id]);
        await client.query('DELETE FROM profiles                   WHERE user_id = $1', [id]);
        // Finally remove the user row itself
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        await client.query('COMMIT');
        logger.info('DB', `deleteUser(${id}) succeeded — user data anonymised/removed.`);
    } catch (e) {
        await client.query('ROLLBACK');
        logger.error('DB', `deleteUser(${id}) failed:`, e.message);
        throw e;
    } finally {
        client.release();
    }
}

async function updateUserRating(id, rating, ratingDeviation, ratingVolatility, ratingField = 'rating') {
    if (!_isUp()) return;
    try {
        const fields = {
            rating,
            rating_deviation: ratingDeviation,
            rating_volatility: ratingVolatility,
        };
        if (ratingField !== 'rating') fields[ratingField] = rating;
        const q = _buildUpdate('users', 'id', id, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateUserRating(${id}, ${ratingField}) failed:`, e.message); }
}

async function incrementUserField(id, field, amount = 1) {
    if (!_isUp()) return;
    try {
        await _pool().query(`UPDATE users SET "${field}" = COALESCE("${field}", 0) + $1 WHERE id = $2`, [amount, id]);
    } catch (e) { logger.error('DB', `incrementUserField(${id}, ${field}) failed:`, e.message); }
}

// ─── Profiles ───────────────────────────────────────────────────────────────

async function getProfile(userId) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query('SELECT data FROM profiles WHERE user_id = $1', [userId]);
        return r.rows.length > 0 ? r.rows[0].data : null;
    } catch (e) { logger.error('DB', `getProfile(${userId}) failed:`, e.message); return null; }
}

async function upsertProfile(userId, data) {
    if (!_isUp()) return;
    try {
        const payload = JSON.stringify({ user_id: userId, ...data });
        await _pool().query(
            `INSERT INTO profiles (user_id, data) VALUES ($1, $2::jsonb)
             ON CONFLICT (user_id) DO UPDATE SET data = profiles.data || $2::jsonb`,
            [userId, payload]
        );
    } catch (e) { logger.error('DB', `upsertProfile(${userId}) failed:`, e.message); }
}

// ─── Games ──────────────────────────────────────────────────────────────────

async function saveGame(data) {
    if (!_isUp()) return;
    try {
        await _pool().query(
            `INSERT INTO games (game_id, "timestamp", white_name, black_name, white_player_id,
                black_player_id, board_id, winner, moves, tournament_id, tournament_round_info,
                white_score, black_score, started_at, completed_at, time_control_minutes, time_control_increment)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [
                data.game_id, data.timestamp, data.white_name, data.black_name,
                data.white_player_id, data.black_player_id, data.board_id, data.winner,
                typeof data.moves === 'string' ? data.moves : JSON.stringify(data.moves || []),
                data.tournament_id || null, data.tournament_round_info || null,
                data.white_score || 0, data.black_score || 0,
                data.started_at || data.timestamp, data.completed_at || null,
                data.time_control_minutes || null, data.time_control_increment || null,
            ]
        );
        logger.debug('DB', `Game ${data.game_id} saved.`);
    } catch (e) { logger.error('DB', `saveGame(${data.game_id}) failed:`, e.message); }
}

async function updateGame(gameId, fields) {
    if (!_isUp()) return;
    try {
        const q = _buildUpdate('games', 'game_id', gameId, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateGame(${gameId}) failed:`, e.message); }
}

async function getGamesOlderThan(cutoffMs) {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query('SELECT * FROM games WHERE "timestamp" < $1', [cutoffMs]);
        return r.rows;
    } catch (e) { logger.error('DB', `getGamesOlderThan failed:`, e.message); return []; }
}

async function deleteGamesByIds(gameIds) {
    if (!_isUp() || gameIds.length === 0) return;
    try {
        await _pool().query('DELETE FROM games WHERE game_id = ANY($1::text[])', [gameIds]);
        logger.info('DB', `Deleted ${gameIds.length} game(s).`);
    } catch (e) { logger.error('DB', `deleteGamesByIds failed:`, e.message); }
}

async function countGames() {
    if (!_isUp()) return 0;
    try {
        const r = await _pool().query('SELECT COUNT(*)::int AS count FROM games');
        return r.rows[0].count;
    } catch (e) { logger.error('DB', `countGames failed:`, e.message); return 0; }
}

async function getGamesForTournament(tournamentId) {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query(
            'SELECT * FROM games WHERE tournament_id = $1 ORDER BY started_at', [tournamentId]
        );
        return r.rows;
    } catch (e) { logger.error('DB', `getGamesForTournament(${tournamentId}) failed:`, e.message); return []; }
}

async function getGamesByPlayer(userId, side, limit = 50) {
    if (!_isUp()) return [];
    try {
        const col = side === 'white' ? 'white_player_id' : 'black_player_id';
        const r = await _pool().query(
            `SELECT * FROM games WHERE ${col} = $1 ORDER BY "timestamp" DESC LIMIT $2`,
            [userId, limit]
        );
        return r.rows;
    } catch (e) { logger.error('DB', `getGamesByPlayer(${userId}, ${side}) failed:`, e.message); return []; }
}

// ─── Tournaments ────────────────────────────────────────────────────────────

async function saveTournament(data) {
    if (!_isUp()) return;
    try {
        await _pool().query(
            `INSERT INTO tournaments (id, name, creator_id, creator_username, status, format,
                password_hash, has_password, max_participants, current_count,
                time_control_minutes, time_control_increment, board_id,
                rating_min, rating_max, duration_value, invited_bots, creator_plays,
                launch_mode, launch_at, created_at, started_at, completed_at, remove_at, current_round)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
             ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, status=EXCLUDED.status, current_count=EXCLUDED.current_count,
                started_at=EXCLUDED.started_at, completed_at=EXCLUDED.completed_at,
                current_round=EXCLUDED.current_round, remove_at=EXCLUDED.remove_at`,
            [
                data.id, data.name, data.creator_id, data.creator_username,
                data.status || 'open', data.format,
                data.password_hash || null, data.has_password || 0,
                data.max_participants, data.current_count || 0,
                data.time_control_minutes, data.time_control_increment,
                data.board_id || null, data.rating_min || 0, data.rating_max || 5000,
                data.duration_value, data.invited_bots || 0, data.creator_plays || 0,
                data.launch_mode || 'both', data.launch_at || null,
                data.created_at, data.started_at || null, data.completed_at || null,
                data.remove_at || null, data.current_round || 0,
            ]
        );
    } catch (e) { logger.error('DB', `saveTournament(${data.id}) failed:`, e.message); }
}

async function getTournament(id) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query('SELECT * FROM tournaments WHERE id = $1', [id]);
        return r.rows[0] || null;
    } catch (e) { logger.error('DB', `getTournament(${id}) failed:`, e.message); return null; }
}

async function updateTournament(id, fields) {
    if (!_isUp()) return;
    try {
        const q = _buildUpdate('tournaments', 'id', id, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateTournament(${id}) failed:`, e.message); }
}

async function getActiveTournaments() {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query(
            "SELECT * FROM tournaments WHERE status IN ('open', 'active') ORDER BY created_at"
        );
        return r.rows;
    } catch (e) { logger.error('DB', `getActiveTournaments failed:`, e.message); return []; }
}

// ─── Tournament Participants ────────────────────────────────────────────────

function _participantDocId(tournamentId, userId) {
    return `${tournamentId}_${userId}`;
}

async function addParticipant(data) {
    if (!_isUp()) return;
    try {
        const docId = _participantDocId(data.tournament_id, data.user_id);
        await _pool().query(
            `INSERT INTO tournament_participants (id, tournament_id, user_id, username, rating, score,
                games_played, wins, losses, draws, tiebreaker, joined_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
                docId, data.tournament_id, data.user_id, data.username || null,
                data.rating || 1500, data.score || 0,
                data.games_played || 0, data.wins || 0, data.losses || 0,
                data.draws || 0, data.tiebreaker || 0, data.joined_at || Date.now(),
            ]
        );
    } catch (e) { logger.error('DB', `addParticipant(${data.tournament_id}, ${data.user_id}) failed:`, e.message); }
}

async function removeParticipant(tournamentId, userId) {
    if (!_isUp()) return;
    try {
        const docId = _participantDocId(tournamentId, userId);
        await _pool().query('DELETE FROM tournament_participants WHERE id = $1', [docId]);
    } catch (e) { logger.error('DB', `removeParticipant(${tournamentId}, ${userId}) failed:`, e.message); }
}

async function updateParticipantScore(tournamentId, userId, fields) {
    if (!_isUp()) return;
    try {
        const docId = _participantDocId(tournamentId, userId);
        const q = _buildUpdate('tournament_participants', 'id', docId, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateParticipantScore(${tournamentId}, ${userId}) failed:`, e.message); }
}

async function getParticipantsForTournament(tournamentId) {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query(
            'SELECT * FROM tournament_participants WHERE tournament_id = $1 ORDER BY score DESC',
            [tournamentId]
        );
        return r.rows;
    } catch (e) { logger.error('DB', `getParticipantsForTournament(${tournamentId}) failed:`, e.message); return []; }
}

// ─── Cron Jobs (persistent schedule table, one row per job type) ────────────

async function getCronJobs() {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query('SELECT * FROM cron_jobs ORDER BY type');
        return r.rows;
    } catch (e) { logger.error('DB', `getCronJobs failed:`, e.message); return []; }
}

async function upsertCronJob(data) {
    if (!_isUp()) return;
    try {
        await _pool().query(
            `INSERT INTO cron_jobs (type, description, minute, hour, weekday, enabled,
                created_at, last_run_at, last_run_status, last_run_id, last_error)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (type) DO UPDATE SET
                description=EXCLUDED.description, minute=EXCLUDED.minute, hour=EXCLUDED.hour,
                weekday=EXCLUDED.weekday, enabled=EXCLUDED.enabled,
                last_run_at=EXCLUDED.last_run_at, last_run_status=EXCLUDED.last_run_status,
                last_run_id=EXCLUDED.last_run_id, last_error=EXCLUDED.last_error`,
            [
                data.type, data.description || null,
                String(data.minute ?? '*'), String(data.hour ?? '*'), String(data.weekday ?? '*'),
                data.enabled !== false,
                data.created_at || Date.now(), data.last_run_at || null,
                data.last_run_status || null, data.last_run_id || null, data.last_error || null,
            ]
        );
    } catch (e) { logger.error('DB', `upsertCronJob(${data.type}) failed:`, e.message); }
}

async function updateCronJob(type, fields) {
    if (!_isUp()) return;
    try {
        const q = _buildUpdate('cron_jobs', 'type', type, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateCronJob(${type}) failed:`, e.message); }
}

// ─── Jobs (run-log: one record per execution) ────────────────────────────────

async function saveJob(data) {
    if (!_isUp()) return;
    try {
        await _pool().query(
            `INSERT INTO jobs (id, type, status, scheduled_at, started_at, completed_at, created_at, worker_id, payload, error)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                data.id, data.type, data.status,
                data.scheduled_at || null, data.started_at || null,
                data.completed_at || null, data.created_at || Date.now(),
                data.worker_id || null,
                JSON.stringify(data.payload || {}), data.error || null,
            ]
        );
    } catch (e) { logger.error('DB', `saveJob(${data.id}) failed:`, e.message); }
}

async function getJob(id) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query('SELECT * FROM jobs WHERE id = $1', [id]);
        return r.rows[0] || null;
    } catch (e) { logger.error('DB', `getJob(${id}) failed:`, e.message); return null; }
}

async function updateJob(id, fields) {
    if (!_isUp()) return;
    try {
        const q = _buildUpdate('jobs', 'id', id, fields);
        if (q) await _pool().query(q.text, q.values);
    } catch (e) { logger.error('DB', `updateJob(${id}) failed:`, e.message); }
}

async function getDueJobs(timestamp) {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query(
            "SELECT * FROM jobs WHERE status = 'SCHEDULED' AND scheduled_at <= $1", [timestamp]
        );
        return r.rows;
    } catch (e) { logger.error('DB', `getDueJobs failed:`, e.message); return []; }
}

async function getJobsOlderThan(timestamp) {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query('SELECT * FROM jobs WHERE completed_at <= $1', [timestamp]);
        return r.rows;
    } catch (e) { logger.error('DB', `getJobsOlderThan failed:`, e.message); return []; }
}

async function getAllJobs() {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query('SELECT * FROM jobs ORDER BY scheduled_at DESC');
        return r.rows;
    } catch (e) { logger.error('DB', `getAllJobs failed:`, e.message); return []; }
}

async function deleteJobsByIds(jobIds) {
    if (!_isUp() || jobIds.length === 0) return;
    try {
        await _pool().query('DELETE FROM jobs WHERE id = ANY($1::text[])', [jobIds]);
        logger.info('DB', `Deleted ${jobIds.length} job(s).`);
    } catch (e) { logger.error('DB', `deleteJobsByIds failed:`, e.message); }
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

async function saveSubscription(data) {
    if (!_isUp()) return;
    try {
        await _pool().query(
            `INSERT INTO subscriptions (id, user_id, type, status, created_at, expires_at, platform, receipt_data)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO UPDATE SET
                user_id=EXCLUDED.user_id, type=EXCLUDED.type, status=EXCLUDED.status,
                expires_at=EXCLUDED.expires_at, platform=EXCLUDED.platform, receipt_data=EXCLUDED.receipt_data`,
            [
                data.id, data.user_id, data.type, data.status,
                data.created_at || Date.now(), data.expires_at || null,
                data.platform || null, data.receipt_data || null,
            ]
        );
    } catch (e) { logger.error('DB', `saveSubscription(${data.id}) failed:`, e.message); }
}

async function getSubscriptionsForUser(userId) {
    if (!_isUp()) return [];
    try {
        const r = await _pool().query(
            'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC', [userId]
        );
        return r.rows;
    } catch (e) { logger.error('DB', `getSubscriptionsForUser(${userId}) failed:`, e.message); return []; }
}

async function resetDailyLimits() {
    if (!_isUp()) return;
    try {
        const r = await _pool().query(
            'UPDATE users SET rated_games_played_today = 0, bot_games_played_today = 0 WHERE rated_games_played_today > 0 OR bot_games_played_today > 0'
        );
        if (r.rowCount > 0) logger.info('DB', `Reset daily limits for ${r.rowCount} users.`);
    } catch (e) { logger.error('DB', 'resetDailyLimits failed:', e.message); }
}

// ─── Leaderboards ───────────────────────────────────────────────────────────

async function getTopPlayers(ratingField, limit = 50) {
    if (!_isUp()) return [];
    if (!VALID_RATING_FIELDS.has(ratingField)) return [];
    try {
        const r = await _pool().query(
            `SELECT id, username, ${ratingField} AS rating, (role = 'bot') AS is_bot
             FROM users ORDER BY ${ratingField} DESC LIMIT $1`,
            [limit]
        );
        return r.rows.map(u => ({
            id: u.id,
            username: u.username,
            rating: Math.round(Number(u.rating) || 1500),
            is_bot: u.is_bot,
        }));
    } catch (e) { logger.error('DB', `getTopPlayers(${ratingField}) failed:`, e.message); return []; }
}

async function saveLeaderboard(id, data) {
    if (!_isUp()) return;
    try {
        const now = Date.now();
        await _pool().query(
            `INSERT INTO leaderboards (id, data, updated_at) VALUES ($1, $2::jsonb, $3)
             ON CONFLICT (id) DO UPDATE SET data = $2::jsonb, updated_at = $3`,
            [id, JSON.stringify(data), now]
        );
    } catch (e) { logger.error('DB', `saveLeaderboard(${id}) failed:`, e.message); }
}

async function getLeaderboard(id) {
    if (!_isUp()) return null;
    try {
        const r = await _pool().query('SELECT * FROM leaderboards WHERE id = $1', [id]);
        if (r.rows.length === 0) return null;
        const row = r.rows[0];
        return { ...row.data, updated_at: row.updated_at };
    } catch (e) { logger.error('DB', `getLeaderboard(${id}) failed:`, e.message); return null; }
}

// ─── Tournament Schedule (daily templates) ───────────────────────────────────

const DEFAULT_SCHEDULE = [
    { format: 'arena',       minutes: 5,  increment: 5,  duration: 30, launch_hour: 12, launch_mode: 'any', start_in_minutes: 0, max_participants: 100, invited_bots: 0 },
    { format: 'arena',       minutes: 5,  increment: 5,  duration: 30, launch_hour: 16, launch_mode: 'any', start_in_minutes: 0, max_participants: 100, invited_bots: 0 },
    { format: 'arena',       minutes: 5,  increment: 5,  duration: 30, launch_hour: 20, launch_mode: 'any', start_in_minutes: 0, max_participants: 100, invited_bots: 0 },
    { format: 'arena',       minutes: 10, increment: 10, duration: 60, launch_hour: 20, launch_mode: 'any', start_in_minutes: 0, max_participants: 100, invited_bots: 0 },
    { format: 'arena',       minutes: 15, increment: 30, duration: 60, launch_hour: 20, launch_mode: 'any', start_in_minutes: 0, max_participants: 100, invited_bots: 0 },
    { format: 'swiss',       minutes: 10, increment: 10, duration: 7,  launch_hour: 20, launch_mode: 'any', start_in_minutes: 0, max_participants: 100, invited_bots: 0 },
    { format: 'knockout',    minutes: 10, increment: 10, duration: 3,  launch_hour: 16, launch_mode: 'any', start_in_minutes: 0, max_participants: 8,   invited_bots: 0 },
    { format: 'round_robin', minutes: 10, increment: 10, duration: 7,  launch_hour: 17, launch_mode: 'any', start_in_minutes: 0, max_participants: 8,   invited_bots: 0 },
];

async function getTournamentSchedule() {
    if (!_isUp()) return DEFAULT_SCHEDULE.map((r, i) => ({ ...r, id: `default_${i}`, enabled: true }));
    try {
        const r = await _pool().query('SELECT * FROM tournament_schedule ORDER BY launch_hour, format');
        // If the table is empty, seed with defaults and return them
        if (r.rows.length === 0) {
            await _seedDefaultSchedule();
            const r2 = await _pool().query('SELECT * FROM tournament_schedule ORDER BY launch_hour, format');
            return r2.rows;
        }
        return r.rows;
    } catch (e) { logger.error('DB', `getTournamentSchedule failed:`, e.message); return DEFAULT_SCHEDULE.map((r, i) => ({ ...r, id: `default_${i}`, enabled: true })); }
}

async function _seedDefaultSchedule() {
    const { v4: uuidv4 } = require('uuid');
    for (const item of DEFAULT_SCHEDULE) {
        const id = uuidv4().slice(0, 12);
        await _pool().query(
            `INSERT INTO tournament_schedule (id, format, minutes, increment, duration, launch_hour, launch_mode, start_in_minutes, max_participants, invited_bots, enabled, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
            [id, item.format, item.minutes, item.increment, item.duration, item.launch_hour,
             item.launch_mode || 'any', item.start_in_minutes || 0,
             item.max_participants, item.invited_bots, true, Date.now()]
        );
    }
    logger.info('DB', 'Seeded default tournament schedule.');
}

async function upsertTournamentScheduleItem(data) {
    if (!_isUp()) return;
    try {
        const { v4: uuidv4 } = require('uuid');
        const id = data.id || uuidv4().slice(0, 12);
        await _pool().query(
            `INSERT INTO tournament_schedule (id, format, minutes, increment, duration, launch_hour, launch_mode, start_in_minutes, max_participants, invited_bots, enabled, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO UPDATE SET
               format=EXCLUDED.format, minutes=EXCLUDED.minutes, increment=EXCLUDED.increment,
               duration=EXCLUDED.duration, launch_hour=EXCLUDED.launch_hour,
               launch_mode=EXCLUDED.launch_mode, start_in_minutes=EXCLUDED.start_in_minutes,
               max_participants=EXCLUDED.max_participants, invited_bots=EXCLUDED.invited_bots,
               enabled=EXCLUDED.enabled`,
            [
                id, data.format, data.minutes ?? 10, data.increment ?? 5,
                data.duration ?? 7, data.launch_hour ?? 20,
                data.launch_mode || 'any', data.start_in_minutes ?? 0,
                data.max_participants ?? 100, data.invited_bots ?? 0,
                data.enabled !== false, data.created_at || Date.now(),
            ]
        );
        return id;
    } catch (e) { logger.error('DB', `upsertTournamentScheduleItem failed:`, e.message); }
}

async function deleteTournamentScheduleItem(id) {
    if (!_isUp()) return;
    try {
        await _pool().query('DELETE FROM tournament_schedule WHERE id = $1', [id]);
    } catch (e) { logger.error('DB', `deleteTournamentScheduleItem(${id}) failed:`, e.message); }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
    initDb,
    isDbUp: _isUp,
    getUser, searchUsers, getUserByEmailOrUsername, getUserByEmailHash, getUserByVerificationToken,
    createUser, updateUser, deleteUser, updateUserRating, incrementUserField,
    getProfile, upsertProfile,
    saveGame, updateGame, getGamesOlderThan, deleteGamesByIds, countGames,
    getGamesForTournament, getGamesByPlayer,
    saveTournament, getTournament, updateTournament, getActiveTournaments,
    addParticipant, removeParticipant, updateParticipantScore, getParticipantsForTournament,
    getCronJobs, upsertCronJob, updateCronJob,
    saveJob, getJob, updateJob, getDueJobs, getJobsOlderThan, getAllJobs, deleteJobsByIds,
    saveSubscription, getSubscriptionsForUser, resetDailyLimits,
    getTopPlayers, saveLeaderboard, getLeaderboard,
    getTournamentSchedule, upsertTournamentScheduleItem, deleteTournamentScheduleItem,
};
