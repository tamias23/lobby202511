use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::services::ServeDir;

use crate::models::BoardMap;
use crate::engine::{GameState, perform_turn, setup_random_board};
use crate::agents::Agent;

pub struct AppState {
    pub game_state: Mutex<GameState>,
    pub delay_ms: u64,
    pub max_turns: u32,
    pub white_agent: Arc<dyn Agent>,
    pub black_agent: Arc<dyn Agent>,
}

pub async fn start_server(
    initial_board: BoardMap, 
    delay_ms: u64, 
    max_turns: u32,
    white_agent: Arc<dyn Agent>,
    black_agent: Arc<dyn Agent>
) {
    let mut state = GameState::new(initial_board);
    setup_random_board(&mut state);

    let shared_state = Arc::new(AppState {
        game_state: Mutex::new(state),
        delay_ms,
        max_turns,
        white_agent,
        black_agent,
    });

    let app = Router::new()
        .fallback_service(ServeDir::new("static")) // serve visualizer interface
        .route("/ws", get(ws_handler))
        .with_state(shared_state);

    let addr = "0.0.0.0:3000";
    println!("Visualizer hosted at http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

use serde::Serialize;

#[derive(Serialize)]
struct SocketPayload<'a> {
    #[serde(flatten)]
    board: &'a crate::models::BoardMap,
    chosen_color: Option<String>,
    turn: crate::models::Side,
    turn_counter: u32,
    moves_this_turn: u32,
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    // Broadcast Turn 0 (Pristine Initial Board Setup) before executing any AI turns.
    {
        let gs = state.game_state.lock().await;
        let c = gs.color_chosen.get(&gs.turn).cloned();
        let payload = SocketPayload {
            board: &gs.board,
            chosen_color: c,
            turn: gs.turn.clone(),
            turn_counter: gs.turn_counter,
            moves_this_turn: gs.moves_this_turn,
        };
        let json = serde_json::to_string(&payload).unwrap();
        if socket.send(Message::Text(json.into())).await.is_err() {
            println!("Client disconnected immediately.");
            return;
        }
    }

    tokio::time::sleep(std::time::Duration::from_millis(state.delay_ms)).await;

    loop {
        let (board_json, delay, won, drawn) = {
            let mut gs = state.game_state.lock().await;
            
            let agent: &dyn Agent = match gs.turn {
                crate::models::Side::White => &*state.white_agent,
                crate::models::Side::Black => &*state.black_agent,
            };
            
            let (won, _) = perform_turn(&mut gs, agent);
            let drawn = gs.turn_counter >= state.max_turns;
            let c = gs.color_chosen.get(&gs.turn).cloned();
            let payload = SocketPayload {
                board: &gs.board,
                chosen_color: c,
                turn: gs.turn.clone(),
                turn_counter: gs.turn_counter,
                moves_this_turn: gs.moves_this_turn,
            };
            let json = serde_json::to_string(&payload).unwrap();
            (json, state.delay_ms, won, drawn)
        };

        if socket.send(Message::Text(board_json.into())).await.is_err() {
            println!("Client socket disconnected.");
            break;
        }

        if won {
            println!("Simulation ended: A Goddess was successfully captured!");
            break;
        }
        
        if drawn {
            println!("Simulation ended: Draw reached after {} turns ({} by White, {} by Black)!", state.max_turns, state.max_turns/2, state.max_turns/2);
            break;
        }

        tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
    }
}
