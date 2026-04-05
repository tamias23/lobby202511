import React, { useState } from 'react';

const RegistrationForm = ({ onCancel }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
      <div style={containerStyle}>
        <h2 style={{ color: '#28a745' }}>Registration Successful!</h2>
        <p>{message}</p>
        <button onClick={onCancel} style={buttonStyle}>Back to Menu</button>
      </div>
    );
  }

  return (
    <div className="glass-panel registration-container" style={containerStyle}>
      <h2 style={{ marginBottom: '30px' }}>Create New Account</h2>
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
          <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
            {message}
          </div>
        )}
        <button type="submit" disabled={status === 'loading'} className="primary-button" style={submitButtonStyle}>
          {status === 'loading' ? 'Registering...' : 'Register Account'}
        </button>
        <button type="button" onClick={onCancel} className="secondary-button" style={cancelButtonStyle}>Cancel</button>
      </form>
    </div>
  );
};

const containerStyle = {
  maxWidth: '450px',
  margin: '80px auto',
  padding: '40px',
  textAlign: 'center',
  animation: 'fadeIn 0.5s ease-out'
};

const labelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '4px',
  display: 'block',
  color: 'var(--text-main)',
  opacity: 0.9
};

const fieldStyle = {
  marginBottom: '20px',
  textAlign: 'left'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '4px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: 'var(--text-main)',
  fontSize: '16px',
  outline: 'none',
  transition: 'all 0.3s'
};

const buttonStyle = {
  marginTop: '20px',
  padding: '10px 25px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
};

const submitButtonStyle = {
  width: '100%',
  padding: '15px',
  backgroundColor: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  marginBottom: '15px',
  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
};

const cancelButtonStyle = {
  width: '100%',
  padding: '10px',
  backgroundColor: 'transparent',
  color: 'var(--text-main)',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  opacity: 0.7
};

export default RegistrationForm;
