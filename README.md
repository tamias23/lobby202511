# Lobby202511

A sophisticated game evaluation and simulation platform designed to bridge high-performance Rust logic with a modern React/Node.js web ecosystem. The project enables the development, training, and real-time play of heuristic-based AI agents within a competitive multiplayer environment.

## Core Architecture

The platform centers around a shared game engine logic, ensuring perfect parity across different execution environments:

- **Shared Rust Core (`/new_main/rust-core`)**: The authoritative source of truth for game rules, available as:
    - **WebAssembly (Wasm)**: Enabling high-performance client-side simulations in the browser.
    - **Rust NAPI Bindings**: Providing the backend with direct access to the engine's speed and reliability.
- **Backend (`/new_main/backend`)**: A Node.js (Socket.io/Express) server orchestration layer.
- **Frontend (`/new_main/frontend`)**: A modern React application built with Vite, focused on responsive design and visual polish.

## Key Workstreams

### 1. Advanced Gaming Platform (`/new_main`)
A full-stack implementation featuring user onboarding, real-time ranked matchmaking, and live gameplay.

- **UI & Visualization**:
    - **Lobby 2.0**: A responsive, grid-based dashboard for game selection and player tracking.
    - **Analysis Room**: Dedicated interface for post-game review with board scaling and light grey UI panels for enhanced readability.
    - **Visual Polish**: Smooth CSS-based piece animations, dynamic board layouts, and multi-mode theme support (Light, Dark, Rain).
- **User Management & Database**:
    - **DuckDB**: Robust, high-speed storage for user profiles and match history using lazy connection handling and WAL-to-main check-pointing.
    - **Real-time Glicko-2 Ratings**: A dynamic matchmaking system using Glicko-2 (rating, deviation, volatility) that updates live after every competitive match.
- **Engine Safety**:
    - Integrated **Deadlock & Stuck Detection** ensures simulations and games exit gracefully if infinite loops are detected in complex game states.

### 2. AI & Bot Development (`/rust/src/agents`)
Developing and evolving agents that can handle the strategic depth of the game.

- **Quick Diego**: Our current flagship heuristic agent. It features:
    - **Priority Sorting**: Intelligent move selection based on piece importance.
    - **Strategic Deployment**: Prioritizes Mage-adjacent placements and Mage returns.
    - **Goddess Safety Failsafe**: A geometric evaluate-before-move check that prevents the Goddess from entering high-danger zones based on enemy proximity.
- **MCTS & Heuristics**: Integration of Monte Carlo Tree Search for advanced color-selection look-ahead and greedy heuristics for tactical optimization.

### 3. Training & Evaluation Pipeline
Orchestrating bot evolution through large-scale simulation.

- **Genetic Swiss Tournament**: Python-based scripts (`genetic_swiss_diego.py`) that evolve agents by pairing them in Swiss tournaments, ensuring robust performance evaluation across generations.
- **Data Analysis**: Headless batch simulations (`run_batch.sh`) export high-fidelity match data to Parquet files for deep-dive analysis using Polars and Pandas.

## Setup & Execution

### Rust Engine Simulations
```bash
# Run a batch of simulation games
./run_batch.sh [board_file] [n_games] [max_turns]

# Replay a specific game sequence from Parquet
./replay_games.sh <path_to_parquet_file>
```

### Full-Stack Platform
Refer to the READMEs in `/new_main/frontend` and `/new_main/backend` for specific development server instructions.
