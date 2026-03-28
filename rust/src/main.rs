use rust::*;

use std::sync::Arc;

fn parse_flag_value(args: &[String], flag: &str, default: u32) -> u32 {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

fn parse_flag_str<'a>(args: &'a [String], flag: &str, default: &'a str) -> &'a str {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1))
        .map(|s| s.as_str())
        .unwrap_or(default)
}

fn make_agent(name: &str, weights_str: Option<&String>, mcts_budget: u64, mcts_data_dir: String, model_path: Option<String>) -> Arc<dyn agents::Agent> {
    match name {
        "random" => Arc::new(agents::random::RandomAgent),
        "mcts" => {
            let path = model_path.unwrap_or_else(|| "./rust/model.onnx".to_string());
            Arc::new(agents::mcts::MctsAgent::new(mcts_budget, Some(path), mcts_data_dir))
        }, 
        "greedy_bob" => {
            let mut weights = [1.0; 26]; // Default baseline
            if let Some(w_str) = weights_str {
                let parsed: Vec<f64> = w_str.split(',').filter_map(|s| s.parse().ok()).collect();
                for (i, val) in parsed.into_iter().enumerate().take(26) {
                    weights[i] = val;
                }
            }
            Arc::new(agents::greedy_bob::GreedyBobAgent::new(weights))
        }
        other => {
            eprintln!("Unknown agent '{}'. Available: random, greedy_bob, mcts", other);
            std::process::exit(1);
        }
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        println!("Usage:");
        println!("  cargo run -- <board.json> [--delay <ms>] [--max-turns <N>] [--white <agent>] [--black <agent>] [--mcts-budget <ms>] [--mcts-data-dir <dir>]");
        println!("  cargo run -- <board.json> --batch <n_games> [--max-turns <N>] [--white <agent>] [--black <agent>] [--store-parquet <dir>] [--mcts-budget <ms>] [--mcts-data-dir <dir>]");
        println!("  Optional Agent Traits:");
        println!("      --white-name \"Agent 1\"");
        println!("      --black-name \"Agent 2\"");
        println!("      --white-model-path \"/path/to/model.onnx\"");
        println!("      --black-model-path \"/path/to/model.onnx\"");
        println!("      --greedy-weights-white \"1.0,1.0,-2.0,...\"");
        println!("      --greedy-weights-black \"1.0,1.0,-2.0,...\"");
        println!();
        println!("  Agents: random, greedy_bob, mcts");
        std::process::exit(1);
    }

    let path = &args[1];

    let board = match parser::load_board(path) {
        Ok(b) => b,
        Err(e) => {
            println!("Failed to load board: {}", e);
            std::process::exit(1);
        }
    };

    let max_turns = parse_flag_value(&args, "--max-turns", 500);
    let mcts_budget = parse_flag_value(&args, "--mcts-budget", 100) as u64;
    let white_agent_name = parse_flag_str(&args, "--white", "random").to_string();
    let black_agent_name = parse_flag_str(&args, "--black", "random").to_string();
    let mcts_data_dir = parse_flag_str(&args, "--mcts-data-dir", "./rust/mcts_temp").to_string();
    let display_white_name = parse_flag_str(&args, "--white-name", &white_agent_name).to_string();
    let display_black_name = parse_flag_str(&args, "--black-name", &black_agent_name).to_string();
    let parquet_dir = args.iter().position(|a| a == "--store-parquet").and_then(|i| args.get(i + 1)).cloned();
    
    let white_weights = args.iter().position(|a| a == "--greedy-weights-white").and_then(|i| args.get(i + 1));
    let black_weights = args.iter().position(|a| a == "--greedy-weights-black").and_then(|i| args.get(i + 1));

    let white_model_path = args.iter().position(|a| a == "--white-model-path").and_then(|i| args.get(i + 1)).cloned();
    let black_model_path = args.iter().position(|a| a == "--black-model-path").and_then(|i| args.get(i + 1)).cloned();

    let white_agent = make_agent(&white_agent_name, white_weights, mcts_budget, mcts_data_dir.clone(), white_model_path);
    let black_agent = make_agent(&black_agent_name, black_weights, mcts_budget, mcts_data_dir, black_model_path);

    if let Some(batch_pos) = args.iter().position(|a| a == "--batch") {
        let n_games: u32 = args.get(batch_pos + 1)
            .and_then(|s| s.parse().ok())
            .unwrap_or(100);

        run_batch(
            board, 
            n_games, 
            max_turns, 
            &display_white_name, 
            &display_black_name, 
            white_agent.as_ref(), 
            black_agent.as_ref(),
            parquet_dir,
            path
        );
    } else {
        // Visual server mode
        let delay_ms = parse_flag_value(&args, "--delay", 500) as u64;

        println!("Loading board layout from {}...", path);
        println!("Board parsed perfectly. Initializing core engine simulator...");
        server::start_server(board, delay_ms, max_turns, white_agent, black_agent).await;
    }
}

fn run_batch(
    board: crate::models::BoardMap,
    n_games: u32,
    max_turns: u32,
    white_name: &str,
    black_name: &str,
    white_agent: &dyn agents::Agent,
    black_agent: &dyn agents::Agent,
    parquet_dir: Option<String>,
    board_path: &str,
) {
    use crate::engine::{GameState, perform_turn, setup_random_board};
    use crate::models::Side;
    use uuid::Uuid;
    use crate::recorder::{Recorder, GameRecord, MoveEvent, current_timestamp_ms, current_date_string};

    println!(
        "Running {} headless games (max {} turns, White={}, Black={})...",
        n_games, max_turns, white_name, black_name
    );

    let mut white_wins = 0u32;
    let mut black_wins = 0u32;
    let mut draws = 0u32;
    let mut total_turns: u64 = 0;
    
    let mut recorder = parquet_dir.is_some().then(|| Recorder::new());
    
    let board_id = std::path::Path::new(board_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("default")
        .to_string();

    for game in 1..=n_games {
        let mut gs = GameState::new(board.clone());
        setup_random_board(&mut gs);
        
        let mut init_map = std::collections::HashMap::new();
        for (pid, p) in &gs.board.pieces {
            init_map.insert(pid.clone(), p.position.clone());
        }
        let initial_state = serde_json::to_string(&init_map).unwrap_or_else(|_| "{}".to_string());
        
        let game_id = Uuid::new_v4().to_string();
        let game_date = current_date_string();
        let game_start_ms = current_timestamp_ms();
        let mut game_moves = Vec::new();

        let mut winner: Option<Side> = None;
        while gs.turn_counter < max_turns {
            let active_side = gs.turn.clone();
            let current_turn_number = gs.turn_counter;
            
            let agent: &dyn agents::Agent = match active_side {
                Side::White => white_agent,
                Side::Black => black_agent,
            };
            
            let (goddess_captured, move_made) = perform_turn(&mut gs, agent);
            
            if recorder.is_some() {
                if let Some((piece, target, chosen_color)) = move_made {
                    game_moves.push(MoveEvent {
                        turn_number: current_turn_number,
                        active_side: format!("{:?}", active_side),
                        chosen_color,
                        piece_id: piece,
                        target_pos: target,
                        timestamp_ms: current_timestamp_ms(),
                    });
                }
            }
            
            if goddess_captured {
                winner = Some(active_side);
                break;
            }
        }

        // Notify agents of results for RL feedback
        white_agent.record_winner(winner);
        black_agent.record_winner(winner);

        total_turns += gs.turn_counter as u64;
        let final_winner = match winner {
            Some(Side::White) => { white_wins += 1; "White" }
            Some(Side::Black) => { black_wins += 1; "Black" }
            _ => { draws += 1; "Draw" }
        };
        
        if let Some(mut rec) = recorder.as_mut() {
            let moves_json = serde_json::to_string(&game_moves).unwrap_or_else(|_| "[]".to_string());
            rec.add_game(GameRecord {
                game_id: game_id.clone(),
                board_id: board_id.clone(),
                timestamp: game_start_ms,
                game_date,
                white_name: white_name.to_string(),
                black_name: black_name.to_string(),
                winner: final_winner.to_string(),
                total_turns: gs.turn_counter,
                initial_state,
                moves: moves_json,
            });
        }

        let report_every = (n_games / 10).max(1);
        if n_games <= 20 || game % report_every == 0 {
            println!("  Game {}/{} done — turns: {}", game, n_games, gs.turn_counter);
        }

        // Structured telemetry for scripts
        let telemetry_game = serde_json::json!({
            "winner": final_winner.to_lowercase(),
            "turns": gs.turn_counter,
            "game_id": game_id
        });
        println!("GAMEOVER: {}", telemetry_game);
    }

    let avg_turns = total_turns as f64 / n_games as f64;
    println!("\n=== Batch Results ({} games, White={}, Black={}) ===", n_games, white_name, black_name);
    println!("  White wins : {} ({:.1}%)", white_wins, 100.0 * white_wins as f64 / n_games as f64);
    println!("  Black wins : {} ({:.1}%)", black_wins, 100.0 * black_wins as f64 / n_games as f64);
    println!("  Draws      : {} ({:.1}%)", draws, 100.0 * draws as f64 / n_games as f64);
    println!("  Avg turns  : {:.1}", avg_turns);

    // Structured telemetry for batch
    let telemetry_batch = serde_json::json!({
        "n_games": n_games,
        "white_wins": white_wins,
        "black_wins": black_wins,
        "draws": draws,
        "avg_turns": avg_turns,
        "ts": current_timestamp_ms()
    });
    println!("BATCH_STATS: {}", telemetry_batch);
    
    if let Some(dir) = parquet_dir {
        println!("Writing session games to parquet in {}...", dir);
        if let Some(rec) = recorder {
            let file_id = Uuid::new_v4().to_string();
            let p = std::path::Path::new(&dir).join(format!("batch_{}_{}.parquet", current_timestamp_ms(), file_id));
            if let Err(e) = rec.write_parquet(p.to_str().unwrap()) {
                eprintln!("Failed to write parquet: {}", e);
            } else {
                println!("Successfully saved {} games to {}", rec.records.len(), p.display());
            }
        }
    }
}
