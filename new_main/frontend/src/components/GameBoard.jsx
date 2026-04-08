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
  tutorial: '📖 Tutorial',
};

const PieceIcon = ({ type, side }) => {
  const isBlack = side === "black" || side === "yellow";
  const fill = isBlack ? "black" : "white";
  const stroke = "#000";

  switch (type) {
    case "golem":
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
  whiteRole, 
  blackRole, 
  whiteName, 
  blackName 
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
  const [boardName] = useState(initialState.boardName || "Template");

  // Resolve a logical board color name to the current theme's CSS color
  const getThemeColor = (logicalColor) => {
    const theme = COLOR_THEMES[colorTheme] || COLOR_THEMES.classic;
    return theme[logicalColor] || logicalColor;
  };

  // Add local state for history, defaulting to empty until backend passes it explicitly in all events
  const [moveHistory, setMoveHistory] = useState(initialState.history || []);

  // Calculate board center for flipping
  const boardCenter = useMemo(() => {
    if (!board || !board.allPolygons) return { x: 0, y: 0 };
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    Object.values(board.allPolygons).forEach((poly) => {
      poly.points.forEach((p) => {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
      });
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }, [board]);
  const [colorChosen, setColorChosen] = useState(
    initialState.colorChosen || {},
  );
  const [gameState, setGameState] = useState(initialState);
  
  const formatUsername = (name, role) => {
    if (!name) return 'Guest';
    if (role === 'guest' && name.startsWith('guest_')) {
      return `guest_${name.slice(6, 13)}`;
    }
    return name;
  };
  const navigate = useNavigate();
  const [gameOverInfo, setGameOverInfo] = useState({ winnerId: null, reason: null });
  
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

  const handleGlobalMouseMove = (e) => {
    if (!selectedPiece || !svgRef.current) return;

    // If mouse button is NOT held down, reset dragPos to fix "stickiness"
    if (e.buttons !== 1) {
      if (dragPos) setDragPos(null);
      return;
    }

    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      let x = (e.clientX - CTM.e) / CTM.a;
      let y = (e.clientY - CTM.f) / CTM.d;

      // If board is flipped, mirror the mouse coordinates back to the board's coordinate system
      if (isFlipped) {
        x = 2 * boardCenter.x - x;
        y = 2 * boardCenter.y - y;
      }

      setDragPos({ x, y });
    }
  };

  const handleGlobalMouseUp = () => {
    if (dragPos) setDragPos(null);
  };

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
      if (data.history !== undefined) setMoveHistory(data.history);
      if (data.clocks) setClocks(data.clocks);
      if (data.lastTurnTimestamp) setLastTurnTimestamp(data.lastTurnTimestamp);
      if (data.colorsEverChosen !== undefined) setColorsEverChosen(data.colorsEverChosen);
      if (data.mageUnlocked !== undefined) setMageUnlocked(data.mageUnlocked);

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

    socket.on("game_update", handleGameUpdate);
    socket.on("legal_moves", handleLegalMoves);
    socket.on("game_over", handleGameOver);

    // Initial eligibility check on mount
    if (wasmReady) {
      updateEligiblePieces();
    }

    socket.emit("join_game_room", { gameId });

    return () => {
      socket.off("game_update", handleGameUpdate);
      socket.off("legal_moves", handleLegalMoves);
      socket.off("game_over", handleGameOver);
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

  const handlePieceClick = async (piece) => {
    if (turn !== side) return;
    if (piece.side !== side) return;

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
        {renderPieces()}
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
    );
  };

  const renderPieces = () => {
    const returnedCounters = { white: 0, black: 0 };
    const boardWidth = board?.width || 410;

    return pieces.map((piece) => {
      let cx = 0,
        cy = 0;
      const isOffBoard =
        piece.position === "returned" || piece.position === "graveyard";
      const pieceSide = piece.color === "white" ? "white" : "black";
      const actualPieceSide = piece.side || pieceSide;

      if (isOffBoard) {
        if (actualPieceSide === "white") {
          // Tightened horizontal placement
          cx = -25 - (returnedCounters.white % 3) * 26;
          cy = 60 + Math.floor(returnedCounters.white / 3) * 30;
          returnedCounters.white++;
        } else {
          // Tightened horizontal placement
          cx = 435 + (returnedCounters.black % 3) * 26;
          cy = 60 + Math.floor(returnedCounters.black / 3) * 30;
          returnedCounters.black++;
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

      const isDragging = isSelected && dragPos;
      const actualCx = isDragging ? dragPos.x : cx;
      const actualCy = isDragging ? dragPos.y : cy;

      const isGrayed = isOffBoard && !allowedToMove;
      const idInLegalMoves =
        selectedPiece && legalMoves.includes(piece.position);

      return (
        <g
          key={piece.id}
          className={`piece-group ${isSelected ? "selected-piece" : ""}`}
          transform={`translate(${actualCx}, ${actualCy}) ${isFlipped ? "rotate(180)" : ""}`}
          style={{
            cursor: allowedToMove
              ? isDragging
                ? "grabbing"
                : "grab"
              : "default",
            opacity: 1.0,
            filter: isGrayed ? "grayscale(100%) brightness(0.7)" : "none",
            transition: isDragging ? "none" : "opacity 0.2s, filter 0.2s",
            // During any drag, disable pointer events on all pieces so they don't block
            // target polygons (especially important for captures)
            pointerEvents: dragPos ? "none" : "all",
          }}
          onMouseDown={() => allowedToMove && handlePieceClick(piece)}
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
    <div className="game-board-container" style={boardContainerStyle}>
      <div
        className="hud-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          padding: "10px",
          width: "180px",
          minWidth: "180px",
        }}
      >

        <div className="glass-panel" style={{ ...leftHudStyle, width: "100%" }}>
          <div
            style={{
              fontWeight: "bold",
              color: "#46b0d4",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Room: {gameId.slice(-4)}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              padding: "15px 10px",
              borderRadius: "20px",
              marginBottom: "15px",
              width: "100%",
              boxSizing: "border-box",
              backgroundColor:
                turn === side
                  ? "rgba(46, 204, 113, 0.2)"
                  : "rgba(255,255,255,0.05)",
              border:
                turn === side
                  ? "1px solid #2ecc71"
                  : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: "24px" }}>
              {turn === "white" ? "⚪" : "⚫"}
            </span>
            <span
              style={{
                fontWeight: "bold",
                textAlign: "center",
                fontSize: "14px",
              }}
            >
              {turn.toUpperCase()}'S TURN
            </span>
            <span style={{ opacity: 0.7, fontSize: "12px" }}>
              [{phase} Step {setupStep}]
            </span>
          </div>
        </div>

        {/* DEBUG ENGINE STATE PANEL - Foldable (Now on Left) */}
        <div 
          className="glass-panel" 
          style={{ 
            marginTop: "10px", 
            padding: "12px", 
            width: "100%", 
            boxSizing: "border-box",
            border: "1px solid rgba(255, 215, 0, 0.2)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.8)",
            textAlign: "left"
          }}
        >
          <div 
            onClick={() => setIsDebugFolded(!isDebugFolded)}
            style={{ 
              color: "#f1c40f", 
              fontWeight: "bold", 
              fontSize: "12px", 
              textAlign: "center",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>DEBUG ENGINE</span>
            <span>{isDebugFolded ? "▼" : "▲"}</span>
          </div>
          
          {!isDebugFolded && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px" }}>
                <span style={{ opacity: 0.6 }}>Board:</span>
                <span style={{ color: "#f39c12", fontWeight: "bold" }}>{boardName}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ opacity: 0.6 }}>Phase:</span>
                <span style={{ color: "#fff" }}>{phase}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ opacity: 0.6 }}>Turn:</span>
                <span style={{ color: "#fff" }}>{turn}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ opacity: 0.6 }}>Moves:</span>
                <span style={{ color: "#fff" }}>{movesThisTurn}</span>
              </div>
              
              <div style={{ marginBottom: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
                <div style={{ opacity: 0.6, marginBottom: "2px" }}>Locked:</div>
                <div style={{ color: lockedSequencePiece ? "#2ecc71" : "#e74c3c", fontWeight: "bold", wordBreak: "break-all" }}>
                  {lockedSequencePiece || "NONE"}
                </div>
              </div>
              
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
                <div style={{ opacity: 0.6, marginBottom: "2px" }}>Selected:</div>
                <div style={{ color: "#fff" }}>{selectedPiece?.id || "NONE"}</div>
              </div>
            </div>
          )}
        </div>

        {/* GAME INFO PANEL */}
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
          <h3
            style={{
              margin: "0 0 15px 0",
              textAlign: "center",
              fontSize: "16px",
              color: "#f27813",
            }}
          >
            Live Stats
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              fontSize: "13px",
            }}
          >
            <span style={{ opacity: 0.7 }}>Turn:</span>
            <span style={{ fontWeight: "bold" }}>
              {turnCounter || Math.floor((moveHistory?.length || 0) / 2) + 1}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
              fontSize: "13px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "10px",
            }}
          >
            <span style={{ opacity: 0.7 }}>Move:</span>
            <span style={{ fontWeight: "bold" }}>
              {moveHistory?.length || 0}
            </span>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {/* Player (Self) */}
            <div
              style={{
                padding: "10px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "8px",
                borderLeft: `3px solid ${side === "white" ? "#f1c40f" : "#3498db"}`,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.6,
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                You ({side})
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatUsername(playerName, side === 'white' ? whiteRole : blackRole)}
              </div>
              <div
                style={{ fontSize: "12px", color: "#2ecc71", marginTop: "4px" }}
              >
                Elo: 1200
              </div>
            </div>

            {/* Opponent */}
            <div
              style={{
                padding: "10px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "8px",
                borderLeft: `3px solid ${side !== "white" ? "#f1c40f" : "#3498db"}`,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  opacity: 0.6,
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Opponent
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatUsername(opponent, side === 'white' ? blackRole : whiteRole)}
              </div>
              <div
                style={{ fontSize: "12px", color: "#2ecc71", marginTop: "4px" }}
              >
                Elo: 1200
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER - Game Board */}
      <div className="game-board-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, minHeight: 0 }}>
        <svg
          ref={svgRef}
          viewBox="-100 -10 610 445"
          style={svgStyle}
          onMouseMove={handleGlobalMouseMove}
          onMouseUp={handleGlobalMouseUp}
          onMouseLeave={handleGlobalMouseUp}
        >
          {renderBoard()}
        </svg>

        {selectedPiece && (
          <div style={selectionInfoStyle}>
            Selected: <strong>{selectedPiece.type}</strong>
          </div>
        )}
      </div>

      {/* RIGHT HUD - Color Selection & Status */}
      <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '180px', minWidth: '180px' }}>
        <div className="glass-panel" style={{ ...rightHudStyle, width: "100%", marginBottom: "10px" }}>
          <Clock clocks={clocks} lastTurnTimestamp={lastTurnTimestamp} turn={turn} side={side} phase={phase} />
        </div>

        <div className="glass-panel" style={{ ...rightHudStyle, width: '100%' }}>
          {phase === "Playing" && (
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
                }}
              >
                {turn === side 
                  ? (colorChosen[side] ? "Your Color:" : "Choose Color:") 
                  : (colorChosen[turn] ? "Opponent Color:" : "Opponent Deciding...")}
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: colorChosen[turn] ? "1fr" : "1fr 1fr",
                  gap: "10px",
                  justifyItems: "center",
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
                      width: "50px",
                      height: "50px",
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
                      (e.target.style.transform = "scale(1.1)")
                    }
                    onMouseOut={(e) =>
                      (e.target.style.transform = "scale(1)")
                    }
                  />
                ))}
              </div>
              {turn !== side && !colorChosen[turn] && (
                <div style={{ 
                  fontSize: "11px", 
                  color: "rgba(255, 255, 255, 0.4)", 
                  textAlign: "center",
                  marginTop: "5px",
                  fontStyle: "italic"
                }}>
                  Opponent choosing...
                </div>
              )}
            </div>
          )}
        </div>

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
          {phase === "Setup" && turn === side && (
            <button
              onClick={() => socket.emit("end_turn_setup", { gameId })}
              onMouseOver={(e) => (e.target.style.transform = "scale(1.03)")}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              style={{
                ...buttonStyle,
                backgroundColor: "#2ecc71",
                boxShadow: "0 2px 8px rgba(46, 204, 113, 0.3)",
                width: "100%",
                padding: "8px"
              }}
            >
              Confirm Placement
            </button>
          )}

          {phase === "Setup" && turn === side && (
            <button
              onClick={() => socket.emit("randomize_setup", { gameId, side })}
              onMouseOver={(e) => (e.target.style.transform = "scale(1.03)")}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              style={{
                ...buttonStyle,
                backgroundColor: "#9b59b6",
                boxShadow: "0 2px 8px rgba(155, 89, 182, 0.3)",
                width: "100%",
                padding: "8px"
              }}
            >
              Random Setup
            </button>
          )}

          {phase === "Playing" && turn === side && (
            <button
              onClick={() => socket.emit("pass_turn_playing", { gameId })}
              onMouseOver={(e) => (e.target.style.transform = "scale(1.03)")}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              style={{
                ...buttonStyle,
                backgroundColor: "#e67e22",
                boxShadow: "0 2px 8px rgba(230, 126, 34, 0.3)",
                width: "100%",
                padding: "8px"
              }}
            >
              End Turn
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

      {/* ── Game Over Overlay ── */}
      {showGameOverOverlay && (
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
                : null}
              <br />
              <span style={{ color: "var(--text-main)", fontWeight: "600" }}>
                Winner: {gameOverInfo.winnerId}
              </span>
            </div>
            <button
              onClick={() => navigate("/")}
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
              onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; e.target.style.boxShadow = "0 6px 24px rgba(70,176,212,0.5)"; }}
              onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 4px 16px rgba(70,176,212,0.35)"; }}
            >
              Back to Lobby
            </button>
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
  width: "180px",
  minWidth: "180px",
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
