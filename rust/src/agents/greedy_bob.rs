use crate::agents::Agent;
use crate::engine::{get_legal_moves, GameState, GamePhase, apply_move, apply_move_turnover, get_setup_legal_placements};
use crate::models::{Side, PieceType};
use rand::seq::SliceRandom;
use rand::seq::IteratorRandom;

pub struct GreedyBobAgent {
    pub weights: [f64; 26],
}

impl GreedyBobAgent {
    pub fn new(weights: [f64; 26]) -> Self {
        Self { weights }
    }

    /// Helper to efficiently evaluate the 13 heuristics for a specific side.
    fn compute_metrics(state: &GameState, perspective: &Side) -> [f64; 13] {
        let mut metrics = [0.0; 13];
        
        let enemy_side = match perspective {
            Side::White => Side::Black,
            Side::Black => Side::White,
        };

        let enemy_goddess_id = if enemy_side == Side::White { "white_goddess_0" } else { "black_goddess_0" };
        
        // Find opponent goddess center
        let enemy_goddess_pos = state.board.pieces.get(enemy_goddess_id).map(|p| p.position.as_str()).unwrap_or("graveyard");
        
        let goddess_center = if enemy_goddess_pos == "returned" || enemy_goddess_pos == "graveyard" || enemy_goddess_pos == "empty" {
            None
        } else {
            state.board.polygons.get(enemy_goddess_pos).map(|poly| poly.center)
        };

        let mut min_dist: f64 = 1000.0;
        let mut sum_dist: f64 = 0.0;
        
        let mut mages_board = 0.0;
        let mut soldiers_board = 0.0;
        let mut ghouls_board = 0.0;
        let mut sirens_board = 0.0;
        let mut heroes_board = 0.0;

        let mut mages_immobilized = 0.0;
        let mut soldiers_immobilized = 0.0;
        let mut minotaurs_immobilized = 0.0;
        let mut ghouls_immobilized = 0.0;
        let mut sirens_immobilized = 0.0;
        let mut heroes_immobilized = 0.0;

        for piece in state.board.pieces.values() {
            if piece.side != *perspective {
                continue;
            }

            let on_board = piece.position != "returned" && piece.position != "graveyard";
            
            // Distance tracking logically evaluated for active combatants requested
            let is_combatant = matches!(
                piece.piece_type, 
                PieceType::Soldier | PieceType::Minotaur | PieceType::Mage | PieceType::Witch | PieceType::Ghoul | PieceType::Heroe
            );

            if is_combatant {
                let dist = if !on_board {
                    100.0
                } else if let Some(g_center) = goddess_center {
                    if let Some(poly) = state.board.polygons.get(&piece.position) {
                        let dx = poly.center[0] - g_center[0];
                        let dy = poly.center[1] - g_center[1];
                        (dx * dx + dy * dy).sqrt()
                    } else {
                        100.0
                    }
                } else {
                    100.0
                };

                if dist < min_dist {
                    min_dist = dist;
                }
                sum_dist += dist;
            }

            if !on_board {
                continue;
            }

            // Board Counts
            match piece.piece_type {
                PieceType::Mage => mages_board += 1.0,
                PieceType::Soldier => soldiers_board += 1.0,
                PieceType::Ghoul => ghouls_board += 1.0,
                PieceType::Siren => sirens_board += 1.0,
                PieceType::Heroe => heroes_board += 1.0,
                _ => {}
            }

            // Immobilized Counts
            let legal_moves = get_legal_moves(state, &piece.id);
            if legal_moves.is_empty() {
                match piece.piece_type {
                    PieceType::Mage => mages_immobilized += 1.0,
                    PieceType::Soldier => soldiers_immobilized += 1.0,
                    PieceType::Minotaur => minotaurs_immobilized += 1.0,
                    PieceType::Ghoul => ghouls_immobilized += 1.0,
                    PieceType::Siren => sirens_immobilized += 1.0,
                    PieceType::Heroe => heroes_immobilized += 1.0,
                    _ => {}
                }
            }
        }

        if min_dist == 1000.0 { min_dist = 100.0; } // Fallback if no combatants

        metrics[0] = min_dist;
        metrics[1] = sum_dist;
        metrics[2] = mages_board;
        metrics[3] = soldiers_board;
        metrics[4] = ghouls_board;
        metrics[5] = sirens_board;
        metrics[6] = heroes_board;
        metrics[7] = mages_immobilized;
        metrics[8] = soldiers_immobilized;
        metrics[9] = minotaurs_immobilized;
        metrics[10] = ghouls_immobilized;
        metrics[11] = sirens_immobilized;
        metrics[12] = heroes_immobilized;

        metrics
    }

    /// Evaluates the total global score weighing the perspective side vs the enemy side using the 26 parameters.
    pub fn score_state(&self, state: &GameState, perspective: &Side) -> f64 {
        let enemy_side = match perspective {
            Side::White => Side::Black,
            Side::Black => Side::White,
        };

        let my_metrics = Self::compute_metrics(state, perspective);
        let opp_metrics = Self::compute_metrics(state, &enemy_side);

        let mut score = 0.0;
        
        // Internal Weights (0-12)
        for i in 0..13 {
            score += my_metrics[i] * self.weights[i];
        }
        
        // Opponent Weights (13-25)
        for i in 0..13 {
            score += opp_metrics[i] * self.weights[13 + i];
        }

        score
    }
}

impl Agent for GreedyBobAgent {
    fn name(&self) -> &str {
        "GreedyBob"
    }

    fn choose_color<'a>(&self, state: &GameState, valid_colors: &'a [String]) -> &'a String {
        let mut best_color_idx = 0;
        let mut best_score = std::f64::NEG_INFINITY;
        let perspective = state.turn.clone();

        for (idx, color) in valid_colors.iter().enumerate() {
            let mut clone_state = state.clone();
            clone_state.color_chosen.insert(perspective.clone(), color.clone());
            clone_state.is_new_turn = false;

            let score = self.score_state(&clone_state, &perspective);
            if score > best_score {
                best_score = score;
                best_color_idx = idx;
            }
        }
        
        &valid_colors[best_color_idx]
    }

    fn choose_move(
        &self,
        state: &GameState,
        all_moves: &std::collections::HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> crate::agents::AgentMove {
        let perspective = state.turn.clone();

        // During setup, always use the engine-filtered placements (random selection).
        // This prevents picking a Goddess spot that leaves no valid Hero placement,
        // and also avoids calling apply_move_turnover (wrong turnover for setup phase).
        if state.phase == GamePhase::Setup {
            use crate::engine::get_setup_legal_placements;
            let placements = get_setup_legal_placements(state);
            let safe_moves = if !placements.is_empty() { placements } else { all_moves.clone() };
            if safe_moves.is_empty() {
                return crate::agents::AgentMove::Pass;
            }
            let mut rng = rand::rng();
            let p_id = safe_moves.keys().choose(&mut rng).unwrap().clone();
            let target = safe_moves[&p_id].iter().choose(&mut rng).unwrap().clone();
            return crate::agents::AgentMove::Move { piece: p_id, target };
        }
        let mut best_piece = String::new();
        let mut best_target = String::new();
        let mut best_score = std::f64::NEG_INFINITY;

        if pass_allowed {
            let mut pass_state = state.clone();
            pass_state.turn_counter += 1;
            pass_state.turn = pass_state.get_enemy_side();
            pass_state.color_chosen.clear();
            pass_state.is_new_turn = true;
            pass_state.locked_sequence_piece = None;
            pass_state.heroe_take_counter = 0;
            
            best_score = self.score_state(&pass_state, &perspective);
            best_piece = "PASS".to_string(); // Flag
        }

        for (p_id, targets) in all_moves {
            for target in targets {
                let mut clone_state = state.clone();
                let was_returned = clone_state.board.pieces[p_id].position == "returned";
                let captured = apply_move(&mut clone_state, p_id, target);
                
                let goddess_captured = captured.contains(&PieceType::Goddess);
                apply_move_turnover(
                    &mut clone_state,
                    p_id,
                    target,
                    goddess_captured,
                    captured.is_empty(),
                    was_returned,
                );

                let score = if goddess_captured {
                    std::f64::INFINITY
                } else {
                    self.score_state(&clone_state, &perspective)
                };
                
                if score > best_score {
                    best_score = score;
                    best_piece = p_id.clone();
                    best_target = target.clone();
                }
            }
        }

        if best_piece == "PASS" {
            crate::agents::AgentMove::Pass
        } else {
            crate::agents::AgentMove::Move {
                piece: best_piece,
                target: best_target,
            }
        }
    }
}
