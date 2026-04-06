const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8081;
const BOARDS_DIR = path.join(__dirname, 'boards');

app.use(express.json());

// Main Viewer HTML
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Board Viewer & Manager</title>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            background: #1a1a1a; 
            color: #eee; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 20px;
            margin: 0;
        }
        .header { display: flex; gap: 20px; align-items: center; margin-bottom: 20px; width: 100%; max-width: 800px; }
        .stats { flex: 1; font-size: 1.2rem; }
        .controls { display: flex; gap: 10px; }
        button { 
            padding: 10px 20px; 
            font-size: 1rem; 
            cursor: pointer; 
            border: none; 
            border-radius: 5px; 
            transition: all 0.2s;
            font-weight: bold;
        }
        .btn-next { background: #3498db; color: white; }
        .btn-next:hover { background: #2980b9; }
        .btn-delete { background: #e74c3c; color: white; }
        .btn-delete:hover { background: #c0392b; }
        
        #board-container {
            width: 800px;
            height: 800px;
            background: #222;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
        }
        svg { width: 100%; height: 100%; }
        .filename { margin-top: 10px; font-family: monospace; color: #888; }
        .loading { font-size: 2rem; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="stats" id="stats">Loading boards...</div>
        <div class="controls">
            <button class="btn-next" onclick="nextBoard()">Next Board</button>
            <button class="btn-delete" onclick="deleteBoard()">DELETE Board</button>
        </div>
    </div>
    
    <div id="board-container">
        <div class="loading">Select a board to begin</div>
    </div>
    
    <div class="filename" id="filename">---</div>

    <script>
        let boards = [];
        let currentIndex = -1;

        async function init() {
            const resp = await fetch('/api/boards');
            boards = await resp.json();
            if (boards.length > 0) {
                currentIndex = 0;
                loadBoard();
            } else {
                document.getElementById('stats').innerText = "No boards found in " + BOARDS_DIR;
            }
        }

        async function loadBoard() {
            if (currentIndex < 0 || currentIndex >= boards.length) return;
            const name = boards[currentIndex];
            document.getElementById('filename').innerText = name;
            document.getElementById('stats').innerText = \`Board \${currentIndex + 1} / \${boards.length}\`;
            
            const resp = await fetch(\`/api/board/\${encodeURIComponent(name)}\`);
            const data = await resp.json();
            renderSVG(data);
        }

        function renderSVG(data) {
            const container = document.getElementById('board-container');
            const polygons = Object.values(data.allPolygons || {});
            
            let html = \`<svg viewBox="0 0 420 420" preserveAspectRatio="xMidYMid meet">\`;
            polygons.forEach(p => {
                const points = p.points.map(pt => pt.join(',')).join(' ');
                html += \`<polygon points="\${points}" fill="\${p.color}" stroke="#333" stroke-width="0.5" />\`;
            });
            html += \`</svg>\`;
            container.innerHTML = html;
        }

        function nextBoard() {
            if (boards.length === 0) return;
            currentIndex = (currentIndex + 1) % boards.length;
            loadBoard();
        }

        async function deleteBoard() {
            if (currentIndex < 0) return;
            const name = boards[currentIndex];
            if (!confirm(\`Are you sure you want to PERMANENTLY delete \${name}?\`)) return;

            const resp = await fetch(\`/api/board/\${encodeURIComponent(name)}\`, { method: 'DELETE' });
            if (resp.ok) {
                boards.splice(currentIndex, 1);
                if (boards.length === 0) {
                    document.getElementById('board-container').innerHTML = '<div class="loading">All boards deleted</div>';
                    document.getElementById('stats').innerText = "0 / 0";
                    document.getElementById('filename').innerText = "---";
                } else {
                    if (currentIndex >= boards.length) currentIndex = 0;
                    loadBoard();
                }
            } else {
                alert("Failed to delete board");
            }
        }

        init();
        
        // Key listener for fast browsing
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') nextBoard();
            if (e.key === 'Delete' || e.key === 'd') deleteBoard();
        });
    </script>
</body>
</html>
    `);
});

// API Routes
app.get('/api/boards', (req, res) => {
    fs.readdir(BOARDS_DIR, (err, files) => {
        if (err) return res.status(500).send(err);
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
        res.json(jsonFiles);
    });
});

app.get('/api/board/:name', (req, res) => {
    const filePath = path.join(BOARDS_DIR, req.params.name);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.json(JSON.parse(data));
    });
});

app.delete('/api/board/:name', (req, res) => {
    const filePath = path.join(BOARDS_DIR, req.params.name);
    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).send(err);
        console.log(`Deleted file: ${filePath}`);
        res.sendStatus(200);
    });
});

app.listen(PORT, () => {
    console.log(`Board Viewer running at http://localhost:${PORT}`);
    console.log(`Inspecting directory: ${BOARDS_DIR}`);
});
