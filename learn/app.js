let currentLang = 'en';

const sections = {
    intro: {
        setup: (container) => renderBoard(container, [
            {id: 'white_goddess_0', type: 'goddess', pos: 'oH1'},
            {id: 'black_goddess_0', type: 'goddess', pos: 'bF1'}
        ], true)
    },
    setup_phase: {
        setup: (container) => renderBoard(container, getInitialSetupPieces(), true)
    },
    board: {
        setup: (container) => renderBoard(container, [], true)
    },
    turn: {
        setup: (container) => renderBoard(container, [], true)
    },
    goddess: {
        setup: (container) => renderBoard(container, [
            {id: 'white_goddess_0', type: 'goddess', pos: 'oH1'},
            {id: 'black_goddess_0', type: 'goddess', pos: 'yJ1'}
        ], true)
    },
    heroe: {
        setup: (container) => renderBoard(container, [
            // Heroes
            {id: 'white_heroe_0', type: 'heroe', pos: 'oH1'},
            {id: 'black_heroe_0', type: 'heroe', pos: 'yJ1'},
            // Ghouls
            {id: 'white_ghoul_0', type: 'ghoul', pos: 'bF1'},
            {id: 'black_ghoul_0', type: 'ghoul', pos: 'yI1'},
            // Soldiers
            {id: 'white_soldier_0', type: 'soldier', pos: 'gE2'},
            {id: 'white_soldier_1', type: 'soldier', pos: 'bH2'},
            {id: 'black_soldier_0', type: 'soldier', pos: 'gI2'},
            {id: 'black_soldier_1', type: 'soldier', pos: 'yJ2'},
            // Sirens
            {id: 'white_siren_0', type: 'siren', pos: 'oF1'},
            {id: 'black_siren_0', type: 'siren', pos: 'oJ1'},
            // Berserkers
            {id: 'white_berserker_0', type: 'berserker', pos: 'gH1'},
            {id: 'black_berserker_0', type: 'berserker', pos: 'gI1'},
        ], true)
    },
    mage: {
        setup: (container) => renderBoard(container, [
            {id: 'white_mage_0', type: 'mage', pos: 'oH1'},
            {id: 'black_mage_0', type: 'mage', pos: 'oE2'},
            // White ghouls — packed together (b-row cluster)
            {id: 'white_ghoul_0', type: 'ghoul', pos: 'bF1'},
            {id: 'white_ghoul_1', type: 'ghoul', pos: 'bF2'},
            {id: 'white_ghoul_2', type: 'ghoul', pos: 'bH1'},
            {id: 'white_ghoul_3', type: 'ghoul', pos: 'bH2'},
            // White soldiers — packed together (g-row cluster)
            {id: 'white_soldier_0', type: 'soldier', pos: 'gH1'},
            {id: 'white_soldier_1', type: 'soldier', pos: 'gH2'},
            {id: 'white_soldier_2', type: 'soldier', pos: 'oF1'},
            // Black ghouls — packed together (y-row cluster)
            {id: 'black_ghoul_0', type: 'ghoul', pos: 'yJ1'},
            {id: 'black_ghoul_1', type: 'ghoul', pos: 'yJ2'},
            {id: 'black_ghoul_2', type: 'ghoul', pos: 'gI1'},
            {id: 'black_ghoul_3', type: 'ghoul', pos: 'gI2'},
            // Black soldiers — packed together (g/o cluster)
            {id: 'black_soldier_0', type: 'soldier', pos: 'gK1'},
            {id: 'black_soldier_1', type: 'soldier', pos: 'gK2'},
            {id: 'black_soldier_2', type: 'soldier', pos: 'oK1'},
        ], true)
    },
    siren: {
        setup: (container) => renderBoard(container, [
            {id: 'white_siren_0', type: 'siren', pos: 'oH1'},
            {id: 'white_siren_1', type: 'siren', pos: 'gH1'},
            {id: 'white_siren_2', type: 'siren', pos: 'bF1'},
            {id: 'white_siren_3', type: 'siren', pos: 'bH2'},
            {id: 'black_siren_0', type: 'siren', pos: 'oK1'},
            {id: 'black_siren_1', type: 'siren', pos: 'gI1'},
            {id: 'black_siren_2', type: 'siren', pos: 'yJ1'},
            {id: 'black_siren_3', type: 'siren', pos: 'yI1'},
        ], true)
    },
    ghoul: {
        setup: (container) => renderBoard(container, [
            {id: 'white_ghoul_0', type: 'ghoul', pos: 'oH1'},
            {id: 'white_ghoul_1', type: 'ghoul', pos: 'bF1'},
            {id: 'white_ghoul_2', type: 'ghoul', pos: 'bH1'},
            {id: 'white_ghoul_3', type: 'ghoul', pos: 'gH2'},
            {id: 'black_ghoul_0', type: 'ghoul', pos: 'bF2'},
            {id: 'black_ghoul_1', type: 'ghoul', pos: 'yJ1'},
            {id: 'black_ghoul_2', type: 'ghoul', pos: 'gI1'},
            {id: 'black_ghoul_3', type: 'ghoul', pos: 'oJ1'},
        ], true)
    },
    soldier: {
        setup: (container) => renderBoard(container, [
            // White soldiers (7) — packed along left-centre
            {id: 'white_soldier_0', type: 'soldier', pos: 'oH1'},
            {id: 'white_soldier_1', type: 'soldier', pos: 'gH1'},
            {id: 'white_soldier_2', type: 'soldier', pos: 'gH2'},
            {id: 'white_soldier_3', type: 'soldier', pos: 'oF1'},
            {id: 'white_soldier_4', type: 'soldier', pos: 'bH1'},
            {id: 'white_soldier_5', type: 'soldier', pos: 'bH2'},
            {id: 'white_soldier_6', type: 'soldier', pos: 'bJ1'},
            // White berserker
            {id: 'white_berserker_0', type: 'berserker', pos: 'gJ1'},
            // Black soldiers (7) — packed along right-centre
            {id: 'black_soldier_0', type: 'soldier', pos: 'yJ1'},
            {id: 'black_soldier_1', type: 'soldier', pos: 'yI1'},
            {id: 'black_soldier_2', type: 'soldier', pos: 'yJ2'},
            {id: 'black_soldier_3', type: 'soldier', pos: 'oJ1'},
            {id: 'black_soldier_4', type: 'soldier', pos: 'gI1'},
            {id: 'black_soldier_5', type: 'soldier', pos: 'gI2'},
            {id: 'black_soldier_6', type: 'soldier', pos: 'gK1'},
            // Black berserker
            {id: 'black_berserker_0', type: 'berserker', pos: 'gK2'},
        ], true)
    },
    global_overview: {
        setup: (container) => renderBoard(container, getFullBoardPieces(), true)
    }
};

let boardData = null;
let currentPieces = [];
let selectedPieceId = null;
let highlightedTargets = [];
const NS = 'http://www.w3.org/2000/svg';

let dragState = {
    active: false,
    pieceId: null,
    el: null, // The innerG element being dragged
    startX: 0,
    startY: 0,
    origTransform: '',
    cx: 0,
    cy: 0
};

function getSVGPoint(e, svg) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

const Rules = {
    async getLegalMoves(piece, allPieces) {
        if (!piece || piece.pos === 'returned') return [];
        
        const side = piece.id.startsWith('white') ? 'white' : 'black';
        console.log('Fetching moves for:', piece.id, 'side:', side);
        
        try {
            const response = await fetch('/api/moves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boardJson: JSON.stringify(boardData),
                    piecesJson: JSON.stringify(allPieces.map(p => ({
                        id: p.id,
                        type: p.type,
                        side: p.id.startsWith('white') ? 'white' : 'black',
                        position: p.pos
                    }))),
                    pieceId: piece.id,
                    turn: side
                })
            });
            
            const result = await response.json();
            if (!response.ok) {
                console.error('API Error (moves):', result.error);
                return [];
            }
            console.log('Received targets:', result.targets);
            return result.targets || [];
        } catch (e) {
            console.error('Fetch error (moves):', e);
            return [];
        }
    },

    async applyMove(pieceId, targetPos, allPieces) {
        console.log('Applying move:', pieceId, '->', targetPos);
        try {
            const response = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boardJson: JSON.stringify(boardData),
                    piecesJson: JSON.stringify(allPieces.map(p => ({
                        id: p.id,
                        type: p.type,
                        side: p.id.startsWith('white') ? 'white' : 'black',
                        position: p.pos
                    }))),
                    pieceId: pieceId,
                    targetPoly: targetPos
                })
            });
            
            const result = await response.json();
            if (!response.ok) {
                console.error('API Error (apply):', result.error);
                return null;
            }
            return result; // { pieces_json, captured }
        } catch (e) {
            console.error('Fetch error (apply):', e);
            return null;
        }
    }
};

async function init() {
    try {
        const response = await fetch('./data/board.json');
        boardData = await response.json();
        
        setupLanguageSwitcher();
        updateMenuText();
        
        setupNavigation();
        loadSection('intro');
    } catch (err) {
        console.error("Failed to load board data:", err);
        document.getElementById('content-container').innerHTML = "<h1>Error loading board data.</h1>";
    }
}

function setupLanguageSwitcher() {
    const switcher = document.getElementById('language-switcher');
    if (switcher) {
        switcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            updateMenuText();
            
            // Reload current section to apply translations
            const activeItem = document.querySelector('#menu li.active');
            if (activeItem) {
                loadSection(activeItem.dataset.section);
            }
        });
    }
}

function updateMenuText() {
    const menuItems = document.querySelectorAll('#menu li');
    const langData = translations[currentLang].menu;
    menuItems.forEach(item => {
        const sectionId = item.dataset.section;
        if (langData[sectionId]) {
            item.textContent = langData[sectionId];
        }
    });
}

function setupNavigation() {
    const menuItems = document.querySelectorAll('#menu li');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.dataset.section);
        });
    });
}

function loadSection(sectionId) {
    const contentArea = document.getElementById('main-content');
    const container = document.getElementById('content-container');
    const section = sections[sectionId];
    const translation = translations[currentLang].sections[sectionId];

    contentArea.classList.remove('visible');

    setTimeout(() => {
        container.innerHTML = `
            <div class="section-wrapper">
                <div class="text-pane animate">
                    <h1>${translation.title}</h1>
                    ${translation.content}
                </div>
                <div class="visual-pane animate" style="animation-delay: 0.1s">
                    <div class="board-container"></div>
                </div>
            </div>
        `;
        
        selectedPieceId = null;
        highlightedTargets = [];
        
        const boardDiv = container.querySelector('.board-container');
        if (boardDiv && section.setup) {
            // section.setup(boardDiv) calls renderBoard initially
            section.setup(boardDiv);
        }

        contentArea.classList.add('visible');
    }, 300);
}

function renderBoard(container, pieces, isInitial = false) {
    if (!boardData) return;
    if (isInitial) currentPieces = JSON.parse(JSON.stringify(pieces));
    const activePieces = currentPieces;

    // Calculate Bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const key in boardData.allPolygons) {
        boardData.allPolygons[key].points.forEach(p => {
            minX = Math.min(minX, p[0]);
            minY = Math.min(minY, p[1]);
            maxX = Math.max(maxX, p[0]);
            maxY = Math.max(maxY, p[1]);
        });
    }

    const padding = 10;
    const width = (maxX - minX) + (padding * 2);
    const height = (maxY - minY) + (padding * 2);
    const vbX = minX - padding;
    const vbY = minY - padding;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `${vbX} ${vbY} ${width} ${height}`);
    
    const boardGroup = document.createElementNS(NS, "g");

    // Draw Polygons
    for (const key in boardData.allPolygons) {
        const poly = boardData.allPolygons[key];
        const pElement = document.createElementNS(NS, 'path');
        let d = 'M ' + poly.points[0][0] + ' ' +  poly.points[0][1];
        for (let i = 1; i < poly.points.length; i++){
            d += ' L ' + poly.points[i][0] + ' ' + poly.points[i][1];
        }
        d += ' Z';
        
        pElement.setAttribute("d", d);
        pElement.setAttribute("fill", getHexColor(poly.color));
        pElement.setAttribute("stroke", "#1e293b");
        pElement.setAttribute("stroke-width", "1");
        pElement.setAttribute("data-poly-id", key);
        
        boardGroup.appendChild(pElement);
    }

    // Draw Red Edges
    for (const key in boardData.allEdges) {
        const edge = boardData.allEdges[key];
        if (edge.color === 'red') {
            const line = document.createElementNS(NS, "line");
            line.setAttribute("x1", edge.sharedPoints[0][0]);
            line.setAttribute("y1", edge.sharedPoints[0][1]);
            line.setAttribute("x2", edge.sharedPoints[1][0]);
            line.setAttribute("y2", edge.sharedPoints[1][1]);
            line.setAttribute("stroke", "#ef4444");
            line.setAttribute("stroke-width", "4");
            line.setAttribute("stroke-linecap", "round");
            boardGroup.appendChild(line);
        }
    }

    // Draw Move Indicators
    highlightedTargets.forEach(targetKey => {
        const poly = boardData.allPolygons[targetKey];
        const occupant = currentPieces.find(p => p.pos === targetKey);
        
        const circle = document.createElementNS(NS, "circle");
        const [cx, cy] = poly.center;
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        
        if (occupant) {
            // Capture indicator
            circle.setAttribute("r", "16");
            circle.setAttribute("fill", "rgba(239, 68, 68, 0.4)");
            circle.setAttribute("stroke", "#ef4444");
            circle.setAttribute("stroke-width", "2");
        } else {
            // Move indicator
            circle.setAttribute("r", "5");
            circle.setAttribute("fill", "rgba(0, 0, 0, 0.4)");
            circle.setAttribute("stroke", "rgba(0, 0, 0, 0.2)");
        }
        circle.style.pointerEvents = 'none';
        boardGroup.appendChild(circle);
    });

    // Draw Pieces
    activePieces.forEach(p => {
        if (p.pos === 'returned') return;
        const poly = boardData.allPolygons[p.pos];
        if (!poly) return;

        const [cx, cy] = poly.center;
        const side = p.id.startsWith('white') ? 'white' : 'black';
        const isSelected = (selectedPieceId === p.id);
        const pieceG = drawPieceSVG(p.type, side, cx, cy, isSelected);
        
        pieceG.style.cursor = 'grab';
        pieceG.style.touchAction = 'none';
        
        pieceG.onpointerdown = (e) => {
            e.preventDefault();
            handlePointerDown(e, p.id, cx, cy, pieceG, svg, container);
        };
        
        boardGroup.appendChild(pieceG);
        pieceG.dataset.pieceId = p.id;
    });

    svg.appendChild(boardGroup);

    // Global drag listeners on SVG
    svg.onpointermove = (e) => handlePointerMove(e, svg);
    svg.onpointerup = (e) => handlePointerUp(e, svg, container);

    container.innerHTML = '';
    container.appendChild(svg);
}

async function onPieceClick(container, id) {
    if (selectedPieceId === id) {
        selectedPieceId = null;
        highlightedTargets = [];
    } else {
        selectedPieceId = id;
        const piece = currentPieces.find(p => p.id === id);
        highlightedTargets = await Rules.getLegalMoves(piece, currentPieces);
    }
    renderBoard(container, currentPieces);
}

function handlePointerDown(e, id, cx, cy, el, svg, container) {
    svg.setPointerCapture(e.pointerId);
    
    const pt = getSVGPoint(e, svg);
    
    dragState = {
        active: true,
        pieceId: id,
        el: el,
        startX: pt.x,
        startY: pt.y,
        cx: cx,
        cy: cy,
        moved: false,
        svg: svg,
        container: container
    };

    // Lift the piece to the top so it renders above all others
    el.parentElement.appendChild(el);

    el.style.opacity = '0.7';
    el.style.pointerEvents = 'none';
    svg.style.cursor = 'grabbing';

    // Fetch legal moves immediately so target circles appear during drag.
    // After re-render we re-attach dragState to the fresh DOM element.
    selectedPieceId = id;
    const piece = currentPieces.find(p => p.id === id);
    Rules.getLegalMoves(piece, currentPieces).then(targets => {
        if (!dragState.active || dragState.pieceId !== id) return; // drag already ended
        highlightedTargets = targets;
        // Snapshot where the mouse is in the OLD svg's coordinate space
        const currentSvgPt = getSVGPoint({ clientX: e.clientX, clientY: e.clientY }, svg);
        renderBoard(container, currentPieces);
        // renderBoard replaces the SVG; grab the new one
        const newSvg = container.querySelector('svg');
        if (!newSvg) return;
        // Re-capture pointer on the new SVG so move/up events keep firing
        try { newSvg.setPointerCapture(e.pointerId); } catch(_) {}
        dragState.svg = newSvg;
        // Find the fresh element for the dragged piece and re-attach drag
        const freshEl = newSvg.querySelector(`g[data-piece-id="${id}"]`);
        if (freshEl && dragState.active) {
            freshEl.style.opacity = '0.7';
            freshEl.style.pointerEvents = 'none';
            freshEl.parentElement.appendChild(freshEl); // lift to top
            dragState.el = freshEl;
            // Re-position it to where the mouse currently is
            const dx = currentSvgPt.x - dragState.startX;
            const dy = currentSvgPt.y - dragState.startY;
            freshEl.setAttribute('transform', `translate(${cx + dx}, ${cy + dy})`);
        }
    });
}

function handlePointerMove(e, svg) {
    if (!dragState.active) return;
    
    dragState.moved = true;
    const activeSvg = dragState.svg || svg;
    const pt = getSVGPoint(e, activeSvg);
    const dx = pt.x - dragState.startX;
    const dy = pt.y - dragState.startY;
    
    // Update transform
    dragState.el.setAttribute('transform', `translate(${dragState.cx + dx}, ${dragState.cy + dy})`);
}

function getClosestPolygon(pt) {
    let closest = null;
    let minDist = 1600; // Threshold (40 units squared)
    
    for (const key in boardData.allPolygons) {
        const poly = boardData.allPolygons[key];
        const dx = pt.x - poly.center[0];
        const dy = pt.y - poly.center[1];
        const d2 = dx * dx + dy * dy;
        
        if (d2 < minDist) {
            minDist = d2;
            closest = key;
        }
    }
    return closest;
}

async function handlePointerUp(e, svg, container) {
    if (!dragState.active) return;
    
    const { pieceId, el, moved, cx, cy } = dragState;
    const activeSvg = dragState.svg || svg;
    dragState.active = false;
    try { activeSvg.releasePointerCapture(e.pointerId); } catch(_) {}
    
    el.style.opacity = '1';
    el.style.pointerEvents = '';
    activeSvg.style.cursor = '';

    if (!moved) {
        // Pure click: snap back and handle selection
        el.setAttribute('transform', `translate(${cx}, ${cy})`);
        await onPieceClick(container, pieceId);
        return;
    }

    const pt = getSVGPoint(e, svg);
    const targetPoly = getClosestPolygon(pt);

    if (targetPoly && highlightedTargets.includes(targetPoly)) {
        console.log('Drop successful at:', targetPoly);
        // Update selection so onTargetClick knows which piece to move
        selectedPieceId = pieceId;
        await onTargetClick(container, targetPoly);
    } else {
        console.log('Invalid drop, snapping back');
        el.setAttribute('transform', `translate(${cx}, ${cy})`);
    }
}

async function onTargetClick(container, targetPos) {
    if (!selectedPieceId) return;

    console.log('Initiating move application to', targetPos);
    const result = await Rules.applyMove(selectedPieceId, targetPos, currentPieces);
    
    if (result) {
        console.log('Move successful, updating board');
        // Convert Rust internal piece structure back to tutorial style
        const newPieces = JSON.parse(result.piecesJson);
        currentPieces = newPieces.map(p => ({
            id: p.id,
            type: p.type.toLowerCase(),
            pos: p.position
        }));

        selectedPieceId = null;
        highlightedTargets = [];
        renderBoard(container, currentPieces);
    }
}

function drawPieceSVG(type, side, cx, cy, isSelected = false) {
    const isBlack = (side === "black");
    const fill = isBlack ? "black" : "white";
    const stroke = isBlack ? "black" : "black"; 
    
    let innerHTML = "";
    let scale = 1.0;
    let ox = 0, oy = 0;

    switch(type) {
        case "berserker":
            scale = 0.09;
            for (let j = 0; j < 3; j++) {
                innerHTML += `<path d="M 0 0 A 10 25 0 0 1 110 110 Z" fill="${fill}" stroke="${stroke}" stroke-width="20" transform="rotate(${j * 120} 0 0)"></path>`;
            }
            if (isBlack) {
                for (let j = 0; j < 3; j++) {
                    innerHTML += `<path d="M 0 0 A 10 25 0 0 1 110 110 Z" fill="black" stroke="white" stroke-width="15" transform="rotate(${j * 120} 0 0) scale(0.5)"></path>`;
                }
            }
            break;

        case "soldier":
            scale = 0.9;
            innerHTML += `<ellipse cx="0" cy="0" rx="10" ry="10" fill="${fill}" stroke="${isBlack ? 'black' : 'white'}" stroke-width="4"></ellipse>`;
            innerHTML += `<ellipse cx="0" cy="0" rx="12" ry="12" fill="none" stroke="black" stroke-width="2"></ellipse>`;
            break;

        case "goddess":
            scale = 0.23;
            if (isBlack) {
                innerHTML += `<polygon points="0,-55 50,15 0,55 -50,15" fill="black" stroke="black" stroke-width="8"></polygon>`;
                innerHTML += `<polygon points="0,-15 20,10 0,20 -20,10" fill="black" stroke="white" stroke-width="4"></polygon>`;
            } else {
                innerHTML += `<polygon points="0,-55 50,15 0,55 -50,15" fill="white" stroke="black" stroke-width="8"></polygon>`;
                innerHTML += `<polygon points="0,-15 20,10 0,20 -20,10" fill="black" stroke="black" stroke-width="8"></polygon>`;
            }
            break;

        case "bishop":
            scale = 1.0;
            ox = -40; oy = -44;
            innerHTML += `<polygon points="40,32 30,50 50,50" fill="${fill}" stroke="${stroke}" stroke-width="2"></polygon>`;
            break;

        case "heroe":
            scale = 0.46;
            ox = -50; oy = -187;
            innerHTML += `<polygon points="50,165 55,180 70,180 60,190 65,205 50,195 35,205 40,190 30,180 45,180" fill="${fill}" stroke="${stroke}" stroke-width="3"></polygon>`;
            break;

        case "mage":
            scale = 0.040;
            ox = -255.77; oy = -221.5;
            if (isBlack) {
                const rx = 80, ry = 80;
                innerHTML += `<polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01" fill="black" stroke="black" stroke-width="30"></polygon>`;
                innerHTML += `<ellipse cx="130.77" cy="438.01" rx="${rx}" ry="${ry}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="5.77" cy="221.50" rx="${rx}" ry="${ry}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="130.77" cy="5" rx="${rx}" ry="${ry}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="5" rx="${rx}" ry="${ry}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="505.77" cy="221.50" rx="${rx}" ry="${ry}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="438.01" rx="${rx}" ry="${ry}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="80" ry="80" fill="none" stroke="white" stroke-width="30"></ellipse>`;
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="110" ry="110" fill="none" stroke="black" stroke-width="20"></ellipse>`;
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="white" stroke-width="30"></ellipse>`;
            } else {
                const rx_line = 80, ry_line = 80;
                innerHTML += `<ellipse cx="130.77" cy="438.01" rx="${rx_line}" ry="${ry_line}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="5.77" cy="221.50" rx="${rx_line}" ry="${ry_line}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="130.77" cy="5" rx="${rx_line}" ry="${ry_line}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="5" rx="${rx_line}" ry="${ry_line}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="505.77" cy="221.50" rx="${rx_line}" ry="${ry_line}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="438.01" rx="${rx_line}" ry="${ry_line}" fill="black" stroke="black" stroke-width="10"></ellipse>`;
                innerHTML += `<polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01" fill="white" stroke="black" stroke-width="35"></polygon>`;
                const rx = 40, ry = 40;
                innerHTML += `<ellipse cx="130.77" cy="438.01" rx="${rx}" ry="${ry}" fill="white" stroke="white" stroke-width="1"></ellipse>`;
                innerHTML += `<ellipse cx="5.77" cy="221.50" rx="${rx}" ry="${ry}" fill="white" stroke="white" stroke-width="1"></ellipse>`;
                innerHTML += `<ellipse cx="130.77" cy="5" rx="${rx}" ry="${ry}" fill="white" stroke="white" stroke-width="1"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="5" rx="${rx}" ry="${ry}" fill="white" stroke="white" stroke-width="1"></ellipse>`;
                innerHTML += `<ellipse cx="505.77" cy="221.50" rx="${rx}" ry="${ry}" fill="white" stroke="white" stroke-width="1"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="438.01" rx="${rx}" ry="${ry}" fill="white" stroke="white" stroke-width="1"></ellipse>`;
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="80" ry="80" fill="none" stroke="black" stroke-width="35"></ellipse>`;
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="black" stroke-width="35"></ellipse>`;
            }
            break;

        case "siren":
            scale = 0.8;
            const pts = Array.from({length: 6}, (_, idx) => {
                const angle = (Math.PI / 3) * idx;
                return `${14 * Math.cos(angle)},${14 * Math.sin(angle)}`;
            }).join(' ');
            if (isBlack) {
                innerHTML += `<ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" stroke-width="4"></ellipse>`;
                innerHTML += `<polygon points="${pts}" fill="black" stroke="black" stroke-width="2"></polygon>`;
                for (const line of [[-8,8,-8,8], [-8,8,8,-8], [10,-10,0,0], [0,0,-10,10]]) {
                    innerHTML += `<line x1="${line[0]}" x2="${line[1]}" y1="${line[2]}" y2="${line[3]}" stroke="white" stroke-width="1"></line>`;
                }
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="white" stroke="white" stroke-width="11"></ellipse>`;
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="white" stroke="black" stroke-width="9"></ellipse>`;
            } else {
                innerHTML += `<ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" stroke-width="4"></ellipse>`;
                innerHTML += `<polygon points="${pts}" fill="white" stroke="black" stroke-width="2"></polygon>`;
                for (const line of [[-8,8,-8,8], [-8,8,8,-8], [10,-10,0,0], [0,0,-10,10]]) {
                    innerHTML += `<line x1="${line[0]}" x2="${line[1]}" y1="${line[2]}" y2="${line[3]}" stroke="black" stroke-width="1"></line>`;
                }
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="black" stroke="black" stroke-width="11"></ellipse>`;
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="white" stroke="white" stroke-width="6"></ellipse>`;
            }
            break;

        case "ghoul":
            scale = 0.8;
            ox = -9.5; oy = -9.5;
            if (isBlack) {
                innerHTML += `<rect x="0" y="0" width="19" height="19" fill="black" stroke="black" stroke-width="2"></rect>`;
                innerHTML += `<rect x="7" y="7" width="5" height="5" fill="black" stroke="white" stroke-width="1"></rect>`;
            } else {
                innerHTML += `<rect x="0" y="0" width="19" height="19" fill="white" stroke="black" stroke-width="2"></rect>`;
            }
            break;
    }

    const g = document.createElementNS(NS, "g");
    g.setAttribute("transform", `translate(${cx}, ${cy})`);
    
    const innerG = document.createElementNS(NS, "g");
    innerG.setAttribute("transform", `scale(${scale}) translate(${ox}, ${oy})`);
    innerG.innerHTML = innerHTML;
    
    g.appendChild(innerG);
    return g;
}

function getHexColor(colorName) {
    const colors = {
        'orange': '#f97316',
        'blue': '#3b82f6',
        'green': '#22c55e',
        'grey': '#64748b',
        'red': '#ef4444',
        'black': '#1e293b'
    };
    return colors[colorName.toLowerCase()] || '#ccc';
}

function getInitialSetupPieces() {
    return [
        {id: 'white_goddess_0', type: 'goddess', pos: 'oH1'},
        {id: 'white_heroe_0', type: 'heroe', pos: 'bH2'},
        {id: 'white_heroe_1', type: 'heroe', pos: 'gE2'},
        {id: 'white_berserker_0', type: 'berserker', pos: 'bF1'},
        {id: 'white_berserker_1', type: 'berserker', pos: 'gI1'},
        {id: 'black_goddess_0', type: 'goddess', pos: 'oK1'},
        {id: 'black_heroe_0', type: 'heroe', pos: 'yJ1'},
        {id: 'black_heroe_1', type: 'heroe', pos: 'yE2'},
        {id: 'black_berserker_0', type: 'berserker', pos: 'gI2'},
        {id: 'black_berserker_1', type: 'berserker', pos: 'gE1'}
    ];
}

function getFullBoardPieces() {
    const pieces = getInitialSetupPieces();
    
    // Add ghouls and sirens using valid IDs
    const extraPositions = [
        'gC2', 'gK1', 'yE1', 'yJ2', 'yC2', 'yL1', 'oF1', 'oJ1', 'oE1', 'oK2', 
        'oN1', 'oB2', 'yF1', 'yH2', 'yF2', 'yH1', 'gK2', 'gC1', 'gG2', 'gH1'
    ];

    extraPositions.forEach((pos, i) => {
        const type = i % 2 === 0 ? 'ghoul' : 'siren';
        const side = i < 10 ? 'white' : 'black';
        pieces.push({id: `${side}_${type}_${i}`, type: type, pos: pos});
    });

    // Add some bishops
    pieces.push({id: 'white_bishop_0', type: 'bishop', pos: 'gH2'});
    pieces.push({id: 'white_bishop_1', type: 'bishop', pos: 'gG1'});
    pieces.push({id: 'black_bishop_0', type: 'bishop', pos: 'yI1'});
    pieces.push({id: 'black_bishop_1', type: 'bishop', pos: 'yG1'});
    
    return pieces;
}

window.onload = init;
