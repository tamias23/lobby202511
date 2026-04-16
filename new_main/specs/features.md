# Platform Features

Deduce is a feature-rich competitive gaming platform designed for both live play and deep strategic analysis.

## Core Gameplay
- **Real-time Multiplayer**: Sub-100ms move synchronization via the Socket.io/Rust hybrid engine.
- **Authoritative Validation**: Client-side WASM prediction with server-side Rust verification ensures zero cheating.
- **Dynamic Board Loading**: Support for hundreds of board configurations loaded on-demand to keep gameplay fresh.

## Competitive Infrastructure
- **Tournaments**: Automated orchestration for both **Knockout** (elimination) and **Swiss** formats.
- **Global Leaderboards**: Real-time Glicko-2 rating updates after every competitive match.
- **Matchmaking**: Distributed queue system that pairs players based on skill level and latency.

## Intelligence & Analysis
- **Advanced Bot AI**: Integration with MCTS-based bot servers for varying difficulty levels.
- **Board Analysis**: Step-through replay system allowing players to review matches and explore alternate move sequences.
- **Bot vs. Bot Simulation**: Background matches that populate the platform with high-level training data.

## Mobile & Accessibility
- **Cross-Platform Play**: Seamless gameplay between Web and Android (Capacitor).
- **Responsive UI**: Optimized for touch controls on mobile and high-precision mouse play on desktop.
- **Guest Access**: Zero-registration play to allow instant onboarding.

## Reliability & Governance
- **State Replication**: distributed state ensures that if a server instance fails, matches continue on another instance without interruption.
- **GCS Persistence**: Automatic database backups and state snapshots provide disaster recovery capabilities.
- **Role-Based Access**: admin roles for tournament moderation and platform maintenance.

---

> [!TIP]
> Use the **Analysis View** after a match to see the engine's evaluation of your moves and identify missed opportunities.
