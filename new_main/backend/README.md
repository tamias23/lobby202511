# Lobby Backend

The authoritative Node.js server for the Lobby platform, handling matchmaking, user authentication, and game state management.

## Tech Stack

- **Node.js & Express**: Core API and routing.
- **Socket.io**: Real-time communication for game events and matchmaking.
- **DuckDB**: Embedded high-speed analytical database for users and match history.
- **Rust NAPI**: Shared game logic engine integrated via Node-API bindings.
- **BCrypt**: Secure password hashing.

## Getting Started

### Prerequisites

- **Node.js**: (v18+ recommended)
- **Rust**: Only required if building the game engine bindings (`rust-napi`) from source.

### Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configuration**:
    Copy `.env.example` to `.env` and fill in your details (especially for email verification):
    ```bash
    cp .env.example .env
    ```

3.  **Build Engine Bindings**:
    If you haven't built the shared Rust engine bindings yet:
    ```bash
    npm run build:napi
    ```

4.  **Start the Server**:
    ```bash
    npm run dev
    ```
    The server typically starts on port `4000` (configured in `.env`).

## Database Management

The server uses two DuckDB files located in the `db/` directory:
- `users.duckdb`: Stores user profiles, credentials, and Glicko-2 ratings.
- `games.duckdb`: Stores full match histories and moves.

The connection logic follows a **Lazy/Idle pattern**: connections are opened on-demand and closed after 30 seconds of inactivity to release locks and allow WAL checkpoints.

## Key Scripts

- `npm run dev`: Start the Express server using Node.
- `npm run build:napi`: Compile the Rust source in `/new_main/backend/rust-napi/` into a `.node` binary for high-speed server-side game simulation.
