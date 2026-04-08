import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: formData.identifier, password: formData.password }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatus('success');
        if (onLoginSuccess) onLoginSuccess(result);
        navigate('/');
      } else {
        setStatus('error');
        setMessage(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to connect to the server.');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glass-panel auth-form-panel">
        <button className="auth-back-btn" onClick={() => navigate('/')}>← Back</button>
        <h2 style={{ marginBottom: '6px', fontSize: '2rem' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Log in to your account to play</p>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label htmlFor="login-identifier" style={labelStyle}>Username or Email</label>
            <input
              id="login-identifier"
              type="text"
              placeholder="e.g. PlayerOne or email@example.com"
              required
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="login-password" style={labelStyle}>Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle}
            />
          </div>

          {status === 'error' && (
            <div style={errorStyle}>{message}</div>
          )}

          <button type="submit" disabled={status === 'loading'} style={submitButtonStyle}>
            {status === 'loading' ? 'Logging in…' : 'Log In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No account?{' '}
            <button type="button" onClick={() => navigate('/register')} style={linkBtnStyle}>
              Create one
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const labelStyle = {
  fontSize: '14px', fontWeight: '600', marginBottom: '4px',
  display: 'block', color: 'var(--text-main)', opacity: 0.9,
};
const fieldStyle = { marginBottom: '20px', textAlign: 'left' };
const inputStyle = {
  width: '100%', padding: '12px', marginTop: '8px',
  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
  fontSize: '16px', outline: 'none', transition: 'all 0.3s',
};
const errorStyle = {
  color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',
  padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px',
};
const submitButtonStyle = {
  width: '100%', padding: '15px',
  background: 'linear-gradient(135deg, #46b0d4, #f27813)',
  color: 'white', border: 'none', borderRadius: '10px',
  fontSize: '16px', fontWeight: '600', cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(70,176,212,0.4)',
};
const linkBtnStyle = {
  background: 'none', border: 'none', color: 'var(--primary)',
  cursor: 'pointer', fontSize: '14px', textDecoration: 'underline',
};

export default LoginForm;
