import React, { useState, useEffect } from 'react';

const Clock = ({ clocks, lastTurnTimestamp, turn, side, phase }) => {
  const [localClocks, setLocalClocks] = useState(clocks);

  useEffect(() => {
    setLocalClocks(clocks);
  }, [clocks]);

  useEffect(() => {
    // Stop the clock when the game is over
    if (!lastTurnTimestamp || !turn || phase === 'GameOver') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTurnTimestamp;
      const deduction = Math.max(0, elapsed - 100);

      setLocalClocks(prev => ({
        ...clocks, // Always start from server truth
        [turn]: Math.max(0, clocks[turn] - deduction)
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [clocks, lastTurnTimestamp, turn, phase]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const opponentSide = side === 'white' ? 'black' : 'white';

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
    display: 'block'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
      {/* Opponent Clock */}
      <div style={timerStyle(turn === opponentSide)}>
        <span style={labelStyle}>Opponent ({opponentSide})</span>
        <div style={timeValueStyle(turn === opponentSide)}>
          {formatTime(localClocks[opponentSide])}
        </div>
      </div>

      {/* Player Clock */}
      <div style={timerStyle(turn === side)}>
        <span style={labelStyle}>You ({side})</span>
        <div style={timeValueStyle(turn === side)}>
          {formatTime(localClocks[side])}
        </div>
      </div>
    </div>
  );
};

export default Clock;
