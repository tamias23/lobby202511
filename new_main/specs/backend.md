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

### 3. Database Layer (Firestore)
The project uses **Google Cloud Firestore** as its persistent document database.
- **Collections**: `users`, `profiles`, `games`, `tournaments`, `tournament_participants`.
- **Connection Manager** (`firestoreAdapter.js`): Manages Firestore connection with 15-second retry on failure. Locally connects to the Firestore emulator (`FIRESTORE_EMULATOR_HOST=localhost:8200`). On GCP, uses default credentials.
- **Graceful Degradation**: If Firestore is unavailable, the game engine continues running in memory. Auth and persistence operations will fail gracefully.
- **Game Offload**: Old games (beyond `GAME_RETENTION_DAYS`, default 7) are exported to Parquet files on `/mnt/db` using DuckDB in-memory, then deleted from Firestore. Triggered daily at 20:00 UTC by the `parquet_export` cron job (GCP mode only — requires `GCS_BUCKET` + `NODE_ENV=production`).
- **Minimal Interaction**: All real-time game state lives in memory, synced via Valkey. Firestore is only used for durable persistence of users, completed games, and tournament metadata. See `specs/about_firestore.md` for the full interaction inventory.

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
| `FIRESTORE_PROJECT_ID` | GCP project ID for Firestore | `my-local-firestore` |
| `GAME_RETENTION_DAYS` | Days to keep games in Firestore before Parquet offload | `7` |

## Authentication Flow

1. **Guest**: Generates a long random string, hashes it (SHA-256), and returns a `guest_[hash]` ID.
2. **Registration**: Validates email unique constraint, hashes password with Bcrypt (rounds: 10), and stores in Firestore `users` collection.
3. **JWT**: tokens are signed with `JWT_SECRET` and include `userId`, `username`, and `role`.

---

> [!IMPORTANT]
> The backend does **not** rely on sticky sessions. Any instance can handle any move as long as it has the game state in its local replica, which is guaranteed by the Valkey sync layer.
