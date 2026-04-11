#!/bin/bash
# Launch script for local development (no Vite server needed)
#
# PRE-REQUISITES (run once when Rust code changes):
#   cd bot-server && cargo build --release
#   cd backend  && npm run build:napi
#   cd frontend && npm run build:wasm
#   cd /home/mat/Bureau/lobby202511/new_main/bot-server && cargo build --release
#   cd /home/mat/Bureau/lobby202511/new_main/backend && npm run build:napi
#   cd /home/mat/Bureau/lobby202511/new_main/frontend && npm run build:wasm
# This script:
#   1. Builds the frontend static assets (fast, only JS/CSS)
#   2. Starts Bot Server B on port 5001
#   3. Starts Game Server A on port 4000 (which also serves the built frontend)

set -e

source ~/.nvm/nvm.sh && nvm use default

SCRIPT_DIR="/home/mat/Bureau/lobby202511/new_main"

# --- 0. Kill any leftover processes on our ports ---
echo "==> Clearing ports 4000 and 5001..."
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 5001/tcp 2>/dev/null || true
sleep 1

# --- 1. Build frontend static assets ---
echo "==> Building frontend..."
cd "${SCRIPT_DIR}/frontend"
npm run build

# --- 2. Start Bot Server (B) ---
echo "==> Starting Bot Server on port 5001..."
cd "${SCRIPT_DIR}/bot-server"
if [ ! -f "./target/release/bot-server" ]; then
    echo "ERROR: bot-server binary not found. Run: cd bot-server && cargo build --release"
    exit 1
fi
MODELS_DIR=./models PORT=5001 ORT_LOGGING_LEVEL=3 RUST_LOG=warn ./target/release/bot-server &
BOT_PID=$!

# --- 3. Start Game Server (A) --- (also serves the built frontend on port 4000)
echo "==> Starting Game Server on port 4000..."
cd "${SCRIPT_DIR}"
BOT_SERVER_URL=http://localhost:5001 node backend/src/index.js &
GAME_PID=$!

echo ""
echo "✅ All servers running:"
echo "   Frontend + Game: http://localhost:4000"
echo "   Bot Server:      http://localhost:5001/health"
echo ""
echo "Press Ctrl+C to stop all."

# Stop both servers cleanly on Ctrl+C
trap "kill $BOT_PID $GAME_PID 2>/dev/null; exit 0" INT TERM

wait

