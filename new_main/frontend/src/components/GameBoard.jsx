import React, { useState, useEffect, useMemo, useRef } from "react";
import { socket } from "../socket";
import init, { get_legal_moves_wasm } from "../wasm_pkg/frontend_wasm";

const PieceIcon = ({ type, side }) => {
  const isBlack = side === "black" || side === "yellow";
  const fill = isBlack ? "black" : "white";
  const stroke = "#000";

  switch (type) {
    case "berserker":
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
    case "bishop":
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

const GameBoard = ({ gameId, side, opponent, playerName, initialState }) => {
  const [wasmReady, setWasmReady] = useState(false);
  const [pieces, setPieces] = useState(initialState.pieces);
  const [turn, setTurn] = useState(initialState.turn);
  const [setupStep, setSetupStep] = useState(initialState.setupStep || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [isStatsHovered, setIsStatsHovered] = useState(false);

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
  const [phase, setPhase] = useState(initialState.phase || "Setup");
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

    socket.on("game_update", handleGameUpdate);
    socket.on("legal_moves", handleLegalMoves);

    socket.emit("join_game_room", { gameId });

    return () => {
      socket.off("game_update", handleGameUpdate);
      socket.off("legal_moves", handleLegalMoves);
    };
  }, [gameId]);

  const selected_piece_ref = useRef(selectedPiece);
  useEffect(() => {
    selected_piece_ref.current = selectedPiece;
  }, [selectedPiece]);

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
              fill={poly.color}
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
          cx = -60 - (returnedCounters.white % 3) * 30;
          cy = 60 + Math.floor(returnedCounters.white / 3) * 30;
          returnedCounters.white++;
        } else {
          cx = 468 + (returnedCounters.black % 3) * 30;
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
      let allowedToMove = false;

      if (phase === "Setup") {
        if (
          isMyTurn &&
          actualPieceSide === side &&
          piece.position === "returned"
        ) {
          if (setupStep === 0 && piece.type === "goddess") allowedToMove = true;
          if (setupStep === 1 && piece.type === "heroe") allowedToMove = true;
          if (setupStep === 2 && piece.type === "berserker")
            allowedToMove = true;
          if (setupStep === 3 && piece.type === "bishop") allowedToMove = true;
          if (
            setupStep === 4 &&
            (piece.type === "ghoul" || piece.type === "siren")
          )
            allowedToMove = true;
        }
      } else {
        if (
          isMyTurn &&
          actualPieceSide === side &&
          piece.position !== "graveyard"
        ) {
          if (piece.position === "returned") {
            // Returned pieces can be deployed once color is chosen
            if (colorChosen[side]) allowedToMove = true;
          } else {
            allowedToMove = true;
          }
        }
      }

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
      {/* LEFT HUD - Main Info & Actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "195px",
          padding: "15px",
          minWidth: "195px",
        }}
      >
        <div className="glass-panel" style={{ ...leftHudStyle, width: "100%" }}>
          <div
            style={{
              fontWeight: "bold",
              color: "#6366f1",
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
              marginBottom: "30px",
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              width: "100%",
            }}
          >
            {phase === "Setup" && turn === side && (
              <button
                onClick={() => socket.emit("end_turn_setup", { gameId })}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#2ecc71",
                  boxShadow: "0 4px 12px rgba(46, 204, 113, 0.4)",
                }}
              >
                Confirm Placement
              </button>
            )}

            {phase === "Setup" && turn === side && (
              <button
                onClick={() => socket.emit("randomize_setup", { gameId, side })}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#9b59b6",
                  boxShadow: "0 4px 12px rgba(155, 89, 182, 0.4)",
                }}
              >
                Random Setup
              </button>
            )}

            {phase === "Playing" && turn === side && (
              <button
                onClick={() => socket.emit("pass_turn_playing", { gameId })}
                onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
                style={{
                  ...buttonStyle,
                  backgroundColor: "#e67e22",
                  boxShadow: "0 4px 12px rgba(230, 126, 34, 0.4)",
                }}
              >
                End Turn
              </button>
            )}

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
              style={{
                ...buttonStyle,
                backgroundColor: "#34495e",
                boxShadow: "0 4px 12px rgba(52, 73, 94, 0.4)",
              }}
            >
              Flip Board
            </button>
          </div>
        </div>

        {/* GAME INFO PANEL */}
        <div
          className="glass-panel"
          onMouseEnter={() => setIsStatsHovered(true)}
          onMouseLeave={() => setIsStatsHovered(false)}
          style={{ 
            ...leftHudStyle, 
            width: isStatsHovered ? "280px" : "100%", 
            alignItems: "stretch",
            position: "relative",
            zIndex: isStatsHovered ? 50 : 1,
            transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isStatsHovered ? "0 10px 30px rgba(0,0,0,0.5)" : undefined,
            overflow: "hidden"
          }}
        >
          <h3
            style={{
              margin: "0 0 15px 0",
              textAlign: "center",
              fontSize: "16px",
              color: "#a855f7",
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
                {playerName}
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
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {opponent || "Guest"}
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
      <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0, minHeight: 0 }}>
        <svg
          ref={svgRef}
          viewBox="-160 -30 730 480"
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
      <div className="glass-panel" style={rightHudStyle}>
        {phase === "Playing" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              width: "100%",
            }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: "5px",
                }}
              >
                Chosen Colors:
              </span>
              {["white", "black"].map((s) => (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ opacity: 0.8 }}>{s}:</span>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor: colorChosen[s] || "transparent",
                      border: "1px solid #777",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              ))}
            </div>

            {!colorChosen[side] && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  marginTop: "20px",
                }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    color: "#f1c40f",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  Choose Movement:
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  {["grey", "green", "blue", "orange"].map((color) => (
                    <div
                      key={color}
                      onClick={() =>
                        turn === side &&
                        socket.emit("color_selected", { gameId, color, side })
                      }
                      style={{
                        aspectRatio: "1",
                        backgroundColor: color,
                        borderRadius: "50%",
                        cursor: turn === side ? "pointer" : "default",
                        border: "2px solid rgba(255,255,255,0.3)",
                        transition: "transform 0.1s",
                        opacity: turn === side ? 1 : 0.4,
                      }}
                      onMouseOver={(e) =>
                        turn === side &&
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
        {phase !== "Playing" && (
          <div style={{ opacity: 0.5, textAlign: "center", marginTop: "50px" }}>
            Phase: Setup
          </div>
        )}
      </div>
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
  padding: "10px",
  boxSizing: "border-box",
  gap: "15px",
};

const leftHudStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px",
  height: "fit-content",
  boxSizing: "border-box",
};

const rightHudStyle = {
  ...leftHudStyle,
  width: "195px",
  minWidth: "195px",
};

const statusBarStyle = {
  padding: "12px 40px",
  borderRadius: "30px",
  fontSize: "20px",
};

const svgStyle = {
  width: "100%",
  height: "100%",
  maxHeight: "95vh",
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
