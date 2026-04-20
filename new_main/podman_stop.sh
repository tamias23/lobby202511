#!/bin/bash
# podman_stop.sh — Stop and remove all Dedal Podman containers.
#
# Usage:
#   ./podman_stop.sh           # Stop all services
#   ./podman_stop.sh --purge   # Stop all services AND delete volumes (Valkey data)
#
# Note: Firestore data and Parquet files are stored on host-mounted paths,
# not in Podman volumes, so they are preserved even with --purge.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.podman.yml"

PURGE=false
if [[ "${1:-}" == "--purge" ]]; then
    PURGE=true
fi

echo "==> Stopping Dedal services..."

# Ensure Podman socket is running (needed by docker-compose backend)
if ! systemctl --user is-active podman.socket &>/dev/null; then
    systemctl --user start podman.socket
fi

# Stop tunnel first (it's in a separate profile)
podman compose -f "$COMPOSE_FILE" --profile tunnel down 2>/dev/null || true

if $PURGE; then
    echo "==> Purging volumes (Valkey data)..."
    podman compose -f "$COMPOSE_FILE" down -v
else
    podman compose -f "$COMPOSE_FILE" down
fi

echo ""
echo "✅ All Dedal services stopped."
echo ""
echo "Persistent data preserved at:"
echo "    Firestore: /home/mat/Bureau/dedalthegame/firestore_db/"
echo "    Parquet:   /home/mat/Bureau/dedalthegame/parquet/"
if ! $PURGE; then
    echo "    Valkey:    (in podman volume 'valkey-data' — use --purge to delete)"
fi
