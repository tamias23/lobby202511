#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./replay_games.sh <path_to_parquet_file>"
    exit 1
fi

PARQUET_FILE=$(realpath "$1")
cd rust

cargo run --bin replay -- "$PARQUET_FILE"
