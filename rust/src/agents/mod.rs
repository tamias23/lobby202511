use crate::engine::GameState;

/// The decision an agent makes at a half-turn:
/// either pick a piece + target, or pass.
pub enum AgentMove {
    Move { piece: String, target: String },
    Pass,
}

/// Choose which colour to activate at the start of a new turn.
/// Returns `None` if no colour yields any legal move (turn is skipped).
pub trait Agent: Send + Sync {
    fn name(&self) -> &str;

    /// Called once at the start of a new turn to pick an active colour.
    /// The engine has already collected `valid_colors` (non-empty guaranteed
    /// when this is called); the agent picks one.
    fn choose_color<'a>(&self, gs: &GameState, valid_colors: &'a [String]) -> &'a String;

    /// Called each half-step while the turn is still alive.
    /// `all_moves` maps piece-id → list of legal targets (never empty).
    /// Return `AgentMove::Pass` only when the piece is sequence-locked and
    /// passing is valid (i.e. `pass_allowed == true`).
    fn choose_move(
        &self,
        gs: &GameState,
        all_moves: &std::collections::HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> AgentMove;

    /// Optional: Notify the agent of the final game result for training purposes.
    fn record_winner(&self, _winner: Option<crate::models::Side>) {}
}

pub mod random;
pub mod greedy_bob;
pub mod greedy_jack;
pub mod mcts;
pub mod quick_diego;
pub mod imprudent_klaus;
