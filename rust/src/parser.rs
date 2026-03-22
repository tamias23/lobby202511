use std::error::Error;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use crate::models::{BoardMap, Piece};

pub fn load_board<P: AsRef<Path>>(path: P) -> Result<BoardMap, Box<dyn Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let board: BoardMap = serde_json::from_reader(reader)?;
    
    validate_board(&board)?;
    
    Ok(board)
}

fn validate_board(board: &BoardMap) -> Result<(), Box<dyn Error>> {
    // Basic structural validation
    if board.polygons.is_empty() {
        return Err("Board has no polygons".into());
    }

    if board.pieces.is_empty() {
        return Err("Board has no pieces".into());
    }

    // Verify all neighbors genuinely correspond to valid polygon strings.
    for (poly_name, polygon) in &board.polygons {
        let n_list = if !polygon.neighbors.is_empty() { &polygon.neighbors } else { &polygon.neighbours };
        for neighbor_name in n_list {
            if !board.polygons.contains_key(neighbor_name) {
                return Err(format!(
                    "Polygon {} references non-existent neighbor {}",
                    poly_name, neighbor_name
                ).into());
            }
        }
    }

    // Verify all placed piece positions legitimately map to polygons or known states.
    for (piece_id, piece) in &board.pieces {
        let pos = &piece.position;
        if pos != "returned" && pos != "graveyard" && !board.polygons.contains_key(pos) {
            return Err(format!(
                "Piece {} holds invalid position coordinate: {}",
                piece_id, pos
            ).into());
        }
    }

    Ok(())
}
