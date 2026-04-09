require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { initDb, getUsersDb } = require('./db');
const { generateGuestId } = require('./utils/auth');
const fs = require('fs');
const path = require('path');
const { sendVerificationEmail } = require('./utils/email');
let getLegalMovesNapi, applyMoveNapi, initGameStateNapi, randomizeSetupNapi, endTurnSetupNapi, passTurnPlayingNapi, selectColorNapi, replayToStepNapi;

try {
    const napi = require('../rust-napi');
    getLegalMovesNapi = napi.getLegalMovesNapi;
    applyMoveNapi = napi.applyMoveNapi;
    initGameStateNapi = napi.initGameStateNapi;
    randomizeSetupNapi = napi.randomizeSetupNapi;
    endTurnSetupNapi = napi.endTurnSetupNapi;
    passTurnPlayingNapi = napi.passTurnPlayingNapi;
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

const { saveMatchResult } = require('./utils/gameStorage');

// --- BOT SERVER INTEGRATION ---
const BOT_SERVER_URL = process.env.BOT_SERVER_URL || 'http://localhost:5001';

// Available bot models (fetched from bot server) and busy tracking
let availableBots = [];  // [{agent_type, model_name, display_name}]
const busyBots = new Map(); // key: "agent_type:model_name" → gameId

async function fetchAvailableBots() {
    const prevCount = availableBots.length;
    try {
        const resp = await fetch(`${BOT_SERVER_URL}/models`, { signal: AbortSignal.timeout(3000) });
        if (resp.ok) {
            const data = await resp.json();
            availableBots = data.models || [];
        } else {
            availableBots = [];
        }
    } catch (e) {
        availableBots = [];
    }
    // Broadcast only when availability changes (server comes up, goes down, or model count changes)
    if (availableBots.length !== prevCount) {
        console.log(`[Bot] Bot availability changed: ${prevCount} → ${availableBots.length} models`);
        if (typeof io !== 'undefined') broadcastLobbyUpdate(io);
    }
}

// Poll every 10s so the panel appears/disappears quickly when the bot server starts/stops
fetchAvailableBots();
setInterval(fetchAvailableBots, 60000);

function getBotKey(agentType, modelName) {
    return `${agentType}:${modelName}`;
}

function getBotsForLobby() {
    return availableBots.map(b => ({
        ...b,
        busy: busyBots.has(getBotKey(b.agent_type, b.model_name)),
    }));
}

function releaseBotIfNeeded(game) {
    if (game && game.botKey) {
        busyBots.delete(game.botKey);
        console.log(`[Bot] Released bot ${game.botKey}`);
    }
}

/**
 * Sends the current game state to the Bot Server and returns a move.
 * @returns {Promise<{action, piece, target, color}>}
 */
async function requestBotMove(game) {
    const payload = {
        agent_type: game.botConfig.type,
        model_name: game.botConfig.modelName || null,
        mcts_budget_ms: game.botConfig.budgetMs || 500,
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
    if (!game || !game.botSide || game.phase === 'GameOver') {
        console.log(`[Bot] triggerBotMoveIfNeeded(${gameId}): SKIP — game=${!!game}, botSide=${game?.botSide}, phase=${game?.phase}`);
        return;
    }
    if (game.turn !== game.botSide) {
        console.log(`[Bot] triggerBotMoveIfNeeded(${gameId}): SKIP — turn=${game.turn} !== botSide=${game.botSide}`);
        return;
    }
    if (game.botThinking) {
        console.log(`[Bot] triggerBotMoveIfNeeded(${gameId}): SKIP — already thinking`);
        return;
    }

    console.log(`[Bot] triggerBotMoveIfNeeded(${gameId}): STARTING — phase=${game.phase}, turn=${game.turn}, botSide=${game.botSide}, isNewTurn=${game.isNewTurn}`);
    game.botThinking = true;
    try {
        // ── Setup phase: call bot server for each piece placement ──
        if (game.phase === 'Setup') {
            // Ask the bot server for one placement at a time
            console.log(`[Bot] Setup: calling bot server for gameId=${gameId}, step=${game.setupStep}, turn=${game.turn}`);
            const botMove = await requestBotMove(game);
            console.log(`[Bot] Setup: bot server responded: ${JSON.stringify(botMove)}`);
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

                    console.log(`[Bot] Setup placement: ${botMove.piece} → ${botMove.target}`);
                }
                // Continue placing pieces
                setImmediate(() => triggerBotMoveIfNeeded(gameId));
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

                console.log(`[Bot] Setup turn ended: phase=${currentGame.phase}, setupStep=${currentGame.setupStep}, turn=${currentGame.turn}`);

                // If still the bot's turn (more setup steps or just transitioned to Playing)
                if (currentGame.turn === currentGame.botSide) {
                    setImmediate(() => triggerBotMoveIfNeeded(gameId));
                }
                return;
            }
        }


        // ── Playing phase: ask the Bot Server ──
        console.log(`[Bot] Playing: calling bot server for gameId=${gameId}, turn=${game.turn}, isNewTurn=${game.isNewTurn}`);
        const botMove = await requestBotMove(game);
        console.log(`[Bot] Playing: bot server responded: ${JSON.stringify(botMove)}`);

        // Re-fetch game after await (might have been deleted)
        const currentGame = lobby.activeGames.get(gameId);
        if (!currentGame || currentGame.phase === 'GameOver') return;

        if (botMove.action === 'color') {
            // Bot chose a color
            io.to(gameId).emit('force_bot_action', {
                type: 'color',
                color: botMove.color
            });
            // Apply it server-side too
            const fakeSocket = { id: 'bot' };
            const response = selectColorNapi({
                boardJson: JSON.stringify(currentGame.board),
                piecesJson: JSON.stringify(currentGame.pieces),
                color: botMove.color,
                turn: currentGame.turn,
                phase: currentGame.phase,
                setupStep: currentGame.setupStep,
                colorChosen: currentGame.colorChosen || {},
                colorsEverChosen: currentGame.colorsEverChosen || [],
                turnCounter: currentGame.turnCounter || 0,
                isNewTurn: currentGame.isNewTurn,
                movesThisTurn: currentGame.movesThisTurn || 0,
                lockedSequencePiece: currentGame.lockedSequencePiece || undefined,
                heroeTakeCounter: currentGame.heroeTakeCounter || 0,
            });
            currentGame.pieces = JSON.parse(response.piecesJson);
            currentGame.turn = response.turn;
            currentGame.colorChosen = response.colorChosen;
            currentGame.colorsEverChosen = response.colorsEverChosen;
            currentGame.mageUnlocked = response.mageUnlocked;
            currentGame.phase = response.phase;
            currentGame.setupStep = response.setupStep;
            currentGame.turnCounter = response.turnCounter;
            currentGame.isNewTurn = response.isNewTurn;
            currentGame.movesThisTurn = response.movesThisTurn;
            currentGame.lockedSequencePiece = response.lockedSequencePiece;
            currentGame.heroeTakeCounter = response.heroeTakeCounter;
            io.to(gameId).emit('game_update', {
                pieces: currentGame.pieces, turn: currentGame.turn,
                colorChosen: currentGame.colorChosen, colorsEverChosen: currentGame.colorsEverChosen,
                mageUnlocked: currentGame.mageUnlocked, phase: currentGame.phase,
                setupStep: currentGame.setupStep, turnCounter: currentGame.turnCounter,
                isNewTurn: currentGame.isNewTurn, movesThisTurn: currentGame.movesThisTurn,
                lockedSequencePiece: currentGame.lockedSequencePiece || null,
                heroeTakeCounter: currentGame.heroeTakeCounter,
                clocks: currentGame.clocks, lastTurnTimestamp: currentGame.lastTurnTimestamp,
                        moves: currentGame.moves || [],
            });
            // Bot may need to make more moves in same turn
            setImmediate(() => triggerBotMoveIfNeeded(gameId));

        } else if (botMove.action === 'move' && botMove.piece && botMove.target) {
            // Bot made a move
            const oldTurn = currentGame.turn;
            const response = applyMoveNapi({
                boardJson: JSON.stringify(currentGame.board),
                piecesJson: JSON.stringify(currentGame.pieces),
                pieceId: botMove.piece,
                targetPoly: botMove.target,
                turn: currentGame.turn,
                phase: currentGame.phase,
                setupStep: currentGame.setupStep,
                colorChosen: currentGame.colorChosen || {},
                colorsEverChosen: currentGame.colorsEverChosen || [],
                turnCounter: currentGame.turnCounter || 0,
                isNewTurn: currentGame.isNewTurn,
                movesThisTurn: currentGame.movesThisTurn || 0,
                lockedSequencePiece: currentGame.lockedSequencePiece || undefined,
                heroeTakeCounter: currentGame.heroeTakeCounter || 0,
            });
            currentGame.pieces = JSON.parse(response.piecesJson);
            currentGame.colorChosen = response.colorChosen;
            currentGame.colorsEverChosen = response.colorsEverChosen;
            currentGame.mageUnlocked = response.mageUnlocked;
            currentGame.phase = response.phase;
            currentGame.setupStep = response.setupStep;
            if (oldTurn !== response.turn) updateClocks(currentGame, true);
            currentGame.turn = response.turn;
            currentGame.turnCounter = response.turnCounter;
            currentGame.isNewTurn = response.isNewTurn;
            currentGame.movesThisTurn = response.movesThisTurn;
            currentGame.lockedSequencePiece = response.lockedSequencePiece;
            currentGame.heroeTakeCounter = response.heroeTakeCounter;
            currentGame.moves.push({ turn_number: currentGame.turnCounter, active_side: oldTurn, phase: 'playing', chosen_color: currentGame.colorChosen?.[oldTurn] || '', piece_id: botMove.piece, target_id: botMove.target, timestamp_ms: Date.now() });

            io.to(gameId).emit('game_update', {
                pieces: currentGame.pieces, turn: currentGame.turn,
                colorChosen: currentGame.colorChosen, colorsEverChosen: currentGame.colorsEverChosen,
                mageUnlocked: currentGame.mageUnlocked, phase: currentGame.phase,
                setupStep: currentGame.setupStep, turnCounter: currentGame.turnCounter,
                isNewTurn: currentGame.isNewTurn, movesThisTurn: currentGame.movesThisTurn,
                lockedSequencePiece: currentGame.lockedSequencePiece || null,
                heroeTakeCounter: currentGame.heroeTakeCounter,
                clocks: currentGame.clocks, lastTurnTimestamp: currentGame.lastTurnTimestamp,
                        moves: currentGame.moves || [],
                lastMove: { pieceId: botMove.piece, targetPoly: botMove.target, captured: response.captured },
            });

            if (response.phase === 'GameOver') {
                const winnerSide = response.winner;
                const winnerId = winnerSide === 'white' ? currentGame.white : currentGame.black;
                currentGame.phase = 'GameOver';
                io.to(gameId).emit('game_over', { 
                    winnerId, 
                    winnerSide: response.winner,
                    reason: response.reason 
                });
                saveMatchResult(gameId, currentGame.gameStartTimestamp, currentGame.whiteName, currentGame.blackName, currentGame.white, currentGame.black, currentGame.boardName, winnerSide, currentGame.moves)
                    .catch(err => console.error(`Bot game save error ${gameId}:`, err));
                releaseBotIfNeeded(currentGame);
                lobby.activeGames.delete(gameId);
                broadcastLobbyUpdate(io);
            } else {
                // Bot might need to continue its turn (chaining)
                setImmediate(() => triggerBotMoveIfNeeded(gameId));
            }

        } else if (botMove.action === 'pass') {
            // Bot passes
            const response = passTurnPlayingNapi({
                boardJson: JSON.stringify(currentGame.board),
                piecesJson: JSON.stringify(currentGame.pieces),
                turn: currentGame.turn, phase: currentGame.phase,
                setupStep: currentGame.setupStep,
                colorChosen: currentGame.colorChosen || {},
                colorsEverChosen: currentGame.colorsEverChosen || [],
                turnCounter: currentGame.turnCounter || 0,
                isNewTurn: currentGame.isNewTurn,
                movesThisTurn: currentGame.movesThisTurn || 0,
                lockedSequencePiece: currentGame.lockedSequencePiece || undefined,
                heroeTakeCounter: currentGame.heroeTakeCounter || 0,
                pieceId: '', targetPoly: ''
            });
            updateClocks(currentGame, true);
            currentGame.turn = response.turn;
            currentGame.phase = response.phase;
            currentGame.setupStep = response.setupStep;
            currentGame.turnCounter = response.turnCounter;
            currentGame.isNewTurn = response.isNewTurn;
            currentGame.movesThisTurn = response.movesThisTurn;
            currentGame.lockedSequencePiece = response.lockedSequencePiece;
            currentGame.heroeTakeCounter = response.heroeTakeCounter;
            currentGame.colorChosen = response.colorChosen;
            currentGame.colorsEverChosen = response.colorsEverChosen;
            currentGame.mageUnlocked = response.mageUnlocked;
            io.to(gameId).emit('game_update', {
                pieces: currentGame.pieces, turn: currentGame.turn,
                colorChosen: currentGame.colorChosen, colorsEverChosen: currentGame.colorsEverChosen,
                mageUnlocked: currentGame.mageUnlocked, phase: currentGame.phase,
                setupStep: currentGame.setupStep, turnCounter: currentGame.turnCounter,
                isNewTurn: currentGame.isNewTurn, movesThisTurn: currentGame.movesThisTurn,
                lockedSequencePiece: currentGame.lockedSequencePiece || null,
                heroeTakeCounter: currentGame.heroeTakeCounter,
                clocks: currentGame.clocks, lastTurnTimestamp: currentGame.lastTurnTimestamp,
                        moves: currentGame.moves || [],
            });
        }
    } catch (err) {
        console.error(`[Bot] Error computing move for game ${gameId}:`, err.message);
        // Notify the human player that the bot had an error
        const g = lobby.activeGames.get(gameId);
        if (g) {
            const humanSocketId = game.botSide === 'white' ? g.blackSocketId : g.whiteSocketId;
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
        console.log(`Detected ${boardPool.length} boards for on-demand loading.`);
    } catch (e) {
        console.error("Critical error: No boards detected in utils/boards.", e.message);
    }
}

loadBoards();

const app = express();
app.use(express.json()); // Enable JSON parsing
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 4000;

// Initialize Database
initDb().then(() => {
    console.log('DuckDB Neo initialized successfully');
}).catch(err => {
    console.error('Failed to initialize DuckDB Neo:', err);
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
        console.error('Replay error:', e);
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

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const con = await getUsersDb().connect();
        
        try {
            await con.run(`
                INSERT INTO users (id, username, email, password_hash, role, verification_token, token_expires_at)
                VALUES (?, ?, ?, ?, 'registered', ?, ?)
            `, [userId, username, email, passwordHash, verificationToken, expiresAt.toISOString()]);

            // Create empty profile
            await con.run(`INSERT INTO profiles (user_id) VALUES (?)`, [userId]);

            // Send verification email
            try {
                await sendVerificationEmail(email, verificationToken);
                res.status(201).json({ message: 'User registered. Please check your email for verification.' });
            } catch (emailError) {
                res.status(201).json({ message: 'User registered, but failed to send verification email.' });
            }
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
        console.error('Verification error:', err);
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

        if (!isVerified) {
            return res.status(401).json({ error: 'Please verify your email before logging in.' });
        }

        const isMatch = await bcrypt.compare(password, passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            id: userId,
            username,
            role,
            rating: Math.round(rating || 1500),
            ratingDeviation: Math.round(ratingDeviation || 350),
            ratingVolatility: ratingVolatility || 0.06,
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
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
    return {
        onlineUsers: lobby.connectedUsers.size,
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
        createdAt: r.createdAt,
    }));
}

function broadcastLobbyUpdate(io) {
    io.to('lobby').emit('lobby_update', {
        gameRequests: buildRequestsList(),
        activeGames: buildActiveGamesList(),
        stats: buildLobbyStats(),
        available_bots: getBotsForLobby(),
    });
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
                console.log(`Game Over: ${gameId} - ${playerType} abandoned (${role})`);
                game.phase = 'GameOver';
                const winnerSide = playerType === 'white' ? 'black' : 'white';
                const winnerId = winnerSide === 'white' ? game.white : game.black;

                io.to(gameId).emit('game_over', { 
                    winnerId, 
                    reason: 'disconnection',
                    message: `${playerType === 'white' ? 'White' : 'Black'} disconnected for too long.`
                });
                
                saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves)
                    .catch(err => console.error(`Failed to save abandoned game ${gameId}:`, err));
                
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
            console.log(`Game Over: ${gameId} - timeout for ${activeSide}`);
            game.clocks[activeSide] = 0;
            game.phase = 'GameOver';
            const winnerSide = activeSide === 'white' ? 'black' : 'white';
            const winnerId = winnerSide === 'white' ? game.white : game.black;

            io.to(gameId).emit('game_over', { winnerId, reason: 'timeout' });
            saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves)
                .catch(err => console.error(`Failed to save timed-out game ${gameId}:`, err));
            
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
        blackRole: gameData.blackRole,
        whiteName: gameData.whiteName,
        blackName: gameData.blackName,
        boardName: gameData.boardName,
    };
}

// --- helper to create a game from two players ---
function createGame(whitePlayer, blackPlayer, timeControl) {
    const hash = getRandomHash();

    const randomBoardFile = boardPool[Math.floor(Math.random() * boardPool.length)];
    const boardName = randomBoardFile ? randomBoardFile.replace('.json', '') : 'unknown';
    let boardData;
    try {
        const boardPath = path.join(BOARDS_PATH, randomBoardFile);
        boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
    } catch (err) {
        console.error(`Failed to lazy-load board ${randomBoardFile}:`, err);
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
        console.error('Error initializing game via NAPI:', e);
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
        whiteDisconnectedAt: null,
        blackDisconnectedAt: null,
    };

    lobby.activeGames.set(hash, gameData);
    return { hash, gameData };
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    lobby.connectedUsers.add(socket.id);
    broadcastLobbyUpdate(io);

    // Legacy join_lobby (kept for backward compat with registered login flow)
    socket.on('join_lobby', ({ userId, role } = {}) => {
        const id = userId || generateGuestId();
        const userRole = role || 'guest';
        socket.userId = id;
        socket.userRole = userRole;
        socket.emit('assigned_id', { id, role: userRole });
        console.log(`User ${id} (${userRole}) joined the lobby`);
    });

    // --- ENTER LOBBY: join room + send full state ---
    socket.on('enter_lobby', () => {
        socket.join('lobby');
        socket.emit('lobby_state', {
            gameRequests: buildRequestsList(),
            activeGames: buildActiveGamesList(),
            stats: buildLobbyStats(),
            available_bots: getBotsForLobby(),
        });
    });

    // --- CREATE GAME REQUEST ---
    socket.on('create_game_request', ({ timeControl, userId, username, role }) => {
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
            createdAt: Date.now(),
        });

        socket.emit('request_created', { requestId });
        broadcastLobbyUpdate(io);
        console.log(`Game request ${requestId} created by ${effectiveUserId} (${effectiveRole})`);
    });

    // --- CANCEL GAME REQUEST ---
    socket.on('cancel_game_request', ({ requestId }) => {
        lobby.gameRequests = lobby.gameRequests.filter(
            r => !(r.requestId === requestId && r.socketId === socket.id)
        );
        broadcastLobbyUpdate(io);
    });

    // --- ACCEPT GAME REQUEST ---
    socket.on('accept_game_request', ({ requestId, userId, username, role }) => {
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

        const { hash, gameData } = createGame(whitePlayer, blackPlayer, req.timeControl);
        
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
        console.log(`Game created: /games/${hash} — ${whitePlayer.userId} (W) vs ${blackPlayer.userId} (B)`);
    });

    // --- CREATE BOT GAME ---
    socket.on('create_bot_game', ({ userId, username, role, timeControl, botConfig }) => {
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
        const botName = `🤖 ${agentType === 'mcts' ? 'MCTS' : 'GreedyJack'} (${modelName})`;
        const isPlayerWhite = Math.random() > 0.5;

        const humanPlayer = { socketId: socket.id, userId: effectiveUserId, username: effectiveUsername, role: effectiveRole };
        const botPlayer   = { socketId: null, userId: botId, username: botName, role: 'bot' };

        const whitePlayer = isPlayerWhite ? humanPlayer : botPlayer;
        const blackPlayer = isPlayerWhite ? botPlayer   : humanPlayer;

        const { hash, gameData } = createGame(whitePlayer, blackPlayer, timeControl || { minutes: 15, increment: 10 });

        // Mark game as a bot game
        gameData.botSide   = isPlayerWhite ? 'black' : 'white';
        gameData.botConfig = botConfig || { type: 'greedy_jack', modelName: 'rank_002_yYtlgZLn13' };
        gameData.botThinking = false;
        gameData.botKey = botKey;  // For releasing busy state later
        // Bot never disconnects
        if (gameData.botSide === 'white') gameData.whiteDisconnectedAt = null;
        else gameData.blackDisconnectedAt = null;

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
        console.log(`Bot game created: /games/${hash} — ${effectiveUserId} (${playerSide}) vs ${botName}`);

        // If bot is white, trigger its first move (setup phase)
        if (gameData.botSide === 'white') {
            setImmediate(() => triggerBotMoveIfNeeded(hash));
        }
    });


    socket.on('join_game_by_hash', ({ hash, spectator, userId }) => {
        const game = lobby.activeGames.get(hash);
        if (!game) {
            socket.emit('game_joined', { error: 'Game not found or has ended.' });
            return;
        }

        socket.join(hash);

        // Determine if this socket is a player
        let side = 'spectator';
        if (!spectator) {
            if (userId && userId === game.white) {
                side = 'white';
                game.whiteSocketId = socket.id;
                game.whiteDisconnectedAt = null;
            }
            else if (userId && userId === game.black) {
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
            console.log(`[Backend] Authoritative color ${color} set for ${game.turn} by ${side} in game ${gameId}. isNewTurn=${game.isNewTurn}`);
        } catch (error) {
            console.error('Error selecting color:', error);
        }
    });


    socket.on('randomize_setup', ({ gameId, side }) => {
        const game = lobby.activeGames.get(gameId);
        if (!game || game.phase !== 'Setup') {
            console.log(`randomize_setup rejected: game=${!!game}, phase=${game?.phase}`);
            return;
        }

        const oldTurn = game.turn;
        console.log(`[randomize_setup] gameId=${gameId}, side=${side}, turn=${game.turn}, step=${game.setupStep}`);

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
            console.log(`[randomize_setup] result: turn=${game.turn}, phase=${game.phase}, step=${game.setupStep}, botSide=${game.botSide || 'none'}`);

            // If it's now the bot's turn, trigger it
            if (game.botSide && game.turn === game.botSide) {
                console.log(`[randomize_setup] Triggering bot for game ${gameId}`);
                setImmediate(() => triggerBotMoveIfNeeded(gameId));
            }
        } catch (e) {
            console.error('Error in randomize_setup:', e);
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
                console.log(`Setup turn ended in ${gameId}: Now ${game.turn}'s turn`);

                // If it's now the bot's turn, trigger it
                if (game.botSide) setImmediate(() => triggerBotMoveIfNeeded(gameId));
            } catch (e) {
                console.error('Error in end_turn_setup:', e);
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
                    console.log(`Game Over: ${gameId} - ${passingSide} passed 3 times`);
                    io.to(gameId).emit('game_over', { winnerId, winnerSide, reason: 'pass_limit' });
                    saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves)
                        .catch(err => console.error(`Failed to save pass-limit game ${gameId}:`, err));
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
                console.log(`Playing turn passed in ${gameId}: Now ${game.turn}'s turn (${passingSide} passCount: ${game.passCount[passingSide]})`);

                // If it's now the bot's turn, trigger it
                if (game.botSide) setImmediate(() => triggerBotMoveIfNeeded(gameId));
            } catch (e) {
                console.error('Error in pass_turn_playing:', e);
            }
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

        console.log(`Game Over: ${gameId} - ${resigningSide} resigned`);
        io.to(gameId).emit('game_over', { winnerId, winnerSide, reason: 'resign' });

        saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves)
            .catch(err => console.error(`Failed to save resigned game ${gameId}:`, err));

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
            console.error('Error getting legal moves:', e);
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
            const typeMap = { 0: 'goddess', 1: 'heroe', 2: 'golem', 3: 'witch' };
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
                    console.log(`[Setup] Auto end turn after last piece: ${pieceId} → ${targetPoly} | now turn=${game.turn}, step=${game.setupStep}, phase=${game.phase}`);
                } else {
                    console.log(`Setup placement in ${gameId}: ${pieceId} to ${targetPoly} (movesThisTurn=${game.movesThisTurn})`);
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

                // If it is now the bot's turn, trigger it
                if (game.botSide && game.turn === game.botSide && game.phase === 'Setup') {
                    setImmediate(() => triggerBotMoveIfNeeded(gameId));
                }

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
                    saveMatchResult(gameId, game.gameStartTimestamp, game.whiteName, game.blackName, game.white, game.black, game.boardName, winnerSide, game.moves)
                        .catch(err => console.error(`Failed to save match result for game "${gameId}":`, err));
                    releaseBotIfNeeded(game);
                    lobby.activeGames.delete(gameId);
                    broadcastLobbyUpdate(io);
                } else if (game.botSide) {
                    // If it's now the bot's turn, trigger its response
                    setImmediate(() => triggerBotMoveIfNeeded(gameId));
                }

                console.log(`Move applied in ${gameId}: ${pieceId} to ${targetPoly}`);
            }
        } catch (e) {
            console.error('Error applying move:', e);
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
        console.log('User disconnected:', socket.id);
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
    console.log('Serving production assets from:', distPath);

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
    console.warn('WARNING: Production frontend assets (dist) not found in expected locations.');
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
});
