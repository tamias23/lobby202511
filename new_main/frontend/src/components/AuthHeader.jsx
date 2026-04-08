import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthHeader = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <div style={headerStyle}>
        <button
          id="auth-login-btn"
          style={loginButtonStyle}
          onClick={() => navigate('/login')}
        >
          Log In
        </button>
        <button
          id="auth-register-btn"
          style={registerButtonStyle}
          onClick={() => navigate('/register')}
        >
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div style={headerStyle} ref={dropdownRef}>
      <button
        id="auth-user-btn"
        style={userButtonStyle}
        onClick={() => setDropdownOpen((o) => !o)}
      >
        <span style={usernameStyle}>{user.username || user.id}</span>
        <span style={{ marginLeft: '6px', opacity: 0.6, fontSize: '12px' }}>▾</span>
      </button>

      {dropdownOpen && (
        <div style={dropdownStyle} id="auth-dropdown">
          <div style={dropdownItemHeaderStyle}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {user.role === 'guest' ? 'Guest' : 'Registered'}
            </span>
            {user.rating && (
              <span style={ratingBadgeStyle}>{user.rating}</span>
            )}
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />
          <button
            id="auth-logout-btn"
            style={dropdownActionStyle}
            onClick={() => {
              setDropdownOpen(false);
              onLogout();
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};

const headerStyle = {
  position: 'fixed',
  top: '14px',
  right: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  zIndex: 1000,
};

const loginButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 18px',
  background: 'linear-gradient(135deg, #46b0d4, #f27813)',
  color: 'white',
  border: 'none',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(70,176,212,0.4)',
  transition: 'all 0.2s',
};

const registerButtonStyle = {
  padding: '8px 16px',
  background: 'var(--card-bg)',
  backdropFilter: 'blur(8px)',
  color: 'var(--text-main)',
  border: '1px solid var(--border)',
  borderRadius: '20px',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const userButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '7px 16px',
  background: 'var(--card-bg)',
  backdropFilter: 'blur(12px)',
  color: 'var(--text-main)',
  border: '1px solid var(--border)',
  borderRadius: '24px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  transition: 'all 0.2s',
};

const avatarStyle = {
  fontSize: '18px',
  lineHeight: 1,
};

const usernameStyle = {
  maxWidth: '140px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dropdownStyle = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  minWidth: '200px',
  background: 'var(--card-bg)',
  backdropFilter: 'blur(16px)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '12px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
  animation: 'fadeIn 0.15s ease-out',
};

const dropdownItemHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '2px 4px',
};

const ratingBadgeStyle = {
  fontSize: '12px',
  padding: '2px 8px',
  borderRadius: '10px',
  background: 'rgba(70,176,212,0.15)',
  color: 'var(--primary)',
  fontWeight: '700',
};

const dropdownActionStyle = {
  width: '100%',
  padding: '9px 12px',
  background: 'transparent',
  color: 'var(--text-main)',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s',
};

export default AuthHeader;
