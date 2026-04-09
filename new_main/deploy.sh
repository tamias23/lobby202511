#!/bin/bash
# set -e
set -euo pipefail

# gcloud storage buckets create gs://data-bucket-mylittleproject00 \
#     --location=europe-west1 \
#     --uniform-bucket-level-access

podman image prune

cd /home/mat/Bureau/lobby202511/rust && cargo build --release --bin rust 2>&1
cd /home/mat/Bureau/lobby202511/new_main/bot-server && cargo build --release
cd /home/mat/Bureau/lobby202511/new_main/backend && npm run build:napi
cd /home/mat/Bureau/lobby202511/new_main/frontend && npm run build:wasm

cd /home/mat/Bureau/lobby202511/new_main
podman build -t node-docker06:latest .
podman tag localhost/node-docker06:latest europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/nodejs6:v1
podman push europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/nodejs6:v1

gcloud run deploy nd6-app \
    --image europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/nodejs6:v1 \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --max-instances 1 \
    --add-volume=name=dedal-db,type=cloud-storage,bucket=data-bucket-mylittleproject00 \
    --add-volume-mount=volume=dedal-db,mount-path=/mnt/db \
    --set-env-vars "APP_URL=https://nd6-app-836760916240.europe-west1.run.app,EMAIL_SERVICE=gmail,EMAIL_USER=cbk.001.2026@gmail.com,EMAIL_PASS=notw sisf imgw fhdp" \
    --port 8080 &

cd /home/mat/Bureau/lobby202511/
podman build -t bot-server:v1 -f new_main/bot-server/Dockerfile .

podman tag localhost/bot-server:v1 europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/bot-server:v1
podman push europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/bot-server:v1

gcloud run deploy nd6-bot-server \
    --image europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/bot-server:v1 \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 1 \
    --memory 1Gi \
    --cpu 2 \
    --port 8080 \
    --set-env-vars "MODELS_DIR=/app/models,RUST_LOG=info"

sleep 5

BOT_URL=$(gcloud run services describe nd6-bot-server \
    --region europe-west1 \
    --format 'value(status.url)')
echo "Bot Server deployed at: ${BOT_URL}"

gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "BOT_SERVER_URL=${BOT_URL}"

