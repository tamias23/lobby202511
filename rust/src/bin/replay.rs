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
    let board_ids = df.column("board_id").unwrap().str().unwrap();
    let timestamps = df.column("timestamp").unwrap().i64().unwrap();
    let game_dates = df.column("game_date").unwrap().str().unwrap();
    let winners = df.column("winner").unwrap().str().unwrap();
    let total_turns = df.column("total_turns").unwrap().u32().unwrap();
    let initial_states = df.column("initial_state").unwrap().str().unwrap();
    let moves = df.column("moves").unwrap().str().unwrap();

    for i in 0..df.height() {
        records.push(GameRecord {
            game_id: game_ids.get(i).unwrap().to_string(),
            board_id: board_ids.get(i).unwrap().to_string(),
            timestamp: timestamps.get(i).unwrap_or(0),
            game_date: game_dates.get(i).unwrap().to_string(),
            winner: winners.get(i).unwrap().to_string(),
            total_turns: total_turns.get(i).unwrap_or(0),
            initial_state: initial_states.get(i).unwrap_or("{}").to_string(),
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
    
    gs.occupancy.clear();
    let init_map: std::collections::HashMap<String, String> = serde_json::from_str(&game.initial_state).unwrap_or_default();
    for (pid, pos) in init_map {
        if let Some(piece) = gs.board.pieces.get_mut(&pid) {
            piece.position = pos.clone();
            if pos != "returned" && pos != "graveyard" {
                gs.occupancy.insert(pos, pid);
            }
        }
    }

    let move_events: Vec<MoveEvent> = serde_json::from_str(&game.moves).unwrap_or_default();
    let mut last_turn_side = gs.turn.clone();
    let mut last_chosen_color = gs.color_chosen.get(&gs.turn).cloned();
    let mut moves_run = 0;

    // Iterate up to the specified turn (1 turn = 1 move played)
    for (i, m) in move_events.iter().enumerate() {
        if i >= turn as usize {
            break;
        }
        
        if gs.is_new_turn {
            gs.moves_this_turn = 0;
            gs.is_new_turn = false;
        }

        gs.turn = match m.active_side.as_str() {
            "white" => Side::White,
            _ => Side::Black,
        };
        gs.color_chosen.insert(gs.turn.clone(), m.chosen_color.clone());

        last_turn_side = gs.turn.clone();
        last_chosen_color = Some(m.chosen_color.clone());
        gs.moves_this_turn += 1;
        moves_run = gs.moves_this_turn;

        let piece_opt = gs.board.pieces.get(&m.piece_id);
        if piece_opt.is_none() {
            println!("CRITICAL DEBUG: MISSING PIECE IN gs.board.pieces -> '{}'", m.piece_id);
            continue;
        }
        let grabbed_position = piece_opt.unwrap().position.clone();
        let captured = apply_move(&mut gs, &m.piece_id, &m.target_pos);
        let goddess_captured = captured.contains(&rust::models::PieceType::Goddess);
        apply_move_turnover(
            &mut gs,
            &m.piece_id,
            &m.target_pos,
            goddess_captured,
            captured.is_empty(),
            grabbed_position == "returned",
        );
    }
    
    // Explicitly sync the `moves_this_turn` counter
    // The counter logic is native to turnover sequence. We just set it strictly for display.

    let payload = SocketPayload {
        board: gs.board,
        chosen_color: last_chosen_color,
        turn: last_turn_side,
        turn_counter: gs.turn_counter,
        moves_this_turn: moves_run,
    };

    Json(Some(payload)).into_response()
}
