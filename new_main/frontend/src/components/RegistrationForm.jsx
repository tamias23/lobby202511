import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to connect to the server.');
    }
  };

  if (status === 'success') {
    return (
      <div className="auth-page-wrapper">
        <div className="glass-panel auth-form-panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#22c55e' }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>{message}</p>
          <button onClick={() => navigate('/')} style={primaryBtnStyle}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="glass-panel auth-form-panel">
        <button className="auth-back-btn" onClick={() => navigate('/')}>← Back</button>
        <h2 style={{ marginBottom: '6px', fontSize: '2rem' }}>Create Account</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Join to track your progress</p>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label htmlFor="reg-username" style={labelStyle}>Username</label>
            <input
              id="reg-username"
              type="text"
              placeholder="e.g. PlayerOne"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
            <input
              id="reg-email"
              type="email"
              placeholder="player@example.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="reg-password" style={labelStyle}>Password</label>
            <input
              id="reg-password"
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

          <button type="submit" disabled={status === 'loading'} style={primaryBtnStyle}>
            {status === 'loading' ? 'Registering…' : 'Register Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/login')} style={linkBtnStyle}>
              Log in
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
  width: '100%', padding: '12px', marginTop: '4px',
  borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
  fontSize: '16px', outline: 'none', transition: 'all 0.3s',
};
const errorStyle = {
  color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',
  padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px',
};
const primaryBtnStyle = {
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

export default RegistrationForm;
