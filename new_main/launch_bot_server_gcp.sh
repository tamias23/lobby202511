#!/bin/bash
# Deploy Bot Server (Server B) to Google Cloud Run
# Run from: /home/mat/Bureau/lobby202511/

set -e

PROJECT="mylittleproject00"
REGION="europe-west1"
REGISTRY="europe-west1-docker.pkg.dev/${PROJECT}/my-artifact-registry"
IMAGE="${REGISTRY}/bot-server:v1"
SERVICE_NAME="nd6-bot-server"

echo "==> Building and pushing bot server image..."
gcloud builds submit . \
    --tag "${IMAGE}" \
    --dockerfile new_main/bot-server/Dockerfile

echo "==> Deploying Bot Server to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE}" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --min-instances 0 \
    --memory 1Gi \
    --cpu 2 \
    --port 8080 \
    --set-env-vars "MODELS_DIR=/app/models,RUST_LOG=info"

echo "==> Getting Bot Server URL..."
BOT_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region "${REGION}" \
    --format 'value(status.url)')

echo "Bot Server deployed at: ${BOT_URL}"
echo ""
echo "==> Updating Server A (nd6-app) with BOT_SERVER_URL..."
gcloud run services update nd6-app \
    --region "${REGION}" \
    --update-env-vars "BOT_SERVER_URL=${BOT_URL}"

echo ""
echo "✅ Done! Both servers updated."
echo "   Server A:   https://nd6-app.run.app (or your custom URL)"
echo "   Server B:   ${BOT_URL}"
