import React, { useState, useEffect } from 'react';

const Clock = ({ clocks, lastTurnTimestamp, turn, side, phase, whiteName, blackName }) => {
  const [localClocks, setLocalClocks] = useState(clocks);

  // Sync EVERYTHING from the server only when the active turn changes
  // (that's when real time was deducted / increment applied).
  // Mid-turn game_update events intentionally do NOT reset the active clock.
  useEffect(() => {
    setLocalClocks(clocks);
  }, [turn]); // ← NOT [clocks] — avoids mid-turn jumps

  // Always keep the INACTIVE player's clock up to date from the server
  // (e.g. their time was topped up by an increment at their last turn end)
  useEffect(() => {
    if (!turn) return;
    const inactive = turn === 'white' ? 'black' : 'white';
    setLocalClocks(prev => ({ ...prev, [inactive]: clocks[inactive] }));
  }, [clocks, turn]);

  // Smooth local tick: subtract exactly 100ms per interval from the active player.
  // No dependency on `clocks` or `lastTurnTimestamp` — the interval never restarts
  // mid-turn, so there is no visible jump.
  useEffect(() => {
    if (!turn || phase === 'GameOver') return;
    const interval = setInterval(() => {
      setLocalClocks(prev => ({
        ...prev,
        [turn]: Math.max(0, prev[turn] - 100),
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [turn, phase]); // restarts only on turn change or game over

  const formatTime = (ms) => {
    if (ms == null || isNaN(ms)) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isSpectator = side === 'spectator';
  // For spectators, we show both sides. For players, opponent is always top, self is bottom.
  const topSide    = isSpectator ? 'black' : (side === 'white' ? 'black' : 'white');
  const bottomSide = isSpectator ? 'white' : side;

  // Resolve display names: prefer passed props, fall back to side label
  const nameFor = (s) => {
    if (s === 'white') return whiteName || 'White';
    if (s === 'black') return blackName || 'Black';
    return s;
  };

  const topLabel    = isSpectator ? nameFor(topSide)    : `Opponent (${topSide})`;
  const bottomLabel = isSpectator ? nameFor(bottomSide) : `You (${bottomSide})`;

  const timerStyle = (isActive) => ({
    padding: '15px 20px',
    borderRadius: '12px',
    background: isActive ? 'rgba(70, 176, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${isActive ? 'rgba(70, 176, 212, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
    textAlign: 'center',
    transition: 'all 0.3s ease',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: isActive ? '0 0 20px rgba(70, 176, 212, 0.2)' : 'none',
  });

  const timeValueStyle = (isActive) => ({
    fontSize: '24px',
    fontWeight: '800',
    fontFamily: "'Outfit', sans-serif",
    color: isActive ? '#fff' : 'var(--text-muted)',
    textShadow: isActive ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
  });

  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    opacity: 0.6,
    marginBottom: '5px',
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
      {/* Top clock (opponent for players, Black for spectators) */}
      <div style={timerStyle(turn === topSide)}>
        <span style={labelStyle} title={topLabel}>{topLabel}</span>
        <div style={timeValueStyle(turn === topSide)}>
          {formatTime(localClocks[topSide])}
        </div>
      </div>

      {/* Bottom clock (self for players, White for spectators) */}
      <div style={timerStyle(turn === bottomSide)}>
        <span style={labelStyle} title={bottomLabel}>{bottomLabel}</span>
        <div style={timeValueStyle(turn === bottomSide)}>
          {formatTime(localClocks[bottomSide])}
        </div>
      </div>
    </div>
  );
};

export default Clock;
