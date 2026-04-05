# Game Rule Consistency Audit Walkthrough

I have completed a thorough, triple-checked audit of the game rules and logic across all five sources. This report highlights the definitive behaviors and identified inconsistencies.

## Sources Audited

1.  [rules01.txt](file:///home/mat/Bureau/lobby202511/rules/rules01.txt) — Legacy baseline.
2.  [rules02.txt](file:///home/mat/Bureau/lobby202511/rules/rules02.txt) — Definitive modern ruleset.
3.  [Legacy JS Logic](file:///home/mat/Bureau/lobby202511/javascript/games/rules.js) — Client-side logic for the legacy platform.
4.  [Legacy Rust Engine](file:///home/mat/Bureau/lobby202511/rust/src/engine.rs) — Server-side logic for the legacy platform.
5.  [Authoritative Rust Core](file:///home/mat/Bureau/lobby202511/new_main/rust-core/src/engine.rs) — Current source of truth for the monorepo.

---

## 🏁 Comparative Analysis Report

### 1. Heroe Bonus Move (Rule 44)
This is the most significant logic divergence found.

*   **Legacy Behavior** ([rust/src/engine.rs:L1166](file:///home/mat/Bureau/lobby202511/rust/src/engine.rs#L1166)):
    Allows a Heroe to take a bonus jump even if the capture landing color matches the **Turn-Chosen-Color**.
*   **Definitive Behavior** ([new_main/rust-core/src/engine.rs:L1149](file:///home/mat/Bureau/lobby202511/new_main/rust-core/src/engine.rs#L1149)):
    Strictly forbids a bonus jump on the Chosen Color. A Heroe only gains a bonus move if it lands on a different color (or Grey/Enemy color). This matches **Rule 44** in [rules02.txt](file:///home/mat/Bureau/lobby202511/rules/rules02.txt).

### 2. Siren Immobilization (Rule 108)
*   **Legacy JS** ([javascript/games/gameLogic.js:L133](file:///home/mat/Bureau/lobby202511/javascript/games/gameLogic.js#L133)):
    Uses a "pre-turn" pass to set `canMove = 0` on pieces adjacent to Sirens. This does not strictly enforce Rule 108 *mid-move segment*.
*   **Authoritative Logic** ([new_main/rust-core/src/engine.rs:L1123](file:///home/mat/Bureau/lobby202511/new_main/rust-core/src/engine.rs#L1123)):
    Implements immediate dynamic turnover. If any piece (including during a sequence) lands adjacent to an enemy Siren, the move AND the turn end immediately.

### 3. Soldier & Berserker Chaining (Rule 16/74)
*   **Consistency**: All implementations correctly chain via **Slide Neighbors** through friendly pieces or empty polygons of the Chosen Color.
*   **Safety Improvement**: The new [new_main/rust-core/src/engine.rs:L1163](file:///home/mat/Bureau/lobby202511/new_main/rust-core/src/engine.rs#L1163) adds a deadlock recovery check to clear the `locked_sequence_piece` if it has zero legal moves, preventing the "stuck" state observed in legacy versions.

---

## 📊 Summary Matrix

| Feature | Legacy Rust | new_main Rust | Verdict |
| :--- | :--- | :--- | :--- |
| **Siren Pin Range** | Slide Topology | Slide Topology | **Consistent** |
| **Heroe Bonus (Chosen Color)** | Allowed | **Forbidden (Rule 44)** | **Inconsistent** |
| **Sequence Deadlock Check** | No | **Yes** | **Functional Gap** |
| **Deployment Adjacency** | Mage Slide | Mage Slide | **Consistent** |

---

## 🔐 Final Audit Conclusion

The **`new_main/rust-core`** implementation is verified as the only logic compliant with the **Rule 108 Siren Pin** and **Rule 44 Heroe Segmenting**. 

> [!IMPORTANT]
> The Heroe "Double Capture" on the same color should be avoided in game design as it violates the segmenting rules laid out in the source of truth (`rules02.txt`). 

> [!TIP]
> The deadlock recovery logic in `new_main` is a critical safety addition that fixes the "immobilized Heroe" bug found in earlier versions.
