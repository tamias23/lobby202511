import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import GameBoard from './GameBoard';

const GamePage = ({ user }) => {
  const { hash } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [gameInfo, setGameInfo] = useState(null); // { side, opponent, initialState, spectator }
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // State may already be passed from lobby navigation
    const stateFromNav = location.state;

    if (stateFromNav && stateFromNav.initialState) {
      // Came from lobby after game_created → we know our role
      setGameInfo({
        side: stateFromNav.side,
        opponent: stateFromNav.opponent,
        initialState: stateFromNav.initialState,
        spectator: false,
        whiteRating: stateFromNav.initialState?.whiteRating,
        blackRating: stateFromNav.initialState?.blackRating,
        tournamentId: stateFromNav.tournamentId || null,
      });
      setLoading(false);
    } else if (stateFromNav && stateFromNav.spectator) {
      // Came from lobby as spectator
      socket.emit('join_game_by_hash', { hash, spectator: true });
    } else {
      // Direct URL navigation — ask server what our role is
      // Pass tournamentId in state if we came from a tournament room
      socket.emit('join_game_by_hash', { hash, spectator: false, userId: user?.id || null });
    }

    const onGameJoined = (data) => {
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setGameInfo({
        side: data.side || 'white',
        opponent: data.opponent,
        initialState: data.initialState,
        spectator: data.spectator || false,
        whiteRole: data.whiteRole || data.initialState?.whiteRole,
        blackRole: data.blackRole || data.initialState?.blackRole,
        whiteName: data.initialState?.whiteName,
        blackName: data.initialState?.blackName,
        whiteRating: data.initialState?.whiteRating,
        blackRating: data.initialState?.blackRating,
        tournamentId: data.tournamentId || null,
      });
      setLoading(false);
    };

    socket.on('game_joined', onGameJoined);
    return () => {
      socket.off('game_joined', onGameJoined);
    };
  }, [hash, user]);

  if (loading && !gameInfo) {
    return (
      <div className="game-page-loading">
        <div className="spinner" />
        <p>Joining game…</p>
      </div>
    );
  }

  // Grab tournamentId from nav state (set when coming from TournamentRoom)
  const tournamentId = gameInfo?.tournamentId || location.state?.tournamentId || null;

  if (error) {
    return (
      <div className="game-page-error glass-panel">
        <h2>Game not found</h2>
        <p>{error}</p>
        {tournamentId ? (
          <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="back-to-lobby-btn">
            ← Back to Tournament
          </button>
        ) : (
          <button onClick={() => navigate('/')} className="back-to-lobby-btn">
            ← Back to Lobby
          </button>
        )}
      </div>
    );
  }

  if (!gameInfo) return null;

  return (
    <div className="game-page-wrapper">
      {gameInfo.spectator && (
        <div className="spectator-banner">
          <span>👁 Spectating</span>
          <SpectatorFlipToggle />
          <button className="back-to-lobby-btn-small" onClick={() => navigate('/')}>← Lobby</button>
        </div>
      )}
      <GameBoard
        gameId={hash}
        side={gameInfo.spectator ? 'spectator' : gameInfo.side}
        opponent={gameInfo.opponent}
        playerName={user?.username || user?.id || 'Guest'}
        initialState={gameInfo.initialState}
        spectatorMode={gameInfo.spectator}
        whiteRole={gameInfo.whiteRole}
        blackRole={gameInfo.blackRole}
        whiteName={gameInfo.whiteName}
        blackName={gameInfo.blackName}
        whiteRating={gameInfo.whiteRating}
        blackRating={gameInfo.blackRating}
        tournamentId={tournamentId}
      />
    </div>
  );
};

/* Small flip toggle for spectators */
const SpectatorFlipToggle = () => {
  const [perspective, setPerspective] = useState('white');
  // We emit a custom event that GameBoard can listen to for spectator perspective
  const toggle = () => {
    const next = perspective === 'white' ? 'black' : 'white';
    setPerspective(next);
    window.dispatchEvent(new CustomEvent('spectator-flip', { detail: { perspective: next } }));
  };
  return (
    <button style={flipBtnStyle} onClick={toggle} id="spectator-flip-btn">
      {perspective === 'white' ? '⬜ White' : '⬛ Black'} ↔
    </button>
  );
};

const flipBtnStyle = {
  padding: '4px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--card-bg)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  fontSize: '13px',
};

export default GamePage;
