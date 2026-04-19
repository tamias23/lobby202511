#!/bin/bash
# Build a debug APK with Flutter.
# PRE-REQUISITES (run once when Rust code changes):
#   cd /home/mat/Bureau/lobby202511/new_main/backend && npm run build:napi
# This script builds the Flutter APK (Android) directly — no Capacitor/Gradle step.
set -euo pipefail

FLUTTER=/home/mat/Bureau/standalone/flutter_linux_3.41.7-stable/flutter/bin/flutter
API_URL="https://dedalthegame.com"

cd /home/mat/Bureau/lobby202511/new_main/frontend

echo "==> Cleaning previous build..."
$FLUTTER clean

echo "==> Getting dependencies..."
$FLUTTER pub get

echo "==> Building Flutter APK (release) for $API_URL ..."
$FLUTTER build apk --release --dart-define=API_URL=$API_URL

APK=$(find build/app/outputs/flutter-apk/ -name "app-release.apk" 2>/dev/null | head -1)
if [ -z "$APK" ]; then
    echo "ERROR: APK not found. Check build output above."
    exit 1
fi

echo ""
echo "✅ APK built: $APK"
ls -lh "$APK"
