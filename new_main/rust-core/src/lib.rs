pub mod models;
pub mod engine;
pub mod parser;

// Re-export core types for easier access
pub use models::{BoardMap, Piece, PieceType, Side};
pub use engine::{GameState, GamePhase, get_legal_moves, apply_move};
