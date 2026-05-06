const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/api/boards', (req, res) => {
    const dirPath = req.query.path || '/home/mat/Bureau/lobby202511/games/data';
    try {
        if (!fs.existsSync(dirPath)) {
            return res.status(404).json({ error: 'Directory not found' });
        }
        const files = fs.readdirSync(dirPath)
            .filter(file => file.endsWith('.json'))
            .sort();
        res.json({ files, path: dirPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/board', (req, res) => {
    const dirPath = req.query.path;
    const fileName = req.query.file;
    if (!dirPath || !fileName) {
        return res.status(400).json({ error: 'Missing path or file' });
    }
    const filePath = path.join(dirPath, fileName);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const data = fs.readFileSync(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/delete', (req, res) => {
    const { dirPath, fileName } = req.body;
    if (!dirPath || !fileName) {
        return res.status(400).json({ error: 'Missing path or file' });
    }
    
    const sourcePath = path.join(dirPath, fileName);
    const deletedDir = path.join(dirPath, 'deleted');
    const destPath = path.join(deletedDir, fileName);

    try {
        if (!fs.existsSync(deletedDir)) {
            fs.mkdirSync(deletedDir, { recursive: true });
        }
        
        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        fs.renameSync(sourcePath, destPath);
        res.json({ success: true, message: `Moved ${fileName} to deleted/` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Board visualizer app listening at http://localhost:${port}`);
});
