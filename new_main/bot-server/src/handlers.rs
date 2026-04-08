use axum::{
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── Request / Response types ────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct MoveRequest {
    pub agent_type: String,          // "greedy_jack" | "mcts"
    pub model_name: Option<String>,  // e.g. "rank_002_yYtlgZLn13" or "model" (for .onnx)
    pub mcts_budget_ms: Option<u64>, // only relevant for mcts
    pub game_state: GameStatePayload,
}

/// A flat, JSON-serializable view of the game state sent from Server A.
#[derive(Deserialize)]
pub struct GameStatePayload {
    pub board: serde_json::Value,         // full board JSON (allPolygons, allPieces, allEdges)
    pub pieces: Vec<serde_json::Value>,   // current piece states
    pub turn: String,                     // "white" | "black"
    pub phase: String,                    // "Setup" | "Playing" | "GameOver"
    pub color_chosen: HashMap<String, String>,
    pub colors_ever_chosen: Option<Vec<String>>,
    pub is_new_turn: bool,
    pub moves_this_turn: u32,
    pub locked_sequence_piece: Option<String>,
    pub heroe_take_counter: Option<u32>,
    pub setup_step: Option<u8>,
    pub turn_counter: Option<u32>,
    pub visited_polygons: Option<Vec<String>>,
    pub setup_placements_this_turn: Option<u32>,
}

#[derive(Serialize)]
pub struct MoveResponse {
    pub action: String,          // "move" | "pass" | "color"
    pub piece: Option<String>,   // set when action == "move"
    pub target: Option<String>,  // set when action == "move"
    pub color: Option<String>,   // set when action == "color"
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
}

// ─── Handlers ────────────────────────────────────────────────────────────────

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok".to_string() })
}

#[derive(Serialize)]
pub struct ModelInfo {
    pub agent_type: String,   // "greedy_jack" | "mcts"
    pub model_name: String,   // e.g. "rank_002_yYtlgZLn13" or "model"
    pub display_name: String, // human-friendly name for UI
}

#[derive(Serialize)]
pub struct ModelsResponse {
    pub models: Vec<ModelInfo>,
}

pub async fn list_models() -> Json<ModelsResponse> {
    let models_dir = std::env::var("MODELS_DIR")
        .unwrap_or_else(|_| "./models".to_string());

    let mut models = Vec::new();

    // Scan greedy_jack/*.json
    let gj_dir = format!("{}/greedy_jack", models_dir);
    if let Ok(entries) = std::fs::read_dir(&gj_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    models.push(ModelInfo {
                        agent_type: "greedy_jack".to_string(),
                        model_name: stem.to_string(),
                        display_name: format!("GreedyJack ({})", stem),
                    });
                }
            }
        }
    }

    // Sort greedy_jack models by name so rank ordering is preserved
    models.sort_by(|a, b| a.model_name.cmp(&b.model_name));

    // Scan mcts/*.onnx
    let mcts_dir = format!("{}/mcts", models_dir);
    if let Ok(entries) = std::fs::read_dir(&mcts_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("onnx") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    models.push(ModelInfo {
                        agent_type: "mcts".to_string(),
                        model_name: stem.to_string(),
                        display_name: format!("MCTS ({})", stem),
                    });
                }
            }
        }
    }

    tracing::info!("[BotServer] /models: returning {} models", models.len());
    Json(ModelsResponse { models })
}

pub async fn get_move(
    Json(req): Json<MoveRequest>,
) -> Result<Json<MoveResponse>, (StatusCode, String)> {
    let result = tokio::task::spawn_blocking(move || compute_move(req))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task panicked: {}", e)))?;

    result.map(Json).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

// ─── Core logic (runs in a blocking thread) ──────────────────────────────────

fn compute_move(req: MoveRequest) -> Result<MoveResponse, String> {
    use rust::engine::{GameState, GamePhase, get_legal_colors, get_legal_moves};
    use rust::models::{BoardMap, Piece, Side};
    use rust::agents::{Agent, AgentMove};
    use std::sync::Arc;

    tracing::info!(
        "[BotServer] compute_move: agent={}, phase={}, turn={}, is_new_turn={}, setup_step={:?}, placements_this_turn={:?}",
        req.agent_type,
        req.game_state.phase,
        req.game_state.turn,
        req.game_state.is_new_turn,
        req.game_state.setup_step,
        req.game_state.setup_placements_this_turn,
    );

    // 1. Reconstruct BoardMap from the payload
    //    Server A stores board as its own format; we need to produce the JSON
    //    that rust_core::parser::parse_board() expects.
    let board_json = build_board_json(&req.game_state)
        .map_err(|e| format!("Failed to build board JSON: {}", e))?;

    let board: BoardMap = serde_json::from_str(&board_json)
        .map_err(|e| format!("Failed to parse board: {}", e))?;

    // 2. Build GameState
    let mut gs = GameState::new(board);

    // Override pieces with current positions from the payload
    apply_piece_positions(&mut gs, &req.game_state.pieces)
        .map_err(|e| format!("Failed to apply piece positions: {}", e))?;

    // Override turn metadata
    gs.turn = parse_side(&req.game_state.turn)?;
    gs.phase = parse_phase(&req.game_state.phase)?;
    gs.is_new_turn = req.game_state.is_new_turn;
    gs.moves_this_turn = req.game_state.moves_this_turn;
    gs.heroe_take_counter = req.game_state.heroe_take_counter.unwrap_or(0);
    gs.setup_step = req.game_state.setup_step.unwrap_or(0);
    gs.turn_counter = req.game_state.turn_counter.unwrap_or(0);
    gs.locked_sequence_piece = req.game_state.locked_sequence_piece.clone();
    gs.setup_placements_this_turn = req.game_state.setup_placements_this_turn.unwrap_or(0);

    for (side_str, color) in &req.game_state.color_chosen {
        let side = parse_side(side_str)?;
        gs.color_chosen.insert(side, color.clone());
    }

    if let Some(colors) = &req.game_state.colors_ever_chosen {
        for c in colors {
            gs.colors_ever_chosen.insert(c.clone());
        }
    }

    if let Some(visited) = &req.game_state.visited_polygons {
        for v in visited {
            gs.visited_polygons.insert(v.clone());
        }
    }

    // 3. Build the agent
    let agent: Arc<dyn rust::agents::Agent> = build_agent(&req)?;

    // 4. Get the move depending on phase

    // ── SETUP PHASE: one piece placement at a time ──
    if gs.phase == GamePhase::Setup {
        use rust::engine::{get_setup_legal_placements, check_setup_step_complete};

        let placements = get_setup_legal_placements(&gs);
        let eligible_ids = gs.get_eligible_piece_ids();
        let mut all_moves: HashMap<String, Vec<String>> = HashMap::new();
        for p_id in eligible_ids {
            if let Some(targets) = placements.get(&p_id) {
                if !targets.is_empty() {
                    all_moves.insert(p_id, targets.clone());
                }
            }
        }

        if all_moves.is_empty() {
            tracing::info!("[BotServer] Setup: no moves available → setup_done");
            // No more pieces to place for this step — tell Server A to end the setup turn
            return Ok(MoveResponse {
                action: "setup_done".to_string(),
                piece: None,
                target: None,
                color: None,
            });
        }

        // Allow pass if placed >=1 piece and opponent hasn't finished this step
        let pass_allowed = gs.setup_placements_this_turn > 0 && {
            let enemy = gs.get_enemy_side();
            !check_setup_step_complete(&gs, enemy)
        };

        let action = agent.choose_move(&gs, &all_moves, pass_allowed);
        return match action {
            AgentMove::Pass => {
                tracing::info!("[BotServer] Setup: agent passed → setup_done");
                Ok(MoveResponse {
                    action: "setup_done".to_string(),
                    piece: None,
                    target: None,
                    color: None,
                })
            },
            AgentMove::Move { piece, target } => {
                tracing::info!("[BotServer] Setup: place {} → {}", piece, target);
                Ok(MoveResponse {
                    action: "setup_place".to_string(),
                    piece: Some(piece),
                    target: Some(target),
                    color: None,
                })
            },
        };
    }

    // ── PLAYING PHASE ──
    if gs.is_new_turn {
        // Bot needs to choose a color
        let valid_colors = get_legal_colors(&gs, &gs.turn);
        if valid_colors.is_empty() {
            return Ok(MoveResponse {
                action: "pass".to_string(),
                piece: None,
                target: None,
                color: None,
            });
        }
        let chosen = agent.choose_color(&gs, &valid_colors);
        return Ok(MoveResponse {
            action: "color".to_string(),
            piece: None,
            target: None,
            color: Some(chosen.clone()),
        });
    }

    // Bot needs to choose a move
    let eligible_ids = gs.get_eligible_piece_ids();
    let mut all_moves = std::collections::HashMap::new();
    for p_id in eligible_ids {
        let moves = get_legal_moves(&gs, &p_id);
        if !moves.is_empty() {
            all_moves.insert(p_id, moves);
        }
    }

    let pass_allowed = gs.locked_sequence_piece.is_some();

    if all_moves.is_empty() && !pass_allowed {
        // No moves available — pass
        return Ok(MoveResponse {
            action: "pass".to_string(),
            piece: None,
            target: None,
            color: None,
        });
    }

    let action = agent.choose_move(&gs, &all_moves, pass_allowed);
    match action {
        AgentMove::Pass => Ok(MoveResponse {
            action: "pass".to_string(),
            piece: None,
            target: None,
            color: None,
        }),
        AgentMove::Move { piece, target } => Ok(MoveResponse {
            action: "move".to_string(),
            piece: Some(piece),
            target: Some(target),
            color: None,
        }),
    }
}

// ─── Agent factory ───────────────────────────────────────────────────────────

fn build_agent(req: &MoveRequest) -> Result<std::sync::Arc<dyn rust::agents::Agent>, String> {
    use rust::agents;

    // Models directory — bundled into the Docker image at /app/models
    // Falls back to relative path for local development
    let models_dir = std::env::var("MODELS_DIR")
        .unwrap_or_else(|_| "./models".to_string());

    match req.agent_type.as_str() {
        "greedy_jack" => {
            let model_name = req.model_name.as_deref().unwrap_or("rank_002_yYtlgZLn13");
            let path = format!("{}/greedy_jack/{}.json", models_dir, model_name);

            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read greedy_jack model '{}': {}", path, e))?;
            let json: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse model JSON: {}", e))?;
            let arr = json["weights"].as_array()
                .ok_or("No 'weights' key in model JSON")?;
            let weights: Vec<f64> = arr.iter().filter_map(|v| v.as_f64()).collect();

            if weights.len() < agents::greedy_jack::NUM_PARAMS {
                return Err(format!(
                    "Expected {} weights, got {}",
                    agents::greedy_jack::NUM_PARAMS,
                    weights.len()
                ));
            }

            Ok(std::sync::Arc::new(agents::greedy_jack::GreedyJackAgent::new(weights)))
        }

        "mcts" => {
            let budget_ms = req.mcts_budget_ms.unwrap_or(500);
            let model_name = req.model_name.as_deref().unwrap_or("model");
            let onnx_path = format!("{}/mcts/{}.onnx", models_dir, model_name);

            // Check if the ONNX file exists; if not, use uniform priors
            let model_path = if std::path::Path::new(&onnx_path).exists() {
                Some(onnx_path)
            } else {
                tracing::warn!("ONNX model not found at '{}', using uniform priors", onnx_path);
                None
            };

            Ok(std::sync::Arc::new(agents::mcts::MctsAgent::new(
                budget_ms,
                model_path,
                "/tmp/mcts_data".to_string(),
                false, // don't record training data
                0,     // verbosity
            )))
        }

        other => Err(format!("Unknown agent_type '{}'. Supported: greedy_jack, mcts", other)),
    }
}

// ─── State reconstruction helpers ────────────────────────────────────────────

/// Builds the board JSON string that rust_core::parser::parse_board() expects.
/// Server A stores the board as `board: { allPolygons, allPieces, allEdges }`.
fn build_board_json(payload: &GameStatePayload) -> Result<String, String> {
    // The board field from Server A already has the right shape
    serde_json::to_string(&payload.board)
        .map_err(|e| format!("Failed to serialize board: {}", e))
}

/// Populates gs.board.pieces and gs.occupancy directly from the JSON payload.
/// The board JSON loaded by parse_board may have different piece IDs than the
/// actual game pieces — so we replace the piece map entirely from the payload.
fn apply_piece_positions(
    gs: &mut rust::engine::GameState,
    pieces: &[serde_json::Value],
) -> Result<(), String> {
    use rust::models::Piece;

    gs.board.pieces.clear();
    gs.occupancy.clear();

    for piece_val in pieces {
        // Deserialize each piece using the existing Piece serde impl
        let piece: Piece = serde_json::from_value(piece_val.clone())
            .map_err(|e| format!("Failed to deserialize piece {}: {}", piece_val, e))?;

        let position = piece.position.clone();
        let id = piece.id.clone();

        gs.board.pieces.insert(id.clone(), piece);

        if position != "returned" && position != "graveyard" {
            gs.occupancy.insert(position, id);
        }
    }

    tracing::info!("[BotServer] apply_piece_positions: loaded {} pieces, {} on board",
        gs.board.pieces.len(),
        gs.occupancy.len()
    );

    Ok(())
}

fn parse_side(s: &str) -> Result<rust::models::Side, String> {
    match s.to_lowercase().as_str() {
        "white" => Ok(rust::models::Side::White),
        "black" => Ok(rust::models::Side::Black),
        other => Err(format!("Unknown side '{}'", other)),
    }
}

fn parse_phase(s: &str) -> Result<rust::engine::GamePhase, String> {
    match s {
        "Setup" => Ok(rust::engine::GamePhase::Setup),
        "Playing" => Ok(rust::engine::GamePhase::Playing),
        "GameOver" => Ok(rust::engine::GamePhase::GameOver),
        other => Err(format!("Unknown phase '{}'", other)),
    }
}
