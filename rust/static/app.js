const ws = new WebSocket(`ws://${window.location.host}/ws`);

let svgCanvas = null;

ws.onmessage = (event) => {
    const boardState = JSON.parse(event.data);
    renderBoard(boardState);
};

ws.onclose = () => {
    console.log("WebSocket connection fully dissolved. Simulation ended or server disconnected.");
    document.querySelector("h1").innerText += " (Finished)";
};

function renderBoard(board) {
    const container = document.getElementById("game-container");
    
    // Initialize SVG canvas on first payload
    if (!svgCanvas) {
        svgCanvas = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        
        let width = board.width || 600;
        let height = board.height || 600;
        
        // Force the physical viewBox bounds
        svgCanvas.setAttribute("viewBox", `0 0 ${width} ${height}`);
        container.appendChild(svgCanvas);
    }
    
    // Render Color Picker UI Dashboard
    let ui = document.getElementById("color-picker-ui");
    if (!ui) {
        ui = document.createElement("div");
        ui.id = "color-picker-ui";
        ui.style.position = "absolute";
        ui.style.top = "20px";
        ui.style.left = "50%";
        ui.style.transform = "translateX(-50%)";
        ui.style.display = "flex";
        ui.style.gap = "15px";
        ui.style.padding = "10px 20px";
        ui.style.background = "#1e1e2f";
        ui.style.borderRadius = "8px";
        ui.style.boxShadow = "0 8px 16px rgba(0,0,0,0.5)";
        document.body.appendChild(ui);
    }
    
    let colors = [...new Set(Object.values(board.allPolygons).map(p => p.color))];
    colors.sort(); // Consistent display logic
    ui.innerHTML = colors.map(c => `
        <div style="width: 45px; height: 45px; background: ${c}; border-radius: 6px; border: 4px solid ${board.chosen_color === c ? (board.turn === 'white' ? 'white' : 'black') : 'transparent'}; opacity: ${board.chosen_color === c ? '1' : '0.2'}; transition: all 0.2s;"></div>
    `).join("");
    
    // Clear dynamic children but not the SVG
    svgCanvas.innerHTML = "";

    // Render underlying Polygons
    for (const polyKey in board.allPolygons) {
        const poly = board.allPolygons[polyKey];
        
        const polygonEl = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        
        // Connect points linearly
        const pointsString = poly.points.map(pt => `${pt[0]},${pt[1]}`).join(" ");
        polygonEl.setAttribute("points", pointsString);
        
        // Use polygon literal color if present
        polygonEl.setAttribute("fill", poly.color || "#e5e7eb");
        polygonEl.setAttribute("stroke", "#9ca3af");
        polygonEl.setAttribute("stroke-width", "1");
        
        svgCanvas.appendChild(polygonEl);
    }

    // Render transparent overlay logic if required (optional debug info)
    
    // Process Edge lines
    if (board.allEdges) {
        for (const edgeKey in board.allEdges) {
            const edge = board.allEdges[edgeKey];
            if (!edge.sharedPoints || edge.sharedPoints.length !== 2) continue;
            
            const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
            lineEl.setAttribute("x1", edge.sharedPoints[0][0]);
            lineEl.setAttribute("y1", edge.sharedPoints[0][1]);
            lineEl.setAttribute("x2", edge.sharedPoints[1][0]);
            lineEl.setAttribute("y2", edge.sharedPoints[1][1]);
            lineEl.setAttribute("stroke", edge.color || "black");
            lineEl.setAttribute("stroke-width", edge.color === "red" ? "3" : "1");
            
            svgCanvas.appendChild(lineEl);
        }
    }

    // Render dynamic Pieces atop everything
    let returnedCounters = { white: 0, black: 0 };
    for (const pieceKey in board.allPieces) {
        const piece = board.allPieces[pieceKey];
        let cx = 0, cy = 0;
        
        if (piece.position === "returned" || piece.position === "graveyard") {
            let side = piece.side || pieceKey.split("_")[0];
            if (side === "white") {
                cx = -70 - (returnedCounters.white % 3) * 30;
                cy = 100 + Math.floor(returnedCounters.white / 3) * 30;
                returnedCounters.white++;
            } else {
                cx = (board.width || 600) + 70 + (returnedCounters.black % 3) * 30;
                cy = 100 + Math.floor(returnedCounters.black / 3) * 30;
                returnedCounters.black++;
            }
        } else {
            const targetPoly = board.allPolygons[piece.position];
            if (!targetPoly) continue; 
            cx = targetPoly.center[0];
            cy = targetPoly.center[1];
        }
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const type = piece.type;
        const isBlack = (piece.side === "black"); // otherwise white

        let innerHTML = "";
        let scale = 1.0;
        let ox = 0, oy = 0; // offset centering 

        if (type === "berserker") {
            scale = 0.09;
            const fill = isBlack ? "black" : "white";
            const stroke = isBlack ? "black" : "black"; 
            
            for (let j = 0; j < 3; j++) {
                innerHTML += `<path d="M 0 0 A 10 25 0 0 1 110 110 Z" fill="${fill}" stroke="${stroke}" stroke-width="20" transform="rotate(${j * 120} 0 0)"></path>`;
            }
            if (isBlack) {
                // Add inner white contours for black berserkers
                for (let j = 0; j < 3; j++) {
                    innerHTML += `<path d="M 0 0 A 10 25 0 0 1 110 110 Z" fill="black" stroke="white" stroke-width="15" transform="rotate(${j * 120} 0 0) scale(0.5)"></path>`;
                }
            }
        } 
        else if (type === "soldier") {
            scale = 0.9;
            const fill = isBlack ? "black" : "white";
            const stroke1 = isBlack ? "black" : "white";
            const stroke2 = isBlack ? "black" : "black"; // White soldier outer stroke is black in original.
            innerHTML += `<ellipse cx="0" cy="0" rx="10" ry="10" fill="${fill}" stroke="${stroke1}" stroke-width="4"></ellipse>`;
            innerHTML += `<ellipse cx="0" cy="0" rx="12" ry="12" fill="none" stroke="${stroke2}" stroke-width="2"></ellipse>`;
        }
        else if (type === "goddess") {
            scale = 0.23;
            if (isBlack) {
                innerHTML += `<polygon points="0,-55 50,15 0,55 -50,15" fill="black" stroke="black" stroke-width="8"></polygon>`;
                innerHTML += `<polygon points="0,-15 20,10 0,20 -20,10" fill="black" stroke="white" stroke-width="4"></polygon>`;
            } else {
                innerHTML += `<polygon points="0,-55 50,15 0,55 -50,15" fill="white" stroke="black" stroke-width="8"></polygon>`;
                innerHTML += `<polygon points="0,-15 20,10 0,20 -20,10" fill="black" stroke="black" stroke-width="8"></polygon>`;
            }
        }
        else if (type === "bishop") {
            scale = 1.0;
            ox = -40; oy = -44; // Translate to center the points "40 32 30 50 50 50"
            const fill = isBlack ? "black" : "white";
            const stroke = isBlack ? "black" : "black";
            innerHTML += `<polygon points="40,32 30,50 50,50" fill="${fill}" stroke="${stroke}" stroke-width="2"></polygon>`;
        }
        else if (type === "heroe") {
            scale = 0.46;
            ox = -50; oy = -187; // Center
            const fill = isBlack ? "black" : "white";
            const stroke = isBlack ? "black" : "black";
            innerHTML += `<polygon points="50,165 55,180 70,180 60,190 65,205 50,195 35,205 40,190 30,180 45,180" fill="${fill}" stroke="${stroke}" stroke-width="3"></polygon>`;
        }
        else if (type === "mage") {
            scale = 0.040;
            ox = -255.77; oy = -221.5;
            if (isBlack) {
                // REVERT EXACTLY TO OLD BLACK MAGE LOGIC
                const stroke = "black";
                const rx = 80, ry = 80;
                let mini_fill = "black";
                
                innerHTML += `<polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01" fill="black" stroke="${stroke}" stroke-width="30"></polygon>`;

                innerHTML += `<ellipse cx="130.77" cy="438.01" rx="${rx}" ry="${ry}" fill="${mini_fill}" stroke="${stroke}" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="5.77" cy="221.50" rx="${rx}" ry="${ry}" fill="${mini_fill}" stroke="${stroke}" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="130.77" cy="5" rx="${rx}" ry="${ry}" fill="${mini_fill}" stroke="${stroke}" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="5" rx="${rx}" ry="${ry}" fill="${mini_fill}" stroke="${stroke}" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="505.77" cy="221.50" rx="${rx}" ry="${ry}" fill="${mini_fill}" stroke="${stroke}" stroke-width="10"></ellipse>`;
                innerHTML += `<ellipse cx="380.77" cy="438.01" rx="${rx}" ry="${ry}" fill="${mini_fill}" stroke="${stroke}" stroke-width="10"></ellipse>`;
                
                // Concentric center ellipses
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="80" ry="80" fill="none" stroke="white" stroke-width="30"></ellipse>`;
                innerHTML += `<ellipse cx="255.77" cy="221.5" rx="110" ry="110" fill="none" stroke="${stroke}" stroke-width="20"></ellipse>`;
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
        }
        else if (type === "siren") {
            scale = 0.8;
            const fill = isBlack ? "black" : "white";
            const stroke = isBlack ? "black" : "black";
            const points = Array.from({length: 6}, (_, idx) => {
                const angle = (Math.PI / 3) * idx;
                return `${14 * Math.cos(angle)},${14 * Math.sin(angle)}`;
            }).join(' ');

            if (isBlack) {
                innerHTML += `<ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" stroke-width="4"></ellipse>`;
                innerHTML += `<polygon points="${points}" fill="black" stroke="black" stroke-width="2"></polygon>`;
                for (const line of [[-8,8,-8,8], [-8,8,8,-8], [10,-10,0,0], [0,0,-10,10]]) {
                    innerHTML += `<line x1="${line[0]}" x2="${line[1]}" y1="${line[2]}" y2="${line[3]}" stroke="white" stroke-width="1"></line>`;
                }
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="white" stroke="white" stroke-width="11"></ellipse>`;
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="white" stroke="black" stroke-width="9"></ellipse>`;
            } else {
                innerHTML += `<ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" stroke-width="4"></ellipse>`;
                innerHTML += `<polygon points="${points}" fill="white" stroke="black" stroke-width="2"></polygon>`;
                for (const line of [[-8,8,-8,8], [-8,8,8,-8], [10,-10,0,0], [0,0,-10,10]]) {
                    innerHTML += `<line x1="${line[0]}" x2="${line[1]}" y1="${line[2]}" y2="${line[3]}" stroke="black" stroke-width="1"></line>`;
                }
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="black" stroke="black" stroke-width="11"></ellipse>`;
                innerHTML += `<ellipse cx="0" cy="0" rx="1" ry="1" fill="white" stroke="white" stroke-width="6"></ellipse>`;
            }
        }
        else if (type === "ghoul") {
            scale = 0.8;
            ox = -9.5; oy = -9.5; // Offset to center 19x19 box
            if (isBlack) {
                innerHTML += `<rect x="0" y="0" width="19" height="19" fill="black" stroke="black" stroke-width="2"></rect>`;
                innerHTML += `<rect x="7" y="7" width="5" height="5" fill="black" stroke="white" stroke-width="1"></rect>`;
            } else {
                innerHTML += `<rect x="0" y="0" width="19" height="19" fill="white" stroke="black" stroke-width="2"></rect>`;
            }
        }
        
        g.innerHTML = innerHTML;
        g.setAttribute("transform", `translate(${cx}, ${cy}) scale(${scale}) translate(${ox}, ${oy})`);
        
        svgCanvas.appendChild(g);
    }
}
