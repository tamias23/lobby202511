import React from 'react';

const Lobby = ({ user, status, onFindMatch }) => {
  return (
    <div className="lobby-container" style={containerStyle}>
      <header style={headerStyle}>
        <h2>Game Dashboard</h2>
        <div style={badgeStyle}>
          {user.role === 'guest' ? '🕵️ Guest' : '⭐ Registered'}
        </div>
      </header>

      <section style={statsSectionStyle}>
        <div style={statCardStyle}>
          <h3>Current Rating</h3>
          <div style={ratingValueStyle}>{user.rating}</div>
        </div>
      </section>

      <section style={actionSectionStyle}>
        {status === 'lobby' ? (
          <button 
            onClick={onFindMatch} 
            style={actionButtonStyle}
          >
            Find Ranked Match
          </button>
        ) : (
          <div className="matchmaking-status" style={waitingStyle}>
            <div className="spinner"></div>
            <h3>Searching for Opponent...</h3>
            <p>Matching you with players near {user.rating} Elo</p>
          </div>
        )}
      </section>
    </div>
  );
};

const containerStyle = {
  maxWidth: '600px',
  margin: '40px auto',
  padding: '30px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  textAlign: 'center'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '30px',
  borderBottom: '1px solid #eee',
  paddingBottom: '15px'
};

const badgeStyle = {
  padding: '6px 12px',
  backgroundColor: '#f0f2f5',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#555'
};

const statsSectionStyle = {
  marginBottom: '40px'
};

const statCardStyle = {
  padding: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px'
};

const ratingValueStyle = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: '#007bff'
};

const actionSectionStyle = {
  marginTop: '20px'
};

const actionButtonStyle = {
  width: '100%',
  padding: '15px',
  fontSize: '18px',
  fontWeight: 'bold',
  backgroundColor: '#28a745',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.2s'
};

const waitingStyle = {
  padding: '20px',
  backgroundColor: '#e9ecef',
  borderRadius: '8px'
};

export default Lobby;
