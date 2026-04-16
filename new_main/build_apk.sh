#!/bin/bash
set -euo pipefail

cd frontend
VITE_API_URL=https://dedalthegame.com npm run build
npx cap sync android
cd android
./gradlew assembleDebug
APK=/home/mat/Bureau/lobby202511/new_main/frontend/android/app/build/outputs/apk/debug/app-debug.apk
echo ""
echo "✅ APK built: $APK"
ls -lh "$APK"
