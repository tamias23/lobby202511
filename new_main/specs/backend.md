# Backend Specification

The backend is an authoritative Node.js server designed for high-concurrency real-time gameplay and analytical data storage.

## Core Components

### 1. Express & Socket.io Server
The server entry point (`src/index.js`) manages:
- **Middleware**: JSON parsing, CORS, and request logging.
- **Socket Rooms**: Each game has a dedicated room (`game_[hash]`) for event isolation.
- **Matchmaking Queue**: Aggregates `gameRequests` from all instances via Valkey sync.

### 2. Rust NAPI Integration
Heavy game logic is offloaded to the Rust engine via `@napi-rs/cli` generated bindings. Key exported functions include:
- `getLegalMovesNapi`: Calculates valid targets for a piece.
- `applyMoveNapi`: Mutates the game state and handles captures/AoE.
- `initGameStateNapi`: Bootstraps a new game with selected board and pieces.

### 3. Database Layer (DuckDB)
The project uses **DuckDB** as an embedded analytical engine.
- **Persistence**: Database files are stored in `backend/db/` and synchronized to Google Cloud Storage (GCS) periodically.
- **Lazy Connection Strategy**: 
  - Connections are opened only when a query is made.
  - An idle timer (30s) closes connections and performs a `CHECKPOINT` to flush the Write-Ahead Log (WAL).
  - This ensures data integrity even if the container is killed.

### 4. Distributed State Synchronization (`valkeySync.js`)
To support horizontal scaling, instances replicate state using Valkey (Redis-compatible):
- **Events**: `game:created`, `game:updated`, `game:deleted`, `request:created`, `request:removed`.
- **Flow**: Local mutation -> `valkeySync.syncX()` -> Publish to `nd6:sync` -> Other instances update local memory replicas.
- **Locking**: `tryLockRequest(requestId)` uses `SET NX EX` to prevent double-acceptance of game requests.

## Configuration (`backend-config.yaml`)

The server is configured via a YAML file mapped to environment variables.

| Key | Description | Default |
| :--- | :--- | :--- |
| `LOG_LEVEL` | Verbosity (error, warn, info, debug) | `info` |
| `APP_URL` | Root domain for links (e.g., email verification) | `dedalthegame.com` |
| `VALKEY_ENABLED` | Toggle for multi-instance scaling | `false` |
| `JWT_SECRET` | Secret for HS256 signing of tokens | (Managed) |
| `BOT_SERVER_URL` | Endpoint for the Rust Bot Server | `http://localhost:5001` |
| `MCTS_DEFAULT_BUDGET_MS` | Time target for bot move calculation | `500` |

## Authentication Flow

1. **Guest**: Generates a long random string, hashes it (SHA-256), and returns a `guest_[hash]` ID.
2. **Registration**: Validates email unique constraint, hashes password with Bcrypt (rounds: 10), and stores in `users.duckdb`.
3. **JWT**: tokens are signed with `JWT_SECRET` and include `userId`, `username`, and `role`.

---

> [!IMPORTANT]
> The backend does **not** rely on sticky sessions. Any instance can handle any move as long as it has the game state in its local replica, which is guaranteed by the Valkey sync layer.
