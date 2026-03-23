use std::collections::{HashMap, HashSet};
use crate::models::{BoardMap, PieceType, Side};
use crate::agents::{Agent, AgentMove};


#[derive(Debug, Clone)]
pub struct GameState {
    pub board: BoardMap,
    pub occupancy: HashMap<String, String>, // PolyName -> PieceId
    pub turn: Side,
    pub color_chosen: HashMap<Side, String>, // Which board polygon color they chose to spawn on
    pub turn_counter: u32,
    pub is_new_turn: bool,
    pub moves_this_turn: u32,
    pub locked_sequence_piece: Option<String>,
    pub heroe_take_counter: u32,
}

impl GameState {
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
            turn_counter: 0,
            is_new_turn: true,
            moves_this_turn: 0,
            locked_sequence_piece: None,
            heroe_take_counter: 0,
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
        None => return vec![],
    };

    if piece.position == "graveyard" {
        return vec![]; // Dead
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
                    if piece.piece_type == PieceType::Bishop {
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
        PieceType::Bishop => {
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
        PieceType::Soldier | PieceType::Berserker => {
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
                    } else if Some(state.board.polygons[&n].color.clone()) == chosen_color {
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
                            if Some(state.board.polygons[&n].color.clone()) != chosen_color {
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
        if state.get_occupant_type(t) == Some(PieceType::Berserker) {
            return false;
        }
        if piece.piece_type == PieceType::Siren || piece.piece_type == PieceType::Bishop {
            if state.is_occupied(t) { return false; } // Siren and Bishop can never capture; they only move to empty polygons
        }
        true
    }).collect()
}

pub fn apply_move(state: &mut GameState, piece_id: &str, target_poly: &str) -> Vec<PieceType> {
    let mut captured_types = Vec::new();
    let piece_type = state.board.pieces[piece_id].piece_type.clone();
    let piece_side = state.board.pieces[piece_id].side.clone();
    
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
    if piece_type == PieceType::Bishop {
        // Destroy all adjacent enemy pieces except Berserker utilizing strict `slide` topologies natively mirroring local blasts
        for n in state.get_slide_neighbors(target_poly) {
            if let Some(target_id) = state.occupancy.get(&n).cloned() {
                let neighbor_piece = state.board.pieces.get(&target_id).unwrap();
                if neighbor_piece.side != piece_side && neighbor_piece.piece_type != PieceType::Berserker {
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
                if neighbor_piece.side == target_side && neighbor_piece.piece_type != PieceType::Berserker {
                    captured_types.push(neighbor_piece.piece_type.clone());
                    let mut_p = state.board.pieces.get_mut(&target_id).unwrap();
                    mut_p.position = "returned".to_string();
                    state.occupancy.remove(&n);
                }
            }
        }
    }
    
    captured_types
}

use rand::seq::{IteratorRandom, SliceRandom};
use rand::Rng;

/// Randomly assigns all `returned` pieces to currently unoccupied polygons.
pub fn setup_random_board(state: &mut GameState) {
    let mut rng = rand::rng();
    
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
                crate::models::PieceType::Bishop => "bishop",
                crate::models::PieceType::Soldier => "soldier",
                crate::models::PieceType::Siren => "siren",
                crate::models::PieceType::Ghoul => "ghoul",
                crate::models::PieceType::Berserker => "berserker",
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
        add_pieces(crate::models::PieceType::Bishop, 4);
        add_pieces(crate::models::PieceType::Mage, 1);
        add_pieces(crate::models::PieceType::Soldier, 9);
        add_pieces(crate::models::PieceType::Ghoul, 9);
        add_pieces(crate::models::PieceType::Siren, 9);
        add_pieces(crate::models::PieceType::Berserker, 2);
    }

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
    println!("Extracted Edges -> Top: {}, Bottom: {}", top_edges.len(), bottom_edges.len());

    let mut side_counts = std::collections::HashMap::new();
    for p in state.board.pieces.values() {
        *side_counts.entry(format!("{:?} {:?}", p.side, p.piece_type)).or_insert(0) += 1;
    }
    println!("Piece Distribution: {:?}", side_counts);

    for side in [Side::White, Side::Black] {
        let side_str = match side { Side::White => "white", Side::Black => "black" };
                let edges = match side { Side::White => &top_edges, Side::Black => &bottom_edges, };
        
        let mut goddess_id = String::new();
        let mut heroe0_id = String::new();
        let mut heroe1_id = String::new();
        
        let mut bishop_ids = Vec::new();
        let mut berserker_ids = Vec::new();
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
                    PieceType::Bishop => bishop_ids.push(id.clone()),
                    PieceType::Berserker => berserker_ids.push(id.clone()),
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
            println!("Faction {} successfully locked anchor coordinates: Goddess={}, H0={}, H1={}", side_str, g_poly, h0_poly, h1_poly);
            state.occupancy.insert(g_poly.clone(), goddess_id.clone());
            state.board.pieces.get_mut(&goddess_id).unwrap().position = g_poly.clone();
            state.occupancy.insert(h0_poly.clone(), heroe0_id.clone());
            state.board.pieces.get_mut(&heroe0_id).unwrap().position = h0_poly.clone();
            state.occupancy.insert(h1_poly.clone(), heroe1_id.clone());
            state.board.pieces.get_mut(&heroe1_id).unwrap().position = h1_poly.clone();
        } else {
            println!("Faction {} failed to find geometrical anchors!", side_str);
            continue; // No valid edges found for safety
        }

        // B. Protectors (Berserkers)
        let mut set1_goddess: Vec<String> = get_polys_within_distance_jump(&state.board, &g_poly, 1).into_iter().collect();
        if set1_goddess.len() < berserker_ids.len() {
            set1_goddess = get_polys_within_distance_jump(&state.board, &g_poly, 2).into_iter().collect();
        }
        set1_goddess.shuffle(&mut rng);
        
        let mut k = 0;
        for id in berserker_ids {
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
        
        // C. Chromatic Spread (Bishops)
        let mut color_found_set = HashSet::new();
        let mut color_found_arr = Vec::new();
        for p in &set_all {
            let color = state.board.polygons[p].color.clone();
            if color_found_set.insert(color.clone()) {
                color_found_arr.push(color);
            }
        }
        color_found_arr.shuffle(&mut rng);
        color_found_arr.truncate(bishop_ids.len());
        
        let mut pieces_to_set = Vec::new();
        let mut bishop_colors = HashMap::new();
        
        for (i, id) in bishop_ids.into_iter().enumerate() {
            if i < color_found_arr.len() {
                bishop_colors.insert(id.clone(), color_found_arr[i].clone());
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
                    if let Some(target_col) = bishop_colors.get(&p_id) {
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
}

/// Executes a completely random physically legal turn. Returns `true` if a Goddess was taken.
pub fn perform_random_turn(state: &mut GameState) -> bool {
    use crate::agents::random::RandomAgent;
    perform_turn(state, &RandomAgent).0
}

/// Executes one half-step of a turn using the provided agent.
/// Returns `(goddess_captured, Option<(piece_id, target_pos)>)`.
pub fn perform_turn(state: &mut GameState, agent: &dyn Agent) -> (bool, Option<(String, String)>) {
    if state.is_new_turn {
        state.moves_this_turn = 0;

        let current_turn = state.turn;

        let mut color_set = HashSet::new();
        for p in state.board.polygons.values() {
            color_set.insert(p.color.clone());
        }
        let colors: Vec<String> = color_set.into_iter().collect();
        let mut valid_colors = Vec::new();

        for c in colors {
            state.color_chosen.insert(current_turn, c.clone());
            let mut has_move = false;
            for p in state.board.pieces.values() {
                if p.side == current_turn {
                    let mut can_start = false;
                    if p.position == "returned" {
                        can_start = true;
                    } else if p.position != "graveyard"
                        && state.board.polygons.get(&p.position).map(|x| &x.color) == Some(&c)
                    {
                        can_start = true;
                    }
                    if can_start && !get_legal_moves(state, &p.id).is_empty() {
                        has_move = true;
                        break;
                    }
                }
            }
            if has_move {
                valid_colors.push(c);
            }
        }

        if valid_colors.is_empty() {
            state.turn_counter += 1;
            state.turn = state.get_enemy_side();
            state.color_chosen.clear();
            state.is_new_turn = true;
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
            return (false, None);
        }

        let chosen = agent.choose_color(state, &valid_colors).clone();
        state.color_chosen.insert(current_turn, chosen);
        state.is_new_turn = false;

        // Broadcast colour-pick to UI before executing any moves this frame.
        return (false, None);
    }

    let current_turn = state.turn;
    let chosen_color = state.color_chosen.get(&current_turn).unwrap().clone();

    let mut all_moves: HashMap<String, Vec<String>> = HashMap::new();

    for p in state.board.pieces.values() {
        if p.side == current_turn && p.position != "graveyard" {
            let mut can_start = false;
            if p.position == "returned" {
                can_start = true;
            } else if state.board.polygons.get(&p.position).map(|x| &x.color) == Some(&chosen_color) {
                can_start = true;
            } else if let Some(locked_id) = &state.locked_sequence_piece {
                if locked_id == &p.id {
                    can_start = true;
                }
            }
            if can_start {
                let targets = get_legal_moves(state, &p.id);
                if !targets.is_empty() {
                    all_moves.entry(p.id.clone()).or_default().extend(targets);
                }
            }
        }
    }

    if all_moves.is_empty() {
        state.turn_counter += 1;
        state.turn = state.get_enemy_side();
        state.color_chosen.clear();
        state.is_new_turn = true;
        state.locked_sequence_piece = None;
        state.heroe_take_counter = 0;
        return (false, None);
    }

    let pass_allowed = state.locked_sequence_piece.is_some();

    match agent.choose_move(state, &all_moves, pass_allowed) {
        AgentMove::Pass => {
            state.turn_counter += 1;
            state.turn = state.get_enemy_side();
            state.color_chosen.clear();
            state.is_new_turn = true;
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
            (false, None)
        }
        AgentMove::Move { piece: chosen_piece, target: chosen_target } => {
            let was_returned = state.board.pieces[&chosen_piece].position == "returned";
            let captured = apply_move(state, &chosen_piece, &chosen_target);
            state.moves_this_turn += 1;
            let goddess_captured = captured.contains(&PieceType::Goddess);
            let result = apply_move_turnover(state, &chosen_piece, &chosen_target, goddess_captured, captured.is_empty(), was_returned);
            (result, Some((chosen_piece, chosen_target)))
        }
    }
}




/// Abstracted Turnover Application explicitly processing sequence breaking & logic formally after an active application.
pub fn apply_move_turnover(state: &mut GameState, chosen_piece: &str, chosen_target: &str, goddess_captured: bool, captured_is_empty: bool, was_returned: bool) -> bool {
    let target_color = state.board.polygons.get(chosen_target).unwrap().color.clone();
    let current_turn = state.turn;
    let chosen_color = state.color_chosen.get(&current_turn).unwrap().clone();
    
    let piece_type = state.board.pieces[chosen_piece].piece_type.clone();
    let is_heroe = piece_type == PieceType::Heroe;
    let is_chainable = piece_type == PieceType::Soldier || piece_type == PieceType::Berserker;
    
    // Explicit condition evaluating formal sequence breaking checks natively
    if target_color == chosen_color {
        if was_returned {
            state.turn_counter += 1;
            state.turn = state.get_enemy_side();
            state.color_chosen.clear();
            state.is_new_turn = true;
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
        } else if is_heroe && !captured_is_empty && state.heroe_take_counter == 0 {
            state.heroe_take_counter += 1;
            state.locked_sequence_piece = Some(chosen_piece.to_string());
        } else if is_chainable {
            // JS specifically allows Soldier/Berserker to land on chosen_color AND lock their sequence dynamically tracking it natively (even after a capture).
            state.locked_sequence_piece = Some(chosen_piece.to_string());
        } else {
            // Any other piece hitting chosen_color instantly breaks the turn
            state.turn_counter += 1;
            state.turn = state.get_enemy_side();
            state.color_chosen.clear();
            state.is_new_turn = true;
            state.locked_sequence_piece = None;
            state.heroe_take_counter = 0;
        }
    } else {
        // Did NOT land on the Chosen Color.
        if is_heroe && !captured_is_empty && state.heroe_take_counter == 0 && !was_returned {
            state.heroe_take_counter += 1;
            state.locked_sequence_piece = Some(chosen_piece.to_string());
        } else {
            // If any piece (including Solders/Berserkers) lands on a non-chosen color, it simply ends its own sequence locking natively.
            // IT DOES NOT END THE TURN automatically. The Active Player is free to select another piece on the original chosen_color!
            state.locked_sequence_piece = None;
        }
    }
    
    goddess_captured
}
