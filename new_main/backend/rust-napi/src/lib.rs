use napi_derive::napi;
use rust_core::{GameState, GamePhase, Side, Piece, BoardMap, PieceType};
use rust_core::engine::{get_legal_moves, apply_move, setup_pieces, setup_random_board, pass_turn};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[napi(object)]
pub struct InitGameRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "randomSetup")]
    pub random_setup: bool,
}

#[napi(object)]
pub struct InitGameResponse {
    pub pieces_json: String,
    pub turn: String,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
}

#[napi]
pub fn init_game_state_napi(req: InitGameRequest) -> napi::Result<InitGameResponse> {
    let board: BoardMap = serde_json::from_str(&req.board_json)
        .map_err(|e| napi::Error::from_reason(format!("Failed to parse board: {}", e)))?;
    
    let mut state = GameState::new(board);
    
    if req.random_setup {
        setup_random_board(&mut state, None);
    } else {
        setup_pieces(&mut state);
    }
    
    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;
        
    Ok(InitGameResponse {
        pieces_json: updated_pieces_json,
        turn: format!("{:?}", state.turn).to_lowercase(),
        phase: "Setup".to_string(),
        setup_step: state.setup_step,
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
    })
}

#[napi(object)]
pub struct RandomizeRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "piecesJson")]
    pub pieces_json: String,
    pub turn: String,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
    pub side: String,
}

#[napi(object)]
pub struct RandomizeResponse {
    pub pieces_json: String,
    pub turn: String,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
}

#[napi]
pub fn randomize_setup_napi(req: RandomizeRequest) -> napi::Result<RandomizeResponse> {
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
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => Side::White,
    };
    
    state.phase = match req.phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = req.setup_step;
    state.turn_counter = req.turn_counter;
    state.is_new_turn = req.is_new_turn;
    state.moves_this_turn = req.moves_this_turn;
    state.locked_sequence_piece = req.locked_sequence_piece.clone();
    state.heroe_take_counter = req.heroe_take_counter;

    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }

    let side_to_randomize = match req.side.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => return Err(napi::Error::from_reason("Invalid side")),
    };

    setup_random_board(&mut state, Some(side_to_randomize));

    // Logic: Switch turn, potentially advance setup step, with auto-skipping randomized players
    let mut iterations = 0;
    while iterations < 10 { // Safety break
        if state.turn == Side::White {
            state.turn = Side::Black;
        } else {
            state.turn = Side::White;
            state.setup_step += 1;
        }

        if state.setup_step > 4 {
            state.phase = GamePhase::Playing;
            state.is_new_turn = true;
            break;
        }

        // Check if the NEW current player has any pieces to place for THIS step
        let (step_type, _) = match state.setup_step {
            0 => (PieceType::Goddess, 1),
            1 => (PieceType::Heroe, 2),
            2 => (PieceType::Berserker, 2),
            3 => (PieceType::Bishop, 4),
            4 => (PieceType::Ghoul, 18),
            _ => break,
        };

        let current_side = state.turn;
        let pieces_to_place = state.board.pieces.values().any(|p| {
            p.side == current_side && p.position == "returned" && 
            (if state.setup_step == 4 { 
                p.piece_type == PieceType::Ghoul || p.piece_type == PieceType::Siren 
            } else { 
                p.piece_type == step_type 
            })
        });

        if pieces_to_place {
            break; // This player has work to do
        }
        // Else: this player has no pieces to place for this step (already randomized/finished), skip again
        iterations += 1;
    }

    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;
        
    Ok(RandomizeResponse {
        pieces_json: updated_pieces_json,
        turn: format!("{:?}", state.turn).to_lowercase(),
        phase: if state.phase == GamePhase::Setup { "Setup".to_string() } else { "Playing".to_string() },
        setup_step: state.setup_step,
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
    })
}

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
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
    #[napi(js_name = "colorsEverChosen")]
    pub colors_ever_chosen: Vec<String>,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
}

#[napi(object)]
#[derive(Serialize, Deserialize)]
pub struct MoveResponse {
    pub targets: Vec<String>,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>, // side -> color
    #[napi(js_name = "colorsEverChosen")]
    pub colors_ever_chosen: Vec<String>,
    #[napi(js_name = "mageUnlocked")]
    pub mage_unlocked: bool,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    pub turn: String,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
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
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => Side::White,
    };
    
    state.phase = match req.phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = req.setup_step;
    state.turn_counter = req.turn_counter;
    state.is_new_turn = req.is_new_turn;
    state.moves_this_turn = req.moves_this_turn;
    state.locked_sequence_piece = req.locked_sequence_piece.clone();
    state.heroe_take_counter = req.heroe_take_counter;
    
    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }
    for c in &req.colors_ever_chosen {
        state.colors_ever_chosen.insert(c.to_lowercase());
    }

    let mut targets = Vec::new();
    
    if state.phase == GamePhase::Setup {
        if let Some(placements_map) = rust_core::engine::get_setup_legal_placements(&state).get(&req.piece_id) {
            targets = placements_map.clone();
        }
    } else {
        targets = get_legal_moves(&state, &req.piece_id);
    }
    
    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();
    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();

    Ok(MoveResponse { 
        targets, 
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: if state.phase == GamePhase::Setup { "Setup".to_string() } else { "Playing".to_string() },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
    })
}

#[napi(object)]
#[derive(Serialize, Deserialize)]
pub struct ApplyMoveRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "piecesJson")]
    pub pieces_json: String,
    #[napi(js_name = "pieceId")]
    pub piece_id: String,
    #[napi(js_name = "targetPoly")]
    pub target_poly: String,
    pub turn: String, 
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
    #[napi(js_name = "colorsEverChosen")]
    pub colors_ever_chosen: Vec<String>,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
}

#[napi(object)]
pub struct SelectColorRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "piecesJson")]
    pub pieces_json: String,
    pub color: String,
    pub turn: String,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
    #[napi(js_name = "colorsEverChosen")]
    pub colors_ever_chosen: Vec<String>,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
}

#[napi(object)]
pub struct ApplyMoveResponse {
    pub pieces_json: String,
    pub captured: Vec<String>, 
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
    #[napi(js_name = "colorsEverChosen")]
    pub colors_ever_chosen: Vec<String>,
    #[napi(js_name = "mageUnlocked")]
    pub mage_unlocked: bool,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    pub turn: String,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
}

#[napi(object)]
pub struct EndTurnSetupRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "piecesJson")]
    pub pieces_json: String,
    pub turn: String,
    pub phase: String,
    #[napi(js_name = "setupStep")]
    pub setup_step: u8,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
    #[napi(js_name = "colorsEverChosen")]
    pub colors_ever_chosen: Vec<String>,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "isNewTurn")]
    pub is_new_turn: bool,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "lockedSequencePiece")]
    pub locked_sequence_piece: Option<String>,
    #[napi(js_name = "heroeTakeCounter")]
    pub heroe_take_counter: u32,
}

#[napi]
pub fn end_turn_setup_napi(req: EndTurnSetupRequest) -> napi::Result<ApplyMoveResponse> {
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
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => Side::White,
    };
    
    state.phase = match req.phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = req.setup_step;
    state.turn_counter = req.turn_counter;
    state.is_new_turn = req.is_new_turn;
    state.moves_this_turn = req.moves_this_turn;
    state.locked_sequence_piece = req.locked_sequence_piece.clone();
    state.heroe_take_counter = req.heroe_take_counter;

    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }
    for c in &req.colors_ever_chosen {
        state.colors_ever_chosen.insert(c.to_lowercase());
    }

    // Logic: Switch turn, potentially advance setup step, with auto-skipping randomized players
    let mut iterations = 0;
    while iterations < 10 { // Safety break
        if state.turn == Side::White {
            state.turn = Side::Black;
        } else {
            state.turn = Side::White;
            state.setup_step += 1;
        }

        if state.setup_step > 4 {
            state.phase = GamePhase::Playing;
            state.is_new_turn = true;
            break;
        }

        // Check if the NEW current player has any pieces to place for THIS step
        let (step_type, _) = match state.setup_step {
            0 => (PieceType::Goddess, 1),
            1 => (PieceType::Heroe, 2),
            2 => (PieceType::Berserker, 2),
            3 => (PieceType::Bishop, 4),
            4 => (PieceType::Ghoul, 18),
            _ => break,
        };

        let current_side = state.turn;
        let pieces_to_place = state.board.pieces.values().any(|p| {
            p.side == current_side && p.position == "returned" && 
            (if state.setup_step == 4 { 
                p.piece_type == PieceType::Ghoul || p.piece_type == PieceType::Siren 
            } else { 
                p.piece_type == step_type 
            })
        });

        if pieces_to_place {
            break; // This player has work to do
        }
        // Else: this player has no pieces to place for this step (already randomized/finished), skip again
        iterations += 1;
    }

    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: Vec::new(),
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: if state.phase == GamePhase::Setup { "Setup".to_string() } else { "Playing".to_string() },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
    })
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
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => Side::White, // Default
    };
    
    state.phase = match req.phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = req.setup_step;
    
    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }
    state.turn_counter = req.turn_counter;
    state.is_new_turn = req.is_new_turn;
    state.moves_this_turn = req.moves_this_turn;
    state.locked_sequence_piece = req.locked_sequence_piece.clone();
    state.heroe_take_counter = req.heroe_take_counter;
    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }
    for c in &req.colors_ever_chosen {
        state.colors_ever_chosen.insert(c.to_lowercase());
    }

    // Authoritative Legality Check
    let legal_targets = get_legal_moves(&state, &req.piece_id);
    if !legal_targets.contains(&req.target_poly) {
        return Err(napi::Error::from_reason(format!(
            "Illegal move: Piece {} to {}. Legal targets: {:?}", 
            req.piece_id, req.target_poly, legal_targets
        )));
    }

    let was_returned = state.board.pieces.get(&req.piece_id).map(|p| p.position == "returned").unwrap_or(false);
    let captured = apply_move(&mut state, &req.piece_id, &req.target_poly);
    let captured_is_empty = captured.is_empty();
    let goddess_captured = captured.contains(&PieceType::Goddess);
    
    // (state.moves_this_turn already incremented inside apply_move)
    // (state.is_new_turn handled inside apply_move_turnover)

    // Apply turnover logic to handle branch turn breaking vs sequence locking
    rust_core::engine::apply_move_turnover(
        &mut state, 
        &req.piece_id, 
        &req.target_poly, 
        goddess_captured, 
        captured_is_empty,
        was_returned
    );
    
    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let captured_strs = captured.iter().map(|c| format!("{:?}", c).to_lowercase()).collect();
    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();
    
    println!("[NAPI] apply_move: turn={:?}, color_chosen={:?}, is_new_turn={}", state.turn, state.color_chosen, state.is_new_turn);

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: captured_strs,
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: if state.phase == GamePhase::Setup { "Setup".to_string() } else { "Playing".to_string() },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
    })
}

#[napi]
pub fn pass_turn_playing_napi(req: ApplyMoveRequest) -> napi::Result<ApplyMoveResponse> {
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
    
    // Rebuild occupancy map
    state.occupancy.clear();
    for (id, p) in state.board.pieces.iter() {
        if p.position != "returned" && p.position != "graveyard" {
            state.occupancy.insert(p.position.clone(), id.clone());
        }
    }

    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => Side::White,
    };
    
    state.phase = match req.phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = req.setup_step;
    state.turn_counter = req.turn_counter;
    state.is_new_turn = req.is_new_turn;
    state.moves_this_turn = req.moves_this_turn;
    state.locked_sequence_piece = req.locked_sequence_piece.clone();
    state.heroe_take_counter = req.heroe_take_counter;
    
    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }
    for c in &req.colors_ever_chosen {
        state.colors_ever_chosen.insert(c.to_lowercase());
    }

    pass_turn(&mut state);

    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();

    println!("[NAPI] pass_turn_playing: turn={:?}, color_chosen={:?}, is_new_turn={}", state.turn, state.color_chosen, state.is_new_turn);

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: Vec::new(),
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: if state.phase == GamePhase::Setup { "Setup".to_string() } else { "Playing".to_string() },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
    })
}

#[napi]
pub fn select_color_napi(req: SelectColorRequest) -> napi::Result<ApplyMoveResponse> {
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
    
    state.turn = match req.turn.to_lowercase().as_str() {
        "white" => Side::White,
        "black" | "yellow" => Side::Black,
        _ => Side::White,
    };
    
    state.phase = match req.phase.to_lowercase().as_str() {
        "setup" => GamePhase::Setup,
        "playing" => GamePhase::Playing,
        _ => GamePhase::Setup,
    };
    
    state.setup_step = req.setup_step;
    state.turn_counter = req.turn_counter;
    state.is_new_turn = req.is_new_turn;
    state.moves_this_turn = req.moves_this_turn;
    state.locked_sequence_piece = req.locked_sequence_piece.clone();
    state.heroe_take_counter = req.heroe_take_counter;
    
    for (s, c) in req.color_chosen.clone() {
        let side = if s.to_lowercase() == "white" { Side::White } else { Side::Black };
        state.color_chosen.insert(side, c.to_lowercase());
    }
    for c in &req.colors_ever_chosen {
        state.colors_ever_chosen.insert(c.to_lowercase());
    }

    state.set_color_chosen(state.turn, &req.color.to_lowercase());

    let mage_unlocked_flag = state.is_mage_unlocked();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();

    println!("[NAPI] select_color: color={}, turn={:?}, is_new_turn={}", req.color, state.turn, state.is_new_turn);

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: Vec::new(),
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: if state.phase == GamePhase::Setup { "Setup".to_string() } else { "Playing".to_string() },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
    })
}
