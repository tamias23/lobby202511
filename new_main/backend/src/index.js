require('./utils/configLoader');
const logger = require('./utils/logger');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { initDb, getUsersDb, getGamesDb, getTournamentsDb } = require('./db');
const { restoreFromGcs, startGcsSync } = require('./gcsSync');
const tournamentManager = require('./tournament/tournamentManager');
const { generateGuestId } = require('./utils/auth');
const fs = require('fs');
const path = require('path');
const { sendVerificationEmail } = require('./utils/email');
let getLegalMovesNapi, applyMoveNapi, initGameStateNapi, randomizeSetupNapi, endTurnSetupNapi, passTurnPlayingNapi, endHeroeBonusNapi, selectColorNapi, replayToStepNapi;

try {
    const napi = require('../rust-napi');
    getLegalMovesNapi = napi.getLegalMovesNapi;
    applyMoveNapi = napi.applyMoveNapi;
    initGameStateNapi = napi.initGameStateNapi;
    randomizeSetupNapi = napi.randomizeSetupNapi;
    endTurnSetupNapi = napi.endTurnSetupNapi;
    passTurnPlayingNapi = napi.passTurnPlayingNapi;
    endHeroeBonusNapi = napi.endHeroeBonusNapi;
    selectColorNapi = napi.selectColorNapi;
    replayToStepNapi = napi.replayToStepNapi;
} catch (err) {
    console.error("CRITICAL: Failed to load Rust NAPI module from '../rust-napi'");
    console.error("Current __dirname:", __dirname);
    try {
        const parentDir = path.join(__dirname, '..');
        console.error("Parent directory contents:", fs.readdirSync(parentDir));
        const napiDir = path.join(parentDir, 'rust-napi');
        if (fs.existsSync(napiDir)) {
            console.error("rust-napi directory contents:", fs.readdirSync(napiDir));
        } else {
            console.error("rust-napi directory does NOT exist at:", napiDir);
        }
    } catch (e) {
        console.error("Failed to read directory info:", e.message);
    }
    throw err;
}

const { saveMatchResult: _saveMatchResult } = require('./utils/gameStorage');

// Wrapper: after saving a match result, also notify the tournament system (if applicable)
const saveMatchResult = async (gameId, timestamp, whiteName, blackName, whitePlayerId, blackPlayerId, boardId, winner, moves, io) => {
    await _saveMatchResult(gameId, timestamp, whiteName, blackName, whitePlayerId, blackPlayerId, boardId, winner, moves, io);
    // Hook: if this game belongs to a tournament, update it
    if (TOURNAMENTS_ENABLED) {
        try {
            await tournamentManager.onGameComplete(gameId, winner);
        } catch (e) {
            logger.error('Tournament', 'onGameComplete error:', e.message);
        }
    }
};

// Helper to fetch a player's rating from the database
async function fetchUserRating(userId) {
    if (!userId || (userId.startsWith('guest_') && !userId.startsWith('bot_'))) return null;
    // Allow bots to have ratings fetched
    try {
        const usersDb = getUsersDb();
        const res = await usersDb.runAndReadAll(
            `SELECT rating FROM users WHERE id = ?`, [userId]
        );
        const rows = res.getRows();
        if (!rows || rows.length === 0) return null;
        return Math.round(Number(rows[0][0]) || 1500);
    } catch (_) {
        return null;
    }
}

// --- BOT SERVER INTEGRATION ---
const BOT_SERVER_URL       = process.env.BOT_SERVER_URL || 'http://localhost:5001';
const BOT_POLL_INTERVAL_MS = parseInt(process.env.BOT_POLL_INTERVAL_MS) || 60000;
const BOT_MOVE_DELAY_MS    = parseInt(process.env.BOT_MOVE_DELAY_MS) || 600;
const MCTS_DEFAULT_BUDGET  = parseInt(process.env.MCTS_DEFAULT_BUDGET_MS) || 500;

// Background Bot Matches
const BOT_MATCH_INTERVAL_MS = parseInt(process.env.BOT_MATCH_INTERVAL_MS) || 90000;
const BOT_MATCH_PROBABILITY = parseFloat(process.env.BOT_MATCH_PROBABILITY) || 0.5;

// JWT config
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';
const JWT_EXPIRY_DAYS = parseInt(process.env.JWT_EXPIRY_DAYS) || 7;

/**
 * Deep-sanitize an object so it's safe to emit over socket.io.
 * DuckDB returns BigInt for integer columns; JSON.stringify chokes on them.
 * This converts BigInt → Number everywhere in the payload.
 */
function sanitizeBigInt(val) {
    if (typeof val === 'bigint') return Number(val);
    if (Array.isArray(val)) return val.map(sanitizeBigInt);
    if (val !== null && typeof val === 'object') {
        const out = {};
        for (const k of Object.keys(val)) out[k] = sanitizeBigInt(val[k]);
        return out;
    }
    return val;
}

// Tournament config
const TOURNAMENTS_ENABLED = process.env.TOURNAMENTS_ENABLED !== 'false';

/**
 * Build a short, friendly bot display name from its model filename.
 * e.g. agent_type='quick_diego', model_name='jixxBwEv95' → '🤖 jixx'
 */
function makeBotDisplayName(agentType, modelName) {
    const shortId = (modelName || agentType || 'bot').slice(0, 4);
    return `🤖 ${shortId}`;
}

// Available bot models (fetched from bot server) and busy tracking
let availableBots = [];  // [{agent_type, model_name, display_name}]
const busyBots = new Map(); // key: "agent_type:model_name" → gameId
const registeredBotsCache = new Set(); // set of "agent_type:model_name" strings already registered/checked
const botRatingsCache = new Map();  // botId → { rating, ratingDeviation }

async function fetchAvailableBots() {
    const prevCount = availableBots.length;
    try {
        const resp = await fetch(`${BOT_SERVER_URL}/models`, { signal: AbortSignal.timeout(3000) });
        if (resp.ok) {
            const data = await resp.json();
            const models = data.models || [];
            
            // Check for TRULY new bots we haven't seen in this session
            const newBots = models.filter(b => !registeredBotsCache.has(getBotKey(b.agent_type, b.model_name)));
            
            availableBots = models;

            if (newBots.length > 0) {
                logger.info('Bot', `${newBots.length} new bot model(s) noticed: ${newBots.map(b => b.model_name).join(', ')}`);
                ensureBotsRegistered(newBots).catch(err => logger.error('Bot', 'New bot registration failed:', err));
            }
        } else {
            availableBots = [];
        }
    } catch (e) {
        availableBots = [];
    }
    // Broadcast only when availability changes (server comes up, goes down, or model count changes)
    if (availableBots.length !== prevCount) {
        logger.info('Bot', `Bot availability changed: ${prevCount} → ${availableBots.length} model(s)`);
        if (typeof io !== 'undefined') broadcastLobbyUpdate(io);
    }
    // Always refresh ratings from DB
    refreshBotRatings().catch(() => {});
}

/** Fetch current ratings for all known bots from the DB into botRatingsCache */
async function refreshBotRatings() {
    if (availableBots.length === 0) return;
    try {
        const usersDb = getUsersDb();
        const con = await usersDb.connect();
        for (const bot of availableBots) {
            const botId = `bot_${bot.agent_type}_${bot.model_name}`;
            const r = await con.runAndReadAll(
                `SELECT rating, rating_deviation FROM users WHERE id = ?`, [botId]
            );
            const rows = r.getRows();
            if (rows.length > 0) {
                botRatingsCache.set(botId, {
                    rating: Math.round(Number(rows[0][0]) || 1500),
                    ratingDeviation: Math.round(Number(rows[0][1]) || 350),
                });
            }
        }
    } catch (e) {
        // Non-fatal
    }
}

async function ensureBotsRegistered(bots) {
    if (!bots || bots.length === 0) return;
    try {
        const usersDb = getUsersDb();
        const con = await usersDb.connect();
        for (const bot of bots) {
            const botKey = getBotKey(bot.agent_type, bot.model_name);
            const botId = `bot_${bot.agent_type}_${bot.model_name}`;
            const botName = makeBotDisplayName(bot.agent_type, bot.model_name);
            
            const existing = await con.runAndReadAll(`SELECT id FROM users WHERE id = ?`, [botId]);
            if (existing.getRows().length === 0) {
                logger.info('Bot', `Registering new bot in DB: ${botId}`);
                await con.run(`
                    INSERT INTO users (id, username, email, role, is_verified, rating)
                    VALUES (?, ?, ?, 'bot', 1, 1500)
                `, [botId, botName, `${botId}@internal`]);
                
                try {
                    await con.run(`INSERT INTO profiles (user_id) VALUES (?)`, [botId]);
                } catch (_) { /* profile might already exist if table was partially wiped */ }
            }
            // Mark as checked to avoid re-checking DB in this session
            registeredBotsCache.add(botKey);
        }
    } catch (e) {
        logger.error('Bot', 'Bot registration error:', e.message);
    }
}

/**
 * Periodically attempts to start a match between two random idle bots.
 */
async function startRandomBotMatch() {
    if (Math.random() > BOT_MATCH_PROBABILITY) {
        logger.debug('BotMatch', `Coin flip (prob ${BOT_MATCH_PROBABILITY}) said NO.`);
        return;
    }
    
    // Find idle bots
    const idleBots = availableBots.filter(b => !busyBots.has(getBotKey(b.agent_type, b.model_name)));
    
    if (idleBots.length < 2) {
        logger.debug('BotMatch', `Coin flip YES, but not enough idle bots (${idleBots.length}).`);
        return;
    }
    
    // Pick 2 random bots
    const shuffled = [...idleBots].sort(() => 0.5 - Math.random());
    const bot1 = shuffled[0];
    const bot2 = shuffled[1];
    
    const bot1Key = getBotKey(bot1.agent_type, bot1.model_name);
    const bot2Key = getBotKey(bot2.agent_type, bot2.model_name);
    
    const bot1Id = `bot_${bot1.agent_type}_${bot1.model_name}`;
    const bot1Name = makeBotDisplayName(bot1.agent_type, bot1.model_name);
    
    const bot2Id = `bot_${bot2.agent_type}_${bot2.model_name}`;
    const bot2Name = makeBotDisplayName(bot2.agent_type, bot2.model_name);
    
    logger.info('BotMatch', `Starting match between ${bot1Name} and ${bot2Name}`);
    
    const whiteBot = { socketId: null, userId: bot1Id, username: bot1Name, role: 'bot' };
    const blackBot = { socketId: null, userId: bot2Id, username: bot2Name, role: 'bot' };
    
    // Time control 15+10
    const { hash, gameData } = await createGame(whiteBot, blackBot, { minutes: 15, increment: 10 });
    
    // Configure game for two bots
    gameData.whiteBotConfig = { type: bot1.agent_type, modelName: bot1.model_name };
    gameData.whiteBotKey = bot1Key;
    gameData.whiteDisconnectedAt = null;
    
    gameData.blackBotConfig = { type: bot2.agent_type, modelName: bot2.model_name };
    gameData.blackBotKey = bot2Key;
    gameData.blackDisconnectedAt = null;
    
    gameData.botThinking = false;
    
    // Mark bots as busy
    busyBots.set(bot1Key, hash);
    busyBots.set(bot2Key, hash);
    
    broadcastLobbyUpdate(io);
    
    // Trigger first move (white bot always goes first in setup)
    setImmediate(() => triggerBotMoveIfNeeded(hash));
}

// Bot polling and background matches are started AFTER the DB is ready (see initDb().then below)

function getBotKey(agentType, modelName) {
    return `${agentType}:${modelName}`;
}

function getBotsForLobby() {
    return availableBots.map(b => {
        const botId = `bot_${b.agent_type}_${b.model_name}`;
        const ratingInfo = botRatingsCache.get(botId);
        // Always use our canonical display name (🤖 xxxx)
        const displayName = makeBotDisplayName(b.agent_type, b.model_name);
        return {
            ...b,
            display_name: displayName,
            rating: ratingInfo?.rating ?? 1500,
            ratingDeviation: ratingInfo?.ratingDeviation ?? 350,
            busy: busyBots.has(getBotKey(b.agent_type, b.model_name)),
        };
    });
}

function releaseBotIfNeeded(game) {
    if (!game) return;
    if (game.whiteBotKey) {
        busyBots.delete(game.whiteBotKey);
        logger.info('Bot', `Released white bot ${game.whiteBotKey}`);
    }
    if (game.blackBotKey) {
        busyBots.delete(game.blackBotKey);
        logger.info('Bot', `Released black bot ${game.blackBotKey}`);
    }
    // Backward compatibility for old single-bot games (if any remain in memory)
    if (game.botKey && !game.whiteBotKey && !game.blackBotKey) {
        busyBots.delete(game.botKey);
        logger.info('Bot', `Released legacy bot ${game.botKey}`);
    }
}

/**
 * Sends the current game state to the Bot Server and returns a move.
 * @returns {Promise<{action, piece, target, color}>}
 */
async function requestBotMove(game) {
    const currentTurn = game.turn;
    const config = currentTurn === 'white' ? game.whiteBotConfig : game.blackBotConfig;
    if (!config) throw new Error(`No bot config for turn ${currentTurn}`);

    const payload = {
        agent_type: config.type,
        model_name: config.modelName || null,
        mcts_budget_ms: config.budgetMs || MCTS_DEFAULT_BUDGET,
        game_state: {
            board: game.board,
            pieces: game.pieces,
            turn: game.turn,
            phase: game.phase,
            color_chosen: game.colorChosen || {},
            colors_ever_chosen: game.colorsEverChosen || [],
            is_new_turn: game.isNewTurn !== undefined ? game.isNewTurn : true,
            moves_this_turn: game.movesThisTurn || 0,
            locked_sequence_piece: game.lockedSequencePiece || null,
            heroe_take_counter: game.heroeTakeCounter || 0,
            setup_step: game.setupStep || 0,
            turn_counter: game.turnCounter || 0,
            visited_polygons: game.visitedPolygons || [],
            setup_placements_this_turn: game.setupPlacementsThisTurn || 0,
        }
    };
    
    const resp = await fetch(`${BOT_SERVER_URL}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
        throw new Error(`Bot server returned ${resp.status}: ${await resp.text()}`);
    }
    return resp.json();
}

/**
 * Emit a game_update event, always including the authoritative moves array.
 */
function emitGameUpdate(gameId, game, extra = {}) {
    io.to(gameId).emit('game_update', {
        ...extra,
        moves: game.moves || [],
    });
}

/**
 * If it's the bot's turn in this game, request a bot move and apply it.
 * Called after every game state change.
 */
async function triggerBotMoveIfNeeded(gameId) {
    const game = lobby.activeGames.get(gameId);
    if (!game || game.phase === 'GameOver') return;

    const currentTurn = game.turn;
    const botConfig = currentTurn === 'white' ? game.whiteBotConfig : game.blackBotConfig;

    if (!botConfig) {
        return; // Not a bot's turn
    }
    if (game.botThinking) {
        return; // already processing a move
    }


    game.botThinking = true;
    try {
        // ── Setup phase: call bot server for each piece placement ──
        if (game.phase === 'Setup') {
            // Ask the bot server for one placement at a time
            const botMove = await requestBotMove(game);
            const currentGame = lobby.activeGames.get(gameId);
            if (!currentGame || currentGame.phase === 'GameOver') return;

            if (botMove.action === 'setup_place' && botMove.piece && botMove.target) {
                // Bot placed a piece — apply it (just like the human does)
                const pieceIndex = currentGame.pieces.findIndex(p => p.id === botMove.piece);
                if (pieceIndex !== -1) {
                    currentGame.pieces[pieceIndex] = { ...currentGame.pieces[pieceIndex], position: botMove.target };
                    // Track placements for the NAPI state
                    currentGame.setupPlacementsThisTurn = (currentGame.setupPlacementsThisTurn || 0) + 1;
                    // Mark turn as mid-flight so the next bot call knows it's continuing, not starting a new turn
                    currentGame.isNewTurn = false;
                    // Record the setup move
                    currentGame.moves.push({ turn_number: 0, active_side: currentGame.turn, phase: 'setup', chosen_color: '', piece_id: botMove.piece, target_id: botMove.target, timestamp_ms: Date.now() });

                    // Refresh clock so the game_update contains live time, preventing frontend "flash"
                    updateClocks(currentGame, true);

                    io.to(gameId).emit('game_update', {
                        pieces: currentGame.pieces,
                        turn: currentGame.turn,
                        colorChosen: currentGame.colorChosen,
                        phase: currentGame.phase,
                        setupStep: currentGame.setupStep,
                        turnCounter: currentGame.turnCounter,
                        isNewTurn: currentGame.isNewTurn,
                        movesThisTurn: currentGame.movesThisTurn,
                        lockedSequencePiece: currentGame.lockedSequencePiece || null,
                        heroeTakeCounter: currentGame.heroeTakeCounter,
                        clocks: currentGame.clocks,
                        lastTurnTimestamp: currentGame.lastTurnTimestamp,
                        moves: currentGame.moves || [],
                    });

                }
                // Continue placing pieces (small delay so the human sees each one)
                setTimeout(() => triggerBotMoveIfNeeded(gameId), BOT_MOVE_DELAY_MS);
                return;

            } else if (botMove.action === 'setup_done') {
                // Bot is done placing pieces for this step — end the setup turn
                const oldTurn = currentGame.turn;
                const endResp = endTurnSetupNapi({
                    boardJson: JSON.stringify(currentGame.board),
                    piecesJson: JSON.stringify(currentGame.pieces),
                    turn: currentGame.turn,
                    phase: currentGame.phase,
                    setupStep: currentGame.setupStep,
                    colorChosen: currentGame.colorChosen || {},
                    colorsEverChosen: currentGame.colorsEverChosen || [],
                    turnCounter: currentGame.turnCounter || 0,
                    isNewTurn: currentGame.isNewTurn !== undefined ? currentGame.isNewTurn : true,
                    movesThisTurn: currentGame.movesThisTurn || 0,
                    lockedSequencePiece: currentGame.lockedSequencePiece || undefined,
                    heroeTakeCounter: currentGame.heroeTakeCounter || 0,
                });
                if (oldTurn !== endResp.turn) {
                    updateClocks(currentGame, true);
                }
                currentGame.turn = endResp.turn;
                currentGame.phase = endResp.phase;
                currentGame.setupStep = endResp.setupStep;
                currentGame.turnCounter = endResp.turnCounter;
                currentGame.isNewTurn = endResp.isNewTurn;
                currentGame.movesThisTurn = endResp.movesThisTurn;
                currentGame.lockedSequencePiece = endResp.lockedSequencePiece;
                currentGame.heroeTakeCounter = endResp.heroeTakeCounter;
                currentGame.setupPlacementsThisTurn = 0;

                io.to(gameId).emit('game_update', {
                    pieces: currentGame.pieces,
                    turn: currentGame.turn,
                    colorChosen: currentGame.colorChosen,
                    colorsEverChosen: currentGame.colorsEverChosen,
                    mageUnlocked: currentGame.mageUnlocked,
                    phase: currentGame.phase,
                    setupStep: currentGame.setupStep,
                    turnCounter: currentGame.turnCounter,
                    isNewTurn: currentGame.isNewTurn,
                    movesThisTurn: currentGame.movesThisTurn,
                    lockedSequencePiece: currentGame.lockedSequencePiece || null,
                    heroeTakeCounter: currentGame.heroeTakeCounter,
                    clocks: currentGame.clocks,
                    lastTurnTimestamp: currentGame.lastTurnTimestamp,
                        moves: currentGame.moves || [],
                });


                // If still the bot's turn (more setup steps or just transitioned to Playing)
                // If the next turn is a bot's turn, trigger it
                setImmediate(() => triggerBotMoveIfNeeded(gameId));
                return;
            }
        }

        // ── Playing phase: ask the Bot Server ──
        // Re-fetch game so we always send the latest state, not the one captured at function entry.
        const currentGame = lobby.activeGames.get(gameId);
        if (!currentGame || currentGame.phase === 'GameOver') return;

        const botMove = await requestBotMove(currentGame);

        // Re-fetch again after await in case the game was deleted while waiting
        const freshGame = lobby.activeGames.get(gameId);
        if (!freshGame || freshGame.phase === 'GameOver') return;

        if (botMove.action === 'color') {
            // Bot chose a color
            io.to(gameId).emit('force_bot_action', {
                type: 'color',
                color: botMove.color
            });
            // Apply it server-side too
            const response = selectColorNapi({
                boardJson: JSON.stringify(freshGame.board),
                piecesJson: JSON.stringify(freshGame.pieces),
                color: botMove.color,
                turn: freshGame.turn,
                phase: freshGame.phase,
                setupStep: freshGame.setupStep,
                colorChosen: freshGame.colorChosen || {},
                colorsEverChosen: freshGame.colorsEverChosen || [],
                turnCounter: freshGame.turnCounter || 0,
                isNewTurn: freshGame.isNewTurn,
                movesThisTurn: freshGame.movesThisTurn || 0,
                lockedSequencePiece: freshGame.lockedSequencePiece || undefined,
                heroeTakeCounter: freshGame.heroeTakeCounter || 0,
            });
            freshGame.pieces = JSON.parse(response.piecesJson);
            freshGame.turn = response.turn;
            freshGame.colorChosen = response.colorChosen;
            freshGame.colorsEverChosen = response.colorsEverChosen;
            freshGame.mageUnlocked = response.mageUnlocked;
            freshGame.phase = response.phase;
            freshGame.setupStep = response.setupStep;
            freshGame.turnCounter = response.turnCounter;
            freshGame.isNewTurn = response.isNewTurn;
            freshGame.movesThisTurn = response.movesThisTurn;
            freshGame.lockedSequencePiece = response.lockedSequencePiece;
            freshGame.heroeTakeCounter = response.heroeTakeCounter;
            io.to(gameId).emit('game_update', {
                pieces: freshGame.pieces, turn: freshGame.turn,
                colorChosen: freshGame.colorChosen, colorsEverChosen: freshGame.colorsEverChosen,
                mageUnlocked: freshGame.mageUnlocked, phase: freshGame.phase,
                setupStep: freshGame.setupStep, turnCounter: freshGame.turnCounter,
                isNewTurn: freshGame.isNewTurn, movesThisTurn: freshGame.movesThisTurn,
                lockedSequencePiece: freshGame.lockedSequencePiece || null,
                heroeTakeCounter: freshGame.heroeTakeCounter,
                clocks: freshGame.clocks, lastTurnTimestamp: freshGame.lastTurnTimestamp,
                        moves: freshGame.moves || [],
            });
            // Bot may need to make more moves in same turn
            setTimeout(() => triggerBotMoveIfNeeded(gameId), BOT_MOVE_DELAY_MS);

        } else if (botMove.action === 'move' && botMove.piece && botMove.target) {
            // Bot made a move
            const oldTurn = freshGame.turn;
            const response = applyMoveNapi({
                boardJson: JSON.stringify(freshGame.board),
                piecesJson: JSON.stringify(freshGame.pieces),
                pieceId: botMove.piece,
                targetPoly: botMove.target,
                turn: freshGame.turn,
                phase: freshGame.phase,
                setupStep: freshGame.setupStep,
                colorChosen: freshGame.colorChosen || {},
                colorsEverChosen: freshGame.colorsEverChosen || [],
                turnCounter: freshGame.turnCounter || 0,
                isNewTurn: freshGame.isNewTurn,
                movesThisTurn: freshGame.movesThisTurn || 0,
                lockedSequencePiece: freshGame.lockedSequencePiece || undefined,
                heroeTakeCounter: freshGame.heroeTakeCounter || 0,
            });
            freshGame.pieces = JSON.parse(response.piecesJson);
            freshGame.colorChosen = response.colorChosen;
            freshGame.colorsEverChosen = response.colorsEverChosen;
            freshGame.mageUnlocked = response.mageUnlocked;
            freshGame.phase = response.phase;
            freshGame.setupStep = response.setupStep;
            if (oldTurn !== response.turn) updateClocks(freshGame, true);
            freshGame.turn = response.turn;
            freshGame.turnCounter = response.turnCounter;
            freshGame.isNewTurn = response.isNewTurn;
            freshGame.movesThisTurn = response.movesThisTurn;
            freshGame.lockedSequencePiece = response.lockedSequencePiece;
            freshGame.heroeTakeCounter = response.heroeTakeCounter;
            freshGame.moves.push({ turn_number: freshGame.turnCounter, active_side: oldTurn, phase: 'playing', chosen_color: freshGame.colorChosen?.[oldTurn] || '', piece_id: botMove.piece, target_id: botMove.target, timestamp_ms: Date.now() });

            io.to(gameId).emit('game_update', {
                pieces: freshGame.pieces, turn: freshGame.turn,
                colorChosen: freshGame.colorChosen, colorsEverChosen: freshGame.colorsEverChosen,
                mageUnlocked: freshGame.mageUnlocked, phase: freshGame.phase,
                setupStep: freshGame.setupStep, turnCounter: freshGame.turnCounter,
                isNewTurn: freshGame.isNewTurn, movesThisTurn: freshGame.movesThisTurn,
                lockedSequencePiece: freshGame.lockedSequencePiece || null,
                heroeTakeCounter: freshGame.heroeTakeCounter,
                clocks: freshGame.clocks, lastTurnTimestamp: freshGame.lastTurnTimestamp,
                        moves: freshGame.moves || [],
                lastMove: { pieceId: botMove.piece, targetPoly: botMove.target, captured: response.captured },
            });

            if (response.phase === 'GameOver') {
                const winnerSide = response.winner;
                const winnerId = winnerSide === 'white' ? freshGame.white : freshGame.black;
                freshGame.phase = 'GameOver';
                io.to(gameId).emit('game_over', { 
                    winnerId, 
                    winnerSide: response.winner,
                    reason: response.reason 
                });
                saveMatchResult(gameId, freshGame.gameStartTimestamp, freshGame.whiteName, freshGame.blackName, freshGame.white, freshGame.black, freshGame.boardName, winnerSide, freshGame.moves, io)
                    .catch(err => logger.error('Bot', `Game save error for ${gameId}:`, err));
                releaseBotIfNeeded(freshGame);
                lobby.activeGames.delete(gameId);
                broadcastLobbyUpdate(io);
            } else {
                // Bot might need to continue its turn (chaining)
                setTimeout(() => triggerBotMoveIfNeeded(gameId), BOT_MOVE_DELAY_MS);
            }

        } else if (botMove.action === 'pass') {
            // Bot passes
            const response = passTurnPlayingNapi({
                boardJson: JSON.stringify(freshGame.board),
                piecesJson: JSON.stringify(freshGame.pieces),
                turn: freshGame.turn, phase: freshGame.phase,
                setupStep: freshGame.setupStep,
                colorChosen: freshGame.colorChosen || {},
                colorsEverChosen: freshGame.colorsEverChosen || [],
                turnCounter: freshGame.turnCounter || 0,
                isNewTurn: freshGame.isNewTurn,
                movesThisTurn: freshGame.movesThisTurn || 0,
                lockedSequencePiece: freshGame.lockedSequencePiece || undefined,
                heroeTakeCounter: freshGame.heroeTakeCounter || 0,
                pieceId: '', targetPoly: ''
            });
            updateClocks(freshGame, true);
            freshGame.turn = response.turn;
            freshGame.phase = response.phase;
            freshGame.setupStep = response.setupStep;
            freshGame.turnCounter = response.turnCounter;
            freshGame.isNewTurn = response.isNewTurn;
            freshGame.movesThisTurn = response.movesThisTurn;
            freshGame.lockedSequencePiece = response.lockedSequencePiece;
            freshGame.heroeTakeCounter = response.heroeTakeCounter;
            freshGame.colorChosen = response.colorChosen;
            freshGame.colorsEverChosen = response.colorsEverChosen;
            freshGame.mageUnlocked = response.mageUnlocked;
            io.to(gameId).emit('game_update', {
                pieces: freshGame.pieces, turn: freshGame.turn,
                colorChosen: freshGame.colorChosen, colorsEverChosen: freshGame.colorsEverChosen,
                mageUnlocked: freshGame.mageUnlocked, phase: freshGame.phase,
                setupStep: freshGame.setupStep, turnCounter: freshGame.turnCounter,
                isNewTurn: freshGame.isNewTurn, movesThisTurn: freshGame.movesThisTurn,
                lockedSequencePiece: freshGame.lockedSequencePiece || null,
                heroeTakeCounter: freshGame.heroeTakeCounter,
                clocks: freshGame.clocks, lastTurnTimestamp: freshGame.lastTurnTimestamp,
                        moves: freshGame.moves || [],
            });
            // Bot ended turn by passing — trigger next bot move if applicable
            setImmediate(() => triggerBotMoveIfNeeded(gameId));
        }
    } catch (err) {
        logger.error('Bot', `Error computing move for game ${gameId}:`, err.message);
        // Notify the human player that the bot had an error
        const g = lobby.activeGames.get(gameId);
        if (g) {
            const humanSocketId = g.whiteBotConfig ? g.blackSocketId : (g.blackBotConfig ? g.whiteSocketId : null);
            if (humanSocketId) {
                io.to(humanSocketId).emit('bot_error', { message: 'Bot failed to respond. This may be due to a cold start. It will retry on the next move.' });
            }
        }
    } finally {
        const g = lobby.activeGames.get(gameId);
        if (g) g.botThinking = false;
    }
}


// --- BOARD LOADING (Lazy Loading) ---
const BOARDS_PATH = path.join(__dirname, 'utils', 'boards');
const boardPool = []; // Now stores filenames instead of full objects

function loadBoards() {
    try {
        const files = fs.readdirSync(BOARDS_PATH);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                // Just keep the filename, don't load the content yet
                boardPool.push(file);
            }
        });
        if (boardPool.length === 0) {
            throw new Error("No boards found in utils/boards");
        }
        logger.info('Server', `Detected ${boardPool.length} board(s) for on-demand loading.`);
    } catch (e) {
        logger.error('Server', 'Critical: no boards detected in utils/boards.', e.message);
    }
}

loadBoards();

const app = express();
const cors = require('cors');
app.use(cors({
    origin: '*', // Allow all for now, or specifically 'http://localhost' for Capacitor Android
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // Enable JSON parsing

// Redirect www → apex domain (canonical URL)
app.use((req, res, next) => {
    if (req.hostname === 'www.dedalthegame.com') {
        return res.redirect(301, 'https://dedalthegame.com' + req.url);
    }
    next();
});

// Redirect Cloud Run default URL (.run.app) → canonical custom domain
app.use((req, res, next) => {
    const host = req.get('host') || '';
    if (host.endsWith('.run.app')) {
        return res.redirect(301, `https://dedalthegame.com${req.originalUrl}`);
    }
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    },
    // Send a ping every 10s to keep the Cloud Run load-balancer from dropping
    // idle WebSocket connections (its default idle timeout is ~30s).
    pingInterval: 10000,
    pingTimeout:  25000,
    // Prefer native WebSocket; fall back to HTTP long-polling only if needed.
    // This avoids silent fallback to polling on environments where WS upgrades
    // are slow or unreliable (e.g. Android WebView on some networks).
    transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 4000;

// Initialize Database — restore from GCS first (no-op locally), then start services
restoreFromGcs()
    .then(() => initDb())
    .then(async () => {
    logger.info('Server', 'DuckDB initialized successfully.');

    // Start bot polling NOW that the DB is ready
    fetchAvailableBots();
    setInterval(fetchAvailableBots, BOT_POLL_INTERVAL_MS);

    // Start background bot-vs-bot match scheduler
    setInterval(startRandomBotMatch, BOT_MATCH_INTERVAL_MS);

    // Initialize tournament system
    if (TOURNAMENTS_ENABLED) {
        tournamentManager.initConfig(process.env);

        // Abort callback: called by tournamentManager when an arena game is
        // interrupted due to time expiry.  Mirrors the normal game-over cleanup
        // but without calling saveMatchResult (no record, no rating change).
        const abortGameFn = (gameHash) => {
            const game = lobby.activeGames.get(gameHash);
            if (!game) return;
            game.phase = 'GameOver'; // prevent further bot moves or clock ticks
            releaseBotIfNeeded(game);
            lobby.activeGames.delete(gameHash);
            broadcastLobbyUpdate(io);
        };

        tournamentManager.setDependencies(createTournamentGame, io, abortGameFn);
        await tournamentManager.loadFromDb();
        // Cleanup expired tournaments every 60s
        setInterval(() => tournamentManager.cleanupExpired(), 60 * 1000);
        // Check for arena time-expiry every 5s (prompt game interruption)
        setInterval(() => tournamentManager.checkArenaExpiry(), 5 * 1000);
        logger.info('Tournament', 'System initialized.');
    } else {
        logger.info('Tournament', 'Tournaments are DISABLED in config.');
    }

    // Start GCS persistence sync (no-op locally)
    startGcsSync(getUsersDb, getTournamentsDb, getGamesDb);

}).catch(err => {
    logger.error('Server', 'Failed to initialize DuckDB:', err);
});

// --- API ROUTES ---

// Replay endpoint: compute game state at any step from board_id + moves
app.post('/api/replay', (req, res) => {
    try {
        const { board_id, movesJson, step } = req.body;
        if (!board_id || !movesJson || step === undefined) {
            return res.status(400).json({ error: 'Missing board_id, movesJson, or step' });
        }
        // Load board from disk — no need to send it over the wire
        const boardFile = boardPool.find(f => f === `${board_id}.json` || f.replace('.json', '') === board_id);
        if (!boardFile) {
            return res.status(404).json({ error: `Board not found: ${board_id}` });
        }
        const boardJson = fs.readFileSync(path.join(BOARDS_PATH, boardFile), 'utf8');
        const result = replayToStepNapi({ boardJson, movesJson, step });
        res.json({
            pieces: JSON.parse(result.piecesJson),
            turn: result.turn,
            phase: result.phase,
            turnCounter: result.turnCounter,
            movesThisTurn: result.movesThisTurn,
            colorChosen: result.colorChosen,
        });
    } catch (e) {
        logger.error('Replay', 'Replay error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Board geometry endpoint — returns full board JSON for a given board_id
app.get('/api/boards/:boardId', (req, res) => {
    const { boardId } = req.params;
    const boardFile = boardPool.find(f => f === `${boardId}.json` || f.replace('.json', '') === boardId);
    if (!boardFile) {
        return res.status(404).json({ error: `Board not found: ${boardId}` });
    }
    try {
        const boardPath = path.join(BOARDS_PATH, boardFile);
        const boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
        res.json(boardData);
    } catch (e) {
        res.status(500).json({ error: `Failed to load board: ${e.message}` });
    }
});

// ── Tutorial API ──────────────────────────────────────────────────────────────
// These endpoints mirror what ./tutorial/server.js exposes, but served through
// the main backend so the SPA Tutorial page doesn't need a separate server.

// POST /api/tutorial/moves — return legal targets for a piece
app.post('/api/tutorial/moves', (req, res) => {
    try {
        const result = getLegalMovesNapi(req.body);
        res.json(result);
    } catch (e) {
        logger.error('Tutorial', '/api/tutorial/moves error:', e.message);
        res.status(400).json({ error: e.name + ': ' + e.message });
    }
});

// POST /api/tutorial/apply — apply a move and return updated piece positions
app.post('/api/tutorial/apply', (req, res) => {
    try {
        const result = applyMoveNapi(req.body);
        res.json(result);
    } catch (e) {
        logger.error('Tutorial', '/api/tutorial/apply error:', e.message);
        res.status(400).json({ error: e.name + ': ' + e.message });
    }
});


// GET /api/boards/random/:count — return N random boards with polygon data for SVG preview
app.get('/api/boards/random/:count', (req, res) => {
    const count = Math.min(20, Math.max(1, parseInt(req.params.count) || 10));
    const shuffled = [...boardPool].sort(() => 0.5 - Math.random()).slice(0, count);
    const boards = shuffled.map(f => {
        const id = f.replace('.json', '');
        try {
            const boardData = JSON.parse(fs.readFileSync(path.join(BOARDS_PATH, f), 'utf8'));
            const allPolygons = boardData.allPolygons || {};
            const polyKeys = Object.keys(allPolygons);

            // Extract polygon shapes for SVG rendering
            const polygons = polyKeys.map(k => {
                const p = allPolygons[k];
                return {
                    points: p.points, // [[x,y], ...]
                    color: p.color || '#888',
                };
            });

            // Compute bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const poly of polygons) {
                for (const [x, y] of (poly.points || [])) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }

            return {
                id,
                polygonCount: polyKeys.length,
                polygons,
                bbox: { minX, minY, maxX, maxY },
            };
        } catch (_) {
            return { id, polygonCount: 0, polygons: [], bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 } };
        }
    });
    res.json({ boards });
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (username.toLowerCase().startsWith('guest_')) {
        return res.status(400).json({ error: 'Username cannot start with "guest_"' });
    }

    if (username.toLowerCase().startsWith('bot_')) {
        return res.status(400).json({ error: 'Username cannot start with "bot_"' });
    }

    try {
        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);
        // NOTE: Email verification is currently DISABLED.
        // is_verified is set to 0 (unverified) but the login gate is bypassed below.
        // To re-enable: generate verificationToken, insert with token/expires, call sendVerificationEmail.

        const con = await getUsersDb().connect();
        
        try {
            await con.run(`
                INSERT INTO users (id, username, email, password_hash, role, is_verified)
                VALUES (?, ?, ?, ?, 'registered', 0)
            `, [userId, username, email, passwordHash]);

            // Create empty profile
            await con.run(`INSERT INTO profiles (user_id) VALUES (?)`, [userId]);

            res.status(201).json({ message: 'User registered successfully. You can now log in.' });
        } catch (err) {
            if (err.message.includes('Constraint Error') || err.message.includes('UNIQUE constraint')) {
                return res.status(400).json({ error: 'Username or Email already registered' });
            }
            return res.status(500).json({ error: err.message });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    try {
        const con = await getUsersDb().connect();
        const reader = await con.runAndReadAll(`
            SELECT id FROM users 
            WHERE verification_token = ? AND CAST(token_expires_at AS TIMESTAMP) > CURRENT_TIMESTAMP
        `, [token]);
        
        const rows = reader.getRows();

        if (!rows || rows.length === 0) {
            return res.status(400).send('<h1>Invalid or expired verification link</h1>');
        }

        const userId = rows[0][0]; // DuckDB rows are arrays of values
        await con.run(`
            UPDATE users SET is_verified = 1, verification_token = NULL, token_expires_at = NULL 
            WHERE id = ?
        `, [userId]);
        
        res.send('<h1>Email verified successfully! You can now log in to the lobby.</h1>');
    } catch (err) {
        logger.error('Auth', 'Email verification error:', err);
        res.status(500).send('<h1>Verification failed</h1>');
    }
});

app.post('/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Missing identifier (username/email) or password' });
    }

    try {
        const con = await getUsersDb().connect();
        const reader = await con.runAndReadAll(`
            SELECT id, username, password_hash, role, is_verified, rating, rating_deviation, rating_volatility
            FROM users WHERE email = ? OR username = ?
        `, [identifier, identifier]);
        
        const rows = reader.getRows();

        if (!rows || rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const [userId, username, passwordHash, role, isVerified, rating, ratingDeviation, ratingVolatility] = rows[0];

        // NOTE: Email verification gate is currently DISABLED.
        // To re-enable: uncomment the block below.
        // if (!isVerified) {
        //     return res.status(401).json({ error: 'Please verify your email before logging in.' });
        // }

        const isMatch = await bcrypt.compare(password, passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Sign JWT
        const token = jwt.sign(
            { id: userId, username, role },
            JWT_SECRET,
            { algorithm: 'HS256', expiresIn: `${JWT_EXPIRY_DAYS}d` }
        );

        res.json({
            id: userId,
            username,
            role,
            rating: Math.round(rating || 1500),
            ratingDeviation: Math.round(ratingDeviation || 350),
            ratingVolatility: ratingVolatility || 0.06,
            token,
        });
    } catch (err) {
        logger.error('Auth', 'Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/me — restore session from JWT
app.get('/api/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        // Fetch fresh user data from DB
        const con = await getUsersDb().connect();
        const reader = await con.runAndReadAll(
            `SELECT id, username, role, rating, rating_deviation, rating_volatility FROM users WHERE id = ?`,
            [decoded.id]
        );
        const rows = reader.getRows();
        if (!rows || rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const [userId, username, role, rating, ratingDeviation, ratingVolatility] = rows[0];
        res.json({
            id: userId,
            username,
            role,
            rating: Math.round(rating || 1500),
            ratingDeviation: Math.round(ratingDeviation || 350),
            ratingVolatility: ratingVolatility || 0.06,
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// --- HELPERS ---
function getRandomHash() {
    return crypto.randomBytes(16).toString('hex');
}

// --- LOBBY STATE ---
const lobby = {
    gameRequests: [],        // { requestId, socketId, userId, username, role, timeControl, createdAt }
    activeGames: new Map(),  // hash -> { ...gameData, hash, timeControl, whiteName, blackName }
    connectedUsers: new Set(), // set of socket IDs
};

function buildLobbyStats() {
    // Count unique users, not socket connections
    // Authenticated users with multiple tabs are counted once
    const seen = new Set();
    let count = 0;
    for (const [, s] of io.sockets.sockets) {
        const key = s.userId || s.id; // userId for logged-in, socket.id for guests
        if (!seen.has(key)) {
            seen.add(key);
            count++;
        }
    }
    return {
        onlineUsers: count,
        activeGames: lobby.activeGames.size,
    };
}

function buildActiveGamesList() {
    return Array.from(lobby.activeGames.values()).map(g => ({
        hash: g.hash,
        white: g.white,
        black: g.black,
        whiteName: g.whiteName || g.white,
        blackName: g.blackName || g.black,
        whiteRole: g.whiteRole || 'guest',
        blackRole: g.blackRole || 'guest',
        timeControl: g.timeControl,
        moveCount: g.moves ? g.moves.length : 0,
        phase: g.phase,
    }));
}

function buildRequestsList() {
    return lobby.gameRequests.map(r => ({
        requestId: r.requestId,
        userId: r.userId,
        username: r.username,
        role: r.role,
        timeControl: r.timeControl,
        boardId: r.boardId || null,
        createdAt: r.createdAt,
    }));
}

function broadcastLobbyUpdate(io) {
    const payload = {
        gameRequests: buildRequestsList(),
        activeGames: buildActiveGamesList(),
        stats: buildLobbyStats(),
        available_bots: getBotsForLobby(),
        tournaments: TOURNAMENTS_ENABLED ? {
            enabled: true,
            openTournaments: tournamentManager.getOpenTournaments(),
            activeTournaments: tournamentManager.getActiveTournamentsList(),
        } : { enabled: false, openTournaments: [], activeTournaments: [] },
    };
    io.to('lobby').emit('lobby_update', sanitizeBigInt(payload));
}

function updateClocks(game, turnEnded) {
    const now = Date.now();
    if (!game.lastTurnTimestamp) game.lastTurnTimestamp = now;
    
    if (turnEnded) {
        const elapsedTime = now - game.lastTurnTimestamp;
        const activeSide = game.turn;
        const increment = (game.timeControl && game.timeControl.increment) ? game.timeControl.increment * 1000 : 30000;
        const deduction = Math.max(0, elapsedTime - 100);
        const bonus = (game.phase === 'Playing') ? increment : 0;
        game.clocks[activeSide] = Math.max(0, game.clocks[activeSide] - deduction + bonus);
        game.lastTurnTimestamp = now;
    }
}

// --- 30-MINUTE GAME REQUEST AUTO-EXPIRY ---
setInterval(() => {
    const now = Date.now();
    const thirtyMin = 30 * 60 * 1000;
    const before = lobby.gameRequests.length;
    lobby.gameRequests = lobby.gameRequests.filter(r => (now - r.createdAt) < thirtyMin);
    if (lobby.gameRequests.length !== before) {
        broadcastLobbyUpdate(io);
    }
}, 60 * 1000); // check every minute

// Global Timeout Check
setInterval(() => {
    const now = Date.now();
    for (const [gameId, game] of lobby.activeGames) {
        if (game.phase === 'GameOver') continue;

        // --- DISCONNECTION HANDLING ---
        // Guest: Remove after 5s
        // Registered: Forfeit after 30s
        const checkDiscon = (playerType) => {
            const disconAt = game[`${playerType}DisconnectedAt`];
            if (!disconAt) return false;
            
            const diff = now - disconAt;
            const role = game[`${playerType}Role`];
            const limit = role === 'guest' ? 5000 : 30000;

            if (diff >= limit) {
                logger.info('Game', `Game Over: ${gameId} - ${playerType} abandoned (${role})`);
                game.phase = 'GameOver';
                const winnerSide = playerType === 'white' ? 'black' : 'white';
                const winnerId = winnerSide === 'white' ? game.white : game.black;

                io.to(gameId).emit('game_over', { 
                    winnerId, 
                    reason: 'disconnection',
                    message: `${playerType === 'white' ? 'White' : 'Black'} disconnected for too long.`
                });
                
                saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves, io)
                    .catch(err => logger.error('Game', `Failed to save abandoned game ${gameId}:`, err));
                
                releaseBotIfNeeded(game);
                lobby.activeGames.delete(gameId);
                broadcastLobbyUpdate(io);
                return true;
            }
            return false;
        };

        if (checkDiscon('white')) continue;
        if (checkDiscon('black')) continue;

        // --- CLOCK TIMEOUT ---
        if (!game.lastTurnTimestamp) continue;
        const activeSide = game.turn;
        const elapsedTime = now - game.lastTurnTimestamp;
        const currentClock = game.clocks[activeSide] - Math.max(0, elapsedTime - 100);

        if (currentClock <= 0) {
            logger.info('Game', `Game Over: ${gameId} - timeout for ${activeSide}`);
            game.clocks[activeSide] = 0;
            game.phase = 'GameOver';
            const winnerSide = activeSide === 'white' ? 'black' : 'white';
            const winnerId = winnerSide === 'white' ? game.white : game.black;

            io.to(gameId).emit('game_over', { winnerId, reason: 'timeout' });
            saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves, io)
                .catch(err => logger.error('Game', `Failed to save timed-out game ${gameId}:`, err));
            
            releaseBotIfNeeded(game);
            lobby.activeGames.delete(gameId);
            broadcastLobbyUpdate(io);
        }
    }
}, 1000);

// --- helper to build initialState payload ---
function buildInitialState(gameData) {
    return {
        board: gameData.board,
        pieces: gameData.pieces,
        turn: gameData.turn,
        colorChosen: gameData.colorChosen,
        colorsEverChosen: gameData.colorsEverChosen,
        mageUnlocked: gameData.mageUnlocked,
        phase: gameData.phase,
        setupStep: gameData.setupStep,
        turnCounter: gameData.turnCounter,
        isNewTurn: gameData.isNewTurn,
        movesThisTurn: gameData.movesThisTurn,
        lockedSequencePiece: gameData.lockedSequencePiece || null,
        heroeTakeCounter: gameData.heroeTakeCounter,
        clocks: gameData.clocks,
        lastTurnTimestamp: gameData.lastTurnTimestamp,
        timeControl: gameData.timeControl,
        passCount: gameData.passCount || { white: 0, black: 0 },
        whiteRole: gameData.whiteRole,
        blackRole: gameData.blackRole,
        whiteName: gameData.whiteName,
        blackName: gameData.blackName,
        boardName: gameData.boardName,
        whiteRating: gameData.whiteRating || null,
        blackRating: gameData.blackRating || null,
    };
}

// --- helper to create a game from two players ---
async function createGame(whitePlayer, blackPlayer, timeControl, boardId) {
    const hash = getRandomHash();

    let randomBoardFile;
    if (boardId) {
        randomBoardFile = boardPool.find(f => f === `${boardId}.json` || f.replace('.json', '') === boardId);
        if (!randomBoardFile) {
            logger.warn('Game', `Requested boardId '${boardId}' not found in pool, falling back to random.`);
            randomBoardFile = boardPool[Math.floor(Math.random() * boardPool.length)];
        }
    } else {
        randomBoardFile = boardPool[Math.floor(Math.random() * boardPool.length)];
    }
    const boardName = randomBoardFile ? randomBoardFile.replace('.json', '') : 'unknown';
    let boardData;
    try {
        const boardPath = path.join(BOARDS_PATH, randomBoardFile);
        boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
    } catch (err) {
        logger.error('Game', `Failed to lazy-load board ${randomBoardFile}:`, err);
        boardData = { allPolygons: {}, allEdges: {}, pieces: {} };
    }

    let initPieces = [];
    try {
        const response = initGameStateNapi({
            boardJson: JSON.stringify(boardData),
            randomSetup: false
        });
        initPieces = JSON.parse(response.piecesJson);
    } catch (e) {
        logger.error('Game', 'Error initializing game via NAPI:', e);
        initPieces = [];
    }

    const clockMs = (timeControl.minutes || 15) * 60 * 1000;

    const gameData = {
        hash,
        white: whitePlayer.userId,
        black: blackPlayer.userId,
        whiteName: whitePlayer.username || whitePlayer.userId,
        blackName: blackPlayer.username || blackPlayer.userId,
        timeControl,
        board: boardData,
        boardName,
        pieces: initPieces,
        turn: 'white',
        phase: 'Setup',
        setupStep: 0,
        colorChosen: {},
        colorsEverChosen: [],
        mageUnlocked: false,
        turnCounter: 0,
        isNewTurn: true,
        movesThisTurn: 0,
        lockedSequencePiece: null,
        heroeTakeCounter: 0,
        clocks: { white: clockMs, black: clockMs },
        lastTurnTimestamp: Date.now(),
        passCount: { white: 0, black: 0 },
        moves: [],
        gameStartTimestamp: Date.now(),
        // track which socket IDs are the players
        whiteSocketId: whitePlayer.socketId,
        blackSocketId: blackPlayer.socketId,
        whiteRole: whitePlayer.role,
        blackRole: blackPlayer.role,
        whiteRating: null,
        blackRating: null,
        whiteDisconnectedAt: null,
        blackDisconnectedAt: null,
    };

    // Fetch ratings from DB (non-blocking for guests)
    const [wRating, bRating] = await Promise.all([
        fetchUserRating(whitePlayer.userId),
        fetchUserRating(blackPlayer.userId),
    ]);
    gameData.whiteRating = wRating;
    gameData.blackRating = bRating;

    lobby.activeGames.set(hash, gameData);
    return { hash, gameData };
}

// --- helper to create a tournament game (with optional fixed board) ---
async function createTournamentGame(whitePlayer, blackPlayer, timeControl, boardId) {
    // If a fixed board is requested, temporarily swap in that board
    let result;
    if (boardId) {
        const boardFile = boardPool.find(f => f === `${boardId}.json` || f.replace('.json', '') === boardId);
        if (boardFile) {
            result = await createGame(whitePlayer, blackPlayer, timeControl);
            try {
                const boardPath = path.join(BOARDS_PATH, boardFile);
                const boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
                result.gameData.board = boardData;
                result.gameData.boardName = boardId;
                const response = initGameStateNapi({ boardJson: JSON.stringify(boardData), randomSetup: false });
                result.gameData.pieces = JSON.parse(response.piecesJson);
            } catch (e) { logger.error('Tournament', 'Fixed board load error:', e.message); }
        } else {
            result = await createGame(whitePlayer, blackPlayer, timeControl);
        }
    } else {
        result = await createGame(whitePlayer, blackPlayer, timeControl);
    }

    const { hash, gameData } = result;
    gameData.botThinking = false;

    // ── Wire up bots ──
    // Detect bot players by userId prefix or role
    const whiteIsBot = whitePlayer.userId?.startsWith('bot_') || whitePlayer.role === 'bot';
    const blackIsBot = blackPlayer.userId?.startsWith('bot_') || blackPlayer.role === 'bot';

    // Look up bot config from the availableBots list by matching the constructed botId
    function findBotConfigByUserId(botUserId) {
        for (const b of availableBots) {
            if (`bot_${b.agent_type}_${b.model_name}` === botUserId) {
                return { type: b.agent_type, modelName: b.model_name };
            }
        }
        // Fallback: try to guess from userId (shouldn't happen if bot is registered)
        const suffix = botUserId.replace(/^bot_/, '');
        return { type: suffix, modelName: '' };
    }

    if (whiteIsBot) {
        const botConfig = findBotConfigByUserId(whitePlayer.userId);
        const botKey = getBotKey(botConfig.type, botConfig.modelName);
        gameData.whiteBotConfig = botConfig;
        gameData.whiteBotKey = botKey;
        busyBots.set(botKey, hash);
    }
    if (blackIsBot) {
        const botConfig = findBotConfigByUserId(blackPlayer.userId);
        const botKey = getBotKey(botConfig.type, botConfig.modelName);
        gameData.blackBotConfig = botConfig;
        gameData.blackBotKey = botKey;
        busyBots.set(botKey, hash);
    }

    // ── Wire up human players: find their socket(s) and join them to the game room ──
    for (const [, s] of io.sockets.sockets) {
        if (s.userId === whitePlayer.userId && !whiteIsBot) {
            s.join(hash);
            gameData.whiteSocketId = gameData.whiteSocketId || s.id;
            s.emit('game_created', {
                hash,
                side: 'white',
                opponent: blackPlayer.username,
                initialState: buildInitialState(gameData),
                tournamentId: gameData.tournamentId || null,
            });
        }
        if (s.userId === blackPlayer.userId && !blackIsBot) {
            s.join(hash);
            gameData.blackSocketId = gameData.blackSocketId || s.id;
            s.emit('game_created', {
                hash,
                side: 'black',
                opponent: whitePlayer.username,
                initialState: buildInitialState(gameData),
                tournamentId: gameData.tournamentId || null,
            });
        }
    }

    // ── Trigger first bot move if white is a bot ──
    if (whiteIsBot) {
        setImmediate(() => triggerBotMoveIfNeeded(hash));
    }

    logger.info('Game', `Tournament game ${hash} wired: white=${whitePlayer.userId}${whiteIsBot?' (BOT)':''}, black=${blackPlayer.userId}${blackIsBot?' (BOT)':''}`);
    logger.debug('Socket', `Notifying game room ${hash}`);
    return result;
}

io.on('connection', (socket) => {
    logger.debug('Socket', `User connected: ${socket.id}`);
    lobby.connectedUsers.add(socket.id);

    // Auto-identify user from JWT token in handshake auth
    const token = socket.handshake?.auth?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
            socket.userId = decoded.id;
            socket.username = decoded.username;
            socket.userRole = decoded.role || 'registered';
            logger.debug('Auth', `Socket ${socket.id} authenticated as ${decoded.username} (${decoded.id})`);
        } catch (e) {
            logger.debug('Auth', `Socket ${socket.id} had invalid/expired JWT, treating as guest.`);
        }
    }

    broadcastLobbyUpdate(io);

    // Legacy join_lobby (kept for backward compat with registered login flow)
    socket.on('join_lobby', ({ userId, role } = {}) => {
        const id = userId || generateGuestId();
        const userRole = role || 'guest';
        socket.userId = id;
        socket.userRole = userRole;
        socket.emit('assigned_id', { id, role: userRole });
        logger.debug('Lobby', `User ${id} (${userRole}) joined the lobby`);
    });

    // --- ENTER LOBBY: join room + send full state ---
    socket.on('enter_lobby', () => {
        socket.join('lobby');
        socket.emit('lobby_state', sanitizeBigInt({
            gameRequests: buildRequestsList(),
            activeGames: buildActiveGamesList(),
            stats: buildLobbyStats(),
            available_bots: getBotsForLobby(),
            tournaments: TOURNAMENTS_ENABLED ? {
                enabled: true,
                openTournaments: tournamentManager.getOpenTournaments(),
                activeTournaments: tournamentManager.getActiveTournamentsList(),
            } : { enabled: false, openTournaments: [], activeTournaments: [] },
        }));
    });

    // --- CREATE GAME REQUEST ---
    socket.on('create_game_request', ({ timeControl, boardId, userId, username, role }) => {
        // Validate no duplicate request from same socket
        const existing = lobby.gameRequests.find(r => r.socketId === socket.id);
        if (existing) {
            socket.emit('request_error', { message: 'You already have an open request.' });
            return;
        }

        const requestId = uuidv4();
        const effectiveUserId = userId || socket.userId || generateGuestId();
        const effectiveRole = role || socket.userRole || 'guest';

        lobby.gameRequests.push({
            requestId,
            socketId: socket.id,
            userId: effectiveUserId,
            username: username || effectiveUserId,
            role: effectiveRole,
            timeControl: timeControl || { minutes: 15, increment: 10 },
            boardId: boardId || null,
            createdAt: Date.now(),
        });

        socket.emit('request_created', { requestId });
        broadcastLobbyUpdate(io);
        logger.debug('Game', `Game request ${requestId} by ${effectiveUserId} (${effectiveRole})${boardId ? ` board=${boardId}` : ''}`);
    });

    // --- CANCEL GAME REQUEST ---
    socket.on('cancel_game_request', ({ requestId }) => {
        lobby.gameRequests = lobby.gameRequests.filter(
            r => !(r.requestId === requestId && r.socketId === socket.id)
        );
        broadcastLobbyUpdate(io);
    });

    // --- ACCEPT GAME REQUEST ---
    socket.on('accept_game_request', async ({ requestId, userId, username, role }) => {
        const reqIndex = lobby.gameRequests.findIndex(r => r.requestId === requestId);
        if (reqIndex === -1) {
            socket.emit('request_error', { message: 'Request no longer available.' });
            return;
        }
        const req = lobby.gameRequests[reqIndex];

        // Don't let the same socket accept its own request
        if (req.socketId === socket.id) {
            socket.emit('request_error', { message: "You can't accept your own request." });
            return;
        }

        // Guest-only rule: guests can only play guests, registered users can play anyone
        const acceptorRole = role || socket.userRole || 'guest';
        if (req.role === 'guest' && acceptorRole !== 'guest') {
            socket.emit('request_error', { message: 'Registered users cannot join guest-only requests.' });
            return;
        }

        // Remove the request
        lobby.gameRequests.splice(reqIndex, 1);

        const effectiveUserId = userId || socket.userId || generateGuestId();
        const effectiveUsername = username || effectiveUserId;

        // Randomize sides
        const isRequesterWhite = Math.random() > 0.5;
        const requesterPlayer = { socketId: req.socketId, userId: req.userId, username: req.username };
        const acceptorPlayer  = { socketId: socket.id, userId: effectiveUserId, username: effectiveUsername };

        const whitePlayer = isRequesterWhite ? requesterPlayer : acceptorPlayer;
        const blackPlayer = isRequesterWhite ? acceptorPlayer  : requesterPlayer;

        const { hash, gameData } = await createGame(whitePlayer, blackPlayer, req.timeControl, req.boardId || null);
        
        // Place both players in the game room
        const requesterSocket = io.sockets.sockets.get(req.socketId);
        if (requesterSocket) requesterSocket.join(hash);
        socket.join(hash);

        // Also remove any pending request from acceptor
        lobby.gameRequests = lobby.gameRequests.filter(r => r.socketId !== socket.id);

        // Notify both players
        io.to(whitePlayer.socketId).emit('game_created', {
            hash,
            side: 'white',
            opponent: blackPlayer.username || blackPlayer.userId,
            initialState: buildInitialState(gameData),
        });
        io.to(blackPlayer.socketId).emit('game_created', {
            hash,
            side: 'black',
            opponent: whitePlayer.username || whitePlayer.userId,
            initialState: buildInitialState(gameData),
        });

        broadcastLobbyUpdate(io);
        logger.info('Game', `Created: ${hash} — ${whitePlayer.userId} (W) vs ${blackPlayer.userId} (B)`);
    });

    // --- CREATE BOT GAME ---
    socket.on('create_bot_game', async ({ userId, username, role, timeControl, botConfig }) => {
        const effectiveUserId = userId || socket.userId || generateGuestId();
        const effectiveUsername = username || effectiveUserId;
        const effectiveRole = role || socket.userRole || 'guest';

        const agentType = botConfig?.type || 'greedy_jack';
        const modelName = botConfig?.modelName || 'rank_002_yYtlgZLn13';
        const botKey = getBotKey(agentType, modelName);

        // Check if this bot is already in a game
        if (busyBots.has(botKey)) {
            socket.emit('bot_error', { message: `${agentType} (${modelName}) is already in a game. Please wait.` });
            return;
        }

        const botId = `bot_${agentType}_${modelName}`;
        const botName = makeBotDisplayName(agentType, modelName);
        const isPlayerWhite = Math.random() > 0.5;

        const humanPlayer = { socketId: socket.id, userId: effectiveUserId, username: effectiveUsername, role: effectiveRole };
        const botPlayer   = { socketId: null, userId: botId, username: botName, role: 'bot' };

        const whitePlayer = isPlayerWhite ? humanPlayer : botPlayer;
        const blackPlayer = isPlayerWhite ? botPlayer   : humanPlayer;

        const { hash, gameData } = await createGame(whitePlayer, blackPlayer, timeControl || { minutes: 15, increment: 10 });

        // Mark game sides as bots if applicable
        if (!isPlayerWhite) {
            gameData.whiteBotConfig = botConfig || { type: 'greedy_jack', modelName: 'rank_002_yYtlgZLn13' };
            gameData.whiteBotKey = botKey;
            gameData.whiteDisconnectedAt = null;
        } else {
            gameData.blackBotConfig = botConfig || { type: 'greedy_jack', modelName: 'rank_002_yYtlgZLn13' };
            gameData.blackBotKey = botKey;
            gameData.blackDisconnectedAt = null;
        }
        
        gameData.botThinking = false;

        // Mark bot as busy
        busyBots.set(botKey, hash);

        socket.join(hash);

        const playerSide = isPlayerWhite ? 'white' : 'black';
        socket.emit('game_created', {
            hash,
            side: playerSide,
            opponent: botName,
            initialState: buildInitialState(gameData),
        });

        broadcastLobbyUpdate(io);
        logger.info('Game', `Bot game created: ${hash} — ${effectiveUserId} (${playerSide}) vs ${botName}`);

        // Trigger bot's first move if it's white
        if (gameData.whiteBotConfig) {
            setImmediate(() => triggerBotMoveIfNeeded(hash));
        }
    });


    // ── Tournament Socket Events ────────────────────────────────────────────

    socket.on('create_tournament', async (data) => {
        if (!TOURNAMENTS_ENABLED) {
            socket.emit('tournament_error', { message: 'Tournaments are disabled on this server.' });
            return;
        }
        if (!socket.userId || socket.userId.startsWith('guest_')) {
            socket.emit('tournament_error', { message: 'Only registered users can create tournaments.' });
            return;
        }
        try {
            const tournament = await tournamentManager.createTournament({
                creatorId: socket.userId,
                creatorUsername: socket.username || socket.userId,
                format: data.format,
                maxParticipants: data.maxParticipants,
                timeControlMinutes: data.timeControlMinutes,
                timeControlIncrement: data.timeControlIncrement,
                password: data.password || null,
                boardId: data.boardId || null,
                ratingMin: data.ratingMin,
                ratingMax: data.ratingMax,
                durationValue: data.durationValue,
                invitedBots: data.invitedBots || 0,
                creatorPlays: data.creatorPlays !== false,
                launchMode: data.launchMode || 'when_complete',
                launchAt: data.launchAt || null,
            });

            // Auto-join creator to tournament room
            socket.join(`tournament:${tournament.id}`);

            socket.emit('tournament_created', {
                id: tournament.id,
                format: tournament.format,
                status: tournament.status,
            });

            // Invite bots if requested
            if (tournament.invited_bots > 0 && availableBots.length > 0) {
                const botsToInvite = availableBots.slice(0, tournament.invited_bots);
                for (const bot of botsToInvite) {
                    const botId = `bot_${bot.agent_type}_${bot.model_name}`;
                    const botName = makeBotDisplayName(bot.agent_type, bot.model_name);
                    try {
                        await tournamentManager.joinTournament(tournament.id, botId, botName, null, true);
                    } catch (e) {
                        logger.warn('Tournament', `Bot ${botId} could not join: ${e.message}`);
                    }
                }
            }

            broadcastLobbyUpdate(io);
        } catch (e) {
            socket.emit('tournament_error', { message: e.message });
        }
    });

    socket.on('join_tournament', async ({ tournamentId, password }) => {
        if (!socket.userId || socket.userId.startsWith('guest_')) {
            socket.emit('tournament_error', { message: 'Only registered users can join tournaments.' });
            return;
        }
        try {
            await tournamentManager.joinTournament(tournamentId, socket.userId, socket.username || socket.userId, password);
            socket.join(`tournament:${tournamentId}`);
            socket.emit('tournament_joined', { tournamentId });
            broadcastLobbyUpdate(io);
        } catch (e) {
            socket.emit('tournament_error', { message: e.message });
        }
    });

    socket.on('leave_tournament', async ({ tournamentId }) => {
        try {
            await tournamentManager.leaveTournament(tournamentId, socket.userId);
            socket.leave(`tournament:${tournamentId}`);
            socket.emit('tournament_left', { tournamentId });
            broadcastLobbyUpdate(io);
        } catch (e) {
            socket.emit('tournament_error', { message: e.message });
        }
    });

    socket.on('enter_tournament_room', ({ tournamentId }) => {
        socket.join(`tournament:${tournamentId}`);
        // Send current tournament state
        const t = tournamentManager.getTournamentById(tournamentId);
        if (t) {
            const standings = require('./tournament/standings').computeStandings(t.participants, t.games, t.format);
            let bracket = null;
            if (t.format === 'knockout') {
                const { computeKnockoutBracket } = require('./tournament/standings');
                const { knockoutTotalRounds } = require('./tournament/pairings');
                bracket = computeKnockoutBracket(t.participants, t.games, knockoutTotalRounds(t.current_count));
            }
            socket.emit('tournament_update', {
                id: t.id,
                status: t.status,
                format: t.format,
                currentRound: t.current_round,
                maxRounds: t.duration_value,
                currentCount: t.current_count,
                maxParticipants: t.max_participants,
                timeControl: { minutes: t.time_control_minutes, increment: t.time_control_increment },
                standings,
                bracket,
                games: t.games.map(g => ({
                    id: g.id, round: g.round, white_id: g.white_id, black_id: g.black_id,
                    game_hash: g.game_hash, result: g.result,
                    white_score: g.white_score, black_score: g.black_score,
                })),
                arenaEndAt: t.arenaEndAt || null,
                hasPassword: t.has_password === 1,
                boardId: t.board_id,
                ratingMin: t.rating_min,
                ratingMax: t.rating_max,
                creatorId: t.creator_id,
            });
        } else {
            socket.emit('tournament_error', { message: 'Tournament not found.' });
        }
    });

    socket.on('leave_tournament_room', ({ tournamentId }) => {
        socket.leave(`tournament:${tournamentId}`);
    });


    socket.on('join_game_by_hash', ({ hash, spectator, userId }) => {
        const game = lobby.activeGames.get(hash);
        if (!game) {
            socket.emit('game_joined', { error: 'Game not found or has ended.' });
            return;
        }

        socket.join(hash);

        // Determine if this socket is a player.
        // Priority: client-supplied userId → socket.userId from JWT handshake → socket.id match.
        // socket.userId is set from the verified JWT at connection time and is always trustworthy,
        // even when the client's async /api/me fetch hasn't completed (mobile race) or when the
        // socket has reconnected (new socket.id but same authenticated identity).
        const effectiveUserId = userId || socket.userId || null;
        let side = 'spectator';
        if (!spectator) {
            if (effectiveUserId && effectiveUserId === game.white) {
                side = 'white';
                game.whiteSocketId = socket.id;
                game.whiteDisconnectedAt = null;
            }
            else if (effectiveUserId && effectiveUserId === game.black) {
                side = 'black';
                game.blackSocketId = socket.id;
                game.blackDisconnectedAt = null;
            }
            else if (socket.id === game.whiteSocketId) {
                side = 'white';
                game.whiteDisconnectedAt = null;
            }
            else if (socket.id === game.blackSocketId) {
                side = 'black';
                game.blackDisconnectedAt = null;
            }
        }
        logger.debug('Socket', `join_game_by_hash ${hash}: effectiveUserId=${effectiveUserId}, side=${side}`);

        socket.emit('game_joined', {
            hash,
            side,
            spectator: side === 'spectator',
            opponent: side === 'white' ? (game.blackName || game.black)
                    : side === 'black' ? (game.whiteName || game.white)
                    : null,
            whiteRole: game.whiteRole,
            blackRole: game.blackRole,
            initialState: buildInitialState(game),
            tournamentId: game.tournamentId || null,
        });
    });

    // --- GAME ACTIONS ---
    
    socket.on('color_selected', ({ gameId, color, side }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game) return;

        try {
            const response = selectColorNapi({
                boardJson: JSON.stringify(game.board),
                piecesJson: JSON.stringify(game.pieces),
                color: color,
                turn: game.turn,
                phase: game.phase,
                setupStep: game.setupStep,
                colorChosen: game.colorChosen || {},
                colorsEverChosen: game.colorsEverChosen || [],
                turnCounter: game.turnCounter || 0,
                isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                movesThisTurn: game.movesThisTurn || 0,
                lockedSequencePiece: game.lockedSequencePiece || undefined,
                heroeTakeCounter: game.heroeTakeCounter || 0
            });

            // Update lobby state from authoritative return values
            game.pieces = JSON.parse(response.piecesJson);
            game.turn = response.turn;
            game.colorChosen = response.colorChosen;
            game.colorsEverChosen = response.colorsEverChosen;
            game.mageUnlocked = response.mageUnlocked;
            game.phase = response.phase;
            game.setupStep = response.setupStep;
            game.turnCounter = response.turnCounter;
            game.isNewTurn = response.isNewTurn;
            game.movesThisTurn = response.movesThisTurn;
            game.lockedSequencePiece = response.lockedSequencePiece;
            game.heroeTakeCounter = response.heroeTakeCounter;

            io.to(gameId).emit('game_update', {
                pieces: game.pieces,
                turn: game.turn,
                colorChosen: game.colorChosen,
                colorsEverChosen: game.colorsEverChosen,
                mageUnlocked: game.mageUnlocked,
                phase: game.phase,
                setupStep: game.setupStep,
                turnCounter: game.turnCounter,
                isNewTurn: game.isNewTurn,
                movesThisTurn: game.movesThisTurn,
                lockedSequencePiece: game.lockedSequencePiece || null,
                heroeTakeCounter: game.heroeTakeCounter,
                clocks: game.clocks,
                lastTurnTimestamp: game.lastTurnTimestamp,
                moves: game.moves || [],
                moves: game.moves || [],
            });
            logger.debug('Move', `Color '${color}' set for ${game.turn} by ${side} in ${gameId}. isNewTurn=${game.isNewTurn}`);
        } catch (error) {
            logger.error('Move', 'Error selecting color:', error);
        }
    });


    socket.on('randomize_setup', ({ gameId, side }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game || game.phase !== 'Setup') {
            logger.debug('Setup', `randomize_setup rejected: game=${!!game}, phase=${game?.phase}`);
            return;
        }

        const oldTurn = game.turn;
        logger.debug('Setup', `randomize_setup: gameId=${gameId}, side=${side}, turn=${game.turn}, step=${game.setupStep}`);

        try {
            const response = randomizeSetupNapi({
                boardJson: JSON.stringify(game.board),
                piecesJson: JSON.stringify(game.pieces),
                turn: game.turn,
                phase: game.phase,
                setupStep: game.setupStep,
                colorChosen: game.colorChosen || {},
                colorsEverChosen: game.colorsEverChosen || [],
                turnCounter: game.turnCounter || 0,
                isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                movesThisTurn: game.movesThisTurn || 0,
                lockedSequencePiece: game.lockedSequencePiece || undefined,
                heroeTakeCounter: game.heroeTakeCounter || 0,
                side: side
            });
            const oldPieces = game.pieces;
            game.pieces = JSON.parse(response.piecesJson);
            // Record randomized placements as setup moves with same timestamp
            const randTs = Date.now();
            for (const p of game.pieces) {
                const old = oldPieces.find(op => op.id === p.id);
                if (old && old.position === 'returned' && p.position !== 'returned') {
                    game.moves.push({ turn_number: 0, active_side: game.turn, phase: 'setup', chosen_color: '', piece_id: p.id, target_id: p.position, timestamp_ms: randTs });
                }
            }

            // Refresh clock so the game_update contains live time, preventing frontend "flash"
            updateClocks(game, true);

            game.turn = response.turn;
            game.phase = response.phase;
            game.setupStep = response.setupStep;
            game.turnCounter = response.turnCounter;
            game.isNewTurn = response.isNewTurn;
            game.movesThisTurn = response.movesThisTurn;
            game.lockedSequencePiece = response.lockedSequencePiece;
            game.heroeTakeCounter = response.heroeTakeCounter;
            
            io.to(gameId).emit('game_update', {
                pieces: game.pieces,
                turn: game.turn,
                colorChosen: game.colorChosen,
                colorsEverChosen: game.colorsEverChosen,
                mageUnlocked: game.mageUnlocked,
                phase: game.phase,
                setupStep: game.setupStep,
                turnCounter: game.turnCounter,
                isNewTurn: game.isNewTurn,
                movesThisTurn: game.movesThisTurn,
                lockedSequencePiece: game.lockedSequencePiece || null,
                heroeTakeCounter: game.heroeTakeCounter,
                clocks: game.clocks,
                lastTurnTimestamp: game.lastTurnTimestamp,
                moves: game.moves || [],
                moves: game.moves || [],
            });
            logger.debug('Setup', `randomize_setup result: turn=${game.turn}, phase=${game.phase}, step=${game.setupStep}`);

            // Trigger bot if it's its turn
            setImmediate(() => triggerBotMoveIfNeeded(gameId));
        } catch (e) {
            logger.error('Setup', 'Error in randomize_setup:', e);
        }
    });

    socket.on('end_turn_setup', ({ gameId }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game) return;
        if (game.phase === 'Setup') {
            try {
                const response = endTurnSetupNapi({
                    boardJson: JSON.stringify(game.board),
                    piecesJson: JSON.stringify(game.pieces),
                    turn: game.turn,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    colorChosen: game.colorChosen || {},
                    colorsEverChosen: game.colorsEverChosen || [],
                    turnCounter: game.turnCounter || 0,
                    isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                    movesThisTurn: game.movesThisTurn || 0,
                    lockedSequencePiece: game.lockedSequencePiece || undefined,
                    heroeTakeCounter: game.heroeTakeCounter || 0
                });

                updateClocks(game, true);

                game.turn = response.turn;
                game.phase = response.phase;
                game.setupStep = response.setupStep;
                game.turnCounter = response.turnCounter;
                game.isNewTurn = response.isNewTurn;
                // Explicitly reset to 0 — the NAPI passthrough returns whatever was sent in,
                // NOT the new player's count. The new player starts with no placements.
                game.movesThisTurn = 0;
                game.setupPlacementsThisTurn = 0;
                game.lockedSequencePiece = response.lockedSequencePiece;
                game.heroeTakeCounter = response.heroeTakeCounter;

                io.to(gameId).emit('game_update', {
                    pieces: game.pieces,
                    turn: game.turn,
                    colorChosen: game.colorChosen,
                    colorsEverChosen: game.colorsEverChosen,
                    mageUnlocked: game.mageUnlocked,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    turnCounter: game.turnCounter,
                    isNewTurn: game.isNewTurn,
                    movesThisTurn: game.movesThisTurn,
                    lockedSequencePiece: game.lockedSequencePiece || null,
                    heroeTakeCounter: game.heroeTakeCounter,
                    clocks: game.clocks,
                    lastTurnTimestamp: game.lastTurnTimestamp,
                    moves: game.moves || [],
                moves: game.moves || [],
                });
                logger.debug('Setup', `Turn ended in ${gameId}: now ${game.turn}'s turn`);

                // Always try to trigger bot if applicable
                setImmediate(() => triggerBotMoveIfNeeded(gameId));
            } catch (e) {
                logger.error('Setup', 'Error in end_turn_setup:', e);
            }
        }
    });

    socket.on('pass_turn_playing', ({ gameId }) => {
        const game = lobby.activeGames.get(gameId);
        if (game) {
            try {
                const response = passTurnPlayingNapi({
                    boardJson: JSON.stringify(game.board),
                    piecesJson: JSON.stringify(game.pieces),
                    turn: game.turn,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    colorChosen: game.colorChosen || {},
                    colorsEverChosen: game.colorsEverChosen || [],
                    turnCounter: game.turnCounter || 0,
                    isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                    movesThisTurn: game.movesThisTurn || 0,
                    lockedSequencePiece: game.lockedSequencePiece || undefined,
                    heroeTakeCounter: game.heroeTakeCounter || 0,
                    pieceId: "", // Dummy for request compatibility
                    targetPoly: "" // Dummy for request compatibility
                });
                
                updateClocks(game, true);

                // Track consecutive passes — 3 in a row = loss
                const passingSide = game.turn; // turn hasn't changed yet
                if (!game.passCount) game.passCount = { white: 0, black: 0 };
                game.passCount[passingSide] = (game.passCount[passingSide] || 0) + 1;

                game.turn = response.turn;
                game.phase = response.phase;
                game.setupStep = response.setupStep;
                game.turnCounter = response.turnCounter;
                game.isNewTurn = response.isNewTurn;
                game.movesThisTurn = response.movesThisTurn;
                game.lockedSequencePiece = response.lockedSequencePiece;
                game.heroeTakeCounter = response.heroeTakeCounter;
                game.colorChosen = response.colorChosen;
                game.colorsEverChosen = response.colorsEverChosen;
                game.mageUnlocked = response.mageUnlocked;

                if (game.passCount[passingSide] >= 3) {
                    game.phase = 'GameOver';
                    const winnerId = passingSide === 'white' ? game.black : game.white;
                    const winnerSide = passingSide === 'white' ? 'black' : 'white';
                    logger.info('Game', `Game Over: ${gameId} - ${passingSide} passed 3 times`);
                    io.to(gameId).emit('game_over', { winnerId, winnerSide, reason: 'pass_limit' });
                    saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves, io)
                        .catch(err => logger.error('Game', `Failed to save pass-limit game ${gameId}:`, err));
                    releaseBotIfNeeded(game);
                    lobby.activeGames.delete(gameId);
                    broadcastLobbyUpdate(io);
                    return;
                }

                io.to(gameId).emit('game_update', {
                    pieces: game.pieces,
                    turn: game.turn,
                    colorChosen: game.colorChosen,
                    colorsEverChosen: game.colorsEverChosen,
                    mageUnlocked: game.mageUnlocked,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    turnCounter: game.turnCounter,
                    isNewTurn: game.isNewTurn,
                    movesThisTurn: game.movesThisTurn,
                    lockedSequencePiece: game.lockedSequencePiece || null,
                    heroeTakeCounter: game.heroeTakeCounter,
                    clocks: game.clocks,
                    lastTurnTimestamp: game.lastTurnTimestamp,
                    moves: game.moves || [],
                    passCount: game.passCount
                });
                logger.debug('Move', `Turn passed in ${gameId}: now ${game.turn}'s turn (${passingSide} passCount: ${game.passCount[passingSide]})`);

                // Always try to trigger bot if applicable
                setImmediate(() => triggerBotMoveIfNeeded(gameId));
            } catch (e) {
                logger.error('Move', 'Error in pass_turn_playing:', e);
            }
        }
    });

    // ── Hero bonus voluntary end ──────────────────────────────────────────────
    // Called when the player clicks "End Turn" while heroe_take_counter > 0.
    // Ends the turn cleanly without incrementing the 3-pass-loss counter.
    socket.on('end_heroe_bonus', ({ gameId }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game || game.phase === 'GameOver') return;
        // Guard: only valid during an active hero bonus window.
        if (!game.heroeTakeCounter || game.heroeTakeCounter < 1) return;
        try {
            const response = endHeroeBonusNapi({
                boardJson:           JSON.stringify(game.board),
                piecesJson:          JSON.stringify(game.pieces),
                turn:                game.turn,
                phase:               game.phase,
                setupStep:           game.setupStep,
                colorChosen:         game.colorChosen || {},
                colorsEverChosen:    game.colorsEverChosen || [],
                turnCounter:         game.turnCounter || 0,
                isNewTurn:           game.isNewTurn !== undefined ? game.isNewTurn : true,
                movesThisTurn:       game.movesThisTurn || 0,
                lockedSequencePiece: game.lockedSequencePiece || undefined,
                heroeTakeCounter:    game.heroeTakeCounter || 0,
                pieceId:    '',
                targetPoly: ''
            });

            updateClocks(game, true);
            // Intentionally NO passCount increment — this is not a pass penalty.

            game.turn                = response.turn;
            game.phase               = response.phase;
            game.setupStep           = response.setupStep;
            game.turnCounter         = response.turnCounter;
            game.isNewTurn           = response.isNewTurn;
            game.movesThisTurn       = response.movesThisTurn;
            game.lockedSequencePiece = response.lockedSequencePiece;
            game.heroeTakeCounter    = response.heroeTakeCounter;
            game.colorChosen         = response.colorChosen;
            game.colorsEverChosen    = response.colorsEverChosen;
            game.mageUnlocked        = response.mageUnlocked;

            io.to(gameId).emit('game_update', {
                pieces:              game.pieces,
                turn:                game.turn,
                colorChosen:         game.colorChosen,
                colorsEverChosen:    game.colorsEverChosen,
                mageUnlocked:        game.mageUnlocked,
                phase:               game.phase,
                setupStep:           game.setupStep,
                turnCounter:         game.turnCounter,
                isNewTurn:           game.isNewTurn,
                movesThisTurn:       game.movesThisTurn,
                lockedSequencePiece: game.lockedSequencePiece || null,
                heroeTakeCounter:    game.heroeTakeCounter,
                clocks:              game.clocks,
                lastTurnTimestamp:   game.lastTurnTimestamp,
                moves:               game.moves || [],
                passCount:           game.passCount
            });
            logger.debug('Move', `end_heroe_bonus in ${gameId}: turn → ${game.turn}`);
            setImmediate(() => triggerBotMoveIfNeeded(gameId));
        } catch (e) {
            logger.error('Move', 'Error in end_heroe_bonus:', e);
        }
    });

    socket.on('resign', ({ gameId }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game || game.phase === 'GameOver') return;

        // Identify the resigning side by socket ID
        let resigningSide = null;
        if (socket.id === game.whiteSocketId) resigningSide = 'white';
        else if (socket.id === game.blackSocketId) resigningSide = 'black';
        if (!resigningSide) return; // spectator / unknown

        game.phase = 'GameOver';
        const winnerSide = resigningSide === 'white' ? 'black' : 'white';
        const winnerId = winnerSide === 'white' ? game.white : game.black;

        logger.info('Game', `Game Over: ${gameId} - ${resigningSide} resigned`);
        io.to(gameId).emit('game_over', { winnerId, winnerSide, reason: 'resign' });

        saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves, io)
            .catch(err => logger.error('Game', `Failed to save resigned game ${gameId}:`, err));

        releaseBotIfNeeded(game);
        lobby.activeGames.delete(gameId);
        broadcastLobbyUpdate(io);
    });

    socket.on('get_legal_moves', ({ gameId, pieceId }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game) return;

        try {
            const response = getLegalMovesNapi({
                boardJson: JSON.stringify(game.board),
                piecesJson: JSON.stringify(game.pieces),
                pieceId: pieceId,
                turn: game.turn,
                phase: game.phase,
                setupStep: game.setupStep,
                colorChosen: game.colorChosen || {},
                colorsEverChosen: game.colorsEverChosen || [],
                turnCounter: game.turnCounter || 0,
                isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                movesThisTurn: game.movesThisTurn || 0,
                lockedSequencePiece: game.lockedSequencePiece || undefined,
                heroeTakeCounter: game.heroeTakeCounter || 0
            });
            game.colorChosen = response.colorChosen;
            game.colorsEverChosen = response.colorsEverChosen;
            game.mageUnlocked = response.mageUnlocked;
            game.phase = response.phase;
            game.setupStep = response.setupStep;
            game.turn = response.turn;
            game.turnCounter = response.turnCounter;
            game.isNewTurn = response.isNewTurn;
            game.movesThisTurn = response.movesThisTurn;
            game.lockedSequencePiece = response.lockedSequencePiece;
            game.heroeTakeCounter = response.heroeTakeCounter;

            socket.emit('legal_moves', { 
                pieceId, 
                targets: response.targets, 
                colorChosen: response.colorChosen,
                turn: game.turn,
                phase: game.phase,
                setupStep: game.setupStep,
                isNewTurn: game.isNewTurn,
                lockedSequencePiece: game.lockedSequencePiece || null
            });
        } catch (e) {
            logger.error('Move', 'Error getting legal moves:', e);
        }
    });

    // ---------------------------------------------------------------------------
    // Helper: returns true if the player (side) still has unplaced pieces for
    // the current setup step. Used to auto-pass when a player places their last
    // piece and no manual "End Turn" click should be required.
    // NOTE: Rust serializes piece_type as "type" (lowercase) and Side as lowercase.
    // ---------------------------------------------------------------------------
    function hasRemainingSetupPieces(pieces, side, setupStep) {
        return pieces.some(p => {
            if ((p.side || '').toLowerCase() !== side.toLowerCase()) return false;
            if (p.position !== 'returned') return false;
            // step 4 = Ghouls + Sirens
            if (setupStep === 4) return p.type === 'ghoul' || p.type === 'siren';
            const typeMap = { 0: 'goddess', 1: 'heroe', 2: 'minotaur', 3: 'witch' };
            return p.type === typeMap[setupStep];
        });
    }

    // Redundant select_color removed (frontend uses color_selected)

    socket.on('apply_move', ({ gameId, pieceId, targetPoly }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game) return;

        try {
            if (game.phase === 'Setup') {
                const pieceIndex = game.pieces.findIndex(p => p.id === pieceId);
                if (pieceIndex === -1) return;
                const piece = game.pieces[pieceIndex];
                if (piece.position !== 'returned') return;
                
                game.pieces[pieceIndex] = { ...piece, position: targetPoly };
                // Record setup placement move
                game.moves.push({ turn_number: 0, active_side: game.turn, phase: 'setup', chosen_color: '', piece_id: pieceId, target_id: targetPoly, timestamp_ms: Date.now() });

                // Track how many pieces have been placed this turn so the
                // "End Turn" guard (movesThisTurn === 0) works for human players.
                game.movesThisTurn = (game.movesThisTurn || 0) + 1;
                game.setupPlacementsThisTurn = (game.setupPlacementsThisTurn || 0) + 1;

                updateClocks(game, true);

                // Auto-pass: if the current player has no more pieces for this
                // step, advance the turn immediately — no "End Turn" click needed.
                const stillHasPieces = hasRemainingSetupPieces(game.pieces, game.turn, game.setupStep);
                if (!stillHasPieces) {
                    const response = endTurnSetupNapi({
                        boardJson: JSON.stringify(game.board),
                        piecesJson: JSON.stringify(game.pieces),
                        turn: game.turn,
                        phase: game.phase,
                        setupStep: game.setupStep,
                        colorChosen: game.colorChosen || {},
                        colorsEverChosen: game.colorsEverChosen || [],
                        turnCounter: game.turnCounter || 0,
                        isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                        movesThisTurn: game.movesThisTurn || 0,
                        lockedSequencePiece: game.lockedSequencePiece || undefined,
                        heroeTakeCounter: game.heroeTakeCounter || 0
                    });
                    game.turn = response.turn;
                    game.phase = response.phase;
                    game.setupStep = response.setupStep;
                    game.turnCounter = response.turnCounter;
                    game.isNewTurn = response.isNewTurn;
                    game.movesThisTurn = 0;
                    game.setupPlacementsThisTurn = 0;
                    game.lockedSequencePiece = response.lockedSequencePiece;
                    game.heroeTakeCounter = response.heroeTakeCounter;
                    logger.debug('Setup', `Auto end-turn after last piece: ${pieceId} → ${targetPoly} | turn=${game.turn}, step=${game.setupStep}, phase=${game.phase}`);
                } else {
                    logger.debug('Setup', `Piece placement in ${gameId}: ${pieceId} → ${targetPoly} (movesThisTurn=${game.movesThisTurn})`);
                }

                io.to(gameId).emit('game_update', {
                    pieces: game.pieces,
                    turn: game.turn,
                    colorChosen: game.colorChosen,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    turnCounter: game.turnCounter,
                    isNewTurn: game.isNewTurn,
                    movesThisTurn: game.movesThisTurn,
                    lockedSequencePiece: game.lockedSequencePiece || null,
                    heroeTakeCounter: game.heroeTakeCounter,
                    clocks: game.clocks,
                    lastTurnTimestamp: game.lastTurnTimestamp,
                    moves: game.moves || [],
                moves: game.moves || [],
                });

                // Always try to trigger bot if applicable
                setImmediate(() => triggerBotMoveIfNeeded(gameId));

            } else {
                const response = applyMoveNapi({
                    boardJson: JSON.stringify(game.board),
                    piecesJson: JSON.stringify(game.pieces),
                    pieceId: pieceId,
                    targetPoly: targetPoly,
                    turn: game.turn,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    colorChosen: game.colorChosen || {},
                    colorsEverChosen: game.colorsEverChosen || [],
                    turnCounter: game.turnCounter || 0,
                    isNewTurn: game.isNewTurn !== undefined ? game.isNewTurn : true,
                    movesThisTurn: game.movesThisTurn || 0,
                    lockedSequencePiece: game.lockedSequencePiece || undefined,
                    heroeTakeCounter: game.heroeTakeCounter || 0
                });

                const oldTurn = game.turn;
                
                game.pieces = JSON.parse(response.piecesJson);
                game.colorChosen = response.colorChosen;
                game.colorsEverChosen = response.colorsEverChosen;
                game.mageUnlocked = response.mageUnlocked;
                game.phase = response.phase;
                game.setupStep = response.setupStep;
                if (oldTurn !== response.turn) {
                    updateClocks(game, true);
                    // Turn changed = real move made, reset the mover's pass count
                    if (!game.passCount) game.passCount = { white: 0, black: 0 };
                    game.passCount[oldTurn] = 0;
                }

                game.turn = response.turn;

                game.turnCounter = response.turnCounter;
                game.isNewTurn = response.isNewTurn;
                game.movesThisTurn = response.movesThisTurn;
                game.lockedSequencePiece = response.lockedSequencePiece;
                game.heroeTakeCounter = response.heroeTakeCounter;
                
                game.moves.push({ turn_number: game.turnCounter, active_side: oldTurn, phase: 'playing', chosen_color: game.colorChosen?.[oldTurn] || '', piece_id: pieceId, target_id: targetPoly, timestamp_ms: Date.now() });

                io.to(gameId).emit('game_update', {
                    pieces: game.pieces,
                    turn: game.turn,
                    colorChosen: game.colorChosen,
                    colorsEverChosen: game.colorsEverChosen,
                    mageUnlocked: game.mageUnlocked,
                    phase: game.phase,
                    setupStep: game.setupStep,
                    turnCounter: game.turnCounter,
                    isNewTurn: game.isNewTurn,
                    movesThisTurn: game.movesThisTurn,
                    lockedSequencePiece: game.lockedSequencePiece || null,
                    heroeTakeCounter: game.heroeTakeCounter,
                    clocks: game.clocks,
                    lastTurnTimestamp: game.lastTurnTimestamp,
                    moves: game.moves || [],
                    lastMove: { pieceId, targetPoly, captured: response.captured },
                    passCount: game.passCount
                });

                if (response.phase === 'GameOver') {
                    const winnerSide = response.winner;
                    const winnerId = winnerSide === 'white' ? game.white : game.black;
                    game.phase = 'GameOver';
                    
                    io.to(gameId).emit('game_over', { 
                        winnerId, 
                        winnerSide: response.winner,
                        reason: response.reason 
                    });
                    saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves, io)
                        .catch(err => logger.error('Game', `Failed to save match result for game "${gameId}":`, err));
                    releaseBotIfNeeded(game);
                    lobby.activeGames.delete(gameId);
                    broadcastLobbyUpdate(io);
                } else {
                    // Try to trigger bot if applicable
                    setImmediate(() => triggerBotMoveIfNeeded(gameId));
                }

                logger.debug('Move', `Move applied in ${gameId}: ${pieceId} → ${targetPoly}`);
            }
        } catch (e) {
            logger.error('Move', 'Error applying move:', e);
        }
    });

    // join_game_room: legacy + hash-based lookup
    socket.on('join_game_room', ({ gameId }) => {
        socket.join(gameId);
        const game = lobby.activeGames.get(gameId);
        if (game) {
            socket.emit('game_update', {
                pieces: game.pieces,
                turn: game.turn,
                colorChosen: game.colorChosen,
                colorsEverChosen: game.colorsEverChosen,
                mageUnlocked: game.mageUnlocked,
                phase: game.phase,
                setupStep: game.setupStep,
                turnCounter: game.turnCounter,
                isNewTurn: game.isNewTurn,
                movesThisTurn: game.movesThisTurn,
                lockedSequencePiece: game.lockedSequencePiece || null,
                heroeTakeCounter: game.heroeTakeCounter,
                clocks: game.clocks,
                lastTurnTimestamp: game.lastTurnTimestamp,
                moves: game.moves || [],
                moves: game.moves || [],
            });
        }
    });

    socket.on('disconnect', () => {
        lobby.connectedUsers.delete(socket.id);
        
        // Mark players as disconnected in active games
        for (const game of lobby.activeGames.values()) {
            if (game.whiteSocketId === socket.id) {
                game.whiteDisconnectedAt = Date.now();
            } else if (game.blackSocketId === socket.id) {
                game.blackDisconnectedAt = Date.now();
            }
        }

        // Remove any open game request from this socket
        const before = lobby.gameRequests.length;
        lobby.gameRequests = lobby.gameRequests.filter(r => r.socketId !== socket.id);
        if (lobby.gameRequests.length !== before) {
            broadcastLobbyUpdate(io);
        } else {
            // Still broadcast updated user count
            broadcastLobbyUpdate(io);
        }
        logger.debug('Socket', `User disconnected: ${socket.id}`);
    });
});

// --- PRODUCTION STATIC SERVING ---
const possibleDistPaths = [
    path.join(__dirname, '../../frontend/dist'),
    path.join(__dirname, '../dist'),
    path.join(__dirname, '../../dist'),
];

const distPath = possibleDistPaths.find(p => fs.existsSync(p));

if (distPath) {
    app.use(express.static(distPath));
    logger.info('Server', `Serving production assets from: ${distPath}`);

    // Single Page Application (SPA) catch-all
    app.get('*', (req, res, next) => {
        // Skip API, Socket.io, and other backend routes
        if (req.url.startsWith('/socket.io') || 
            req.url.startsWith('/verify-email') || 
            req.url.startsWith('/register') ||
            req.url.startsWith('/login')) {
            return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    logger.warn('Server', 'Production frontend assets (dist) not found in expected locations.');
}

server.listen(PORT, '0.0.0.0', () => {
    logger.info('Server', `Backend server running on port ${PORT}`);
    logger.info('Server', `Log level: ${process.env.LOG_LEVEL || 'info'}`);
});
