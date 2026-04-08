import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { socket } from './socket';
import LobbyPage from './components/LobbyPage';
import AuthHeader from './components/AuthHeader';
import GamePage from './components/GamePage';
import LoginForm from './components/LoginForm';
import RegistrationForm from './components/RegistrationForm';
import BubbleBackground from './components/BubbleBackground';

function App() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    const validThemes = ['light', 'dark', 'rain', 'bubble'];
    return validThemes.includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('light-mode', 'rain-mode', 'bubble-mode');
    if (theme === 'light') document.body.classList.add('light-mode');
    else if (theme === 'rain') document.body.classList.add('rain-mode');
    else if (theme === 'bubble') document.body.classList.add('bubble-mode');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Connect socket on mount (everyone gets a socket connection for live stats/lobby)
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    // If we had a persisted session, we could restore user here
    return () => {};
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    // Re-emit join_lobby so backend knows this socket's identity
    socket.emit('join_lobby', { userId: userData.id, role: userData.role });
  };

  const handleLogout = () => {
    setUser(null);
    socket.emit('join_lobby', {}); // back to guest
  };

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('rain');
    else if (theme === 'rain') setTheme('bubble');
    else setTheme('dark');
  };

  return (
    <div className="App">
      {/* Fixed theme toggle - positioned away from header */}
      <button
        onClick={cycleTheme}
        style={themeToggleStyle}
        title="Toggle Theme"
        id="theme-toggle-btn"
      >
        {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : theme === 'rain' ? '🌧️' : '🫧'}
      </button>

      {theme === 'bubble' && <BubbleBackground />}

      {/* Auth header top-right - ONLY on lobby page */}
      {location.pathname === '/' && (
        <AuthHeader user={user} onLogout={handleLogout} />
      )}

      <Routes>
        <Route path="/" element={<LobbyPage user={user} />} />
        <Route path="/login" element={<LoginForm onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/games/:hash" element={<GamePage user={user} />} />
      </Routes>
    </div>
  );
}

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
