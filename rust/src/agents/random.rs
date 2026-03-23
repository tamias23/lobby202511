use rand::seq::IteratorRandom;
use std::collections::HashMap;

use crate::agents::{Agent, AgentMove};
use crate::engine::GameState;

/// A purely random agent: selects colours, pieces and targets uniformly at random.
pub struct RandomAgent;

impl Agent for RandomAgent {
    fn name(&self) -> &str {
        "random"
    }

    fn choose_color<'a>(&self, _gs: &GameState, valid_colors: &'a [String]) -> &'a String {
        let mut rng = rand::rng();
        valid_colors.iter().choose(&mut rng).unwrap()
    }

    fn choose_move(
        &self,
        _gs: &GameState,
        all_moves: &HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> AgentMove {
        let mut rng = rand::rng();

        // Build the flat move list (uniformly random across pieces)
        let chosen_piece = all_moves.keys().choose(&mut rng).unwrap().clone();
        let chosen_target = all_moves[&chosen_piece].iter().choose(&mut rng).unwrap().clone();

        // With some probability, prefer passing over continuing when allowed —
        // here we keep it simple: always play a move (never voluntarily pass).
        let _ = pass_allowed;

        AgentMove::Move { piece: chosen_piece, target: chosen_target }
    }
}
