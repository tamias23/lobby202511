use crate::engine::GameState;
use crate::models::{Side, PieceType};
use std::collections::HashMap;
use ndarray::Array2;
use std::collections::HashSet;

/// Shared graph construction: encodes the game state as a graph.
/// Returns (node_features [N×12], edge_index [2×E], node_to_idx mapping).
pub fn build_graph_data(gs: &GameState) -> (Array2<f32>, Array2<i64>, HashMap<String, usize>) {
    let mut idx_to_node = Vec::new();
    let mut node_to_idx = HashMap::new();

    let mut sorted_polys: Vec<_> = gs.board.polygons.keys().collect();
    sorted_polys.sort(); // Deterministic ordering
    for poly_id in sorted_polys {
        node_to_idx.insert(poly_id.clone(), idx_to_node.len());
        idx_to_node.push(poly_id.clone());
    }

    // Add 16 static Stock nodes (8 PieceTypes × 2 Sides)
    let sides = vec![Side::White, Side::Black];
    let types = vec![
        PieceType::Goddess, PieceType::Heroe, PieceType::Mage, PieceType::Witch,
        PieceType::Soldier, PieceType::Siren, PieceType::Ghoul, PieceType::Minotaur,
    ];
    for side in &sides {
        for p_type in &types {
            let stock_id = format!("STOCK_{:?}_{:?}", side, p_type);
            node_to_idx.insert(stock_id.clone(), idx_to_node.len());
            idx_to_node.push(stock_id);
        }
    }

    let n = idx_to_node.len();
    let num_features = 12;
    let mut x = Array2::<f32>::zeros((n, num_features));

    let active_color = gs.color_chosen.get(&gs.turn);

    for (i, node_id) in idx_to_node.iter().enumerate() {
        if node_id.starts_with("STOCK_") {
            x[[i, 11]] = 1.0; // IsStock
            let parts: Vec<&str> = node_id.split('_').collect();
            let side = if parts[1] == "White" { Side::White } else { Side::Black };
            x[[i, 0]] = if side == gs.turn { 1.0 } else { -1.0 };

            let p_type = match parts[2] {
                "Goddess" => PieceType::Goddess,
                "Heroe" => PieceType::Heroe,
                "Mage" => PieceType::Mage,
                "Witch" => PieceType::Witch,
                "Soldier" => PieceType::Soldier,
                "Siren" => PieceType::Siren,
                "Ghoul" => PieceType::Ghoul,
                "Minotaur" => PieceType::Minotaur,
                _ => PieceType::Soldier,
            };
            let type_idx = match p_type {
                PieceType::Goddess => 1, PieceType::Heroe => 2, PieceType::Mage => 3,
                PieceType::Witch => 4, PieceType::Soldier => 5, PieceType::Siren => 6,
                PieceType::Ghoul => 7, PieceType::Minotaur => 8,
            };
            x[[i, type_idx]] = 1.0;

            let has_in_stock = gs.board.pieces.values().any(|p|
                p.side == side && p.piece_type == p_type && p.position == "returned"
            );
            if has_in_stock {
                x[[i, 9]] = 1.0;
            }
            continue;
        }

        let poly = &gs.board.polygons[node_id];
        if Some(&poly.color) == active_color {
            x[[i, 10]] = 1.0;
        }
        if let Some(p_id) = gs.occupancy.get(node_id) {
            let p = &gs.board.pieces[p_id];
            x[[i, 0]] = if p.side == gs.turn { 1.0 } else { -1.0 };
            x[[i, 9]] = 1.0;
            let type_idx = match p.piece_type {
                PieceType::Goddess => 1, PieceType::Heroe => 2, PieceType::Mage => 3,
                PieceType::Witch => 4, PieceType::Soldier => 5, PieceType::Siren => 6,
                PieceType::Ghoul => 7, PieceType::Minotaur => 8,
            };
            x[[i, type_idx]] = 1.0;
        }
    }

    let mut edges = Vec::new();
    for (source, poly) in &gs.board.polygons {
        let u = node_to_idx[source];
        let mut neighbors_set = HashSet::new();
        for n in &poly.neighbors { neighbors_set.insert(n.clone()); }
        for n in &poly.neighbours { neighbors_set.insert(n.clone()); }
        for target in neighbors_set {
            if let Some(&v) = node_to_idx.get(&target) {
                edges.push([u as i64, v as i64]);
            }
        }
    }
    let edge_index = if edges.is_empty() {
        Array2::zeros((2, 0))
    } else {
        Array2::from_shape_vec(
            (edges.len(), 2),
            edges.iter().flat_map(|e| vec![e[0], e[1]]).collect(),
        )
        .unwrap()
        .reversed_axes()
    };

    (x, edge_index, node_to_idx)
}
