let files = [];
let currentIndex = 0;
let currentPath = '';

const dirPathInput = document.getElementById('dirPath');
const loadBtn = document.getElementById('loadBtn');
const nextBtn = document.getElementById('nextBtn');
const deleteBtn = document.getElementById('deleteBtn');
const boardSvg = document.getElementById('board-svg');
const statusBadge = document.getElementById('status');
const filenameDisplay = document.getElementById('filename-display');
const currentIndexDisplay = document.getElementById('current-index');
const totalFilesDisplay = document.getElementById('total-files');
const toast = document.getElementById('toast');

async function loadDirectory() {
    currentPath = dirPathInput.value;
    statusBadge.textContent = 'Loading directory...';
    
    try {
        const response = await fetch(`/api/boards?path=${encodeURIComponent(currentPath)}`);
        const data = await response.json();
        
        if (data.error) {
            showToast(data.error, 'danger');
            statusBadge.textContent = 'Error';
            return;
        }
        
        files = data.files;
        currentIndex = 0;
        updateStats();
        
        if (files.length > 0) {
            loadBoard(files[0]);
            nextBtn.disabled = false;
            deleteBtn.disabled = false;
        } else {
            statusBadge.textContent = 'No JSON files found';
            filenameDisplay.textContent = 'Empty directory';
            boardSvg.innerHTML = '';
            nextBtn.disabled = true;
            deleteBtn.disabled = true;
        }
    } catch (err) {
        showToast('Failed to load directory', 'danger');
        statusBadge.textContent = 'Network Error';
    }
}

async function loadBoard(filename) {
    statusBadge.textContent = 'Loading board...';
    filenameDisplay.textContent = filename;
    
    try {
        const response = await fetch(`/api/board?path=${encodeURIComponent(currentPath)}&file=${encodeURIComponent(filename)}`);
        const data = await response.json();
        
        if (data.error) {
            showToast(data.error, 'danger');
            statusBadge.textContent = 'Error';
            return;
        }
        
        renderBoard(data);
        statusBadge.textContent = 'Ready';
    } catch (err) {
        showToast('Failed to load board', 'danger');
        statusBadge.textContent = 'Error';
    }
}

function renderBoard(data) {
    boardSvg.innerHTML = '';
    
    // Set viewBox if available in data
    if (data.width && data.height) {
        boardSvg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
    } else {
        boardSvg.setAttribute('viewBox', '0 0 410 410');
    }

    // Render Polygons
    if (data.allPolygons) {
        Object.values(data.allPolygons).forEach(poly => {
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const pointsStr = poly.points.map(p => p.join(',')).join(' ');
            polygon.setAttribute('points', pointsStr);
            polygon.setAttribute('fill', poly.color || 'grey');
            polygon.setAttribute('stroke', '#334155');
            polygon.setAttribute('stroke-width', '0.5');
            
            // Add a title for hover info
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = poly.name || poly.id;
            polygon.appendChild(title);
            
            boardSvg.appendChild(polygon);
        });
    }

    // Render Edges
    if (data.allEdges) {
        Object.values(data.allEdges).forEach(edge => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            if (edge.sharedPoints && edge.sharedPoints.length >= 2) {
                line.setAttribute('x1', edge.sharedPoints[0][0]);
                line.setAttribute('y1', edge.sharedPoints[0][1]);
                line.setAttribute('x2', edge.sharedPoints[1][0]);
                line.setAttribute('y2', edge.sharedPoints[1][1]);
                line.setAttribute('stroke', edge.color || 'black');
                line.setAttribute('stroke-width', edge.color === 'black' ? '1' : '2');
                boardSvg.appendChild(line);
            }
        });
    }
}

async function nextBoard() {
    if (files.length === 0) return;
    
    currentIndex = (currentIndex + 1) % files.length;
    updateStats();
    await loadBoard(files[currentIndex]);
}

async function deleteBoard() {
    if (files.length === 0) return;
    
    const filename = files[currentIndex];
    statusBadge.textContent = 'Deleting...';
    
    try {
        const response = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dirPath: currentPath, fileName: filename })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Moved ${filename} to deleted/`);
            files.splice(currentIndex, 1);
            
            if (files.length === 0) {
                currentIndex = 0;
                statusBadge.textContent = 'Empty';
                filenameDisplay.textContent = 'All boards processed';
                boardSvg.innerHTML = '';
                nextBtn.disabled = true;
                deleteBtn.disabled = true;
            } else {
                if (currentIndex >= files.length) {
                    currentIndex = 0;
                }
                loadBoard(files[currentIndex]);
            }
            updateStats();
        } else {
            showToast(data.error || 'Delete failed', 'danger');
            statusBadge.textContent = 'Error';
        }
    } catch (err) {
        showToast('Network error during delete', 'danger');
        statusBadge.textContent = 'Error';
    }
}

function updateStats() {
    currentIndexDisplay.textContent = files.length > 0 ? currentIndex + 1 : 0;
    totalFilesDisplay.textContent = files.length;
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.style.background = type === 'danger' ? 'var(--danger)' : 'var(--success)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Event Listeners
loadBtn.addEventListener('click', loadDirectory);
nextBtn.addEventListener('click', nextBoard);
deleteBtn.addEventListener('click', deleteBoard);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextBoard();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteBoard();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        currentIndex = (currentIndex - 1 + files.length) % files.length;
        updateStats();
        loadBoard(files[currentIndex]);
    }
});

// Initial load if path is present
if (dirPathInput.value) {
    loadDirectory();
}
