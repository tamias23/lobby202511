import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';

const FORMAT_INFO = {
  swiss:       { label: 'Swiss', emoji: '🏔️', desc: 'Players are paired by score each round. Everyone plays every round.', minP: 6, maxP: 200, durationType: 'rounds', defaultDur: 6 },
  arena:       { label: 'Arena', emoji: '⚔️', desc: 'Continuous games! Get re-paired immediately after finishing. Fastest format.', minP: 6, maxP: 200, durationType: 'minutes', defaultDur: 30 },
  knockout:    { label: 'Knockout', emoji: '🥊', desc: 'Single-elimination bracket. Lose and you\'re out!', minP: 2, maxP: 64, durationType: 'rounds', defaultDur: null },
  round_robin: { label: 'Round Robin', emoji: '🔄', desc: 'Everyone plays everyone. The true test of strength.', minP: 2, maxP: 10, durationType: 'rounds', defaultDur: null },
};

const TC_PRESETS = [
  { label: '5+5',   m: 5,  i: 5  },
  { label: '10+5',  m: 10, i: 5  },
  { label: '10+10', m: 10, i: 10 },
  { label: '15+10', m: 15, i: 10 },
  { label: '15+30', m: 15, i: 30 },
];

function knockoutRounds(n) {
  return Math.ceil(Math.log2(Math.max(2, n)));
}

// Color map for polygon colors → hex (uses tutorial theme)
const POLY_COLORS = {
  orange: '#f97316',
  green:  '#22c55e',
  blue:   '#3b82f6',
  grey:   '#64748b',
  red:    '#ef4444',
  purple: '#a855f7',
  yellow: '#eab308',
};

/** Mini SVG board renderer for tournament board picker */
function BoardMiniSvg({ board, size = 120 }) {
  if (!board || !board.polygons || board.polygons.length === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        No preview
      </div>
    );
  }

  const { bbox } = board;
  const pad = 5;
  const bw = (bbox.maxX - bbox.minX) || 100;
  const bh = (bbox.maxY - bbox.minY) || 100;
  const vb = `${bbox.minX - pad} ${bbox.minY - pad} ${bw + pad * 2} ${bh + pad * 2}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={vb}
      style={{ display: 'block', margin: '0 auto', borderRadius: '8px' }}
    >
      {board.polygons.map((poly, i) => {
        if (!poly.points || poly.points.length < 3) return null;
        const pts = poly.points.map(([x, y]) => `${x},${y}`).join(' ');
        const fill = POLY_COLORS[poly.color] || poly.color || '#888';
        return (
          <polygon
            key={i}
            points={pts}
            fill={fill}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

export default function TournamentCreate({ user }) {
  const navigate = useNavigate();
  const socket = useContext(SocketContext);

  // Step state
  const [step, setStep] = useState(1); // 1=format, 2=settings, 3=board, 4=review

  // Tournament config
  const [format, setFormat]         = useState(null);
  const [maxP, setMaxP]             = useState(8);
  const [tcMinutes, setTcMinutes]   = useState(5);
  const [tcIncrement, setTcIncrement] = useState(3);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword]     = useState('');
  const [ratingMin, setRatingMin]   = useState(0);
  const [ratingMax, setRatingMax]   = useState(5000);
  const [invitedBots, setInvitedBots] = useState(0);
  const [creatorPlays, setCreatorPlays] = useState(true);
  const [launchMode, setLaunchMode] = useState('when_complete');
  const [launchDelay, setLaunchDelay] = useState(30); // minutes from now
  const [durationValue, setDurationValue] = useState(6);

  // Max bots = all slots except one reserved for the creator (if they play)
  const maxBots = Math.max(0, maxP - (creatorPlays ? 1 : 0));

  // Clamp invitedBots whenever the ceiling changes
  useEffect(() => {
    setInvitedBots(prev => Math.min(prev, maxBots));
  }, [maxBots]);

  const [boardMode, setBoardMode]   = useState('random');
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [randomBoards, setRandomBoards] = useState([]);
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState('');
  const [expandedBoard, setExpandedBoard] = useState(null); // board obj for full-size modal

  // Fetch boards for picker
  useEffect(() => {
    if (step === 3 && boardMode === 'fixed' && randomBoards.length === 0) {
      fetch('/api/boards/random/10')
        .then(r => r.json())
        .then(data => setRandomBoards(data.boards || []))
        .catch(() => {});
    }
  }, [step, boardMode, randomBoards.length]);

  // Clamp maxP when format changes
  useEffect(() => {
    if (!format) return;
    const info = FORMAT_INFO[format];
    setMaxP(prev => Math.max(info.minP, Math.min(info.maxP, prev)));
    if (info.durationType === 'rounds' && info.defaultDur === null) {
      // knockout/rr: auto-calc
      if (format === 'knockout') setDurationValue(knockoutRounds(maxP));
      else if (format === 'round_robin') setDurationValue(Math.max(1, maxP - 1));
    } else if (info.defaultDur) {
      setDurationValue(info.defaultDur);
    }
  }, [format]);

  // Update knockout rounds when maxP changes
  useEffect(() => {
    if (format === 'knockout') setDurationValue(knockoutRounds(maxP));
    if (format === 'round_robin') setDurationValue(Math.max(1, maxP - 1));
  }, [format, maxP]);

  const info = format ? FORMAT_INFO[format] : null;

  // Handle socket events
  useEffect(() => {
    if (!socket) return;
    const onCreated = (data) => {
      setCreating(false);
      navigate(`/tournament/${data.id}`);
    };
    const onError = (data) => {
      setCreating(false);
      setError(data.message || 'Failed to create tournament.');
    };
    socket.on('tournament_created', onCreated);
    socket.on('tournament_error', onError);
    return () => {
      socket.off('tournament_created', onCreated);
      socket.off('tournament_error', onError);
    };
  }, [socket, navigate]);

  const handleCreate = useCallback(() => {
    if (!socket || !format) return;
    setCreating(true);
    setError('');
    socket.emit('create_tournament', {
      format,
      maxParticipants: maxP,
      timeControlMinutes: tcMinutes,
      timeControlIncrement: tcIncrement,
      password: usePassword ? password : null,
      boardId: boardMode === 'fixed' ? selectedBoardId : null,
      ratingMin,
      ratingMax,
      durationValue,
      invitedBots,
      creatorPlays,
      launchMode,
      launchAt: (launchMode === 'at_time' || launchMode === 'both')
        ? Date.now() + launchDelay * 60 * 1000
        : null,
    });
  }, [socket, format, maxP, tcMinutes, tcIncrement, usePassword, password, boardMode, selectedBoardId, ratingMin, ratingMax, durationValue, invitedBots, creatorPlays, launchMode, launchDelay]);

  if (!user) {
    return (
      <div className="tourn-create-layout">
        <div className="tourn-create-card glass-panel">
          <h1 className="tourn-create-title">🏆 Create Tournament</h1>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            You must be logged in to create a tournament.
          </p>
          <button className="tourn-btn tourn-btn--primary" onClick={() => navigate('/login')}>Log In</button>
          <button className="tourn-btn tourn-btn--secondary" onClick={() => navigate('/')}>← Lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tourn-create-layout">
      <div className="tourn-create-card glass-panel">
        <button className="tourn-back-link" onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}>
          ← {step > 1 ? 'Back' : 'Lobby'}
        </button>
        <h1 className="tourn-create-title">🏆 Create Tournament</h1>

        {/* Step indicators */}
        <div className="tourn-steps-bar">
          {[1,2,3,4].map(s => (
            <div key={s} className={`tourn-step-dot${step >= s ? ' tourn-step-dot--active' : ''}`}>
              {s}
            </div>
          ))}
        </div>

        {error && <div className="tourn-error">{error}</div>}

        {/* ── Step 1: Format ── */}
        {step === 1 && (
          <div className="tourn-format-grid">
            {Object.entries(FORMAT_INFO).map(([key, f]) => (
              <div
                key={key}
                className={`tourn-format-card glass-panel${format === key ? ' tourn-format-card--selected' : ''}`}
                onClick={() => { setFormat(key); setStep(2); }}
              >
                <div className="tourn-format-emoji">{f.emoji}</div>
                <div className="tourn-format-label">{f.label}</div>
                <div className="tourn-format-desc">{f.desc}</div>
                <div className="tourn-format-range">{f.minP}–{f.maxP} players</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 2: Settings ── */}
        {step === 2 && info && (
          <div className="tourn-settings">
            <div className="tourn-settings-section">
              <label className="tourn-label">Max Participants</label>
              <div className="tourn-slider-row">
                <input type="range" min={info.minP} max={info.maxP} value={maxP}
                  onChange={e => setMaxP(Number(e.target.value))} className="tourn-slider" />
                <span className="tourn-slider-val">{maxP}</span>
              </div>
            </div>

            <div className="tourn-settings-section">
              <label className="tourn-label">Time Control</label>
              <div className="tourn-tc-presets">
                {TC_PRESETS.map(p => (
                  <button key={p.label}
                    className={`tourn-tc-btn${tcMinutes === p.m && tcIncrement === p.i ? ' tourn-tc-btn--active' : ''}`}
                    onClick={() => { setTcMinutes(p.m); setTcIncrement(p.i); }}
                  >{p.label}</button>
                ))}
              </div>
              <div className="tourn-tc-custom">
                <label>Min <input type="number" min="1" max="15" value={tcMinutes}
                  onChange={e => setTcMinutes(Math.min(15, Math.max(1, Number(e.target.value))))} className="tourn-input-sm" /></label>
                <label>+Inc <input type="number" min="0" max="30" value={tcIncrement}
                  onChange={e => setTcIncrement(Math.min(30, Math.max(0, Number(e.target.value))))} className="tourn-input-sm" /></label>
              </div>
            </div>

            {info.durationType === 'rounds' && format !== 'knockout' && format !== 'round_robin' && (
              <div className="tourn-settings-section">
                <label className="tourn-label">Number of Rounds</label>
                <div className="tourn-slider-row">
                  <input type="range" min="3" max={Math.min(maxP - 1, 20)} value={durationValue}
                    onChange={e => setDurationValue(Number(e.target.value))} className="tourn-slider" />
                  <span className="tourn-slider-val">{durationValue}</span>
                </div>
              </div>
            )}

            {info.durationType === 'minutes' && (
              <div className="tourn-settings-section">
                <label className="tourn-label">Arena Duration (minutes)</label>
                <div className="tourn-slider-row">
                  <input type="range" min="10" max="120" step="5" value={durationValue}
                    onChange={e => setDurationValue(Number(e.target.value))} className="tourn-slider" />
                  <span className="tourn-slider-val">{durationValue}m</span>
                </div>
              </div>
            )}

            <div className="tourn-settings-section">
              <label className="tourn-label">Password Protection</label>
              <div className="tourn-toggle-row">
                <button className={`tourn-toggle-btn${!usePassword ? ' active' : ''}`} onClick={() => setUsePassword(false)}>Open</button>
                <button className={`tourn-toggle-btn${usePassword ? ' active' : ''}`} onClick={() => setUsePassword(true)}>Private</button>
              </div>
              {usePassword && (
                <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Tournament password" className="tourn-input" />
              )}
            </div>

            <div className="tourn-settings-section">
              <label className="tourn-label">Rating Range</label>
              <div className="tourn-rating-row">
                <input type="number" min="0" max={ratingMax} value={ratingMin}
                  onChange={e => setRatingMin(Number(e.target.value))} className="tourn-input-sm" />
                <span>—</span>
                <input type="number" min={ratingMin} max="5000" value={ratingMax}
                  onChange={e => setRatingMax(Number(e.target.value))} className="tourn-input-sm" />
              </div>
            </div>

            <div className="tourn-settings-section">
              <label className="tourn-label">Invite Bots (0–{maxBots})</label>
              <div className="tourn-slider-row">
                <input type="range" min="0" max={maxBots} value={invitedBots}
                  onChange={e => setInvitedBots(Number(e.target.value))} className="tourn-slider" />
                <span className="tourn-slider-val">{invitedBots}</span>
              </div>
            </div>

            <div className="tourn-settings-section">
              <label className="tourn-label">Will you play?</label>
              <div className="tourn-toggle-row">
                <button className={`tourn-toggle-btn${creatorPlays ? ' active' : ''}`} onClick={() => setCreatorPlays(true)}>Yes</button>
                <button className={`tourn-toggle-btn${!creatorPlays ? ' active' : ''}`} onClick={() => setCreatorPlays(false)}>No (spectate)</button>
              </div>
            </div>

            <div className="tourn-settings-section">
              <label className="tourn-label">When to Start</label>
              <div className="tourn-toggle-row">
                <button className={`tourn-toggle-btn${launchMode === 'when_complete' ? ' active' : ''}`} onClick={() => setLaunchMode('when_complete')}>When Full</button>
                <button className={`tourn-toggle-btn${launchMode === 'at_time' ? ' active' : ''}`} onClick={() => setLaunchMode('at_time')}>At Time</button>
                <button className={`tourn-toggle-btn${launchMode === 'both' ? ' active' : ''}`} onClick={() => setLaunchMode('both')}>Either</button>
              </div>
              {(launchMode === 'at_time' || launchMode === 'both') && (
                <div className="tourn-slider-row" style={{marginTop: '0.5rem'}}>
                  <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Start in</label>
                  <input type="range" min="5" max="120" step="5" value={launchDelay}
                    onChange={e => setLaunchDelay(Number(e.target.value))} className="tourn-slider" />
                  <span className="tourn-slider-val">{launchDelay}m</span>
                </div>
              )}
            </div>

            <button className="tourn-btn tourn-btn--primary" onClick={() => setStep(3)}>
              Next: Board Selection →
            </button>
          </div>
        )}

        {/* ── Step 3: Board ── */}
        {step === 3 && (
          <div className="tourn-board-step">
            <div className="tourn-toggle-row" style={{marginBottom: '1.5rem'}}>
              <button className={`tourn-toggle-btn${boardMode === 'random' ? ' active' : ''}`} onClick={() => setBoardMode('random')}>Random Boards</button>
              <button className={`tourn-toggle-btn${boardMode === 'fixed' ? ' active' : ''}`} onClick={() => setBoardMode('fixed')}>Fixed Board</button>
            </div>

            {boardMode === 'random' && (
              <div className="tourn-board-info">
                <p style={{color: 'var(--text-muted)'}}>Each game will use a randomly selected board from the server pool. This ensures variety and fairness.</p>
              </div>
            )}

            {boardMode === 'fixed' && (
              <div className="tourn-board-picker">
                {randomBoards.length === 0 ? (
                  <p style={{color: 'var(--text-muted)'}}>Loading boards…</p>
                ) : (
                  <div className="tourn-board-grid">
                    {randomBoards.map(b => (
                      <div
                        key={b.id}
                        className={`tourn-board-card glass-panel${selectedBoardId === b.id ? ' tourn-board-card--selected' : ''}`}
                        onClick={() => setSelectedBoardId(b.id)}
                      >
                        <BoardMiniSvg board={b} size={120} />
                        <div className="tourn-board-card-name">{b.id}</div>
                        <div className="tourn-board-card-info">{b.polygonCount} tiles</div>
                        <button
                          className="tourn-board-expand-btn"
                          onClick={(e) => { e.stopPropagation(); setExpandedBoard(b); }}
                          title="Expand"
                        >🔍</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Expanded board modal */}
            {expandedBoard && (
              <div className="tourn-board-modal-overlay" onClick={() => setExpandedBoard(null)}>
                <div className="tourn-board-modal" onClick={e => e.stopPropagation()}>
                  <button className="tourn-board-modal-close" onClick={() => setExpandedBoard(null)}>✕</button>
                  <h3 style={{textAlign:'center', marginBottom:'1rem', fontFamily:"'Outfit',sans-serif"}}>{expandedBoard.id}</h3>
                  <BoardMiniSvg board={expandedBoard} size={500} />
                  <p style={{textAlign:'center', color:'var(--text-muted)', marginTop:'0.75rem'}}>{expandedBoard.polygonCount} tiles</p>
                  <button
                    className="tourn-btn tourn-btn--primary"
                    style={{marginTop:'1rem', width:'100%'}}
                    onClick={() => { setSelectedBoardId(expandedBoard.id); setExpandedBoard(null); }}
                  >
                    Select this board
                  </button>
                </div>
              </div>
            )}

            <button className="tourn-btn tourn-btn--primary" onClick={() => setStep(4)}
              disabled={boardMode === 'fixed' && !selectedBoardId}
            >
              Next: Review →
            </button>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && info && (
          <div className="tourn-review">
            <div className="tourn-review-card glass-panel">
              <div className="tourn-review-row"><span>Format</span><strong>{info.emoji} {info.label}</strong></div>
              <div className="tourn-review-row"><span>Players</span><strong>{maxP}</strong></div>
              <div className="tourn-review-row"><span>Time Control</span><strong>{tcMinutes}+{tcIncrement}</strong></div>
              <div className="tourn-review-row"><span>Duration</span><strong>{durationValue} {info.durationType}</strong></div>
              <div className="tourn-review-row"><span>Password</span><strong>{usePassword ? '🔒 Yes' : '🔓 Open'}</strong></div>
              <div className="tourn-review-row"><span>Rating</span><strong>{ratingMin}–{ratingMax}</strong></div>
              <div className="tourn-review-row"><span>Bots</span><strong>{invitedBots}</strong></div>
              <div className="tourn-review-row"><span>You Play</span><strong>{creatorPlays ? 'Yes' : 'No'}</strong></div>
              <div className="tourn-review-row"><span>Board</span><strong>{boardMode === 'fixed' ? selectedBoardId : 'Random'}</strong></div>
              <div className="tourn-review-row"><span>Launch</span><strong>
                {launchMode === 'when_complete' ? 'When full' : launchMode === 'at_time' ? `In ${launchDelay}m` : `When full or in ${launchDelay}m`}
              </strong></div>
            </div>

            <button
              className="tourn-btn tourn-btn--primary tourn-btn--large"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? 'Creating…' : '🏆 Create Tournament'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
