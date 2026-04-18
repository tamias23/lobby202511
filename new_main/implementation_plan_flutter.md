# Flutter Frontend Migration — Implementation Plan

## Goal

Migrate the Dedal frontend from **React (Vite + Capacitor)** to **Flutter**, targeting Android and Web (Chrome). The legacy React frontend is preserved at `./new_main/frontend_legacy/` as a reference. The new Flutter project lives at `./new_main/frontend/`.

> [!IMPORTANT]
> The backend (`./new_main/backend/`) is **unchanged**. The Flutter app is a pure client that communicates via the same Socket.io events and REST endpoints.

---

## User Review Required

> [!NOTE]
> **Rust Engine Integration via `flutter_rust_bridge`**: The legacy React app uses Rust compiled to WASM for client-side move validation. For Flutter, we will use **`flutter_rust_bridge`** (FRB), which is the industry-standard solution for Rust ↔ Flutter:
> - **Android**: FRB generates Dart FFI bindings that call the Rust `rust-core` crate compiled as a native `.so` (via `cargo-ndk`). Zero WASM overhead, native speed.
> - **Web**: FRB generates `wasm-bindgen` glue code that compiles `rust-core` to WASM and bridges it to Dart via JS interop. Same Rust code, same API surface.
> - **Single codegen**: `flutter_rust_bridge_codegen` auto-generates the Dart API from the Rust function signatures. We write the Rust API once, call it identically from Dart on both platforms.
> - **Existing code reuse**: The `rust-core` crate already exposes `get_legal_moves()` and `get_eligible_piece_ids()`. We just need a thin FRB wrapper layer.

> [!NOTE]
> **State Management**: Using **Riverpod 3.0** (released Sep 2025). v3 adds auto-retry with exponential backoff (great for socket reconnects), mutations for async side-effects (loading/success/error on button presses), pause/resume lifecycle, and `Ref.mounted` for safe async callbacks.

> [!NOTE]
> **Board Rendering — Hybrid approach**:
> - **Polygons** → `CustomPainter` (Canvas API). Draws filled/stroked polygon shapes, legal-move highlights, and grid lines. This is optimal for rendering 100+ irregular polygons at 60fps.
> - **Pieces** → **Custom `StatelessWidget`s** overlaid on top of the canvas via a `Stack` + `Positioned`. Each piece is its own widget with:
>   - Independent `GestureDetector` for tap and drag
>   - `AnimatedBuilder` / `AnimatedContainer` for selection pulse, smooth movement
>   - `CustomPaint` internally for the piece icon (triskelion, diamond, hexagon, etc.)
> - This separation means pieces can have individual hit-testing, Hero animations between board positions, and per-piece state — impossible when everything is painted monolithically.

---

## Architecture Overview

```mermaid
graph LR
    subgraph Flutter App
        UI[Screens & Widgets]
        RP[Riverpod Providers]
        SS[SocketService]
        AS[ApiService]
        BP[BoardPainter]
    end

    subgraph Backend (unchanged)
        SIO[Socket.io Server]
        REST[REST API]
    end

    UI --> RP
    RP --> SS
    RP --> AS
    UI --> BP
    SS <-->|WebSocket| SIO
    AS <-->|HTTP| REST
```

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| State management | **Riverpod 3.0** | Auto-retry, mutations, pause/resume, `Ref.mounted` |
| Routing | **GoRouter** | Declarative, deep-link support, path params |
| Real-time comms | **`socket_io_client`** | Direct port of Socket.io JS client |
| Rust engine | **`flutter_rust_bridge`** | FFI on Android, wasm-bindgen on Web |
| HTTP | **`dio`** | Interceptors for JWT, retry logic |
| Board rendering | **`CustomPainter`** | Canvas-based polygon drawing, 60fps |
| Local storage | **`shared_preferences`** | JWT token, theme, layout prefs |
| Fonts | **Google Fonts** (`google_fonts`) | Inter + Outfit like legacy |
| Theming | **Material 3** + custom `ThemeData` | Dark/light, custom palette |
| Code generation | **`freezed`** + **`json_serializable`** | Immutable models, JSON parsing |

---

## Proposed Changes

### Phase 1: Project Scaffolding & Core Services

#### [NEW] `frontend/` — Flutter project root

```
flutter create --org com.dedal --project-name dedal_app \
  --platforms android,web ./
```

Key files created:
- `pubspec.yaml` — dependencies
- `lib/main.dart` — app entry point
- `android/` — Android-specific config
- `web/` — Web-specific config

#### [NEW] `lib/core/` — Core services

##### `lib/core/socket_service.dart`
Singleton wrapper around `socket_io_client`. Maps to the legacy `socket.js`:
- `connect()`, `disconnect()`, `emit()`, `on()`, `off()`
- Auto-reconnect with exponential backoff
- JWT token injection via `auth.token` option
- Transport priority: `['websocket', 'polling']`

##### `lib/core/api_service.dart`
Dio-based HTTP client. Endpoints:
- `POST /login` → `Future<UserData>`
- `POST /register` → `Future<void>`
- `GET /api/me` → `Future<UserData>`
- `GET /api/boards/random/:count` → `Future<List<BoardPreview>>`
- `GET /api/boards/:boardId` → `Future<BoardData>`
- `POST /api/replay` → `Future<ReplayData>`
- `POST /api/tutorial/moves` → `Future<List<String>>`
- `POST /api/tutorial/apply` → `Future<GameState>`

##### `lib/core/config.dart`
Environment config:
- `apiUrl` — from `--dart-define=API_URL=...` or default `''`
- Platform detection (web vs Android)

---

### Phase 2: Data Models & Providers

#### [NEW] `lib/models/`

##### `lib/models/user.dart`
```dart
class User {
  final String id;
  final String username;
  final String role; // 'guest' | 'registered' | 'admin'
  final double? rating;
  final String? token;
}
```

##### `lib/models/game_state.dart`
Maps to the `initialState` payload from the server:
```dart
class GameState {
  final Map<String, dynamic> board; // allPolygons, allEdges, etc.
  final List<Piece> pieces;
  final String turn;        // 'white' | 'black'
  final String phase;       // 'Setup' | 'ColorChoice' | 'Playing' | 'GameOver'
  final int setupStep;
  final int turnCounter;
  final bool isNewTurn;
  final int movesThisTurn;
  final String? lockedSequencePiece;
  final int heroeTakeCounter;
  final Map<String, int> clocks;  // { white: ms, black: ms }
  final int? lastTurnTimestamp;
  final Map<String, String> colorChosen;
  final List<String> colorsEverChosen;
  final bool mageUnlocked;
  final Map<String, int> passCount;
  // ...
}
```

##### `lib/models/piece.dart`
```dart
class Piece {
  final String id;
  final String type;     // goddess, heroe, mage, witch, soldier, minotaur, siren, ghoul
  final String side;     // white | black
  final String position; // polygon name | 'returned' | 'graveyard'
}
```

##### `lib/models/polygon.dart`
```dart
class BoardPolygon {
  final int id;
  final String name;
  final String color;       // orange, green, blue, grey
  final List<Offset> points;
  final Offset center;
  final List<String> neighbors;
  final List<String> neighbours; // slide neighbors
  final String shape;
}
```

#### [NEW] `lib/providers/`

##### `lib/providers/auth_provider.dart`
- `authProvider` — `AsyncNotifier<User?>`, handles login/logout/restore
- Reads/writes JWT from `shared_preferences`
- Emits `join_lobby` on socket after login

##### `lib/providers/socket_provider.dart`
- `socketProvider` — provides `SocketService` singleton
- `connectionStateProvider` — `StreamProvider<bool>` for connect/disconnect

##### `lib/providers/lobby_provider.dart`
- `gameRequestsProvider` — `StateNotifier<List<GameRequest>>`
- `activeGamesProvider` — `StateNotifier<List<ActiveGame>>`
- `liveStatsProvider` — `StateNotifier<LiveStats>`
- `availableBotsProvider` — `StateNotifier<List<BotInfo>>`
- `tournamentsProvider` — open + active tournaments
- Listens to: `lobby_state`, `lobby_update`

##### `lib/providers/game_provider.dart`
- `gameStateProvider(gameId)` — `FamilyAsyncNotifier`
- Manages all game state: pieces, turn, phase, clocks, moves, etc.
- Listens to: `game_update`, `game_over`, `game_aborted`, `legal_moves`, `rating_updated`
- Emits: `join_game_room`, `apply_move`, `resign`, `randomize_setup`, `end_turn_setup`, `pass_turn_playing`, `color_selected`

##### `lib/providers/tournament_provider.dart`
- `tournamentProvider(tournamentId)` — tournament room state
- Listens to: `tournament_update`, `tournament_game_start`, `tournament_game_aborted`

---

### Phase 3: Screens — Lobby

#### [NEW] `lib/screens/lobby/lobby_screen.dart`
The main hub. Mirrors `LobbyPage.jsx`:
- Time control grid (6 presets + Custom + vs Bot + Tournament)
- 4-column bottom grid: Open Requests, Active Games, Open Tournaments, Active Tournaments
- Live stats badge
- Notification toast system

#### [NEW] `lib/screens/lobby/widgets/`
- `time_control_button.dart` — gradient-bordered card with label/description
- `game_request_card.dart` — accept/cancel buttons
- `active_game_card.dart` — spectate/rejoin with disconnect badge
- `tournament_card.dart` — join/view buttons
- `bot_panel.dart` — time control presets + bot selection grid
- `custom_game_form.dart` — minutes/increment inputs + board picker

#### [NEW] `lib/screens/auth/login_screen.dart`
Mirrors `LoginForm.jsx` — email/password with JWT storage.

#### [NEW] `lib/screens/auth/register_screen.dart`
Mirrors `RegistrationForm.jsx` — email/username/password registration flow.

#### [NEW] `lib/widgets/auth_header.dart`
Top-right user badge with login/logout/rating display.

---

### Phase 4: Screens — Game Board (Core)

This is the most complex component (~1700 lines in the legacy JSX).

#### [NEW] `lib/screens/game/game_screen.dart`
Replaces `GamePage.jsx`. Handles:
- URL parameter extraction (`/games/:hash`)
- `join_game_by_hash` socket emit
- Loading/error states
- Passes `gameId` + `initialState` to board

#### [NEW] `lib/screens/game/game_board.dart`
Main game widget. Contains:
- `CustomPaint` widget with `BoardPainter`
- `GestureDetector` for tap + drag-and-drop piece movement
- Info panel (clocks, player names, turn indicator)
- Actions panel (End Turn, Random Setup, Flip Board, Resign, Color Picker, Settings)
- Game Over overlay with replay/lobby buttons

#### [NEW] `lib/screens/game/painters/board_painter.dart`
`CustomPainter` that renders the **static board layer**:
1. **Polygons** — filled with theme colors, stroked borders
2. **Legal move highlights** — semi-transparent green overlay on valid targets
3. **Grid topology** — edge lines if needed

This painter does NOT render pieces — pieces are separate widgets.

#### [NEW] `lib/screens/game/widgets/piece_widget.dart`
Each piece on the board is an independent Flutter widget:
- `PieceWidget` — a `StatelessWidget` that wraps:
  - `GestureDetector` for tap (select) and pan (drag)
  - `AnimatedPositioned` for smooth movement between polygons
  - `CustomPaint` child with a `PieceIconPainter(type, side)` for the icon
- Piece positioning: a `Stack` overlays all `PieceWidget`s on top of the `CustomPaint` canvas using `Positioned` with coordinates mapped from board polygon centers → screen coordinates.

Each of the 8 piece types gets a dedicated `PieceIconPainter`, ported from the SVG `PieceIcon` component:

| Piece | SVG → Widget Mapping |
|---|---|
| Minotaur | 3× rotated arc paths → `canvas.drawPath()` with rotation transform |
| Soldier | Concentric circles → `canvas.drawCircle()` |
| Goddess | Diamond polygon → `canvas.drawPath()` with polygon points |
| Witch | Triangle → `canvas.drawPath()` |
| Heroe | Star polygon → `canvas.drawPath()` |
| Mage | Hexagon + concentric rings → `canvas.drawPath()` + `canvas.drawCircle()` |
| Siren | Hexagon + cross lines + circles → composite path |

Each `PieceWidget` can independently:
- Pulse-glow when selected (via `AnimationController`)
- Smoothly animate to a new position (via `AnimatedPositioned`)
- Show drag feedback (via `Draggable` or manual `GestureDetector.onPan`)
| Ghoul | Filled rectangle → `canvas.drawRect()` |

#### [NEW] `lib/screens/game/widgets/`
- `clock_widget.dart` — countdown timer with color-coded urgency
- `player_info_bar.dart` — name, rating, turn indicator
- `action_buttons.dart` — End Turn, Resign, Random Setup, Flip Board
- `color_picker.dart` — board color selection (orange, green, blue, grey swatches)
- `game_over_overlay.dart` — winner banner, rating delta, review/lobby buttons
- `move_history.dart` — scrollable list of moves
- `settings_accordion.dart` — board color themes, debug info

---

### Phase 5: Screens — Tournaments, Analysis, Tutorial

#### [NEW] `lib/screens/tournament/tournament_create_screen.dart`
Mirrors `TournamentCreate.jsx`:
- Format selector (Swiss, Knockout, Round Robin, Arena)
- Time control, max participants, rounds, password
- Board picker with mini SVG previews

#### [NEW] `lib/screens/tournament/tournament_room_screen.dart`
Mirrors `TournamentRoom.jsx`:
- Standings table, round pairings
- Live game links, auto-navigation to assigned games
- Download results button

#### [NEW] `lib/screens/analysis/analysis_screen.dart`
Mirrors `AnalysisPage.jsx`:
- Board replay with step-through controls
- Move list with click-to-jump
- Board state reconstruction via `/api/replay` endpoint

#### [NEW] `lib/screens/tutorial/tutorial_screen.dart`
Mirrors `TutorialPage.jsx`:
- Interactive lesson chapters
- Piece-specific tutorials with guided placement

---

### Phase 6: Polish & Platform Integration

#### [MODIFY] `android/app/src/main/AndroidManifest.xml`
- Internet permission
- Immersive mode flags
- Hardware acceleration

#### [NEW] `android/app/src/main/kotlin/.../MainActivity.kt`
- Immersive mode (port from legacy `MainActivity.java`)
- Keep screen on during gameplay

#### [MODIFY] `web/index.html`
- Meta tags, favicon, title
- Google Fonts preload (Inter, Outfit)

#### [MODIFY] `pubspec.yaml`
Final dependency list:
```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^3.0.0
  riverpod_annotation: ^3.0.0
  go_router: ^14.0.0
  socket_io_client: ^3.0.2
  dio: ^5.7.0
  shared_preferences: ^2.3.0
  google_fonts: ^6.2.0
  freezed_annotation: ^2.4.0
  json_annotation: ^4.9.0
  flutter_rust_bridge: ^2.9.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
  freezed: ^2.5.0
  json_serializable: ^6.8.0
  flutter_lints: ^5.0.0
  riverpod_generator: ^3.0.0
  custom_lint:
  riverpod_lint:
```

---

## Socket Event Mapping

Complete mapping from legacy React → Flutter providers:

### Client → Server (emit)

| Event | Screen | Flutter Provider |
|---|---|---|
| `enter_lobby` | Lobby | `lobbyProvider` |
| `join_lobby` | App init | `authProvider` |
| `create_game_request` | Lobby | `lobbyProvider` |
| `cancel_game_request` | Lobby | `lobbyProvider` |
| `accept_game_request` | Lobby | `lobbyProvider` |
| `create_bot_game` | Lobby | `lobbyProvider` |
| `join_game_by_hash` | GameScreen | `gameProvider` |
| `join_game_room` | GameBoard | `gameProvider` |
| `leave_game_room` | GameBoard dispose | `gameProvider` |
| `leave_game_by_hash` | GameScreen dispose | `gameProvider` |
| `get_legal_moves` | GameBoard (piece tap) | `gameProvider` |
| `apply_move` | GameBoard (drop on target) | `gameProvider` |
| `end_turn_setup` | GameBoard | `gameProvider` |
| `pass_turn_playing` | GameBoard | `gameProvider` |
| `randomize_setup` | GameBoard | `gameProvider` |
| `resign` | GameBoard | `gameProvider` |
| `color_selected` | GameBoard | `gameProvider` |
| `create_tournament` | TournamentCreate | `tournamentProvider` |
| `join_tournament` | Lobby | `lobbyProvider` |
| `enter_tournament_room` | TournamentRoom | `tournamentProvider` |
| `leave_tournament_room` | TournamentRoom dispose | `tournamentProvider` |
| `leave_tournament` | TournamentRoom | `tournamentProvider` |
| `download_tournament_games` | TournamentRoom | `tournamentProvider` |

### Server → Client (on)

| Event | Flutter Handler |
|---|---|
| `lobby_state` | `lobbyProvider.onLobbyState()` |
| `lobby_update` | `lobbyProvider.onLobbyUpdate()` |
| `game_created` | `lobbyProvider` → navigate to `/games/:hash` |
| `request_created` | `lobbyProvider.onRequestCreated()` |
| `request_error` | show snackbar |
| `bot_error` | show snackbar |
| `game_joined` | `gameProvider.onGameJoined()` |
| `game_update` | `gameProvider.onGameUpdate()` |
| `game_over` | `gameProvider.onGameOver()` |
| `game_aborted` | `gameProvider.onGameAborted()` |
| `legal_moves` | `gameProvider.onLegalMoves()` |
| `rating_updated` | `authProvider` + `gameProvider` |
| `session_conflict` | `authProvider` → logout + navigate home |
| `tournament_created` | navigate to `/tournament/:id` |
| `tournament_joined` | navigate to `/tournament/:id` |
| `tournament_update` | `tournamentProvider.onUpdate()` |
| `tournament_game_start` | navigate to `/games/:hash` |
| `tournament_error` | show snackbar |

---

## File Structure

```
lib/
├── main.dart
├── app.dart                   # MaterialApp + GoRouter + Riverpod scope
├── core/
│   ├── config.dart
│   ├── socket_service.dart
│   ├── api_service.dart
│   └── theme.dart             # ThemeData, color palette, text styles
├── models/
│   ├── user.dart
│   ├── game_state.dart
│   ├── piece.dart
│   ├── polygon.dart
│   ├── game_request.dart
│   ├── active_game.dart
│   ├── tournament.dart
│   └── bot_info.dart
├── providers/
│   ├── auth_provider.dart
│   ├── socket_provider.dart
│   ├── lobby_provider.dart
│   ├── game_provider.dart
│   └── tournament_provider.dart
├── screens/
│   ├── lobby/
│   │   ├── lobby_screen.dart
│   │   └── widgets/
│   │       ├── time_control_button.dart
│   │       ├── game_request_card.dart
│   │       ├── active_game_card.dart
│   │       ├── tournament_card.dart
│   │       ├── bot_panel.dart
│   │       └── custom_game_form.dart
│   ├── game/
│   │   ├── game_screen.dart
│   │   ├── game_board.dart
│   │   ├── painters/
│   │   │   ├── board_painter.dart
│   │   │   └── piece_painter.dart
│   │   └── widgets/
│   │       ├── clock_widget.dart
│   │       ├── player_info_bar.dart
│   │       ├── action_buttons.dart
│   │       ├── color_picker.dart
│   │       ├── game_over_overlay.dart
│   │       ├── move_history.dart
│   │       └── settings_accordion.dart
│   ├── tournament/
│   │   ├── tournament_create_screen.dart
│   │   └── tournament_room_screen.dart
│   ├── analysis/
│   │   └── analysis_screen.dart
│   ├── tutorial/
│   │   └── tutorial_screen.dart
│   └── auth/
│       ├── login_screen.dart
│       └── register_screen.dart
└── widgets/
    ├── auth_header.dart
    ├── notification_toast.dart
    ├── glass_panel.dart        # Reusable glassmorphism container
    └── bubble_background.dart  # Animated background (Canvas-based)
```

---

## Open Questions

> [!IMPORTANT]
> 1. **Scope priority**: Should I build all screens, or should we focus on **Lobby + Game Board** first and add Tournament/Analysis/Tutorial later?
> 2. **Web deployment**: Should the Flutter web build replace the legacy web app served by the backend? Currently `index.js` serves static files from `frontend/dist/`. We'd need to update `deploy.sh` to build the Flutter web app instead.
> 3. **flutter_rust_bridge setup**: The FRB codegen needs a thin Rust wrapper crate (e.g. `frontend/rust/`) that re-exports `rust-core` functions with FRB-compatible signatures. I'll create this during Phase 1. Does this sound right?

---

## Verification Plan

### Automated Tests
- `flutter test` — unit tests for providers and models
- `flutter test --platform chrome` — web-specific tests
- Widget tests for board painter (golden image tests)

### Manual Verification
1. **Local dev**: `flutter run -d chrome` against local backend (`localhost:4000`)
2. **Android**: `flutter run -d <device>` against local or GCP backend
3. **Smoke test checklist**:
   - [ ] Guest login → lobby renders
   - [ ] Create game request → appears in list
   - [ ] Accept request → game board loads
   - [ ] Setup phase: place pieces, random setup, end turn
   - [ ] Color choice phase: select color
   - [ ] Playing phase: move pieces (tap + drag), resign
   - [ ] Clock ticks down correctly
   - [ ] vs Bot: full game completion
   - [ ] Tournament: create, join, play round
   - [ ] Reconnection: kill socket → banner → auto-rejoin
