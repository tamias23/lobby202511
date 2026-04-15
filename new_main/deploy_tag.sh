#!/bin/bash
set -euo pipefail

# TAG=$(date -u +%Y%m%dT%H%M%S)
TAG='20260412T125200'
REGISTRY="europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry"
echo "=== Deploy tag: ${TAG} ==="

# gcloud storage buckets create gs://data-bucket-mylittleproject00 \
#     --location=europe-west1 \
#     --uniform-bucket-level-access

# cpu-throttling \
# --no-cpu-throttling \
# --min-instances 0 \
# --min-instances 1 \

gcloud run deploy nd6-app \
    --image ${REGISTRY}/nodejs6:${TAG} \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 1 \
    --cpu-throttling \
    --add-volume=name=dedal-db,type=cloud-storage,bucket=data-bucket-mylittleproject00 \
    --add-volume-mount=volume=dedal-db,mount-path=/mnt/db \
    --env-vars-file backend/backend-config.yaml \
    --port 8080

gcloud run deploy nd6-bot-server \
    --image ${REGISTRY}/bot-server:${TAG} \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 1 \
    --cpu-throttling \
    --memory 1Gi \
    --cpu 2 \
    --port 8080 \
    --set-env-vars "MODELS_DIR=/app/models,RUST_LOG=warn"

sleep 5

BOT_URL=$(gcloud run services describe nd6-bot-server \
    --region europe-west1 \
    --format 'value(status.url)')
echo "Bot Server deployed at: ${BOT_URL}"

gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "BOT_SERVER_URL=${BOT_URL},DB_PATH=/tmp/db"

echo "=== Deploy complete: tag ${TAG} ==="

