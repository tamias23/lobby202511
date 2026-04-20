#!/bin/bash
set -euo pipefail

# ── Image tag: one timestamp shared by both images so they stay correlated ──
TAG=$(date -u +%Y%m%dT%H%M%S)
REGISTRY="europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry"
echo "=== Deploy tag: ${TAG} ==="

# gcloud storage buckets create gs://data-bucket-mylittleproject00 \
#     --location=europe-west1 \
#     --uniform-bucket-level-access

# gcloud memorystore instances create nd6-backplane \
#     --location=europe-west1 \
#     --node-type=shared-core-nano \
#     --shard-count=1 \
#     --replica-count=0 \
#     --engine-version=VALKEY_9_0 \
#     --endpoints='[{"connections": [{"pscAutoConnection": {"network": "projects/mylittleproject00/global/networks/default", "projectId": "mylittleproject00"}}]}]'
    
podman image prune

cd /home/mat/Bureau/lobby202511/rust && cargo build --release --bin rust 2>&1
cd /home/mat/Bureau/lobby202511/new_main/bot-server && cargo build --release
cd /home/mat/Bureau/lobby202511/new_main/backend && npm run build:napi
FLUTTER=/home/mat/Bureau/standalone/flutter_linux_3.41.7-stable/flutter/bin/flutter
cd /home/mat/Bureau/lobby202511/new_main/frontend && $FLUTTER build web --dart-define=API_URL=https://dedalthegame.com --dart-define=BUILD_TIMESTAMP=${TAG}

# ── Build & push nd6-app ──
cd /home/mat/Bureau/lobby202511/new_main
podman build --build-arg API_URL=https://dedalthegame.com --build-arg BUILD_TIMESTAMP=${TAG} -t node-docker06:${TAG} .
podman tag localhost/node-docker06:${TAG} ${REGISTRY}/nodejs6:${TAG}
podman push ${REGISTRY}/nodejs6:${TAG}

# cpu-throttling \
# --no-cpu-throttling \
# --min-instances 0 \
# --min-instances 1 \
# --session-affinity \
# --memory 1Gi \
# --cpu 1 \

gcloud run deploy nd6-app \
    --image ${REGISTRY}/nodejs6:${TAG} \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --timeout=3600 \
    --min-instances 1 \
    --max-instances 1 \
    --no-cpu-throttling \
    --concurrency 800 \
    --network default \
    --subnet default \
    --vpc-egress all-traffic \
    --add-volume=name=dedal-db,type=cloud-storage,bucket=data-bucket-mylittleproject00 \
    --add-volume-mount=volume=dedal-db,mount-path=/mnt/db \
    --env-vars-file backend/backend-config.yaml \
    --port 8080

# ── Build & push bot-server ──
cd /home/mat/Bureau/lobby202511/
podman build -t bot-server:${TAG} -f new_main/bot-server/Dockerfile .
podman tag localhost/bot-server:${TAG} ${REGISTRY}/bot-server:${TAG}
podman push ${REGISTRY}/bot-server:${TAG}

gcloud run deploy nd6-bot-server \
    --image ${REGISTRY}/bot-server:${TAG} \
    --platform managed \
    --region europe-west1 \
    --ingress internal \
    --timeout=3600 \
    --min-instances 1 \
    --max-instances 1 \
    --no-cpu-throttling \
    --port 8080 \
    --set-env-vars "MODELS_DIR=/app/models,RUST_LOG=warn"

sleep 5

BOT_URL=$(gcloud run services describe nd6-bot-server \
    --region europe-west1 \
    --format 'value(status.url)')
echo "Bot Server deployed at: ${BOT_URL}"

gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "BOT_SERVER_URL=${BOT_URL},FIRESTORE_PROJECT_ID=mylittleproject00"

sleep 5

# --- VALKEY (optional) ---
# If Memorystore for Valkey is provisioned, pass its IP:
VALKEY_IP=$(gcloud memorystore instances describe nd6-backplane \
    --location=europe-west1 \
    --format='value(endpoints[0].connections[0].pscAutoConnection.ipAddress)')
gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "VALKEY_HOST=${VALKEY_IP},VALKEY_PORT=6379"

echo "=== Deploy complete: tag ${TAG} ==="

