#!/bin/bash

source ~/.nvm/nvm.sh && nvm use default

# Start the backend
cd ./backend
npm run dev &

# Go back up one level, then into the frontend
cd ../frontend
npm run dev &

# This keeps the script alive so you can stop both with Ctrl+C
wait
