/**
 * valkeySync.js — Application-level state replication over Valkey pub/sub.
 *
 * Every Cloud Run instance holds a full replica of lobby.gameRequests and
 * lobby.activeGames.  When any instance mutates state (move, game create,
 * request create, etc.), it publishes a typed message to the 'nd6:sync'
 * Valkey channel.  All other instances receive the message and apply the
 * mutation to their local replica.
 *
 * Messages from the same instance are ignored (via instanceId check).
 *
 * On (re-)connect, the instance writes its full state to Valkey keys so that
 * newly started instances can bootstrap.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
const valkey = require('./valkeyAdapter');
const fs = require('fs');
const path = require('path');

const INSTANCE_ID = uuidv4();
const SYNC_CHANNEL = 'nd6:sync';
const STATE_KEY_GAMES = 'nd6:state:games';
const STATE_KEY_REQUESTS = 'nd6:state:requests';
const STATE_KEY_TOURNAMENTS = 'nd6:state:tournaments';
const FULL_STATE_INTERVAL_MS = 30000; // Write full state to Valkey every 30s

// ── References set during init() ─────────────────────────────────────────────
let lobby = null;          // { gameRequests: [], activeGames: Map }
let loadBoardFn = null;    // (boardName) => boardData  — loads board JSON from disk
let _tournamentManager = null; // Reference to tournamentManager for remote list updates

/**
 * Initialize the sync module.
 *
 * @param {object} lobbyRef      — reference to the lobby state (gameRequests + activeGames)
 * @param {Function} loadBoard   — function(boardName) => board JSON object
 */
function init(lobbyRef, loadBoard, tournamentManagerRef) {
    lobby = lobbyRef;
    loadBoardFn = loadBoard;
    _tournamentManager = tournamentManagerRef || null;

    // Subscribe to the sync channel
    valkey.subscribe(SYNC_CHANNEL, _onSyncMessage);

    // Periodically write full state to Valkey keys for new-instance bootstrap
    setInterval(_writeFullState, FULL_STATE_INTERVAL_MS);

    // On first connect, try to read existing state from Valkey
    // (small delay to let the adapter connect first)
    setTimeout(_bootstrapFromValkey, 3000);

    logger.info('Sync', `Instance ${INSTANCE_ID.slice(0, 8)} initialized.`);
}

/** @returns {string} This instance's unique ID. */
function getInstanceId() {
    return INSTANCE_ID;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SYNC FUNCTIONS — called by index.js after each local mutation
// ─────────────────────────────────────────────────────────────────────────────

/** A new game was created.  Publish full snapshot (minus board geometry). */
function syncGameCreated(hash, game) {
    _publish({ type: 'game:created', hash, state: _extractSyncableState(game) });
}

/** Game state was updated (move, color, setup, clock, etc.). */
function syncGameUpdated(hash, game) {
    _publish({ type: 'game:updated', hash, state: _extractMutableState(game) });
}

/** A game was deleted (game over, timeout, disconnect abandon). */
function syncGameDeleted(hash) {
    _publish({ type: 'game:deleted', hash });
}

/** A new game request was added to the queue. */
function syncRequestCreated(request) {
    // Strip socketId — it's instance-local and meaningless on other instances
    const { socketId, ...rest } = request;
    _publish({ type: 'request:created', request: rest });
}

/** A game request was removed (cancelled, accepted, expired, disconnect). */
function syncRequestRemoved(requestId) {
    _publish({ type: 'request:removed', requestId });
}

/** A player disconnected — sync the disconnectedAt timestamp. */
function syncDisconnect(hash, side, timestamp) {
    _publish({ type: 'game:disconnect', hash, side, timestamp });
}

/**
 * Publish the current tournament list to Valkey so all instances stay in sync.
 * Called after any mutation that changes open/active tournament lists.
 * @param {Array} openTournaments   — from tournamentManager.getOpenTournaments()
 * @param {Array} activeTournaments — from tournamentManager.getActiveTournamentsList()
 */
function syncTournamentList(openTournaments, activeTournaments) {
    const payload = { open: openTournaments, active: activeTournaments };
    // Write to Valkey key for bootstrap
    const client = valkey.getClient();
    if (client) {
        client.set(STATE_KEY_TOURNAMENTS, JSON.stringify(payload), { EX: 3600 })
            .catch(e => logger.warn('Sync', 'Failed to write tournament state:', e.message));
    }
    // Notify other instances immediately via pub/sub
    _publish({ type: 'tournament:sync', payload });
}

/**
 * Read the latest tournament list from Valkey.
 * Returns null if Valkey is unavailable or no data.
 * @returns {Promise<{open: Array, active: Array}|null>}
 */
async function getTournamentListFromValkey() {
    const client = valkey.getClient();
    if (!client) return null;
    try {
        const raw = await client.get(STATE_KEY_TOURNAMENTS);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        logger.warn('Sync', 'Failed to read tournament state from Valkey:', e.message);
        return null;
    }
}

/** A player reconnected — clear the disconnectedAt timestamp. */
function syncReconnect(hash, side) {
    _publish({ type: 'game:reconnect', hash, side });
}

/**
 * Distributed lock for matchmaking.
 * Uses Valkey SET NX EX to ensure only one instance processes a request acceptance.
 *
 * @param {string} requestId
 * @returns {Promise<boolean>} true if this instance acquired the lock
 */
async function tryLockRequest(requestId) {
    const client = valkey.getClient();
    if (!client) {
        // No Valkey = single instance, always succeed
        return true;
    }
    try {
        // SET key value NX EX 10  — set-if-not-exists with 10s expiry
        const result = await client.set(`nd6:lock:request:${requestId}`, INSTANCE_ID, {
            NX: true,
            EX: 10,
        });
        return result === 'OK';
    } catch (e) {
        logger.warn('Sync', `Lock acquisition failed for request ${requestId}:`, e.message);
        // On error, allow the accept to proceed (single-instance fallback)
        return true;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL — message handling
// ─────────────────────────────────────────────────────────────────────────────

function _publish(payload) {
    payload.instanceId = INSTANCE_ID;
    payload.ts = Date.now();
    valkey.publish(SYNC_CHANNEL, JSON.stringify(payload));
}

function _onSyncMessage(raw) {
    let msg;
    try {
        msg = JSON.parse(raw);
    } catch (e) {
        logger.warn('Sync', 'Failed to parse sync message:', e.message);
        return;
    }

    // Ignore own messages
    if (msg.instanceId === INSTANCE_ID) return;

    switch (msg.type) {
        case 'game:created':
            _applyGameCreated(msg);
            break;
        case 'game:updated':
            _applyGameUpdated(msg);
            break;
        case 'game:deleted':
            _applyGameDeleted(msg);
            break;
        case 'request:created':
            _applyRequestCreated(msg);
            break;
        case 'request:removed':
            _applyRequestRemoved(msg);
            break;
        case 'game:disconnect':
            _applyDisconnect(msg);
            break;
        case 'game:reconnect':
            _applyReconnect(msg);
            break;
        case 'tournament:sync':
            _applyTournamentSync(msg);
            break;
        default:
            logger.debug('Sync', `Unknown sync message type: ${msg.type}`);
    }
}

// ── Apply remote mutations locally ───────────────────────────────────────────

function _applyGameCreated(msg) {
    if (!lobby) return;
    const { hash, state } = msg;
    if (lobby.activeGames.has(hash)) return; // already have it

    // Reconstruct full game object from synced state
    const game = _reconstructGame(state);
    if (!game) return;

    lobby.activeGames.set(hash, game);
    logger.debug('Sync', `Received game:created ${hash} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyGameUpdated(msg) {
    if (!lobby) return;
    const { hash, state } = msg;
    const game = lobby.activeGames.get(hash);
    if (!game) {
        // We don't have this game yet — treat as a creation
        const newGame = _reconstructGame(state);
        if (newGame) {
            lobby.activeGames.set(hash, newGame);
            logger.debug('Sync', `Received game:updated for unknown game ${hash}, created locally.`);
        }
        return;
    }

    // Merge mutable fields into the local game object
    _mergeMutableState(game, state);
    logger.debug('Sync', `Received game:updated ${hash} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyGameDeleted(msg) {
    if (!lobby) return;
    const { hash } = msg;
    lobby.activeGames.delete(hash);
    logger.debug('Sync', `Received game:deleted ${hash} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyRequestCreated(msg) {
    if (!lobby) return;
    const { request } = msg;
    // Avoid duplicates
    if (lobby.gameRequests.some(r => r.requestId === request.requestId)) return;
    // Mark as remote (no local socketId)
    request.socketId = null;
    lobby.gameRequests.push(request);
    logger.debug('Sync', `Received request:created ${request.requestId} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyRequestRemoved(msg) {
    if (!lobby) return;
    const { requestId } = msg;
    lobby.gameRequests = lobby.gameRequests.filter(r => r.requestId !== requestId);
    logger.debug('Sync', `Received request:removed ${requestId} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyDisconnect(msg) {
    if (!lobby) return;
    const game = lobby.activeGames.get(msg.hash);
    if (!game) return;
    if (msg.side === 'white') game.whiteDisconnectedAt = msg.timestamp;
    else if (msg.side === 'black') game.blackDisconnectedAt = msg.timestamp;
    logger.debug('Sync', `Received game:disconnect ${msg.hash} ${msg.side} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyReconnect(msg) {
    if (!lobby) return;
    const game = lobby.activeGames.get(msg.hash);
    if (!game) return;
    if (msg.side === 'white') game.whiteDisconnectedAt = null;
    else if (msg.side === 'black') game.blackDisconnectedAt = null;
    logger.debug('Sync', `Received game:reconnect ${msg.hash} ${msg.side} from ${msg.instanceId.slice(0, 8)}`);
}

function _applyTournamentSync(msg) {
    if (!_tournamentManager || !msg.payload) return;
    _tournamentManager.applyRemoteTournamentList(msg.payload.open, msg.payload.active);
    logger.debug('Sync', `Received tournament:sync from ${msg.instanceId.slice(0, 8)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE EXTRACTION / RECONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

/** Extract ALL fields needed to recreate a game on another instance (for game:created). */
function _extractSyncableState(game) {
    return {
        hash: game.hash,
        white: game.white,
        black: game.black,
        whiteName: game.whiteName,
        blackName: game.blackName,
        whiteRole: game.whiteRole,
        blackRole: game.blackRole,
        whiteRating: game.whiteRating,
        blackRating: game.blackRating,
        timeControl: game.timeControl,
        boardName: game.boardName,
        // Mutable game-logic fields
        pieces: game.pieces,
        turn: game.turn,
        phase: game.phase,
        setupStep: game.setupStep,
        colorChosen: game.colorChosen,
        colorsEverChosen: game.colorsEverChosen,
        mageUnlocked: game.mageUnlocked,
        turnCounter: game.turnCounter,
        isNewTurn: game.isNewTurn,
        movesThisTurn: game.movesThisTurn,
        lockedSequencePiece: game.lockedSequencePiece,
        heroeTakeCounter: game.heroeTakeCounter,
        clocks: game.clocks,
        lastTurnTimestamp: game.lastTurnTimestamp,
        passCount: game.passCount,
        moves: game.moves,
        gameStartTimestamp: game.gameStartTimestamp,
        setupPlacementsThisTurn: game.setupPlacementsThisTurn,
        // Disconnect tracking
        whiteDisconnectedAt: game.whiteDisconnectedAt,
        blackDisconnectedAt: game.blackDisconnectedAt,
        // Bot config
        whiteBotConfig: game.whiteBotConfig || null,
        blackBotConfig: game.blackBotConfig || null,
        whiteBotKey: game.whiteBotKey || null,
        blackBotKey: game.blackBotKey || null,
        botThinking: game.botThinking || false,
        // Ownership
        ownerInstanceId: game.ownerInstanceId,
        // Tournament
        tournamentId: game.tournamentId || null,
    };
}

/** Extract only mutable fields (for game:updated — avoids resending immutable data). */
function _extractMutableState(game) {
    return {
        hash: game.hash,
        boardName: game.boardName,
        pieces: game.pieces,
        turn: game.turn,
        phase: game.phase,
        setupStep: game.setupStep,
        colorChosen: game.colorChosen,
        colorsEverChosen: game.colorsEverChosen,
        mageUnlocked: game.mageUnlocked,
        turnCounter: game.turnCounter,
        isNewTurn: game.isNewTurn,
        movesThisTurn: game.movesThisTurn,
        lockedSequencePiece: game.lockedSequencePiece,
        heroeTakeCounter: game.heroeTakeCounter,
        clocks: game.clocks,
        lastTurnTimestamp: game.lastTurnTimestamp,
        passCount: game.passCount,
        moves: game.moves,
        setupPlacementsThisTurn: game.setupPlacementsThisTurn,
        whiteDisconnectedAt: game.whiteDisconnectedAt,
        blackDisconnectedAt: game.blackDisconnectedAt,
        botThinking: game.botThinking || false,
    };
}

/** Reconstruct a full game object from a synced state snapshot. */
function _reconstructGame(state) {
    // Load board geometry from disk
    let board = null;
    if (loadBoardFn && state.boardName) {
        try {
            board = loadBoardFn(state.boardName);
        } catch (e) {
            logger.error('Sync', `Failed to load board '${state.boardName}' for remote game:`, e.message);
            return null;
        }
    }

    return {
        ...state,
        board: board,
        // Instance-local fields — no local socket for remote games
        whiteSocketId: null,
        blackSocketId: null,
    };
}

/** Merge mutable state fields from a remote update into a local game object. */
function _mergeMutableState(game, state) {
    game.pieces = state.pieces;
    game.turn = state.turn;
    game.phase = state.phase;
    game.setupStep = state.setupStep;
    game.colorChosen = state.colorChosen;
    game.colorsEverChosen = state.colorsEverChosen;
    game.mageUnlocked = state.mageUnlocked;
    game.turnCounter = state.turnCounter;
    game.isNewTurn = state.isNewTurn;
    game.movesThisTurn = state.movesThisTurn;
    game.lockedSequencePiece = state.lockedSequencePiece;
    game.heroeTakeCounter = state.heroeTakeCounter;
    game.clocks = state.clocks;
    game.lastTurnTimestamp = state.lastTurnTimestamp;
    game.passCount = state.passCount;
    game.moves = state.moves;
    game.setupPlacementsThisTurn = state.setupPlacementsThisTurn;
    game.whiteDisconnectedAt = state.whiteDisconnectedAt;
    game.blackDisconnectedAt = state.blackDisconnectedAt;
    game.botThinking = state.botThinking || false;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL STATE PERSISTENCE (for new-instance bootstrap)
// ─────────────────────────────────────────────────────────────────────────────

/** Write full lobby state to Valkey keys so new instances can bootstrap. */
async function _writeFullState() {
    const client = valkey.getClient();
    if (!client || !lobby) return;

    try {
        // Games: extract syncable state for each active game
        const games = {};
        for (const [hash, game] of lobby.activeGames) {
            games[hash] = _extractSyncableState(game);
        }
        await client.set(STATE_KEY_GAMES, JSON.stringify(games), { EX: 120 });

        // Requests: strip instance-local socketId
        const requests = lobby.gameRequests.map(r => {
            const { socketId, ...rest } = r;
            return rest;
        });
        await client.set(STATE_KEY_REQUESTS, JSON.stringify(requests), { EX: 120 });
    } catch (e) {
        logger.warn('Sync', 'Failed to write full state to Valkey:', e.message);
    }
}

/** Read full state from Valkey keys on startup (bootstrap from existing instances). */
async function _bootstrapFromValkey() {
    const client = valkey.getClient();
    if (!client || !lobby) return;

    try {
        // Bootstrap games
        const gamesRaw = await client.get(STATE_KEY_GAMES);
        if (gamesRaw) {
            const games = JSON.parse(gamesRaw);
            let count = 0;
            for (const [hash, state] of Object.entries(games)) {
                if (!lobby.activeGames.has(hash)) {
                    const game = _reconstructGame(state);
                    if (game) {
                        lobby.activeGames.set(hash, game);
                        count++;
                    }
                }
            }
            if (count > 0) {
                logger.info('Sync', `Bootstrapped ${count} active game(s) from Valkey.`);
            }
        }

        // Bootstrap requests
        const requestsRaw = await client.get(STATE_KEY_REQUESTS);
        if (requestsRaw) {
            const requests = JSON.parse(requestsRaw);
            let count = 0;
            for (const req of requests) {
                if (!lobby.gameRequests.some(r => r.requestId === req.requestId)) {
                    req.socketId = null; // remote request
                    lobby.gameRequests.push(req);
                    count++;
                }
            }
            if (count > 0) {
                logger.info('Sync', `Bootstrapped ${count} game request(s) from Valkey.`);
            }
        }
    } catch (e) {
        logger.debug('Sync', 'Bootstrap from Valkey skipped (no data or error):', e.message);
    }
}

module.exports = {
    init,
    getInstanceId,
    syncGameCreated,
    syncGameUpdated,
    syncGameDeleted,
    syncRequestCreated,
    syncRequestRemoved,
    syncDisconnect,
    syncReconnect,
    tryLockRequest,
    syncTournamentList,
    getTournamentListFromValkey,
};
