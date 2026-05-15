use crate::agents::{Agent, AgentMove};
use crate::engine::{
    get_legal_moves, get_polys_within_distance_jump, GameState, GamePhase,
    apply_move, apply_move_turnover, get_setup_legal_placements,
};
use crate::models::{Side, PieceType};
use rand::seq::IteratorRandom;
use std::collections::HashMap;

/// 33-parameter layout (matches ImprudentKlaus for cross-compatibility):
///   [0]  color: moveable pieces count
///   [1]  color: non-turn-ending moves count
///   [2]  color: capturable enemy pieces
///   [3]  color: capturable enemies on non-ending color
///   [4]  move: taking a mage
///   [5]  move: taking a mage + ending turn
///   [6]  move: taking a heroe
///   [7]  move: taking a heroe + ending turn
///   [8]  move: taking a witch
///   [9]  move: taking a witch + ending turn
///   [10] move: taking a siren
///   [11] move: taking a siren + ending turn
///   [12] move: siren immobilising a mage
///   [13] move: siren immobilising a mage on non-chosen
///   [14] move: siren immobilising a heroe
///   [15] move: siren immobilising a heroe on non-chosen
///   [16] move: siren immobilising a witch
///   [17] move: siren immobilising a witch on non-chosen
///   [18] move: siren immobilising a siren
///   [19] move: siren immobilising a siren on non-chosen
///   [20] move: taking any enemy piece
///   [21] move: taking any enemy + ending turn
///   [22] move: distance to enemy goddess (normalised)
///   [23] move: goddess self-safety delta (normalised)
///   [24..32] spare
pub const NUM_PARAMS: usize = 33;

/// Piece material values for alpha-beta evaluation
fn piece_value(pt: &PieceType) -> f64 {
    match pt {
        PieceType::Goddess  => 10_000.0,
        PieceType::Mage     => 500.0,
        PieceType::Heroe    => 400.0,
        PieceType::Witch    => 300.0,
        PieceType::Siren    => 300.0,
        PieceType::Minotaur => 150.0,
        PieceType::Ghoul    => 120.0,
        _                   => 100.0,
    }
}

pub struct BetterMarioAgent {
    pub weights: [f64; NUM_PARAMS],
}

impl BetterMarioAgent {
    pub fn new(weights: [f64; NUM_PARAMS]) -> Self { Self { weights } }

    // ── Helpers ─────────────────────────────────────────────────────────────

    fn chosen_color(state: &GameState) -> String {
        state.color_chosen.get(&state.turn).cloned().unwrap_or_default()
    }

    fn would_end_turn(state: &GameState, piece_id: &str, target: &str) -> bool {
        let chosen = Self::chosen_color(state);
        if chosen.is_empty() { return false; }
        let target_color = state.board.polygons.get(target)
            .map(|p| p.color.to_lowercase()).unwrap_or_default();
        let piece = &state.board.pieces[piece_id];
        let chainable = piece.piece_type == PieceType::Soldier
            || piece.piece_type == PieceType::Minotaur;
        if piece.position == "returned" { return target_color == chosen; }
        if state.is_siren_pinned(target, state.turn) && target_color == chosen { return true; }
        if target_color == chosen { return !chainable; }
        false
    }

    fn simulate_captures(state: &GameState, piece_id: &str, target: &str) -> Vec<PieceType> {
        let piece = &state.board.pieces[piece_id];
        let my_side = piece.side;
        let pt = piece.piece_type.clone();
        let mut captured = Vec::new();
        if let Some(def_id) = state.occupancy.get(target) {
            let def = &state.board.pieces[def_id];
            if def.side != my_side && def.piece_type != PieceType::Minotaur {
                captured.push(def.piece_type.clone());
            }
        }
        if pt == PieceType::Witch {
            for n in state.get_slide_neighbors(target) {
                if let Some(oid) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[oid];
                    if np.side != my_side && np.piece_type != PieceType::Minotaur {
                        captured.push(np.piece_type.clone());
                    }
                }
            }
        }
        if pt == PieceType::Mage && !captured.is_empty() {
            let enemy = if my_side == Side::White { Side::Black } else { Side::White };
            for n in state.get_slide_neighbors(target) {
                if let Some(oid) = state.occupancy.get(&n) {
                    let np = &state.board.pieces[oid];
                    if np.side == enemy && np.piece_type != PieceType::Minotaur {
                        captured.push(np.piece_type.clone());
                    }
                }
            }
        }
        captured
    }

    fn siren_immobilises(state: &GameState, target: &str, my_side: Side) -> Vec<PieceType> {
        state.get_slide_neighbors(target).into_iter().filter_map(|n| {
            state.occupancy.get(&n).map(|oid| &state.board.pieces[oid])
                .filter(|p| p.side != my_side)
                .map(|p| p.piece_type.clone())
        }).collect()
    }

    fn poly_dist(state: &GameState, a: &str, b: &str) -> f64 {
        match (state.board.polygons.get(a), state.board.polygons.get(b)) {
            (Some(pa), Some(pb)) => {
                let dx = pa.center[0] - pb.center[0];
                let dy = pa.center[1] - pb.center[1];
                (dx*dx + dy*dy).sqrt()
            }
            _ => 999.0,
        }
    }

    fn max_board_dist(state: &GameState) -> f64 {
        let polys: Vec<&str> = state.board.polygons.keys().map(|s| s.as_str()).collect();
        let mut max_d = 1.0_f64;
        for &a in polys.iter().take(20) {
            for &b in polys.iter().rev().take(20) {
                let d = Self::poly_dist(state, a, b);
                if d > max_d { max_d = d; }
            }
        }
        max_d
    }

    fn enemy_goddess_pos(state: &GameState) -> Option<String> {
        let enemy = if state.turn == Side::White { Side::Black } else { Side::White };
        state.board.pieces.values().find(|p|
            p.side == enemy && p.piece_type == PieceType::Goddess
            && p.position != "returned" && p.position != "graveyard"
        ).map(|p| p.position.clone())
    }

    fn goddess_safety(state: &GameState, poly: &str) -> f64 {
        let enemy = if state.turn == Side::White { Side::Black } else { Side::White };
        let mut dists: Vec<f64> = state.board.pieces.values()
            .filter(|p| p.side == enemy && p.position != "returned" && p.position != "graveyard")
            .map(|p| Self::poly_dist(state, poly, &p.position))
            .collect();
        dists.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let mut score: f64 = dists.iter().take(5).sum();
        if let Some(p) = state.board.polygons.get(poly) {
            let nc = std::cmp::max(p.neighbors.len(), p.neighbours.len());
            if nc < 6 { score += 100.0; }
        }
        score
    }

    fn goddess_threatened(state: &GameState, pos: &str) -> bool {
        let enemy = if state.turn == Side::White { Side::Black } else { Side::White };
        state.board.pieces.values().any(|p| {
            if p.side != enemy || p.position == "returned" || p.position == "graveyard" { return false; }
            if state.is_siren_pinned(&p.position, p.side) { return false; }
            match p.piece_type {
                PieceType::Siren | PieceType::Witch => false,
                PieceType::Soldier | PieceType::Minotaur | PieceType::Ghoul =>
                    state.get_slide_neighbors(&p.position).contains(&pos.to_string()),
                PieceType::Goddess =>
                    get_polys_within_distance_jump(&state.board, &p.position, 2).contains(&pos.to_string()),
                PieceType::Heroe =>
                    get_polys_within_distance_jump(&state.board, &p.position, 3).contains(&pos.to_string()),
                PieceType::Mage => {
                    let sc = state.board.polygons.get(&p.position).map(|x| x.color.clone()).unwrap_or_default();
                    let tc = state.board.polygons.get(pos).map(|x| x.color.clone()).unwrap_or_default();
                    tc != sc && get_polys_within_distance_jump(&state.board, &p.position, 3).contains(&pos.to_string())
                }
            }
        })
    }

    // ── Move/color scoring ──────────────────────────────────────────────────

    fn score_color(&self, state: &GameState, color: &str) -> f64 {
        let mut sim = state.clone();
        sim.color_chosen.insert(state.turn, color.to_lowercase());
        sim.is_new_turn = false;
        let chosen_lc = color.to_lowercase();
        let enemy = if state.turn == Side::White { Side::Black } else { Side::White };
        let eligible = sim.get_eligible_piece_ids();
        let mut moveable = 0.0_f64;
        let mut non_ending = 0.0_f64;
        let mut capturable = 0.0_f64;
        let mut cap_non_ending = 0.0_f64;
        for pid in &eligible {
            let moves = get_legal_moves(&sim, pid);
            if !moves.is_empty() { moveable += 1.0; }
            for t in &moves {
                let tc = sim.board.polygons.get(t).map(|p| p.color.to_lowercase()).unwrap_or_default();
                let ends = Self::would_end_turn(&sim, pid, t);
                if !ends { non_ending += 1.0; }
                if let Some(oid) = sim.occupancy.get(t) {
                    if sim.board.pieces[oid].side == enemy {
                        capturable += 1.0;
                        if tc != chosen_lc { cap_non_ending += 1.0; }
                    }
                }
            }
        }
        self.weights[0]*moveable + self.weights[1]*non_ending
            + self.weights[2]*capturable + self.weights[3]*cap_non_ending
    }

    fn score_move(&self, state: &GameState, piece_id: &str, target: &str) -> f64 {
        let piece = &state.board.pieces[piece_id];
        let pt = &piece.piece_type;
        let my_side = piece.side;
        let chosen = Self::chosen_color(state);
        let tc = state.board.polygons.get(target).map(|p| p.color.to_lowercase()).unwrap_or_default();
        let ends = Self::would_end_turn(state, piece_id, target);
        let captures = Self::simulate_captures(state, piece_id, target);
        let mut score = 0.0_f64;

        for cap in &captures {
            match cap {
                PieceType::Mage  => { score += self.weights[4]; if ends { score += self.weights[5]; } }
                PieceType::Heroe => { score += self.weights[6]; if ends { score += self.weights[7]; } }
                PieceType::Witch => { score += self.weights[8]; if ends { score += self.weights[9]; } }
                PieceType::Siren => { score += self.weights[10]; if ends { score += self.weights[11]; } }
                _ => {}
            }
            score += self.weights[20];
            if ends { score += self.weights[21]; }
        }

        if *pt == PieceType::Siren {
            let imm = Self::siren_immobilises(state, target, my_side);
            let on_non_chosen = tc != chosen;
            for i in &imm {
                match i {
                    PieceType::Mage  => { score += self.weights[12]; if on_non_chosen { score += self.weights[13]; } }
                    PieceType::Heroe => { score += self.weights[14]; if on_non_chosen { score += self.weights[15]; } }
                    PieceType::Witch => { score += self.weights[16]; if on_non_chosen { score += self.weights[17]; } }
                    PieceType::Siren => { score += self.weights[18]; if on_non_chosen { score += self.weights[19]; } }
                    _ => {}
                }
            }
        }

        // Penalise deploying Mage adjacent to enemy
        if piece.position == "returned" && *pt == PieceType::Mage {
            let enemy = if my_side == Side::White { Side::Black } else { Side::White };
            if state.get_slide_neighbors(target).iter().any(|n|
                state.occupancy.get(n).map(|oid| state.board.pieces[oid].side == enemy).unwrap_or(false)
            ) { score -= 1000.0; }
        }

        // Distance to enemy goddess
        if *pt != PieceType::Goddess {
            if let Some(ref gpos) = Self::enemy_goddess_pos(state) {
                let pp = &piece.position;
                if pp != "returned" && pp != "graveyard" {
                    let d_before = Self::poly_dist(state, pp, gpos);
                    let d_after  = Self::poly_dist(state, target, gpos);
                    let max_d = Self::max_board_dist(state);
                    let norm = if max_d > 0.0 { ((d_before - d_after) / max_d).clamp(-1.0, 1.0) } else { 0.0 };
                    score += self.weights[22] * norm;
                }
            }
        }

        // Goddess self-safety
        if *pt == PieceType::Goddess && piece.position != "returned" && piece.position != "graveyard" {
            let cur  = Self::goddess_safety(state, &piece.position);
            let next = Self::goddess_safety(state, target);
            let max_d = Self::max_board_dist(state);
            let delta = if max_d > 0.0 { ((next - cur) / max_d).clamp(-1.0, 1.0) } else { 0.0 };
            score += self.weights[23] * delta;
        }

        score
    }

    // ── Static evaluation for alpha-beta ────────────────────────────────────

    fn evaluate(&self, state: &GameState) -> f64 {
        let my  = state.turn;
        let opp = if my == Side::White { Side::Black } else { Side::White };
        let mut val = 0.0_f64;
        for p in state.board.pieces.values() {
            if p.position == "graveyard" { continue; }
            let v = piece_value(&p.piece_type);
            if p.side == my  { val += v; }
            if p.side == opp { val -= v; }
        }
        val
    }

    /// Ordered moves: captures first (by victim value desc), then non-captures.
    fn ordered_moves(state: &GameState, all_moves: &HashMap<String, Vec<String>>) -> Vec<(String, String, bool)> {
        let mut captures: Vec<(f64, String, String)> = Vec::new();
        let mut others:   Vec<(String, String)>       = Vec::new();
        for (pid, targets) in all_moves {
            for t in targets {
                let caps = Self::simulate_captures(state, pid, t);
                if caps.is_empty() {
                    others.push((pid.clone(), t.clone()));
                } else {
                    let total_val: f64 = caps.iter().map(piece_value).sum();
                    captures.push((total_val, pid.clone(), t.clone()));
                }
            }
        }
        captures.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
        let mut result: Vec<(String, String, bool)> = captures.into_iter()
            .map(|(_, p, t)| (p, t, true)).collect();
        result.extend(others.into_iter().map(|(p, t)| (p, t, false)));
        result
    }

    /// Shallow 1-ply look-ahead with alpha-beta pruning.
    /// Cap at MAX_LOOKAHEAD_MOVES candidates to bound cost.
    fn alpha_beta_1ply(
        &self,
        state: &GameState,
        mut alpha: f64,
        beta: f64,
    ) -> f64 {
        if state.phase == GamePhase::GameOver {
            return self.evaluate(state);
        }
        let eligible = state.get_eligible_piece_ids();
        let mut all_moves: HashMap<String, Vec<String>> = HashMap::new();
        for pid in &eligible {
            let mv = get_legal_moves(state, pid);
            if !mv.is_empty() { all_moves.insert(pid.clone(), mv); }
        }
        if all_moves.is_empty() { return self.evaluate(state); }
        let ordered = Self::ordered_moves(state, &all_moves);
        let mut best = f64::NEG_INFINITY;
        // Only search top N moves at this depth
        for (pid, target, _) in ordered.iter().take(20) {
            let mut sim = state.clone();
            let was_returned = sim.board.pieces[pid].position == "returned";
            let captured = apply_move(&mut sim, pid, target);
            if captured.contains(&PieceType::Goddess) { return 9_999_999.0; }
            apply_move_turnover(&mut sim, pid, target, false, captured.is_empty(), was_returned);
            let val = self.evaluate(&sim);
            if val > best { best = val; }
            if val > alpha { alpha = val; }
            if alpha >= beta { break; }
        }
        best
    }

    /// Pick the best root move: ordered captures first, then evaluate
    /// each candidate with a 1-ply look-ahead (depth-2 total).
    fn best_move_ab(&self, state: &GameState, all_moves: &HashMap<String, Vec<String>>) -> AgentMove {
        let ordered = Self::ordered_moves(state, all_moves);
        let mut best_val = f64::NEG_INFINITY;
        let mut best_piece = String::new();
        let mut best_target = String::new();

        for (pid, target, _) in &ordered {
            let mut sim = state.clone();
            let was_returned = sim.board.pieces[pid].position == "returned";
            let captured = apply_move(&mut sim, pid, target);
            if captured.contains(&PieceType::Goddess) {
                return AgentMove::Move { piece: pid.clone(), target: target.clone() };
            }
            apply_move_turnover(&mut sim, pid, target, false, captured.is_empty(), was_returned);

            let val = if sim.turn == state.turn {
                // Still our turn (chain): evaluate directly
                self.evaluate(&sim)
            } else {
                // Opponent's turn: 1-ply opponent search (negamax)
                -self.alpha_beta_1ply(&sim, f64::NEG_INFINITY, f64::INFINITY)
            };

            if val > best_val {
                best_val = val;
                best_piece  = pid.clone();
                best_target = target.clone();
            }
        }

        if best_piece.is_empty() {
            if let Some((pid, tgt, _)) = ordered.first() {
                return AgentMove::Move { piece: pid.clone(), target: tgt.clone() };
            }
            AgentMove::Pass
        } else {
            AgentMove::Move { piece: best_piece, target: best_target }
        }
    }

    /// Goddess failsafe: avoid moving the goddess unless she is threatened
    /// or no other move exists.
    fn goddess_failsafe(
        state: &GameState,
        candidate: AgentMove,
        scored: &[(String, String, f64)],
        pass_allowed: bool,
    ) -> AgentMove {
        let goddess_id = match &candidate {
            AgentMove::Move { piece, .. } => {
                if state.board.pieces[piece].piece_type == PieceType::Goddess { piece.clone() }
                else { return candidate; }
            }
            AgentMove::Pass => return candidate,
        };
        let goddess = &state.board.pieces[&goddess_id];
        if goddess.position == "returned" || goddess.position == "graveyard" { return candidate; }
        if !Self::goddess_threatened(state, &goddess.position) {
            for (piece, target, _) in scored {
                if state.board.pieces[piece].piece_type != PieceType::Goddess {
                    return AgentMove::Move { piece: piece.clone(), target: target.clone() };
                }
            }
            return if pass_allowed { AgentMove::Pass } else { candidate };
        }
        candidate
    }
}

impl Agent for BetterMarioAgent {
    fn name(&self) -> &str { "BetterMario" }

    fn choose_color<'a>(&self, state: &GameState, valid_colors: &'a [String]) -> &'a String {
        if valid_colors.len() == 1 { return &valid_colors[0]; }
        let mut best_idx = 0;
        let mut best_score = f64::NEG_INFINITY;
        for (i, color) in valid_colors.iter().enumerate() {
            let s = self.score_color(state, color);
            if s > best_score { best_score = s; best_idx = i; }
        }
        &valid_colors[best_idx]
    }

    fn choose_move(
        &self,
        state: &GameState,
        all_moves: &HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> AgentMove {
        // ── Setup phase ──────────────────────────────────────────────────────
        if state.phase == GamePhase::Setup {
            let placements = get_setup_legal_placements(state);
            let src = if !placements.is_empty() { placements } else { all_moves.clone() };
            if src.is_empty() { return AgentMove::Pass; }
            let mut rng = rand::rng();
            let pid = src.keys().choose(&mut rng).unwrap().clone();
            let tgt = src[&pid].iter().choose(&mut rng).unwrap().clone();
            return AgentMove::Move { piece: pid, target: tgt };
        }

        if all_moves.is_empty() { return AgentMove::Pass; }

        // ── Step 1: Immediate goddess capture ────────────────────────────────
        for (pid, targets) in all_moves {
            for t in targets {
                if Self::simulate_captures(state, pid, t).contains(&PieceType::Goddess) {
                    return AgentMove::Move { piece: pid.clone(), target: t.clone() };
                }
            }
        }

        // ── Step 2: Deploy next to friendly Mage (Heroe > Soldier > others) ─
        let mage_positions: Vec<String> = state.board.pieces.values()
            .filter(|p| p.side == state.turn && p.piece_type == PieceType::Mage
                && p.position != "returned" && p.position != "graveyard")
            .map(|p| p.position.clone()).collect();

        if !mage_positions.is_empty() {
            let mut deploys: Vec<(String, String, u8)> = Vec::new();
            for (pid, targets) in all_moves {
                let piece = &state.board.pieces[pid];
                if piece.position != "returned" { continue; }
                let prio = match piece.piece_type {
                    PieceType::Heroe => 0, PieceType::Soldier => 1, _ => 2,
                };
                for t in targets {
                    let adj = mage_positions.iter().any(|mp| state.get_slide_neighbors(mp).contains(t));
                    if adj && !Self::would_end_turn(state, pid, t) {
                        deploys.push((pid.clone(), t.clone(), prio));
                    }
                }
            }
            deploys.sort_by_key(|(.., p)| *p);
            if let Some((piece, target, _)) = deploys.first() {
                return AgentMove::Move { piece: piece.clone(), target: target.clone() };
            }
        }

        // ── Step 3: Chain Soldiers/Minotaurs without ending turn ─────────────
        {
            let mut best_cap = 0usize;
            let mut best_piece = String::new();
            let mut best_tgt   = String::new();
            for (pid, targets) in all_moves {
                let piece = &state.board.pieces[pid];
                let chainable = piece.piece_type == PieceType::Soldier
                    || piece.piece_type == PieceType::Minotaur;
                if !chainable { continue; }
                for t in targets {
                    if Self::would_end_turn(state, pid, t) { continue; }
                    let nc = Self::simulate_captures(state, pid, t).len();
                    if nc > 0 && (nc > best_cap || best_piece.is_empty()) {
                        best_cap = nc; best_piece = pid.clone(); best_tgt = t.clone();
                    }
                }
            }
            if !best_piece.is_empty() {
                return AgentMove::Move { piece: best_piece, target: best_tgt };
            }
        }

        // ── Step 4: Alpha-beta for all remaining moves ───────────────────────
        // Score moves with heuristic for the goddess-failsafe list.
        let mut scored: Vec<(String, String, f64)> = all_moves.iter()
            .flat_map(|(pid, ts)| ts.iter().map(move |t| {
                let s = self.score_move(state, pid, t);
                (pid.clone(), t.clone(), s)
            }))
            .collect();
        scored.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

        let candidate = self.best_move_ab(state, all_moves);

        // ── Step 5: Prefer non-ending move from AB result; else Mage deploy ──
        // If AB chose an ending move, check if there's a Mage to deploy instead.
        let ends = match &candidate {
            AgentMove::Move { piece, target } => Self::would_end_turn(state, piece, target),
            AgentMove::Pass => false,
        };
        if ends {
            for (piece, target, _) in &scored {
                let p = &state.board.pieces[piece];
                if p.piece_type == PieceType::Mage && p.position == "returned" {
                    return AgentMove::Move { piece: piece.clone(), target: target.clone() };
                }
            }
        }

        // ── Step 6: Goddess failsafe ─────────────────────────────────────────
        let result = Self::goddess_failsafe(state, candidate, &scored, pass_allowed);

        match result {
            AgentMove::Pass if !pass_allowed => {
                if let Some((piece, target, _)) = scored.first() {
                    AgentMove::Move { piece: piece.clone(), target: target.clone() }
                } else { AgentMove::Pass }
            }
            other => other,
        }
    }
}
