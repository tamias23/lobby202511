use std::collections::{HashMap, HashSet};
use crate::models::{BoardMap, PieceType, Side};
// Removed crate::agents dependency for shared core library


#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GamePhase {
    Setup,
    Playing,
    GameOver,
}

#[derive(Debug, Clone)]
pub struct GameState {
    pub board: BoardMap,
    pub occupancy: HashMap<String, String>, // PolyName -> PieceId
    pub turn: Side,
    pub color_chosen: HashMap<Side, String>, // Which board polygon color they chose to spawn on
    pub colors_ever_chosen: HashSet<String>, // Global set of all colors ever chosen by either player
    pub turn_counter: u32,
    pub is_new_turn: bool,
    pub moves_this_turn: u32,
    pub locked_sequence_piece: Option<String>,
    pub heroe_take_counter: u32,
    pub visited_polygons: HashSet<String>,
    pub phase: GamePhase,
    pub winner: Option<Side>,
    pub reason: Option<String>,
    pub setup_step: u8, // 0=goddess, 1=heroe, 2=golem, 3=witch, 4=ghoul_siren
    pub setup_placements_this_turn: u32,
}

impl GameState {
    pub fn is_siren_pinned(&self, poly_id: &str, side: Side) -> bool {
        for n in self.get_slide_neighbors(poly_id) {
            if let Some(occ_id) = self.occupancy.get(&n) {
                let p = &self.board.pieces[occ_id];
                if p.side != side && p.piece_type == PieceType::Siren {
                    return true;
                }
            }
        }
        false
    }

    /// Returns IDs of pieces currently eligible to start a turn-step (color match or sequence lock).
    pub fn get_eligible_piece_ids(&self) -> Vec<String> {
        let current_turn = self.turn;
        let chosen_color = self.color_chosen.get(&current_turn).cloned();
        
        let mut eligible = Vec::new();
        for p in self.board.pieces.values() {
            if p.side == current_turn && p.position != "graveyard" {
                let mut can_start = false;
                if p.position == "returned" {
                    if self.phase == GamePhase::Playing {
                        // Rule 110: Mage is locked until all 4 colors have been chosen (Chromatic Unlock).
                        if p.piece_type == PieceType::Mage && !self.is_mage_unlocked() {
                            can_start = false;
                        } else {
                            can_start = true;
                        }
                    } else {
                        // Setup phase: filter by setup_step
                        let (step_type, _) = match self.setup_step {
                            0 => (PieceType::Goddess, 1),
                            1 => (PieceType::Heroe, 2),
                            2 => (PieceType::Golem, 2),
                            3 => (PieceType::Witch, 4),
                            4 => (PieceType::Ghoul, 18), // Ghouls + Sirens
                            _ => (PieceType::Soldier, 0), // Should not reach
                        };
                        if self.setup_step == 4 {
                            can_start = p.piece_type == PieceType::Ghoul || p.piece_type == PieceType::Siren;
                        } else {
                            can_start = p.piece_type == step_type;
                        }
                    }
                } else if let Some(ref color) = chosen_color {
                    if let Some(poly) = self.board.polygons.get(&p.position) {
                        if poly.color.to_lowercase() == color.to_lowercase() {
                            can_start = true;
                        }
                    }
                }
                
                // If a piece is sequence-locked, it is the ONLY one that can move:
                if let Some(ref locked_id) = self.locked_sequence_piece {
                    // Self-healing: Only enforce lock if it belongs to the current side.
                    // This prevents stale/corrupt locks (e.g. White piece locked on Black's turn).
                    if let Some(locked_piece) = self.board.pieces.get(locked_id) {
                        if locked_piece.side == self.turn {
                            if locked_id == &p.id {
                                can_start = true;
                            } else {
                                // If someone else of MY side is locked, this piece cannot start.
                                can_start = false;
                            }
                        }
                        // If locked_piece is NOT my side, ignore the lock entirely for eligibility.
                    }
                }
                
                if can_start {
                    eligible.push(p.id.clone());
                }
            }
        }
        eligible
    }

    pub fn set_color_chosen(&mut self, side: Side, color: &str) {
        let lc = color.to_lowercase();
        self.color_chosen.insert(side, lc.clone());
        // Rule 110: Track every color ever chosen for the Chromatic Unlock (Mage gate).
        self.colors_ever_chosen.insert(lc);
        // Color choice marks the absolute start of a fresh turn segment.
        // It should ALWAYS clear any sequence lock or Heroe bonus flags.
        self.locked_sequence_piece = None;
        self.heroe_take_counter = 0;
        self.is_new_turn = false;
    }

    /// Rule 110: The Mage is available for deployment only after all 4 board colors
    /// have been chosen at least once by either player (Chromatic Unlock).
    pub fn is_mage_unlocked(&self) -> bool {
        self.colors_ever_chosen.len() >= 4
    }

    pub fn new(board: BoardMap) -> Self {
        let mut occupancy = HashMap::new();
        for (piece_id, piece) in &board.pieces {
            if piece.position != "returned" && piece.position != "graveyard" {
                occupancy.insert(piece.position.clone(), piece_id.clone());
            }
        }
        Self {
            board,
            occupancy,
            turn: Side::White, // Example start
            color_chosen: HashMap::new(),
            colors_ever_chosen: HashSet::new(),
            turn_counter: 0,
            is_new_turn: true,
            moves_this_turn: 0,
            locked_sequence_piece: None,
            heroe_take_counter: 0,
            visited_polygons: HashSet::new(),
            phase: GamePhase::Setup,
            winner: None,
            reason: None,
            setup_step: 0,
            setup_placements_this_turn: 0,
        }
    }

    pub fn is_occupied(&self, poly: &str) -> bool {
        self.occupancy.contains_key(poly)
    }

    pub fn get_occupant_side(&self, poly: &str) -> Option<Side> {
        self.occupancy.get(poly).map(|id| self.board.pieces[id].side)
    }

    pub fn get_occupant_type(&self, poly: &str) -> Option<PieceType> {
        self.occupancy.get(poly).map(|id| self.board.pieces[id].piece_type.clone())
    }

    pub fn get_jump_neighbors(&self, poly: &str) -> Vec<String> {
        self.board.polygons.get(poly).map(|p| p.neighbours.clone()).unwrap_or_default()
    }

    pub fn get_slide_neighbors(&self, poly: &str) -> Vec<String> {
        self.board.polygons.get(poly).map(|p| p.neighbors.clone()).unwrap_or_default()
    }

    pub fn get_enemy_side(&self) -> Side {
        if self.turn == Side::White { Side::Black } else { Side::White }
    }

    pub fn get_piece_by_id(&self, id: &str) -> Option<&crate::models::Piece> {
        self.board.pieces.get(id)
    }

    /// Checks if the current player has any legal moves available across all eligible pieces.
    pub fn has_any_legal_moves(&self) -> bool {
        let current_turn = self.turn;
        let chosen_color = self.color_chosen.get(&current_turn).cloned();

        if chosen_color.is_none() {
            // For a new turn, if no color is chosen yet, check if ANY color choice would yield a move.
            // This prevents "turn skipping" if the player must choose a color first.
            return !get_legal_colors(self, &current_turn).is_empty();
        }

        let eligible = self.get_eligible_piece_ids();
        for id in eligible {
            if !get_legal_moves(self, &id).is_empty() {
                return true;
            }
        }
        false
    }
}



pub fn get_legal_colors(state: &GameState, side: &Side) -> Vec<String> {
    let mut color_set = HashSet::new();
    for p in state.board.polygons.values() {
        color_set.insert(p.color.clone());
    }
    let colors: Vec<String> = color_set.into_iter().collect();
    let mut valid_colors = Vec::new();

    for c in colors {
        let mut clone_state = state.clone();
        let lc = c.to_lowercase();
        clone_state.color_chosen.insert(*side, lc.clone());
        let mut has_move = false;
        for p in clone_state.board.pieces.values() {
            if p.side == *side {
                let mut can_start = false;
                if p.position == "returned" {
                    can_start = true;
                } else if p.position != "graveyard"
                    && clone_state.board.polygons.get(&p.position).map(|x| x.color.to_lowercase()) == Some(lc.clone())
                {
                    can_start = true;
                }
                if can_start && !get_legal_moves(&clone_state, &p.id).is_empty() {
                    has_move = true;
                    break;
                }
            }
        }
        if has_move {
            valid_colors.push(c);
        }
    }
    valid_colors
}

pub fn get_polys_within_distance_jump(board: &BoardMap, start: &str, max_dist: usize) -> HashSet<String> {
    let mut visited = HashSet::new();
    visited.insert(start.to_string());
    let mut current_layer = vec![start.to_string()];
    for _ in 0..max_dist {
        let mut next_layer = Vec::new();
        for poly in &current_layer {
            if let Some(p) = board.polygons.get(poly) {
                for neighbor in &p.neighbours {
                    if visited.insert(neighbor.clone()) { next_layer.push(neighbor.clone()); }
                }
            }
        }
        current_layer = next_layer;
    }
    visited.remove(start);
    visited
}

pub fn get_polys_within_distance_slide(board: &BoardMap, start: &str, max_dist: usize) -> HashSet<String> {
    let mut visited = HashSet::new();
    visited.insert(start.to_string());
    let mut current_layer = vec![start.to_string()];
    for _ in 0..max_dist {
        let mut next_layer = Vec::new();
        for poly in &current_layer {
            if let Some(p) = board.polygons.get(poly) {
                for neighbor in &p.neighbors {
                    if visited.insert(neighbor.clone()) { next_layer.push(neighbor.clone()); }
                }
            }
        }
        current_layer = next_layer;
    }
    visited.remove(start);
    visited
}

pub fn get_legal_moves(state: &GameState, piece_id: &str) -> Vec<String> {
    let piece = match state.board.pieces.get(piece_id) {
        Some(p) => p,
        None => return Vec::new(),
    };
    
    let start = &piece.position;
    if start == "returned" || start == "graveyard" {
        // Redundant with matches below, but safe early exit.
        if start == "graveyard" { return Vec::new(); }
    } else {
        // Rule 108: "If a Piece is immobilized by a Siren, its move and the TURN end immediately."
        if state.is_siren_pinned(start, piece.side) {
            return Vec::new();
        }
    }

    // Eligibility check (color match or sequence lock)
    if !state.get_eligible_piece_ids().contains(&piece_id.to_string()) {
        return vec![]; // Piece is not currently authorized to move
    }

    // Sequence locking enforcement
    if let Some(locked_id) = &state.locked_sequence_piece {
        if locked_id != piece_id {
            return vec![]; // Frozen mathematically preventing interactions explicitly
        }
    }

    if piece.position == "returned" {
        let mut deployment_targets = HashSet::new();
        let c_color_opt = state.color_chosen.get(&state.turn).cloned();
        
        let mut friendly_mages_polys = Vec::new();
        for p in state.board.pieces.values() {
            if p.side == state.turn && p.piece_type == PieceType::Mage && p.position != "returned" && p.position != "graveyard" {
                friendly_mages_polys.push(p.position.clone());
            }
        }
        
        for (poly_id, poly) in &state.board.polygons {
            if !state.is_occupied(poly_id) {
                let mut valid = false;
                if Some(poly.color.clone()) == c_color_opt {
                    valid = true;
                } else {
                    for m_poly in &friendly_mages_polys {
                        if state.get_slide_neighbors(m_poly).contains(poly_id) {
                            valid = true;
                            break;
                        }
                    }
                }
                
                if valid {
                    if piece.piece_type == PieceType::Witch {
                        let mut enemy_adj = false;
                        for n in state.get_slide_neighbors(poly_id) {
                            if let Some(s) = state.get_occupant_side(&n) {
                                if s != piece.side { enemy_adj = true; break; }
                            }
                        }
                        if enemy_adj { valid = false; }
                    }
                }
                if valid {
                    deployment_targets.insert(poly_id.clone());
                }
            }
        }
        return deployment_targets.into_iter().collect();
    }

    let start = &piece.position;
    
    // Siren Pin check - Siren pin physically operates explicitly across slide topology matching JS `neighbors` iteration bounds!
    if piece.position != "returned" && piece.position != "graveyard" {
        for n in state.get_slide_neighbors(start) {
            if let Some(s) = state.get_occupant_side(&n) {
                if s != piece.side && state.get_occupant_type(&n) == Some(PieceType::Siren) {
                    return vec![]; // Pinned!
                }
            }
        }
    }

    let mut targets = HashSet::new();

    match piece.piece_type {
        PieceType::Goddess => {
            targets = get_polys_within_distance_jump(&state.board, start, 2);
        },
        PieceType::Mage => {
            let start_color = &state.board.polygons[start].color;
            for t in get_polys_within_distance_jump(&state.board, start, 3) {
                if state.board.polygons[&t].color != *start_color {
                    targets.insert(t);
                }
            }
        },
        PieceType::Witch => {
            let start_color = &state.board.polygons[start].color;
            for t in get_polys_within_distance_jump(&state.board, start, 4) {
                if state.board.polygons[&t].color == *start_color {
                    targets.insert(t);
                }
            }
        },
        PieceType::Heroe => {
            if state.heroe_take_counter < 2 {
                targets = get_polys_within_distance_jump(&state.board, start, 3);
            }
        },
        PieceType::Siren => {
            targets = get_polys_within_distance_jump(&state.board, start, 2);
        },
        PieceType::Soldier | PieceType::Golem => {
            // Simplified soldier movement: 1 step, or chain over friendly pieces & empty matching-color polys
            let mut friendly_hops = HashSet::new();
            let mut explore = vec![start.clone()];
            friendly_hops.insert(start.clone());
            
            let chosen_color = state.color_chosen.get(&state.turn).cloned();
            
            while let Some(current) = explore.pop() {
                for n in state.get_slide_neighbors(&current) {
                    if state.is_occupied(&n) {
                        if state.get_occupant_side(&n) == Some(piece.side) {
                            if friendly_hops.insert(n.clone()) { explore.push(n.clone()); }
                        }
                    } else if Some(state.board.polygons[&n].color.to_lowercase()) == chosen_color {
                        // Empty polygon matching chosen color. Ensure it isn't blocked by Siren (evaluating slide topology natively matched to JS).
                        let mut siren_pinned = false;
                        for nn in state.get_slide_neighbors(&n) {
                            if let Some(s) = state.get_occupant_side(&nn) {
                                if s != piece.side && state.get_occupant_type(&nn) == Some(PieceType::Siren) {
                                    siren_pinned = true; break;
                                }
                            }
                        }
                        if !siren_pinned {
                            if friendly_hops.insert(n.clone()) { explore.push(n.clone()); }
                        }
                    }
                }
            }
            
            for hop in friendly_hops {
                for n in state.get_slide_neighbors(&hop) {
                    targets.insert(n);
                }
            }
            targets.remove(start);

            // Global filter for previously visited polygons during the current turn sequence
            targets.retain(|t| !state.visited_polygons.contains(t));
        },
        PieceType::Ghoul => {
            let chosen_color = state.color_chosen.get(&state.turn).cloned();
            let mut explore = vec![(start.clone(), 0)];
            let mut visited = HashSet::new();
            visited.insert(start.clone());

            while let Some((curr, depth)) = explore.pop() {
                for n in state.get_slide_neighbors(&curr) {
                    targets.insert(n.clone());
                    if depth < 2 {
                        if !state.is_occupied(&n) {
                            if Some(state.board.polygons[&n].color.to_lowercase()) != chosen_color {
                                let mut siren_pinned = false;
                                for nn in state.get_slide_neighbors(&n) {
                                    if let Some(s) = state.get_occupant_side(&nn) {
                                        if s != piece.side && state.get_occupant_type(&nn) == Some(PieceType::Siren) {
                                            siren_pinned = true; break;
                                        }
                                    }
                                }
                                if !siren_pinned {
                                    if visited.insert(n.clone()) {
                                        explore.push((n, depth + 1));
                                    }
                                }
                            }
                        }
                    }
                }
            }
            targets.remove(start);
        }
    }

    targets.into_iter().filter(|t| {
        if t == start || state.get_occupant_side(t) == Some(piece.side.clone()) { return false; }
        if state.get_occupant_type(t) == Some(PieceType::Golem) {
            return false;
        }
        if piece.piece_type == PieceType::Siren || piece.piece_type == PieceType::Witch {
            if state.is_occupied(t) { return false; } // Siren and Witch can never capture; they only move to empty polygons
        }
        true
    }).collect()
}

pub fn apply_move(state: &mut GameState, piece_id: &str, target_poly: &str) -> Vec<PieceType> {
    let mut captured_types = Vec::new();
    let piece_type = state.board.pieces[piece_id].piece_type.clone();
    let piece_side = state.board.pieces[piece_id].side;
    
    let old_pos = state.board.pieces[piece_id].position.clone();
    
    // Register chain movement sequence memory
    if state.moves_this_turn == 0 && old_pos != "returned" {
        state.visited_polygons.insert(old_pos.clone());
    }
    state.visited_polygons.insert(target_poly.to_string());
    
    // Check if target is occupied
    if let Some(defender_id) = state.occupancy.get(target_poly).cloned() {
        captured_types.push(state.board.pieces[&defender_id].piece_type.clone());
        state.board.pieces.get_mut(&defender_id).unwrap().position = "returned".to_string();
    }
    
    // Move the piece map
    let source_poly = state.board.pieces[piece_id].position.clone();
    state.occupancy.remove(&source_poly);
    
    state.board.pieces.get_mut(piece_id).unwrap().position = target_poly.to_string();
    state.occupancy.insert(target_poly.to_string(), piece_id.to_string());
    
    // Process AoE Capabilities
    if piece_type == PieceType::Witch {
        // Destroy all adjacent enemy pieces except Golem utilizing strict `slide` topologies natively mirroring local blasts
        for n in state.get_slide_neighbors(target_poly) {
            if let Some(target_id) = state.occupancy.get(&n).cloned() {
                let neighbor_piece = state.board.pieces.get(&target_id).unwrap();
                if neighbor_piece.side != piece_side && neighbor_piece.piece_type != PieceType::Golem {
                    captured_types.push(neighbor_piece.piece_type.clone());
                    let mut_p = state.board.pieces.get_mut(&target_id).unwrap();
                    mut_p.position = "returned".to_string();
                    state.occupancy.remove(&n);
                }
            }
        }
    } else if piece_type == PieceType::Mage && !captured_types.is_empty() {
        // Destroy ALL adjacent enemy pieces organically mapping the strict 1-hop slide array identical to native JS boundaries.
        let target_side = if piece_side == Side::White { Side::Black } else { Side::White };
        for n in state.get_slide_neighbors(target_poly) {
            if let Some(target_id) = state.occupancy.get(&n).cloned() {
                let neighbor_piece = state.board.pieces.get(&target_id).unwrap();
                if neighbor_piece.side == target_side && neighbor_piece.piece_type != PieceType::Golem {
                    captured_types.push(neighbor_piece.piece_type.clone());
                    let mut_p = state.board.pieces.get_mut(&target_id).unwrap();
                    mut_p.position = "returned".to_string();
                    state.occupancy.remove(&n);
                }
            }
        }
    }
    
    state.moves_this_turn += 1;
    captured_types
}

use rand::seq::SliceRandom;

/// Initializes the standard set of pieces into the "returned" position without randomizing them onto the board.
pub fn setup_pieces(state: &mut GameState) {
    // 1. Force completely new pieces map based strictly on Rule quantities
    state.board.pieces.clear();
    state.occupancy.clear();
    
    for side_enum in [Side::White, Side::Black] {
        let side_str = match side_enum { Side::White => "white", Side::Black => "black" };
        
        let mut add_pieces = |ptype: crate::models::PieceType, count: usize| {
            let p_str = match ptype {
                crate::models::PieceType::Heroe => "heroe",
                crate::models::PieceType::Goddess => "goddess",
                crate::models::PieceType::Mage => "mage",
                crate::models::PieceType::Witch => "witch",
                crate::models::PieceType::Soldier => "soldier",
                crate::models::PieceType::Siren => "siren",
                crate::models::PieceType::Ghoul => "ghoul",
                crate::models::PieceType::Golem => "golem",
            };
            for i in 0..count {
                let id = format!("{}_{}_{}", side_str, p_str, i);
                state.board.pieces.insert(id.clone(), crate::models::Piece {
                    id,
                    piece_type: ptype.clone(),
                    side: side_enum,
                    position: "returned".to_string(),
                });
            }
        };
        
        add_pieces(crate::models::PieceType::Goddess, 1);
        add_pieces(crate::models::PieceType::Heroe, 2);
        add_pieces(crate::models::PieceType::Witch, 4);
        add_pieces(crate::models::PieceType::Mage, 1);
        add_pieces(crate::models::PieceType::Soldier, 9);
        add_pieces(crate::models::PieceType::Ghoul, 9);
        add_pieces(crate::models::PieceType::Siren, 9);
        add_pieces(crate::models::PieceType::Golem, 2);
    }
}

/// Randomly assigns all `returned` pieces to currently unoccupied polygons.
pub fn setup_random_board(state: &mut GameState, side_filter: Option<Side>) {
    if side_filter.is_none() {
        setup_pieces(state);
    } else {
        // Clear only the filtered side
        let side = side_filter.unwrap();
        let piece_ids: Vec<String> = state.board.pieces.iter()
            .filter(|(_, p)| p.side == side)
            .map(|(id, _)| id.clone())
            .collect();
        for id in piece_ids {
            if let Some(p) = state.board.pieces.get_mut(&id) {
                if p.position != "returned" && p.position != "graveyard" {
                    state.occupancy.remove(&p.position);
                }
                p.position = "returned".to_string();
            }
        }
    }
    
    let mut rng = rand::thread_rng();

    // Find Edge polygons
    let mut top_edges = Vec::new();
    let mut bottom_edges = Vec::new();
    let width = state.board.width.unwrap_or(1000.0);
    let height = state.board.height.unwrap_or(1000.0);

    for (k, poly) in &state.board.polygons {
        let n_count = if !poly.neighbors.is_empty() { poly.neighbors.len() } else { poly.neighbours.len() };
        if poly.points.len() > n_count {
            if poly.center[0] > 1.0 && poly.center[0] < (width - 1.0) {
                if poly.center[1] < 63.0 {
                    top_edges.push(k.clone());
                } else if poly.center[1] > (height - 63.0) {
                    bottom_edges.push(k.clone());
                }
            }
        }
    }

    let mut side_counts = std::collections::HashMap::new();
    for p in state.board.pieces.values() {
        *side_counts.entry(format!("{:?} {:?}", p.side, p.piece_type)).or_insert(0) += 1;
    }

    for side in [Side::White, Side::Black] {
        if let Some(filter) = side_filter {
            if side != filter { continue; }
        }
        let side_str = match side { Side::White => "white", Side::Black => "black" };
                let edges = match side { Side::White => &top_edges, Side::Black => &bottom_edges, };
        
        let mut goddess_id = String::new();
        let mut heroe0_id = String::new();
        let mut heroe1_id = String::new();
        
        let mut witch_ids = Vec::new();
        let mut golem_ids = Vec::new();
        let mut ghoul_ids = Vec::new();
        let mut siren_ids = Vec::new();

        for (id, p) in &state.board.pieces {
            if p.side == side {
                match p.piece_type {
                    PieceType::Goddess => goddess_id = id.clone(),
                    PieceType::Heroe => {
                        if heroe0_id.is_empty() { heroe0_id = id.clone(); }
                        else { heroe1_id = id.clone(); }
                    },
                    PieceType::Witch => witch_ids.push(id.clone()),
                    PieceType::Golem => golem_ids.push(id.clone()),
                    PieceType::Ghoul => ghoul_ids.push(id.clone()),
                    PieceType::Siren => siren_ids.push(id.clone()),
                    _ => {}
                }
            }
        }

        let mut g_poly = String::new();
        let mut h0_poly = String::new();
        let mut h1_poly = String::new();
        
        // A. Edge Anchors Constraint Loop
        loop {
            if edges.is_empty() { break; }
            let mut p_edges = edges.clone();
            p_edges.shuffle(&mut rng);
            if p_edges.len() < 3 { break; }
            
            g_poly = p_edges[0].clone();
            h0_poly = p_edges[1].clone();
            h1_poly = p_edges[2].clone();
            
            let h0_near_6 = get_polys_within_distance_jump(&state.board, &h0_poly, 6);
            if h0_near_6.contains(&h1_poly) { continue; }
            
            let g_near_3 = get_polys_within_distance_jump(&state.board, &g_poly, 3);
            let g_near_6 = get_polys_within_distance_jump(&state.board, &g_poly, 6);
            
            if g_near_3.contains(&h0_poly) || !g_near_6.contains(&h0_poly) { continue; }
            if g_near_3.contains(&h1_poly) || !g_near_6.contains(&h1_poly) { continue; }
            
            break;
        }

        if !g_poly.is_empty() && !goddess_id.is_empty() {
            state.occupancy.insert(g_poly.clone(), goddess_id.clone());
            state.board.pieces.get_mut(&goddess_id).unwrap().position = g_poly.clone();
            state.occupancy.insert(h0_poly.clone(), heroe0_id.clone());
            state.board.pieces.get_mut(&heroe0_id).unwrap().position = h0_poly.clone();
            state.occupancy.insert(h1_poly.clone(), heroe1_id.clone());
            state.board.pieces.get_mut(&heroe1_id).unwrap().position = h1_poly.clone();
        } else {
            continue; // No valid edges found for safety
        }

        // B. Protectors (Golems)
        let mut set1_goddess: Vec<String> = get_polys_within_distance_jump(&state.board, &g_poly, 1).into_iter().collect();
        if set1_goddess.len() < golem_ids.len() {
            set1_goddess = get_polys_within_distance_jump(&state.board, &g_poly, 2).into_iter().collect();
        }
        set1_goddess.shuffle(&mut rng);
        
        let mut k = 0;
        for id in golem_ids {
            while k < set1_goddess.len() && state.occupancy.contains_key(&set1_goddess[k]) {
                k += 1;
            }
            if k < set1_goddess.len() {
                let target = set1_goddess[k].clone();
                state.occupancy.insert(target.clone(), id.clone());
                state.board.pieces.get_mut(&id).unwrap().position = target;
            }
        }
        
        // Generate Sets up to 4 dist
        let set1: Vec<String> = get_polys_within_distance_jump(&state.board, &g_poly, 1).union(&get_polys_within_distance_jump(&state.board, &h0_poly, 1)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance_jump(&state.board, &h1_poly, 1)).cloned().collect();
        let set2: Vec<String> = get_polys_within_distance_jump(&state.board, &g_poly, 2).union(&get_polys_within_distance_jump(&state.board, &h0_poly, 2)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance_jump(&state.board, &h1_poly, 2)).cloned().collect();
        let set3: Vec<String> = get_polys_within_distance_jump(&state.board, &g_poly, 3).union(&get_polys_within_distance_jump(&state.board, &h0_poly, 3)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance_jump(&state.board, &h1_poly, 3)).cloned().collect();
        let set4: Vec<String> = get_polys_within_distance_jump(&state.board, &g_poly, 4).union(&get_polys_within_distance_jump(&state.board, &h0_poly, 4)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance_jump(&state.board, &h1_poly, 4)).cloned().collect();

        let mut set_all: Vec<String> = Vec::new();
        for s in vec![set1, set2, set3, set4] {
            let mut shuf = s.clone();
            shuf.shuffle(&mut rng);
            for poly in shuf {
                if !set_all.contains(&poly) {
                    set_all.push(poly);
                }
            }
        }
        
        // C. Chromatic Spread (Witchs)
        let mut color_found_set = HashSet::new();
        let mut color_found_arr = Vec::new();
        for p in &set_all {
            let color = state.board.polygons[p].color.clone();
            if color_found_set.insert(color.clone()) {
                color_found_arr.push(color);
            }
        }
        color_found_arr.shuffle(&mut rng);
        color_found_arr.truncate(witch_ids.len());
        
        let mut pieces_to_set = Vec::new();
        let mut witch_colors = HashMap::new();
        
        for (i, id) in witch_ids.into_iter().enumerate() {
            if i < color_found_arr.len() {
                witch_colors.insert(id.clone(), color_found_arr[i].clone());
                pieces_to_set.push(id);
            }
        }
        
        // D. Infantry
        for id in ghoul_ids { pieces_to_set.push(id); }
        for id in siren_ids { pieces_to_set.push(id); }
        
        // Assign to sequence
        let mut board_cursor = 0;
        for p_id in pieces_to_set {
            loop {
                if board_cursor >= set_all.len() { break; }
                let id_poly = set_all[board_cursor].clone();
                
                if !state.occupancy.contains_key(&id_poly) {
                    let poly_color = &state.board.polygons[&id_poly].color;
                    if let Some(target_col) = witch_colors.get(&p_id) {
                        if poly_color == target_col {
                            state.occupancy.insert(id_poly.clone(), p_id.clone());
                            state.board.pieces.get_mut(&p_id).unwrap().position = id_poly.clone();
                            board_cursor = 0; 
                            break;
                        } else {
                            board_cursor += 1;
                        }
                    } else {
                        state.occupancy.insert(id_poly.clone(), p_id.clone());
                        state.board.pieces.get_mut(&p_id).unwrap().position = id_poly.clone();
                        board_cursor += 1;
                        break;
                    }
                } else {
                    board_cursor += 1;
                }
            }
        }
        
        // D. Reserve Mages & Soldiers implicitly remain "returned" without board positions!
    }

    // Only transition to Playing if BOTH sides are actually setup (all pieces placed)
    let any_returned = state.board.pieces.values().any(|p| {
        // Pieces that SHOULD be placed (Goddess, Heroes, Golems, Witchs, Infantry)
        // Note: Soldiers and Mages might stay returned until late-game, but for setup, we check others.
        p.position == "returned" && 
        (p.piece_type == PieceType::Goddess || 
         p.piece_type == PieceType::Heroe || 
         p.piece_type == PieceType::Golem || 
         p.piece_type == PieceType::Witch || 
         p.piece_type == PieceType::Ghoul || 
         p.piece_type == PieceType::Siren)
    });

    if !any_returned {
        state.phase = GamePhase::Playing;
    }
}

pub fn get_setup_legal_placements(state: &GameState) -> HashMap<String, Vec<String>> {
    let mut placements = HashMap::new();
    let current_side = state.turn;

    // Get unplaced pieces of the current step
    let pieces_to_place: Vec<_> = state.board.pieces.values()
        .filter(|p| p.side == current_side && p.position == "returned")
        .collect();

    let (step_type, _count_needed) = match state.setup_step {
        0 => (PieceType::Goddess, 1),
        1 => (PieceType::Heroe, 2),
        2 => (PieceType::Golem, 2),
        3 => (PieceType::Witch, 4),
        4 => (PieceType::Ghoul, 18), // Ghouls + Sirens
        _ => return placements,
    };

    let p_ids: Vec<_> = pieces_to_place.iter()
        .filter(|p| {
            if state.setup_step == 4 {
                p.piece_type == PieceType::Ghoul || p.piece_type == PieceType::Siren
            } else {
                p.piece_type == step_type
            }
        })
        .map(|p| p.id.clone())
        .collect();

    if p_ids.is_empty() {
        return placements;
    }

    // Determine target polygons based on step
    let mut targets = Vec::new();
    let width = state.board.width.unwrap_or(1000.0);
    let height = state.board.height.unwrap_or(1000.0);

    match state.setup_step {
        0 => { // Goddess on edge
            let edges = get_edge_polys(&state.board, current_side, width, height);
            for e in edges {
                if !state.is_occupied(&e) {
                    // Goddess must allow at least one Hero configuration
                    if can_place_heroes_from_goddess(&state.board, &e, current_side, width, height) {
                        targets.push(e);
                    }
                }
            }
        },
        1 => { // Heroes on edge
            let goddess_pos = get_piece_pos_by_type(state, current_side, PieceType::Goddess);
            if let Some(g_pos) = goddess_pos {
                let edges = get_edge_polys(&state.board, current_side, width, height);
                let g_near_2 = get_polys_within_distance_jump(&state.board, &g_pos, 2);
                let g_near_6 = get_polys_within_distance_jump(&state.board, &g_pos, 6);
                
                let already_hero = get_placed_piece_ids_by_type(state, current_side, PieceType::Heroe);
                
                for e in edges {
                    if !state.is_occupied(&e) && g_near_6.contains(&e) && !g_near_2.contains(&e) {
                        if already_hero.is_empty() {
                            // First Hero look-ahead: ensures at least one slot remains for Hero 2
                            let e_near_6 = get_polys_within_distance_jump(&state.board, &e, 6);
                            let goddess_pos = g_pos.clone();
                            let can_fit_second_hero = get_edge_polys(&state.board, current_side, width, height).iter().any(|e2| {
                                e2 != &e && e2 != &goddess_pos && !state.is_occupied(e2) &&
                                g_near_6.contains(e2) && !g_near_2.contains(e2) &&
                                !e_near_6.contains(e2)
                            });
                            if can_fit_second_hero {
                                targets.push(e);
                            }
                        } else {
                            // dist(H1, H2) > 6
                            let h1_pos = &state.board.pieces[&already_hero[0]].position;
                            let h1_near_6 = get_polys_within_distance_jump(&state.board, h1_pos, 6);
                            if !h1_near_6.contains(&e) {
                                targets.push(e);
                            }
                        }
                    }
                }
            }
        },
        2 => { // Golems near Goddess
            let goddess_pos = get_piece_pos_by_type(state, current_side, PieceType::Goddess);
            if let Some(g_pos) = goddess_pos {
                let mut near = get_polys_within_distance_jump(&state.board, &g_pos, 1);
                if near.iter().filter(|p| !state.is_occupied(p)).count() < 2 {
                    near = get_polys_within_distance_jump(&state.board, &g_pos, 2);
                }
                for p in near {
                    if !state.is_occupied(&p) {
                        targets.push(p);
                    }
                }
            }
        },
        3 => { // Witchs on unique colors - closest possible ring (dist 1-4)
            let anchors = get_anchor_positions(state, current_side);
            let placed_witchs = get_placed_piece_ids_by_type(state, current_side, PieceType::Witch);
            let used_colors: HashSet<_> = placed_witchs.iter()
                .map(|id| state.board.polygons[&state.board.pieces[id].position].color.clone())
                .collect();
            
            for d in 1..=15 {
                let mut ring_d = HashSet::new();
                for a in &anchors {
                    ring_d.extend(get_polys_within_distance_jump(&state.board, a, d));
                }
                
                let mut candidates = Vec::new();
                for p in ring_d {
                    if !state.is_occupied(&p) {
                        let color = &state.board.polygons[&p].color;
                        if !used_colors.contains(color) {
                            candidates.push(p);
                        }
                    }
                }

                if !candidates.is_empty() {
                    targets = candidates;
                    break;
                }
            }
        },
        4 => { // Ghouls/Sirens within rings
            let anchors = get_anchor_positions(state, current_side);
            let mut ring = HashSet::new();
            for d in 1..=15 {
                for a in &anchors {
                    ring.extend(get_polys_within_distance_jump(&state.board, a, d));
                }
                let available: Vec<_> = ring.iter().filter(|p| !state.is_occupied(p)).collect();
                if !available.is_empty() {
                    for p in available {
                        targets.push(p.clone());
                    }
                    break;
                }
            }
        },
        _ => {}
    }

    if !targets.is_empty() {
        for id in p_ids {
            placements.insert(id, targets.clone());
        }
    }

    placements
}

fn get_edge_polys(board: &BoardMap, side: Side, width: f64, height: f64) -> Vec<String> {
    let mut edges = Vec::new();
    for (k, poly) in &board.polygons {
        let n_count = if !poly.neighbors.is_empty() { poly.neighbors.len() } else { poly.neighbours.len() };
        if poly.points.len() > n_count {
            if poly.center[0] > 1.0 && poly.center[0] < (width - 1.0) {
                if side == Side::White && poly.center[1] < 63.0 {
                    edges.push(k.clone());
                } else if side == Side::Black && poly.center[1] > (height - 63.0) {
                    edges.push(k.clone());
                }
            }
        }
    }
    edges
}

fn can_place_heroes_from_goddess(board: &BoardMap, g_pos: &str, side: Side, width: f64, height: f64) -> bool {
    let edges = get_edge_polys(board, side, width, height);
    let g_near_2 = get_polys_within_distance_jump(board, g_pos, 2);
    let g_near_6 = get_polys_within_distance_jump(board, g_pos, 6);
    
    let valid_heroe_edges: Vec<_> = edges.iter()
        .filter(|&e| e != g_pos && g_near_6.contains(e) && !g_near_2.contains(e))
        .collect();
    
    if valid_heroe_edges.len() < 2 { return false; }
    
    for i in 0..valid_heroe_edges.len() {
        for j in i+1..valid_heroe_edges.len() {
            let h1 = valid_heroe_edges[i];
            let h2 = valid_heroe_edges[j];
            let h1_near_6 = get_polys_within_distance_jump(board, h1, 6);
            if !h1_near_6.contains(h2) {
                return true;
            }
        }
    }
    false
}

fn get_piece_pos_by_type(state: &GameState, side: Side, ptype: PieceType) -> Option<String> {
    state.board.pieces.values()
        .find(|p| p.side == side && p.piece_type == ptype && p.position != "returned")
        .map(|p| p.position.clone())
}

fn get_placed_piece_ids_by_type(state: &GameState, side: Side, ptype: PieceType) -> Vec<String> {
    state.board.pieces.values()
        .filter(|p| p.side == side && p.piece_type == ptype && p.position != "returned")
        .map(|p| p.id.clone())
        .collect()
}

fn get_anchor_positions(state: &GameState, side: Side) -> Vec<String> {
    let mut anchors = Vec::new();
    if let Some(pos) = get_piece_pos_by_type(state, side, PieceType::Goddess) {
        anchors.push(pos);
    }
    for id in get_placed_piece_ids_by_type(state, side, PieceType::Heroe) {
        anchors.push(state.board.pieces[&id].position.clone());
    }
    anchors
}

pub fn apply_setup_placement(state: &mut GameState, piece_id: &str, target_poly: &str) {
    let source_poly = state.board.pieces[piece_id].position.clone();
    if source_poly != "returned" {
        state.occupancy.remove(&source_poly);
    }
    state.board.pieces.get_mut(piece_id).unwrap().position = target_poly.to_string();
    state.occupancy.insert(target_poly.to_string(), piece_id.to_string());
    state.setup_placements_this_turn += 1;
}

pub fn apply_setup_placement_turnover(state: &mut GameState, piece_id: &str, target_poly: &str) {
    let current_side = state.turn;
    apply_setup_placement(state, piece_id, target_poly);
    if check_setup_step_complete(state, current_side) {
        state.turn = state.get_enemy_side();
        state.setup_placements_this_turn = 0;
        advance_setup_step(state);
    }
}

// perform_setup_turn removed: Core library focuses on rules, not agent orchestration.

pub fn check_setup_step_complete(state: &GameState, side: Side) -> bool {
    let (step_type, count) = match state.setup_step {
        0 => (PieceType::Goddess, 1),
        1 => (PieceType::Heroe, 2),
        2 => (PieceType::Golem, 2),
        3 => (PieceType::Witch, 4),
        4 => (PieceType::Ghoul, 18), // Ghouls + Sirens
        _ => return true,
    };
    
    let placed = state.board.pieces.values()
        .filter(|p| {
            if side != p.side { return false; }
            if p.position == "returned" { return false; }
            if state.setup_step == 4 {
                p.piece_type == PieceType::Ghoul || p.piece_type == PieceType::Siren
            } else {
                p.piece_type == step_type
            }
        })
        .count();
    
    placed >= count
}

fn advance_setup_step(state: &mut GameState) {
    if check_setup_step_complete(state, Side::White) && check_setup_step_complete(state, Side::Black) {
        state.setup_step += 1;
        state.setup_placements_this_turn = 0;
        if state.setup_step > 4 {
            state.phase = GamePhase::Playing;
            state.is_new_turn = true;
            state.turn = Side::White; // Main game starts with White
        }
    }
}

// perform_random_turn removed.

// perform_turn removed.




/// Abstracted Turnover Application explicitly processing sequence breaking & logic formally after an active application.
pub fn apply_move_turnover(state: &mut GameState, chosen_piece: &str, chosen_target: &str, goddess_captured: bool, captured_is_empty: bool, was_returned: bool) -> bool {
    let current_turn = state.turn;
    
    let chosen_color = state.color_chosen.get(&current_turn).map(|c| c.to_lowercase()).unwrap_or_default();
    let target_color = state.board.polygons.get(chosen_target).map(|p| p.color.to_lowercase()).unwrap_or_default();
    
    let p_obj = &state.board.pieces[chosen_piece];
    let piece_type = p_obj.piece_type.clone();
    let is_heroe = piece_type == PieceType::Heroe;
    let is_chainable = piece_type == PieceType::Soldier || piece_type == PieceType::Golem;

    
    let turn_ends;

    if was_returned {
        // Rule 78: Entering on chosen color ends turn.
        // Rule 79: Entering via Mage on different color does NOT end turn.
        if target_color.to_lowercase() == chosen_color.to_lowercase() {
            turn_ends = true;
            // Deploying on chosen color ends turn and clears lock.
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
        } else {
            turn_ends = false;
            // Rule 79: Deploying via Mage on different color does NOT end turn.
            // Piece should NOT be locked in this case.
            state.locked_sequence_piece = None; 
            state.heroe_take_counter = 0;
        }
    } else {
        let is_pinned = state.is_siren_pinned(chosen_target, current_turn);
        
        if is_pinned {
            // Rule 108: Move ends. Turn ends ONLY if pinning occurred on a CHOSEN color.
            if target_color.to_lowercase() == chosen_color.to_lowercase() {
                turn_ends = true;
            } else {
                turn_ends = false;
            }
            state.locked_sequence_piece = None;
        } else if target_color == chosen_color {
            // Rule 15: Landing on chosen color ends the MOVE.
            // Rule 16/74: Soldier and Golem "lock the sequence" instead of ending turn.
            if is_chainable {
                turn_ends = false;
                state.locked_sequence_piece = Some(chosen_piece.to_string());
            } else {
                // Normal pieces (Ghoul, Mage, etc.) end segments AND the turn on chosen color.
                turn_ends = true; 
                state.locked_sequence_piece = None;
                state.heroe_take_counter = 0;
            }
        } else {
            // Landing on a DIFFERENT color (Different-Color, Grey, etc.)
            if is_chainable {
                // Rule 16/74: Landing on a different color BREAKS the sequence for Soldiers/Golem.
                state.locked_sequence_piece = None;
                state.heroe_take_counter = 0;
                turn_ends = false; 
            } else if is_heroe && !captured_is_empty && state.heroe_take_counter == 0 {
                // Rule 44: Heroe bonus move after capture on a DIFFERENT color.
                state.heroe_take_counter += 1;
                state.locked_sequence_piece = Some(chosen_piece.to_string());
                turn_ends = false;
            } else {
                // All other cases: segment ends, turn continues for other pieces.
                state.locked_sequence_piece = None; 
                state.heroe_take_counter = 0;
                turn_ends = false;
            }
        }
    }

    // Deadlock Prevention: If a piece is sequence-locked but has ZERO legal moves, 
    // the lock MUST be broken so the current player doesn't get stuck.
    if let Some(ref locked_id) = state.locked_sequence_piece {
        // We use a cloned state to check for moves without modifying the current one.
        if get_legal_moves(state, locked_id).is_empty() {
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
            state.visited_polygons.clear();
        }
    }

    let current_side = state.turn;
    
    if goddess_captured {
        state.phase = GamePhase::GameOver;
        state.winner = Some(current_side);
        state.reason = Some("goddess_captured".to_string());
        return goddess_captured;
    } else if turn_ends {
        state.turn_counter += 1;
        state.turn = state.get_enemy_side();
        state.color_chosen.clear();
        state.is_new_turn = true;
        state.moves_this_turn = 0; // CRITICAL: Reset move counter!
        state.locked_sequence_piece = None;
        state.heroe_take_counter = 0;
        state.visited_polygons.clear();
    } else {
        // Turn continues.
        state.is_new_turn = false;

        // Check if the player is actually stuck.
        if !state.has_any_legal_moves() {
            state.turn_counter += 1;
            state.turn = state.get_enemy_side();
            state.color_chosen.clear();
            state.is_new_turn = true;
            state.moves_this_turn = 0; // CRITICAL: Reset move counter!
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
            state.visited_polygons.clear(); 
        }
    }
    
    if turn_ends {
    }
    
    goddess_captured
}

pub fn pass_turn(state: &mut GameState) {
    state.turn_counter += 1;
    state.turn = state.get_enemy_side();
    state.color_chosen.clear();
    state.is_new_turn = true;
    state.moves_this_turn = 0; // CRITICAL: Reset move counter!
    state.locked_sequence_piece = None;
    state.heroe_take_counter = 0;
    state.visited_polygons.clear();
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Piece, Polygon, Side, PieceType};
    use std::collections::HashMap;

    #[test]
    fn test_soldier_capture_on_wrong_color_ends_sequence() {
        let mut polygons = HashMap::new();
        // Setup a simple board: P1 (Blue) -> P2 (Yellow) -> P3 (Yellow)
        polygons.insert("P1".to_string(), Polygon {
            id: 1,
            name: "P1".to_string(),
            color: "blue".to_string(),
            shape: "tri".to_string(),
            center: [0.0, 0.0],
            points: vec![],
            neighbors: vec!["P2".to_string()],
            neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2,
            name: "P2".to_string(),
            color: "yellow".to_string(),
            shape: "tri".to_string(),
            center: [1.0, 1.0],
            points: vec![],
            neighbors: vec!["P1".to_string(), "P3".to_string()],
            neighbours: vec!["P1".to_string(), "P3".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3,
            name: "P3".to_string(),
            color: "yellow".to_string(),
            shape: "tri".to_string(),
            center: [2.0, 2.0],
            points: vec![],
            neighbors: vec!["P2".to_string()],
            neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        // White Soldier on P1 (Blue)
        pieces.insert("S1".to_string(), Piece {
            id: "S1".to_string(),
            piece_type: PieceType::Soldier,
            side: Side::White,
            position: "P1".to_string(),
        });
        // Black Soldier on P2 (Yellow) - target for capture
        pieces.insert("S2".to_string(), Piece {
            id: "S2".to_string(),
            piece_type: PieceType::Soldier,
            side: Side::Black,
            position: "P2".to_string(),
        });
        // Black Soldier on P3 (Yellow) - second target (should be unreachable after Capture 1)
        pieces.insert("S3".to_string(), Piece {
            id: "S3".to_string(),
            piece_type: PieceType::Soldier,
            side: Side::Black,
            position: "P3".to_string(),
        });

        let board = BoardMap {
            polygons: polygons.clone(),
            pieces: pieces.clone(),
            edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "blue".to_string());

        // Step 1: Verify S1 is eligible to move
        let eligible = state.get_eligible_piece_ids();
        assert!(eligible.contains(&"S1".to_string()), "S1 should be eligible on Blue poly");

        // Step 2: Get legal moves for S1
        let moves = get_legal_moves(&state, "S1");
        assert!(moves.contains(&"P2".to_string()), "S1 should be able to capture S2 on P2");

        // Step 3: Apply move S1 -> P2
        let captured = apply_move(&mut state, "S1", "P2");
        let goddess_captured = captured.contains(&PieceType::Goddess);
        assert!(!goddess_captured);
        
        // Step 4: Apply turnover logic
        apply_move_turnover(&mut state, "S1", "P2", false, captured.is_empty(), false);

        // Step 5: Verify S1 is NO LONGER sequence locked because P2 is Yellow, not Blue
        assert_eq!(state.locked_sequence_piece, None, "S1 should not be locked after landing on Yellow");

        // Step 6: Verify S1 is NO LONGER eligible to move (now on Yellow, Blue still chosen)
        let eligible_after = state.get_eligible_piece_ids();
        assert!(!eligible_after.contains(&"S1".to_string()), "S1 should not be eligible on Yellow poly");

        // Step 7: Verify get_legal_moves for S1 returns EMPTY
        let moves_after = get_legal_moves(&state, "S1");
        assert!(moves_after.is_empty(), "S1 should have no more legal moves from P2 (Yellow)");
    }

    #[test]
    fn test_heroe_sequence_ends_turn() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "red".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string(), "P3".to_string()], neighbours: vec!["P1".to_string(), "P3".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("H1".to_string(), Piece {
            id: "H1".to_string(), piece_type: PieceType::Heroe, side: Side::White, position: "P1".to_string(),
        });
        pieces.insert("S2".to_string(), Piece {
            id: "S2".to_string(), piece_type: PieceType::Soldier, side: Side::Black, position: "P2".to_string(),
        });

        let board = BoardMap {
            polygons: polygons.clone(),
            pieces: pieces.clone(),
            edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "blue".to_string());

        // Move 1: Hero captures S2 on P2
        let captured = apply_move(&mut state, "H1", "P2");
        assert!(captured.contains(&PieceType::Soldier));
        apply_move_turnover(&mut state, "H1", "P2", false, false, false);

        // Turn should STAY with White
        assert_eq!(state.turn, Side::White);
        assert_eq!(state.heroe_take_counter, 1);
        assert_eq!(state.locked_sequence_piece, Some("H1".to_string()));

        // Move 2: Hero moves passively to P3 (Blue)
        let captured2 = apply_move(&mut state, "H1", "P3");
        assert!(captured2.is_empty());
        apply_move_turnover(&mut state, "H1", "P3", false, true, false);

        // Turn should END with White because P3 is Blue (chosen color)
        assert_eq!(state.turn, Side::Black);
        assert_eq!(state.heroe_take_counter, 0); 
        assert_eq!(state.locked_sequence_piece, None);
    }

    #[test]
    fn test_multipiece_turn_persistence() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string(), "P3".to_string()], neighbours: vec!["P1".to_string(), "P3".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("B1".to_string(), Piece {
            id: "B1".to_string(), piece_type: PieceType::Witch, side: Side::White, position: "P1".to_string(),
        });
        pieces.insert("S1".to_string(), Piece {
            id: "S1".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P2".to_string(),
        });

        let board = BoardMap {
            polygons: polygons.clone(),
            pieces: pieces.clone(),
            edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "blue".to_string());
        state.is_new_turn = true;

        // Move 1: Witch moves to P2 (empty, Blue)
        apply_move(&mut state, "B1", "P2");
        apply_move_turnover(&mut state, "B1", "P2", false, true, false);

        // Turn should END with White because P2 is Blue (the chosen color)
        assert_eq!(state.turn, Side::Black);
        assert_eq!(state.moves_this_turn, 0); // Reset to 0 after turn end
        assert!(state.is_new_turn);

        // Piece B1 should NO LONGER be eligible (it moved), but S1 is also not eligible as it's Black's turn
        let eligible = state.get_eligible_piece_ids();
        assert!(!eligible.contains(&"S1".to_string()));
        
        // (Manual move 2 not possible anymore since turn switched)
    }

    #[test]
    fn test_case_insensitive_color_matching_phalanx() {
        use std::collections::HashMap;
        let mut polygons = HashMap::new();
        // Capitalized color in board data
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "Blue".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "Blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("S1".to_string(), Piece {
            id: "S1".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P1".to_string(),
        });

        let board = BoardMap {
            polygons: polygons, pieces: pieces, edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        // Lowercase selection (as done by NAPI/WASM)
        state.color_chosen.insert(Side::White, "blue".to_string());

        // Verify eligibility (this was already case-insensitive)
        let eligible = state.get_eligible_piece_ids();
        assert!(eligible.contains(&"S1".to_string()));

        // Verify legal moves (this used to fail due to case-sensitivity in chaining)
        let moves = get_legal_moves(&state, "S1");
        assert!(moves.contains(&"P2".to_string()), "Soldier should chain through capitalized 'Blue' polygon even with 'blue' selection");
    }

    #[test]
    fn test_immobilization_turnover_on_chosen_color() {
        use std::collections::HashMap;
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string(), "P3".to_string()], neighbours: vec!["P1".to_string(), "P3".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "red".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        // White Golem moving to P2
        pieces.insert("W_B1".to_string(), Piece {
            id: "W_B1".to_string(), piece_type: PieceType::Golem, side: Side::White, position: "P1".to_string(),
        });
        // Black Siren on P3
        pieces.insert("B_S1".to_string(), Piece {
            id: "B_S1".to_string(), piece_type: PieceType::Siren, side: Side::Black, position: "P3".to_string(),
        });

        let board = BoardMap {
            polygons: polygons, pieces: pieces, edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "blue".to_string());
        state.is_new_turn = false;
        state.moves_this_turn = 1;

        // Verify: P2 is slide-adjacent to P3 (where Siren is).
        // apply_move_turnover should find it pinned on 'blue' (chosen color).
        apply_move_turnover(&mut state, "W_B1", "P2", false, true, false);

        // Verify:
        // 1. Turn should have switched to Black
        assert_eq!(state.turn, Side::Black, "Turn should switch to Black after pin on chosen color");
        // 2. locked_sequence_piece should be None
        assert!(state.locked_sequence_piece.is_none(), "Sequence lock should be cleared after pin");
        // 3. turn_counter should have incremented
        assert_eq!(state.turn_counter, 1);
        // 4. is_new_turn should be true
        assert!(state.is_new_turn);
    }

    #[test]
    fn test_stale_lock_self_healing() {
        use std::collections::HashMap;
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });

        let mut pieces = HashMap::new();
        // White Heroe at P1
        pieces.insert("W_H1".to_string(), Piece {
            id: "W_H1".to_string(), piece_type: PieceType::Heroe, side: Side::White, position: "P1".to_string(),
        });
        // Black Soldier at P2
        pieces.insert("B_S1".to_string(), Piece {
            id: "B_S1".to_string(), piece_type: PieceType::Soldier, side: Side::Black, position: "P2".to_string(),
        });

        let board = BoardMap {
            polygons: polygons, pieces: pieces, edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::Black;
        state.is_new_turn = true;
        // CORRUPTION: A White piece is "locked" during Black's turn
        state.locked_sequence_piece = Some("W_H1".to_string());

        // Black chooses blue
        state.set_color_chosen(Side::Black, "blue");

        // Verify: Choosing color should have cleared the stale lock.
        assert!(state.locked_sequence_piece.is_none(), "Lock should be cleared on color selection");

        // Even with a stale lock, get_eligible_piece_ids should ignore it if it's the wrong side.
        state.locked_sequence_piece = Some("W_H1".to_string()); // re-introduce corruption
        let eligible = state.get_eligible_piece_ids();
        assert!(eligible.contains(&"B_S1".to_string()), "Black Soldier should be eligible despite stale White lock");
    }

    #[test]
    fn test_user_reported_golem_move_to_different_color() {
        use std::collections::HashMap;
        let mut polygons = HashMap::new();
        // Chosen color: green. Landing color: grey.
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "grey".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });

        let mut pieces = HashMap::new();
        // White Golem moving from start to P2.
        pieces.insert("W_B1".to_string(), Piece {
            id: "W_B1".to_string(), piece_type: PieceType::Golem, side: Side::White, position: "P1".to_string(),
        });
        // OTHER White piece to prevent turn switch
        pieces.insert("W_S2".to_string(), Piece {
            id: "W_S2".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P3".to_string(),
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });
        // Black piece on P2 to be captured.
        pieces.insert("B_S1".to_string(), Piece {
            id: "B_S1".to_string(), piece_type: PieceType::Soldier, side: Side::Black, position: "P2".to_string(),
        });

        let board = BoardMap {
            polygons: polygons, pieces: pieces, edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "green".to_string());
        state.is_new_turn = false;
        state.moves_this_turn = 5; // User said turn 6
        state.locked_sequence_piece = Some("W_B1".to_string()); // Assume started locked or just became locked

        // Verify: P2 is grey, chosen is green. Capturing.
        let captured = apply_move(&mut state, "W_B1", "P2");
        assert!(captured.contains(&PieceType::Soldier));
        
        apply_move_turnover(&mut state, "W_B1", "P2", false, false, false);

        // Verify result:
        // 1. Should be UNLOCKED (None) because grey != green.
        assert!(state.locked_sequence_piece.is_none(), "Golem should unlock after moving to non-chosen color even after capture");
        // 2. Turn should NOT end.
        assert_eq!(state.turn, Side::White);
    }

    #[test]
    fn test_golem_deadlock_recovery_on_grey() {
        use std::collections::HashMap;
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "grey".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });

        let mut pieces = HashMap::new();
        // White Golem at P2 (grey).
        pieces.insert("W_B1".to_string(), Piece {
            id: "W_B1".to_string(), piece_type: PieceType::Golem, side: Side::White, position: "P2".to_string(),
        });
        // Other white piece on P3 (on-color).
        pieces.insert("W_S1".to_string(), Piece {
            id: "W_S1".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P3".to_string(),
        });

        let board = BoardMap {
            polygons: polygons, pieces: pieces.clone(), edges: HashMap::new(),
            width: Some(100.0), height: Some(100.0),
        };

        let mut state = GameState::new(board);
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "green".to_string());
        state.is_new_turn = false;

        // Force a sequence lock on the Golem.
        state.locked_sequence_piece = Some("W_B1".to_string());
        
        // Apply turnover at P2 (grey). 
        // Deadlock detection should clear it because P2 (grey piece on green turn) has no moves.
        apply_move_turnover(&mut state, "W_B1", "P2", false, true, false);

        // Verification:
        // 1. Golem should be UNLOCKED (None).
        assert!(state.locked_sequence_piece.is_none(), "Lock must be cleared if piece has no moves");
        assert_eq!(state.turn, Side::White, "Turn should remain White because other pieces are eligible");

        // Verify other piece is eligible
        let eligible = state.get_eligible_piece_ids();
        assert!(eligible.contains(&"W_S1".to_string()), "Other on-color pieces should be eligible after lock is broken");
    }

    #[test]
    fn test_heroe_capture_different_color_locks() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("H1".to_string(), Piece {
            id: "H1".to_string(), piece_type: PieceType::Heroe, side: Side::White, position: "P1".to_string(),
        });
        pieces.insert("S1".to_string(), Piece {
            id: "S1".to_string(), piece_type: PieceType::Soldier, side: Side::Black, position: "P2".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "green".to_string());

        // Capture S1 on P2 (blue != green)
        let captured = apply_move(&mut state, "H1", "P2");
        assert!(!captured.is_empty());
        apply_move_turnover(&mut state, "H1", "P2", false, false, false);

        // Result: Locked for bonus move
        assert_eq!(state.locked_sequence_piece, Some("H1".to_string()));
        assert_eq!(state.heroe_take_counter, 1);
        assert_eq!(state.turn, Side::White);
    }

    #[test]
    fn test_heroe_move_after_bonus_clears_lock() {
        let mut polygons = HashMap::new();
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P3".to_string()], neighbours: vec!["P3".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "red".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("H1".to_string(), Piece {
            id: "H1".to_string(), piece_type: PieceType::Heroe, side: Side::White, position: "P2".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "green".to_string());
        state.locked_sequence_piece = Some("H1".to_string());
        state.heroe_take_counter = 1;

        // Move H1 to P3 (red != green, no capture)
        let captured = apply_move(&mut state, "H1", "P3");
        assert!(captured.is_empty());
        apply_move_turnover(&mut state, "H1", "P3", false, true, false);

        // Result: Lock cleared, turn ends (because moves_this_turn > 0 and no more bonus moves)
        assert!(state.locked_sequence_piece.is_none());
    }

    #[test]
    fn test_golem_capture_different_color_unlocks_even_if_moves_remain() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "grey".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P3".to_string()], neighbours: vec!["P3".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("W_B1".to_string(), Piece {
            id: "W_B1".to_string(), piece_type: PieceType::Golem, side: Side::White, position: "P1".to_string(),
        });
        pieces.insert("B_S1".to_string(), Piece {
            id: "B_S1".to_string(), piece_type: PieceType::Soldier, side: Side::Black, position: "P2".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "green".to_string());

        // Step 1: Capture B_S1 on P2 (grey != green)
        let captured = apply_move(&mut state, "W_B1", "P2");
        assert!(!captured.is_empty());
        apply_move_turnover(&mut state, "W_B1", "P2", false, false, false);

        // Verification: Golem SHOULD be unlocked because it landed on GREY.
        assert!(state.locked_sequence_piece.is_none(), "Sequence must break on non-chosen color landing");
        
        // Note: Turn swaps to Black only if no OTHER pieces can move.
        // In this test, W_B1 is now on grey, so it can't move to green again (needs to be on green to move to green/any).
        // Since no white pieces are on green, turn swaps.
        assert_eq!(state.turn, Side::Black);
    }

    #[test]
    fn test_golem_capture_different_color_unlocks_with_other_pieces_remaining() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "grey".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string()], neighbours: vec!["P1".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P4".to_string()], neighbours: vec!["P4".to_string()],
        });
        polygons.insert("P4".to_string(), Polygon {
            id: 4, name: "P4".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [3.0, 3.0], points: vec![], neighbors: vec!["P3".to_string()], neighbours: vec!["P3".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("W_B1".to_string(), Piece {
            id: "W_B1".to_string(), piece_type: PieceType::Golem, side: Side::White, position: "P1".to_string(),
        });
        pieces.insert("W_S1".to_string(), Piece {
            id: "W_S1".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P3".to_string(),
        });
        pieces.insert("B_S1".to_string(), Piece {
            id: "B_S1".to_string(), piece_type: PieceType::Soldier, side: Side::Black, position: "P2".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.color_chosen.insert(Side::White, "green".to_string());

        // Capture B_S1 on P2 (grey)
        apply_move(&mut state, "W_B1", "P2");
        apply_move_turnover(&mut state, "W_B1", "P2", false, false, false);

        // Result: W_B1 unlocked. Turn stays White because W_S1 is on Green.
        assert!(state.locked_sequence_piece.is_none());
        assert_eq!(state.turn, Side::White);
        assert!(state.get_eligible_piece_ids().contains(&"W_S1".to_string()));
    }

    #[test]
    fn test_siren_pin_on_different_color_does_not_end_turn() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P2".to_string(), Polygon {
            id: 2, name: "P2".to_string(), color: "yellow".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec!["P1".to_string(), "P3".to_string(), "P4".to_string()], neighbours: vec!["P1".to_string(), "P3".to_string(), "P4".to_string()],
        });
        polygons.insert("P3".to_string(), Polygon {
            id: 3, name: "P3".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [2.0, 2.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });
        polygons.insert("P4".to_string(), Polygon {
            id: 4, name: "P4".to_string(), color: "red".to_string(), shape: "tri".to_string(),
            center: [1.0, 0.0], points: vec![], neighbors: vec!["P2".to_string()], neighbours: vec!["P2".to_string()],
        });

        let mut pieces = HashMap::new();
        pieces.insert("W_S1".to_string(), Piece {
            id: "W_S1".to_string(), piece_type: PieceType::Siren, side: Side::White, position: "P1".to_string(),
        });
        pieces.insert("W_P2".to_string(), Piece {
            id: "W_P2".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P3".to_string(),
        });
        pieces.insert("B_S1".to_string(), Piece {
            id: "B_S1".to_string(), piece_type: PieceType::Siren, side: Side::Black, position: "P4".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        state.set_color_chosen(Side::White, "green");

        // Move W_S1 from Green to Yellow (pinned by B_S1 on P4)
        apply_move(&mut state, "W_S1", "P2");
        apply_move_turnover(&mut state, "W_S1", "P2", false, true, false);

        // Turn stays White because landing was Yellow (not Green).
        assert_eq!(state.turn, Side::White);
    }

    #[test]
    fn test_case_insensitive_eligibility() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "Green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec![], neighbours: vec![],
        });
        let mut pieces = HashMap::new();
        pieces.insert("P1".to_string(), Piece {
            id: "P1".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P1".to_string(),
        });
        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        
        // Selection is lowercase "green", board is uppercase "Green"
        state.set_color_chosen(Side::White, "green");
        
        let eligible = state.get_eligible_piece_ids();
        assert!(eligible.contains(&"P1".to_string()));
    }

    #[test]
    fn test_mage_locked_before_chromatic_unlock() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec![], neighbours: vec![],
        });
        let mut pieces = HashMap::new();
        // White Mage in returned state
        pieces.insert("M1".to_string(), Piece {
            id: "M1".to_string(), piece_type: PieceType::Mage, side: Side::White, position: "returned".to_string(),
        });
        // White Soldier on board so there is always a legal move
        pieces.insert("S1".to_string(), Piece {
            id: "S1".to_string(), piece_type: PieceType::Soldier, side: Side::White, position: "P1".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        // Only 3 colors ever chosen — not yet unlocked
        state.colors_ever_chosen.insert("green".to_string());
        state.colors_ever_chosen.insert("blue".to_string());
        state.colors_ever_chosen.insert("grey".to_string());
        state.set_color_chosen(Side::White, "green"); // this adds green again (idempotent) -> still 3 unique
        // Reinsert only 3
        state.colors_ever_chosen = ["green", "blue", "grey"].iter().map(|s| s.to_string()).collect();

        let eligible = state.get_eligible_piece_ids();
        assert!(!eligible.contains(&"M1".to_string()), "Mage must be locked when only 3 colors chosen");
    }

    #[test]
    fn test_mage_unlocked_after_all_colors_chosen() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec![], neighbours: vec![],
        });
        let mut pieces = HashMap::new();
        pieces.insert("M1".to_string(), Piece {
            id: "M1".to_string(), piece_type: PieceType::Mage, side: Side::White, position: "returned".to_string(),
        });

        let mut state = GameState::new(BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::White;
        // All 4 colors ever chosen
        state.colors_ever_chosen = ["green", "blue", "grey", "orange"].iter().map(|s| s.to_string()).collect();
        state.set_color_chosen(Side::White, "green");

        let eligible = state.get_eligible_piece_ids();
        assert!(eligible.contains(&"M1".to_string()), "Mage must be eligible when all 4 colors chosen");
    }

    #[test]
    fn test_goddess_capture_halts_turnover() {
        let mut polygons = HashMap::new();
        polygons.insert("P1".to_string(), crate::models::Polygon {
            id: 1, name: "P1".to_string(), color: "green".to_string(), shape: "tri".to_string(),
            center: [0.0, 0.0], points: vec![], neighbors: vec![], neighbours: vec![],
        });
        polygons.insert("P2".to_string(), crate::models::Polygon {
            id: 2, name: "P2".to_string(), color: "blue".to_string(), shape: "tri".to_string(),
            center: [1.0, 1.0], points: vec![], neighbors: vec![], neighbours: vec![],
        });
        
        let mut pieces = HashMap::new();
        pieces.insert("W_G1".to_string(), crate::models::Piece {
            id: "W_G1".to_string(), piece_type: crate::models::PieceType::Goddess, side: crate::models::Side::White, position: "P1".to_string(),
        });
        pieces.insert("B_S1".to_string(), crate::models::Piece {
            id: "B_S1".to_string(), piece_type: crate::models::PieceType::Soldier, side: crate::models::Side::Black, position: "P2".to_string(),
        });

        let mut state = GameState::new(crate::models::BoardMap { polygons, pieces, edges: HashMap::new(), width: None, height: None });
        state.phase = GamePhase::Playing;
        state.turn = Side::Black;
        state.set_color_chosen(Side::Black, "blue");

        // Black Soldier captures White Goddess
        apply_move(&mut state, "B_S1", "P1");
        apply_move_turnover(&mut state, "B_S1", "P1", true, false, false);

        // Verification
        assert_eq!(state.phase, GamePhase::GameOver);
        assert_eq!(state.winner, Some(Side::Black));
        assert_eq!(state.turn, Side::Black); // Turn must NOT swap to White
        assert_eq!(state.turn_counter, 0); // Turn counter must NOT increment
    }
}
