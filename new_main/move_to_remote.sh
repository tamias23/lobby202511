#!/bin/bash
# move_to_remote.sh — Push locally-built images to a remote server and deploy.
#
# This script is meant to be used AFTER a local build with deploy_to_podman.sh.
# It transfers the images, config files, and starts the application with
# Cloudflare tunnel on the remote host.
#
# Usage:
#   ./move_to_remote.sh mat@192.168.1.XX --token YOUR_CF_TOKEN
#   ./move_to_remote.sh mat@192.168.1.XX --token TOKEN --tag 20260429T1200
#   ./move_to_remote.sh mat@192.168.1.XX --token TOKEN --replicas 4
#   ./move_to_remote.sh mat@192.168.1.XX --token TOKEN --tag latest
#
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
REMOTE=""
CF_TOKEN=""
TAG=""
REPLICAS=3
APP_URL="https://dedalthegame.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.podman.yml"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --token)
            CF_TOKEN="$2"; shift 2 ;;
        --tag)
            TAG="$2"; shift 2 ;;
        --replicas)
            REPLICAS="$2"; shift 2 ;;
        --app-url)
            APP_URL="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 USER@HOST --token CF_TOKEN [OPTIONS]"
            echo ""
            echo "Push locally-built images to a remote server and deploy with Cloudflare tunnel."
            echo ""
            echo "Arguments:"
            echo "  USER@HOST          Remote host (e.g. mat@192.168.1.42)"
            echo ""
            echo "Options:"
            echo "  --token TOKEN      Cloudflare tunnel token (required)"
            echo "  --tag TAG          Image tag to deploy (default: interactive selection)"
            echo "  --replicas N       Number of nd6-app replicas (default: 3)"
            echo "  --app-url URL      Public app URL (default: https://dedalthegame.com)"
            echo "  -h, --help         Show this help"
            exit 0 ;;
        -*)
            echo "Unknown option: $1"; exit 1 ;;
        *)
            # Positional argument = remote host
            if [[ -z "$REMOTE" ]]; then
                REMOTE="$1"; shift
            else
                echo "ERROR: Unexpected argument: $1"; exit 1
            fi
            ;;
    esac
done

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ -z "$REMOTE" ]]; then
    echo "ERROR: Remote host is required."
    echo "Usage: $0 USER@HOST --token CF_TOKEN [OPTIONS]"
    exit 1
fi

if [[ -z "$CF_TOKEN" ]]; then
    echo "ERROR: --token is required (Cloudflare tunnel token)."
    exit 1
fi

# ── Ensure SSH key auth ──────────────────────────────────────────────────────
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$REMOTE" true 2>/dev/null; then
    echo "⚠️  SSH key authentication is not set up for $REMOTE."
    echo "   You will be prompted for a password on every SSH/SCP command."
    echo ""
    echo "   To fix this (one-time setup):"
    echo "     1. Generate a key (if you don't have one):  ssh-keygen -t ed25519"
    echo "     2. Copy it to the remote:                   ssh-copy-id $REMOTE"
    echo ""
    read -p "   Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Point the docker-compose external provider at the Podman socket (local side).
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"

# ── Select tag ────────────────────────────────────────────────────────────────
if [[ -z "$TAG" ]]; then
    echo ""
    echo "Available local nd6-app image tags:"
    echo "────────────────────────────────────"

    # Collect tags into an array (exclude <none>)
    mapfile -t TAGS < <(
        podman images --format '{{.Tag}}' localhost/node-docker06 \
            | grep -v '<none>' \
            | sort -r
    )

    if [[ ${#TAGS[@]} -eq 0 ]]; then
        echo "ERROR: No local nd6-app images found. Run deploy_to_podman.sh first."
        exit 1
    fi

    for i in "${!TAGS[@]}"; do
        # Show creation date for context
        CREATED=$(podman images --format '{{.CreatedSince}}' "localhost/node-docker06:${TAGS[$i]}" 2>/dev/null | head -1)
        printf "  [%d]  %-25s (%s)\n" "$((i+1))" "${TAGS[$i]}" "${CREATED}"
    done

    echo ""
    read -p "Select tag [1]: " SELECTION
    SELECTION=${SELECTION:-1}

    if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || (( SELECTION < 1 || SELECTION > ${#TAGS[@]} )); then
        echo "ERROR: Invalid selection."
        exit 1
    fi

    TAG="${TAGS[$((SELECTION-1))]}"
fi

# ── Verify images exist locally ──────────────────────────────────────────────
echo ""
for img in node-docker06 bot-server; do
    if ! podman image exists "localhost/${img}:${TAG}"; then
        echo "ERROR: Image localhost/${img}:${TAG} not found locally."
        echo "       Available tags:"
        podman images --format '  {{.Tag}}  ({{.CreatedSince}})' "localhost/${img}" | grep -v '<none>'
        exit 1
    fi
done

REMOTE_IP=$(echo "$REMOTE" | cut -d@ -f2)

echo "=== Move to Remote ==="
echo "    Remote:    ${REMOTE}"
echo "    Tag:       ${TAG}"
echo "    Replicas:  ${REPLICAS}"
echo "    Tunnel:    https://dedalthegame.com"
echo ""

# ── Ensure remote directories ────────────────────────────────────────────────
echo "==> [1/6] Preparing remote host..."
ssh "$REMOTE" "mkdir -p ~/dedal-deploy /home/mat/Bureau/dedalthegame/PSQL /home/mat/Bureau/dedalthegame/parquet"

# Ensure Podman socket is running on remote, then point docker-compose at it
ssh "$REMOTE" "systemctl --user start podman.socket 2>/dev/null || true"

# ── Transfer images ──────────────────────────────────────────────────────────
echo "==> [2/6] Transferring nd6-app image (this may take a minute)..."
podman save "localhost/node-docker06:${TAG}" | pv | ssh "$REMOTE" "podman load"

echo "==> [3/6] Transferring bot-server image..."
podman save "localhost/bot-server:${TAG}" | pv | ssh "$REMOTE" "podman load"

# Tag as latest on remote
ssh "$REMOTE" "podman tag localhost/node-docker06:${TAG} localhost/node-docker06:latest"
ssh "$REMOTE" "podman tag localhost/bot-server:${TAG} localhost/bot-server:latest"

# ── Transfer config files ────────────────────────────────────────────────────
echo "==> [4/6] Transferring compose and config files..."
scp "$COMPOSE_FILE" "${SCRIPT_DIR}/nginx-podman.conf" "${REMOTE}:~/dedal-deploy/"
scp "${SCRIPT_DIR}/podman_stop.sh" "${REMOTE}:~/dedal-deploy/"

# ── Deploy ────────────────────────────────────────────────────────────────────
echo "==> [5/6] Starting services on remote..."
# DOCKER_HOST makes the docker-compose external provider use the podman socket
REMOTE_ENV="DOCKER_HOST=unix:///run/user/\$(id -u)/podman/podman.sock TAG=${TAG} APP_URL=${APP_URL}"

# Stop existing deployment
ssh "$REMOTE" "cd ~/dedal-deploy && ${REMOTE_ENV} podman compose -f docker-compose.podman.yml --profile tunnel down 2>/dev/null || true"
ssh "$REMOTE" "cd ~/dedal-deploy && ${REMOTE_ENV} podman compose -f docker-compose.podman.yml down 2>/dev/null || true"

# Start all services + Cloudflare tunnel in one command.
# Using two separate `up` calls caused the second one to reset --scale back to 1.
ssh "$REMOTE" "cd ~/dedal-deploy && CF_TUNNEL_TOKEN='${CF_TOKEN}' ${REMOTE_ENV} podman compose -f docker-compose.podman.yml --profile tunnel up -d --scale nd6-app=${REPLICAS}"

# ── Health check ──────────────────────────────────────────────────────────────
echo ""
echo "==> [6/6] Waiting for remote services..."
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
echo "=== Deploy complete ==="
echo "    App:        http://${REMOTE_IP}:8080"
echo "    Tunnel:     https://dedalthegame.com"
echo "    Tag:        ${TAG}"
echo "    Replicas:   ${REPLICAS} nd6-app instances"
echo ""
echo "Useful commands:"
echo "    ssh ${REMOTE} 'cd ~/dedal-deploy && podman compose -f docker-compose.podman.yml ps'"
echo "    ssh ${REMOTE} 'cd ~/dedal-deploy && podman compose -f docker-compose.podman.yml logs -f nd6-app'"
echo "    ssh ${REMOTE} 'cd ~/dedal-deploy && podman compose -f docker-compose.podman.yml logs -f bot-server'"
echo "    ssh ${REMOTE} '~/dedal-deploy/podman_stop.sh'"
