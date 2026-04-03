use napi_derive::napi;
use crate::models::{BoardMap, Piece, Side};
use crate::engine::{GameState, GamePhase, get_legal_moves, apply_move};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[napi(object)]
#[derive(Serialize, Deserialize)]
pub struct MoveRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "piecesJson")]
    pub pieces_json: String,
    #[napi(js_name = "pieceId")]
    pub piece_id: String,
    pub turn: String, 
}

#[napi(object)]
#[derive(Serialize, Deserialize)]
pub struct MoveResponse {
    pub targets: Vec<String>,
}

#[napi]
pub fn get_legal_moves_napi(req: MoveRequest) -> napi::Result<MoveResponse> {
    let board: BoardMap = serde_json::from_str(&req.board_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse board: {}", e)))?;
    
    let pieces: Vec<Piece> = serde_json::from_str(&req.pieces_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse pieces: {}", e)))?;

    let mut pieces_map = HashMap::new();
    for p in pieces {
        pieces_map.insert(p.id.clone(), p);
    }
    
    let mut state = GameState::new(board);
    state.board.pieces = pieces_map;
    
    // CRITICAL: Rebuild occupancy map because GameState::new used the original board pieces
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => return Err(napi::Error::from_reason("Invalid turn color")),
    };
    state.phase = GamePhase::Playing;

    // TUTORIAL BYPASS: Automatically "choose" the color of the clicked piece if it is on the board.
    // This allows pieces to be movable in the tutorial without a formal color choice phase.
    if let Some(p) = state.board.pieces.get(&req.piece_id) {
        if p.position != "returned" && p.position != "graveyard" {
            if let Some(poly) = state.board.polygons.get(&p.position) {
                state.color_chosen.insert(state.turn, poly.color.clone());
            }
        }
    }

    let targets = get_legal_moves(&state, &req.piece_id);
    Ok(MoveResponse { targets })
}

#[napi(object)]
pub struct ApplyMoveRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "piecesJson")]
    pub pieces_json: String,
    #[napi(js_name = "pieceId")]
    pub piece_id: String,
    #[napi(js_name = "targetPoly")]
    pub target_poly: String,
}

#[napi(object)]
pub struct ApplyMoveResponse {
    pub pieces_json: String,
    pub captured: Vec<String>, 
}

#[napi]
pub fn apply_move_napi(req: ApplyMoveRequest) -> napi::Result<ApplyMoveResponse> {
    let board: BoardMap = serde_json::from_str(&req.board_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse board: {}", e)))?;
    
    let pieces: Vec<Piece> = serde_json::from_str(&req.pieces_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse pieces: {}", e)))?;

    let mut pieces_map = HashMap::new();
    for p in pieces {
        pieces_map.insert(p.id.clone(), p);
    }
    
    let mut state = GameState::new(board);
    state.board.pieces = pieces_map;
    
    // CRITICAL: Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.phase = GamePhase::Playing;

    let captured = apply_move(&mut state, &req.piece_id, &req.target_poly);
    
    // Return the updated pieces list
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let captured_strs = captured.iter().map(|c| format!("{:?}", c).to_lowercase()).collect();
    
    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: captured_strs
    })
}

