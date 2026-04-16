# Users, Players & Bots

The Deduce ecosystem supports a diverse range of participants, from casual guest players to advanced AI agents.

## User Types

### 1. Registered Users
Personalized accounts with a persistent identity.
- **Profiles**: Store bio, avatar URL, and game preferences.
- **Verification**: Email-based verification via Nodemailer to prevent spam accounts.
- **Ratings**: Participate in the global Glicko-2 ranking system.

### 2. Guest Accounts
Low-barrier entry for new players.
- **IDs**: Generated as `guest_[SHA-256 hash]`.
- **Limitations**: Guests can play most game modes but do not accumulate a persistent rating or appear on global leaderboards.

## Glicko-2 Rating System

The platform uses the **Glicko-2** algorithm for precise skill estimation (replacing the simpler Elo system).
- **Parameters**: Every player has a `rating`, `rating_deviation` (RD), and `volatility`.
- **Scaling**: Ratings are mapped to the standard 1500 scale for user-facing displays.
- **Activity**: RD increases over time if a player is inactive, reflecting greater uncertainty in their skill level.

## Bot Integration (`bot-server`)

The bot system is a standalone Rust service (`bot-server`) that communicates with the main backend via an internal REST API.

### AI Architecture
- **MCTS (Monte Carlo Tree Search)**: The primary engine for complex decision-making. 
- **Time Budgeting**: Configurable via `MCTS_DEFAULT_BUDGET_MS` in the backend config.
- **Deterministic Scanning**: The main backend automatically scans the bot server for available "Models" and presents them in the UI.

### Bot Personas
- **Imprudent Klaus**: A specialized model known for aggressive Goddess plays and high-risk maneuvers.
- **Training**: Bots can be trained against match archives exported from the DuckDB `games` table in Parquet format.

## Background Matches

To keep the platform "alive," the backend periodically simulates background matches between bots.
- **Interval**: Controlled by `BOT_MATCH_INTERVAL_MS`.
- **Storage**: Results are saved to `games.duckdb`, allowing players to analyze bot vs. bot strategies in the Analysis Room.

---

> [!NOTE]
> Bot IDs are prefixed with `bot_` and are treated as registered users by the rating system, allowing for "AI Leaderboards."
