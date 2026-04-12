use crate::agents::{Agent, AgentMove};
use crate::agents::mcts::build_graph_data;
use crate::engine::{get_legal_moves, GameState, GamePhase, apply_move, apply_move_turnover, get_legal_colors, get_setup_legal_placements};
use crate::models::{Side, PieceType};
use rand::seq::SliceRandom;
use rand::seq::IteratorRandom;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Total number of learnable parameters for QuickDiego.
///
/// Layout (33 weights):
///   [0]  color: count of moveable pieces
///   [1]  color: count of non-turn-ending moves
///   [2]  color: count of capturable enemy pieces
///   [3]  color: count of capturable enemy pieces on non-ending color
///   [4]  move: taking a mage
///   [5]  move: taking a mage and ending turn
///   [6]  move: taking a heroe
///   [7]  move: taking a heroe and ending turn
///   [8]  move: taking a witch
///   [9]  move: taking a witch and ending turn
///   [10] move: taking a siren
///   [11] move: taking a siren and ending turn
///   [12] move: siren immobilising a mage
///   [13] move: siren immobilising a mage, target not on chosen color
///   [14] move: siren immobilising a heroe
///   [15] move: siren immobilising a heroe, target not on chosen color
///   [16] move: siren immobilising a witch
///   [17] move: siren immobilising a witch, target not on chosen color
///   [18] move: siren immobilising a siren
///   [19] move: siren immobilising a siren, target not on chosen color
///   [20] move: taking any enemy piece
///   [21] move: taking any enemy piece and ending turn
///   [22] move: distance to enemy goddess (normalised to [-1, 1])
///   [23..32] spare slots for future heuristics (initialised to 0)
pub const NUM_PARAMS: usize = 33;

pub struct QuickDiegoAgent {
    pub weights: [f64; NUM_PARAMS],
    /// Budget in ms for the MCTS color look-ahead (step 1-a).
    pub mcts_color_budget_ms: u64,
    /// Buffered per-decision JSON records; flushed in `record_winner`.
    game_buffer: Mutex<Vec<serde_json::Value>>,
    /// Directory to write imitation JSON files. Empty string = do not record.
    pub data_dir: String,
    pub record_data: bool,
}

impl QuickDiegoAgent {
    /// Standard constructor — no data recording.
    pub fn new(weights: [f64; NUM_PARAMS], mcts_color_budget_ms: u64) -> Self {
        Self::with_recording(weights, mcts_color_budget_ms, String::new(), false)
    }

    /// Constructor with imitation-data recording enabled.
    pub fn with_recording(
        weights: [f64; NUM_PARAMS],
        mcts_color_budget_ms: u64,
        data_dir: String,
        record_data: bool,
    ) -> Self {
        Self { weights, mcts_color_budget_ms, game_buffer: Mutex::new(Vec::new()), data_dir, record_data }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Imitation-data recording
    // ────────────────────────────────────────────────────────────────────────

    /// Record the current graph state and the chosen move as a one-hot `pi`.
    /// `chosen_key` must be a valid element of `move_keys` ("piece:target",
    /// "COLOR:<c>", or "PASS").
    fn record_decision(&self, gs: &GameState, chosen_key: &str) {
        if !self.record_data || self.data_dir.is_empty() {
            return;
        }

        let (x, edge_index, node_to_idx) = build_graph_data(gs);

        // Build legal-move list (graph edges only — same as MCTS recording)
        let mut move_keys: Vec<String> = Vec::new();
        let mut moves_flat: Vec<i64> = Vec::new();

        if gs.phase == GamePhase::Setup {
            let placements = get_setup_legal_placements(gs);
            for (p_id, targets) in placements {
                let p = &gs.board.pieces[&p_id];
                let stock_id = format!("STOCK_{:?}_{:?}", p.side, p.piece_type);
                if let Some(&u) = node_to_idx.get(&stock_id) {
                    for target in targets {
                        if let Some(&v) = node_to_idx.get(&target) {
                            move_keys.push(format!("{}:{}", p_id, target));
                            moves_flat.push(u as i64);
                            moves_flat.push(v as i64);
                        }
                    }
                }
            }
        } else {
            // Color-choice phase: enumerate graph-encodable moves for context
            // (the color decision itself is not a graph edge, but we still want
            // value-head training data from this state)
            if !gs.is_new_turn {
                let eligible = gs.get_eligible_piece_ids();
                for p_id in eligible {
                    let targets = get_legal_moves(gs, &p_id);
                    for target in targets {
                        let p = &gs.board.pieces[&p_id];
                        let src_idx = if p.position == "returned" {
                            let stock_id = format!("STOCK_{:?}_{:?}", p.side, p.piece_type);
                            node_to_idx.get(&stock_id).copied()
                        } else {
                            node_to_idx.get(&p.position).copied()
                        };
                        if let Some(u) = src_idx {
                            if let Some(&v) = node_to_idx.get(&target) {
                                move_keys.push(format!("{}:{}", p_id, target));
                                moves_flat.push(u as i64);
                                moves_flat.push(v as i64);
                            }
                        }
                    }
                }
            }
        }

        // Skip states with no graph-encodable moves (e.g. pure colour turns)
        if move_keys.is_empty() {
            return;
        }

        let legal_moves_flat: Vec<i64> = moves_flat;

        // One-hot pi: 1.0 on chosen move, 0.0 elsewhere
        let mut pi: std::collections::HashMap<String, f64> = move_keys.iter()
            .map(|k| (k.clone(), 0.0))
            .collect();
        if pi.contains_key(chosen_key) {
            pi.insert(chosen_key.to_string(), 1.0);
        }
        // If chosen_key not in graph moves (e.g. it was a COLOR/PASS action),
        // the pi stays all-zero — the policy head gets no gradient for this
        // step, but the value head still trains from z.

        let data = serde_json::json!({
            "x": x.into_raw_vec_and_offset().0,
            "edge_index": edge_index.into_raw_vec_and_offset().0,
            "legal_moves": legal_moves_flat,
            "move_keys": move_keys,
            "pi": pi,
            "turn_side": format!("{:?}", gs.turn),
        });

        self.game_buffer.lock().unwrap().push(data);
    }

    /// Flush `game_buffer` to disk, annotating every record with `z`.
    fn flush_buffer(&self, winner: Option<Side>) {
        let mut buffer = self.game_buffer.lock().unwrap();
        if buffer.is_empty() {
            return;
        }

        let winner_str = match winner {
            Some(Side::White) => "White",
            Some(Side::Black) => "Black",
            None => "draw",
        };

        let mut records: Vec<serde_json::Value> = Vec::new();
        for mut entry in buffer.drain(..) {
            let state_side = entry.get("turn_side")
                .and_then(|v| v.as_str())
                .unwrap_or("White");
            let z = if winner_str == "draw" {
                0.0
            } else if winner_str == state_side {
                1.0
            } else {
                -1.0
            };
            if let Some(obj) = entry.as_object_mut() {
                obj.insert("z".to_string(), serde_json::json!(z));
            }
            records.push(entry);
        }

        let _ = std::fs::create_dir_all(&self.data_dir);
        let filename = format!("{}/diego_{}.json", self.data_dir, uuid::Uuid::new_v4());
        if let Ok(json_str) = serde_json::to_string(&records) {
            let _ = std::fs::write(filename, json_str);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ────────────────────────────────────────────────────────────────────────

    /// Returns the chosen color (lowercase) for the current turn, or empty string.
    fn chosen_color(state: &GameState) -> String {
        state.color_chosen.get(&state.turn).cloned().unwrap_or_default()
    }

    /// Does landing on `target_poly` end the turn for piece `piece_id`?
    /// A soldier/minotaur landing on the chosen color gets sequence-locked but
    /// does NOT end the turn. Other piece types DO end the turn on chosen color.
    /// Landing on a non-chosen color never ends the turn.
    /// A piece pinned by an enemy siren on arrival on chosen color also ends.
    fn would_end_turn(state: &GameState, piece_id: &str, target_poly: &str) -> bool {
        let chosen = Self::chosen_color(state);
        if chosen.is_empty() {
            return false;
        }
        let target_color = state.board.polygons.get(target_poly)
            .map(|p| p.color.to_lowercase())
            .unwrap_or_default();

        let piece = &state.board.pieces[piece_id];
        let is_chainable = piece.piece_type == PieceType::Soldier || piece.piece_type == PieceType::Minotaur;
        let was_returned = piece.position == "returned";

        if was_returned {
            // Deploying on chosen color ends the turn for all piece types.
            return target_color == chosen;
        }

        // Check siren pin at target
        let is_pinned = state.is_siren_pinned(target_poly, state.turn);
        if is_pinned && target_color == chosen {
            return true;
        }

        if target_color == chosen {
            // Soldier/Minotaur get sequence-locked, turn does NOT end
            if is_chainable {
                return false;
            }
            return true;
        }

        false
    }

    /// What would this move capture? Returns vec of captured PieceTypes.
    /// Takes AoE into account for Witch and Mage.
    fn simulate_captures(state: &GameState, piece_id: &str, target_poly: &str) -> Vec<PieceType> {
        let piece = &state.board.pieces[piece_id];
        let piece_side = piece.side;
        let piece_type = piece.piece_type.clone();
        let mut captured = Vec::new();

        // Direct capture
        if let Some(defender_id) = state.occupancy.get(target_poly) {
            let defender = &state.board.pieces[defender_id];
            if defender.side != piece_side && defender.piece_type != PieceType::Minotaur {
                captured.push(defender.piece_type.clone());
            }
        }

        // AoE: Witch destroys all adjacent enemies (except Minotaur)
        if piece_type == PieceType::Witch {
            for n in state.get_slide_neighbors(target_poly) {
                if let Some(target_id) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[target_id];
                    if np.side != piece_side && np.piece_type != PieceType::Minotaur {
                        captured.push(np.piece_type.clone());
                    }
                }
            }
        }

        // AoE: Mage destroys all adjacent enemies on capture (except Minotaur)
        if piece_type == PieceType::Mage && !captured.is_empty() {
            let enemy = if piece_side == Side::White { Side::Black } else { Side::White };
            for n in state.get_slide_neighbors(target_poly) {
                if let Some(target_id) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[target_id];
                    if np.side == enemy && np.piece_type != PieceType::Minotaur {
                        captured.push(np.piece_type.clone());
                    }
                }
            }
        }

        captured
    }

    /// Which enemy pieces would a siren immobilise by moving to `target_poly`?
    /// A siren immobilises all adjacent enemy pieces (via slide neighbors).
    fn siren_would_immobilise(state: &GameState, target_poly: &str, my_side: Side) -> Vec<PieceType> {
        let mut immobilised = Vec::new();
        for n in state.get_slide_neighbors(target_poly) {
            if let Some(occ_id) = state.occupancy.get(&n) {
                let p = &state.board.pieces[occ_id];
                if p.side != my_side {
                    immobilised.push(p.piece_type.clone());
                }
            }
        }
        immobilised
    }

    /// Euclidean distance between the centers of two polygons.
    fn poly_distance(state: &GameState, a: &str, b: &str) -> f64 {
        let ca = state.board.polygons.get(a).map(|p| p.center);
        let cb = state.board.polygons.get(b).map(|p| p.center);
        match (ca, cb) {
            (Some(pa), Some(pb)) => {
                let dx = pa[0] - pb[0];
                let dy = pa[1] - pb[1];
                (dx * dx + dy * dy).sqrt()
            }
            _ => 999.0,
        }
    }

    /// Find the position of the enemy goddess (if on board).
    fn enemy_goddess_pos(state: &GameState) -> Option<String> {
        let enemy = if state.turn == Side::White { Side::Black } else { Side::White };
        for p in state.board.pieces.values() {
            if p.side == enemy && p.piece_type == PieceType::Goddess
                && p.position != "returned" && p.position != "graveyard"
            {
                return Some(p.position.clone());
            }
        }
        None
    }

    /// Maximum pairwise distance on the board (cached lazily; approximated).
    fn max_board_distance(state: &GameState) -> f64 {
        let mut max_d: f64 = 1.0;
        // Sample a few polygons for an estimate rather than O(n²)
        let polys: Vec<&str> = state.board.polygons.keys().map(|k| k.as_str()).collect();
        if polys.len() >= 2 {
            for &a in polys.iter().take(20) {
                for &b in polys.iter().rev().take(20) {
                    let d = Self::poly_distance(state, a, b);
                    if d > max_d { max_d = d; }
                }
            }
        }
        max_d
    }

    /// Universal failsafe: validates EVERY candidate move (not just Goddess moves).
    /// If the proposed move allows the Goddess to be captured next turn, it ignores
    /// the move and hunts down the `scored_moves` list for a move that keeps her safe.
    /// This gives Diego the ability to block lines of sight and prevents him from
    /// moving essential meat shields away.
    fn universal_failsafe(
        &self,
        state: &GameState,
        candidate: AgentMove,
        scored_moves: &[(String, String, f64, bool)],
        pass_allowed: bool,
    ) -> AgentMove {
        let mut my_goddess_id = String::new();
        for (id, p) in &state.board.pieces {
            if p.side == state.turn && p.piece_type == PieceType::Goddess && p.position != "graveyard" && p.position != "returned" {
                my_goddess_id = id.clone();
                break;
            }
        }

        // No goddess on board, return candidate as-is
        if my_goddess_id.is_empty() {
            return candidate;
        }

        let enemy_side = if state.turn == Side::White { Side::Black } else { Side::White };
        let budget_ms = 10; // Rapid simulation budget, down from 20 to handle iterating

        // 1. Is the candidate target safe?
        if let AgentMove::Move { piece, target } = &candidate {
            let mut test_state = state.clone();
            apply_move(&mut test_state, piece, target);
            if self.find_threats_to_piece(&test_state, &my_goddess_id, enemy_side, budget_ms).is_empty() {
                return candidate;
            }
        } else {
            // If the candidate is a PASS, simulate if passing is safe.
            let test_state = state.clone();
            if self.find_threats_to_piece(&test_state, &my_goddess_id, enemy_side, budget_ms).is_empty() {
                return candidate;
            }
        }

        // 2. Candidate failed the safety check! Sweep through ALL scored moves to find a block/escape
        for (piece, target, _score, _ends) in scored_moves {
            let mut test_state = state.clone();
            apply_move(&mut test_state, piece, target);
            if self.find_threats_to_piece(&test_state, &my_goddess_id, enemy_side, budget_ms).is_empty() {
                return AgentMove::Move {
                    piece: piece.clone(),
                    target: target.clone(),
                };
            }
        }

        // 3. Desperation fallback: no safe moves exist, accept our fate
        if pass_allowed {
            AgentMove::Pass
        } else {
            candidate 
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Step 1-a: Lightweight random rollout for color look-ahead
    // ────────────────────────────────────────────────────────────────────────

    /// Run random rollouts from a state where a color has been chosen.
    /// Returns true if any rollout leads to a goddess capture within the
    /// current turn (before the turn switches to the opponent).
    fn color_leads_to_win(&self, state: &GameState, color: &str) -> bool {
        let budget = Duration::from_millis(self.mcts_color_budget_ms);
        let start = Instant::now();
        let perspective = state.turn;

        while start.elapsed() < budget {
            let mut sim = state.clone();
            sim.color_chosen.insert(perspective, color.to_lowercase());
            sim.is_new_turn = false;

            // Play random moves for the current side until the turn switches
            let mut steps = 0;
            while sim.turn == perspective && sim.phase == GamePhase::Playing && steps < 50 {
                steps += 1;
                let eligible = sim.get_eligible_piece_ids();
                let mut all_moves: HashMap<String, Vec<String>> = HashMap::new();
                for p_id in &eligible {
                    let moves = get_legal_moves(&sim, p_id);
                    if !moves.is_empty() {
                        all_moves.insert(p_id.clone(), moves);
                    }
                }

                if all_moves.is_empty() {
                    break;
                }

                let mut rng = rand::rng();
                let p_id = all_moves.keys().choose(&mut rng).unwrap().clone();
            let target = all_moves[&p_id].iter().choose(&mut rng).unwrap().clone();

                let was_returned = sim.board.pieces[&p_id].position == "returned";
                let captured = apply_move(&mut sim, &p_id, &target);
                let goddess_captured = captured.contains(&PieceType::Goddess);
                if goddess_captured {
                    return true;
                }
                apply_move_turnover(&mut sim, &p_id, &target, false, captured.is_empty(), was_returned);
            }
        }
        false
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Step 1-a.5: Threat simulation (Escape Goddess priority)
    // ────────────────────────────────────────────────────────────────────────

    fn find_threats_to_piece(&self, state: &GameState, target_piece_id: &str, enemy_side: Side, max_budget_ms: u64) -> std::collections::HashSet<String> {
        let budget = Duration::from_millis(max_budget_ms);
        let start = Instant::now();
        let mut threats = std::collections::HashSet::new();

        while start.elapsed() < budget {
            let mut sim = state.clone();
            sim.turn = enemy_side;
            sim.is_new_turn = true;
            
            let valid_colors = get_legal_colors(&sim, &enemy_side);
            if !valid_colors.is_empty() {
                let mut rng = rand::rng();
                let c = valid_colors.iter().choose(&mut rng).unwrap().clone();
                sim.color_chosen.insert(enemy_side, c.to_lowercase());
            }
            sim.is_new_turn = false;

            let mut steps = 0;
            while sim.turn == enemy_side && sim.phase == GamePhase::Playing && steps < 50 {
                steps += 1;
                let eligible = sim.get_eligible_piece_ids();
                let mut all_moves: HashMap<String, Vec<String>> = HashMap::new();
                for p_id in &eligible {
                    let moves = get_legal_moves(&sim, p_id);
                    if !moves.is_empty() {
                        all_moves.insert(p_id.clone(), moves);
                    }
                }

                if all_moves.is_empty() {
                    break;
                }

                let mut rng = rand::rng();
                let p_id = all_moves.keys().choose(&mut rng).unwrap().clone();
                let target = all_moves[&p_id].iter().choose(&mut rng).unwrap().clone();

                let was_returned = sim.board.pieces[&p_id].position == "returned";
                let captured = apply_move(&mut sim, &p_id, &target);
                
                if sim.board.pieces.get(target_piece_id).map(|p| p.position == "graveyard").unwrap_or(true) {
                    threats.insert(p_id.clone());
                    break;
                }
                
                apply_move_turnover(&mut sim, &p_id, &target, false, captured.is_empty(), was_returned);
            }
        }
        threats
    }

    fn move_neutralizes_threats(state: &GameState, p_id: &str, target: &str, threats: &std::collections::HashSet<String>) -> std::collections::HashSet<String> {
        let mut neutralized = std::collections::HashSet::new();
        let p_type = &state.board.pieces[p_id].piece_type;
        let my_side = state.turn;
        
        // Direct capture
        if let Some(occ_id) = state.occupancy.get(target) {
            if threats.contains(occ_id) {
                neutralized.insert(occ_id.clone());
            }
        }
        
        // AoE capture
        if *p_type == PieceType::Witch || *p_type == PieceType::Mage {
            for n in state.get_slide_neighbors(target) {
                if let Some(occ_id) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[occ_id];
                    if threats.contains(occ_id) && np.piece_type != PieceType::Minotaur && np.side != my_side {
                        neutralized.insert(occ_id.clone());
                    }
                }
            }
        }
        
        // Immobilization
        if *p_type == PieceType::Siren {
            for n in state.get_slide_neighbors(target) {
                if let Some(occ_id) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[occ_id];
                    if np.side != my_side && threats.contains(occ_id) {
                        neutralized.insert(occ_id.clone());
                    }
                }
            }
        }
        
        neutralized
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Step 1-b: Color heuristic scoring
    // ────────────────────────────────────────────────────────────────────────

    fn score_color(&self, state: &GameState, color: &str) -> f64 {
        let mut sim = state.clone();
        sim.color_chosen.insert(state.turn, color.to_lowercase());
        sim.is_new_turn = false;
        let chosen_lc = color.to_lowercase();

        let perspective = state.turn;
        let enemy = if perspective == Side::White { Side::Black } else { Side::White };

        let eligible = sim.get_eligible_piece_ids();

        // [0] Count of pieces that can be moved
        let mut moveable_count: f64 = 0.0;
        // [1] Count of moves that don't end the turn
        let mut non_ending_moves: f64 = 0.0;
        // [2] Count of enemy pieces that can be taken
        let mut capturable_enemies: f64 = 0.0;
        // [3] Count of enemy pieces takeable on non-ending color
        let mut capturable_non_ending: f64 = 0.0;

        for p_id in &eligible {
            let moves = get_legal_moves(&sim, p_id);
            if !moves.is_empty() {
                moveable_count += 1.0;
            }
            for target in &moves {
                let target_color = sim.board.polygons.get(target)
                    .map(|p| p.color.to_lowercase())
                    .unwrap_or_default();
                let ends_turn = Self::would_end_turn(&sim, p_id, target);

                if !ends_turn {
                    non_ending_moves += 1.0;
                }

                // Check if this move captures an enemy
                if let Some(occ_id) = sim.occupancy.get(target) {
                    let occ = &sim.board.pieces[occ_id];
                    if occ.side == enemy {
                        capturable_enemies += 1.0;
                        if target_color != chosen_lc {
                            capturable_non_ending += 1.0;
                        }
                    }
                }
            }
        }

        self.weights[0] * moveable_count
            + self.weights[1] * non_ending_moves
            + self.weights[2] * capturable_enemies
            + self.weights[3] * capturable_non_ending
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Step 2-e: Move heuristic scoring
    // ────────────────────────────────────────────────────────────────────────

    fn score_move(&self, state: &GameState, piece_id: &str, target_poly: &str) -> f64 {
        let piece = &state.board.pieces[piece_id];
        let piece_type = &piece.piece_type;
        let my_side = piece.side;
        let chosen = Self::chosen_color(state);
        let target_color = state.board.polygons.get(target_poly)
            .map(|p| p.color.to_lowercase())
            .unwrap_or_default();
        let ends_turn = Self::would_end_turn(state, piece_id, target_poly);

        let captures = Self::simulate_captures(state, piece_id, target_poly);

        let mut score = 0.0;

        // --- Capture-specific scores ---
        for cap in &captures {
            match cap {
                PieceType::Mage => {
                    score += self.weights[4]; // [4] taking a mage
                    if ends_turn {
                        score += self.weights[5]; // [5] taking a mage, ending turn
                    }
                }
                PieceType::Heroe => {
                    score += self.weights[6]; // [6] taking a heroe
                    if ends_turn {
                        score += self.weights[7]; // [7] taking a heroe, ending turn
                    }
                }
                PieceType::Witch => {
                    score += self.weights[8]; // [8] taking a witch
                    if ends_turn {
                        score += self.weights[9]; // [9] taking a witch, ending turn
                    }
                }
                PieceType::Siren => {
                    score += self.weights[10]; // [10] taking a siren
                    if ends_turn {
                        score += self.weights[11]; // [11] taking a siren, ending turn
                    }
                }
                _ => {}
            }

            // Generic enemy capture
            score += self.weights[20]; // [20] taking any enemy
            if ends_turn {
                score += self.weights[21]; // [21] taking any enemy, ending turn
            }
        }

        // --- Siren immobilisation scores ---
        if *piece_type == PieceType::Siren {
            let immobilised = Self::siren_would_immobilise(state, target_poly, my_side);
            let on_non_chosen = target_color != chosen;

            for imm in &immobilised {
                match imm {
                    PieceType::Mage => {
                        score += self.weights[12]; // [12] siren immobilising mage
                        if on_non_chosen {
                            score += self.weights[13]; // [13] ... on non-chosen color
                        }
                    }
                    PieceType::Heroe => {
                        score += self.weights[14]; // [14] siren immobilising heroe
                        if on_non_chosen {
                            score += self.weights[15]; // [15] ... on non-chosen color
                        }
                    }
                    PieceType::Witch => {
                        score += self.weights[16]; // [16] siren immobilising witch
                        if on_non_chosen {
                            score += self.weights[17]; // [17] ... on non-chosen color
                        }
                    }
                    PieceType::Siren => {
                        score += self.weights[18]; // [18] siren immobilising siren
                        if on_non_chosen {
                            score += self.weights[19]; // [19] ... on non-chosen color
                        }
                    }
                    _ => {}
                }
            }
        }

        // --- Mage deployment safety ---
        // When deploying the Mage from reserve, strongly penalise targets that have
        // enemy pieces in their slide neighbourhood. A freshly deployed Mage is
        // immediately capturable and loses its AoE value before it can act.
        if piece.position == "returned" && *piece_type == PieceType::Mage {
            let enemy = if my_side == Side::White { Side::Black } else { Side::White };
            let has_adjacent_enemy = state.get_slide_neighbors(target_poly).iter().any(|n| {
                state.occupancy.get(n)
                    .map(|occ_id| state.board.pieces[occ_id].side == enemy)
                    .unwrap_or(false)
            });
            if has_adjacent_enemy {
                score -= 1000.0;
            }
        }

        // --- Distance to enemy goddess ---
        // Excluded for the Goddess herself: moving toward the enemy Goddess is never
        // desirable for the Goddess piece and was causing it to wander aggressively.
        if *piece_type != PieceType::Goddess {
            if let Some(ref goddess_pos) = Self::enemy_goddess_pos(state) {
                let piece_pos = &piece.position;
                if piece_pos != "returned" && piece_pos != "graveyard" {
                    let dist_before = Self::poly_distance(state, piece_pos, goddess_pos);
                    let dist_after = Self::poly_distance(state, target_poly, goddess_pos);
                    let max_d = Self::max_board_distance(state);
                    // Normalise: +1 = getting closer, -1 = getting away
                    let normalised = if max_d > 0.0 {
                        ((dist_before - dist_after) / max_d).clamp(-1.0, 1.0)
                    } else {
                        0.0
                    };
                    score += self.weights[22] * normalised; // [22] distance heuristic
                }
            }
        }

        score
    }
}

impl Drop for QuickDiegoAgent {
    fn drop(&mut self) {
        // Flush any remaining data if the game ended without calling record_winner
        if self.record_data && !self.data_dir.is_empty() {
            let buffer = self.game_buffer.lock().unwrap();
            if !buffer.is_empty() {
                drop(buffer); // release lock before flush
                self.flush_buffer(None);
            }
        }
    }
}

impl Agent for QuickDiegoAgent {
    fn name(&self) -> &str {
        "QuickDiego"
    }

    fn choose_color<'a>(&self, state: &GameState, valid_colors: &'a [String]) -> &'a String {
        if valid_colors.len() == 1 {
            // Still record for the value head (pi will be all-zero since there's
            // no choice to encode, but z will be useful for training)
            self.record_decision(state, &format!("COLOR:{}", valid_colors[0]));
            return &valid_colors[0];
        }

        // Step 1-a: check if any color leads to a direct goddess capture
        for color in valid_colors {
            if self.color_leads_to_win(state, color) {
                self.record_decision(state, &format!("COLOR:{}", color));
                return color;
            }
        }

        // Step 1-b: score each color using heuristics
        let mut best_idx = 0;
        let mut best_score = f64::NEG_INFINITY;
        for (idx, color) in valid_colors.iter().enumerate() {
            let score = self.score_color(state, color);
            if score > best_score {
                best_score = score;
                best_idx = idx;
            }
        }
        self.record_decision(state, &format!("COLOR:{}", valid_colors[best_idx]));
        &valid_colors[best_idx]
    }

    fn record_winner(&self, winner: Option<crate::models::Side>) {
        if self.record_data && !self.data_dir.is_empty() {
            self.flush_buffer(winner);
        }
    }

    fn choose_move(
        &self,
        state: &GameState,
        all_moves: &HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> AgentMove {
        // ── Step 0: Setup phase → placement ──
        if state.phase == GamePhase::Setup {
            let placements = get_setup_legal_placements(state);

            let safe_moves: std::collections::HashMap<String, Vec<String>> = if !placements.is_empty() {
                placements
            } else {
                all_moves.clone()
            };

            if safe_moves.is_empty() {
                if pass_allowed {
                    self.record_decision(state, "PASS");
                    return AgentMove::Pass;
                }
                return AgentMove::Pass;
            }

            let mut rng = rand::rng();
            let p_id = safe_moves.keys().choose(&mut rng).unwrap().clone();
            let target = safe_moves[&p_id].iter().choose(&mut rng).unwrap().clone();
            let key = format!("{}:{}", p_id, target);
            self.record_decision(state, &key);
            return AgentMove::Move { piece: p_id, target };
        }

        // ── Step 2-a: No moves → pass ──
        if all_moves.is_empty() {
            return AgentMove::Pass;
        }

        let chosen = Self::chosen_color(state);

        // ── Step 2-b: Can capture the goddess? ──
        for (p_id, targets) in all_moves {
            for target in targets {
                let captures = Self::simulate_captures(state, p_id, target);
                if captures.contains(&PieceType::Goddess) {
                    let key = format!("{}:{}", p_id, target);
                    self.record_decision(state, &key);
                    return AgentMove::Move {
                        piece: p_id.clone(),
                        target: target.clone(),
                    };
                }
            }
        }

        // ── Step 2-c: Deploy pieces next to mage (hard priority, must not end turn) ──
        // Priority: Heroe > Soldier > others
        // Find friendly mages on the board
        let mut mage_positions = Vec::new();
        for p in state.board.pieces.values() {
            if p.side == state.turn && p.piece_type == PieceType::Mage
                && p.position != "returned" && p.position != "graveyard"
            {
                mage_positions.push(p.position.clone());
            }
        }

        if !mage_positions.is_empty() {
            // Collect all valid (piece, target) deployments adjacent to a mage
            let mut mage_adj_deploys: Vec<(String, String, u8)> = Vec::new();
            for (p_id, targets) in all_moves {
                let piece = &state.board.pieces[p_id];
                if piece.position != "returned" {
                    continue;
                }
                // Assign priority: 0 = Heroe (best), 1 = Soldier, 2 = others
                let priority = match piece.piece_type {
                    PieceType::Heroe => 0,
                    PieceType::Soldier => 1,
                    _ => 2,
                };
                for target in targets {
                    let is_adj_mage = mage_positions.iter().any(|mage_pos| {
                        state.get_slide_neighbors(mage_pos).contains(target)
                    });
                    if is_adj_mage && !Self::would_end_turn(state, p_id, target) {
                        mage_adj_deploys.push((p_id.clone(), target.clone(), priority));
                    }
                }
            }
            // Sort by priority (lowest = best)
            mage_adj_deploys.sort_by_key(|(_p, _t, prio)| *prio);
            if let Some((piece, target, _)) = mage_adj_deploys.first() {
                let key = format!("{}:{}", piece, target);
                self.record_decision(state, &key);
                return AgentMove::Move {
                    piece: piece.clone(),
                    target: target.clone(),
                };
            }
        }

        // ── Step 2-c.5: Escape goddess if needed ──
        let escape_goddess_active = true;
        if escape_goddess_active {
            let mut my_goddess_id = String::new();
            for (id, p) in &state.board.pieces {
                if p.side == state.turn && p.piece_type == PieceType::Goddess && p.position != "graveyard" && p.position != "returned" {
                    my_goddess_id = id.clone();
                    break;
                }
            }

            if !my_goddess_id.is_empty() {
                let enemy_side = if state.turn == Side::White { Side::Black } else { Side::White };
                let budget_ms = self.mcts_color_budget_ms.max(20);
                let threats = self.find_threats_to_piece(state, &my_goddess_id, enemy_side, budget_ms);
                
                if !threats.is_empty() {
                    // 1. Try to capture threats without ending our turn
                    let mut best_non_ending_capture: Option<(String, String, f64)> = None;
                    for (p_id, targets) in all_moves {
                        for target in targets {
                            let ends_turn = Self::would_end_turn(state, p_id, target);
                            if !ends_turn {
                                let neut = Self::move_neutralizes_threats(state, p_id, target, &threats);
                                if !neut.is_empty() {
                                    let score = self.score_move(state, p_id, target);
                                    if best_non_ending_capture.is_none() || score > best_non_ending_capture.as_ref().unwrap().2 {
                                        best_non_ending_capture = Some((p_id.clone(), target.clone(), score));
                                    }
                                }
                            }
                        }
                    }
                    
                    if let Some((p_id, t_id, _score)) = best_non_ending_capture {
                        let key = format!("{}:{}", p_id, t_id);
                        self.record_decision(state, &key);
                        return AgentMove::Move { piece: p_id, target: t_id };
                    }
                    
                    // 2. Try to capture or immobilize all remaining threats with a siren, 
                    // providing she survives the next turn
                    let mut best_siren_move: Option<(String, String, f64)> = None;
                    for (p_id, targets) in all_moves {
                        let p = &state.board.pieces[p_id];
                        if p.piece_type == PieceType::Siren {
                            for target in targets {
                                let neut = Self::move_neutralizes_threats(state, p_id, target, &threats);
                                let neutralizes_all = threats.iter().all(|t| neut.contains(t));
                                
                                if neutralizes_all {
                                    let mut test_state = state.clone();
                                    apply_move(&mut test_state, p_id, target);
                                    
                                    let siren_threats = self.find_threats_to_piece(&test_state, p_id, enemy_side, 20);
                                    if siren_threats.is_empty() {
                                        let score = self.score_move(state, p_id, target);
                                        if best_siren_move.is_none() || score > best_siren_move.as_ref().unwrap().2 {
                                            best_siren_move = Some((p_id.clone(), target.clone(), score));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if let Some((p_id, t_id, _score)) = best_siren_move {
                        let key = format!("{}:{}", p_id, t_id);
                        self.record_decision(state, &key);
                        return AgentMove::Move { piece: p_id, target: t_id };
                    }
                    
                    // 3. Flee with the goddess
                    if let Some(targets) = all_moves.get(&my_goddess_id) {
                        let mut best_flee: Option<(String, String, f64)> = None;
                        for target in targets {
                            let mut test_state = state.clone();
                            apply_move(&mut test_state, &my_goddess_id, target);
                            
                            let g_threats = self.find_threats_to_piece(&test_state, &my_goddess_id, enemy_side, 20);
                            
                            if g_threats.is_empty() {
                                let score = self.score_move(state, &my_goddess_id, target);
                                if best_flee.is_none() || score > best_flee.as_ref().unwrap().2 {
                                    best_flee = Some((my_goddess_id.clone(), target.clone(), score));
                                }
                            }
                        }
                        
                        if let Some((p_id, t_id, _score)) = best_flee {
                            let key = format!("{}:{}", p_id, t_id);
                            self.record_decision(state, &key);
                            return AgentMove::Move { piece: p_id, target: t_id };
                        }
                    }
                    
                    // 4. Try any normal turn-ending attack that neutralizes threats and keeps Goddess safe
                    let mut best_ending_save: Option<(String, String, f64)> = None;
                    for (p_id, targets) in all_moves {
                        for target in targets {
                            let neut = Self::move_neutralizes_threats(state, p_id, target, &threats);
                            let neutralizes_all = threats.iter().all(|t| neut.contains(t));
                            
                            if neutralizes_all {
                                let mut test_state = state.clone();
                                apply_move(&mut test_state, p_id, target);
                                let test_threats = self.find_threats_to_piece(&test_state, &my_goddess_id, enemy_side, 20);
                                if test_threats.is_empty() {
                                    let score = self.score_move(state, p_id, target);
                                    if best_ending_save.is_none() || score > best_ending_save.as_ref().unwrap().2 {
                                        best_ending_save = Some((p_id.clone(), target.clone(), score));
                                    }
                                }
                            }
                        }
                    }
                    
                    if let Some((p_id, t_id, _score)) = best_ending_save {
                        let key = format!("{}:{}", p_id, t_id);
                        self.record_decision(state, &key);
                        return AgentMove::Move { piece: p_id, target: t_id };
                    }
                }
            }
        }

        // ── Step 2-d: Soldiers/Minotaurs that can move without ending turn, maximise captures ──
        {
            let mut best_chain_piece = String::new();
            let mut best_chain_target = String::new();
            let mut best_chain_captures: usize = 0;

            for (p_id, targets) in all_moves {
                let piece = &state.board.pieces[p_id];
                let is_chainable = piece.piece_type == PieceType::Soldier
                    || piece.piece_type == PieceType::Minotaur;
                if !is_chainable {
                    continue;
                }
                for target in targets {
                    if Self::would_end_turn(state, p_id, target) {
                        continue;
                    }
                    let captures = Self::simulate_captures(state, p_id, target);
                    let cap_count = captures.len();
                    if cap_count > 0 && (cap_count > best_chain_captures || best_chain_piece.is_empty())
                    {
                        best_chain_captures = cap_count;
                        best_chain_piece = p_id.clone();
                        best_chain_target = target.clone();
                    }
                }
            }

            if !best_chain_piece.is_empty() {
                let key = format!("{}:{}", best_chain_piece, best_chain_target);
                self.record_decision(state, &key);
                return AgentMove::Move {
                    piece: best_chain_piece,
                    target: best_chain_target,
                };
            }
        }

        // ── Step 2-e: Score all remaining (piece, target) pairs ──
        let mut scored_moves: Vec<(String, String, f64, bool)> = Vec::new();

        for (p_id, targets) in all_moves {
            for target in targets {
                let score = self.score_move(state, p_id, target);
                let ends = Self::would_end_turn(state, p_id, target);
                scored_moves.push((p_id.clone(), target.clone(), score, ends));
            }
        }

        // Sort by score descending
        scored_moves.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

        // Pick best move that does NOT end the turn
        for (piece, target, _score, ends) in &scored_moves {
            if !ends {
                let candidate = AgentMove::Move {
                    piece: piece.clone(),
                    target: target.clone(),
                };
                let result = self.universal_failsafe(state, candidate, &scored_moves, pass_allowed);
                let key = match &result {
                    AgentMove::Move { piece, target } => format!("{}:{}", piece, target),
                    AgentMove::Pass => "PASS".to_string(),
                };
                self.record_decision(state, &key);
                return result;
            }
        }

        // All moves end the turn.
        // LOBBY PRIORITY: If we must end the turn, prefer deploying the Mage if possible.
        for (piece, target, _score, _ends) in &scored_moves {
            let p = &state.board.pieces[piece];
            if p.piece_type == PieceType::Mage && p.position == "returned" {
                let key = format!("{}:{}", piece, target);
                self.record_decision(state, &key);
                return AgentMove::Move {
                    piece: piece.clone(),
                    target: target.clone(),
                };
            }
        }

        // Otherwise, pick the best overall ending move (with goddess failsafe)
        if let Some((piece, target, _score, _ends)) = scored_moves.first() {
            let candidate = AgentMove::Move {
                piece: piece.clone(),
                target: target.clone(),
            };
            let result = self.universal_failsafe(state, candidate, &scored_moves, pass_allowed);
            let key = match &result {
                AgentMove::Move { piece, target } => format!("{}:{}", piece, target),
                AgentMove::Pass => "PASS".to_string(),
            };
            self.record_decision(state, &key);
            return result;
        }

        // Fallback: pass if allowed, otherwise pick any move
        if pass_allowed {
            self.record_decision(state, "PASS");
            AgentMove::Pass
        } else {
            let p_id = all_moves.keys().next().unwrap().clone();
            let target = all_moves[&p_id][0].clone();
            let key = format!("{}:{}", p_id, target);
            self.record_decision(state, &key);
            AgentMove::Move { piece: p_id, target }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_board;

    fn setup_test_board() -> GameState {
        let json = r#"{
            "allPolygons": {
                "p1": {"id": 1, "name": "p1", "color": "Blue", "shape": "hex", "center": [0,0], "points": [], "neighbors": ["p2", "p3"], "neighbours": ["p3"]},
                "p2": {"id": 2, "name": "p2", "color": "Yellow", "shape": "hex", "center": [1,0], "points": [], "neighbors": ["p1"], "neighbours": []},
                "p3": {"id": 3, "name": "p3", "color": "Blue", "shape": "hex", "center": [2,0], "points": [], "neighbors": [], "neighbours": ["p1"]}
            },
            "allPieces": {
                "w_goddess": {"id": "w_goddess", "type": "goddess", "side": "white", "position": "p1"},
                "b_goddess": {"id": "b_goddess", "type": "goddess", "side": "black", "position": "p2"}
            },
            "allEdges": {}
        }"#;
        let board = parse_board(json).unwrap();
        GameState::new(board)
    }

    #[test]
    fn test_quick_diego_name() {
        let agent = QuickDiegoAgent::new([1.0; NUM_PARAMS], 100);
        assert_eq!(agent.name(), "QuickDiego");
    }

    #[test]
    fn test_quick_diego_choose_color() {
        let mut gs = setup_test_board();
        gs.is_new_turn = true;
        gs.phase = GamePhase::Playing;
        let agent = QuickDiegoAgent::new([1.0; NUM_PARAMS], 50);
        let valid_colors = vec!["Blue".to_string(), "Yellow".to_string()];
        let c = agent.choose_color(&gs, &valid_colors);
        assert!(valid_colors.contains(c));
    }

    #[test]
    fn test_quick_diego_choose_move_captures_goddess() {
        let mut gs = setup_test_board();
        gs.phase = GamePhase::Playing;
        gs.color_chosen.insert(Side::White, "blue".to_string());
        gs.is_new_turn = false;
        let agent = QuickDiegoAgent::new([1.0; NUM_PARAMS], 50);

        // w_goddess on p1, b_goddess on p2. p1 neighbours (jump) = p3.
        // p1 (slide) neighbors = [p2, p3]. Goddess range is 2-jump.
        // p2 is a slide neighbor of p1, and goddess has 2-jump range.
        let mut all_moves = HashMap::new();
        all_moves.insert("w_goddess".to_string(), vec!["p2".to_string()]);

        let m = agent.choose_move(&gs, &all_moves, false);
        match m {
            AgentMove::Move { piece, target } => {
                assert_eq!(piece, "w_goddess");
                assert_eq!(target, "p2"); // Should capture goddess
            }
            AgentMove::Pass => panic!("Expected a move, got pass"),
        }
    }

    #[test]
    fn test_would_end_turn_soldier_on_chosen() {
        let mut gs = setup_test_board();
        gs.phase = GamePhase::Playing;
        gs.color_chosen.insert(Side::White, "blue".to_string());
        gs.is_new_turn = false;

        // Add a white soldier on p2 (Yellow)
        gs.board.pieces.insert("w_soldier_0".to_string(), crate::models::Piece {
            id: "w_soldier_0".to_string(),
            piece_type: PieceType::Soldier,
            side: Side::White,
            position: "p2".to_string(),
        });
        gs.occupancy.insert("p2".to_string(), "w_soldier_0".to_string());

        // Soldier moving to p1 (Blue = chosen) should NOT end turn (chainable)
        assert!(!QuickDiegoAgent::would_end_turn(&gs, "w_soldier_0", "p1"));

        // Goddess moving to p3 (Blue = chosen) SHOULD end turn
        assert!(QuickDiegoAgent::would_end_turn(&gs, "w_goddess", "p3"));
    }

    #[test]
    fn test_quick_diego_prioritizes_mage_deployment_on_forced_end() {
        let mut gs = setup_test_board();
        gs.phase = GamePhase::Playing;
        gs.color_chosen.insert(Side::White, "blue".to_string());
        gs.is_new_turn = false;

        // Add a white Hero on board (p1)
        gs.board.pieces.insert("w_heroe".to_string(), crate::models::Piece {
            id: "w_heroe".to_string(),
            piece_type: PieceType::Heroe,
            side: Side::White,
            position: "p1".to_string(),
        });
        gs.occupancy.insert("p1".to_string(), "w_heroe".to_string());

        // Add a white Mage in returned state
        gs.board.pieces.insert("w_mage".to_string(), crate::models::Piece {
            id: "w_mage".to_string(),
            piece_type: PieceType::Mage,
            side: Side::White,
            position: "returned".to_string(),
        });

        // Moves:
        // 1. Hero moves from p1 (Blue) to p3 (Blue) -> Ends turn. (High score)
        // 2. Mage deploys to p1 (Blue) -> Ends turn. (Low score)
        let mut all_moves = HashMap::new();
        all_moves.insert("w_heroe".to_string(), vec!["p3".to_string()]);
        all_moves.insert("w_mage".to_string(), vec!["p1".to_string()]);

        // Use weights that favor distance (so Hero move gets higher score)
        let mut weights = [0.0; NUM_PARAMS];
        weights[22] = 100.0; // Distance heuristic
        let agent = QuickDiegoAgent::new(weights, 50);

        let m = agent.choose_move(&gs, &all_moves, false);
        match m {
            AgentMove::Move { piece, target } => {
                assert_eq!(piece, "w_mage", "Should prioritize Mage deployment even if Hero move exists");
                assert_eq!(target, "p1");
            }
            AgentMove::Pass => panic!("Expected a move, got pass"),
        }
    }
}
