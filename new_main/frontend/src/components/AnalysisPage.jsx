/**
 * AnalysisPage.jsx
 * Full game replay room — built from the same SVG rendering foundation as GameBoard.
 *
 * Record format (v2):
 * {
 *   version: 2,
 *   boardName: string,
 *   whiteName: string,
 *   blackName: string,
 *   winner: string,
 *   reason: string,
 *   timeControl: { minutes, increment } | null,
 *   board: BoardMap  (allPolygons, allEdges, …),
 *   initialPieces: Piece[],
 *   snapshots: Array<{ pieces, clocks, colorChosen, turn, phase }>,
 *   history:  Array<{ pieceId, targetPoly, captured }>,
 * }
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// PieceIcon — exact copy from GameBoard so rendering is identical
// ─────────────────────────────────────────────────────────────────────────────
const PieceIcon = ({ type, side }) => {
  const isBlack = side === 'black' || side === 'yellow';
  const fill = isBlack ? 'black' : 'white';
  const stroke = '#000';

  switch (type) {
    case 'golem':
      return (
        <g transform="scale(0.09)">
          {[0, 120, 240].map(angle => (
            <path key={angle} d="M 0 0 A 10 25 0 0 1 110 110 Z"
              fill={fill} stroke={stroke} strokeWidth="20" transform={`rotate(${angle} 0 0)`} />
          ))}
          {isBlack && [0, 120, 240].map(angle => (
            <path key={`i-${angle}`} d="M 0 0 A 10 25 0 0 1 110 110 Z"
              fill="black" stroke="white" strokeWidth="15" transform={`rotate(${angle} 0 0) scale(0.5)`} />
          ))}
        </g>
      );
    case 'soldier':
      return (
        <g transform="scale(0.9)">
          <ellipse cx="0" cy="0" rx="10" ry="10" fill={fill} stroke={isBlack ? 'black' : 'white'} strokeWidth="4" />
          <ellipse cx="0" cy="0" rx="12" ry="12" fill="none" stroke="black" strokeWidth="2" />
        </g>
      );
    case 'goddess':
      return (
        <g transform="scale(0.23)">
          <polygon points="0,-55 50,15 0,55 -50,15" fill={fill} stroke="black" strokeWidth="8" />
          <polygon points="0,-15 20,10 0,20 -20,10"
            fill={isBlack ? 'black' : 'black'}
            stroke={isBlack ? 'white' : 'black'}
            strokeWidth={isBlack ? '4' : '8'} />
        </g>
      );
    case 'witch':
      return (
        <g transform="translate(-40, -44)">
          <polygon points="40,32 30,50 50,50" fill={fill} stroke="black" strokeWidth="2" />
        </g>
      );
    case 'heroe':
    case 'king':
      return (
        <g transform="scale(0.46) translate(-50, -187)">
          <polygon points="50,165 55,180 70,180 60,190 65,205 50,195 35,205 40,190 30,180 45,180"
            fill={fill} stroke="black" strokeWidth="3" />
        </g>
      );
    case 'mage':
      if (isBlack) {
        return (
          <g transform="scale(0.04) translate(-255.77, -221.5)">
            <polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01"
              fill="black" stroke="black" strokeWidth="30" />
            {[
              [130.77, 438.01], [5.77, 221.50], [130.77, 5], [380.77, 5], [505.77, 221.50], [380.77, 438.01]
            ].map(([cx, cy], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx="80" ry="80" fill="black" stroke="black" strokeWidth="10" />
            ))}
            <ellipse cx="255.77" cy="221.5" rx="80" ry="80" fill="none" stroke="white" strokeWidth="30" />
            <ellipse cx="255.77" cy="221.5" rx="110" ry="110" fill="none" stroke="black" strokeWidth="20" />
            <ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="white" strokeWidth="30" />
          </g>
        );
      }
      return (
        <g transform="scale(0.04) translate(-255.77, -221.5)">
          {[
            [130.77, 438.01], [5.77, 221.50], [130.77, 5], [380.77, 5], [505.77, 221.50], [380.77, 438.01]
          ].map(([cx, cy], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx="80" ry="80" fill="black" stroke="black" strokeWidth="10" />
          ))}
          <polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01"
            fill="white" stroke="black" strokeWidth="35" />
          {[
            [130.77, 438.01], [5.77, 221.50], [130.77, 5], [380.77, 5], [505.77, 221.50], [380.77, 438.01]
          ].map(([cx, cy], i) => (
            <ellipse key={`w-${i}`} cx={cx} cy={cy} rx="40" ry="40" fill="white" stroke="white" strokeWidth="1" />
          ))}
          <ellipse cx="255.77" cy="221.5" rx="80" ry="80" fill="none" stroke="black" strokeWidth="35" />
          <ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="black" strokeWidth="35" />
        </g>
      );
    case 'siren': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${14 * Math.cos(a)},${14 * Math.sin(a)}`;
      }).join(' ');
      return (
        <g transform="scale(0.8)">
          <ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" strokeWidth="4" />
          <polygon points={pts} fill={fill} stroke="black" strokeWidth="2" />
          {isBlack ? (<>
            <line x1="-8" x2="8" y1="-8" y2="8" stroke="white" strokeWidth="1" />
            <line x1="-8" x2="8" y1="8" y2="-8" stroke="white" strokeWidth="1" />
            <line x1="10" x2="-10" y1="0" y2="0" stroke="white" strokeWidth="1" />
            <line x1="0" x2="0" y1="-10" y2="10" stroke="white" strokeWidth="1" />
            <circle r="6.5" fill="white" strokeWidth="0" />
            <circle r="5.5" fill="black" strokeWidth="0" />
          </>) : (<>
            <line x1="-8" x2="8" y1="-8" y2="8" stroke="black" strokeWidth="1" />
            <line x1="-8" x2="8" y1="8" y2="-8" stroke="black" strokeWidth="1" />
            <line x1="10" x2="-10" y1="0" y2="0" stroke="black" strokeWidth="1" />
            <line x1="0" x2="0" y1="-10" y2="10" stroke="black" strokeWidth="1" />
            <circle r="6.5" fill="black" stroke="black" strokeWidth="0" />
            <circle r="4" fill="white" stroke="white" strokeWidth="0" />
          </>)}
        </g>
      );
    }
    case 'ghoul':
      return (
        <g transform="scale(0.8) translate(-9.5, -9.5)">
          <rect x="0" y="0" width="19" height="19" fill={fill} stroke="black" strokeWidth="2" />
          {isBlack && <rect x="7" y="7" width="5" height="5" fill="black" stroke="white" strokeWidth="1" />}
        </g>
      );
    default:
      return <text dy=".3em" textAnchor="middle" fontSize="10" fill={fill}>{(type || '?')[0].toUpperCase()}</text>;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtMs = (ms) => {
  if (ms == null) return '--:--';
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const REASON_LABELS = {
  timeout: 'Time ran out',
  goddess_captured: 'Goddess captured',
  abandoned: 'Opponent disconnected',
  resign: 'A player resigned',
  pass_limit: 'Passed 3 times in a row',
};

// ─────────────────────────────────────────────────────────────────────────────
// ColorCircles — similar to GameBoard for showing chosen colors
// ─────────────────────────────────────────────────────────────────────────────
const ColorCircles = ({ chosenColor, turn }) => {
  const colors = ["grey", "green", "blue", "orange"];
  const displayColors = chosenColor ? [chosenColor] : colors;

  return (
    <div style={{
      display: "flex",
      gap: "8px",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "10px",
      padding: "10px",
      background: "rgba(255,255,255,0.03)",
      borderRadius: "12px",
      border: "1px solid var(--border)"
    }}>
      <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "4px" }}>
        {chosenColor ? "Color:" : "No selection"}
      </span>
      {displayColors.map((color) => (
        <div
          key={color}
          style={{
            width: "24px",
            height: "24px",
            backgroundColor: color,
            borderRadius: "50%",
            border: `2px solid ${chosenColor === color ? "white" : "rgba(255,255,255,0.1)"}`,
            boxShadow: chosenColor === color ? `0 0 10px ${color}` : "none",
            opacity: chosenColor ? (chosenColor === color ? 1 : 0.2) : 0.6,
          }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisPage
// ─────────────────────────────────────────────────────────────────────────────
const AnalysisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const autoPlayRef = useRef(null);
  const moveListRef = useRef(null);

  const [record, setRecord] = useState(location.state?.record || null);
  const [stepIdx, setStepIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const totalSteps = record ? record.snapshots.length : 0;
  const snap = record ? record.snapshots[Math.min(stepIdx, totalSteps - 1)] : null;
  const currentPieces = snap?.pieces || [];
  const currentClocks = snap?.clocks || null;
  const currentPhase = snap?.phase || '';
  const currentTurn = snap?.turn || '';
  // history[i] is the move that PRODUCED snapshots[i+1]
  const currentMove = record?.history?.[stepIdx - 1] || null;

  // ── Board geometry (same logic as GameBoard) ──
  const { boardCenter, boardViewBox } = useMemo(() => {
    const fallback = { boardCenter: { x: 205, y: 217 }, boardViewBox: '-100 -10 610 445' };
    if (!record?.board?.allPolygons) return fallback;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(record.board.allPolygons).forEach(poly => {
      (poly.points || poly.vertices || []).forEach(([x, y]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      });
    });
    const pad = 60;
    return {
      boardCenter: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      boardViewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
    };
  }, [record]);

  // ── Navigation ──
  const goTo = useCallback((idx) => {
    setStepIdx(prev => {
      const next = Math.max(0, Math.min(idx, totalSteps - 1));
      return next;
    });
  }, [totalSteps]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
    setAutoPlaying(false);
  }, []);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) return;
    setAutoPlaying(true);
    autoPlayRef.current = setInterval(() => {
      setStepIdx(prev => {
        if (prev >= totalSteps - 1) {
          clearInterval(autoPlayRef.current);
          autoPlayRef.current = null;
          setAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
  }, [totalSteps]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { stopAutoPlay(); goTo(stepIdx + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { stopAutoPlay(); goTo(stepIdx - 1); }
      if (e.key === 'Home') { stopAutoPlay(); goTo(0); }
      if (e.key === 'End')  { stopAutoPlay(); goTo(totalSteps - 1); }
      if (e.key === ' ') { e.preventDefault(); autoPlaying ? stopAutoPlay() : startAutoPlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIdx, totalSteps, autoPlaying, goTo, stopAutoPlay, startAutoPlay]);

  // Auto-scroll move list
  useEffect(() => {
    if (!moveListRef.current) return;
    const active = moveListRef.current.querySelector('.al-move-item--active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [stepIdx]);

  // ── File loading ──
  const loadFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.snapshots || !data.board) { alert('Invalid or unsupported game file.'); return; }
        setRecord(data);
        setStepIdx(0);
        stopAutoPlay();
      } catch { alert('Could not parse file.'); }
    };
    reader.readAsText(file);
  };

  // ── Board rendering (read-only, same as GameBoard) ──
  const renderEdges = () => {
    if (!record?.board?.allEdges) return null;
    return Object.entries(record.board.allEdges).map(([id, edge]) => {
      if (!edge.sharedPoints || edge.sharedPoints.length !== 2) return null;
      const isRed = edge.color === 'red';
      return (
        <line key={id}
          x1={edge.sharedPoints[0][0]} y1={edge.sharedPoints[0][1]}
          x2={edge.sharedPoints[1][0]} y2={edge.sharedPoints[1][1]}
          stroke={isRed ? '#ef4444' : 'black'}
          strokeWidth={isRed ? '3' : '0.5'}
          opacity={isRed ? 1 : 0.6}
        />
      );
    });
  };

  const renderBoard = () => {
    if (!record?.board?.allPolygons) return null;
    const flipTransform = isFlipped ? `rotate(180, ${boardCenter.x}, ${boardCenter.y})` : '';
    return (
      <g transform={flipTransform} style={{ transition: 'transform 0.6s ease-in-out' }}>
        {/* Polygons */}
        {Object.entries(record.board.allPolygons).map(([id, poly]) => (
          <polygon key={id}
            points={(poly.points || poly.vertices || []).map(([x, y]) => `${x},${y}`).join(' ')}
            fill={poly.color || '#888'}
            stroke="black"
            strokeWidth="0.5"
          />
        ))}
        {renderEdges()}
        {/* Highlight last move */}
        {currentMove && record.board.allPolygons[currentMove.targetPoly] && (() => {
          const poly = record.board.allPolygons[currentMove.targetPoly];
          const [cx, cy] = poly.center;
          return (
            <circle cx={cx} cy={cy} r="20"
              fill="rgba(241,196,15,0.25)"
              stroke="#f1c40f" strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}
        {/* Pieces */}
        {renderPieces()}
      </g>
    );
  };

  const renderPieces = () => {
    if (!record?.board?.allPolygons || !currentPieces) return null;
    const returnedCounters = { white: 0, black: 0 };
    const boardWidth = record.board.width || 410;

    return currentPieces.map(piece => {
      const isOffBoard = piece.position === 'returned' || piece.position === 'graveyard';
      const pieceSide = piece.side || (piece.color === 'white' ? 'white' : 'black');
      let cx = 0, cy = 0;

      if (isOffBoard) {
        if (pieceSide === 'white') {
          cx = -25 - (returnedCounters.white % 3) * 26;
          cy = 60 + Math.floor(returnedCounters.white / 3) * 30;
          returnedCounters.white++;
        } else {
          cx = boardWidth + 25 + (returnedCounters.black % 3) * 26;
          cy = 60 + Math.floor(returnedCounters.black / 3) * 30;
          returnedCounters.black++;
        }
      } else {
        const poly = record.board.allPolygons[piece.position];
        if (!poly) return null;
        [cx, cy] = poly.center;
      }

      const isLastMoved = currentMove && piece.id === currentMove.pieceId;
      const flipPiece = isFlipped ? 'rotate(180)' : '';

      return (
        <g key={piece.id}
          transform={`translate(${cx}, ${cy}) ${isFlipped ? 'rotate(180)' : ''}`}
          style={{ opacity: isOffBoard ? 0.5 : 1, filter: isOffBoard ? 'grayscale(80%)' : 'none' }}
        >
          <circle r="18"
            fill={isLastMoved ? '#f1c40f' : 'white'}
            opacity={isLastMoved ? 0.35 : 0}
          />
          <PieceIcon type={piece.type} side={pieceSide} />
        </g>
      );
    });
  };

  // ── Player header box ──
  const PlayerBox = ({ name, side, clocks, isActive }) => (
    <div className={`al-player-box${isActive ? ' al-player-box--active' : ''}`}>
      <div className="al-player-side-dot" style={{ background: side === 'white' ? '#f8fafc' : '#0f172a', border: '1px solid rgba(255,255,255,0.3)' }} />
      <div className="al-player-name">{name}</div>
      <div className="al-player-clock">{clocks ? fmtMs(clocks[side]) : '--:--'}</div>
    </div>
  );

  return (
    <div className="al-page">
      {/* ── Header ── */}
      <div className="al-header glass-panel">
        <button className="al-back-btn" onClick={() => navigate('/')}>← Lobby</button>
        <div className="al-title-area">
          <span className="al-title-label">Analysis Room</span>
          {record && (
            <span className="al-game-subtitle">
              {record.whiteName} vs {record.blackName}
              {record.boardName && <span className="al-board-tag">{record.boardName}</span>}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {record && (
            <button className="al-action-btn" onClick={() => {
              const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `dedal_${record.boardName || 'game'}_${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}>⬇ Download</button>
          )}
          <button className="al-action-btn" onClick={() => fileInputRef.current?.click()}>📂 Load File</button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }}
            onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      {/* ── Main body ── */}
      {!record ? (
        /* Upload zone */
        <div
          className={`al-upload-zone glass-panel${dragActive ? ' al-upload-zone--active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={e => { e.preventDefault(); setDragActive(false); loadFile(e.dataTransfer.files?.[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="al-upload-icon">📋</div>
          <div className="al-upload-title">Drop a Dedal game JSON here</div>
          <div className="al-upload-sub">or click to browse · keyboard: ← → Space</div>
        </div>
      ) : (
        <div className="al-content">
          {/* ── Board column ── */}
          <div className="al-board-col">
            {/* Black player (top when not flipped) */}
            <PlayerBox
              name={record.blackName} side="black"
              clocks={currentClocks}
              isActive={currentTurn === 'black'}
            />

            {/* SVG Board */}
            <div className="al-svg-wrapper">
              <svg
                viewBox={boardViewBox}
                preserveAspectRatio="xMidYMin meet"
                style={{ width: '100%', height: '100%' }}
              >
                {renderBoard()}
              </svg>
            </div>

            {/* White player (bottom) */}
            <PlayerBox
              name={record.whiteName} side="white"
              clocks={currentClocks}
              isActive={currentTurn === 'white'}
            />

            {/* Transport bar */}
            <div className="al-transport glass-panel">
              <button className="al-ctrl-btn" title="First (Home)" onClick={() => { stopAutoPlay(); goTo(0); }}>⏮</button>
              <button className="al-ctrl-btn" title="Prev (←)" onClick={() => { stopAutoPlay(); goTo(stepIdx - 1); }}>◀</button>
              <button
                className={`al-ctrl-btn al-ctrl-play${autoPlaying ? ' al-ctrl-play--on' : ''}`}
                title="Play/Pause (Space)"
                onClick={() => autoPlaying ? stopAutoPlay() : startAutoPlay()}
              >
                {autoPlaying ? '⏸' : '▶'}
              </button>
              <button className="al-ctrl-btn" title="Next (→)" onClick={() => { stopAutoPlay(); goTo(stepIdx + 1); }}>▶</button>
              <button className="al-ctrl-btn" title="Last (End)" onClick={() => { stopAutoPlay(); goTo(totalSteps - 1); }}>⏭</button>

              <input
                type="range" min={0} max={totalSteps - 1} value={stepIdx}
                onChange={e => { stopAutoPlay(); goTo(Number(e.target.value)); }}
                className="al-scrubber"
              />
              <span className="al-step-counter">{stepIdx} / {totalSteps - 1}</span>
              <button 
                className="al-ctrl-btn al-flip-btn" 
                title="Flip Board" 
                onClick={() => setIsFlipped(f => !f)}
                style={{ width: 'auto', padding: '0 12px', gap: '6px' }}
              >
                <span>↕</span> <span style={{ fontSize: '11px' }}>Flip</span>
              </button>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="al-sidebar glass-panel">
            {/* Result */}
            <div className="al-result-card">
              <div className="al-result-winner">🏆 {record.winner}</div>
              <div className="al-result-reason">{REASON_LABELS[record.reason] || record.reason}</div>
              {record.timeControl && (
                <div className="al-result-tc">{record.timeControl.minutes}+{record.timeControl.increment || 0}</div>
              )}
            </div>

            {/* Phase / move detail */}
            <div className="al-move-detail glass-panel" style={{ minHeight: 56 }}>
              {currentPhase && <span className={`al-phase-badge al-phase-${currentPhase.toLowerCase()}`}>{currentPhase}</span>}
              {currentMove ? (
                <>
                  <div className="al-moveline">
                    <span className="al-move-num">#{stepIdx}</span>
                    <span className="al-move-piece">{currentMove.pieceId}</span>
                    <span className="al-move-arrow">→</span>
                    <span className="al-move-target">{currentMove.targetPoly}</span>
                    {currentMove.captured && <span className="al-move-cap">× {currentMove.captured}</span>}
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Start position</span>
              )}
            </div>

            {/* Color selection indicators */}
            <ColorCircles chosenColor={snap?.colorChosen?.[currentTurn]} turn={currentTurn} />

            {/* Move list */}
            <div className="al-move-list-header">Move List</div>
            <div className="al-move-list" ref={moveListRef}>
              <div
                className={`al-move-item${stepIdx === 0 ? ' al-move-item--active' : ''}`}
                onClick={() => { stopAutoPlay(); goTo(0); }}
              >
                <span className="al-mn">0</span>
                <span className="al-md">Start</span>
              </div>
              {(record.history || []).map((move, i) => {
                const si = i + 1;
                const meta = record.snapshots?.[si] || {};
                return (
                  <div key={i}
                    className={`al-move-item${stepIdx === si ? ' al-move-item--active' : ''}`}
                    onClick={() => { stopAutoPlay(); goTo(si); }}
                  >
                    <span className="al-mn">{si}</span>
                    <span className="al-side-dot" style={{
                      background: meta.turn === 'white' ? '#f8fafc' : '#0f172a',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }} />
                    <span className="al-md">{move.pieceId} → {move.targetPoly}</span>
                    {move.captured && <span className="al-cap">×</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
