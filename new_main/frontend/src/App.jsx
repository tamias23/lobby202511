import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { socket, setSocketToken } from './socket';
import LobbyPage from './components/LobbyPage';
import AuthHeader from './components/AuthHeader';
import GamePage from './components/GamePage';
import GameBoard from './components/GameBoard';
import LoginForm from './components/LoginForm';
import RegistrationForm from './components/RegistrationForm';
import BubbleBackground from './components/BubbleBackground';
import AnalysisPage from './components/AnalysisPage';
import TutorialPage from './components/TutorialPage';
import TournamentCreate from './components/TournamentCreate';
import TournamentRoom from './components/TournamentRoom';

import { SocketContext } from './SocketContext';

function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    const validThemes = ['light', 'dark', 'rain', 'bubble', 'bubble_slow', 'bubble_color'];
    return validThemes.includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('light-mode', 'rain-mode', 'bubble-mode', 'bubble-slow-mode', 'bubble-color-mode');
    if (theme === 'light') document.body.classList.add('light-mode');
    else if (theme === 'rain') document.body.classList.add('rain-mode');
    else if (theme === 'bubble') document.body.classList.add('bubble-mode');
    else if (theme === 'bubble_slow') document.body.classList.add('bubble-slow-mode');
    else if (theme === 'bubble_color') document.body.classList.add('bubble-color-mode');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Connect socket on mount + restore session from JWT
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    // Restore user session from stored JWT
    const token = localStorage.getItem('jwt_token');
    if (token && !user) {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => {
          if (!r.ok) throw new Error('Token invalid');
          return r.json();
        })
        .then(userData => {
          setUser(userData);
          socket.emit('join_lobby', { userId: userData.id, role: userData.role });
        })
        .catch(() => {
          // Token expired or invalid — clear it
          localStorage.removeItem('jwt_token');
        });
    }
    return () => {};
  }, []);

  // Keep user rating in sync after matches
  useEffect(() => {
    const onRatingUpdated = (data) => {
      setUser(prev => {
        if (!prev) return prev;
        // Match the logged-in user's ID to determine their new rating
        if (prev.id === data.whitePlayerId) {
          return { ...prev, rating: data.whiteRating };
        } else if (prev.id === data.blackPlayerId) {
          return { ...prev, rating: data.blackRating };
        }
        return prev;
      });
    };
    socket.on('rating_updated', onRatingUpdated);
    return () => socket.off('rating_updated', onRatingUpdated);
  }, []);

  // Kicked when another session logs in with the same account
  useEffect(() => {
    const onSessionConflict = ({ message }) => {
      setUser(null);
      localStorage.removeItem('jwt_token');
      setSocketToken(null);
      navigate('/', { state: { notification: message, notifType: 'error' } });
    };
    socket.on('session_conflict', onSessionConflict);
    return () => socket.off('session_conflict', onSessionConflict);
  }, [navigate]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Update socket auth with new JWT and reconnect
    if (userData.token) {
      setSocketToken(userData.token);
    }
    // Re-emit join_lobby so backend knows this socket's identity
    socket.emit('join_lobby', { userId: userData.id, role: userData.role });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jwt_token');
    setSocketToken(null);
    socket.emit('join_lobby', {}); // back to guest
  };

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('rain');
    else if (theme === 'rain') setTheme('bubble');
    else if (theme === 'bubble') setTheme('bubble_slow');
    else if (theme === 'bubble_slow') setTheme('bubble_color');
    else setTheme('dark');
  };

  return (
    <SocketContext.Provider value={socket}>
    <div className="App">
      {/* Fixed theme toggle - positioned away from header */}
      <button
        onClick={cycleTheme}
        style={themeToggleStyle}
        title="Toggle Theme"
        id="theme-toggle-btn"
      >
        {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : theme === 'rain' ? '🌧️' : theme === 'bubble' ? '🫧' : theme === 'bubble_slow' ? '🐌' : '🎨'}
      </button>

      {theme === 'bubble' && <BubbleBackground speedFactor={1.0} />}
      {theme === 'bubble_slow' && <BubbleBackground speedFactor={0.33} />}
      {theme === 'bubble_color' && <BubbleBackground speedFactor={0.33} randomColors={true} />}

      {/* Analysis Board shortcut — top-left, lobby only */}
      {location.pathname === '/' && (
        <button
          onClick={() => navigate('/analysis')}
          style={analysisButtonStyle}
          title="Analysis Board"
          id="analysis-board-btn"
        >
          Analysis
        </button>
      )}

      {/* Tutorial shortcut — just below Analysis, lobby only */}
      {location.pathname === '/' && (
        <button
          onClick={() => navigate('/tutorial')}
          style={tutorialButtonStyle}
          title="Tutorial"
          id="tutorial-btn"
        >
          Tutorial
        </button>
      )}

      {/* Auth header top-right - ONLY on lobby page */}
      {location.pathname === '/' && (
        <AuthHeader user={user} onLogout={handleLogout} />
      )}

      <Routes>
        <Route path="/" element={<LobbyPage user={user} />} />
        <Route path="/login" element={<LoginForm onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/games/:hash" element={<GamePage user={user} />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/tournament/create" element={<TournamentCreate user={user} />} />
        <Route path="/tournament/:id" element={<TournamentRoom user={user} />} />
      </Routes>
    </div>
    </SocketContext.Provider>
  );
}

const analysisButtonStyle = {
  position: 'fixed',
  top: '14px',
  left: '20px',
  padding: '8px 16px',
  borderRadius: '20px',
  backgroundColor: 'var(--card-bg)',
  backdropFilter: 'blur(12px)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  zIndex: 1000,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  transition: 'all 0.2s',
  fontFamily: "'Outfit', sans-serif",
};

const tutorialButtonStyle = {
  ...analysisButtonStyle,
  top: '58px', // 14px + ~44px button height
};

const themeToggleStyle = {
  position: 'fixed',
  bottom: '24px',
  left: '24px',
  width: '46px',
  height: '46px',
  borderRadius: '50%',
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-main)',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s',
  zIndex: 1000,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  backdropFilter: 'blur(8px)',
};

export default App;
