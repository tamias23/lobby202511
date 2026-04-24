#!/bin/bash
# deploy_maintenance.sh — Deploy maintenance page to Podman.
#
# Usage:
#   ./deploy_maintenance.sh                        # Local maintenance
#   ./deploy_maintenance.sh --tunnel --token TOKEN  # Maintenance + Cloudflare tunnel
#
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
TUNNEL=false
CF_TOKEN=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.podman.yml"
MAINT_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.maintenance.yml"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tunnel)
            TUNNEL=true; shift ;;
        --token)
            CF_TOKEN="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --tunnel           Enable Cloudflare tunnel"
            echo "  --token TOKEN      Cloudflare tunnel token (required with --tunnel)"
            echo "  -h, --help         Show this help"
            exit 0 ;;
        *)
            echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Validate ──────────────────────────────────────────────────────────────────
if $TUNNEL && [[ -z "$CF_TOKEN" ]]; then
    echo "ERROR: --tunnel requires --token YOUR_CF_TOKEN"
    exit 1
fi

echo "=== Dedal Maintenance Deploy (Podman) ==="
echo "    Tunnel:     ${TUNNEL}"
echo ""

# ── Ensure Podman socket is running (needed by podman-compose) ───────────────
if ! systemctl --user is-active podman.socket &>/dev/null; then
    echo "==> Starting Podman socket..."
    systemctl --user start podman.socket
fi

# Set DOCKER_HOST if not already set, helps podman-compose find the socket
if [[ -z "${DOCKER_HOST:-}" ]]; then
    export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
fi

# ── Stop main app ─────────────────────────────────────────────────────────────
if [[ -f "$MAIN_COMPOSE_FILE" ]]; then
    echo "==> Stopping main application..."
    podman compose -f "$MAIN_COMPOSE_FILE" down 2>/dev/null || true
fi

# Also stop any previous maintenance deployment
podman compose -f "$MAINT_COMPOSE_FILE" down 2>/dev/null || true

# ── Build maintenance image ───────────────────────────────────────────────────
echo "==> Building maintenance image..."
cd "${SCRIPT_DIR}/maintenance"
podman build -t dedal-maintenance:latest .

# ── Start maintenance ─────────────────────────────────────────────────────────
echo "==> Starting maintenance services..."
cd "${SCRIPT_DIR}"

COMPOSE_ARGS="-f $MAINT_COMPOSE_FILE"
if $TUNNEL; then
    # Verification hint (shows only first/last 6 chars)
    TOKEN_HINT="${CF_TOKEN:0:6}...${CF_TOKEN: -6}"
    echo "    Token:      $TOKEN_HINT"
    
    export CF_TUNNEL_TOKEN="$CF_TOKEN"
    COMPOSE_ARGS="$COMPOSE_ARGS --profile tunnel"
fi

# shellcheck disable=SC2086
podman compose $COMPOSE_ARGS up -d

echo ""
echo "=== Maintenance mode active ==="
echo "    Local:      http://localhost:8080"
if $TUNNEL; then
    echo "    Tunnel:     https://dedalthegame.com"
fi
echo ""
echo "To restore the application, run: ./deploy_to_podman.sh"
