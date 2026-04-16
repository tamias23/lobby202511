# Game Rules & Mechanics

Deduce is a high-strategy polygonal board game where players must leverage unique piece abilities to capture the opponent's Goddess while protecting their own.

## The Board

The game is played on a polygonal grid (often hexagonal or irregular). 
- **Polygons**: The basic units of the board. Each has a unique ID and a color.
- **Topology**: Connectivity is defined in board JSON files via adjacency lists. Movement is calculated based on "Slide" neighbors (touching edges) or "Jump" logic (distance-based).

## Piece Types & Abilities

There are 8 distinct piece types, each with a unique movement pattern or special power.

| Piece | Movement | Special Ability |
| :--- | :--- | :--- |
| **Goddess** | Jump (Dist 2) | **Objective**: Captured → Game Over. |
| **Heroe** | Jump (Dist 3) | **Multi-Capture**: Can capture up to 2 pieces in a single turn. |
| **Mage** | Jump (Dist 3) | **Blast**: If it captures a piece, it also destroys all adjacent enemies (except Minotaur). |
| **Witch** | Jump (Dist 4) | **Passive Blast**: Destroys all adjacent enemies upon landing, even without a primary capture. |
| **Soldier** | Slide | Basic infantry. Move via "Friendly Hops" (chaining movement over allies). |
| **Minotaur** | Slide | **Immunity**: Cannot be destroyed by Mage/Witch AoE blasts. Cannot be captured. |
| **Siren** | Jump (Dist 2) | **Pinning**: Adjacent enemy pieces cannot move. |
| **Ghoul** | Slide (Depth 2) | Fast skirmisher. Can move 2 steps if the intermediate polygon is not matching their start color. |

### Movement Constraints
- **Matching Color**: Some pieces have bonuses or restrictions based on whether the destination polygon matches a "chosen color."
- **Sequence Locking**: If a piece makes a move but doesn't end the turn, it becomes "locked" — only that piece can continue moving until the turn is passed.

## Game Phases

Matches progress through four distinct phases:

### Phase 1: Setup
Players take turns placing their initial pieces on the board. This phase is often randomized in quick matches but strategic in professional play.

### Phase 2: Color Choice
Each player selects a "Starting Color" from the board. This choice affects the movement speed and sequence options of their pieces (especially Soldiers and Ghouls) throughout the game.

### Phase 3: Playing
The core game. Players alternate turns. A turn consists of one or more "sub-moves" depending on capture sequences and piece abilities.
- **Turn-over Rules**: Capturing an enemy piece usually allows for a follow-up move with the same piece.
- **Pinning**: If you land next to a Siren, you are stuck there unless the Siren moves away or is captured.

### Phase 4: Game Over
The game ends immediately when a Goddess is captured or a player runs out of time on their clock.

---

> [!IMPORTANT]
> **Rule 108 (The Siren Paradox)**: Pinning only applies if the pinner and pinnee are of different colors. Landing on a Siren's adjacent square does *not* necessarily end your turn if you have remaining sequence capacity, but it prevents you from starting a *new* move from that square later.
