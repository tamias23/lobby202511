# Valkey Component Specification

This document details the usage and integration of Valkey (a Redis-compatible data store) within the ND6 lobby system.

## Overview
Valkey is used as the backbone for distributed state synchronization, distributed locking, and Socket.IO multi-instance communication. It enables the application to scale horizontally (e.g., on Cloud Run or multiple Podman containers) while maintaining a consistent global state in every instance's memory.

---

## Usage Details

### 1. Socket.IO Redis Adapter
- **File**: `valkeyAdapter.js`
- **What**: Integration of `@socket.io/redis-adapter`.
- **Why**: Allows Socket.IO events (emissions to rooms) to be broadcast across all server instances. Without this, a player on Instance A would not receive a "move" event emitted by a player on Instance B.
- **When**: Initialized once at server startup.
- **How Often**: Every time `io.emit()` or `io.to(room).emit()` is called.
- **How Much**: Minimal overhead per message; requires two Redis connections (one for publishing, one for subscribing).

### 2. Application-Level State Sync (`nd6:sync` channel)
- **File**: `valkeySync.js`
- **What**: Custom Pub/Sub system using the `nd6:sync` channel.
- **Why**: Every instance maintains a local in-memory replica of `activeGames` and `gameRequests` for low-latency access. Mutations (moves, game creation, removals) are broadcast to keep all replicas in sync.
- **When**: 
    - `game:created`, `game:updated`, `game:deleted`
    - `request:created`, `request:removed`
    - `game:disconnect`, `game:reconnect`
    - `tournament:sync`
- **How Often**: Extremely frequent. Every move in every game and every change in the lobby triggers a message.
- **How Much**: JSON payloads varying from small IDs to full game state snapshots (excluding heavy board geometry).

### 3. Distributed Locking
- **File**: `valkeySync.js`, `jobRunner.js`
- **What**: `SET NX EX` (Set if Not Exists with Expiry) operations.
- **Why**: 
    - **Matchmaking**: Ensures only one instance "wins" the race to accept a game request (`nd6:lock:request:<id>`).
    - **Scheduled Jobs**: Ensures only one instance runs a specific background job (e.g., daily limits reset) at a time (`nd6:lock:job:<id>`).
- **When**: Immediately before a sensitive operation (accepting a request or starting a job).
- **How Often**: 
    - Once per request acceptance.
    - Once per job check (every 5 minutes per instance).
- **How Much**: Small keys with short TTLs (10s for requests, 300s for jobs).

### 4. Persistence & Bootstrapping
- **File**: `valkeySync.js`
- **What**: Storage of full state snapshots in Valkey keys.
- **Why**: Allows a newly started instance to "catch up" by reading the current state from Valkey instead of waiting for pub/sub events.
- **When**: 
    - **Write**: Every 30 seconds (`FULL_STATE_INTERVAL_MS`).
    - **Read**: Once during instance startup (bootstrap).
- **How Often**: Periodic writes; one-time read per instance life.
- **How Much**: 
    - `nd6:state:games:<instanceId>`: Full JSON of games owned by that instance.
    - `nd6:state:requests`: Full JSON of all active game requests.
    - `nd6:state:tournaments`: Full JSON of tournament lists.

### 5. Health Monitoring (Heartbeats)
- **File**: `valkeySync.js`
- **What**: Volatile keys (`nd6:heartbeat:<instanceId>`) with a short TTL.
- **Why**: Allows instances to detect if a peer has crashed. If a heartbeat is missing, the surviving instances can safely take over or clean up "abandoned" games owned by the dead instance.
- **When**: Every 15 seconds (`HEARTBEAT_INTERVAL_MS`).
- **How Often**: 4 times per minute per instance.
- **How Much**: Negligible (tiny "1" value).

---

## Infrastructure Integration
- **Local Dev**: `launch_back_and_front_and_bot.sh` starts a local Valkey container using Podman.
- **Orchestration**: `docker-compose.podman.yml` defines the `valkey` service using `docker.io/valkey/valkey:latest`.
- **Cleanup**: `podman_stop.sh` handles stopping and optionally purging the `valkey-data` volume.

---

## Observations & Potential Issues

> [!WARNING]
> **Matchmaking Lock Fallback**: In `valkeySync.js`, `tryLockRequest` returns `false` if a Valkey command fails (fail-closed) to prevent "Double Acceptance" race conditions in multi-instance environments. It only returns `true` if Valkey is explicitly disabled/uninitialized (single-instance mode), ensuring safety by default.

> [!NOTE]
> **Use of `SCAN` Command**: The bootstrap process uses `client.scanIterator()` instead of `KEYS`. This prevents blocking the Redis event loop, ensuring the application remains responsive even as the number of active game instances grows.

> [!IMPORTANT]
> **Inconsistent TTLs**: 
> - Tournament state (`STATE_KEY_TOURNAMENTS`) uses a 1-hour TTL (`3600s`).
> - Game/Request state snapshots use a 2-minute TTL (`120s`).
> Ensure this difference is intentional, as a long-lived tournament state might persist even after all instances are restarted if not updated.
