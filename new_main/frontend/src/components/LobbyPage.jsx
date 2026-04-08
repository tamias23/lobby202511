import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

const TIME_CONTROLS = [
  { label: '30 + 30', minutes: 30, increment: 30, description: 'Classical', color: '#46b0d4' },
  { label: '15 + 30', minutes: 15, increment: 30, description: 'Rapid',     color: '#f27813' },
  { label: '15 + 10', minutes: 15, increment: 10, description: 'Rapid',     color: '#06b6d4' },
  { label: '10 + 5',  minutes: 10, increment: 5,  description: 'Blitz',     color: '#f59e0b' },
  { label: '60 + 30', minutes: 60, increment: 30, description: 'Long',      color: '#ec4899' },
];

const LobbyPage = ({ user }) => {
  const navigate = useNavigate();
  const [gameRequests, setGameRequests] = useState([]);
  const [activeGames, setActiveGames]   = useState([]);
  const [liveStats, setLiveStats]       = useState({ onlineUsers: 0, activeGames: 0 });
  const [myRequestId, setMyRequestId]   = useState(null);
  const [notification, setNotification] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customMin, setCustomMin] = useState(15);
  const [customInc, setCustomInc] = useState(10);
  const [botTimeControl, setBotTimeControl] = useState({ minutes: 15, increment: 10 });
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [availableBots, setAvailableBots] = useState([]);


  const showNotif = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // --- Socket listeners ---
  useEffect(() => {
    const onLobbyState = ({ gameRequests, activeGames, stats, available_bots }) => {
      setGameRequests(gameRequests || []);
      setActiveGames(activeGames || []);
      setLiveStats(stats || { onlineUsers: 0, activeGames: 0 });
      if (available_bots) setAvailableBots(available_bots);
    };

    const onLobbyUpdate = (update) => {
      if (update.gameRequests !== undefined) setGameRequests(update.gameRequests);
      if (update.activeGames  !== undefined) setActiveGames(update.activeGames);
      if (update.stats        !== undefined) setLiveStats(update.stats);
      if (update.available_bots !== undefined) setAvailableBots(update.available_bots);
    };

    const onGameCreated = ({ hash, side, opponent, initialState }) => {
      navigate(`/games/${hash}`, {
        state: { side, opponent, initialState, gameHash: hash },
      });
    };

    const onRequestCreated = ({ requestId }) => {
      setMyRequestId(requestId);
      showNotif('Game request posted! Waiting for an opponent…', 'success');
    };

    const onRequestError = ({ message }) => {
      showNotif(message, 'error');
    };

    const onBotError = ({ message }) => {
      showNotif(`🤖 ${message}`, 'error');
    };

    socket.on('lobby_state',    onLobbyState);
    socket.on('lobby_update',   onLobbyUpdate);
    socket.on('game_created',   onGameCreated);
    socket.on('request_created', onRequestCreated);
    socket.on('request_error',  onRequestError);
    socket.on('bot_error',      onBotError);

    // Enter lobby room
    socket.emit('enter_lobby');

    return () => {
      socket.off('lobby_state',    onLobbyState);
      socket.off('lobby_update',   onLobbyUpdate);
      socket.off('game_created',   onGameCreated);
      socket.off('request_created', onRequestCreated);
      socket.off('bot_error',      onBotError);
    };
  }, [navigate]);


  const handleTimeControl = useCallback((tc) => {
    if (myRequestId) {
      showNotif('You already have an open request. Cancel it first.', 'error');
      return;
    }
    socket.emit('create_game_request', {
      timeControl: { minutes: tc.minutes, increment: tc.increment },
      userId: user?.id || null,
      username: user?.username || null,
      role: user?.role || 'guest',
    });
  }, [myRequestId, user]);

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (myRequestId) {
      showNotif('You already have an open request.', 'error');
      return;
    }
    const mins = parseInt(customMin);
    const inc = parseInt(customInc);

    if (isNaN(mins) || mins < 1 || mins > 120) {
      showNotif('Minutes must be between 1 and 120.', 'error');
      return;
    }
    if (isNaN(inc) || inc < 3 || inc > 120) {
      showNotif('Increment must be between 3 and 120 seconds.', 'error');
      return;
    }

    socket.emit('create_game_request', {
      timeControl: { minutes: mins, increment: inc },
      userId: user?.id || null,
      username: user?.username || null,
      role: user?.role || 'guest',
    });
    setShowCustomForm(false);
  };

  const handleCancelRequest = () => {
    if (!myRequestId) return;
    socket.emit('cancel_game_request', { requestId: myRequestId });
    setMyRequestId(null);
    showNotif('Request cancelled.', 'info');
  };

  const handleAcceptRequest = (req) => {
    if (req.requestId === myRequestId) {
      showNotif("That's your own request!", 'error');
      return;
    }
    socket.emit('accept_game_request', {
      requestId: req.requestId,
      userId: user?.id || null,
      username: user?.username || null,
      role: user?.role || 'guest',
    });
  };

  const handleSpectate = (game) => {
    navigate(`/games/${game.hash}`, {
      state: { spectator: true, gameHash: game.hash },
    });
  };

  const handlePlayBot = (agentType, modelName) => {
    socket.emit('create_bot_game', {
      userId: user?.id || null,
      username: user?.username || null,
      role: user?.role || 'guest',
      timeControl: botTimeControl,
      botConfig: {
        type: agentType,
        modelName: modelName,
        budgetMs: agentType === 'mcts' ? 500 : undefined,
      }
    });
    setShowBotPanel(false);
  };


  const formatTC = (tc) => `${tc.minutes}+${tc.increment}`;
  
  const formatUsername = (name, role) => {
    if (!name) return '???';
    if (role === 'guest' && name.startsWith('guest_')) {
      return `guest_${name.slice(6, 13)}`;
    }
    return name;
  };

  const formatTimeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  };

  return (
    <div className="lobby-layout">

      {/* ── Notification ── */}
      {notification && (
        <div className={`lobby-notification lobby-notification--${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* ── Title ── */}
      <div className="lobby-title-row">
        <div>
          <p className="lobby-welcome">welcome to ...</p>
          <h1 className="lobby-title">DEDAL</h1>
          <p className="lobby-subtitle">Choose a time control and jump into a game</p>
        </div>
      </div>

      {/* ── Main 3-column area ── */}
      <div className="lobby-main-area">

        {/* Left — Live Stats */}
        <aside className="live-stats-panel glass-panel">
          <div className="stat-line">live games {liveStats.activeGames}</div>
          <div className="stat-line">online players {liveStats.onlineUsers}</div>
          <div className="stat-pulse-dot" title="Live" />
        </aside>

        {/* Center — Time Control Buttons */}
        <main className="lobby-center">
          <div className="time-control-grid">
            {TIME_CONTROLS.map((tc) => {
              const isMyTc =
                myRequestId &&
                gameRequests.find(
                  (r) =>
                    r.requestId === myRequestId &&
                    r.timeControl.minutes === tc.minutes &&
                    r.timeControl.increment === tc.increment,
                );
              return (
                <button
                  key={tc.label}
                  id={`tc-btn-${tc.label.replace(/\s/g, '-')}`}
                  className={`time-control-btn${isMyTc ? ' time-control-btn--active' : ''}`}
                  style={{ '--tc-color': tc.color }}
                  onClick={() => handleTimeControl(tc)}
                >
                  <span className="tc-label">{tc.label}</span>
                  <span className="tc-desc">{tc.description}</span>
                  {isMyTc && <span className="tc-waiting">Waiting…</span>}
                </button>
              );
            })}

            {/* Custom Button / Form */}
            {!showCustomForm ? (
              <button
                className="time-control-btn"
                style={{ '--tc-color': '#f27813' }}
                onClick={() => setShowCustomForm(true)}
                id="tc-btn-custom-toggle"
              >
                <span className="tc-label">Custom</span>
                <span className="tc-desc">User Choice</span>
              </button>
            ) : (
              <div className="time-control-btn time-control-custom-form glass-panel">
                <form onSubmit={handleCustomSubmit}>
                  <div className="custom-form-inputs">
                    <div className="input-group">
                      <label>MIN</label>
                      <input 
                        type="number" 
                        value={customMin} 
                        onChange={e => setCustomMin(e.target.value)}
                        min="1" max="120"
                      />
                    </div>
                    <div className="input-group">
                      <label>INC (s)</label>
                      <input 
                        type="number" 
                        value={customInc} 
                        onChange={e => setCustomInc(e.target.value)}
                        min="3" max="120"
                      />
                    </div>
                  </div>
                  <div className="custom-form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowCustomForm(false)}>✕</button>
                    <button type="submit" className="btn-ok">Post Request</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {myRequestId && (
            <button
              id="cancel-request-btn"
              className="cancel-request-btn"
              onClick={handleCancelRequest}
            >
              ✕ Cancel my request
            </button>
          )}

          {/* ── Play vs Bot — only shown when bot server is up with models ── */}
          {availableBots.length > 0 && (
          <div className="bot-panel glass-panel">
            <button
              className="bot-panel-header"
              onClick={() => setShowBotPanel(v => !v)}
              id="bot-toggle-btn"
            >
              <span className="bot-panel-label">Play vs Bot</span>
              <span className="bot-panel-chevron">{showBotPanel ? '▲' : '▼'}</span>
            </button>

            {showBotPanel && (
              <div className="bot-panel-body">
                <div className="bot-tc-row">
                  <label className="bot-tc-label">Time control:</label>
                  <div className="bot-tc-presets">
                    {(() => {
                      const presets = [
                        { label: '10+5',  minutes: 10, increment: 5 },
                        { label: '15+10', minutes: 15, increment: 10 },
                        { label: '30+30', minutes: 30, increment: 30 },
                      ];
                      return presets.map(p => (
                        <button
                          key={p.label}
                          className={`bot-tc-preset${botTimeControl.minutes === p.minutes && botTimeControl.increment === p.increment ? ' bot-tc-preset--active' : ''}`}
                          onClick={() => setBotTimeControl({ minutes: p.minutes, increment: p.increment })}
                        >
                          {p.label}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
                <div className="bot-buttons">
                  {availableBots.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No bots available</p>
                  )}
                  {availableBots.map(bot => (
                    <button
                      key={`${bot.agent_type}:${bot.model_name}`}
                      className={`bot-play-btn ${bot.agent_type === 'mcts' ? 'bot-play-btn--mcts' : 'bot-play-btn--jack'}${bot.busy ? ' bot-play-btn--busy' : ''}`}
                      id={`play-bot-${bot.agent_type}-${bot.model_name}`}
                      onClick={() => handlePlayBot(bot.agent_type, bot.model_name)}
                      disabled={bot.busy}
                    >
                      <div className="bot-btn-name">{bot.display_name}</div>
                      <div className="bot-btn-desc">
                        {bot.busy ? 'In a game…' : (bot.agent_type === 'mcts' ? 'Neural tree search' : 'Fast heuristic')}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="bot-cold-start-note">⚠️ First move may take a few seconds on cold start.</p>
              </div>
            )}
          </div>
          )}
        </main>
      </div>

      {/* ── Bottom — Game Lists ── */}
      <div className="game-lists-section">

        {/* Open Requests */}
        <div className="game-list-panel glass-panel">
          <h3 className="game-list-title">
            <span>Open Requests</span>
            <span className="game-list-count">{gameRequests.length}</span>
          </h3>
          {gameRequests.length === 0 ? (
            <div className="game-list-empty">No open requests yet.<br /><span>Be the first!</span></div>
          ) : (
            <div className="game-list-scroll">
              {gameRequests.map((req) => {
                const isMine = req.requestId === myRequestId;
                return (
                  <div key={req.requestId} className={`game-request-card${isMine ? ' game-request-card--mine' : ''}`}>
                    <div className="grc-left">
                      <span className="grc-user">
                        {formatUsername(req.username, req.role)}
                      </span>
                      <span className="grc-tc">{formatTC(req.timeControl)}</span>
                      <span className="grc-time">{formatTimeAgo(req.createdAt)}</span>
                    </div>
                    <div className="grc-right">
                      {isMine ? (
                        <span className="grc-mine-badge">Your request</span>
                      ) : (
                        <button
                          className="grc-accept-btn"
                          id={`accept-req-${req.requestId}`}
                          onClick={() => handleAcceptRequest(req)}
                        >
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Games */}
        <div className="game-list-panel glass-panel">
          <h3 className="game-list-title">
            <span>Active Games</span>
            <span className="game-list-count">{activeGames.length}</span>
          </h3>
          {activeGames.length === 0 ? (
            <div className="game-list-empty">No games in progress.<br /><span>Start one above!</span></div>
          ) : (
            <div className="game-list-scroll">
              {activeGames.map((game) => (
                <div key={game.hash} className="active-game-card">
                  <div className="agc-left">
                    <span className="agc-players">
                      {formatUsername(game.whiteName, game.whiteRole || 'guest')} <span className="agc-vs">vs</span> {formatUsername(game.blackName, game.blackRole || 'guest')}
                    </span>
                    <span className="agc-meta">
                      {formatTC(game.timeControl)} · Move {game.moveCount || 0}
                    </span>
                  </div>
                  <div className="agc-right">
                    <button
                      className="agc-spectate-btn"
                      id={`spectate-${game.hash}`}
                      onClick={() => handleSpectate(game)}
                    >
                      Watch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
