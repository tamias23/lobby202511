#!/bin/bash
set -euo pipefail

# Switch nd6-app to maintenance page.
# TO RESTORE: run ./deploy.sh

gcloud run services update nd6-app \
    --region europe-west1 \
    --image europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/maintenance:v0 \
    --min-instances 0 \
    --max-instances 1 \
    --cpu-throttling

# NOTE: Memorystore is NOT deleted — it's cheap to keep running and
# saves 3-5 minutes of reprovisioning on restore.
echo "=== Maintenance mode active. Run ./deploy.sh to restore. ==="

# gcloud memorystore instances delete nd6-backplane --location=europe-west1

