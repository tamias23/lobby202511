#!/bin/bash
# Launch script for local development.
#
# PRE-REQUISITES (run once when Rust code changes):
#   cd /home/mat/Bureau/lobby202511/new_main/bot-server && cargo build --release
#   cd /home/mat/Bureau/lobby202511/new_main/backend    && npm run build:napi
# This script:
#   1. Builds the Flutter web frontend (relative-URL mode, no API_URL baked in)
#      Output: frontend/build/web/  — served by the Game Server on port 4000
#   2. Starts Bot Server on port 5001
#   3. Starts Game Server on port 4000 (which also serves the built frontend)
#
# Valkey: Set VALKEY_ENABLED=true before running this script to enable
# the Valkey backplane for multi-instance sync testing.
# Example: VALKEY_ENABLED=true ./launch_back_and_front_and_bot.sh
# Requires a Valkey/Redis instance: podman run -d -p 6379:6379 valkey/valkey
# Without VALKEY_ENABLED=true, the server runs in single-instance mode.
# podman run -d \
#   --name local-valkey \
#   -p 6379:6379 \
#   docker.io/valkey/valkey:latest

set -euo

if podman container exists "local-valkey"; then
    echo "Container 'local-valkey' already exists. Ensuring it is started..."
    podman start "local-valkey"
else
    echo "Container 'local-valkey' does not exist. Creating and starting..."
    podman run -d \
      --name "local-valkey" \
      -p 6379:6379 \
      docker.io/valkey/valkey:latest
fi

if podman container exists "local-firestore"; then
    echo "Container 'local-firestore' already exists. Ensuring it is started..."
    podman start "local-firestore"
else
    echo "Container 'local-firestore' does not exist. Creating and starting..."
    podman run -d --name local-firestore \
      -p 8080:8080 \
      -e FIRESTORE_PROJECT_ID=my-local-firestore \
      docker.io/mtlynch/firestore-emulator
fi

source ~/.nvm/nvm.sh && nvm use default

SCRIPT_DIR="/home/mat/Bureau/lobby202511/new_main"

# --- 0. Kill any leftover processes on our ports ---
echo "==> Clearing ports 4000 and 5001..."
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 5001/tcp 2>/dev/null || true
sleep 1

# --- 1. Build Flutter web frontend ---
# API_URL is left empty so all requests use relative URLs — served by localhost:4000.
FLUTTER=/home/mat/Bureau/standalone/flutter_linux_3.41.7-stable/flutter/bin/flutter
BUILD_TIMESTAMP=$(date -u +%Y%m%dT%H%M%S)
echo "==> Building Flutter web frontend (relative URLs, timestamp: ${BUILD_TIMESTAMP})..."
cd "${SCRIPT_DIR}/frontend"
$FLUTTER build web --dart-define=API_URL= --dart-define=BUILD_TIMESTAMP=${BUILD_TIMESTAMP}

# Disable set -e for background processes (they run independently)
set +e

# --- 2. Start Bot Server ---
echo "==> Starting Bot Server on port 5001..."
cd "${SCRIPT_DIR}/bot-server"
if [ ! -f "./target/release/bot-server" ]; then
    echo "ERROR: bot-server binary not found. Run: cd bot-server && cargo build --release"
    exit 1
fi
MODELS_DIR=./models PORT=5001 ORT_LOGGING_LEVEL=3 RUST_LOG=warn ./target/release/bot-server &
BOT_PID=$!

# Wait for bot-server to be ready (up to 10 s)
echo "==> Waiting for Bot Server to be ready..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:5001/health > /dev/null 2>&1; then
        echo "   Bot Server is up."
        break
    fi
    sleep 0.5
done

# --- 3. Start Game Server (also serves the built frontend on port 4000) ---
echo "==> Starting Game Server on port 4000..."
cd "${SCRIPT_DIR}"
BOT_SERVER_URL=http://localhost:5001 VALKEY_ENABLED=${VALKEY_ENABLED:-true} FIRESTORE_EMULATOR_HOST=localhost:8080 FIRESTORE_PROJECT_ID=my-local-firestore node backend/src/index.js &
GAME_PID=$!

echo ""
echo "✅ All servers running:"
echo "   Frontend + Game: http://localhost:4000"
echo "   Bot Server:      http://localhost:5001/health"
echo ""
echo "Press Ctrl+C to stop all."

# Stop both servers cleanly on Ctrl+C / SIGTERM
cleanup() {
    echo ""
    echo "==> Shutting down..."
    kill $BOT_PID $GAME_PID 2>/dev/null || true
    wait $BOT_PID $GAME_PID 2>/dev/null || true
    echo "Done."
    exit 0
}
trap cleanup INT TERM

wait
