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

fn make_agent(name: &str, weights_str: Option<&String>, mcts_budget: u64, mcts_data_dir: String, model_path: Option<String>, mcts_record: bool, verbosity: u8, num_threads: usize) -> Arc<dyn agents::Agent> {
    match name {
        "random" => Arc::new(agents::random::RandomAgent),
        "mcts" => {
            let path = model_path.unwrap_or_else(|| "./rust/model.onnx".to_string());
            Arc::new(agents::mcts::MctsAgent::with_threads(mcts_budget, Some(path), mcts_data_dir, mcts_record, verbosity, num_threads))
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
        "greedy_jack" => {
            let num = agents::greedy_jack::NUM_PARAMS;
            let weights = if let Some(path) = model_path {
                // Load weights from JSON file (as produced by genetic_jack.py)
                match std::fs::read_to_string(&path) {
                    Ok(content) => {
                        let json: serde_json::Value = serde_json::from_str(&content)
                            .unwrap_or_else(|e| { eprintln!("Failed to parse JSON from {}: {}", path, e); std::process::exit(1); });
                        let arr = json["weights"].as_array()
                            .unwrap_or_else(|| { eprintln!("No 'weights' array in {}", path); std::process::exit(1); });
                        let w: Vec<f64> = arr.iter().filter_map(|v| v.as_f64()).collect();
                        if w.len() < num {
                            eprintln!("Expected {} weights in {}, got {}", num, path, w.len());
                            std::process::exit(1);
                        }
                        println!("Loaded GreedyJack weights from {} ({} params)", path, w.len());
                        w
                    }
                    Err(e) => { eprintln!("Failed to read {}: {}", path, e); std::process::exit(1); }
                }
            } else if let Some(w_str) = weights_str {
                let mut weights = vec![0.01_f64; num];
                let parsed: Vec<f64> = w_str.split(',').filter_map(|s| s.parse().ok()).collect();
                for (i, val) in parsed.into_iter().enumerate().take(num) {
                    weights[i] = val;
                }
                weights
            } else {
                vec![0.01_f64; num]
            };
            Arc::new(agents::greedy_jack::GreedyJackAgent::new(weights))
        }
        other => {
            eprintln!("Unknown agent '{}'. Available: random, greedy_bob, greedy_jack, mcts", other);
            std::process::exit(1);
        }
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Suppress ONNX Runtime C++ warnings (VerifyOutputSizes) written directly to stderr.
    // These bypass all logging APIs, so we redirect stderr to /dev/null when not at max verbosity.
    let verbosity_early = args.iter().position(|a| a == "--verbose")
        .and_then(|i| args.get(i + 1))
        .and_then(|s| s.parse::<u8>().ok())
        .unwrap_or(0);
    if verbosity_early < 3 {
        use std::os::unix::io::{AsRawFd, FromRawFd};
        if let Ok(devnull) = std::fs::File::open("/dev/null") {
            let devnull_fd = devnull.as_raw_fd();
            // SAFETY: dup2 is safe here — called single-threaded before tokio runtime starts.  
            // We redirect fd 2 (stderr) to /dev/null to suppress C++ ORT warnings.
            unsafe {
                // Use the libc dup2 syscall via the platform's C library (always linked)
                unsafe extern "C" { fn dup2(oldfd: i32, newfd: i32) -> i32; }
                dup2(devnull_fd, 2);
            }
            // Keep devnull alive so the fd doesn't get closed
            std::mem::forget(devnull);
        }
    }

    if args.len() < 2 {
        println!("Usage:");
        println!("  cargo run -- <board.json> [--delay <ms>] [--max-turns <N>] [--white <agent>] [--black <agent>]");
        println!("              [--mcts-budget <ms>] [--mcts-budget-white <ms>] [--mcts-budget-black <ms>]");
        println!("              [--mcts-threads <N>] [--mcts-threads-white <N>] [--mcts-threads-black <N>] [--mcts-data-dir <dir>]");
        println!("  cargo run -- <board.json> --batch <n_games> [--max-turns <N>] [--white <agent>] [--black <agent>] [--store-parquet <dir>]");
        println!("              [--mcts-budget <ms>] [--mcts-budget-white <ms>] [--mcts-budget-black <ms>]");
        println!("              [--mcts-threads <N>] [--mcts-threads-white <N>] [--mcts-threads-black <N>] [--mcts-data-dir <dir>]");
        println!("  Optional Agent Traits:");
        println!("      --white-name \"Agent 1\"");
        println!("      --black-name \"Agent 2\"");
        println!("      --white-model-path \"/path/to/model.onnx\"");
        println!("      --black-model-path \"/path/to/model.onnx\"");
        println!("      --greedy-weights-white \"1.0,1.0,-2.0,...\"");
        println!("      --greedy-weights-black \"1.0,1.0,-2.0,...\"");
        println!();
        println!("  Agents: random, greedy_bob, greedy_jack, mcts");
        println!("  Flags:");
        println!("      --mcts-no-record  Disable search data collection for MCTS");
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
    // Per-side budget overrides: fall back to the shared --mcts-budget if not specified
    let mcts_budget_white = {
        let v = parse_flag_value(&args, "--mcts-budget-white", 0);
        if v > 0 { v as u64 } else { mcts_budget }
    };
    let mcts_budget_black = {
        let v = parse_flag_value(&args, "--mcts-budget-black", 0);
        if v > 0 { v as u64 } else { mcts_budget }
    };
    // Per-side thread counts: --mcts-threads sets the shared default (1 = single-threaded).
    // Self-play training leaves this unset, so it always defaults to 1 (no overhead).
    let mcts_threads = parse_flag_value(&args, "--mcts-threads", 1) as usize;
    let mcts_threads_white = {
        let v = parse_flag_value(&args, "--mcts-threads-white", 0) as usize;
        if v > 0 { v } else { mcts_threads }
    };
    let mcts_threads_black = {
        let v = parse_flag_value(&args, "--mcts-threads-black", 0) as usize;
        if v > 0 { v } else { mcts_threads }
    };
    let white_agent_name = parse_flag_str(&args, "--white", "random").to_string();
    let black_agent_name = parse_flag_str(&args, "--black", "random").to_string();
    let mcts_data_dir = parse_flag_str(&args, "--mcts-data-dir", "./rust/mcts_temp").to_string();
    let display_white_name = parse_flag_str(&args, "--white-name", &white_agent_name).to_string();
    let display_black_name = parse_flag_str(&args, "--black-name", &black_agent_name).to_string();
    let parquet_dir = args.iter().position(|a| a == "--store-parquet").and_then(|i| args.get(i + 1)).cloned();
    let verbosity = parse_flag_value(&args, "--verbose", 0) as u8;
    
    let white_weights = args.iter().position(|a| a == "--greedy-weights-white").and_then(|i| args.get(i + 1));
    let black_weights = args.iter().position(|a| a == "--greedy-weights-black").and_then(|i| args.get(i + 1));

    let white_model_path = args.iter().position(|a| a == "--white-model-path").and_then(|i| args.get(i + 1)).cloned();
    let black_model_path = args.iter().position(|a| a == "--black-model-path").and_then(|i| args.get(i + 1)).cloned();
    
    let mcts_record = !args.contains(&"--mcts-no-record".to_string());

    let white_agent = make_agent(&white_agent_name, white_weights, mcts_budget_white, mcts_data_dir.clone(), white_model_path, mcts_record, verbosity, mcts_threads_white);
    let black_agent = make_agent(&black_agent_name, black_weights, mcts_budget_black, mcts_data_dir, black_model_path, mcts_record, verbosity, mcts_threads_black);

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
            path,
            verbosity
        );
    } else {
        // Visual server mode
        let delay_ms = parse_flag_value(&args, "--delay", 500) as u64;

        println!("Loading board layout from {}...", path);
        println!("Board parsed perfectly. Initializing core engine simulator...");
        server::start_server(board, delay_ms, max_turns, white_agent, black_agent, verbosity).await;
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
    verbosity: u8,
) {
    use crate::engine::{GameState, GamePhase, perform_turn, perform_setup_turn, setup_pieces};
    use crate::models::Side;
    use uuid::Uuid;
    use crate::recorder::{Recorder, GameRecord, MoveEvent, current_timestamp_ms};

    if verbosity >= 1 {
        println!(
            "Running {} headless games (max {} turns, White={}, Black={})...",
            n_games, max_turns, white_name, black_name
        );
    }

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
        if verbosity >= 1 {
            println!("  --- Game {}/{} starting ---", game, n_games);
            use std::io::{self, Write};
            io::stdout().flush().unwrap();
        }

        let mut gs = GameState::new(board.clone());
        setup_pieces(&mut gs);

        let game_id = Uuid::new_v4().to_string();
        let game_start_ms = current_timestamp_ms();

        let mut game_moves = Vec::new();

        // 1. Setup Phase
        while gs.phase == GamePhase::Setup {
            let active_side = gs.turn;
            let agent: &dyn agents::Agent = match active_side {
                Side::White => white_agent,
                Side::Black => black_agent,
            };
            let (_, move_made) = perform_setup_turn(&mut gs, agent, verbosity);
            
            if recorder.is_some() {
                if let Some((piece, target)) = move_made {
                    game_moves.push(MoveEvent {
                        turn_number: 0,
                        active_side: format!("{:?}", active_side).to_lowercase(),
                        phase: "setup".to_string(),
                        chosen_color: String::new(),
                        piece_id: piece,
                        target_id: target,
                        timestamp_ms: current_timestamp_ms(),
                    });
                }
            }
        }

        let mut winner: Option<Side> = None;
        while gs.turn_counter < max_turns {
            let active_side = gs.turn.clone();
            let current_turn_number = gs.turn_counter;
            
            let agent: &dyn agents::Agent = match active_side {
                Side::White => white_agent,
                Side::Black => black_agent,
            };
            
            let (goddess_captured, move_made) = perform_turn(&mut gs, agent, verbosity);

            if verbosity >= 1 && gs.turn_counter > 0 && gs.turn_counter % 50 == 0 {
                use std::io::{self, Write};
                println!("      [Game {}] Turn {}...", game, gs.turn_counter);
                io::stdout().flush().unwrap();
            }
            
            if recorder.is_some() {
                if let Some((piece, target, chosen_color)) = move_made {
                    game_moves.push(MoveEvent {
                        turn_number: current_turn_number,
                        active_side: format!("{:?}", active_side).to_lowercase(),
                        phase: "playing".to_string(),
                        chosen_color,
                        piece_id: piece,
                        target_id: target,
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
            Some(Side::White) => { white_wins += 1; "white" }
            Some(Side::Black) => { black_wins += 1; "black" }
            _ => { draws += 1; "draw" }
        };
        
        if let Some(mut rec) = recorder.as_mut() {
            let moves_json = serde_json::to_string(&game_moves).unwrap_or_else(|_| "[]".to_string());
            rec.add_game(GameRecord {
                game_id: game_id.clone(),
                timestamp: game_start_ms,
                white_name: white_name.to_string(),
                black_name: black_name.to_string(),
                white_player_id: String::new(),
                black_player_id: String::new(),
                board_id: board_id.clone(),
                winner: final_winner.to_string(),
                moves: moves_json,
            });
        }

        if verbosity >= 1 {
            let report_every = (n_games / 10).max(1);
            if n_games <= 20 || game % report_every == 0 {
                println!("  Game {}/{} done — turns: {}", game, n_games, gs.turn_counter);
            }
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
    if verbosity >= 1 {
        println!("\n=== Batch Results ({} games, White={}, Black={}) ===", n_games, white_name, black_name);
        println!("  White wins : {} ({:.1}%)", white_wins, 100.0 * white_wins as f64 / n_games as f64);
        println!("  Black wins : {} ({:.1}%)", black_wins, 100.0 * black_wins as f64 / n_games as f64);
        println!("  Draws      : {} ({:.1}%)", draws, 100.0 * draws as f64 / n_games as f64);
        println!("  Avg turns  : {:.1}", avg_turns);
    }

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
        if verbosity >= 1 {
            println!("Writing session games to parquet in {}...", dir);
        }
        if let Some(rec) = recorder {
            let file_id = Uuid::new_v4().to_string();
            let p = std::path::Path::new(&dir).join(format!("batch_{}_{}.parquet", current_timestamp_ms(), file_id));
            if let Err(e) = rec.write_parquet(p.to_str().unwrap()) {
                eprintln!("Failed to write parquet: {}", e);
            } else {
                if verbosity >= 1 {
                    println!("Successfully saved {} games to {}", rec.records.len(), p.display());
                }
            }
        }
    }
}
