import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

// Color map for polygon colors → hex (shared with TournamentCreate)
const POLY_COLORS = {
  orange: '#f97316',
  green:  '#22c55e',
  blue:   '#3b82f6',
  grey:   '#64748b',
  red:    '#ef4444',
  purple: '#a855f7',
  yellow: '#eab308',
};

/** Mini SVG board renderer for board picker */
function BoardMiniSvg({ board, size = 120 }) {
  if (!board || !board.polygons || board.polygons.length === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        No preview
      </div>
    );
  }

  const { bbox } = board;
  const pad = 5;
  const bw = (bbox.maxX - bbox.minX) || 100;
  const bh = (bbox.maxY - bbox.minY) || 100;
  const vb = `${bbox.minX - pad} ${bbox.minY - pad} ${bw + pad * 2} ${bh + pad * 2}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      style={{ display: 'block', margin: '0 auto', borderRadius: '8px' }}
    >
      {board.polygons.map((poly, i) => {
        if (!poly.points || poly.points.length < 3) return null;
        const pts = poly.points.map(([x, y]) => `${x},${y}`).join(' ');
        const fill = POLY_COLORS[poly.color] || poly.color || '#888';
        return (
          <polygon
            key={i}
            points={pts}
            fill={fill}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

const TIME_CONTROLS = [
  { label: '10 + 5',  minutes: 10, increment: 5,  description: 'Blitz',     color: '#f59e0b' },
  { label: '10 + 10', minutes: 10, increment: 10, description: 'Blitz',     color: '#fb923c' },
  { label: '15 + 10', minutes: 15, increment: 10, description: 'Rapid',     color: '#06b6d4' },
  { label: '15 + 30', minutes: 15, increment: 30, description: 'Rapid',     color: '#f27813' },
  { label: '30 + 30', minutes: 30, increment: 30, description: 'Medium',    color: '#46b0d4' },
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
  // Board selection for custom games
  const [customBoardMode, setCustomBoardMode] = useState('random');
  const [customSelectedBoardId, setCustomSelectedBoardId] = useState(null);
  const [customRandomBoards, setCustomRandomBoards] = useState([]);
  const [customExpandedBoard, setCustomExpandedBoard] = useState(null);
  const [availableBots, setAvailableBots] = useState([]);
  // Tournament state
  const [openTournaments, setOpenTournaments] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [tournamentsEnabled, setTournamentsEnabled] = useState(false);
  const [joinModal, setJoinModal] = useState(null); // { tournamentId, hasPassword }
  const [joinPassword, setJoinPassword] = useState('');


  const showNotif = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // --- Socket listeners ---
  useEffect(() => {
    const onLobbyState = ({ gameRequests, activeGames, stats, available_bots, tournaments }) => {
      setGameRequests(gameRequests || []);
      setActiveGames(activeGames || []);
      setLiveStats(stats || { onlineUsers: 0, activeGames: 0 });
      if (available_bots) setAvailableBots(available_bots);
      if (tournaments) {
        setTournamentsEnabled(tournaments.enabled !== false);
        setOpenTournaments(tournaments.openTournaments || []);
        setActiveTournaments(tournaments.activeTournaments || []);
      }
    };

    const onLobbyUpdate = (update) => {
      if (update.gameRequests !== undefined) setGameRequests(update.gameRequests);
      if (update.activeGames  !== undefined) setActiveGames(update.activeGames);
      if (update.stats        !== undefined) setLiveStats(update.stats);
      if (update.available_bots !== undefined) setAvailableBots(update.available_bots);
      if (update.tournaments) {
        setTournamentsEnabled(update.tournaments.enabled !== false);
        setOpenTournaments(update.tournaments.openTournaments || []);
        setActiveTournaments(update.tournaments.activeTournaments || []);
      }
    };

    const onGameCreated = ({ hash, side, opponent, initialState, tournamentId }) => {
      navigate(`/games/${hash}`, {
        state: { side, opponent, initialState, gameHash: hash, tournamentId: tournamentId || null },
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

    const onTournamentJoined = ({ tournamentId }) => {
      setJoinModal(null);
      setJoinPassword('');
      navigate(`/tournament/${tournamentId}`);
    };
    const onTournamentError = (data) => {
      showNotif(data.message || 'Tournament error.', 'error');
    };

    socket.on('lobby_state',    onLobbyState);
    socket.on('lobby_update',   onLobbyUpdate);
    socket.on('game_created',   onGameCreated);
    socket.on('request_created', onRequestCreated);
    socket.on('request_error',  onRequestError);
    socket.on('bot_error',      onBotError);
    socket.on('tournament_joined', onTournamentJoined);
    socket.on('tournament_error',  onTournamentError);

    // Enter lobby room
    socket.emit('enter_lobby');

    return () => {
      socket.off('lobby_state',    onLobbyState);
      socket.off('lobby_update',   onLobbyUpdate);
      socket.off('game_created',   onGameCreated);
      socket.off('request_created', onRequestCreated);
      socket.off('bot_error',      onBotError);
      socket.off('tournament_joined', onTournamentJoined);
      socket.off('tournament_error',  onTournamentError);
    };
  }, [navigate]);


  // Fetch boards for custom game picker
  useEffect(() => {
    if (showCustomForm && customBoardMode === 'fixed' && customRandomBoards.length === 0) {
      fetch('/api/boards/random/10')
        .then(r => r.json())
        .then(data => setCustomRandomBoards(data.boards || []))
        .catch(() => {});
    }
  }, [showCustomForm, customBoardMode, customRandomBoards.length]);

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
    if (customBoardMode === 'fixed' && !customSelectedBoardId) {
      showNotif('Please select a board or switch to Random.', 'error');
      return;
    }

    socket.emit('create_game_request', {
      timeControl: { minutes: mins, increment: inc },
      boardId: customBoardMode === 'fixed' ? customSelectedBoardId : null,
      userId: user?.id || null,
      username: user?.username || null,
      role: user?.role || 'guest',
    });
    setShowCustomForm(false);
    setCustomBoardMode('random');
    setCustomSelectedBoardId(null);
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

  const handleJoinTournament = (t) => {
    if (!user) {
      showNotif('You must be logged in to join a tournament.', 'error');
      return;
    }
    if (t.hasPassword) {
      setJoinModal({ tournamentId: t.id, hasPassword: true });
    } else {
      socket.emit('join_tournament', { tournamentId: t.id });
    }
  };

  const handleJoinConfirm = () => {
    if (!joinModal) return;
    socket.emit('join_tournament', { tournamentId: joinModal.tournamentId, password: joinPassword });
  };

  const formatLabel = { swiss: '🏔️ Swiss', arena: '⚔️ Arena', knockout: '🥊 KO', round_robin: '🔄 RR' };


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
        <div className="lobby-title-container">
          <h1 className="lobby-title">
            <span className="lobby-welcome">welcome to ...</span>
            DEDAL
          </h1>
          <p className="lobby-subtitle">Choose a time control and jump into a game</p>
        </div>
      </div>

      {/* ── Main 3-column area ── */}
      <div className="lobby-main-area">

        {/* Left — Live Stats */}
        <div className="lobby-side-column">
          <aside className="live-stats-panel glass-panel">
            <div className="stat-line">live games {liveStats.activeGames}</div>
            <div className="stat-line">online players {liveStats.onlineUsers}</div>
            <div className="stat-pulse-dot" title="Live" />
          </aside>
        </div>

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

            {/* Custom Button (pos 7) */}
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
              <button
                className="time-control-btn time-control-btn--active"
                style={{ '--tc-color': '#f27813' }}
                onClick={() => { setShowCustomForm(false); setCustomBoardMode('random'); setCustomSelectedBoardId(null); }}
                id="tc-btn-custom-toggle"
              >
                <span className="tc-label">Custom</span>
                <span className="tc-desc">✕ Close</span>
              </button>
            )}

            {/* Play vs Bot Button (pos 8) */}
            {availableBots.length > 0 && (
              <button
                className={`time-control-btn${showBotPanel ? ' time-control-btn--active' : ''}`}
                style={{ '--tc-color': '#8b5cf6' }}
                onClick={() => setShowBotPanel(v => !v)}
                id="bot-toggle-btn"
              >
                <span className="tc-label">vs Bot</span>
                <span className="tc-desc">Play AI</span>
              </button>
            )}

            {/* Create Tournament Button (pos 9) */}
            {user && tournamentsEnabled && (
              <button
                className="time-control-btn"
                style={{ '--tc-color': '#22c55e' }}
                onClick={() => navigate('/tournament/create')}
                id="tc-btn-create-tournament"
              >
                <span className="tc-label">Tourney</span>
                <span className="tc-desc">Create</span>
              </button>
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

          {/* Custom Form (expands below grid) */}
          {showCustomForm && (
            <div className="time-control-custom-form-wrapper glass-panel">
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

                {/* Board Selection */}
                <div className="custom-board-section">
                  <label className="custom-board-label">Board</label>
                  <div className="custom-board-toggle-row">
                    <button type="button" className={`tourn-toggle-btn${customBoardMode === 'random' ? ' active' : ''}`}
                      onClick={() => setCustomBoardMode('random')}>Random</button>
                    <button type="button" className={`tourn-toggle-btn${customBoardMode === 'fixed' ? ' active' : ''}`}
                      onClick={() => setCustomBoardMode('fixed')}>Choose Board</button>
                  </div>

                  {customBoardMode === 'fixed' && (
                    <div className="custom-board-picker">
                      {customRandomBoards.length === 0 ? (
                        <p style={{color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center'}}>Loading boards…</p>
                      ) : (
                        <div className="custom-board-grid">
                          {customRandomBoards.map(b => (
                            <div
                              key={b.id}
                              className={`custom-board-card glass-panel${customSelectedBoardId === b.id ? ' custom-board-card--selected' : ''}`}
                              onClick={() => setCustomSelectedBoardId(b.id)}
                            >
                              <BoardMiniSvg board={b} size={80} />
                              <div className="custom-board-card-name">{b.id}</div>
                              <button
                                type="button"
                                className="custom-board-expand-btn"
                                onClick={(e) => { e.stopPropagation(); setCustomExpandedBoard(b); }}
                                title="Expand"
                              >🔍</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="custom-form-actions">
                  <button type="button" className="btn-cancel" onClick={() => { setShowCustomForm(false); setCustomBoardMode('random'); setCustomSelectedBoardId(null); }}>✕</button>
                  <button type="submit" className="btn-ok" disabled={customBoardMode === 'fixed' && !customSelectedBoardId}>Post Request</button>
                </div>
              </form>
            </div>
          )}

          {/* Bot Panel (expands below grid) */}
          {showBotPanel && availableBots.length > 0 && (
            <div className="bot-panel glass-panel">
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
                  {availableBots.map(bot => (
                    <button
                      key={`${bot.agent_type}:${bot.model_name}`}
                      className={`bot-play-btn ${bot.agent_type === 'mcts' ? 'bot-play-btn--mcts' : 'bot-play-btn--jack'}${bot.busy ? ' bot-play-btn--busy' : ''}`}
                      id={`play-bot-${bot.agent_type}-${bot.model_name}`}
                      onClick={() => handlePlayBot(bot.agent_type, bot.model_name)}
                      disabled={bot.busy}
                    >
                      <div className="bot-btn-name">{bot.display_name}</div>
                      <div className="bot-btn-rating">
                        {bot.busy ? '⏳ In a game…' : `★ ${bot.rating ?? 1500}`}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="bot-cold-start-note">⚠️ First move may take a few seconds on cold start.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Bottom — 4-Column Grid: Games + Tournaments ── */}
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
                      <span className="grc-tc">{formatTC(req.timeControl)}{req.boardId ? ` · 🗺️ ${req.boardId}` : ''}</span>
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

        {/* Open Tournaments */}
        <div className="game-list-panel glass-panel">
          <h3 className="game-list-title">
            <span>Open Tournaments</span>
            <span className="game-list-count">{openTournaments.length}</span>
          </h3>
          {openTournaments.length === 0 ? (
            <div className="game-list-empty">No open tournaments.<br /><span>Create one!</span></div>
          ) : (
            <div className="game-list-scroll">
              {openTournaments.map((t) => (
                <div key={t.id} className="game-request-card">
                  <div className="grc-left">
                    <span className="grc-user">{formatLabel[t.format] || t.format}</span>
                    <span className="grc-tc">{t.timeControl.minutes}+{t.timeControl.increment}</span>
                    <span className="grc-time">
                      {t.currentCount}/{t.maxParticipants}
                      {t.hasPassword && ' 🔒'}
                    </span>
                  </div>
                  <div className="grc-right">
                    <button className="grc-accept-btn" onClick={() => handleJoinTournament(t)}>Join</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Tournaments */}
        <div className="game-list-panel glass-panel">
          <h3 className="game-list-title">
            <span>Active Tournaments</span>
            <span className="game-list-count">{activeTournaments.length}</span>
          </h3>
          {activeTournaments.length === 0 ? (
            <div className="game-list-empty">No active tournaments.</div>
          ) : (
            <div className="game-list-scroll">
              {activeTournaments.map((t) => (
                <div key={t.id} className="active-game-card">
                  <div className="agc-left">
                    <span className="agc-players">
                      {formatLabel[t.format] || t.format}
                      {t.status === 'completed' && ' ✅'}
                    </span>
                    <span className="agc-meta">
                      {t.timeControl.minutes}+{t.timeControl.increment}
                      {t.format !== 'arena' ? ` · R${t.currentRound}/${t.maxRounds}` : ''}
                      {' · '}{t.currentCount} players
                    </span>
                  </div>
                  <div className="agc-right">
                    <button className="agc-spectate-btn" onClick={() => navigate(`/tournament/${t.id}`)}>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Join Tournament Password Modal */}
      {joinModal && (
        <div className="tourn-join-modal-overlay" onClick={() => setJoinModal(null)}>
          <div className="tourn-join-modal glass-panel" onClick={e => e.stopPropagation()}>
            <h3>Join Tournament</h3>
            {joinModal.hasPassword && (
              <>
                <p style={{color: 'var(--text-muted)'}}>This tournament is password-protected.</p>
                <input
                  type="password"
                  value={joinPassword}
                  onChange={e => setJoinPassword(e.target.value)}
                  placeholder="Enter password"
                  className="tourn-input"
                  autoFocus
                />
              </>
            )}
            <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
              <button className="tourn-btn tourn-btn--primary" onClick={handleJoinConfirm}>Join</button>
              <button className="tourn-btn tourn-btn--secondary" onClick={() => setJoinModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Board Modal for Custom Game */}
      {customExpandedBoard && (
        <div className="tourn-board-modal-overlay" onClick={() => setCustomExpandedBoard(null)}>
          <div className="tourn-board-modal" onClick={e => e.stopPropagation()}>
            <button className="tourn-board-modal-close" onClick={() => setCustomExpandedBoard(null)}>✕</button>
            <h3 style={{textAlign:'center', marginBottom:'1rem', fontFamily:"'Outfit',sans-serif"}}>{customExpandedBoard.id}</h3>
            <BoardMiniSvg board={customExpandedBoard} size={500} />
            <p style={{textAlign:'center', color:'var(--text-muted)', marginTop:'0.75rem'}}>{customExpandedBoard.polygonCount} tiles</p>
            <button
              className="tourn-btn tourn-btn--primary"
              style={{marginTop:'1rem', width:'100%'}}
              onClick={() => { setCustomSelectedBoardId(customExpandedBoard.id); setCustomExpandedBoard(null); }}
            >
              Select this board
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
