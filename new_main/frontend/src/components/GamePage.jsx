import React, { useState, useEffect, useRef } from 'react';
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
  // Guard: prevent double-emit of join_game_by_hash when the effect re-runs after user loads.
  const joinedRef = useRef(false);
  const [tournamentData, setTournamentData] = useState(null);
  
  // Grab tournamentId from gameInfo or location state
  const tournamentId = gameInfo?.tournamentId || location.state?.tournamentId || null;

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
        whiteRole: stateFromNav.initialState?.whiteRole,
        blackRole: stateFromNav.initialState?.blackRole,
        whiteName: stateFromNav.initialState?.whiteName,
        blackName: stateFromNav.initialState?.blackName,
        whiteRating: stateFromNav.initialState?.whiteRating,
        blackRating: stateFromNav.initialState?.blackRating,
        tournamentId: stateFromNav.tournamentId || null,
      });
      setLoading(false);
      joinedRef.current = true;
    } else if (stateFromNav && stateFromNav.spectator) {
      // Came from lobby as spectator
      socket.emit('join_game_by_hash', { hash, spectator: true });
      joinedRef.current = true;
    } else {
      // Direct URL navigation (or auto-navigate from tournament room / game-over screen).
      // Emit join_game_by_hash if not already joined. The server uses socket.userId (from JWT)
      // as a trusted identity fallback, so this works even when user prop is still null.
      if (!joinedRef.current) {
        socket.emit('join_game_by_hash', { hash, spectator: false, userId: user?.id || null });
        // Lock once we have a confirmed user identity so the effect re-run doesn't double-emit.
        if (user?.id) joinedRef.current = true;
      }
    }

    const onGameJoined = (data) => {
      if (data.error) {
        // Game not found (deleted, forfeited, or doesn't exist).
        // Navigate away gracefully rather than showing a dead error page.
        console.warn('[GamePage] game_joined error:', data.error);
        const tournId = location.state?.tournamentId || null;
        navigate(tournId ? `/tournament/${tournId}` : '/', { replace: true });
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
      socket.emit('leave_game_by_hash', { hash });
    };
  }, [socket, hash, user]);

  // On reconnect: re-register as a player so the server clears whiteDisconnectedAt
  // and sends a fresh game state. If the game was forfeited while disconnected,
  // the server returns an error → navigate away gracefully.
  useEffect(() => {
    let isFirstConnect = true; // skip the very first 'connect' (initial connection)
    const onConnect = () => {
      if (isFirstConnect) { isFirstConnect = false; return; }
      // Socket reconnected — re-join the game with full identity
      joinedRef.current = false;
      socket.emit('join_game_by_hash', { hash, spectator: false, userId: user?.id || null });
      if (user?.id) joinedRef.current = true;
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [hash, user]);

  // Handle Tournament Room Subscription
  useEffect(() => {
    if (!socket || !tournamentId) return;

    socket.emit('enter_tournament_room', { tournamentId });
    
    const onTournUpdate = (data) => {
      if (data.id === tournamentId || !data.id) {
        setTournamentData(data);
      }
    };
    
    socket.on('tournament_update', onTournUpdate);
    return () => {
      socket.emit('leave_tournament_room', { tournamentId });
      socket.off('tournament_update', onTournUpdate);
    };
  }, [socket, tournamentId]);

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

  if (loading && !gameInfo) {
    return (
      <div className="game-page-loading">
        <div className="spinner" />
        <p>Joining game…</p>
      </div>
    );
  }

  if (!gameInfo) return null;

  return (
    <div className="game-page-wrapper">
      {gameInfo.spectator && (
        <div className="spectator-banner">
          <div style={{ display: 'flex', gap: '8px' }}>
            {tournamentId && (
              <button 
                className="back-to-lobby-btn-small" 
                onClick={() => navigate(`/tournament/${tournamentId}`)}
                style={{ background: 'rgba(70,176,212,0.1)', borderColor: 'rgba(70,176,212,0.3)' }}
              >
                ← Tournament
              </button>
            )}
            <button className="back-to-lobby-btn-small" onClick={() => navigate('/')} style={{ marginLeft: 0 }}>
              {tournamentId ? 'Lobby' : '← Lobby'}
            </button>
          </div>
        </div>
      )}

      <GameBoard
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


export default GamePage;
