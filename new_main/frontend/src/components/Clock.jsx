import React, { useState, useEffect } from 'react';

const Clock = ({ clocks, lastTurnTimestamp, turn, side, phase, whiteName, blackName, whiteRating, blackRating, whiteRole, blackRole }) => {
  const [localClocks, setLocalClocks] = useState(clocks);

  useEffect(() => {
    setLocalClocks(clocks);
  }, [turn]);

  useEffect(() => {
    if (!turn) return;
    const inactive = turn === 'white' ? 'black' : 'white';
    setLocalClocks(prev => ({ ...prev, [inactive]: clocks[inactive] }));
  }, [clocks, turn]);

  useEffect(() => {
    if (!turn || phase === 'GameOver') return;
    const interval = setInterval(() => {
      setLocalClocks(prev => ({
        ...prev,
        [turn]: Math.max(0, prev[turn] - 100),
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [turn, phase]);

  const formatTime = (ms) => {
    if (ms == null || isNaN(ms)) return '--:--';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isSpectator = side === 'spectator';
  const topSide    = isSpectator ? 'black' : (side === 'white' ? 'black' : 'white');
  const bottomSide = isSpectator ? 'white' : side;

  const getPlayerData = (s) => {
    const isWhite = s === 'white';
    return {
      name: isWhite ? whiteName : blackName,
      rating: isWhite ? whiteRating : blackRating,
      role: isWhite ? whiteRole : blackRole,
      label: isSpectator ? (isWhite ? 'White' : 'Black') : (s === side ? 'You' : 'Opponent'),
      icon: isWhite ? '⚪' : '⚫'
    };
  };

  const timerStyle = (isActive) => ({
    padding: '10px 14px',
    borderRadius: '12px',
    background: isActive ? 'rgba(70, 176, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
    border: `1px solid ${isActive ? 'rgba(70, 176, 212, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
    transition: 'all 0.3s ease',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    boxShadow: isActive ? '0 0 20px rgba(70, 176, 212, 0.2)' : 'none',
  });

  const timeValueStyle = (isActive) => ({
    fontSize: '20px',
    fontWeight: '800',
    fontFamily: "'Outfit', sans-serif",
    color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
  });

  const PlayerBlock = ({ playerSide }) => {
    const isActive = turn === playerSide;
    const data = getPlayerData(playerSide);
    
    return (
      <div style={timerStyle(isActive)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {data.icon} {data.label}
          </span>
          <div style={timeValueStyle(isActive)}>
            {formatTime(localClocks[playerSide])}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '13px', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            color: isActive ? '#46b0d4' : '#fff'
          }}>
            {data.name}
          </div>
          <div style={{ fontSize: '11px', color: '#2ecc71', fontWeight: 'bold' }}>
            {data.rating || '—'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      <PlayerBlock playerSide={topSide} />
      <PlayerBlock playerSide={bottomSide} />
    </div>
  );
};

export default Clock;

