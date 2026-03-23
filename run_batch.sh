#!/usr/bin/env bash
# Run a headless batch simulation from anywhere in the project.
# Usage: ./run_batch.sh [board_file] [n_games] [max_turns]

BOARD=${1:-nt40910230499995_9d1fea3a3ffd328529cb29bec8e47def_board.json}
N_GAMES=${2:-30}
MAX_TURNS=${3:-200}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BOARD_PATH="$SCRIPT_DIR/games/data/$BOARD"
RUST_DIR="$SCRIPT_DIR/rust"

cd "$RUST_DIR" || { echo "Cannot find rust/ directory"; exit 1; }

# cargo run --bin rust -- "$BOARD_PATH" --batch "$N_GAMES" --max-turns "$MAX_TURNS"
cargo run --bin rust -- "$BOARD_PATH" --batch "$N_GAMES" --max-turns "$MAX_TURNS" \
  --white greedy_bob \
  --black greedy_bob \
  --greedy-weights-white "-5.599,-18.312,-5.675,4.231,-11.766,10.344,-13.96,-12.493,2.153,16.881,3.342,-19.278,10.333,12.427,18.815,-9.454,18.193,-15.975,3.21,-12.043,17.789,2.067,-2.232,2.119,-7.946,-2.993" \
  --greedy-weights-black "-6.225,-19.605,-11.096,-0.924,-7.244,8.348,-10.21,-13.914,6.621,13.479,18.904,-17.447,15.079,19.088,15.73,17.442,-17.124,12.013,-3.166,-1.364,19.634,16.456,-11.362,19.71,-8.278,-5.211" \
  --store-parquet /home/mat/Bureau/lobby202511/parquet

