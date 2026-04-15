/**
 * tournamentManager.js — Core tournament lifecycle controller.
 *
 * Manages in-memory state + DuckDB persistence for tournaments.
 * Called from index.js socket handlers and periodic timers.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { getTournamentsDb, getUsersDb } = require('../db');
const { swissPairings, roundRobinPairings, knockoutPairings, arenaPairings, knockoutTotalRounds } = require('./pairings');
const { computeStandings, computeKnockoutBracket } = require('./standings');
const logger = require('../utils/logger');

// ─── Config (injected at init time from process.env) ────────────────────────
let CONFIG = {
    MAX_CONCURRENT_TOURNAMENTS: 20,
    MAX_BOTS_IN_TOURNAMENTS: 30,
    WIN_POINTS: 3,
    DRAW_POINTS: 1,
    LOSS_POINTS: 0,
    MAX_AGE_HOURS: 6,
    OPEN_EXPIRY_HOURS: 2,
};

function initConfig(env) {
    CONFIG.MAX_CONCURRENT_TOURNAMENTS = parseInt(env.MAX_CONCURRENT_TOURNAMENTS) || 20;
    CONFIG.MAX_BOTS_IN_TOURNAMENTS    = parseInt(env.MAX_BOTS_IN_TOURNAMENTS) || 30;
    CONFIG.WIN_POINTS                 = parseInt(env.TOURNAMENT_WIN_POINTS) || 3;
    CONFIG.DRAW_POINTS                = parseInt(env.TOURNAMENT_DRAW_POINTS) || 1;
    CONFIG.LOSS_POINTS                = parseInt(env.TOURNAMENT_LOSS_POINTS) || 0;
    CONFIG.MAX_AGE_HOURS              = parseInt(env.TOURNAMENT_MAX_AGE_HOURS) || 6;
    CONFIG.OPEN_EXPIRY_HOURS          = parseInt(env.TOURNAMENT_OPEN_EXPIRY_HOURS) || 2;
}

// ─── Format limits ──────────────────────────────────────────────────────────
const FORMAT_LIMITS = {
    swiss:       { min: 6, max: 200 },
    arena:       { min: 6, max: 200 },
    knockout:    { min: 2, max: 64 },
    round_robin: { min: 2, max: 10 },
};

// ─── In-memory state ────────────────────────────────────────────────────────
// Map<tournamentId, { ...dbRow, participants: [], games: [], arenaTimeout?, ... }>
const activeTournaments = new Map();

// Callbacks set by index.js
let _createGameFn = null;   // (whitePlayer, blackPlayer, timeControl, boardId?) → { hash, gameData }
let _ioRef = null;          // socket.io instance
let _abortGameFn = null;    // (gameHash) → void — cleans up lobby.activeGames + releases bots

function setDependencies(createGameFn, io, abortGameFn) {
    _createGameFn = createGameFn;
    _ioRef = io;
    _abortGameFn = abortGameFn || null;
}

// ─── Load from DB on startup ────────────────────────────────────────────────
async function loadFromDb() {
    try {
        const db = getTournamentsDb();
        // Load non-completed tournaments
        const tRes = await db.runAndReadAll(
            `SELECT * FROM tournaments WHERE status IN ('open', 'active') ORDER BY created_at`
        );
        const tournaments = rowsToObjects(tRes);

        for (const t of tournaments) {
            const pRes = await db.runAndReadAll(
                `SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY score DESC`,
                [t.id]
            );
            const gRes = await db.runAndReadAll(
                `SELECT * FROM tournament_games WHERE tournament_id = ? ORDER BY round, started_at`,
                [t.id]
            );
            activeTournaments.set(t.id, {
                ...t,
                participants: rowsToObjects(pRes),
                games: rowsToObjects(gRes),
            });
        }
        logger.info('Tournament', `Loaded ${activeTournaments.size} active tournament(s) from DB.`);
    } catch (e) {
        logger.error('Tournament', 'Failed to load from DB:', e.message);
    }
}

// ─── Create Tournament ──────────────────────────────────────────────────────
async function createTournament(opts) {
    // Validate
    if (activeTournaments.size >= CONFIG.MAX_CONCURRENT_TOURNAMENTS) {
        throw new Error(`Server limit reached: max ${CONFIG.MAX_CONCURRENT_TOURNAMENTS} tournaments.`);
    }

    const format = opts.format;
    if (!FORMAT_LIMITS[format]) throw new Error(`Invalid format: ${format}`);

    const limits = FORMAT_LIMITS[format];
    const maxP = Math.max(limits.min, Math.min(limits.max, opts.maxParticipants || limits.min));

    if (opts.timeControlMinutes > 15) throw new Error('Max time control is 15 minutes.');
    if (opts.timeControlIncrement > 30) throw new Error('Max increment is 30 seconds.');

    // Check creator doesn't already have an active tournament
    const existingT = await getUserActiveTournament(opts.creatorId);
    if (existingT) throw new Error('You already have an active tournament.');

    // Check bot limit
    const invitedBots = Math.min(10, Math.max(0, opts.invitedBots || 0));
    const currentBotCount = countBotsInTournaments();
    if (currentBotCount + invitedBots > CONFIG.MAX_BOTS_IN_TOURNAMENTS) {
        throw new Error(`Bot limit exceeded. Currently ${currentBotCount} bots in tournaments, max ${CONFIG.MAX_BOTS_IN_TOURNAMENTS}.`);
    }

    const now = Date.now();
    const id = uuidv4().slice(0, 12);
    const passwordHash = opts.password ? await bcrypt.hash(opts.password, 10) : null;

    // Duration: rounds for swiss/rr/ko, minutes for arena
    const durationValue = opts.durationValue || (format === 'arena' ? 30 : (format === 'knockout' ? knockoutTotalRounds(maxP) : Math.min(maxP - 1, 10)));

    // Launch mode
    let launchAt = null;
    if (opts.launchMode === 'at_time' || opts.launchMode === 'both') {
        launchAt = opts.launchAt || (now + 2 * 60 * 60 * 1000);
        // Cap at 2 hours from now
        if (launchAt > now + 2 * 60 * 60 * 1000) launchAt = now + 2 * 60 * 60 * 1000;
    }

    const tournament = {
        id,
        creator_id: opts.creatorId,
        status: 'open',
        format,
        password_hash: passwordHash,
        has_password: passwordHash ? 1 : 0,
        max_participants: maxP,
        current_count: 0,
        time_control_minutes: opts.timeControlMinutes || 10,
        time_control_increment: opts.timeControlIncrement || 5,
        board_id: opts.boardId || null,
        rating_min: opts.ratingMin || 0,
        rating_max: opts.ratingMax || 5000,
        duration_value: durationValue,
        invited_bots: invitedBots,
        creator_plays: opts.creatorPlays !== false ? 1 : 0,
        launch_mode: opts.launchMode || 'when_complete',
        launch_at: launchAt,
        created_at: now,
        started_at: null,
        completed_at: null,
        remove_at: now + CONFIG.MAX_AGE_HOURS * 60 * 60 * 1000,
        current_round: 0,
        participants: [],
        games: [],
    };

    // Persist to DB
    const db = getTournamentsDb();
    await db.run(`
        INSERT INTO tournaments (id, creator_id, status, format, password_hash, has_password,
            max_participants, current_count, time_control_minutes, time_control_increment,
            board_id, rating_min, rating_max, duration_value, invited_bots, creator_plays,
            launch_mode, launch_at, created_at, started_at, completed_at, remove_at, current_round)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        tournament.id, tournament.creator_id, tournament.status, tournament.format,
        tournament.password_hash, tournament.has_password,
        tournament.max_participants, tournament.current_count,
        tournament.time_control_minutes, tournament.time_control_increment,
        tournament.board_id, tournament.rating_min, tournament.rating_max,
        tournament.duration_value, tournament.invited_bots, tournament.creator_plays,
        tournament.launch_mode, tournament.launch_at,
        tournament.created_at, tournament.started_at, tournament.completed_at,
        tournament.remove_at, tournament.current_round,
    ]);

    activeTournaments.set(id, tournament);

    // Auto-join creator if they want to participate
    if (tournament.creator_plays) {
        await joinTournament(id, opts.creatorId, opts.creatorUsername, null, true);
    }

    return tournament;
}


// ─── Join Tournament ────────────────────────────────────────────────────────
async function joinTournament(tournamentId, userId, username, password, skipPasswordCheck = false) {
    const t = activeTournaments.get(tournamentId);
    if (!t) throw new Error('Tournament not found.');
    if (t.status !== 'open') throw new Error('Tournament is no longer open.');
    if (t.current_count >= t.max_participants) throw new Error('Tournament is full.');

    // Password check
    if (t.has_password && !skipPasswordCheck) {
        if (!password) throw new Error('Password required.');
        const valid = await bcrypt.compare(password, t.password_hash);
        if (!valid) throw new Error('Incorrect password.');
    }

    // Already joined?
    if (t.participants.find(p => p.user_id === userId)) {
        throw new Error('Already joined this tournament.');
    }

    // One active tournament per user
    const existingT = await getUserActiveTournament(userId);
    if (existingT && existingT !== tournamentId) {
        throw new Error('You are already in another tournament.');
    }

    // Rating check
    try {
        const usersDb = getUsersDb();
        const rRes = await usersDb.runAndReadAll(`SELECT rating FROM users WHERE id = ?`, [userId]);
        const rows = rRes.getRows();
        if (rows && rows.length > 0) {
            const rating = Math.round(Number(rows[0][0]) || 1500);
            if (rating < t.rating_min || rating > t.rating_max) {
                throw new Error(`Your rating (${rating}) is outside the allowed range (${t.rating_min}–${t.rating_max}).`);
            }
        }
    } catch (e) {
        if (e.message.includes('rating')) throw e;
        // Ignore DB errors for rating check
    }

    const participant = {
        tournament_id: tournamentId,
        user_id: userId,
        username: username || userId,
        is_bot: userId.startsWith('bot_') ? 1 : 0,
        score: 0, wins: 0, draws: 0, losses: 0, tiebreak: 0,
        joined_at: Date.now(),
    };

    t.participants.push(participant);
    t.current_count = t.participants.length;

    // Persist
    const db = getTournamentsDb();
    await db.run(`
        INSERT INTO tournament_participants (tournament_id, user_id, username, is_bot, score, wins, draws, losses, tiebreak, joined_at)
        VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, ?)
    `, [tournamentId, userId, participant.username, participant.is_bot, participant.joined_at]);
    await db.run(`UPDATE tournaments SET current_count = ? WHERE id = ?`, [t.current_count, tournamentId]);

    // Increment nb_tournaments_entered
    try {
        const usersDb = getUsersDb();
        await usersDb.run(`UPDATE users SET nb_tournaments_entered = nb_tournaments_entered + 1 WHERE id = ?`, [userId]);
    } catch (_) {}

    // Check if tournament should start
    await tryStartTournament(tournamentId);

    return participant;
}


// ─── Leave Tournament ───────────────────────────────────────────────────────
async function leaveTournament(tournamentId, userId) {
    const t = activeTournaments.get(tournamentId);
    if (!t) throw new Error('Tournament not found.');

    const idx = t.participants.findIndex(p => p.user_id === userId);
    if (idx === -1) throw new Error('Not in this tournament.');

    if (t.status === 'active') {
        // Mark as withdrawn but keep in standings (they forfeit remaining games)
        // Don't actually remove them so standings history is preserved
    }

    if (t.status === 'open') {
        t.participants.splice(idx, 1);
        t.current_count = t.participants.length;

        const db = getTournamentsDb();
        await db.run(`DELETE FROM tournament_participants WHERE tournament_id = ? AND user_id = ?`, [tournamentId, userId]);
        await db.run(`UPDATE tournaments SET current_count = ? WHERE id = ?`, [t.current_count, tournamentId]);
    }

    // If creator leaves an open tournament, cancel it
    if (t.creator_id === userId && t.status === 'open') {
        await cancelTournament(tournamentId);
    }

    return true;
}


// ─── Try Start Tournament ───────────────────────────────────────────────────
async function tryStartTournament(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'open') return false;

    const limits = FORMAT_LIMITS[t.format];
    const now = Date.now();

    let shouldStart = false;

    // "when_complete": start when max participants reached
    if (t.launch_mode === 'when_complete' && t.current_count >= t.max_participants) {
        shouldStart = true;
    }
    // "at_time": start when time reached AND min participants met
    if (t.launch_mode === 'at_time' && t.launch_at && now >= t.launch_at && t.current_count >= limits.min) {
        shouldStart = true;
    }
    // "both": either condition
    if (t.launch_mode === 'both') {
        if (t.current_count >= t.max_participants) shouldStart = true;
        if (t.launch_at && now >= t.launch_at && t.current_count >= limits.min) shouldStart = true;
    }

    if (!shouldStart) return false;

    return await startTournament(tournamentId);
}


// ─── Start Tournament ───────────────────────────────────────────────────────
async function startTournament(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'open') return false;

    t.status = 'active';
    t.started_at = Date.now();
    t.current_round = 1;

    const db = getTournamentsDb();
    await db.run(`UPDATE tournaments SET status = 'active', started_at = ?, current_round = 1 WHERE id = ?`,
        [t.started_at, tournamentId]);

    logger.info('Tournament', `${tournamentId} (${t.format}) STARTED with ${t.current_count} player(s).`);

    if (t.format === 'arena') {
        await startArenaRound(tournamentId);
    } else {
        await startNextRound(tournamentId);
    }

    broadcastTournamentUpdate(tournamentId);
    return true;
}


// ─── Start Next Round (Swiss / RR / Knockout) ───────────────────────────────
async function startNextRound(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'active') return;

    let pairingsResult;
    const activeParticipants = t.participants.filter(p => !p.eliminated);

    if (t.format === 'swiss') {
        pairingsResult = swissPairings(activeParticipants, t.current_round, t.games);
    } else if (t.format === 'round_robin') {
        pairingsResult = roundRobinPairings(activeParticipants, t.current_round, t.games);
    } else if (t.format === 'knockout') {
        const koResult = knockoutPairings(activeParticipants, t.current_round, t.games);
        pairingsResult = koResult.pairings;

        // Award byes
        if (koResult.byes) {
            for (const byeId of koResult.byes) {
                const p = t.participants.find(pp => pp.user_id === byeId);
                if (p) {
                    p.score += CONFIG.WIN_POINTS;
                    p.wins += 1;
                }
            }
        }
    }

    if (!pairingsResult || pairingsResult.length === 0) {
        logger.warn('Tournament', `${tournamentId} round ${t.current_round}: no pairings generated.`);
        await completeTournament(tournamentId);
        return;
    }

    // Create games for each pairing
    const tc = { minutes: t.time_control_minutes, increment: t.time_control_increment };

    for (const pairing of pairingsResult) {
        await createTournamentGame(t, pairing.whiteId, pairing.blackId, tc);
    }

    broadcastTournamentUpdate(tournamentId);
}


// ─── Arena-specific round logic ─────────────────────────────────────────────
async function startArenaRound(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'active') return;

    // Set arena end time
    t.arenaEndAt = t.started_at + t.duration_value * 60 * 1000;

    // Pair all idle players now
    await pairIdleArenaPlayers(tournamentId);
}

async function pairIdleArenaPlayers(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'active' || t.format !== 'arena') return;

    const now = Date.now();
    if (t.arenaEndAt && now >= t.arenaEndAt) {
        // Arena time expired — complete once all running games finish
        const pendingGames = t.games.filter(g => !g.result);
        if (pendingGames.length === 0) {
            await completeTournament(tournamentId);
        }
        return;
    }

    // Find idle players (not in an active game, and have rested 5s since last game)
    const busyIds = new Set();
    for (const g of t.games) {
        if (!g.result) {
            busyIds.add(g.white_id);
            busyIds.add(g.black_id);
        }
    }
    const idlePlayers = t.participants.filter(p => {
        if (busyIds.has(p.user_id)) return false;
        // 5s respite
        const lastGame = [...t.games].reverse().find(
            g => g.result && (g.white_id === p.user_id || g.black_id === p.user_id)
        );
        if (lastGame && lastGame.completed_at && (now - lastGame.completed_at) < 5000) return false;
        return true;
    });

    if (idlePlayers.length >= 2) {
        const pairings = arenaPairings(idlePlayers, t.games);
        const tc = { minutes: t.time_control_minutes, increment: t.time_control_increment };
        for (const pairing of pairings) {
            await createTournamentGame(t, pairing.whiteId, pairing.blackId, tc);
        }
        broadcastTournamentUpdate(tournamentId);
    }
}


// ─── Create a Tournament Game ───────────────────────────────────────────────
async function createTournamentGame(tournament, whiteId, blackId, timeControl) {
    if (!_createGameFn) {
        logger.error('Tournament', 'createGameFn not set!');
        return;
    }

    const whitePart = tournament.participants.find(p => p.user_id === whiteId);
    const blackPart = tournament.participants.find(p => p.user_id === blackId);

    const whitePlayer = {
        socketId: null, // Will be resolved by index.js
        userId: whiteId,
        username: whitePart?.username || whiteId,
        role: whiteId.startsWith('bot_') ? 'bot' : 'registered',
    };
    const blackPlayer = {
        socketId: null,
        userId: blackId,
        username: blackPart?.username || blackId,
        role: blackId.startsWith('bot_') ? 'bot' : 'registered',
    };

    try {
        const { hash, gameData } = await _createGameFn(whitePlayer, blackPlayer, timeControl, tournament.board_id);
        gameData.tournamentId = tournament.id;

        const gameEntry = {
            id: uuidv4().slice(0, 12),
            tournament_id: tournament.id,
            round: tournament.current_round,
            white_id: whiteId,
            black_id: blackId,
            game_hash: hash,
            result: null,
            white_score: 0,
            black_score: 0,
            started_at: Date.now(),
            completed_at: null,
        };

        tournament.games.push(gameEntry);

        // Persist
        const db = getTournamentsDb();
        await db.run(`
            INSERT INTO tournament_games (id, tournament_id, round, white_id, black_id, game_hash, result, white_score, black_score, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `, [
            gameEntry.id, gameEntry.tournament_id, gameEntry.round,
            gameEntry.white_id, gameEntry.black_id, gameEntry.game_hash,
            null, gameEntry.started_at, null,
        ]);

        // Notify players
        if (_ioRef) {
            _ioRef.to(`tournament:${tournament.id}`).emit('tournament_game_start', {
                tournamentId: tournament.id,
                gameHash: hash,
                round: tournament.current_round,
                whiteId, blackId,
            });
        }

        logger.info('Tournament', `Game ${hash} created: ${whiteId} vs ${blackId} (round ${tournament.current_round})`);
        return { hash, gameData, gameEntry };
    } catch (e) {
        logger.error('Tournament', 'Failed to create game:', e.message);
    }
}


// ─── On Game Complete (called from index.js) ────────────────────────────────
async function onGameComplete(gameHash, winnerSide) {
    // Find which tournament game this belongs to
    for (const [tid, t] of activeTournaments) {
        const game = t.games.find(g => g.game_hash === gameHash && !g.result);
        if (!game) continue;

        // Determine result
        game.result = winnerSide || 'draw'; // 'white' | 'black' | 'draw'
        game.completed_at = Date.now();

        // Award points
        const whitePart = t.participants.find(p => p.user_id === game.white_id);
        const blackPart = t.participants.find(p => p.user_id === game.black_id);

        if (game.result === 'white') {
            game.white_score = CONFIG.WIN_POINTS;
            game.black_score = CONFIG.LOSS_POINTS;
            if (whitePart) { whitePart.score += CONFIG.WIN_POINTS; whitePart.wins += 1; }
            if (blackPart) { blackPart.score += CONFIG.LOSS_POINTS; blackPart.losses += 1; }
        } else if (game.result === 'black') {
            game.white_score = CONFIG.LOSS_POINTS;
            game.black_score = CONFIG.WIN_POINTS;
            if (whitePart) { whitePart.score += CONFIG.LOSS_POINTS; whitePart.losses += 1; }
            if (blackPart) { blackPart.score += CONFIG.WIN_POINTS; blackPart.wins += 1; }
        } else {
            game.white_score = CONFIG.DRAW_POINTS;
            game.black_score = CONFIG.DRAW_POINTS;
            if (whitePart) { whitePart.score += CONFIG.DRAW_POINTS; whitePart.draws += 1; }
            if (blackPart) { blackPart.score += CONFIG.DRAW_POINTS; blackPart.draws += 1; }
        }

        // Persist scores
        const db = getTournamentsDb();
        await db.run(`UPDATE tournament_games SET result = ?, white_score = ?, black_score = ?, completed_at = ? WHERE id = ?`,
            [game.result, game.white_score, game.black_score, game.completed_at, game.id]);
        // Update participant scores
        if (whitePart) {
            await db.run(`UPDATE tournament_participants SET score = ?, wins = ?, draws = ?, losses = ? WHERE tournament_id = ? AND user_id = ?`,
                [whitePart.score, whitePart.wins, whitePart.draws, whitePart.losses, tid, whitePart.user_id]);
        }
        if (blackPart) {
            await db.run(`UPDATE tournament_participants SET score = ?, wins = ?, draws = ?, losses = ? WHERE tournament_id = ? AND user_id = ?`,
                [blackPart.score, blackPart.wins, blackPart.draws, blackPart.losses, tid, blackPart.user_id]);
        }

        // Knockout: eliminate losers
        if (t.format === 'knockout') {
            const loserId = game.result === 'white' ? game.black_id : (game.result === 'black' ? game.white_id : null);
            if (loserId) {
                const loser = t.participants.find(p => p.user_id === loserId);
                if (loser) loser.eliminated = true;
            }
        }

        logger.info('Tournament', `Game ${gameHash} in ${tid} completed: result=${game.result}`);

        // Check round completion
        if (t.format === 'arena') {
            // Arena: try to re-pair immediately
            setTimeout(() => pairIdleArenaPlayers(tid), 5500); // 5s respite
        } else {
            const roundGames = t.games.filter(g => g.round === t.current_round);
            const allDone = roundGames.every(g => g.result);
            if (allDone) {
                await advanceRound(tid);
            }
        }

        broadcastTournamentUpdate(tid);
        return tid;
    }
    return null;
}


// ─── Advance Round ──────────────────────────────────────────────────────────
async function advanceRound(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'active') return;

    const maxRounds = getMaxRounds(t);
    if (t.current_round >= maxRounds) {
        await completeTournament(tournamentId);
        return;
    }

    t.current_round += 1;
    const db = getTournamentsDb();
    await db.run(`UPDATE tournaments SET current_round = ? WHERE id = ?`, [t.current_round, tournamentId]);

    logger.info('Tournament', `${tournamentId} advancing to round ${t.current_round}/${maxRounds}`);
    await startNextRound(tournamentId);
}

function getMaxRounds(t) {
    if (t.format === 'knockout') return knockoutTotalRounds(t.current_count);
    return t.duration_value;
}


// ─── Complete Tournament ────────────────────────────────────────────────────
async function completeTournament(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t) return;

    t.status       = 'completed';
    t.completed_at = Date.now();
    t.remove_at    = t.completed_at + 5 * 60 * 60 * 1000; // remove 5 hours after completion

    const db = getTournamentsDb();
    await db.run(
        `UPDATE tournaments SET status = 'completed', completed_at = ?, remove_at = ? WHERE id = ?`,
        [t.completed_at, t.remove_at, tournamentId]
    );

    // Increment nb_tournaments_finished for all participants
    try {
        const usersDb = getUsersDb();
        for (const p of t.participants) {
            await usersDb.run(`UPDATE users SET nb_tournaments_finished = nb_tournaments_finished + 1 WHERE id = ?`, [p.user_id]);
        }
    } catch (_) {}

    const standings = computeStandings(t.participants, t.games, t.format);
    logger.info('Tournament', `${tournamentId} COMPLETED. Winner: ${standings[0]?.username || 'N/A'}`);

    broadcastTournamentUpdate(tournamentId);

    // Clean up from active map after a delay (keep visible for 30min)
    setTimeout(() => {
        activeTournaments.delete(tournamentId);
    }, 30 * 60 * 1000);
}


// ─── Cancel Tournament ──────────────────────────────────────────────────────
async function cancelTournament(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t) return;

    t.status = 'cancelled';
    const db = getTournamentsDb();
    await db.run(`UPDATE tournaments SET status = 'cancelled' WHERE id = ?`, [tournamentId]);
    activeTournaments.delete(tournamentId);

    logger.info('Tournament', `${tournamentId} CANCELLED.`);
    if (_ioRef) {
        _ioRef.to(`tournament:${tournamentId}`).emit('tournament_update', { id: tournamentId, status: 'cancelled' });
    }
}


// ─── Arena expiry: abort all still-running games, then complete ──────────────

/**
 * Called when an arena tournament's time is up.
 * Any game that still has no result is aborted immediately:
 *   - result is set to 'aborted' in DB (not null, so it won't be re-paired)
 *   - NO saveMatchResult call → no game history record, no Glicko-2 change
 *   - A `game_aborted` event is sent to each game's socket room
 *   - `_abortGameFn` (injected by index.js) frees bots and removes from lobby
 * After aborting, completeTournament is called.
 */
async function abortArenaExpiredGames(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || t.status !== 'active' || t.format !== 'arena') return;
    // Guard: already being processed
    if (t._arenaAborted) return;
    t._arenaAborted = true;

    const now = Date.now();
    const db = getTournamentsDb();
    const pendingGames = t.games.filter(g => !g.result);

    if (pendingGames.length > 0) {
        logger.info('Tournament', `Arena ${tournamentId} expired — aborting ${pendingGames.length} in-progress game(s).`);
    }

    for (const game of pendingGames) {
        game.result    = 'aborted';
        game.completed_at = now;

        // Persist 'aborted' result so pairIdleArenaPlayers won't re-pair these players
        await db.run(
            `UPDATE tournament_games SET result = 'aborted', completed_at = ? WHERE id = ?`,
            [now, game.id]
        );

        // Notify the game room (GameBoard.jsx listens for this)
        if (_ioRef) {
            _ioRef.to(game.game_hash).emit('game_aborted', {
                tournamentId,
                gameHash: game.game_hash,
                reason: 'tournament_expired',
            });
        }

        // Also notify the tournament room (TournamentRoom.jsx listens for this
        // to bring back users who are on the game page)
        if (_ioRef) {
            _ioRef.to(`tournament:${tournamentId}`).emit('tournament_game_aborted', {
                tournamentId,
                gameHash: game.game_hash,
            });
        }

        // Release bots / remove from lobby.activeGames (no-op for human games)
        if (_abortGameFn) {
            try { _abortGameFn(game.game_hash); } catch (_) {}
        }
    }

    // Now complete the tournament (computes standings, broadcasts final update)
    await completeTournament(tournamentId);
}

/**
 * Scans all active arena tournaments and aborts any that have passed arenaEndAt.
 * Called from index.js every 5 seconds.
 */
async function checkArenaExpiry() {
    const now = Date.now();
    for (const [tid, t] of activeTournaments) {
        if (t.format !== 'arena' || t.status !== 'active') continue;
        if (t.arenaEndAt && now >= t.arenaEndAt) {
            // Fire-and-forget; errors are logged inside
            abortArenaExpiredGames(tid).catch(e =>
                logger.error('Tournament', `checkArenaExpiry error for ${tid}:`, e.message)
            );
        }
    }
}


// ─── Cleanup Expired ────────────────────────────────────────────────────────
async function cleanupExpired() {
    const now = Date.now();
    for (const [tid, t] of activeTournaments) {
        // Remove if past remove_at
        if (t.remove_at && now > t.remove_at) {
            logger.info('Tournament', `${tid} expired (past remove_at). Cancelling.`);
            await cancelTournament(tid);
            continue;
        }
        // Open tournaments: expire after OPEN_EXPIRY_HOURS without enough players
        if (t.status === 'open') {
            const openAge = now - t.created_at;
            const maxOpen = CONFIG.OPEN_EXPIRY_HOURS * 60 * 60 * 1000;
            if (openAge > maxOpen) {
                logger.warn('Tournament', `${tid} open too long (${Math.round(openAge / 60000)}min). Cancelling.`);
                await cancelTournament(tid);
                continue;
            }
            // Also check if scheduled launch time has passed
            await tryStartTournament(tid);
        }
    }
}


// ─── Helpers ────────────────────────────────────────────────────────────────

function broadcastTournamentUpdate(tournamentId) {
    const t = activeTournaments.get(tournamentId);
    if (!t || !_ioRef) return;

    const standings = computeStandings(t.participants, t.games, t.format);
    let bracket = null;
    if (t.format === 'knockout') {
        bracket = computeKnockoutBracket(t.participants, t.games, knockoutTotalRounds(t.current_count));
    }

    _ioRef.to(`tournament:${tournamentId}`).emit('tournament_update', {
        id: t.id,
        status: t.status,
        format: t.format,
        currentRound: t.current_round,
        maxRounds: getMaxRounds(t),
        currentCount: t.current_count,
        maxParticipants: t.max_participants,
        timeControl: { minutes: t.time_control_minutes, increment: t.time_control_increment },
        standings,
        bracket,
        games: t.games.map(g => ({
            id: g.id,
            round: g.round,
            white_id: g.white_id,
            black_id: g.black_id,
            game_hash: g.game_hash,
            result: g.result,
            white_score: g.white_score,
            black_score: g.black_score,
        })),
        arenaEndAt: t.arenaEndAt || null,
    });
}

async function getUserActiveTournament(userId) {
    for (const [tid, t] of activeTournaments) {
        if (t.status !== 'open' && t.status !== 'active') continue;
        if (t.participants.find(p => p.user_id === userId)) return tid;
    }
    return null;
}

function countBotsInTournaments() {
    let count = 0;
    for (const [, t] of activeTournaments) {
        if (t.status !== 'open' && t.status !== 'active') continue;
        count += t.participants.filter(p => p.is_bot).length;
    }
    return count;
}

function getOpenTournaments() {
    const result = [];
    for (const [, t] of activeTournaments) {
        if (t.status === 'open') {
            result.push({
                id: t.id,
                format: t.format,
                hasPassword: t.has_password === 1,
                currentCount: t.current_count,
                maxParticipants: t.max_participants,
                timeControl: { minutes: t.time_control_minutes, increment: t.time_control_increment },
                ratingMin: t.rating_min,
                ratingMax: t.rating_max,
                creatorId: t.creator_id,
                createdAt: t.created_at,
                launchMode: t.launch_mode,
                launchAt: t.launch_at,
                boardId: t.board_id,
                durationValue: t.duration_value,
                invitedBots: t.invited_bots,
            });
        }
    }
    return result;
}

function getActiveTournamentsList() {
    const result = [];
    for (const [, t] of activeTournaments) {
        if (t.status === 'active' || t.status === 'completed') {
            result.push({
                id: t.id,
                format: t.format,
                status: t.status,
                currentRound: t.current_round,
                maxRounds: getMaxRounds(t),
                currentCount: t.current_count,
                maxParticipants: t.max_participants,
                timeControl: { minutes: t.time_control_minutes, increment: t.time_control_increment },
                arenaEndAt: t.arenaEndAt || null,
            });
        }
    }
    return result;
}

function getTournamentById(id) {
    return activeTournaments.get(id) || null;
}

// ─── Row → Object helpers ───────────────────────────────────────────────────
function rowsToObjects(result) {
    try {
        const rows = result.getRows();
        const columns = result.columnNames();
        return rows.map(row => {
            const obj = {};
            columns.forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        });
    } catch (e) {
        return [];
    }
}


module.exports = {
    initConfig,
    loadFromDb,
    setDependencies,
    createTournament,
    joinTournament,
    leaveTournament,
    onGameComplete,
    cleanupExpired,
    checkArenaExpiry,
    getOpenTournaments,
    getActiveTournamentsList,
    getTournamentById,
    getUserActiveTournament,
    pairIdleArenaPlayers,
    FORMAT_LIMITS,
};
