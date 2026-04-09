use napi_derive::napi;
use rust_core::{GameState, GamePhase, Side, Piece, BoardMap, PieceType};
use rust_core::engine::{get_legal_moves, apply_move, apply_move_turnover, setup_pieces, setup_random_board, pass_turn, check_setup_step_complete, apply_setup_placement_turnover};
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
    pub winner: Option<String>,
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
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
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
    pub winner: Option<String>,
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

    // Correct turn-switching after a randomize:
    // Randomize places ALL remaining pieces for the current player, so original_done is always true.
    // The step advances only when BOTH players are done.
    // A player with no pieces left for the current step cannot be given the turn.
    let original_side = state.turn;
    let opponent_side = state.get_enemy_side();

    let original_done = check_setup_step_complete(&state, original_side);
    let opponent_done  = check_setup_step_complete(&state, opponent_side);

    if original_done && opponent_done {
        // Both done → advance step; White always starts the next setup phase.
        state.setup_step += 1;
        if state.setup_step > 4 {
            state.phase = GamePhase::Playing;
            state.is_new_turn = true;
        }
        state.turn = Side::White;
    } else if !opponent_done {
        // Opponent still has pieces → give them the turn.
        state.turn = opponent_side;
    }
    // else: opponent is done, current player still has pieces left → turn unchanged.

    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;
        
    Ok(RandomizeResponse {
        pieces_json: updated_pieces_json,
        turn: format!("{:?}", state.turn).to_lowercase(),
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        setup_step: state.setup_step,
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
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
    pub winner: Option<String>,
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
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
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
    pub winner: Option<String>,
    pub reason: Option<String>,
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

    // Correct turn-switching for end_turn_setup:
    // A player can end their turn after placing >= 1 piece for the current step.
    // The step only advances when BOTH players have placed ALL their pieces.
    // A player with no pieces left for the current step cannot be given the turn.
    let original_side = state.turn;
    let opponent_side = state.get_enemy_side();

    let original_done = check_setup_step_complete(&state, original_side);
    let opponent_done  = check_setup_step_complete(&state, opponent_side);

    state.setup_placements_this_turn = 0;

    if original_done && opponent_done {
        // Both done → advance step; White always starts the next setup phase.
        state.setup_step += 1;
        if state.setup_step > 4 {
            state.phase = GamePhase::Playing;
            state.is_new_turn = true;
        }
        state.turn = Side::White;

        // Rule: "when a player has no piece left for the current phase, this player
        // cannot be given the turn". After advancing, keep skipping until we find
        // a player who still needs to place pieces for the new phase, or both are
        // done and we need to advance again.
        while state.phase == GamePhase::Setup {
            let white_done = check_setup_step_complete(&state, Side::White);
            let black_done = check_setup_step_complete(&state, Side::Black);
            if white_done && black_done {
                // Both done with this step too — advance again
                state.setup_step += 1;
                state.setup_placements_this_turn = 0;
                if state.setup_step > 4 {
                    state.phase = GamePhase::Playing;
                    state.is_new_turn = true;
                    state.turn = Side::White;
                    break;
                }
                state.turn = Side::White;
            } else if white_done {
                // White already done with this step → skip to black
                state.turn = Side::Black;
                break;
            } else {
                // White still has pieces to place → White goes first (normal)
                break;
            }
        }
    } else if !opponent_done {
        // Opponent still has pieces → give them the turn.
        state.turn = opponent_side;
    }
    // else: opponent is already done, current player still has pieces → turn stays with current player.

    let mage_unlocked_flag = state.is_mage_unlocked();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();
    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: Vec::new(),
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
        reason: state.reason.clone(),
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
        _ => Side::White, 
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
    
    // Apply turnover logic
    rust_core::engine::apply_move_turnover(
        &mut state, 
        &req.piece_id, 
        &req.target_poly, 
        goddess_captured, 
        captured_is_empty,
        was_returned
    );
    
    let mage_unlocked_flag = state.is_mage_unlocked();
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let captured_strs = captured.iter().map(|c| format!("{:?}", c).to_lowercase()).collect();
    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: captured_strs,
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
        reason: state.reason.clone(),
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
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: Vec::new(),
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
        reason: state.reason.clone(),
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
    let updated_pieces: Vec<Piece> = state.board.pieces.into_values().collect();
    let updated_pieces_json = serde_json::to_string(&updated_pieces)
        .map_err(|e| napi::Error::from_reason(format!("Failed to serialize updated pieces: {}", e)))?;

    let colors = state.color_chosen.iter().map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone())).collect();
    let ever_chosen_vec: Vec<String> = state.colors_ever_chosen.iter().cloned().collect();

    Ok(ApplyMoveResponse { 
        pieces_json: updated_pieces_json,
        captured: Vec::new(),
        color_chosen: colors,
        colors_ever_chosen: ever_chosen_vec,
        mage_unlocked: mage_unlocked_flag,
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        setup_step: state.setup_step,
        turn: format!("{:?}", state.turn).to_lowercase(),
        turn_counter: state.turn_counter,
        is_new_turn: state.is_new_turn,
        moves_this_turn: state.moves_this_turn,
        locked_sequence_piece: state.locked_sequence_piece.clone(),
        heroe_take_counter: state.heroe_take_counter,
        winner: state.winner.map(|s| format!("{:?}", s).to_lowercase()),
        reason: state.reason.clone(),
    })
}

// ─── Replay to step ───────────────────────────────────────────────

#[napi(object)]
pub struct ReplayRequest {
    #[napi(js_name = "boardJson")]
    pub board_json: String,
    #[napi(js_name = "movesJson")]
    pub moves_json: String,
    pub step: u32,
}

#[napi(object)]
pub struct ReplayResponse {
    pub pieces_json: String,
    pub turn: String,
    pub phase: String,
    #[napi(js_name = "turnCounter")]
    pub turn_counter: u32,
    #[napi(js_name = "movesThisTurn")]
    pub moves_this_turn: u32,
    #[napi(js_name = "colorChosen")]
    pub color_chosen: HashMap<String, String>,
}

#[napi]
pub fn replay_to_step_napi(req: ReplayRequest) -> napi::Result<ReplayResponse> {
    let board: BoardMap = serde_json::from_str(&req.board_json)
        .map_err(|e| napi::Error::from_reason(format!("Board parse error: {}", e)))?;

    #[derive(serde::Deserialize)]
    struct MoveEvent {
        #[serde(default)]
        active_side: String,
        #[serde(default)]
        phase: String,
        #[serde(default)]
        chosen_color: String,
        #[serde(default)]
        piece_id: String,
        #[serde(default)]
        target_id: String,
    }

    let move_events: Vec<MoveEvent> = serde_json::from_str(&req.moves_json)
        .map_err(|e| napi::Error::from_reason(format!("Moves parse error: {}", e)))?;

    let mut state = GameState::new(board);
    setup_pieces(&mut state);

    let step = req.step as usize;

    for (i, m) in move_events.iter().enumerate() {
        if i >= step {
            break;
        }

        let active_side = match m.active_side.to_lowercase().as_str() {
            "white" => Side::White,
            _ => Side::Black,
        };

        if m.phase == "setup" {
            state.turn = active_side;
            if !m.piece_id.is_empty() {
                apply_setup_placement_turnover(&mut state, &m.piece_id, &m.target_id);
            }
        } else {
            // Playing phase
            state.turn = active_side;
            if !m.chosen_color.is_empty() {
                state.color_chosen.insert(active_side, m.chosen_color.clone());
                state.is_new_turn = false;
            }

            if m.piece_id.is_empty() {
                continue;
            }

            let grabbed_position = state.board.pieces
                .get(&m.piece_id)
                .map(|p| p.position.clone())
                .unwrap_or_default();

            let captured = apply_move(&mut state, &m.piece_id, &m.target_id);
            let goddess_captured = captured.contains(&PieceType::Goddess);
            apply_move_turnover(
                &mut state,
                &m.piece_id,
                &m.target_id,
                goddess_captured,
                captured.is_empty(),
                grabbed_position == "returned",
            );
        }
    }

    // Serialize the current piece state
    let pieces: Vec<serde_json::Value> = state.board.pieces.values().map(|p| {
        serde_json::json!({
            "id": p.id,
            "type": p.piece_type,
            "side": p.side,
            "position": p.position,
        })
    }).collect();

    let color_chosen: HashMap<String, String> = state.color_chosen.iter()
        .map(|(s, c)| (format!("{:?}", s).to_lowercase(), c.clone()))
        .collect();

    Ok(ReplayResponse {
        pieces_json: serde_json::to_string(&pieces).unwrap_or_else(|_| "[]".to_string()),
        turn: format!("{:?}", state.turn).to_lowercase(),
        phase: match state.phase {
            GamePhase::Setup => "Setup".to_string(),
            GamePhase::Playing => "Playing".to_string(),
            GamePhase::GameOver => "GameOver".to_string(),
        },
        turn_counter: state.turn_counter,
        moves_this_turn: state.moves_this_turn,
        color_chosen,
    })
}
