# Lobby202511

This project consists of two primary workstreams exploring game simulation and logic through different technologies: **Rust** and **JavaScript**.

## Workstreams

### 1. Rust (`/rust`)
The Rust workstream is focused on high-performance execution, headless batch simulations, and the core game logic engine.
- Contains the primary logic for running rapid simulations, evaluating heuristic-based agents (like `greedy_bob`), and exporting match data to Parquet files for analysis.
- Includes specific binaries for running large simulation batches (`cargo run --bin rust`) and parsing/replaying game data (`cargo run --bin replay`).

### 2. JavaScript (`/javascript`)
The JavaScript workstream is focused on the frontend, visualization, and Node-based server infrastructure. 
- Contains the web frontend components (`index2.html`) and Node.js servers (e.g., `serverD.js`).
- Utilized for visually inspecting game board states, manually verifying game rules, testing with Jest, and providing an interactive environment.

### 3. Unified Game Platform (`/new_main`)
A modern monorepo that integrates the full game lifecycle from user onboarding and ranked matchmaking to real-time gameplay.

- **Architecture**:
    - **Frontend (`/new_main/frontend`)**: A React-based web application built with **Vite**. It uses the shared game engine compiled to **WebAssembly (Wasm)** for high-performance client-side simulation.
    - **Backend (`/new_main/backend`)**: A **Node.js** server using **Express** and **Socket.io**. It provides authoritative game state management by leveraging the same game logic through **Rust NAPI** bindings.
    - **Database**: Employs **DuckDB** (via `@duckdb/node-api`) for high-speed user data and match history management.
- **Key Features**:
    - **Secure Onboarding**: Complete user registration with email verification and session-based login.
    - **Lobby & Matchmaking**: Real-time ranked matchmaking system that pairs players by skill rating.
    - **Gameplay HUD**: A sophisticated, multi-column responsive interface featuring live game statistics (turn/move counts), action buttons (Flip Board, Random Setup), and customizable themes (Light, Dark, and a special **Rain** mode).
    - **Engine Consistency**: By sharing common code in `/new_main/rust-core`, the platform ensures perfect rule parity across the client and server.

## Utility Scripts

The root directory contains bash scripts to quickly orchestrate Rust simulations:

- **`run_batch.sh`**: Runs a headless batch simulation from anywhere in the project. It targets the Rust binary to execute a specified number of games using `greedy_bob` AI agents with specific weights. Results are exported to the `parquet/` directory.
  - *Usage*: `./run_batch.sh [board_file] [n_games] [max_turns]`

- **`replay_games.sh`**: A helper script to replay a saved game sequence from a Parquet file. It navigates to the Rust directory and executes the `replay` binary to parse and process the specific match records.
  - *Usage*: `./replay_games.sh <path_to_parquet_file>`

## Python Scripts

- **`genetic_bob.py`**: A program for evaluating and evolving custom AI agents (`greedy_bob`) through a genetic algorithm, pairing them randomly in parallel matches. It iteratively culls underperformers and generates new generations to discover optimal agent parameters.
- **`genetic_swiss_bob.py`**: An advanced version of the genetic algorithm that pairs agents using a Swiss tournament system with Buchholz tie-breaks, providing a more robust measure of agent performance during the evolutionary process.
- **`letsTakeALook.py`**: A helper data science script that reads generated Parquet match logs using Polars and exports data samples into an Excel spreadsheet with Pandas for manual review.
