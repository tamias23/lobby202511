import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import RegistrationForm from './components/RegistrationForm';
import LoginForm from './components/LoginForm';
import GameBoard from './components/GameBoard';

function App() {
  const [view, setView] = useState('menu'); // menu, register, lobby, playing
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('offline'); // offline, lobby, waiting, playing
  const [matchInfo, setMatchInfo] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    // Default to dark if not set, or seamlessly upgrade older booleans
    return saved === 'light' || saved === 'dark' || saved === 'rain' ? saved : 'dark'; 
  });

  useEffect(() => {
    document.body.classList.remove('light-mode', 'rain-mode');
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else if (theme === 'rain') {
      document.body.classList.add('rain-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    socket.on('assigned_id', ({ id, role }) => {
      setUser({ id, role, rating: 1200 });
      setStatus('lobby');
      setView('lobby');
    });

    socket.on('waiting_for_opponent', () => {
      setStatus('waiting');
    });

    socket.on('match_found', ({ gameId, side, opponent, initialState }) => {
      setMatchInfo({ gameId, side, opponent, initialState });
      setStatus('playing');
      setView('playing');
    });

    return () => {
      socket.off('assigned_id');
      socket.off('waiting_for_opponent');
      socket.off('match_found');
    };
  }, []);

  const handleGuestLogin = () => {
    socket.connect();
    socket.emit('join_lobby', {});
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setStatus('lobby');
    setView('lobby');
    socket.connect();
    socket.emit('join_lobby', { userId: userData.id, role: userData.role });
  };

  const handleFindMatch = () => {
    if (!user) return;
    socket.emit('request_match', { userId: user.id, rating: user.rating });
  };

  return (
    <div className="App" style={appStyle}>
      {/* Theme Toggle Button */}
      <button 
        onClick={() => {
          if (theme === 'dark') setTheme('light');
          else if (theme === 'light') setTheme('rain');
          else setTheme('dark');
        }}
        style={themeToggleStyle}
        title="Toggle Theme"
      >
        {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌧️'}
      </button>

      {view === 'menu' && (
        <div className="glass-panel" style={menuStyle}>
          <h1 style={{ fontSize: 'min(3.5rem, 10vw)', marginBottom: '10px', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LOBBY-2025
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: 'min(1rem, 4vw)' }}>Join the next generation of board gaming.</p>
          <div style={buttonGroupStyle} className="button-group">
            <button onClick={() => setView('login')} className="primary-button" style={primaryButtonStyle}>Log In</button>
            <button onClick={() => setView('register')} className="secondary-button" style={secondaryButtonStyle}>Create Account</button>
            <div style={{ margin: '15px 0', opacity: 0.5 }}>— or —</div>
            <button onClick={handleGuestLogin} style={guestButtonStyle}>Play as Guest</button>
          </div>
        </div>
      )}

      {view === 'login' && (
        <LoginForm 
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setView('menu')} 
        />
      )}

      {view === 'register' && (
        <RegistrationForm onCancel={() => setView('menu')} />
      )}

      {view === 'lobby' && user && (
        <Lobby 
          user={user} 
          status={status} 
          onFindMatch={handleFindMatch} 
        />
      )}

      {view === 'playing' && matchInfo && (
        <GameBoard 
          gameId={matchInfo.gameId} 
          side={matchInfo.side} 
          opponent={matchInfo.opponent}
          playerName={user.id}
          initialState={matchInfo.initialState}
        />
      )}
    </div>
  );
}

const appStyle = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  color: 'var(--text-main)'
};

const menuStyle = {
  textAlign: 'center',
  padding: 'min(60px, 5vw)',
  width: 'min(600px, 95vw)',
  margin: '0 auto'
};

const themeToggleStyle = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  width: '45px',
  height: '45px',
  borderRadius: '50%',
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  fontSize: '20px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s',
  zIndex: 1000,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};

const buttonGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  marginTop: '40px'
};

const primaryButtonStyle = {
  padding: '12px 30px',
  fontSize: '18px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer'
};

const secondaryButtonStyle = {
  padding: '12px 30px',
  fontSize: '16px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: 'var(--text-main)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.3s'
};

const guestButtonStyle = {
  padding: '10px 30px',
  fontSize: '15px',
  backgroundColor: 'transparent',
  color: 'var(--text-muted)',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  textDecoration: 'underline'
};

const gameBoardContainerStyle = {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center'
};

const gameHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
};

const boardPlaceholderStyle = {
    width: '500px',
    height: '500px',
    backgroundColor: '#333',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '20px auto',
    borderRadius: '12px'
};

export default App;
