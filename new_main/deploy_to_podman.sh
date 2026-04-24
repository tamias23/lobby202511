#!/bin/bash
# deploy_to_podman.sh — Build and deploy Dedal to Podman (local or remote).
#
# Usage:
#   ./deploy_to_podman.sh                                           # Local, 5 replicas
#   ./deploy_to_podman.sh --replicas 3                              # Local, 3 replicas
#   ./deploy_to_podman.sh --tunnel --token YOUR_CF_TOKEN            # Local + Cloudflare tunnel
#   ./deploy_to_podman.sh --remote mat@192.168.1.XX                 # Deploy to spare laptop
#   ./deploy_to_podman.sh --remote mat@192.168.1.XX --replicas 4 --tunnel --token TOKEN
#   ./deploy_to_podman.sh --skip-build                              # Skip build, just (re)deploy
#   ./deploy_to_podman.sh --api-url https://dedalthegame.com        # Custom API_URL for Flutter
#
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
REPLICAS=3
REMOTE=""
TUNNEL=false
CF_TOKEN=""
API_URL=""
SKIP_BUILD=false
TAG=$(date -u +%Y%m%dT%H%M%S)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.podman.yml"
FLUTTER="/home/mat/Bureau/standalone/flutter_linux_3.41.7-stable/flutter/bin/flutter"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --replicas)
            REPLICAS="$2"; shift 2 ;;
        --remote)
            REMOTE="$2"; shift 2 ;;
        --tunnel)
            TUNNEL=true; shift ;;
        --token)
            CF_TOKEN="$2"; shift 2 ;;
        --api-url)
            API_URL="$2"; shift 2 ;;
        --skip-build)
            SKIP_BUILD=true; shift ;;
        --tag)
            TAG="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --replicas N       Number of nd6-app replicas (default: 5)"
            echo "  --remote USER@IP   Deploy to a remote machine via SSH"
            echo "  --tunnel           Enable Cloudflare tunnel"
            echo "  --token TOKEN      Cloudflare tunnel token (required with --tunnel)"
            echo "  --api-url URL      API URL for Flutter build (default: auto-detect)"
            echo "  --skip-build       Skip building images, just (re)deploy containers"
            echo "  --tag TAG          Image tag (default: timestamp)"
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

echo "=== Dedal Podman Deploy ==="
echo "    Tag:       ${TAG}"
echo "    Replicas:  ${REPLICAS}"
echo "    Remote:    ${REMOTE:-local}"
echo "    Tunnel:    ${TUNNEL}"
echo ""

# ── Ensure Podman socket is running (needed by docker-compose backend) ────────
if ! systemctl --user is-active podman.socket &>/dev/null; then
    echo "==> Starting Podman socket..."
    systemctl --user start podman.socket
fi

# ── Ensure data directories exist ────────────────────────────────────────────
mkdir -p /home/mat/Bureau/dedalthegame/PSQL
mkdir -p /home/mat/Bureau/dedalthegame/parquet


if [[ -n "$REMOTE" ]]; then
    echo "==> Ensuring data directories on remote host..."
    ssh "$REMOTE" "mkdir -p /home/mat/Bureau/dedalthegame/PSQL /home/mat/Bureau/dedalthegame/parquet ~/dedal-deploy"
fi

# ── Build phase ───────────────────────────────────────────────────────────────
if ! $SKIP_BUILD; then
    echo "==> [1/5] Building Rust NAPI module..."
    cd "${REPO_ROOT}/rust" && cargo build --release --bin rust 2>&1
    cd "${SCRIPT_DIR}/backend" && npm run build:napi

    echo "==> [2/5] Building Bot Server..."
    cd "${SCRIPT_DIR}/bot-server" && cargo build --release

    echo "==> [3/5] Building Flutter web frontend (inside Docker)..."
    # Determine API_URL for Flutter build
    if [[ -n "$API_URL" ]]; then
        FLUTTER_API_URL="$API_URL"
    elif $TUNNEL; then
        FLUTTER_API_URL="https://dedalthegame.com"
    else
        FLUTTER_API_URL=""  # Relative URLs for local access
    fi
    echo "    API_URL=${FLUTTER_API_URL:-'(empty — relative URLs)'}"

    echo "==> [4/5] Building nd6-app container image..."
    cd "${SCRIPT_DIR}"
    podman build \
        --build-arg API_URL="${FLUTTER_API_URL}" \
        --build-arg BUILD_TIMESTAMP="${TAG}" \
        -t node-docker06:${TAG} .
    podman tag localhost/node-docker06:${TAG} localhost/node-docker06:latest

    echo "==> [5/5] Building bot-server container image..."
    cd "${REPO_ROOT}"
    podman build -t bot-server:${TAG} -f new_main/bot-server/Dockerfile .
    podman tag localhost/bot-server:${TAG} localhost/bot-server:latest

    echo "==> Images built successfully."
    podman images | grep -E "(node-docker06|bot-server)" | head -6
else
    echo "==> Skipping build (--skip-build)."
fi

# ── Deploy ────────────────────────────────────────────────────────────────────

# Prepare environment for compose
export TAG
export APP_URL="${API_URL:-https://dedalthegame.com}"

if [[ -z "$REMOTE" ]]; then
    # ── Local deploy ──────────────────────────────────────────────────────
    echo ""
    echo "==> Deploying locally..."

    # Stop any existing deployment
    cd "${SCRIPT_DIR}"
    podman compose -f "$COMPOSE_FILE" down 2>/dev/null || true

    # Start services (including tunnel profile if requested)
    COMPOSE_ARGS="-f \"$COMPOSE_FILE\""
    if $TUNNEL; then
        echo "==> Starting with Cloudflare tunnel..."
        export CF_TUNNEL_TOKEN="$CF_TOKEN"
        COMPOSE_ARGS="$COMPOSE_ARGS --profile tunnel"
    fi
    eval podman compose $COMPOSE_ARGS up -d --scale nd6-app=${REPLICAS}


    echo ""
    echo "==> Waiting for services to be ready..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:8080 > /dev/null 2>&1; then
            echo "   ✅ Services are up!"
            break
        fi
        if [[ $i -eq 30 ]]; then
            echo "   ⚠️  Timeout waiting for services. Check logs with:"
            echo "      podman compose -f docker-compose.podman.yml logs"
        fi
        sleep 2
    done

    echo ""
    echo "=== Deploy complete ==="
    echo "    App:        http://localhost:8080"
    if $TUNNEL; then
        echo "    Tunnel:     https://dedalthegame.com"
    fi
    echo "    Replicas:   ${REPLICAS} nd6-app instances"
    echo ""
    echo "Useful commands:"
    echo "    podman compose -f docker-compose.podman.yml ps"
    echo "    podman compose -f docker-compose.podman.yml logs -f nd6-app"
    echo "    podman compose -f docker-compose.podman.yml logs -f bot-server"
    echo "    ./podman_stop.sh"

else
    # ── Remote deploy ─────────────────────────────────────────────────────
    echo ""
    echo "==> Deploying to remote host: ${REMOTE}..."

    echo "==> [R1] Transferring nd6-app image..."
    podman save localhost/node-docker06:${TAG} | ssh "$REMOTE" "podman load"

    echo "==> [R2] Transferring bot-server image..."
    podman save localhost/bot-server:${TAG} | ssh "$REMOTE" "podman load"

    # Tag as latest on remote
    ssh "$REMOTE" "podman tag localhost/node-docker06:${TAG} localhost/node-docker06:latest"
    ssh "$REMOTE" "podman tag localhost/bot-server:${TAG} localhost/bot-server:latest"

    echo "==> [R3] Transferring compose and config files..."
    scp "$COMPOSE_FILE" "${SCRIPT_DIR}/nginx-podman.conf" "${REMOTE}:~/dedal-deploy/"

    # Also send the stop script
    scp "${SCRIPT_DIR}/podman_stop.sh" "${REMOTE}:~/dedal-deploy/"

    echo "==> [R4] Starting services on remote..."
    # Build the environment string for remote
    REMOTE_ENV="TAG=${TAG} APP_URL=${APP_URL}"

    ssh "$REMOTE" "cd ~/dedal-deploy && ${REMOTE_ENV} podman compose -f docker-compose.podman.yml down 2>/dev/null || true"
    ssh "$REMOTE" "cd ~/dedal-deploy && ${REMOTE_ENV} podman compose -f docker-compose.podman.yml up -d --scale nd6-app=${REPLICAS}"

    if $TUNNEL; then
        echo "==> Starting Cloudflare tunnel on remote..."
        ssh "$REMOTE" "cd ~/dedal-deploy && CF_TUNNEL_TOKEN='${CF_TOKEN}' ${REMOTE_ENV} podman compose -f docker-compose.podman.yml --profile tunnel up -d"
    fi

    echo ""
    echo "==> Waiting for remote services..."
    REMOTE_IP=$(echo "$REMOTE" | cut -d@ -f2)
    for i in $(seq 1 30); do
        if ssh "$REMOTE" "curl -sf http://localhost:8080 > /dev/null 2>&1"; then
            echo "   ✅ Remote services are up!"
            break
        fi
        if [[ $i -eq 30 ]]; then
            echo "   ⚠️  Timeout. Check logs on remote:"
            echo "      ssh ${REMOTE} 'cd ~/dedal-deploy && podman compose -f docker-compose.podman.yml logs'"
        fi
        sleep 2
    done

    echo ""
    echo "=== Remote deploy complete ==="
    echo "    App:        http://${REMOTE_IP}:8080"
    if $TUNNEL; then
        echo "    Tunnel:     https://dedalthegame.com"
    fi
    echo "    Replicas:   ${REPLICAS} nd6-app instances"
    echo ""
    echo "Useful commands:"
    echo "    ssh ${REMOTE} 'cd ~/dedal-deploy && podman compose -f docker-compose.podman.yml ps'"
    echo "    ssh ${REMOTE} 'cd ~/dedal-deploy && podman compose -f docker-compose.podman.yml logs -f nd6-app'"
    echo "    ssh ${REMOTE} '~/dedal-deploy/podman_stop.sh'"
fi
