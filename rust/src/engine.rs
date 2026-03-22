use std::collections::{HashMap, HashSet};
use crate::models::{BoardMap, PieceType, Side};

#[derive(Debug, Clone)]
pub struct GameState {
    pub board: BoardMap,
    pub occupancy: HashMap<String, String>, // PolyName -> PieceId
    pub turn: Side,
    pub color_chosen: HashMap<Side, String>, // Which board polygon color they chose to spawn on
    pub turn_counter: u32,
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

    pub fn get_neighbors(&self, poly: &str) -> Vec<String> {
        self.board.polygons.get(poly)
            .map(|p| if !p.neighbors.is_empty() { p.neighbors.clone() } else { p.neighbours.clone() })
            .unwrap_or_default()
    }
}

// Implement movement physics for distances
pub fn get_polys_within_distance(board: &BoardMap, start: &str, max_dist: usize) -> HashSet<String> {
    let mut visited = HashSet::new();
    visited.insert(start.to_string());
    
    let mut current_layer = vec![start.to_string()];
    
    for _ in 0..max_dist {
        let mut next_layer = Vec::new();
        for poly in &current_layer {
            if let Some(p) = board.polygons.get(poly) {
                let neighbors = if !p.neighbors.is_empty() { &p.neighbors } else { &p.neighbours };
                for neighbor in neighbors {
                    if visited.insert(neighbor.clone()) {
                        next_layer.push(neighbor.clone());
                    }
                }
            }
        }
        current_layer = next_layer;
    }
    
    visited.remove(start); // Remove origin
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
                        if state.get_neighbors(m_poly).contains(poly_id) {
                            valid = true;
                            break;
                        }
                    }
                }
                
                if valid {
                    if piece.piece_type == PieceType::Bishop || piece.piece_type == PieceType::Mage {
                        let mut enemy_adj = false;
                        for n in state.get_neighbors(poly_id) {
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
    let mut targets = HashSet::new();

    match piece.piece_type {
        PieceType::Goddess => {
            targets = get_polys_within_distance(&state.board, start, 2);
        },
        PieceType::Mage => {
            let start_color = &state.board.polygons[start].color;
            for t in get_polys_within_distance(&state.board, start, 3) {
                if state.board.polygons[&t].color != *start_color {
                    targets.insert(t);
                }
            }
        },
        PieceType::Bishop => {
            let start_color = &state.board.polygons[start].color;
            for t in get_polys_within_distance(&state.board, start, 4) {
                if state.board.polygons[&t].color == *start_color {
                    targets.insert(t);
                }
            }
        },
        PieceType::Heroe => {
            targets = get_polys_within_distance(&state.board, start, 3);
        },
        PieceType::Siren => {
            targets = get_polys_within_distance(&state.board, start, 2);
        },
        PieceType::Soldier | PieceType::Berserker => {
            // Simplified soldier movement: 1 step, or chain over friendly pieces
            let mut friendly_hops = HashSet::new();
            let mut explore = vec![start.clone()];
            friendly_hops.insert(start.clone());
            
            while let Some(current) = explore.pop() {
                for n in state.get_neighbors(&current) {
                    if state.is_occupied(&n) {
                        if state.get_occupant_side(&n) == Some(piece.side) {
                            if state.get_occupant_type(&n) != Some(PieceType::Berserker) {
                                if friendly_hops.insert(n.clone()) {
                                    explore.push(n.clone());
                                }
                            }
                        }
                    }
                }
            }
            
            for hop in friendly_hops {
                for n in state.get_neighbors(&hop) {
                    targets.insert(n);
                }
            }
            targets.remove(start);
        },
        PieceType::Ghoul => {
            // Simplified Ghoul logic: neighbors.
            for n in state.get_neighbors(start) {
                targets.insert(n);
            }
        }
    }

    // Filter out friendlies explicitly as they can't be captured safely in random mode
    targets.into_iter().filter(|t| t != start && state.get_occupant_side(t) != Some(piece.side)).collect()
}

pub fn apply_move(state: &mut GameState, piece_id: &str, target_poly: &str) -> Option<PieceType> {
    let mut captured_type = None;
    
    // Check if target is occupied
    if let Some(defender_id) = state.occupancy.get(target_poly).cloned() {
        captured_type = Some(state.board.pieces[&defender_id].piece_type.clone());
        state.board.pieces.get_mut(&defender_id).unwrap().position = "graveyard".to_string();
    }
    
    // Move the piece map
    let source_poly = state.board.pieces[piece_id].position.clone();
    state.occupancy.remove(&source_poly);
    
    state.board.pieces.get_mut(piece_id).unwrap().position = target_poly.to_string();
    state.occupancy.insert(target_poly.to_string(), piece_id.to_string());
    
    // Switch turn
    state.turn = if state.turn == Side::White { Side::Black } else { Side::White };
    
    captured_type
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
            
            let h0_near_6 = get_polys_within_distance(&state.board, &h0_poly, 6);
            if h0_near_6.contains(&h1_poly) { continue; }
            
            let g_near_3 = get_polys_within_distance(&state.board, &g_poly, 3);
            let g_near_6 = get_polys_within_distance(&state.board, &g_poly, 6);
            
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
        let mut set1_goddess: Vec<String> = get_polys_within_distance(&state.board, &g_poly, 1).into_iter().collect();
        if set1_goddess.len() < berserker_ids.len() {
            set1_goddess = get_polys_within_distance(&state.board, &g_poly, 2).into_iter().collect();
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
        let set1: Vec<String> = get_polys_within_distance(&state.board, &g_poly, 1).union(&get_polys_within_distance(&state.board, &h0_poly, 1)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance(&state.board, &h1_poly, 1)).cloned().collect();
        let set2: Vec<String> = get_polys_within_distance(&state.board, &g_poly, 2).union(&get_polys_within_distance(&state.board, &h0_poly, 2)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance(&state.board, &h1_poly, 2)).cloned().collect();
        let set3: Vec<String> = get_polys_within_distance(&state.board, &g_poly, 3).union(&get_polys_within_distance(&state.board, &h0_poly, 3)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance(&state.board, &h1_poly, 3)).cloned().collect();
        let set4: Vec<String> = get_polys_within_distance(&state.board, &g_poly, 4).union(&get_polys_within_distance(&state.board, &h0_poly, 4)).cloned().collect::<HashSet<_>>().union(&get_polys_within_distance(&state.board, &h1_poly, 4)).cloned().collect();

        let mut set_all = Vec::new();
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
    let mut rng = rand::rng();
    let current_turn = state.turn;
    
    let mut color_set = HashSet::new();
    for p in state.board.polygons.values() {
        color_set.insert(p.color.clone());
    }
    let colors: Vec<String> = color_set.into_iter().collect();
    let mut valid_colors = Vec::new();
    
    // Evaluate which colors strictly permit actual legal plays
    for c in &colors {
        state.color_chosen.insert(current_turn, c.clone());
        let mut m_pieces = Vec::new();
        for (id, p) in &state.board.pieces {
            if p.side == current_turn && p.position != "graveyard" {
                if p.position == "returned" {
                    m_pieces.push(id.clone());
                } else if state.board.polygons[&p.position].color == *c {
                    m_pieces.push(id.clone());
                }
            }
        }
        let mut has_move = false;
        for curr_piece in &m_pieces {
            if !get_legal_moves(state, curr_piece).is_empty() {
                has_move = true; break;
            }
        }
        if has_move { valid_colors.push(c.clone()); }
    }
    
    if valid_colors.is_empty() {
        state.turn = if state.turn == Side::White { Side::Black } else { Side::White };
        return false;
    }
    
    let chosen = valid_colors.into_iter().choose(&mut rng).unwrap();
    state.color_chosen.insert(current_turn, chosen.clone());

    let mut my_pieces = Vec::new();
    for (id, p) in &state.board.pieces {
        if p.side == current_turn && p.position != "graveyard" {
            if p.position == "returned" {
                my_pieces.push(id.clone());
            } else if state.board.polygons[&p.position].color == *chosen {
                my_pieces.push(id.clone());
            }
        }
    }

    let mut all_moves = Vec::new();
    for curr_piece in &my_pieces {
        let vectors = get_legal_moves(state, curr_piece);
        for v in vectors {
            all_moves.push((curr_piece.clone(), v));
        }
    }

    let (chosen_piece, chosen_target) = all_moves.into_iter().choose(&mut rng).unwrap();
    let captured = apply_move(state, &chosen_piece, &chosen_target);
    state.turn_counter += 1;
    
    captured == Some(PieceType::Goddess)
}
