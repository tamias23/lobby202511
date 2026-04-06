require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { initDb, getDb } = require('./db');
const { generateGuestId } = require('./utils/auth');
const fs = require('fs');
const path = require('path');
const { sendVerificationEmail } = require('./utils/email');
let getLegalMovesNapi, applyMoveNapi, initGameStateNapi, randomizeSetupNapi, endTurnSetupNapi, passTurnPlayingNapi, selectColorNapi;

try {
    const napi = require('../rust-napi');
    getLegalMovesNapi = napi.getLegalMovesNapi;
    applyMoveNapi = napi.applyMoveNapi;
    initGameStateNapi = napi.initGameStateNapi;
    randomizeSetupNapi = napi.randomizeSetupNapi;
    endTurnSetupNapi = napi.endTurnSetupNapi;
    passTurnPlayingNapi = napi.passTurnPlayingNapi;
    selectColorNapi = napi.selectColorNapi;
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

        const con = await getDb().connect();
        
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
        const con = await getDb().connect();
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
        const con = await getDb().connect();
        const reader = await con.runAndReadAll(`
            SELECT id, username, password_hash, role, is_verified, rating 
            FROM users WHERE email = ? OR username = ?
        `, [identifier, identifier]);
        
        const rows = reader.getRows();

        if (!rows || rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const [userId, username, passwordHash, role, isVerified, rating] = rows[0];

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
            rating
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- LOBBY STATE ---
const lobby = {
    waitingPlayers: [], // { socketId, userId, rating, role }
    activeGames: new Map() // gameId -> { players, state }
};

function updateClocks(game, turnEnded) {
    const now = Date.now();
    if (!game.lastTurnTimestamp) game.lastTurnTimestamp = now;
    
    if (turnEnded) {
        const elapsedTime = now - game.lastTurnTimestamp;
        const activeSide = game.turn;
        // Apply 100ms grace period per turn
        const deduction = Math.max(0, elapsedTime - 100);
        game.clocks[activeSide] = Math.max(0, game.clocks[activeSide] - deduction + (30 * 1000));
        game.lastTurnTimestamp = now;
    }
}

// Global Timeout Check
setInterval(() => {
    const now = Date.now();
    for (const [gameId, game] of lobby.activeGames) {
        if (!game.lastTurnTimestamp) continue;
        if (game.phase === 'GameOver') continue;

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
            saveMatchResult(gameId, game.white, game.black, winnerId, game.pieces, game.history);
        }
    }
}, 1000);

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Initial onboarding (Identify as Guest if no token provided)
    socket.on('join_lobby', ({ userId, role }) => {
        const id = userId || generateGuestId();
        const userRole = role || 'guest';
        
        socket.emit('assigned_id', { id, role: userRole });
        console.log(`User ${id} (${userRole}) joined the lobby`);
    });

    // Matchmaking Request
    socket.on('request_match', ({ userId, rating }) => {
        // Simple ranked matchmaking (match closest ratings)
        const player = { socketId: socket.id, userId, rating: rating || 1200 };
        
        const opponent = lobby.waitingPlayers.find(p => Math.abs(p.rating - player.rating) < 200);
        
        if (opponent) {
            // Remove opponent from queue
            lobby.waitingPlayers = lobby.waitingPlayers.filter(p => p.socketId !== opponent.socketId);
            
            // 1. Randomize Board Selection
            // 1. Randomize Board Selection (On-demand load)
            const randomBoardFile = boardPool[Math.floor(Math.random() * boardPool.length)];
            let boardData;
            try {
                const boardPath = path.join(BOARDS_PATH, randomBoardFile);
                boardData = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
            } catch (err) {
                console.error(`Failed to lazy-load board ${randomBoardFile}:`, err);
                // Fallback to minimal board structure if somehow the file is missing/invalid
                boardData = { allPolygons: {}, allEdges: {}, pieces: {} }; 
            }

            // 2. Randomize Sides
            const isPlayerWhite = Math.random() > 0.5;
            const whitePlayer = isPlayerWhite ? player : opponent;
            const blackPlayer = isPlayerWhite ? opponent : player;
            
            let initPieces = [];
            let piecesJsonString = "";
            try {
                const response = initGameStateNapi({
                    boardJson: JSON.stringify(boardData),
                    randomSetup: false
                });
                initPieces = JSON.parse(response.piecesJson);
            } catch (e) {
                console.error("Error initializing game via NAPI:", e);
                // The authoritative Rust setup failed.
                initPieces = [];
            }

            const gameId = `game_${Date.now()}`;
            
            const gameData = {
                white: whitePlayer.userId,
                black: blackPlayer.userId,
                board: boardData,
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
                clocks: {
                    white: 15 * 60 * 1000,
                    black: 15 * 60 * 1000
                },
                lastTurnTimestamp: Date.now(),
                history: []
            };
            
            lobby.activeGames.set(gameId, gameData);
            
            io.to(whitePlayer.socketId).emit('match_found', { 
                gameId, 
                side: 'white', 
                opponent: blackPlayer.userId,
                initialState: {
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
                    lastTurnTimestamp: gameData.lastTurnTimestamp
                }
            });
            io.to(blackPlayer.socketId).emit('match_found', { 
                gameId, 
                side: 'black', 
                opponent: whitePlayer.userId,
                initialState: {
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
                    lastTurnTimestamp: gameData.lastTurnTimestamp
                }
            });
            
            console.log(`Match found: ${gameId} between ${player.userId} and ${opponent.userId}`);
        } else {
            lobby.waitingPlayers.push(player);
            socket.emit('waiting_for_opponent');
        }
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
                lastTurnTimestamp: game.lastTurnTimestamp
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

        console.log(`randomize_setup called: gameId=${gameId}, side=${side}, current turn=${game.turn}, step=${game.setupStep}`);

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
            game.pieces = JSON.parse(response.piecesJson);
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
                lastTurnTimestamp: game.lastTurnTimestamp
            });
            console.log(`randomize_setup result: turn=${game.turn}, phase=${game.phase}, step=${game.setupStep}`);
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
                    lastTurnTimestamp: game.lastTurnTimestamp
                });
                console.log(`Setup turn ended in ${gameId}: Now ${game.turn}'s turn`);
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
                    lastTurnTimestamp: game.lastTurnTimestamp
                });
                console.log(`Playing turn passed in ${gameId}: Now ${game.turn}'s turn`);
            } catch (e) {
                console.error('Error in pass_turn_playing:', e);
            }
        }
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
                    lastTurnTimestamp: game.lastTurnTimestamp
                });
                console.log(`Setup placement in ${gameId}: ${pieceId} to ${targetPoly}`);
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
                }

                game.turn = response.turn;

                game.turnCounter = response.turnCounter;
                game.isNewTurn = response.isNewTurn;
                game.movesThisTurn = response.movesThisTurn;
                game.lockedSequencePiece = response.lockedSequencePiece;
                game.heroeTakeCounter = response.heroeTakeCounter;
                
                game.history.push({ pieceId, targetPoly, captured: response.captured });

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
                    lastMove: { pieceId, targetPoly, captured: response.captured }
                });

                if (response.captured.includes('goddess')) {
                    const winnerSide = game.turn === 'white' ? 'black' : 'white'; 
                    const winnerId = winnerSide === 'white' ? game.white : game.black;
                    game.phase = 'GameOver';
                    
                    io.to(gameId).emit('game_over', { winnerId });
                    saveMatchResult(gameId, game.white, game.black, winnerId, game.pieces, game.history);
                }

                console.log(`Move applied in ${gameId}: ${pieceId} to ${targetPoly}`);
            }
        } catch (e) {
            console.error('Error applying move:', e);
        }
    });

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
                lastTurnTimestamp: game.lastTurnTimestamp
            });
        }
    });

    socket.on('disconnect', () => {
        lobby.waitingPlayers = lobby.waitingPlayers.filter(p => p.socketId !== socket.id);
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
