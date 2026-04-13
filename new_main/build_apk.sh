#!/bin/bash
cd frontend
VITE_API_URL=https://dedalthegame.com npm run build
npx cap sync android
cd android
./gradlew assembleDebug
cd /home/mat/Bureau/lobby202511/new_main/frontend/android/app/build/outputs/apk/debug
