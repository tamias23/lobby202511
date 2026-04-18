# Firestore Interactions

All server–Firestore interactions, listed by module and approximate frequency.

## Connection & Health

| Interaction | Module | Frequency |
|:---|:---|:---|
| Connect to Firestore (with 15s retry) | `firestoreAdapter.js` | Once at startup, then on reconnect |
| Verify collections exist (`_meta` sentinel) | `firestoreAdapter.js` | Once at first successful connection |
| `listCollections()` health check | `firestoreAdapter.js` | Each connection attempt |

## Users Collection

| Interaction | Module | Frequency |
|:---|:---|:---|
| **Read** user by ID (`getUser`) | `index.js` (fetchUserRating, /api/me, game creation) | Per game creation (2×), per `/api/me` call, per bot poll cycle |
| **Read** user by email/username (`getUserByEmailOrUsername`) | `index.js` (/login) | Per login attempt |
| **Read** user by verification token | `index.js` (/verify-email) | Per email verification click |
| **Write** create user (`createUser`) | `index.js` (/register, ensureBotsRegistered) | Per registration, per new bot model discovered |
| **Write** update user fields (`updateUser`) | `index.js` (/verify-email) | Per email verification |
| **Write** update rating (`updateUserRating`) | `gameStorage.js` (Glicko-2) | Per completed game (2× writes: white + black) |
| **Write** increment tournament counter | `tournamentManager.js` | Per tournament join / tournament completion (per participant) |

### Estimated user-collection frequency
- **Reads**: ~2/game-creation + 1/login + 1/bot-poll (every 2min) ≈ **low** (< 1/s typical)
- **Writes**: ~2/game-completion + occasional registration ≈ **very low** (< 0.1/s typical)

## Games Collection

| Interaction | Module | Frequency |
|:---|:---|:---|
| **Write** save game result (`saveGame`) | `gameStorage.js` | Per completed game |
| **Write** save tournament game placeholder | `tournamentManager.js` | Per tournament game creation |
| **Write** update tournament game result (`updateGame`) | `tournamentManager.js` | Per tournament game completion |
| **Read** games for tournament (`getGamesForTournament`) | `tournamentManager.js` | At startup (loadFromDb), per `getTournamentGamesJson` call |
| **Read** old games for offload (`getGamesOlderThan`) | `gcsSync.js` | Every 24h (GCP only) |
| **Delete** old games after Parquet export | `gcsSync.js` | Every 24h (GCP only) |

### Estimated games-collection frequency
- **Writes**: ~1/completed-game ≈ **very low**
- **Reads**: Only at startup + every 24h for offload ≈ **negligible**

## Tournaments Collection

| Interaction | Module | Frequency |
|:---|:---|:---|
| **Read** active tournaments (`getActiveTournaments`) | `tournamentManager.js` | Once at startup |
| **Write** create tournament (`saveTournament`) | `tournamentManager.js` | Per tournament creation |
| **Write** update tournament (`updateTournament`) | `tournamentManager.js` | Per join, start, round advance, completion, cancellation |

### Estimated tournaments-collection frequency
- **Reads**: Once at startup ≈ **negligible**
- **Writes**: A few per tournament lifecycle ≈ **very low**

## Tournament Participants Collection

| Interaction | Module | Frequency |
|:---|:---|:---|
| **Read** participants for tournament | `tournamentManager.js` | At startup (per active tournament) |
| **Write** add participant (`addParticipant`) | `tournamentManager.js` | Per tournament join |
| **Write** update score (`updateParticipantScore`) | `tournamentManager.js` | Per tournament game completion (2× per game) |
| **Delete** remove participant (`removeParticipant`) | `tournamentManager.js` | Per tournament leave (open only) |

### Estimated frequency
- **Very low** — tournaments are infrequent events

## Profiles Collection

| Interaction | Module | Frequency |
|:---|:---|:---|
| **Read** profile | `db.js` (reserved for future use) | Not currently called |
| **Write** upsert profile | `db.js` (reserved for future use) | Not currently called |

> [!NOTE]
> Profile reads/writes are not yet wired in `index.js`. They exist in `db.js` for future use by a profile management UI.

## Summary

| Category | Typical Frequency | Firestore Cost Impact |
|:---|:---|:---|
| User reads | < 1/s | Minimal (free tier covers this) |
| User writes (rating) | < 0.1/s | Minimal |
| Game writes | < 0.1/s | Minimal |
| Game reads (offload) | 1/day | Negligible |
| Tournament ops | Sporadic | Negligible |
| **Total** | **< 2 ops/s** sustained | **Well within free tier** |

> [!TIP]
> The server interacts with Firestore as little as possible by design. All real-time game state (boards, pieces, moves, clocks) lives in-memory and is synced across instances via Valkey pub/sub. Firestore is only used for durable persistence of users, completed games, and tournament metadata.
