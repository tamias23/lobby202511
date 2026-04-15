#!/bin/bash
set -euo pipefail

gcloud run deploy nd6-app \
--image europe-west1-docker.pkg.dev/mylittleproject00/my-artifact-registry/maintenance:v0 \
--min-instances 0 \
--max-instances 1 \
--cpu-throttling \
--region europe-west1

