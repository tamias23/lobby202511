use axum::{
    extract::{Path, State},
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use polars::prelude::*;
use rust::engine::{apply_move, apply_move_turnover, GameState};
use rust::models::{BoardMap, Side};
use rust::parser::load_board;
use rust::recorder::{GameRecord, MoveEvent};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::services::ServeDir;

#[derive(Serialize, Clone)]
struct SocketPayload {
    #[serde(flatten)]
    board: BoardMap,
    chosen_color: Option<String>,
    turn: Side,
    turn_counter: u32,
    moves_this_turn: u32,
    white_name: String,
    black_name: String,
}

struct AppState {
    games: Vec<GameRecord>,
    boards: HashMap<String, BoardMap>,
}

fn load_parquet(file_path: &str) -> Vec<GameRecord> {
    let mut file = std::fs::File::open(file_path).unwrap();
    let df = ParquetReader::new(&mut file).finish().unwrap();

    let mut records = Vec::new();
    let game_ids = df.column("game_id").unwrap().str().unwrap();
    let timestamps = df.column("timestamp").unwrap().i64().unwrap();
    let white_names = df.column("white_name").and_then(|c| c.str()).ok();
    let black_names = df.column("black_name").and_then(|c| c.str()).ok();
    let white_player_ids = df.column("white_player_id").and_then(|c| c.str()).ok();
    let black_player_ids = df.column("black_player_id").and_then(|c| c.str()).ok();
    let board_ids = df.column("board_id").unwrap().str().unwrap();
    let winners = df.column("winner").unwrap().str().unwrap();
    let moves = df.column("moves").unwrap().str().unwrap();

    for i in 0..df.height() {
        records.push(GameRecord {
            game_id: game_ids.get(i).unwrap().to_string(),
            timestamp: timestamps.get(i).unwrap_or(0),
            white_name: white_names.and_then(|c| c.get(i)).unwrap_or("White").to_string(),
            black_name: black_names.and_then(|c| c.get(i)).unwrap_or("Black").to_string(),
            white_player_id: white_player_ids.and_then(|c| c.get(i)).unwrap_or("").to_string(),
            black_player_id: black_player_ids.and_then(|c| c.get(i)).unwrap_or("").to_string(),
            board_id: board_ids.get(i).unwrap().to_string(),
            winner: winners.get(i).unwrap().to_string(),
            moves: moves.get(i).unwrap().to_string(),
        });
    }
    records
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: cargo run --bin replay <parquet_file>");
        std::process::exit(1);
    }
    let parquet_file = &args[1];

    println!("Loading games from {}...", parquet_file);
    let games = load_parquet(parquet_file);
    println!("Loaded {} games.", games.len());

    let mut boards = HashMap::new();
    for g in &games {
        if !boards.contains_key(&g.board_id) {
            let path1 = format!("games/data/{}.json", &g.board_id);
            let path2 = format!("../games/data/{}.json", &g.board_id);
            
            if let Ok(b) = load_board(&path1).or_else(|_| load_board(&path2)) {
                boards.insert(g.board_id.clone(), b);
            } else {
                eprintln!("Warning: Failed to load board json for board_id: {}", g.board_id);
            }
        }
    }

    let state = Arc::new(AppState { games, boards });

    let app = Router::new()
        .fallback_service(ServeDir::new("static")) // Serves rust/static natively
        .route("/api/games", get(list_games))
        .route("/api/games/{game_id}/turn/{turn}", get(get_turn))
        .with_state(state);

    let addr = "0.0.0.0:3001";
    println!("Native Rust Replay Viewer hosted at http://{}", addr);
    println!("Please open http://localhost:3001/replay.html in your browser!");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn list_games(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(state.games.clone())
}

async fn get_turn(
    State(state): State<Arc<AppState>>,
    Path((game_id, turn)): Path<(String, u32)>,
) -> impl IntoResponse {
    let game = state.games.iter().find(|g| g.game_id == game_id);
    if game.is_none() {
        return Json(None::<SocketPayload>).into_response();
    }
    let game = game.unwrap();

    let board = state.boards.get(&game.board_id);
    if board.is_none() {
        return Json(None::<SocketPayload>).into_response();
    }
    let board = board.unwrap().clone();

    let mut gs = GameState::new(board.clone());
    rust::engine::setup_pieces(&mut gs);

    // All pieces start in "returned". Setup moves place them on the board.
    let move_events: Vec<MoveEvent> = serde_json::from_str(&game.moves).unwrap_or_default();
    let mut last_turn_side = gs.turn.clone();
    let mut last_chosen_color = gs.color_chosen.get(&gs.turn).cloned();
    let mut moves_run = 0;

    // Iterate up to the specified turn (1 turn = 1 move played)
    for (i, m) in move_events.iter().enumerate() {
        if i >= turn as usize {
            break;
        }
        
        let active_side = match m.active_side.to_lowercase().as_str() {
            "white" => Side::White,
            _ => Side::Black,
        };

        // Sync turn and color from event
        gs.turn = active_side;
        if m.phase != "setup" && !m.chosen_color.is_empty() {
             gs.color_chosen.insert(active_side, m.chosen_color.clone());
             gs.is_new_turn = false;
        }

        last_turn_side = gs.turn;
        last_chosen_color = if m.phase == "setup" { None } else { Some(m.chosen_color.clone()) };

        if m.piece_id.is_empty() {
            continue;
        }

        let piece_opt = gs.board.pieces.get(&m.piece_id);
        if piece_opt.is_none() {
            continue;
        }

        if m.phase == "setup" {
            // Setup phase: use the setup-specific function.
            rust::engine::apply_setup_placement_turnover(&mut gs, &m.piece_id, &m.target_id);
            moves_run = gs.setup_placements_this_turn;
        } else {
            // Game phase: standard move + turnover path.
            let grabbed_position = piece_opt.unwrap().position.clone();
            let captured = apply_move(&mut gs, &m.piece_id, &m.target_id);
            let goddess_captured = captured.contains(&rust::models::PieceType::Goddess);
            apply_move_turnover(
                &mut gs,
                &m.piece_id,
                &m.target_id,
                goddess_captured,
                captured.is_empty(),
                grabbed_position == "returned",
            );
            moves_run = gs.moves_this_turn;
        }
    }

    let payload = SocketPayload {
        board: gs.board,
        chosen_color: last_chosen_color,
        turn: last_turn_side,
        turn_counter: gs.turn_counter,
        moves_this_turn: moves_run,
        white_name: game.white_name.clone(),
        black_name: game.black_name.clone(),
    };

    Json(Some(payload)).into_response()
}
