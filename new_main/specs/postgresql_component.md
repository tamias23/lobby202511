# PostgreSQL Component Usage Specification

This document provides a comprehensive audit of PostgreSQL (PSQL) usage within the `./new_main/` project directory. It details every occurrence, including its purpose, frequency, and data characteristics.

---

## 1. Summary of Tables and Data Volume

| Table Name | Purpose | Data Volume | Growth Rate |
| :--- | :--- | :--- | :--- |
| `users` | Player accounts, auth, ratings, and stats. | 1 row per user | Low |
| `profiles` | Extended user settings and metadata (JSONB). | 1 row per user | Low |
| `games` | Persistent match history and move lists. | 1 row per match | **High** (Managed) |
| `tournaments` | Tournament rules, state, and metadata. | 1 row per event | Medium |
| `tournament_participants` | Standings and scores within a tournament. | N rows per event | High |
| `cron_jobs` | Persistent scheduler definitions. | 1 row per job type | Static |
| `jobs` | Execution log and status for background tasks. | 1 row per run | Medium |
| `subscriptions` | Payment and subscription tracking. | 1 row per transaction | Low |
| `leaderboards` | Cached snapshots of top player rankings. | 1 row per category | Static |
| `tournament_schedule` | Templates for recurring automated tournaments. | 1 row per template | Static |

---

## 2. Occurrence Audit

### 2.1. Connection & Lifecycle Management
*   **File**: `backend/src/pgAdapter.js`
*   **Why**: Centralized management of the database lifecycle.
*   **What**: Uses `pg.Pool` to maintain persistent connections.
*   **When**: Triggered on server start (`init()`).
*   **How Often**: Once per server execution; implements a 15-second retry loop on failure.
*   **How Much**: Configured for a maximum of 20 concurrent connections.
*   **Operational Detail**: Performs automatic schema initialization and migration via `SCHEMA_SQL` on every successful connection.

### 2.2. Authentication & User Persistence
*   **File**: `backend/src/db.js` (`getUser`, `createUser`, `updateUser`)
*   **Why**: Secure storage of credentials and user progress.
*   **What**: Reads/writes to the `users` and `profiles` tables.
*   **When**: On login, registration, profile updates, and session validation.
*   **How Often**: High frequency. Every authenticated request or WebSocket connection involves at least one read.
*   **How Much**: Atomic row operations.

### 2.3. Competitive Rating Updates (Glicko-2)
*   **File**: `backend/src/utils/gameStorage.js`, `backend/src/db.js` (`updateUserRating`)
*   **Why**: Maintaining accurate player rankings across different time controls.
*   **What**: Atomic updates to `rating`, `rating_deviation`, and `rating_volatility` columns.
*   **When**: Immediately after a match concludes.
*   **How Often**: Twice per finished game (once per player).
*   **How Much**: Serialized via a `SerialQueue` to prevent race conditions.

### 2.4. Match History & Archiving
*   **File**: `backend/src/db.js` (`saveGame`), `backend/src/gcsSync.js`
*   **Why**: Storage of game data for analysis while preventing DB bloat.
*   **What**: Inserts full move lists into `games` table.
*   **When**: At the end of every non-guest game.
*   **How Often**: High frequency (tens of times per hour).
*   **Maintenance**: A daily cron job (`gcsSync.js`) identifies games older than 30 days, exports them to Parquet, and deletes them from PSQL.

### 2.5. Tournament Lifecycle Standings
*   **File**: `backend/src/db.js` (`addParticipant`, `updateParticipantScore`)
*   **Why**: Real-time tracking of tournament leaderboards and tiebreakers.
*   **What**: Updates to `score`, `wins`, `losses`, and `tiebreaker` in `tournament_participants`.
*   **When**: On player entry and after every tournament match result.
*   **How Often**: Bursty. Extremely high during the final rounds of large tournaments.

### 2.6. Background Job Engine
*   **File**: `backend/src/jobs/jobRunner.js`, `backend/src/db.js` (`getDueJobs`, `saveJob`)
*   **Why**: Reliable execution of scheduled tasks (e.g., Daily Tournaments).
*   **What**: Status polling and log writing to `jobs` and `cron_jobs` tables.
*   **When**: Polling occurs every 5 seconds.
*   **How Often**: Constant background activity.
*   **How Much**: Small writes for status updates.

### 2.7. Automated Tournament Scheduling
*   **File**: `backend/src/db.js` (`getTournamentSchedule`, `upsertTournamentScheduleItem`)
*   **Why**: Allows administrators to define recurring tournament patterns.
*   **What**: Reads/writes to `tournament_schedule`.
*   **When**: Used by the `dailyTournamentScheduler` job to spawn new tournaments.

### 2.8. Scripted Seeding (Admin)
*   **File**: `add_tournaments_to_psql.py`
*   **Why**: Manual seeding of tournaments for testing or special events.
*   **What**: Direct `INSERT` into the `tournaments` table using `psycopg2`.
*   **When**: Executed manually via CLI.

---

## 3. Infrastructure Configuration

*   **Docker/Podman**: Configured in `docker-compose.podman.yml` as a service named `postgres`.
*   **Persistence**: Mounts a volume from the host to `/var/lib/postgresql/data`.
*   **Environment Variables**:
    *   `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD`.
    *   Defaults (if unset): `localhost`, `5432`, `dedalthegame01`, `tamias23`.

---

## 4. Observed Issues & Recommendations

> [!WARNING]
> **Hardcoded Credentials**
> The file `add_tournaments_to_psql.py` contains a hardcoded password: `PG_PASSWORD = "TY-rre__U@345"`. This should be moved to an environment variable for security.

> [!NOTE]
> **Serial Rating Queue (Over-Engineering)**
> The Glicko-2 `SerialQueue` in `gameStorage.js` serializes all rating updates globally. However, business rules already guarantee that a user can only be connected once and can only play one game at a time, making per-player race conditions impossible. The queue adds unnecessary serialization overhead — two unrelated players finishing games simultaneously are blocked from writing in parallel despite updating different rows. This queue could be safely removed.

> [!IMPORTANT]
> **Initial Connection Timeout**
> `pgAdapter.js` has a 20-second timeout to resolve the `init()` promise. If the PostgreSQL container takes longer than 20s to perform its first-time initialization, the backend will start in "memory-only" mode, and subsequent DB operations will fail until the next manual or internal retry succeeds.
