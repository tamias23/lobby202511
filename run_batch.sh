#!/usr/bin/env bash
# Run a headless batch simulation from anywhere in the project.
# Usage: ./run_batch.sh [board_file] [n_games] [max_turns]

BOARD=${1:-nt40910230499995_9d1fea3a3ffd328529cb29bec8e47def_board.json}
N_GAMES=${2:-100}
MAX_TURNS=${3:-600}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOARD_PATH="$SCRIPT_DIR/games/data/$BOARD"
RUST_DIR="$SCRIPT_DIR/rust"

cd "$RUST_DIR" || { echo "Cannot find rust/ directory"; exit 1; }

cargo run --bin rust -- "$BOARD_PATH" --batch "$N_GAMES" --max-turns "$MAX_TURNS"
