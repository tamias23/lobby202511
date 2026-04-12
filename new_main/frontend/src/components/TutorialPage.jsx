import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import translations from '../utils/tutorialTranslations';

// ─── Section board configurations ────────────────────────────────────────────
const SECTION_PIECES = {
  intro: [
    { id: 'white_goddess_0', type: 'goddess', pos: 'oH1' },
    { id: 'black_goddess_0', type: 'goddess', pos: 'bF1' },
  ],
  setup_phase: 'initial',
  board: [],
  turn: [],
  goddess: [
    { id: 'white_goddess_0', type: 'goddess', pos: 'oH1' },
    { id: 'black_goddess_0', type: 'goddess', pos: 'yJ1' },
  ],
  heroe: [
    { id: 'white_heroe_0', type: 'heroe', pos: 'oH1' },
    { id: 'black_heroe_0', type: 'heroe', pos: 'yJ1' },
    { id: 'white_ghoul_0', type: 'ghoul', pos: 'bF1' },
    { id: 'black_ghoul_0', type: 'ghoul', pos: 'yI1' },
    { id: 'white_soldier_0', type: 'soldier', pos: 'gE2' },
    { id: 'white_soldier_1', type: 'soldier', pos: 'bH2' },
    { id: 'black_soldier_0', type: 'soldier', pos: 'gI2' },
    { id: 'black_soldier_1', type: 'soldier', pos: 'yJ2' },
    { id: 'white_siren_0', type: 'siren', pos: 'oF1' },
    { id: 'black_siren_0', type: 'siren', pos: 'oJ1' },
    { id: 'white_minotaur_0', type: 'minotaur', pos: 'gH1' },
    { id: 'black_minotaur_0', type: 'minotaur', pos: 'gI1' },
  ],
  mage: [
    { id: 'white_mage_0', type: 'mage', pos: 'oH1' },
    { id: 'black_mage_0', type: 'mage', pos: 'oE2' },
    { id: 'white_ghoul_0', type: 'ghoul', pos: 'bF1' },
    { id: 'white_ghoul_1', type: 'ghoul', pos: 'bF2' },
    { id: 'white_ghoul_2', type: 'ghoul', pos: 'bH1' },
    { id: 'white_ghoul_3', type: 'ghoul', pos: 'bH2' },
    { id: 'white_soldier_0', type: 'soldier', pos: 'gH1' },
    { id: 'white_soldier_1', type: 'soldier', pos: 'gH2' },
    { id: 'white_soldier_2', type: 'soldier', pos: 'oF1' },
    { id: 'black_ghoul_0', type: 'ghoul', pos: 'yJ1' },
    { id: 'black_ghoul_1', type: 'ghoul', pos: 'yJ2' },
    { id: 'black_ghoul_2', type: 'ghoul', pos: 'gI1' },
    { id: 'black_ghoul_3', type: 'ghoul', pos: 'gI2' },
    { id: 'black_soldier_0', type: 'soldier', pos: 'gK1' },
    { id: 'black_soldier_1', type: 'soldier', pos: 'gK2' },
    { id: 'black_soldier_2', type: 'soldier', pos: 'oK1' },
  ],
  siren: [
    { id: 'white_siren_0', type: 'siren', pos: 'oH1' },
    { id: 'white_siren_1', type: 'siren', pos: 'gH1' },
    { id: 'white_siren_2', type: 'siren', pos: 'bF1' },
    { id: 'white_siren_3', type: 'siren', pos: 'bH2' },
    { id: 'black_siren_0', type: 'siren', pos: 'oK1' },
    { id: 'black_siren_1', type: 'siren', pos: 'gI1' },
    { id: 'black_siren_2', type: 'siren', pos: 'yJ1' },
    { id: 'black_siren_3', type: 'siren', pos: 'yI1' },
  ],
  ghoul: [
    { id: 'white_ghoul_0', type: 'ghoul', pos: 'oH1' },
    { id: 'white_ghoul_1', type: 'ghoul', pos: 'bF1' },
    { id: 'white_ghoul_2', type: 'ghoul', pos: 'bH1' },
    { id: 'white_ghoul_3', type: 'ghoul', pos: 'gH2' },
    { id: 'black_ghoul_0', type: 'ghoul', pos: 'bF2' },
    { id: 'black_ghoul_1', type: 'ghoul', pos: 'yJ1' },
    { id: 'black_ghoul_2', type: 'ghoul', pos: 'gI1' },
    { id: 'black_ghoul_3', type: 'ghoul', pos: 'oJ1' },
  ],
  witch: [
    { id: 'white_witch_0', type: 'witch', pos: 'gH2' },
    { id: 'black_witch_0', type: 'witch', pos: 'yI1' },
  ],
  soldier: [
    { id: 'white_soldier_0', type: 'soldier', pos: 'oH1' },
    { id: 'white_soldier_1', type: 'soldier', pos: 'gH1' },
    { id: 'white_soldier_2', type: 'soldier', pos: 'gH2' },
    { id: 'white_soldier_3', type: 'soldier', pos: 'oF1' },
    { id: 'white_soldier_4', type: 'soldier', pos: 'bH1' },
    { id: 'white_soldier_5', type: 'soldier', pos: 'bH2' },
    { id: 'black_soldier_0', type: 'soldier', pos: 'yJ1' },
    { id: 'black_soldier_1', type: 'soldier', pos: 'yI1' },
    { id: 'black_soldier_2', type: 'soldier', pos: 'yJ2' },
    { id: 'black_soldier_3', type: 'soldier', pos: 'oJ1' },
  ],
  minotaur: [
    { id: 'white_minotaur_0', type: 'minotaur', pos: 'gJ1' },
    { id: 'black_minotaur_0', type: 'minotaur', pos: 'gK1' },
  ],
  global_overview: 'full',
};

const INITIAL_SETUP_PIECES = [
  { id: 'white_goddess_0', type: 'goddess', pos: 'oH1' },
  { id: 'white_heroe_0',   type: 'heroe',   pos: 'bH2' },
  { id: 'white_heroe_1',   type: 'heroe',   pos: 'gE2' },
  { id: 'white_minotaur_0',   type: 'minotaur',   pos: 'bF1' },
  { id: 'white_minotaur_1',   type: 'minotaur',   pos: 'gI1' },
  { id: 'black_goddess_0', type: 'goddess', pos: 'oK1' },
  { id: 'black_heroe_0',   type: 'heroe',   pos: 'yJ1' },
  { id: 'black_heroe_1',   type: 'heroe',   pos: 'yE2' },
  { id: 'black_minotaur_0',   type: 'minotaur',   pos: 'gI2' },
  { id: 'black_minotaur_1',   type: 'minotaur',   pos: 'gE1' },
];

function getFullBoardPieces() {
  const pieces = [...INITIAL_SETUP_PIECES];
  const extraPositions = [
    'gC2','gK1','yE1','yJ2','yC2','yL1','oF1','oJ1','oE1','oK2',
    'oN1','oB2','yF1','yH2','yF2','yH1','gK2','gC1','gG2','gH1',
  ];
  extraPositions.forEach((pos, i) => {
    const type = i % 2 === 0 ? 'ghoul' : 'siren';
    const side = i < 10 ? 'white' : 'black';
    pieces.push({ id: `${side}_${type}_${i}`, type, pos });
  });
  pieces.push(
    { id: 'white_witch_0', type: 'witch', pos: 'gH2' },
    { id: 'white_witch_1', type: 'witch', pos: 'gG1' },
    { id: 'black_witch_0', type: 'witch', pos: 'yI1' },
    { id: 'black_witch_1', type: 'witch', pos: 'yG1' },
  );
  return pieces;
}

// ─── Colour map matching the design tokens ────────────────────────────────────
function getHexColor(colorName) {
  const colors = {
    orange: '#f27813',
    blue:   '#46b0d4',
    green:  '#2ecc71',
    grey:   '#94a3b8',
    red:    '#ef4444',
    black:  '#1e293b',
  };
  return colors[colorName?.toLowerCase()] || '#ccc';
}

// ─── SVG piece renderer (pure SVG, identical shapes to tutorial/app.js) ───────
function PieceSVG({ type, side }) {
  const isBlack = side === 'black';
  const fill   = isBlack ? 'black' : 'white';
  const stroke = 'black';

  switch (type) {
    case 'minotaur':
      return (
        <g transform="scale(0.09)">
          {[0,120,240].map(a => (
            <path key={a} d="M 0 0 A 10 25 0 0 1 110 110 Z"
              fill={fill} stroke={stroke} strokeWidth="20" transform={`rotate(${a} 0 0)`} />
          ))}
          {isBlack && [0,120,240].map(a => (
            <path key={`i${a}`} d="M 0 0 A 10 25 0 0 1 110 110 Z"
              fill="black" stroke="white" strokeWidth="15" transform={`rotate(${a} 0 0) scale(0.5)`} />
          ))}
        </g>
      );
    case 'witch':
      return (
        <g transform="translate(-40,-44)">
          <polygon points="40,32 30,50 50,50" fill={fill} stroke={stroke} strokeWidth="2" />
        </g>
      );
    case 'soldier':
      return (
        <g transform="scale(0.9)">
          <ellipse cx="0" cy="0" rx="10" ry="10" fill={fill} stroke={isBlack ? 'black' : 'white'} strokeWidth="4" />
          <ellipse cx="0" cy="0" rx="12" ry="12" fill="none" stroke="black" strokeWidth="2" />
        </g>
      );
    case 'goddess':
      return (
        <g transform="scale(0.23)">
          <polygon points="0,-55 50,15 0,55 -50,15" fill={fill} stroke="black" strokeWidth="8" />
          <polygon points="0,-15 20,10 0,20 -20,10"
            fill="black"
            stroke={isBlack ? 'white' : 'black'}
            strokeWidth={isBlack ? '4' : '8'} />
        </g>
      );
    case 'heroe':
      return (
        <g transform="scale(0.46) translate(-50,-187)">
          <polygon points="50,165 55,180 70,180 60,190 65,205 50,195 35,205 40,190 30,180 45,180"
            fill={fill} stroke={stroke} strokeWidth="3" />
        </g>
      );
    case 'mage':
      if (isBlack) {
        return (
          <g transform="scale(0.04) translate(-255.77,-221.5)">
            <polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01"
              fill="black" stroke="black" strokeWidth="30" />
            {[[130.77,438.01],[5.77,221.5],[130.77,5],[380.77,5],[505.77,221.5],[380.77,438.01]].map(([cx,cy],i) => (
              <ellipse key={i} cx={cx} cy={cy} rx="80" ry="80" fill="black" stroke="black" strokeWidth="10" />
            ))}
            <ellipse cx="255.77" cy="221.5" rx="80"  ry="80"  fill="none" stroke="white" strokeWidth="30" />
            <ellipse cx="255.77" cy="221.5" rx="110" ry="110" fill="none" stroke="black" strokeWidth="20" />
            <ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="white" strokeWidth="30" />
          </g>
        );
      }
      return (
        <g transform="scale(0.04) translate(-255.77,-221.5)">
          {[[130.77,438.01],[5.77,221.5],[130.77,5],[380.77,5],[505.77,221.5],[380.77,438.01]].map(([cx,cy],i) => (
            <ellipse key={i} cx={cx} cy={cy} rx="80" ry="80" fill="black" stroke="black" strokeWidth="10" />
          ))}
          <polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01"
            fill="white" stroke="black" strokeWidth="35" />
          {[[130.77,438.01],[5.77,221.5],[130.77,5],[380.77,5],[505.77,221.5],[380.77,438.01]].map(([cx,cy],i) => (
            <ellipse key={`w${i}`} cx={cx} cy={cy} rx="40" ry="40" fill="white" stroke="white" strokeWidth="1" />
          ))}
          <ellipse cx="255.77" cy="221.5" rx="80"  ry="80"  fill="none" stroke="black" strokeWidth="35" />
          <ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="black" strokeWidth="35" />
        </g>
      );
    case 'siren': {
      const pts = Array.from({length:6},(_,i)=>{
        const a=(Math.PI/3)*i; return `${14*Math.cos(a)},${14*Math.sin(a)}`;
      }).join(' ');
      return (
        <g transform="scale(0.8)">
          <ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" strokeWidth="4" />
          <polygon points={pts} fill={fill} stroke="black" strokeWidth="2" />
          {isBlack ? (<>
            <line x1="-8" x2="8" y1="-8" y2="8" stroke="white" strokeWidth="1" />
            <line x1="-8" x2="8" y1="8"  y2="-8" stroke="white" strokeWidth="1" />
            <line x1="10" x2="-10" y1="0" y2="0" stroke="white" strokeWidth="1" />
            <line x1="0"  x2="0"  y1="-10" y2="10" stroke="white" strokeWidth="1" />
            <circle r="6.5" fill="white" strokeWidth="0" />
            <circle r="5.5" fill="black" strokeWidth="0" />
          </>) : (<>
            <line x1="-8" x2="8" y1="-8" y2="8" stroke="black" strokeWidth="1" />
            <line x1="-8" x2="8" y1="8"  y2="-8" stroke="black" strokeWidth="1" />
            <line x1="10" x2="-10" y1="0" y2="0" stroke="black" strokeWidth="1" />
            <line x1="0"  x2="0"  y1="-10" y2="10" stroke="black" strokeWidth="1" />
            <circle r="6.5" fill="black" stroke="black" strokeWidth="0" />
            <circle r="4"   fill="white" stroke="white" strokeWidth="0" />
          </>)}
        </g>
      );
    }
    case 'ghoul':
      return (
        <g transform="scale(0.8) translate(-9.5,-9.5)">
          <rect x="0" y="0" width="19" height="19" fill={fill} stroke="black" strokeWidth="2" />
          {isBlack && <rect x="7" y="7" width="5" height="5" fill="black" stroke="white" strokeWidth="1" />}
        </g>
      );
    default:
      return <text dy=".3em" textAnchor="middle" fontSize="10" fill={fill}>{(type||'?')[0].toUpperCase()}</text>;
  }
}

// ─── Main Tutorial Board (SVG) ────────────────────────────────────────────────
function TutorialBoard({ boardData, pieces, setPieces }) {
  const svgRef = useRef(null);
  const [selected, setSelected]     = useState(null);   // pieceId
  const [targets, setTargets]       = useState([]);
  const dragRef = useRef({ active: false });

  // Compute viewBox
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  if (boardData) {
    Object.values(boardData.allPolygons).forEach(poly => {
      (poly.points||[]).forEach(([x,y]) => {
        if(x<minX)minX=x; if(x>maxX)maxX=x;
        if(y<minY)minY=y; if(y>maxY)maxY=y;
      });
    });
  }
  const pad=10;
  const viewBox = boardData
    ? `${minX-pad} ${minY-pad} ${maxX-minX+pad*2} ${maxY-minY+pad*2}`
    : '0 0 500 400';

  const getSVGPt = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }, []);

  const fetchMoves = useCallback(async (piece) => {
    if (!boardData) return [];
    try {
      const mappedPieces = pieces.map(p => ({
        id: p.id,
        type: p.type === 'heroe' ? 'king' : p.type === 'witch' ? 'bishop' : p.type === 'minotaur' ? 'berserker' : p.type,
        side: p.id.startsWith('white') ? 'white' : 'black',
        position: p.pos,
      }));
      const res = await fetch('/api/tutorial/moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardJson: JSON.stringify(boardData),
          piecesJson: JSON.stringify(mappedPieces),
          pieceId: piece.id,
          turn: piece.id.startsWith('white') ? 'white' : 'black',
        }),
      });
      const data = await res.json();
      return data.targets || [];
    } catch { return []; }
  }, [boardData, pieces]);

  const applyMove = useCallback(async (pieceId, targetPos) => {
    if (!boardData) return;
    try {
      const mappedPieces = pieces.map(p => ({
        id: p.id,
        type: p.type === 'heroe' ? 'king' : p.type === 'witch' ? 'bishop' : p.type === 'minotaur' ? 'berserker' : p.type,
        side: p.id.startsWith('white') ? 'white' : 'black',
        position: p.pos,
      }));
      const res = await fetch('/api/tutorial/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardJson: JSON.stringify(boardData),
          piecesJson: JSON.stringify(mappedPieces),
          pieceId,
          targetPoly: targetPos,
        }),
      });
      const data = await res.json();
      if (data.piecesJson) {
        const updated = JSON.parse(data.piecesJson).map(p => ({
          id: p.id,
          type: p.type === 'king' ? 'heroe' : p.type === 'bishop' ? 'witch' : p.type === 'berserker' ? 'minotaur' : p.type,
          pos: p.position,
        }));
        setPieces(updated);
      }
    } catch(e) { console.error('apply error', e); }
  }, [boardData, pieces, setPieces]);

  const getClosestPoly = useCallback((pt) => {
    if (!boardData) return null;
    let closest=null, minDist=1600;
    Object.entries(boardData.allPolygons).forEach(([key, poly]) => {
      const dx=pt.x-poly.center[0], dy=pt.y-poly.center[1], d2=dx*dx+dy*dy;
      if (d2<minDist) { minDist=d2; closest=key; }
    });
    return closest;
  }, [boardData]);

  const handlePointerDown = useCallback(async (e, pieceId, cx, cy) => {
    e.preventDefault();
    const svgPt = getSVGPt(e);
    dragRef.current = { active: true, pieceId, startX: svgPt.x, startY: svgPt.y, cx, cy, moved: false, dx: 0, dy: 0 };
    svgRef.current?.setPointerCapture(e.pointerId);

    const piece = pieces.find(p => p.id === pieceId);
    const newTargets = await fetchMoves(piece);
    setSelected(pieceId);
    setTargets(newTargets);
  }, [pieces, fetchMoves, getSVGPt]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const pt = getSVGPt(e);
    dragRef.current.dx = pt.x - dragRef.current.startX;
    dragRef.current.dy = pt.y - dragRef.current.startY;
    dragRef.current.moved = Math.abs(dragRef.current.dx)>3 || Math.abs(dragRef.current.dy)>3;
    // Force re-render for drag visual
    setSelected(s => s); // cheap re-render trigger
  }, [getSVGPt]);

  const handlePointerUp = useCallback(async (e) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    dragRef.current = { active: false };
    try { svgRef.current?.releasePointerCapture(e.pointerId); } catch(_) {}

    if (drag.moved) {
      const pt = getSVGPt(e);
      const targetPoly = getClosestPoly(pt);
      if (targetPoly && targets.includes(targetPoly)) {
        await applyMove(drag.pieceId, targetPoly);
        setSelected(null); setTargets([]);
      }
    } else {
      // click — toggle selection
      if (selected === drag.pieceId) {
        setSelected(null); setTargets([]);
      }
      // selection was set on pointerdown already, do nothing extra
    }
  }, [targets, selected, getSVGPt, getClosestPoly, applyMove]);

  if (!boardData) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text-muted)'}}>Loading board…</div>;

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      style={{ width:'100%', height:'100%', touchAction:'none', cursor:'default' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Polygons */}
      {Object.entries(boardData.allPolygons).map(([id, poly]) => {
        let d = `M ${poly.points[0][0]} ${poly.points[0][1]}`;
        for (let i=1;i<poly.points.length;i++) d += ` L ${poly.points[i][0]} ${poly.points[i][1]}`;
        d += ' Z';
        return (
          <path key={id} d={d}
            fill={getHexColor(poly.color)}
            stroke="var(--card-bg-solid)"
            strokeWidth="1"
            data-poly-id={id}
          />
        );
      })}

      {/* Red edges */}
      {Object.entries(boardData.allEdges||{}).map(([id, edge]) => {
        if (edge.color !== 'red' || !edge.sharedPoints) return null;
        return (
          <line key={id}
            x1={edge.sharedPoints[0][0]} y1={edge.sharedPoints[0][1]}
            x2={edge.sharedPoints[1][0]} y2={edge.sharedPoints[1][1]}
            stroke="#ef4444" strokeWidth="4" strokeLinecap="round"
          />
        );
      })}

      {/* Move target dots */}
      {targets.map(tKey => {
        const poly = boardData.allPolygons[tKey];
        if (!poly) return null;
        const [cx,cy] = poly.center;
        const occupant = pieces.find(p => p.pos === tKey);
        return occupant ? (
          <circle key={tKey} cx={cx} cy={cy} r="16"
            fill="rgba(239,68,68,0.35)" stroke="#ef4444" strokeWidth="2"
            style={{ pointerEvents:'none' }}
          />
        ) : (
          <circle key={tKey} cx={cx} cy={cy} r="5"
            fill="rgba(248,250,252,0.45)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"
            style={{ pointerEvents:'none' }}
          />
        );
      })}

      {/* Pieces */}
      {pieces.filter(p => p.pos !== 'returned').map(p => {
        const poly = boardData.allPolygons[p.pos];
        if (!poly) return null;
        const [cx,cy] = poly.center;
        const isDragging = dragRef.current.active && dragRef.current.pieceId === p.id;
        const tx = isDragging ? cx + dragRef.current.dx : cx;
        const ty = isDragging ? cy + dragRef.current.dy : cy;
        const isSelected = selected === p.id;
        const side = p.id.startsWith('white') ? 'white' : 'black';
        return (
          <g key={p.id}
            transform={`translate(${tx},${ty})`}
            style={{
              cursor: 'grab',
              touchAction: 'none',
              opacity: isDragging ? 0.7 : 1,
              filter: isSelected ? 'drop-shadow(0 0 6px rgba(70,176,212,0.9))' : 'none',
              transition: isDragging ? 'none' : 'filter 0.2s',
            }}
            data-piece-id={p.id}
            onPointerDown={e => handlePointerDown(e, p.id, cx, cy)}
          >
            <PieceSVG type={p.type} side={side} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main TutorialPage component ──────────────────────────────────────────────
const SECTIONS = ['intro','setup_phase','board','turn','goddess','heroe','mage','siren','ghoul','witch','soldier','minotaur','global_overview'];
const LANGUAGES = [
  { value:'en', label:'English' }, { value:'fr', label:'Français' },
  { value:'es', label:'Español' }, { value:'it', label:'Italiano' },
  { value:'de', label:'Deutsch' }, { value:'pt', label:'Português' },
  { value:'nl', label:'Nederlands' }, { value:'zh', label:'中文' },
  { value:'ja', label:'日本語' }, { value:'ko', label:'한국어' },
  { value:'hi', label:'हिन्दी' }, { value:'ta', label:'தமிழ்' },
  { value:'ar', label:'العربية' }, { value:'bn', label:'বাংলা' },
  { value:'ru', label:'Русский' }, { value:'ur', label:'اردو' },
  { value:'ms', label:'Bahasa Melayu' }, { value:'id', label:'Bahasa Indonesia' },
];

export default function TutorialPage() {
  const navigate = useNavigate();
  const [lang, setLang]             = useState('en');
  const [section, setSection]       = useState('intro');
  const [boardData, setBoardData]   = useState(null);
  const [pieces, setPieces]         = useState([]);

  // Fetch board.json once
  useEffect(() => {
    fetch('/api/boards/board')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBoardData(data); })
      .catch(e => console.error('Tutorial: board fetch failed', e));
  }, []);

  // Reset pieces when section changes
  useEffect(() => {
    const cfg = SECTION_PIECES[section];
    if (cfg === 'initial') setPieces([...INITIAL_SETUP_PIECES]);
    else if (cfg === 'full') setPieces(getFullBoardPieces());
    else setPieces(cfg ? [...cfg] : []);
  }, [section]);

  const t = translations[lang] || translations['en'];

  // RTL languages
  const rtl = ['ar','ur'].includes(lang);

  const content = t?.sections?.[section]?.content || '';
  const title   = t?.sections?.[section]?.title   || section;
  const menuT   = t?.menu || {};

  return (
    <div className="tut-layout" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Sidebar ── */}
      <aside className="tut-sidebar">
        <div className="tut-logo">Tutorial</div>

        {/* Language selector */}
        <div className="tut-lang-select">
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="tut-lang-dropdown"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Nav */}
        <nav>
          <ul className="tut-nav-list">
            {SECTIONS.map(s => (
              <li
                key={s}
                className={`tut-nav-item${section === s ? ' tut-nav-item--active' : ''}`}
                onClick={() => setSection(s)}
              >
                {menuT[s] || s}
              </li>
            ))}
          </ul>
        </nav>

        {/* Back to lobby */}
        <button className="tut-back-btn" onClick={() => navigate('/')}>
          ← Lobby
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="tut-main">
        <div className="tut-section-wrapper">
          {/* Text pane */}
          <div className="tut-text-pane">
            <h1 className="tut-title">{title}</h1>
            <div
              className="tut-content-body"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          {/* Visual / board pane */}
          <div className="tut-visual-pane">
            <div className="tut-board-container">
              <TutorialBoard
                boardData={boardData}
                pieces={pieces}
                setPieces={setPieces}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
