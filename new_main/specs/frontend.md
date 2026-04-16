# Frontend Specification

The Deduce frontend is a high-performance single-page application (SPA) that provides a consistent experience across web and mobile platforms.

## Architecture

### 1. Web Stack (Vite + React)
The UI is built using functional React components and styled with localized Vanilla CSS modules.
- **Build Tool**: Vite, providing fast HMR and optimized production bundling.
- **State Management**: Local `useState`/`useReducer` for component state, and a central `SocketContext` for real-time multiplayer orchestration.
- **Routing**: Minimalist custom router based on game state (Lobby vs. GameBoard).

### 2. Mobile Integration (Capacitor)
The Android application is a native wrapper around the web build using **Ionic Capacitor**.
- **Immersive Mode**: `MainActivity.java` contains custom code to handle edge-to-edge rendering and system bar hiding.
- **Persistence**: Game state is persistent across App restarts via the backend's reconnection logic.
- **Performance**: Move calculations are done in the browser context using WASM, ensuring low-latency interaction without constant network roundtrips.

## WebAssembly (WASM) Integration

The game engine (shared with the backend) is compiled to WASM using `wasm-pack`.
- **Loading Phase**: The WASM binary is fetched and initialized during the app's splash screen.
- **Usage**: When a player selects a piece, the UI calls into WASM to highlight valid destination polygons. This ensures that the client-side "legal moves" perfectly match the server's authoritative logic.
- **Predictive UI**: Move animations start locally immediately upon user action, while the server confirmation happens in the background.

## Key UI Components

### `GameBoard.jsx`
The central component for gameplay.
- **Rendering**: SVG-based board rendering using coordinates defined in the board JSON files.
- **Interaction**: Supports both Drag-and-Drop (Dnd-kit) and Click-to-Move patterns.
- **Responsiveness**: Dynamic scaling ensures the board remains playable on everything from a phone to a 4K monitor.

### `AnalysisRoom.jsx`
A post-game review interface.
- **Replay**: Allows stepping through every move recorded during the match.
- **Sync**: Uses `replayToStepNapi` logic to reconstruct past board states.

## Styling System

The project uses **Vanilla CSS** with a curated design system found in `src/styles/`.
- **Variables**: Centralized color palette and spacing tokens in `variables.css`.
- **Animations**: Subtle micro-animations for piece selection and capture events.
- **Themes**: Support for "Light" and "Dark" modes, controllable via the user profile.

---

> [!TIP]
> To update the mobile app, run `npm run build` in the frontend directory followed by `npx cap copy android`.
