pub mod models;
pub mod parser;
pub mod engine;
pub mod server;

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        println!("Usage: cargo run -- <path_to_board.json> [delay_ms]");
        std::process::exit(1);
    }
    
    let path = &args[1];
    let delay_ms = if args.len() > 2 {
        args[2].parse().unwrap_or(500)
    } else {
        500
    };
    
    let max_turns = if args.len() > 3 {
        args[3].parse().unwrap_or(100)
    } else {
        100
    };
    
    println!("Loading board layout from {}...", path);
    let board = match parser::load_board(path) {
        Ok(b) => b,
        Err(e) => {
            println!("Validation mapping failed: {}", e);
            std::process::exit(1);
        }
    };
    
    println!("Board parsed perfectly. Initializing core engine simulator...");
    server::start_server(board, delay_ms, max_turns).await;
}
