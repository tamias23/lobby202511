use rust_core::models::*;
use std::collections::HashMap;

fn main() {
    let mut polygons = HashMap::new();
    polygons.insert("p1".to_string(), Polygon {
        id: 1,
        name: "p1".to_string(),
        color: "blue".to_string(),
        shape: "hex".to_string(),
        center: [0.0, 0.0],
        points: vec![],
        neighbors: vec![],
        neighbours: vec![],
    });
    
    let board = BoardMap {
        polygons,
        pieces: HashMap::new(),
        edges: HashMap::new(),
        width: Some(600.0),
        height: Some(600.0),
    };
    
    let json = serde_json::to_string(&board).unwrap();
    println!("Serialized BoardMap: {}", json);
}
