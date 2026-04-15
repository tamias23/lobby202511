import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import init, { get_legal_moves_wasm, get_eligible_pieces_wasm } from "../wasm_pkg/frontend_wasm";
import Clock from "./Clock";

// ── Board Color Themes ─────────────────────────────────────────────────────────
// 'default' = original CSS named colors (orange, green, blue, grey) — as shipped
// 'classic'  = faithful reproduction of the legacy JS rgb() values (createMush06.js)
const COLOR_THEMES = {
  default: {
    orange: 'orange',
    green:  'green',
    blue:   'blue',
    grey:   'grey',
  },
  classic: {
    orange: 'rgb(100%,54.9%,0%)',
    green:  'rgb(0%,80%,32.2%)',
    blue:   'rgb(20%,60%,100%)',
    grey:   'rgb(66.7%,66.7%,66.7%)',
  },
  tutorial: {
    orange: '#f97316',
    green:  '#22c55e',
    blue:   '#3b82f6',
    grey:   '#64748b',
  },
};

const THEME_LABELS = {
  default: '🟠 Default',
  classic: '🎨 Classic',
  tutorial: 'Tutorial',
};

const PieceIcon = ({ type, side }) => {
  const isBlack = side === "black" || side === "yellow";
  const fill = isBlack ? "black" : "white";
  const stroke = "#000";

  switch (type) {
    case "minotaur":
      return (
        <g transform="scale(0.09)">
          {[0, 120, 240].map((angle) => (
            <path
              key={angle}
              d="M 0 0 A 10 25 0 0 1 110 110 Z"
              fill={fill}
              stroke={stroke}
              strokeWidth="20"
              transform={`rotate(${angle} 0 0)`}
            />
          ))}
          {isBlack &&
            [0, 120, 240].map((angle) => (
              <path
                key={`inner-${angle}`}
                d="M 0 0 A 10 25 0 0 1 110 110 Z"
                fill="black"
                stroke="white"
                strokeWidth="15"
                transform={`rotate(${angle} 0 0) scale(0.5)`}
              />
            ))}
        </g>
      );
    case "soldier":
      return (
        <g transform="scale(0.9)">
          <ellipse
            cx="0"
            cy="0"
            rx="10"
            ry="10"
            fill={fill}
            stroke={isBlack ? "black" : "white"}
            strokeWidth="4"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="12"
            ry="12"
            fill="none"
            stroke="black"
            strokeWidth="2"
          />
        </g>
      );
    case "goddess":
      return (
        <g transform="scale(0.23)">
          <polygon
            points="0,-55 50,15 0,55 -50,15"
            fill={fill}
            stroke="black"
            strokeWidth="8"
          />
          <polygon
            points="0,-15 20,10 0,20 -20,10"
            fill={isBlack ? "black" : "black"}
            stroke={isBlack ? "white" : "black"}
            strokeWidth={isBlack ? "4" : "8"}
          />
        </g>
      );
    case "witch":
      return (
        <g transform="translate(-40, -44)">
          <polygon
            points="40,32 30,50 50,50"
            fill={fill}
            stroke="black"
            strokeWidth="2"
          />
        </g>
      );
    case "heroe":
    case "king":
      return (
        <g transform="scale(0.46) translate(-50, -187)">
          <polygon
            points="50,165 55,180 70,180 60,190 65,205 50,195 35,205 40,190 30,180 45,180"
            fill={fill}
            stroke="black"
            strokeWidth="3"
          />
        </g>
      );
    case "mage":
      if (isBlack) {
        return (
          <g transform="scale(0.04) translate(-255.77, -221.5)">
            <polygon
              points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01"
              fill="black"
              stroke="black"
              strokeWidth="30"
            />
            <ellipse
              cx="130.77"
              cy="438.01"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="5.77"
              cy="221.50"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="130.77"
              cy="5"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="380.77"
              cy="5"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="505.77"
              cy="221.50"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="380.77"
              cy="438.01"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="255.77"
              cy="221.5"
              rx="80"
              ry="80"
              fill="none"
              stroke="white"
              strokeWidth="30"
            />
            <ellipse
              cx="255.77"
              cy="221.5"
              rx="110"
              ry="110"
              fill="none"
              stroke="black"
              strokeWidth="20"
            />
            <ellipse
              cx="255.77"
              cy="221.5"
              rx="140"
              ry="140"
              fill="none"
              stroke="white"
              strokeWidth="30"
            />
          </g>
        );
      } else {
        return (
          <g transform="scale(0.04) translate(-255.77, -221.5)">
            <ellipse
              cx="130.77"
              cy="438.01"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="5.77"
              cy="221.50"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="130.77"
              cy="5"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="380.77"
              cy="5"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="505.77"
              cy="221.50"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <ellipse
              cx="380.77"
              cy="438.01"
              rx="80"
              ry="80"
              fill="black"
              stroke="black"
              strokeWidth="10"
            />
            <polygon
              points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01"
              fill="white"
              stroke="black"
              strokeWidth="35"
            />
            <ellipse
              cx="130.77"
              cy="438.01"
              rx="40"
              ry="40"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <ellipse
              cx="5.77"
              cy="221.50"
              rx="40"
              ry="40"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <ellipse
              cx="130.77"
              cy="5"
              rx="40"
              ry="40"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <ellipse
              cx="380.77"
              cy="5"
              rx="40"
              ry="40"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <ellipse
              cx="505.77"
              cy="221.50"
              rx="40"
              ry="40"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <ellipse
              cx="380.77"
              cy="438.01"
              rx="40"
              ry="40"
              fill="white"
              stroke="white"
              strokeWidth="1"
            />
            <ellipse
              cx="255.77"
              cy="221.5"
              rx="80"
              ry="80"
              fill="none"
              stroke="black"
              strokeWidth="35"
            />
            <ellipse
              cx="255.77"
              cy="221.5"
              rx="140"
              ry="140"
              fill="none"
              stroke="black"
              strokeWidth="35"
            />
          </g>
        );
      }

    case "siren":
      const hexagonPoints = Array.from({ length: 6 }, (_, idx) => {
        const angle = (Math.PI / 3) * idx;
        return `${14 * Math.cos(angle)},${14 * Math.sin(angle)}`;
      }).join(" ");
      return (
        <g transform="scale(0.8)">
          <ellipse
            cx="0"
            cy="0"
            rx="10"
            ry="10"
            fill="white"
            stroke="white"
            strokeWidth="4"
          />
          <polygon
            points={hexagonPoints}
            fill={fill}
            stroke="black"
            strokeWidth="2"
          />
          {isBlack ? (
            <>
              <line
                x1="-8"
                x2="8"
                y1="-8"
                y2="8"
                stroke="white"
                strokeWidth="1"
              />
              <line
                x1="-8"
                x2="8"
                y1="8"
                y2="-8"
                stroke="white"
                strokeWidth="1"
              />
              <line
                x1="10"
                x2="-10"
                y1="0"
                y2="0"
                stroke="white"
                strokeWidth="1"
              />
              <line
                x1="0"
                x2="0"
                y1="-10"
                y2="10"
                stroke="white"
                strokeWidth="1"
              />
              <circle r="6.5" fill="white" strokeWidth="0" />
              <circle r="5.5" fill="black" strokeWidth="0" />
            </>
          ) : (
            <>
              <line
                x1="-8"
                x2="8"
                y1="-8"
                y2="8"
                stroke="black"
                strokeWidth="1"
              />
              <line
                x1="-8"
                x2="8"
                y1="8"
                y2="-8"
                stroke="black"
                strokeWidth="1"
              />
              <line
                x1="10"
                x2="-10"
                y1="0"
                y2="0"
                stroke="black"
                strokeWidth="1"
              />
              <line
                x1="0"
                x2="0"
                y1="-10"
                y2="10"
                stroke="black"
                strokeWidth="1"
              />
              <circle r="6.5" fill="black" stroke="black" strokeWidth="0" />
              <circle r="4" fill="white" stroke="white" strokeWidth="0" />
            </>
          )}
        </g>
      );
    case "ghoul":
      return (
        <g transform="scale(0.8) translate(-9.5, -9.5)">
          <rect
            x="0"
            y="0"
            width="19"
            height="19"
            fill={fill}
            stroke="black"
            strokeWidth="2"
          />
          {isBlack && (
            <rect
              x="7"
              y="7"
              width="5"
              height="5"
              fill="black"
              stroke="white"
              strokeWidth="1"
            />
          )}
        </g>
      );
    default:
      return (
        <text dy=".3em" textAnchor="middle" fontSize="10" fill={fill}>
          {type[0].toUpperCase()}
        </text>
      );
  }
};

const GameBoard = ({ 
  gameId, 
  side, 
  opponent, 
  playerName, 
  initialState, 
  spectatorMode,
  whiteRole, 
  blackRole, 
  whiteName, 
  blackName,
  whiteRating: initialWhiteRating,
  blackRating: initialBlackRating,
  tournamentId,
}) => {
  const [wasmReady, setWasmReady] = useState(false);
  const [pieces, setPieces] = useState(initialState.pieces);
  const [turn, setTurn] = useState(initialState.turn);
  const [setupStep, setSetupStep] = useState(initialState.setupStep || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);

  const [board, setBoard] = useState(initialState.board);
  const [turnCounter, setTurnCounter] = useState(initialState.turnCounter || 0);
  const [isNewTurn, setIsNewTurn] = useState(
    initialState.isNewTurn !== undefined ? initialState.isNewTurn : true,
  );
  const [movesThisTurn, setMovesThisTurn] = useState(
    initialState.movesThisTurn || 0,
  );
  const [lockedSequencePiece, setLockedSequencePiece] = useState(
    initialState.lockedSequencePiece || null,
  );
  const [heroeTakeCounter, setHeroeTakeCounter] = useState(
    initialState.heroeTakeCounter || 0,
  );
  const [colorsEverChosen, setColorsEverChosen] = useState(
    initialState.colorsEverChosen || [],
  );
  const [mageUnlocked, setMageUnlocked] = useState(
    initialState.mageUnlocked || false,
  );
  const [phase, setPhase] = useState(initialState.phase || "Setup");
  const [eligiblePieceIds, setEligiblePieceIds] = useState([]);
  const [clocks, setClocks] = useState(initialState.clocks || { white: 900000, black: 900000 });
  const [lastTurnTimestamp, setLastTurnTimestamp] = useState(initialState.lastTurnTimestamp || null);
  const [isDebugFolded, setIsDebugFolded] = useState(true);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);
  const [colorTheme, setColorTheme] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  const [resignConfirm, setResignConfirm] = useState(false);
  const [boardName] = useState(initialState.boardName || "Template");
  const [passCount, setPassCount] = useState(initialState.passCount || { white: 0, black: 0 });
  const [passWarningShown, setPassWarningShown] = useState(false);

  // Mobile accessibility: slide-out drawers for HUD panels
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  
  // Drag threshold state
  const [dragStartPos, setDragStartPos] = useState(null);

  // Orientation state for piece placement logic
  const [isPortrait, setIsPortrait] = useState(window.matchMedia("(orientation: portrait)").matches);
  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const handler = (e) => setIsPortrait(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Resolve a logical board color name to the current theme's CSS color
  const getThemeColor = (logicalColor) => {
    const theme = COLOR_THEMES[colorTheme] || COLOR_THEMES.classic;
    return theme[logicalColor] || logicalColor;
  };

  // Track game moves in the unified format (setup and playing moves)
  const [gameMoves, setGameMoves] = useState([]);

  // Calculate board bounding box for dynamic viewBox and center for flipping
  const { boardCenter, boardViewBox } = useMemo(() => {
    const fallback = { boardCenter: { x: 0, y: 0 }, boardViewBox: '-100 -10 610 445' };
    if (!board || !board.allPolygons) return fallback;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(board.allPolygons).forEach((poly) => {
      poly.points.forEach((p) => {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
      });
    });
    const pad = 20;
    const topPad = isPortrait ? 40 : pad; // Tighter bounds now that overflow is visible (pieces can bleed over the header)
    const vbX = minX - pad;
    const vbY = minY - topPad;
    const vbW = (maxX - minX) + pad * 2;
    const vbH = (maxY - minY) + pad + topPad;
    return {
      boardCenter: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      boardViewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    };
  }, [board, isPortrait]);
  const [colorChosen, setColorChosen] = useState(
    initialState.colorChosen || {},
  );
  const [gameState, setGameState] = useState(initialState);
  
  const formatUsername = (name, role) => {
    if (!name) return 'Guest';
    if (role === 'bot') return name; // Already formatted by makeBotDisplayName, e.g. "🤖 jixx"
    if (role === 'guest' && name.startsWith('guest_')) {
      return `guest_${name.slice(6, 13)}`;
    }
    return name;
  };
  const navigate = useNavigate();
  const [gameOverInfo, setGameOverInfo] = useState({ winnerId: null, reason: null });
  // Holds data when the tournament time expired and interrupted this game.
  const [gameAbortedInfo, setGameAbortedInfo] = useState(null); // null | { tournamentId }
  const [whiteRating, setWhiteRating] = useState(initialWhiteRating || null);
  const [blackRating, setBlackRating] = useState(initialBlackRating || null);
  const [ratingDelta, setRatingDelta] = useState(null); // { whiteOld, whiteNew, blackOld, blackNew }

  // Listen for live rating updates after a match ends
  useEffect(() => {
    const onRatingUpdated = (data) => {
      if (data.whiteRating != null) setWhiteRating(data.whiteRating);
      if (data.blackRating != null) setBlackRating(data.blackRating);
      // Store old/new for delta display in game over overlay
      setRatingDelta({
        whiteOld: data.whiteRatingOld,
        whiteNew: data.whiteRating,
        blackOld: data.blackRatingOld,
        blackNew: data.blackRating,
      });
    };
    socket.on('rating_updated', onRatingUpdated);
    return () => socket.off('rating_updated', onRatingUpdated);
  }, []);

  
  useEffect(() => {
    if (phase === "GameOver") {
      // Small delay before showing the overlay to allow the final move to render and stick
      const timer = setTimeout(() => {
        setShowGameOverOverlay(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setShowGameOverOverlay(false);
    }
  }, [phase]);

  const [dragPos, setDragPos] = useState(null);
  const svgRef = useRef(null);
  
  // Audio refs
  const audioRefs = useRef({});

  // Move lock ref to prevent rapid double-click emissions
  const moveLockRef = useRef(false);

  const handleGlobalMouseMove = (e) => {
    if (!selectedPiece || !svgRef.current) return;

    // Detection for "button released" or "no active touch"
    const isMouse = e.type === 'mousemove' || !e.touches;
    const isTouch = e.type === 'touchmove' || e.touches;
    
    // If it's a mouse event and button 1 is not pressed, it's not a drag. 
    // If it's a touch event and there are no touches, it's not a drag.
    const isAbortedMouse = isMouse && e.buttons !== 1;
    const isAbortedTouch = isTouch && e.touches?.length === 0;

    if (isAbortedMouse || isAbortedTouch) {
      if (dragPos) setDragPos(null);
      return;
    }

    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const isOffBoard = selectedPiece && (selectedPiece.position === "returned" || selectedPiece.position === "graveyard");

      // Threshold check: don't start shifting the piece visually until we move enough
      if (dragStartPos && !dragPos) {
        const dx = clientX - dragStartPos.x;
        const dy = clientY - dragStartPos.y;
        if (Math.sqrt(dx*dx + dy*dy) > 8) {
          // Trigger drag start
          const startX = (clientX - CTM.e) / CTM.a;
          const startY = (clientY - CTM.f) / CTM.d;
          setDragPos({ 
            x: (isFlipped && !isOffBoard) ? 2 * boardCenter.x - startX : startX, 
            y: (isFlipped && !isOffBoard) ? 2 * boardCenter.y - startY : startY 
          });
        }
        return;
      }

      let x = (clientX - CTM.e) / CTM.a;
      let y = (clientY - CTM.f) / CTM.d;

      // If board is flipped, mirror the mouse coordinates back to the board's coordinate system
      // ONLY if the piece is ON the board (since off-board pieces were pulled out of the rotation group)
      if (isFlipped && !isOffBoard) {
        x = 2 * boardCenter.x - x;
        y = 2 * boardCenter.y - y;
      }

      if (dragPos) {
        setDragPos({ x, y });
      }
    }
  };

  const handleGlobalMouseUp = () => {
    if (dragPos) {
      // If we were dragging but didn't land on a valid polygon (which would have cleared this via handleTargetClick),
      // then we should cancel the selection so the user can "change their mind" by dropping into the void.
      setDragPos(null);
      setSelectedPiece(null);
      setLegalMoves([]);
    }
  };

  // Touch drop handler: hit-test the finger-lift position against polygon data attributes
  const handleTouchEnd = (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    // elementFromPoint sees the polygon underneath
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const polyId = el?.dataset?.polyId;
    if (polyId && legalMoves.includes(polyId)) {
      handleTargetClick(polyId);
    } else {
      // Dropped on an invalid target or outside board: clear everything
      setDragPos(null);
      // Wait, don't clear selectedPiece if we were just clicking (no dragPos yet)
      if (dragPos) {
         setSelectedPiece(null);
         setLegalMoves([]);
      }
    }
    setDragStartPos(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalMouseMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [selectedPiece, isFlipped, boardCenter, dragPos]);

  useEffect(() => {
    init().then(() => setWasmReady(true));

    const handleGameUpdate = (data) => {
      console.log(
        "[GameBoard] game_update received:",
        data.turn,
        data.phase,
        data.setupStep,
      );
      if (data.pieces) setPieces(data.pieces);
      if (data.turn) setTurn(data.turn);
      if (data.colorChosen) setColorChosen(data.colorChosen);
      if (data.phase) setPhase(data.phase);
      if (data.setupStep !== undefined) setSetupStep(data.setupStep);
      if (data.turnCounter !== undefined) setTurnCounter(data.turnCounter);
      if (data.isNewTurn !== undefined) setIsNewTurn(data.isNewTurn);
      if (data.movesThisTurn !== undefined)
        setMovesThisTurn(data.movesThisTurn);
      if (data.lockedSequencePiece !== undefined)
        setLockedSequencePiece(data.lockedSequencePiece);
      if (data.heroeTakeCounter !== undefined)
        setHeroeTakeCounter(data.heroeTakeCounter);
      if (data.clocks) setClocks(data.clocks);
      if (data.lastTurnTimestamp) setLastTurnTimestamp(data.lastTurnTimestamp);
      if (data.colorsEverChosen !== undefined) setColorsEverChosen(data.colorsEverChosen);
      if (data.mageUnlocked !== undefined) setMageUnlocked(data.mageUnlocked);
      if (data.passCount) {
        setPassCount(data.passCount);
        // Reset warning state if our pass count dropped back to 0 (a move was made)
        if (data.passCount[side] === 0) setPassWarningShown(false);
      }

      // Use the authoritative moves array from the server (covers setup, randomize, bot placements, etc.)
      if (data.moves !== undefined) {
        setGameMoves(data.moves);
      }

      setSelectedPiece(null);
      setLegalMoves([]);
      setDragPos(null);
    };

    const handleLegalMoves = ({
      pieceId,
      targets,
      colorChosen: updatedColors,
    }) => {
      if (selected_piece_ref.current?.id === pieceId) {
        setLegalMoves(targets);
        if (updatedColors) setColorChosen(updatedColors);
      }
    };

    const handleGameOver = ({ winnerId, reason }) => {
      setPhase("GameOver");
      setGameOverInfo({ winnerId, reason });
    };

    // Sent by the backend when the arena tournament time is up while this game
    // is still in progress. No result, no rating change.
    const handleGameAborted = ({ tournamentId: tid }) => {
      setPhase("GameOver"); // stop clocks and controls
      setGameAbortedInfo({ tournamentId: tid || tournamentId });
    };

    socket.on("game_update", handleGameUpdate);
    socket.on("legal_moves", handleLegalMoves);
    socket.on("game_over", handleGameOver);
    socket.on("game_aborted", handleGameAborted);

    // Initial eligibility check on mount
    if (wasmReady) {
      updateEligiblePieces();
    }

    socket.emit("join_game_room", { gameId });

    return () => {
      socket.off("game_update", handleGameUpdate);
      socket.off("legal_moves", handleLegalMoves);
      socket.off("game_over", handleGameOver);
      socket.off("game_aborted", handleGameAborted);
    };
  }, [gameId]);

  const selected_piece_ref = useRef(selectedPiece);
  useEffect(() => {
    selected_piece_ref.current = selectedPiece;
  }, [selectedPiece]);

  const updateEligiblePieces = () => {
    if (!wasmReady || !board) return;
    try {
      const eligibleJson = get_eligible_pieces_wasm(
        JSON.stringify(board),
        JSON.stringify(pieces),
        turn,
        phase,
        setupStep,
        JSON.stringify(colorChosen || {}),
        JSON.stringify(colorsEverChosen || []),
        turnCounter,
        isNewTurn,
        movesThisTurn,
        lockedSequencePiece,
        heroeTakeCounter
      );
      setEligiblePieceIds(JSON.parse(eligibleJson));
    } catch (e) {
      console.error("Wasm Eligibility Error:", e);
    }
  };

  useEffect(() => {
    updateEligiblePieces();
  }, [wasmReady, pieces, turn, phase, setupStep, colorChosen, lockedSequencePiece, turnCounter, isNewTurn, movesThisTurn, heroeTakeCounter]);

  const handlePieceClick = async (piece, e) => {
    if (turn !== side) return;

    if (piece.side !== side) {
      // Handle capturing opponent piece via click
      if (selectedPiece && legalMoves.includes(piece.position)) {
        handleTargetClick(piece.position);
      }
      return;
    }

    if (e) {
      setDragStartPos({ x: e.clientX || e.touches?.[0]?.clientX, y: e.clientY || e.touches?.[0]?.clientY });
    }

    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      setLegalMoves([]);
      return;
    }

    if (
      phase === "Playing" &&
      !colorChosen[side] &&
      piece.position === "returned"
    ) {
      return;
    }
    setSelectedPiece(piece);

    if (wasmReady) {
      try {
        const targetsJson = get_legal_moves_wasm(
          JSON.stringify(board),
          JSON.stringify(pieces),
          piece.id,
          turn,
          phase,
          setupStep,
          JSON.stringify(colorChosen || {}),
          JSON.stringify(colorsEverChosen || []),
          turnCounter,
          isNewTurn,
          movesThisTurn,
          lockedSequencePiece,
          heroeTakeCounter,
        );
        setLegalMoves(JSON.parse(targetsJson));
      } catch (e) {
        console.error("Wasm Move Error:", e);
        socket.emit("get_legal_moves", { gameId, pieceId: piece.id });
      }
    } else {
      socket.emit("get_legal_moves", { gameId, pieceId: piece.id });
    }
  };

  const handleTargetClick = (targetPoly) => {
    if (!selectedPiece) return;
    if (moveLockRef.current) return;
    
    moveLockRef.current = true;
    setTimeout(() => {
      moveLockRef.current = false;
    }, 400); // 400ms lock to prevent double clicks and synthetic Android events

    console.log(
      `Applying move: ${selectedPiece.type} (${selectedPiece.id}) to ${targetPoly}`,
    );
    socket.emit("apply_move", {
      gameId,
      pieceId: selectedPiece.id,
      targetPoly,
    });
    setSelectedPiece(null);
    setLegalMoves([]);
    setDragPos(null);
  };

  const renderEdges = () => {
    if (!board || !board.allEdges) return null;
    return Object.entries(board.allEdges).map(([id, edge]) => {
      if (!edge.sharedPoints || edge.sharedPoints.length !== 2) return null;
      const isRed = edge.color === "red";
      return (
        <line
          key={id}
          x1={edge.sharedPoints[0][0]}
          y1={edge.sharedPoints[0][1]}
          x2={edge.sharedPoints[1][0]}
          y2={edge.sharedPoints[1][1]}
          stroke={isRed ? "#ef4444" : "black"}
          strokeWidth={isRed ? "3" : "0.5"}
          opacity={isRed ? 1 : 0.6}
        />
      );
    });
  };

  const renderBoard = () => {
    if (!board || !board.allPolygons) return null;
    return (
      <g>
        <g
          transform={
            isFlipped ? `rotate(180, ${boardCenter.x}, ${boardCenter.y})` : ""
          }
          style={{ transition: "transform 0.6s ease-in-out" }}
        >
          {Object.entries(board.allPolygons).map(([id, poly]) => {
            const isLegalMove = legalMoves.includes(id);
            return (
              <polygon
                key={id}
                data-poly-id={id}
                points={poly.points.map((p) => `${p[0]},${p[1]}`).join(" ")}
                fill={getThemeColor(poly.color)}
                stroke="black"
                strokeWidth="0.5"
                style={{
                  cursor: isLegalMove ? "pointer" : "default",
                  transition: "fill 0.2s",
                }}
                onClick={() => isLegalMove && handleTargetClick(id)}
                onMouseUp={() =>
                  isLegalMove && selectedPiece && handleTargetClick(id)
                }
              />
            );
          })}
          {renderEdges()}
          {renderPieces('on-board')}
          {/* Visual Move Indicators */}
          {legalMoves.map((targetId) => {
            const poly = board.allPolygons[targetId];
            if (!poly || !poly.center) return null;
            const [cx, cy] = poly.center;
            const isOccupied = pieces.some(
              (p) =>
                p.position === targetId &&
                p.position !== "returned" &&
                p.position !== "graveyard",
            );

            return (
              <circle
                key={`move-indicator-${targetId}`}
                cx={cx}
                cy={cy}
                r={isOccupied ? 16 : 5}
                fill={
                  isOccupied ? "rgba(239, 68, 68, 0.4)" : "rgba(0, 0, 0, 0.4)"
                }
                stroke={isOccupied ? "#ef4444" : "rgba(0, 0, 0, 0.2)"}
                strokeWidth={isOccupied ? 2 : 1}
                style={{ pointerEvents: "none" }}
              />
            );
          })}
        </g>
        {renderPieces('off-board')}
      </g>
    );
  };

  const renderPieces = (renderType = 'all') => {
    // Keep track of how many pieces of each type are in the returned zone for stacking
    const returnedStacks = {
      white: {}, // { soldier: count, tower: count, ... }
      black: {}
    };
    
    // Sort pieces to ensure stable stacking order
    let sortedPieces = [...pieces].sort((a,b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });

    if (renderType === 'on-board') {
      sortedPieces = sortedPieces.filter(p => p.position !== "returned" && p.position !== "graveyard");
    } else if (renderType === 'off-board') {
      sortedPieces = sortedPieces.filter(p => p.position === "returned" || p.position === "graveyard");
    }

    // Track total returned per side for single-column stacking
    const returnedCounters = { white: 0, black: 0 };

    return sortedPieces.map((piece) => {
      let cx = 0,
        cy = 0;
      const isOffBoard =
        piece.position === "returned" || piece.position === "graveyard";
      const pieceSide = piece.color === "white" ? "white" : "black";
      const actualPieceSide = piece.side || pieceSide;

      if (isOffBoard) {
        const count = returnedCounters[actualPieceSide];
        returnedCounters[actualPieceSide]++;

        if (isPortrait) {
          // Portrait: tight 4-column cluster to fit between top header and board
          const row = Math.floor(count / 4);
          const col = count % 4;
          const colStep = 18; // Very tight horizontal
          const rowStep = -22; // Stack upwards tightly

          if (actualPieceSide === "white") {
            cx = 25 + col * colStep;
            cy = -5 + row * rowStep;
          } else {
            cx = 320 + col * colStep;
            cy = -5 + row * rowStep;
          }
        } else {
          // Landscape: Zig-zag column stacking
          const verticalStep = 7.2; // 6 * 1.2
          const horizontalShift = 13; // half of 26 for total swing of 26
          const isRight = count % 2 === 0;
          const xOffset = isRight ? horizontalShift : -horizontalShift;

          if (actualPieceSide === "white") {
            cx = -20 + xOffset;
            cy = 60 + count * verticalStep;
          } else {
            cx = 430 + xOffset;
            cy = 60 + count * verticalStep;
          }
        }
      } else {
        const poly = board.allPolygons[piece.position];
        if (!poly) return null;
        [cx, cy] = poly.center;
      }

      const isSelected = selectedPiece?.id === piece.id;
      const isLocked = lockedSequencePiece === piece.id;
      const isMyTurn = turn === actualPieceSide;
      let allowedToMove = isMyTurn && actualPieceSide === side && eligiblePieceIds.includes(piece.id);

      const isMyPiece = actualPieceSide === side;
      const isDragging = isSelected && dragPos;
      const actualCx = isDragging ? dragPos.x : cx;
      const actualCy = isDragging ? dragPos.y : cy;

      // Dynamic CSS class for transition control
      const pieceClass = [
        'piece-group',
        isSelected ? 'selected-piece' : '',
        isDragging ? 'piece-group--dragging'
          : isMyPiece ? 'piece-group--smooth'
          : 'piece-group--snap',
      ].join(' ');

      const isGrayed = isOffBoard && !allowedToMove;
      const idInLegalMoves =
        selectedPiece && legalMoves.includes(piece.position);

      return (
        <g
          key={piece.id}
          className={pieceClass}
          transform={`translate(${actualCx}, ${actualCy}) ${isFlipped && !isOffBoard ? "rotate(180)" : ""}`}
          style={{
            cursor: allowedToMove
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default",
            opacity: 1.0,
            filter: isGrayed ? "grayscale(100%) brightness(0.7)" : "none",
            // During any drag, disable pointer events on all pieces so they don't block
            // target polygons (especially important for captures)
            pointerEvents: dragPos ? "none" : "all",
          }}
          onClick={(e) => {
            // Capture by click: enemy piece sitting on top of the polygon intercepts
            // the pointer event, so the polygon's own onClick never fires. Handle it here.
            if (!allowedToMove && selectedPiece && legalMoves.includes(piece.position)) {
              handleTargetClick(piece.position);
            }
          }}
          onMouseDown={(e) => allowedToMove && handlePieceClick(piece, e)}
          onTouchStart={(e) => {
            if (allowedToMove) {
              e.preventDefault(); // Prevents synthetic 'mousedown' which was immediately undoing the selection
              handlePieceClick(piece, e);
            } else if (selectedPiece && legalMoves.includes(piece.position)) {
              // Capture touch on enemy piece
              e.preventDefault();
              handleTargetClick(piece.position);
            }
          }}
        >
          <circle
            r="18"
            fill={isSelected ? "#f1c40f" : "white"}
            opacity={isSelected ? 0.4 : 0}
          />
          {isLocked && (
            <circle
              r="22"
              fill="none"
              stroke="#f1c40f"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          )}

          <PieceIcon type={piece.type} side={actualPieceSide} />
        </g>
      );
    });
  };

  return (
    <div 
      className="game-board-container" 
      style={boardContainerStyle}
      onClick={(e) => {
        // Deselect if clicking the general game container (outside HUDs/SVGs)
        if (e.target.classList.contains('game-board-container')) {
          setSelectedPiece(null);
          setLegalMoves([]);
        }
      }}
    >
      {/* Drawer Toggle Buttons (Removed as requested) */}
      <div
        className={`hud-panel hud-panel-left ${isLeftDrawerOpen ? 'drawer-open' : ''}`}
        style={{ pointerEvents: "all" }}
      >

        {/* GAME INFO PANEL — merged with Clock */}
        <div
          className="glass-panel"
          style={{ 
            ...leftHudStyle, 
            width: "100%", 
            alignItems: "stretch",
            position: "relative",
            zIndex: 1,
            overflow: "hidden"
          }}
        >
          {/* Phase + Turn + Move counters — side by side */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "12px",
              fontSize: "13px",
              paddingBottom: "10px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phase</div>
              <div style={{ fontWeight: "bold", fontSize: "14px", color: phase === "Setup" ? "#9b59b6" : phase === "Playing" ? "#2ecc71" : "#e74c3c" }}>
                {phase}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Turn</div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {turnCounter || Math.floor((gameMoves?.length || 0) / 2) + 1}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.7, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Move</div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                {gameMoves?.length || 0}
              </div>
            </div>
          </div>

          {/* Clocks */}
          <Clock
            clocks={clocks}
            lastTurnTimestamp={lastTurnTimestamp}
            turn={turn}
            side={side}
            phase={phase}
            whiteName={formatUsername(whiteName, whiteRole)}
            blackName={formatUsername(blackName, blackRole)}
            whiteRating={whiteRating}
            blackRating={blackRating}
            whiteRole={whiteRole}
            blackRole={blackRole}
          />
        </div>

        {/* SPECTATOR INFO PANEL */}
        {spectatorMode && (
          <div
            className="glass-panel"
            style={{
              marginTop: "10px",
              padding: "14px",
              width: "100%",
              boxSizing: "border-box",
              textAlign: "center",
              border: "1px solid rgba(70, 176, 212, 0.3)",
              background: "rgba(70, 176, 212, 0.06)",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "6px" }}>👁</div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#46b0d4", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
              Spectating
            </div>
            <div style={{ fontSize: "11px", opacity: 0.6, lineHeight: 1.4 }}>
              You are watching this match live.
            </div>
          </div>
        )}
      </div>{/* end left hud-panel */}

      {/* CENTER - Game Board */}
      <div className="game-board-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minWidth: 0, minHeight: 0 }}>
        <svg
          ref={svgRef}
          className="game-board-svg"
          viewBox={boardViewBox}
          preserveAspectRatio="xMidYMin meet"
          style={svgStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              // Close drawers on mobile if clicking the empty background
              setIsLeftDrawerOpen(false);
              setIsRightDrawerOpen(false);
              // Deselect piece if clicking background
              setSelectedPiece(null);
              setLegalMoves([]);
            }
          }}
          onMouseMove={handleGlobalMouseMove}
          onMouseUp={handleGlobalMouseUp}
          onMouseLeave={handleGlobalMouseUp}
          onTouchEnd={handleTouchEnd}
        >
          {renderBoard()}
        </svg>

        {selectedPiece && (
          <div style={selectionInfoStyle}>
            Selected: <strong>{selectedPiece.type}</strong>
          </div>
        )}
      </div>

      <div 
        className={`hud-panel hud-panel-right ${isRightDrawerOpen ? 'drawer-open' : ''}`} 
        style={{ pointerEvents: "all" }}
      >

        {phase === "Playing" && (
        <div className="glass-panel" style={{ ...rightHudStyle, width: '100%' }}>
          {true && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                padding: "8px 0",
              }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  color: "#f1c40f",
                  fontSize: "13px",
                  textAlign: "center",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {turn === side 
                  ? (colorChosen[side] ? "Your Color:" : "Choose Color:") 
                  : (colorChosen[turn] ? "Opponent Color:" : "Opponent Deciding...")}
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "15px",
                  height: isPortrait ? "45px" : "95px", // Strictly locked height prevents the board from jumping!
                  alignItems: "center",
                  flexWrap: isPortrait ? "nowrap" : "wrap",
                }}
              >
                {(colorChosen[turn] ? [colorChosen[turn]] : ["grey", "green", "blue", "orange"]).map((color) => (
                  <div
                    key={color}
                    onClick={() =>
                      turn === side &&
                      !colorChosen[side] &&
                      socket.emit("color_selected", { gameId, color, side })
                    }
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: color,
                      borderRadius: "50%",
                      cursor: (turn === side && !colorChosen[side]) ? "pointer" : "default",
                      border: `2px solid ${turn === side || colorChosen[turn] ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)"}`,
                      transition: "all 0.2s ease",
                      opacity: (turn === side || colorChosen[turn]) ? 1 : 0.4,
                      boxShadow: (turn === side || colorChosen[turn]) ? `0 0 15px ${color}` : "none",
                    }}
                    onMouseOver={(e) =>
                      turn === side &&
                      !colorChosen[side] &&
                      (e.target.style.transform = "scale(1.15)")
                    }
                    onMouseOut={(e) =>
                      (e.target.style.transform = "scale(1)")
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* CHROMATIC UNLOCK COUNTER - Visible during Playing phase until Mage is unlocked */}
        {phase === "Playing" && !mageUnlocked && (
          <div className="glass-panel" style={{ width: '100%', padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,165,0,0.25)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f97316', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>
              🔒 Mage Locked
            </div>
            <div style={{ fontSize: '10px', opacity: 0.55, textAlign: 'center', lineHeight: 1.4 }}>
              Choose all 4 colors to unlock
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {['grey', 'green', 'blue', 'orange'].map((color) => {
                const seen = colorsEverChosen.includes(color);
                return (
                  <div
                    key={color}
                    title={color}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: color === 'grey' ? '#9ca3af' : color,
                      opacity: seen ? 1 : 0.2,
                      boxShadow: seen ? `0 0 10px ${color === 'grey' ? '#9ca3af' : color}` : 'none',
                      transition: 'all 0.4s ease',
                      border: seen ? '2px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,255,255,0.15)',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.45, marginTop: '2px' }}>
              {colorsEverChosen.length} / 4 seen
            </div>
          </div>
        )}

        {/* ACTIONS PANEL - (Now on Right, below Color) */}
        <div 
          className="glass-panel" 
          style={{ 
            ...rightHudStyle, 
            width: '100%', 
            padding: "15px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}
        >
          {(phase === "Setup" || phase === "Playing") && (
            <button
              onClick={() => {
                if (turn !== side) return;
                if (phase === "Setup") {
                  if (movesThisTurn === 0) {
                    // Block: no piece placed yet
                    const el = document.getElementById('pass-warning-toast');
                    if (el) { el.style.opacity = '1'; setTimeout(() => { if(el) el.style.opacity = '0'; }, 2500); }
                    return;
                  }
                  socket.emit("end_turn_setup", { gameId });
                } else {
                  // Warn on 2nd pass (about to hit the 3-pass limit)
                  const myPassCount = passCount[side] || 0;
                  if (myPassCount === 2) {
                    if (!passWarningShown) {
                      setPassWarningShown(true);
                      return; // first click shows the warning
                    }
                    setPassWarningShown(false);
                  } else {
                    setPassWarningShown(false);
                  }
                  socket.emit("pass_turn_playing", { gameId });
                }
              }}
              onMouseOver={(e) => turn === side && (e.target.style.transform = "scale(1.03)")}
              onMouseOut={(e) => turn === side && (e.target.style.transform = "scale(1)")}
              style={{
                ...buttonStyle,
                backgroundColor: turn !== side ? '#7f8c8d' : (passWarningShown ? '#c0392b' : (phase === "Setup" ? "#2ecc71" : "#e67e22")),
                boxShadow: turn !== side ? "none" : (passWarningShown
                  ? '0 2px 8px rgba(192,57,43,0.5)'
                  : phase === "Setup"
                  ? "0 2px 8px rgba(46, 204, 113, 0.3)"
                  : "0 2px 8px rgba(230, 126, 34, 0.3)"),
                opacity: turn !== side ? 0.35 : 1,
                cursor: turn !== side ? "not-allowed" : "pointer",
                pointerEvents: turn !== side ? "none" : "auto",
                width: "100%",
                padding: "8px",
                transition: 'all 0.2s',
              }}
            >
              {turn !== side ? 'Waiting for opponent...' : (passWarningShown ? '⚠️ Confirm Pass' : 'End Turn')}
            </button>
          )}

          {/* Pass warning toast (setup: no piece placed) */}
          <div
            id="pass-warning-toast"
            style={{
              fontSize: '11px',
              color: '#e74c3c',
              textAlign: 'center',
              opacity: 0,
              transition: 'opacity 0.3s',
              pointerEvents: 'none',
              lineHeight: 1.4,
            }}
          >
            Place at least one piece first.
          </div>

          {phase === "Setup" && (
            <button
              onClick={() => {
                if (turn === side) socket.emit("randomize_setup", { gameId, side })
              }}
              onMouseOver={(e) => turn === side && (e.target.style.transform = "scale(1.03)")}
              onMouseOut={(e) => turn === side && (e.target.style.transform = "scale(1)")}
              style={{
                ...buttonStyle,
                backgroundColor: turn !== side ? "#7f8c8d" : "#9b59b6",
                boxShadow: turn !== side ? "none" : "0 2px 8px rgba(155, 89, 182, 0.3)",
                opacity: turn !== side ? 0.35 : 1,
                cursor: turn !== side ? "not-allowed" : "pointer",
                pointerEvents: turn !== side ? "none" : "auto",
                width: "100%",
                padding: "8px"
              }}
            >
              {turn !== side ? 'Waiting for opponent...' : 'Random Setup'}
            </button>
          )}

          <button
            onClick={() => setIsFlipped(!isFlipped)}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.03)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
            style={{
              ...buttonStyle,
              backgroundColor: "#34495e",
              boxShadow: "0 2px 8px rgba(52, 73, 94, 0.3)",
              width: "100%",
              padding: "8px"
            }}
          >
            Flip Board
          </button>

          {/* Resign button — only for active players during a live game */}
          {!spectatorMode && phase !== 'GameOver' && (
            resignConfirm ? (
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <button
                  onClick={() => {
                    socket.emit('resign', { gameId });
                    setResignConfirm(false);
                  }}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    backgroundColor: '#c0392b',
                    boxShadow: '0 2px 8px rgba(192,57,43,0.4)',
                    padding: '8px 4px',
                    fontSize: '12px',
                  }}
                >
                  Yes, resign
                </button>
                <button
                  onClick={() => setResignConfirm(false)}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    backgroundColor: '#2c3e50',
                    boxShadow: '0 2px 8px rgba(44,62,80,0.3)',
                    padding: '8px 4px',
                    fontSize: '12px',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setResignConfirm(true)}
                onMouseOver={(e) => (e.target.style.transform = 'scale(1.03)')}
                onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#922b21',
                  boxShadow: '0 2px 8px rgba(146,43,33,0.3)',
                  width: '100%',
                  padding: '8px',
                }}
              >
                Resign
              </button>
            )
          )}

          {/* ── Settings Panel ── */}
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              ...buttonStyle,
              backgroundColor: showSettings ? "#1a252f" : "#2c3e50",
              boxShadow: "0 2px 8px rgba(44,62,80,0.4)",
              width: "100%",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "14px" }}>⚙️</span>
            <span>Settings</span>
            <span style={{ marginLeft: "auto", fontSize: "10px", opacity: 0.6 }}>{showSettings ? "▲" : "▼"}</span>
          </button>

          {showSettings && (
            <div style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              padding: "12px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              animation: "fadeIn 0.2s ease",
            }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>
                Board Colors
              </div>
              {Object.entries(THEME_LABELS).map(([key, label]) => {
                const palette = COLOR_THEMES[key];
                const isActive = colorTheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => setColorTheme(key)}
                    style={{
                      background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                      border: isActive ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* 4-swatch mini preview */}
                    <span style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                      {['orange','green','blue','grey'].map(c => (
                        <span key={c} style={{
                          width: "10px", height: "10px",
                          borderRadius: "3px",
                          background: palette[c],
                          border: "1px solid rgba(0,0,0,0.3)",
                          display: "inline-block",
                        }} />
                      ))}
                    </span>
                    <span style={{ fontSize: "11px", color: isActive ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: isActive ? "700" : "400" }}>
                      {label}
                    </span>
                    {isActive && <span style={{ marginLeft: "auto", fontSize: "10px", color: "#2ecc71" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Tournament Game Aborted Overlay ── */}
      {gameAbortedInfo && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000, // above the normal game-over overlay
        }}>
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "40px 48px",
            textAlign: "center",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            minWidth: "300px",
            maxWidth: "420px",
          }}>
            <div style={{ fontSize: "48px" }}>⏱️</div>
            <h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: "22px" }}>
              Tournament Ended
            </h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.6 }}>
              The arena time has expired and this game has been <strong>interrupted</strong>.
              No result has been recorded and ratings are unchanged.
            </p>
            {(gameAbortedInfo.tournamentId) && (
              <button
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/tournament/${gameAbortedInfo.tournamentId}`)}
              >
                Return to Tournament
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Game Over Overlay ── */}
      {showGameOverOverlay && !gameAbortedInfo && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "40px 48px",
            textAlign: "center",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            minWidth: "280px",
          }}>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", fontFamily: "'Outfit', sans-serif" }}>
              Game Over
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
              {gameOverInfo.reason === "timeout"
                ? "Time ran out."
                : gameOverInfo.reason === "goddess_captured"
                ? "Goddess captured."
                : gameOverInfo.reason === "abandoned"
                ? "Opponent disconnected."
                : gameOverInfo.reason === "resign"
                ? "A player resigned."
                : gameOverInfo.reason === "pass_limit"
                ? "Passed 3 times in a row."
                : null}
              <br />
              <span style={{ color: "var(--text-main)", fontWeight: "600" }}>
                Winner: {gameOverInfo.winnerId}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* ── Rating changes ── */}
              {ratingDelta && (
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '13px',
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {[
                    { label: whiteName || 'White', old: ratingDelta.whiteOld, nw: ratingDelta.whiteNew },
                    { label: blackName || 'Black', old: ratingDelta.blackOld, nw: ratingDelta.blackNew },
                  ].map(({ label, old: o, nw }) => {
                    if (o == null || nw == null) return null;
                    const diff = Math.round(nw) - Math.round(o);
                    const sign = diff >= 0 ? '+' : '';
                    const color = diff > 0 ? '#4caf82' : diff < 0 ? '#e05c5c' : 'var(--text-muted)';
                    return (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                        <span style={{ color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                          {Math.round(o)}
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                          {Math.round(nw)}
                          <span style={{ color, fontWeight: 700, marginLeft: '6px' }}>({sign}{diff})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => tournamentId ? navigate(`/tournament/${tournamentId}`) : navigate("/")}
                style={{
                  padding: "11px 28px",
                  background: "linear-gradient(135deg, #46b0d4, #f27813)",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: "0.03em",
                  boxShadow: "0 4px 16px rgba(70,176,212,0.35)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {tournamentId ? '🏆 Back to Tournament' : 'Back to Lobby'}
              </button>
              <button
                onClick={() => {
                  const record = {
                    version: 3,
                    board_id: boardName,
                    whiteName: whiteName || 'White',
                    blackName: blackName || 'Black',
                    winner: gameOverInfo.winnerId,
                    reason: gameOverInfo.reason,
                    timeControl: initialState.timeControl || null,
                    board,
                    moves: gameMoves,
                  };
                  navigate('/analysis', { state: { record } });
                }}
                style={{
                  padding: "11px 28px",
                  background: "rgba(70,176,212,0.15)",
                  color: "#46b0d4",
                  border: "1px solid rgba(70,176,212,0.4)",
                  borderRadius: "25px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                🔍 Review Game
              </button>
              <button
                onClick={() => {
                  const record = {
                    version: 3,
                    board_id: boardName,
                    whiteName: whiteName || 'White',
                    blackName: blackName || 'Black',
                    winner: gameOverInfo.winnerId,
                    reason: gameOverInfo.reason,
                    timeControl: initialState.timeControl || null,
                    moves: gameMoves,
                  };
                  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `dedal_${boardName}_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  padding: "11px 28px",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "25px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                ⬇ Download JSON
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

const boardContainerStyle = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "stretch",
  width: "100%",
  height: "100%",
  padding: "4px",
  boxSizing: "border-box",
  gap: "8px",
};

const leftHudStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "12px",
  height: "fit-content",
  boxSizing: "border-box",
};

const rightHudStyle = {
  ...leftHudStyle,
};

const statusBarStyle = {
  padding: "12px 40px",
  borderRadius: "30px",
  fontSize: "20px",
};

const svgStyle = {
  width: "100%",
  height: "100%",
  maxHeight: "100vh",
  filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.5))",
  transformOrigin: "center center",
  overflow: "visible",
};

const selectionInfoStyle = {
  position: "absolute",
  bottom: "20px",
  padding: "10px 25px",
  backgroundColor: "rgba(52, 73, 94, 0.9)",
  color: "white",
  borderRadius: "30px",
  fontSize: "15px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const buttonStyle = {
  padding: "8px 24px",
  borderRadius: "25px",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
  transition: "all 0.2s ease",
};

export default GameBoard;
