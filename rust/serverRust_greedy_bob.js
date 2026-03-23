const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Automatically grab a random board from the games/data directory
const dataDir = path.join(__dirname, '..', 'games', 'data');
let files = [];
try {
    files = fs.readdirSync(dataDir).filter(f => f.endsWith('_board.json'));
} catch (e) {
    console.error("Could not read directory: " + dataDir);
    process.exit(1);
}

if (files.length === 0) {
    console.error("No board JSON files found in " + dataDir);
    process.exit(1);
}

const randomFile = files[Math.floor(Math.random() * files.length)];
const boardPath = path.join(dataDir, randomFile);

// Configure delay via CLI argument or default to 1300ms
const delay = process.argv[2] || "200";
const maxTurns = process.argv[3] || "600";

console.log('==============================================');
console.log('🚀 Launching Native Rust Backend Simulator...');
console.log('🧠 Loading Agent: Greedy Bob (Self-Play Sequence)');
console.log(`📂 Selected Board: ${randomFile}`);
console.log(`⏱️  Tick Delay: ${delay}ms`);
console.log(`♾️  Max Turns: ${maxTurns}`);
console.log('==============================================');

const rustProcess = spawn('cargo', ['run', '--bin', 'rust', '--', boardPath, '--delay', delay, '--max-turns', maxTurns, '--white', 'greedy_bob', '--black', 'greedy_bob'], {
    cwd: __dirname,
    stdio: 'inherit'
});

rustProcess.on('close', (code) => {
    console.log(`Rust simulator exited with code ${code}`);
});
