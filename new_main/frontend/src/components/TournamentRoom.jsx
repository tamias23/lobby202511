import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SocketContext } from '../App';

const FORMAT_LABELS = { swiss: '🏔️ Swiss', arena: '⚔️ Arena', knockout: '🥊 Knockout', round_robin: '🔄 Round Robin' };

export default function TournamentRoom({ user }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const socket = useContext(SocketContext);

  const [tournament, setTournament] = useState(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  // Tick counter — incremented every 500ms so the arena countdown re-renders
  // automatically, not just when a socket event arrives.
  const [, setTick] = useState(0);
  const tickRef = useRef(null);

  // Join tournament room on mount
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('enter_tournament_room', { tournamentId: id });

    const onUpdate = (data) => {
      if (data.id === id || !data.id) setTournament(data);
    };
    const onGameStart = (data) => {
      if (data.tournamentId === id && user) {
        if (data.whiteId === user.id || data.blackId === user.id) {
          navigate(`/games/${data.gameHash}`);
        }
      }
    };
    // If a game we were playing gets aborted because the arena time expired,
    // navigate back to the tournament room.
    const onGameAborted = (data) => {
      if (data.tournamentId === id) {
        navigate(`/tournament/${id}`);
      }
    };

    socket.on('tournament_update', onUpdate);
    socket.on('tournament_game_start', onGameStart);
    socket.on('tournament_game_aborted', onGameAborted);

    return () => {
      socket.emit('leave_tournament_room', { tournamentId: id });
      socket.off('tournament_update', onUpdate);
      socket.off('tournament_game_start', onGameStart);
      socket.off('tournament_game_aborted', onGameAborted);
    };
  }, [socket, id, user, navigate]);

  // 500ms tick interval — keeps the arena countdown running between socket events.
  useEffect(() => {
    const isArenaActive =
      tournament?.format === 'arena' &&
      tournament?.status === 'active' &&
      tournament?.arenaEndAt;
    if (!isArenaActive) return;
    tickRef.current = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(tickRef.current);
  }, [tournament?.format, tournament?.status, tournament?.arenaEndAt]);

  const handleQuit = useCallback(() => {
    if (!socket) return;
    socket.emit('leave_tournament', { tournamentId: id });
    setShowQuitConfirm(false);
    navigate('/');
  }, [socket, id, navigate]);

  if (!tournament) {
    return (
      <div className="tourn-room-layout">
        <div className="tourn-room-loading glass-panel">
          <h2 style={{color: 'var(--text-muted)'}}>Loading tournament…</h2>
        </div>
      </div>
    );
  }

  const isParticipant = user && tournament.standings?.some(s => s.user_id === user.id);
  const isCompleted = tournament.status === 'completed';
  const isActive = tournament.status === 'active';
  const isOpen = tournament.status === 'open';

  const formatTimeLeft = (endAt) => {
    if (!endAt) return '';
    const diff = Math.max(0, endAt - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="tourn-room-layout">
      {/* Header */}
      <div className="tourn-room-header">
        <button className="tourn-back-link" onClick={() => navigate('/')}>← Lobby</button>
        <h1 className="tourn-room-title">
          {FORMAT_LABELS[tournament.format] || tournament.format}
          <span className="tourn-room-id">#{id}</span>
        </h1>
        <div className="tourn-room-meta">
          <span className={`tourn-status tourn-status--${tournament.status}`}>
            {tournament.status === 'open' ? '⏳ Open' : tournament.status === 'active' ? '🔴 Live' : '✅ Completed'}
          </span>
          <span className="tourn-room-tc">{tournament.timeControl?.minutes}+{tournament.timeControl?.increment}</span>
          {tournament.format !== 'arena' && (
            <span className="tourn-room-round">Round {tournament.currentRound}/{tournament.maxRounds}</span>
          )}
          {tournament.format === 'arena' && tournament.arenaEndAt && isActive && (
            <span className="tourn-room-timer">⏱️ {formatTimeLeft(tournament.arenaEndAt)}</span>
          )}
          <span className="tourn-room-count">👥 {tournament.currentCount}/{tournament.maxParticipants}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="tourn-room-content">
        {/* Standings panel */}
        <div className="tourn-standings-panel glass-panel">
          <h3 className="tourn-panel-title">Standings</h3>
          <div className="tourn-standings-scroll">
            <table className="tourn-standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  {tournament.format === 'swiss' && <th>TB</th>}
                </tr>
              </thead>
              <tbody>
                {(tournament.standings || []).map((s, i) => {
                  const isMe = user && s.user_id === user.id;
                  return (
                    <tr key={s.user_id} className={isMe ? 'tourn-row--me' : ''}>
                      <td className="tourn-rank">
                        {i === 0 && isCompleted ? '🥇' : i === 1 && isCompleted ? '🥈' : i === 2 && isCompleted ? '🥉' : s.rank}
                      </td>
                      <td className="tourn-player-name">
                        {s.is_bot ? '🤖 ' : ''}{s.username || s.user_id}
                        {s.eliminated && <span className="tourn-eliminated">✗</span>}
                      </td>
                      <td className="tourn-score">{s.score}</td>
                      <td>{s.wins}</td>
                      <td>{s.draws}</td>
                      <td>{s.losses}</td>
                      {tournament.format === 'swiss' && <td>{(s.tiebreak || 0).toFixed(1)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Games / Bracket panel */}
        <div className="tourn-games-panel glass-panel">
          <h3 className="tourn-panel-title">
            {tournament.format === 'knockout' ? 'Bracket' : 'Games'}
          </h3>

          {/* Knockout bracket */}
          {tournament.format === 'knockout' && tournament.bracket && (
            <div className="tourn-bracket-scroll">
              <div className="tourn-bracket">
                {tournament.bracket.map((round, ri) => (
                  <div key={ri} className="tourn-bracket-round">
                    <div className="tourn-bracket-round-label">R{round.round}</div>
                    {round.matches.map((m, mi) => (
                      <div key={mi} className={`tourn-bracket-match glass-panel${m.result ? ' tourn-bracket-match--done' : ''}`}>
                        <div className={`tourn-bracket-player${m.result === 'white' ? ' tourn-bracket-player--winner' : ''}`}>
                          {m.white?.is_bot ? '🤖 ' : ''}{m.white?.username || '?'}
                        </div>
                        <div className="tourn-bracket-vs">vs</div>
                        <div className={`tourn-bracket-player${m.result === 'black' ? ' tourn-bracket-player--winner' : ''}`}>
                          {m.black?.is_bot ? '🤖 ' : ''}{m.black?.username || '?'}
                        </div>
                        {m.gameHash && !m.result && (
                          <button className="tourn-watch-btn" onClick={() => navigate(`/games/${m.gameHash}`)}>Watch</button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular game list */}
          {tournament.format !== 'knockout' && (
            <div className="tourn-games-list">
              {(tournament.games || []).slice().reverse().map(g => {
                const wName = tournament.standings?.find(s => s.user_id === g.white_id)?.username || g.white_id;
                const bName = tournament.standings?.find(s => s.user_id === g.black_id)?.username || g.black_id;
                return (
                  <div key={g.id} className={`tourn-game-row${!g.result ? ' tourn-game-row--live' : ''}`}>
                    <span className="tourn-game-round">R{g.round}</span>
                    <span className={`tourn-game-player${g.result === 'white' ? ' tourn-game-player--winner' : ''}`}>{wName}</span>
                    <span className="tourn-game-vs">
                      {g.result ? `${g.white_score}–${g.black_score}` : 'vs'}
                    </span>
                    <span className={`tourn-game-player${g.result === 'black' ? ' tourn-game-player--winner' : ''}`}>{bName}</span>
                    {g.game_hash && !g.result && (
                      <button className="tourn-watch-btn" onClick={() => navigate(`/games/${g.game_hash}`)}>Watch</button>
                    )}
                  </div>
                );
              })}
              {(!tournament.games || tournament.games.length === 0) && (
                <p style={{color: 'var(--text-muted)', textAlign: 'center'}}>
                  {isOpen ? 'Waiting for the tournament to start…' : 'No games yet.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="tourn-room-footer">
        {isParticipant && !isCompleted && (
          <div>
            {showQuitConfirm ? (
              <div className="tourn-quit-confirm">
                <span>Are you sure you want to quit?</span>
                <button className="tourn-btn tourn-btn--danger" onClick={handleQuit}>Yes, quit</button>
                <button className="tourn-btn tourn-btn--secondary" onClick={() => setShowQuitConfirm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="tourn-btn tourn-btn--danger" onClick={() => setShowQuitConfirm(true)}>
                🔴 Quit Tournament
              </button>
            )}
          </div>
        )}
        <div className="tourn-room-info">
          {tournament.boardId && <span>Board: {tournament.boardId}</span>}
          {tournament.ratingMin > 0 && <span>Rating: {tournament.ratingMin}–{tournament.ratingMax}</span>}
          {tournament.hasPassword && <span>🔒 Private</span>}
        </div>
      </div>
    </div>
  );
}
