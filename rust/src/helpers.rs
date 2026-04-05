use std::collections::HashMap;
use crate::models::{Side, PieceType};
use crate::engine::{GameState, GamePhase, get_legal_moves, apply_move, apply_move_turnover, get_setup_legal_placements, apply_setup_placement_turnover, pass_turn};
use crate::agents::{Agent, AgentMove};

/// Executes a full interaction step for the current player's turn. 
/// Returns (goddess_captured, Option<(piece_id, target_pos, chosen_color)>).
pub fn perform_turn(state: &mut GameState, agent: &dyn Agent) -> (bool, Option<(String, String, String)>) {
    if state.is_new_turn {
        let valid_colors = vec!["grey".to_string(), "green".to_string(), "blue".to_string(), "orange".to_string()];
        let chosen = agent.choose_color(state, &valid_colors);
        state.color_chosen.insert(state.turn.clone(), chosen.clone());
        state.is_new_turn = false;
        return (false, None);
    }

    let eligible_ids = state.get_eligible_piece_ids();
    if eligible_ids.is_empty() {
        // Skip turn
        state.turn = state.get_enemy_side();
        state.is_new_turn = true;
        state.color_chosen.clear();
        state.locked_sequence_piece = None;
        state.heroe_take_counter = 0;
        state.turn_counter += 1;
        return (false, None);
    }

    let mut all_moves = HashMap::new();
    for p_id in eligible_ids {
        let moves = get_legal_moves(state, &p_id);
        if !moves.is_empty() {
            all_moves.insert(p_id, moves);
        }
    }

    let pass_allowed = state.locked_sequence_piece.is_some();
    
    if all_moves.is_empty() && !pass_allowed {
        state.turn = state.get_enemy_side();
        state.is_new_turn = true;
        state.color_chosen.clear();
        state.locked_sequence_piece = None;
        state.heroe_take_counter = 0;
        state.turn_counter += 1;
        return (false, None);
    }

    let action = agent.choose_move(state, &all_moves, pass_allowed);

    match action {
        AgentMove::Pass => {
            pass_turn(state);
            (false, None)
        }
        AgentMove::Move { piece, target } => {
            let chosen_color = state.color_chosen.get(&state.turn).cloned().unwrap_or_else(|| "none".to_string());
            let was_returned = state.board.pieces.get(&piece).map(|p| p.position == "returned").unwrap_or(false);
            let captured = apply_move(state, &piece, &target);
            let goddess_captured = captured.contains(&PieceType::Goddess);
            apply_move_turnover(
                state,
                &piece,
                &target,
                goddess_captured,
                captured.is_empty(),
                was_returned,
            );
            
            (goddess_captured, Some((piece, target, chosen_color)))
        }
    }
}

/// Executes a setup phase step.
/// Returns (bool, Option<(piece_id, target_pos)>).
pub fn perform_setup_turn(state: &mut GameState, agent: &dyn Agent) -> (bool, Option<(String, String)>) {
    let eligible_ids = state.get_eligible_piece_ids();
    if eligible_ids.is_empty() {
        return (false, None);
    }

    let mut all_moves = HashMap::new();
    let placements = get_setup_legal_placements(state);
    for p_id in eligible_ids {
        if let Some(targets) = placements.get(&p_id) {
            all_moves.insert(p_id, targets.clone());
        }
    }

    if all_moves.is_empty() {
        return (false, None);
    }

    let action = agent.choose_move(state, &all_moves, false);

    match action {
        AgentMove::Pass => (false, None),
        AgentMove::Move { piece, target } => {
            apply_setup_placement_turnover(state, &piece, &target);
            (false, Some((piece, target)))
        }
    }
}

pub fn perform_random_turn(state: &mut GameState) {
    use crate::agents::random::RandomAgent;
    perform_turn(state, &RandomAgent);
}
