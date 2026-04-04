use wasm_bindgen::prelude::*;
use rust_core::{GameState, GamePhase, Side, Piece, BoardMap};
use rust_core::engine::get_legal_moves;
use std::collections::HashMap;

#[wasm_bindgen]
pub fn get_legal_moves_wasm(
    board_json: &str, 
    pieces_json: &str, 
    piece_id: &str, 
    turn: &str, 
    phase: &str, 
    setup_step: u8, 
    color_chosen_json: &str,
    turn_counter: u32,
    is_new_turn: bool,
    moves_this_turn: u32,
    locked_sequence_piece: Option<String>,
    heroe_take_counter: u32
) -> Result<String, JsValue> {
    let board: BoardMap = serde_json::from_str(board_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse board: {}", e)))?;
    
    let pieces: Vec<Piece> = serde_json::from_str(pieces_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse pieces: {}", e)))?;

    let mut pieces_map = HashMap::new();
    for p in pieces {
        pieces_map.insert(p.id.clone(), p);
    }
    
    let mut state = GameState::new(board);
    state.board.pieces = pieces_map;
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => return Err(JsValue::from_str("Invalid turn color")),
    };
    
    state.phase = match phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = setup_step;
    state.turn_counter = turn_counter;
    state.is_new_turn = is_new_turn;
    state.moves_this_turn = moves_this_turn;
    state.locked_sequence_piece = locked_sequence_piece;
    state.heroe_take_counter = heroe_take_counter;
    
    if let Ok(color_chosen) = serde_json::from_str::<HashMap<String, String>>(color_chosen_json) {
        for (s, c) in color_chosen {
            let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
            state.color_chosen.insert(side, c.to_lowercase());
        }
    }

    let mut targets = Vec::new();
    if state.phase == GamePhase::Setup {
        if let Some(placements_map) = rust_core::engine::get_setup_legal_placements(&state).get(piece_id) {
            targets = placements_map.clone();
        }
    } else {
        targets = get_legal_moves(&state, piece_id);
    }
    
    serde_json::to_string(&targets)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize targets: {}", e)))
}

#[wasm_bindgen]
pub fn get_eligible_pieces_wasm(
    board_json: &str, 
    pieces_json: &str, 
    turn: &str, 
    phase: &str, 
    setup_step: u8, 
    color_chosen_json: &str,
    turn_counter: u32,
    is_new_turn: bool,
    moves_this_turn: u32,
    locked_sequence_piece: Option<String>,
    heroe_take_counter: u32
) -> Result<String, JsValue> {
    let board: BoardMap = serde_json::from_str(board_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse board: {}", e)))?;
    
    let pieces: Vec<Piece> = serde_json::from_str(pieces_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse pieces: {}", e)))?;

    let mut pieces_map = HashMap::new();
    for p in pieces {
        pieces_map.insert(p.id.clone(), p);
    }
    
    let mut state = GameState::new(board);
    state.board.pieces = pieces_map;
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn_counter = turn_counter;
    state.is_new_turn = is_new_turn;
    state.moves_this_turn = moves_this_turn;
    state.heroe_take_counter = heroe_take_counter;

    state.turn = match turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => return Err(JsValue::from_str("Invalid turn color")),
    };
    
    state.phase = match phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = setup_step;
    state.locked_sequence_piece = locked_sequence_piece;
    
    if let Ok(color_chosen) = serde_json::from_str::<HashMap<String, String>>(color_chosen_json) {
        for (s, c) in color_chosen {
            let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
            state.color_chosen.insert(side, c.to_lowercase());
        }
    }

    let eligible = state.get_eligible_piece_ids();
    
    serde_json::to_string(&eligible)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize eligible ids: {}", e)))
}
