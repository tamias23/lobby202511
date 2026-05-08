use crate::agents::{Agent, AgentMove};
use crate::engine::{get_legal_moves, GameState, GamePhase, apply_move, apply_move_turnover};
use crate::models::{Side, PieceType};
use rand::seq::IteratorRandom;
use std::collections::HashMap;

/// BetterMario uses 64 parameters for a more nuanced heuristic evaluation.
pub const NUM_PARAMS: usize = 64;

pub struct BetterMarioAgent {
    pub weights: [f64; NUM_PARAMS],
}

impl BetterMarioAgent {
    pub fn new(weights: [f64; NUM_PARAMS]) -> Self {
        Self { weights }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Heuristics
    // ────────────────────────────────────────────────────────────────────────

    fn chosen_color(state: &GameState) -> String {
        state.color_chosen.get(&state.turn).cloned().unwrap_or_default()
    }

    fn would_end_turn(state: &GameState, piece_id: &str, target_poly: &str) -> bool {
        let chosen = Self::chosen_color(state);
        if chosen.is_empty() { return false; }
        let target_color = state.board.polygons.get(target_poly)
            .map(|p| p.color.to_lowercase()).unwrap_or_default();
        if target_color != chosen { return false; }
        
        let piece = &state.board.pieces[piece_id];
        let is_chainable = piece.piece_type == PieceType::Soldier || piece.piece_type == PieceType::Minotaur;
        if piece.position == "returned" { return true; }
        if state.is_siren_pinned(target_poly, state.turn) { return true; }
        if is_chainable { return false; }
        true
    }

    fn simulate_captures(state: &GameState, piece_id: &str, target_poly: &str) -> Vec<PieceType> {
        let piece = &state.board.pieces[piece_id];
        let piece_side = piece.side;
        let mut captured = Vec::new();
        if let Some(defender_id) = state.occupancy.get(target_poly) {
            let defender = &state.board.pieces[defender_id];
            if defender.side != piece_side && defender.piece_type != PieceType::Minotaur {
                captured.push(defender.piece_type.clone());
            }
        }
        // AoE for Witch/Mage
        if piece.piece_type == PieceType::Witch {
            for n in state.get_slide_neighbors(target_poly) {
                if let Some(tid) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[tid];
                    if np.side != piece_side && np.piece_type != PieceType::Minotaur {
                        captured.push(np.piece_type.clone());
                    }
                }
            }
        }
        captured
    }

    fn poly_distance(state: &GameState, a: &str, b: &str) -> f64 {
        let ca = state.board.polygons.get(a).map(|p| p.center);
        let cb = state.board.polygons.get(b).map(|p| p.center);
        match (ca, cb) {
            (Some(pa), Some(pb)) => ((pa[0]-pb[0]).powi(2) + (pa[1]-pb[1]).powi(2)).sqrt(),
            _ => 999.0,
        }
    }

    fn goddess_safety_score(&self, state: &GameState, poly: &str) -> f64 {
        let enemy = if state.turn == Side::White { Side::Black } else { Side::White };
        let mut distances: Vec<f64> = Vec::new();
        for p in state.board.pieces.values() {
            if p.side == enemy && p.position != "returned" && p.position != "graveyard" {
                distances.push(Self::poly_distance(state, poly, &p.position));
            }
        }
        distances.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        distances.iter().take(5).sum()
    }

    fn evaluate_state(&self, state: &GameState) -> f64 {
        let mut score = 0.0;
        let my_side = state.turn;
        let enemy_side = if my_side == Side::White { Side::Black } else { Side::White };

        // Basic Piece values
        for p in state.board.pieces.values() {
            let val = match p.piece_type {
                PieceType::Goddess => 1000.0,
                PieceType::Mage => 50.0,
                PieceType::Heroe => 40.0,
                PieceType::Witch => 30.0,
                PieceType::Siren => 30.0,
                _ => 10.0,
            };
            if p.position == "graveyard" { continue; }
            let sign = if p.side == my_side { 1.0 } else { -1.0 };
            score += sign * val;
            
            // Formation heuristics
            if p.side == my_side && p.position != "returned" {
                // [26] Center control
                if let Some(poly) = state.board.polygons.get(&p.position) {
                    let dist_to_center = (poly.center[0].powi(2) + poly.center[1].powi(2)).sqrt();
                    score += self.weights[26] * (1.0 / (1.0 + dist_to_center));
                }
            }
        }

        // [21] Goddess safety
        for (id, p) in &state.board.pieces {
            if p.piece_type == PieceType::Goddess && p.position != "returned" && p.position != "graveyard" {
                let safety = self.goddess_safety_score(state, &p.position);
                let sign = if p.side == my_side { 1.0 } else { -1.0 };
                score += sign * self.weights[21] * safety;
            }
        }

        score
    }

    fn shallow_minimax(&self, state: &GameState, depth: i32) -> f64 {
        if depth == 0 || state.phase == GamePhase::GameOver {
            return self.evaluate_state(state);
        }

        let eligible = state.get_eligible_piece_ids();
        let mut best_val = f64::NEG_INFINITY;
        
        // Simplified: only look at a subset of moves to stay fast
        for p_id in eligible.iter().take(5) {
            let moves = get_legal_moves(state, p_id);
            for target in moves.iter().take(5) {
                let mut sim = state.clone();
                let was_returned = sim.board.pieces[p_id].position == "returned";
                let captured = apply_move(&mut sim, p_id, target);
                if captured.contains(&PieceType::Goddess) {
                    return 9999.0;
                }
                apply_move_turnover(&mut sim, p_id, target, false, captured.is_empty(), was_returned);
                
                // Recursion (opponent's turn)
                let val = -self.shallow_minimax(&sim, depth - 1);
                if val > best_val { best_val = val; }
            }
        }
        
        if best_val == f64::NEG_INFINITY { self.evaluate_state(state) } else { best_val }
    }
}

impl Agent for BetterMarioAgent {
    fn name(&self) -> &str { "BetterMario" }

    fn choose_color<'a>(&self, state: &GameState, valid_colors: &'a [String]) -> &'a String {
        let mut best_idx = 0;
        let mut best_val = f64::NEG_INFINITY;
        for (i, color) in valid_colors.iter().enumerate() {
            let mut sim = state.clone();
            sim.color_chosen.insert(state.turn, color.to_lowercase());
            sim.is_new_turn = false;
            let val = self.shallow_minimax(&sim, 1);
            if val > best_val {
                best_val = val;
                best_idx = i;
            }
        }
        &valid_colors[best_idx]
    }

    fn choose_move(
        &self,
        state: &GameState,
        all_moves: &HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> AgentMove {
        let mut best_move = AgentMove::Pass;
        let mut best_val = f64::NEG_INFINITY;

        for (p_id, targets) in all_moves {
            for target in targets {
                let mut sim = state.clone();
                let was_returned = sim.board.pieces[p_id].position == "returned";
                let captured = apply_move(&mut sim, p_id, target);
                if captured.contains(&PieceType::Goddess) {
                    return AgentMove::Move { piece: p_id.clone(), target: target.clone() };
                }
                apply_move_turnover(&mut sim, p_id, target, false, captured.is_empty(), was_returned);
                
                // 1-ply look-ahead (evaluate result of this move)
                let val = if sim.turn == state.turn {
                    // Still my turn (sequence lock), evaluate again
                    self.evaluate_state(&sim)
                } else {
                    // Opponent's turn, evaluate their potential
                    -self.shallow_minimax(&sim, 1)
                };

                if val > best_val {
                    best_val = val;
                    best_move = AgentMove::Move { piece: p_id.clone(), target: target.clone() };
                }
            }
        }

        if pass_allowed && best_val < self.evaluate_state(state) {
            return AgentMove::Pass;
        }

        best_move
    }
}
