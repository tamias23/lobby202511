use crate::agents::{Agent, AgentMove};
use crate::engine::{get_legal_moves, GameState, apply_move, apply_move_turnover, get_legal_colors};
use crate::models::{Side, PieceType};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use std::sync::Mutex;
use ort::session::Session;
use ort::value::Value;
use ndarray::Array2;

pub struct MctsAgent {
    pub time_budget_ms: u64,
    pub model_path: Option<String>,
    pub session: Option<Mutex<Session>>,
    pub(crate) game_buffer: Mutex<Vec<serde_json::Value>>,
    pub data_dir: String,
}

#[derive(Clone, Debug)]
struct Node {
    visit_count: f64,
    value_sum: f64,
    prior_prob: f64,
    children: HashMap<String, Node>, // move_key -> Node
    turn: Side, // Whose perspective this node stores
}

impl Node {
    pub(crate) fn new(prior_prob: f64, turn: Side) -> Self {
        Self {
            visit_count: 0.0,
            value_sum: 0.0,
            prior_prob,
            children: HashMap::new(),
            turn,
        }
    }

    fn is_expanded(&self) -> bool {
        !self.children.is_empty()
    }

    fn q_value(&self) -> f64 {
        if self.visit_count == 0.0 {
            0.0
        } else {
            self.value_sum / self.visit_count
        }
    }
}

impl MctsAgent {
    pub fn new(time_budget_ms: u64, model_path: Option<String>, data_dir: String) -> Self {
        let session = model_path.as_ref().and_then(|path| {
            let bytes = std::fs::read(path).ok()?;
            let session = Session::builder().ok()?
                .commit_from_memory(&bytes).ok()?;
            Some(Mutex::new(session))
        });

        Self {
            time_budget_ms,
            model_path,
            session,
            game_buffer: Mutex::new(Vec::new()),
            data_dir,
        }
    }

    fn ucb_score(&self, parent: &Node, child: &Node, c_puct: f64) -> f64 {
        // Child Q is from child's perspective. 
        // We only negate it if the turn flipped between parent and child.
        let q_value = if child.turn == parent.turn {
            child.q_value()
        } else {
            -child.q_value()
        };
        let u_value = c_puct * child.prior_prob * (parent.visit_count.sqrt() / (1.0 + child.visit_count));
        q_value + u_value
    }

    pub(crate) fn get_graph_data(&self, gs: &GameState) -> (Array2<f32>, Array2<i64>, Array2<i64>, Vec<String>) {
        let mut idx_to_node = Vec::new();
        let mut node_to_idx = HashMap::new();
        
        let mut sorted_polys: Vec<_> = gs.board.polygons.keys().collect();
        sorted_polys.sort(); // Deterministic ordering
        for poly_id in sorted_polys {
            node_to_idx.insert(poly_id.clone(), idx_to_node.len());
            idx_to_node.push(poly_id.clone());
        }
        
        let n = idx_to_node.len();
        let num_features = 11; // Side, PieceType (8 types one-hot), IsOccupied, IsActiveColor
        let mut x = Array2::<f32>::zeros((n, num_features));
        
        let active_color = gs.color_chosen.get(&gs.turn);

        for (i, poly_id) in idx_to_node.iter().enumerate() {
            let poly = &gs.board.polygons[poly_id];
            if Some(&poly.color) == active_color {
                x[[i, 10]] = 1.0;
            }
            if let Some(p_id) = gs.occupancy.get(poly_id) {
                let p = &gs.board.pieces[p_id];
                x[[i, 0]] = if p.side == gs.turn { 1.0 } else { -1.0 };
                x[[i, 9]] = 1.0; // IsOccupied
                
                let type_idx = match p.piece_type {
                    PieceType::Goddess => 1,
                    PieceType::Heroe => 2,
                    PieceType::Mage => 3,
                    PieceType::Bishop => 4,
                    PieceType::Soldier => 5,
                    PieceType::Siren => 6,
                    PieceType::Ghoul => 7,
                    PieceType::Berserker => 8,
                };
                x[[i, type_idx]] = 1.0;
            }
        }

        let mut edges = Vec::new();
        for (source, poly) in &gs.board.polygons {
            let u = node_to_idx[source];
            // Include both slide and jump neighbors for full mobility visibility
            let mut neighbors_set = std::collections::HashSet::new();
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
            Array2::from_shape_vec((edges.len(), 2), 
                edges.iter().flat_map(|e| vec![e[0], e[1]]).collect()
            ).unwrap().reversed_axes()
        };

        let mut legal_move_keys = Vec::new();
        let mut moves_flat = Vec::new();
        if gs.is_new_turn {
             let colors = get_legal_colors(gs, &gs.turn);
             for color in colors {
                 legal_move_keys.push(format!("COLOR:{}", color));
             }
        } else {
            let mut all_moves = HashMap::new();
            let eligible_ids = gs.get_eligible_piece_ids();
            for id in eligible_ids {
                 let targets = get_legal_moves(gs, &id);
                 if !targets.is_empty() {
                     all_moves.insert(id, targets);
                 }
            }
            for (p_id, targets) in all_moves {
                let source_pos = &gs.board.pieces[&p_id].position;
                if let Some(&u) = node_to_idx.get(source_pos) {
                    for target in targets {
                        if let Some(&v) = node_to_idx.get(&target) {
                            legal_move_keys.push(format!("{}:{}", p_id, target));
                            moves_flat.push(u as i64);
                            moves_flat.push(v as i64);
                        }
                    }
                }
            }
            if gs.locked_sequence_piece.is_some() {
                legal_move_keys.push("PASS".to_string());
                // PASS doesn't have a source/target on the graph, so we leave moves_flat as is
            }
        }
        let legal_moves_tensor = if moves_flat.is_empty() {
            Array2::zeros((2, 0))
        } else {
            Array2::from_shape_vec((moves_flat.len() / 2, 2), moves_flat).unwrap().reversed_axes()
        };

        (x, edge_index, legal_moves_tensor, legal_move_keys)
    }


    pub(crate) fn evaluate(&self, gs: &GameState) -> (f64, HashMap<String, f64>) {
        let (x, edge_index, legal_moves, move_keys) = self.get_graph_data(gs);
        
        let mut priors = HashMap::new();
        let mut value = 0.0;

        if let Some(ref session_mutex) = self.session {
            let mut session = session_mutex.lock().unwrap();
            
            let x_val = Value::from_array(x).unwrap();
            let edge_val = Value::from_array(edge_index).unwrap();
            let legal_val = Value::from_array(legal_moves).unwrap();

            let inputs = ort::inputs![
                "x" => x_val,
                "edge_index" => edge_val,
                "legal_moves" => legal_val
            ]; 
            
            if let Ok(outputs) = session.run(inputs) {
                let (_v_shape, v_data) = outputs["value"].try_extract_tensor::<f32>().unwrap();
                value = v_data[0] as f64;
                let (_p_shape, p_data) = outputs["probs"].try_extract_tensor::<f32>().unwrap();
                
                if !move_keys.is_empty() {
                    let n_keys = move_keys.len() as f64;
                    for (i, key) in move_keys.into_iter().enumerate() {
                        let prob = if i < p_data.len() { p_data[i] as f64 } else { 1.0 / n_keys };
                        priors.insert(key, prob);
                    }
                }
            }
        } else {
            // Uniform priors
            if !move_keys.is_empty() {
                let p = 1.0 / (move_keys.len() as f64);
                for m_key in move_keys {
                    priors.insert(m_key, p);
                }
            }
        }
        (value, priors)
    }

    fn get_best_move_key(&self, root: &Node) -> Option<String> {
        root.children.iter()
            .max_by(|a, b| a.1.visit_count.partial_cmp(&b.1.visit_count).unwrap())
            .map(|(k, _)| k.clone())
    }

    fn key_to_move(&self, key: &str) -> AgentMove {
        if key == "PASS" {
            AgentMove::Pass
        } else if key.starts_with("COLOR:") {
             // This is handled in choose_color, but for consistency:
             AgentMove::Pass // Should not happen in choose_move
        } else {
            let parts: Vec<&str> = key.split(':').collect();
            AgentMove::Move {
                piece: parts[0].to_string(),
                target: parts[1].to_string(),
            }
        }
    }

    fn run_mcts(&self, gs: &GameState) -> Node {
        let start_time = Instant::now();
        let budget = Duration::from_millis(self.time_budget_ms);

        let mut root = Node::new(1.0, gs.turn);
        let c_puct = 1.0;

        while start_time.elapsed() < budget {
            let mut current_gs = gs.clone();
            
            // 1. Selection & Expansion
            let mut path = Vec::new(); // move_key
            let mut current_node = &mut root;
            let mut terminal_value = None;

            while current_node.is_expanded() {
                let best_child_key = {
                    let parent = &current_node;
                    if let Some(key) = parent.children.iter()
                        .max_by(|a, b| {
                            let score_a = self.ucb_score(parent, a.1, c_puct);
                            let score_b = self.ucb_score(parent, b.1, c_puct);
                            score_a.partial_cmp(&score_b).unwrap()
                        })
                        .map(|(k, _)| k.clone()) 
                    {
                        key
                    } else {
                        break;
                    }
                };

                // Apply move to state
                let prev_turn = current_gs.turn;
                if best_child_key == "PASS" {
                    current_gs.turn_counter += 1;
                    current_gs.turn = current_gs.get_enemy_side();
                    current_gs.color_chosen.clear();
                    current_gs.is_new_turn = true;
                    current_gs.locked_sequence_piece = None;
                    current_gs.heroe_take_counter = 0;
                } else if best_child_key.starts_with("COLOR:") {
                    let color = &best_child_key[6..];
                    current_gs.color_chosen.insert(current_gs.turn, color.to_string());
                    current_gs.is_new_turn = false;
                } else {
                    let parts: Vec<&str> = best_child_key.split(':').collect();
                    if parts.len() >= 2 {
                        let p_id = parts[0];
                        let target = parts[1];
                        if current_gs.board.pieces.contains_key(p_id) {
                            let was_returned = current_gs.board.pieces[p_id].position == "returned";
                            let captured = apply_move(&mut current_gs, p_id, target);
                            let goddess_captured = captured.contains(&PieceType::Goddess);
                            apply_move_turnover(&mut current_gs, p_id, target, goddess_captured, captured.is_empty(), was_returned);
                            
                            if goddess_captured {
                                // Important: We assign reward relative to current_gs.turn at the leaf.
                                terminal_value = Some(if current_gs.turn == prev_turn { 1.0 } else { -1.0 }); 
                            }
                        }
                    }
                }
                
                path.push(best_child_key.clone());
                current_node = current_node.children.get_mut(&best_child_key).unwrap();
                current_node.turn = current_gs.turn;
                if terminal_value.is_some() { break; }
            }

            // 2. Evaluation & Expansion
            let v_leaf = if let Some(val) = terminal_value {
                val
            } else {
                let (val, priors) = self.evaluate(&current_gs);
                if !current_node.is_expanded() {
                    for (m_key, prob) in priors {
                        current_node.children.insert(m_key, Node::new(prob, current_gs.turn));
                    }
                }
                val 
            };

            // 3. Backpropagation
            let mut curr_v = if root.turn == current_gs.turn { v_leaf } else { -v_leaf };
            
            let mut node = &mut root;
            node.visit_count += 1.0;
            node.value_sum += curr_v;

            for key in &path {
                let prev_turn = node.turn;
                node = node.children.get_mut(key).unwrap();
                if node.turn != prev_turn {
                    curr_v = -curr_v;
                }
                node.visit_count += 1.0;
                node.value_sum += curr_v;
            }
        }
        root
    }

    fn save_search_data(&self, gs: &GameState, root: &Node) {
        let (x, edge_index, legal_moves, move_keys) = self.get_graph_data(gs);
        
        // The policy head only supports moves that are edges in the graph.
        // We must ensure move_keys and legal_moves tensor columns match in size.
        // If "PASS" is in move_keys, it has no corresponding column in legal_moves.
        let mut pi = HashMap::new();
        let mut filtered_move_keys = Vec::new();
        
        for m_key in move_keys {
            if m_key == "PASS" {
                continue;
            }
            filtered_move_keys.push(m_key.clone());
            if let Some(child) = root.children.get(&m_key) {
                pi.insert(m_key.clone(), child.visit_count / root.visit_count);
            } else {
                pi.insert(m_key.clone(), 0.0);
            }
        }
        
        let data = serde_json::json!({
            "x": x.to_owned().into_raw_vec_and_offset().0,
            "edge_index": edge_index.to_owned().into_raw_vec_and_offset().0,
            "legal_moves": legal_moves.to_owned().into_raw_vec_and_offset().0,
            "move_keys": filtered_move_keys,
            "pi": pi,
            "turn_side": format!("{:?}", gs.turn),
        });
        
        let mut buffer = self.game_buffer.lock().unwrap();
        buffer.push(data);
    }
}

impl Drop for MctsAgent {
    fn drop(&mut self) {
        // Any remaining data if the game crashed before record_winner
        let mut buffer = self.game_buffer.lock().unwrap();
        if buffer.is_empty() {
            return;
        }
        
        let data_dir = &self.data_dir;
        let _ = std::fs::create_dir_all(data_dir);
        let filename = format!("{}/residual_{}.json", data_dir, uuid::Uuid::new_v4());
        if let Ok(json_str) = serde_json::to_string(&*buffer) {
            let _ = std::fs::write(filename, json_str);
        }
        buffer.clear();
    }
}

impl Agent for MctsAgent {
    fn name(&self) -> &str {
        "MCTS"
    }

    fn choose_color<'a>(&self, gs: &GameState, valid_colors: &'a [String]) -> &'a String {
        if valid_colors.len() == 1 { return &valid_colors[0]; }
        
        let root = self.run_mcts(gs);
        let best_key = self.get_best_move_key(&root).unwrap_or_else(|| format!("COLOR:{}", valid_colors[0]));
        self.save_search_data(gs, &root);
        
        let chosen_color = if best_key.starts_with("COLOR:") {
             best_key[6..].to_string()
        } else {
            valid_colors[0].clone()
        };

        // Find the matching reference in valid_colors
        valid_colors.iter().find(|&c| c == &chosen_color).unwrap_or(&valid_colors[0])
    }

    fn choose_move(
        &self,
        gs: &GameState,
        _all_moves: &HashMap<String, Vec<String>>,
        _pass_allowed: bool,
    ) -> AgentMove {
        let root = self.run_mcts(gs);
        let best_key = self.get_best_move_key(&root).unwrap_or_else(|| "PASS".to_string());
        self.save_search_data(gs, &root);
        self.key_to_move(&best_key)
    }

    fn record_winner(&self, winner: Option<crate::models::Side>) {
        let mut buffer = self.game_buffer.lock().unwrap();
        if buffer.is_empty() {
            return;
        }

        let winner_side_str = match winner {
            Some(crate::models::Side::White) => "White",
            Some(crate::models::Side::Black) => "Black",
            None => "draw",
        };

        // Assign correct rewards based on who won this specific game
        let mut final_turns = Vec::new();
        for mut turn in buffer.drain(..) {
            let state_side = turn.get("turn_side").and_then(|v| v.as_str()).unwrap_or("White");
            let z = if winner_side_str == "draw" {
                0.0
            } else if winner_side_str == state_side {
                1.0
            } else {
                -1.0
            };
            if let Some(obj) = turn.as_object_mut() {
                obj.insert("z".to_string(), serde_json::json!(z));
            }
            final_turns.push(turn);
        }

        let data_dir = &self.data_dir;
        let _ = std::fs::create_dir_all(data_dir);
        let filename = format!("{}/game_{}.json", data_dir, uuid::Uuid::new_v4());
        
        if let Ok(json_str) = serde_json::to_string(&final_turns) {
            let _ = std::fs::write(filename, json_str);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_board;

    fn setup_test_board() -> GameState {
        let json = r#"{
            "allPolygons": {
                "p1": {"id": 1, "name": "p1", "color": "Blue", "shape": "hex", "center": [0,0], "points": [], "neighbors": ["p2", "p3"], "neighbours": ["p3"]},
                "p2": {"id": 2, "name": "p2", "color": "Yellow", "shape": "hex", "center": [1,0], "points": [], "neighbors": ["p1"], "neighbours": []},
                "p3": {"id": 3, "name": "p3", "color": "Blue", "shape": "hex", "center": [2,0], "points": [], "neighbors": [], "neighbours": ["p1"]}
            },
            "allPieces": {
                "w_goddess": {"id": "w_goddess", "type": "goddess", "side": "white", "position": "p1"},
                "b_goddess": {"id": "b_goddess", "type": "goddess", "side": "black", "position": "p2"}
            },
            "allEdges": {}
        }"#;
        let board = parse_board(json).unwrap();
        GameState::new(board)
    }

    #[test]
    fn test_mcts_name() {
        let agent = MctsAgent::new(100, None, "mcts_temp".to_string());
        assert_eq!(agent.name(), "MCTS");
    }

    #[test]
    fn test_graph_data_shape() {
        let gs = setup_test_board();
        let agent = MctsAgent::new(10, None, "mcts_temp".to_string());
        let (x, edge_index, _, _) = agent.get_graph_data(&gs);
        assert_eq!(x.dim().0, 3);
        assert_eq!(x.dim().1, 11);
        assert_eq!(edge_index.dim().0, 2);
    }

    #[test]
    fn test_ucb_score_sanity() {
        let agent = MctsAgent::new(10, None, "mcts_temp".to_string());
        let mut parent = Node::new(1.0, Side::White);
        parent.visit_count = 1.0;
        let score1 = agent.ucb_score(&parent, &Node::new(0.9, Side::White), 1.0);
        let score2 = agent.ucb_score(&parent, &Node::new(0.1, Side::White), 1.0);
        assert!(score1 > score2);
    }

    #[test]
    fn test_terminal_win_detection() {
        let mut gs = setup_test_board();
        gs.color_chosen.insert(gs.turn, "Blue".to_string());
        gs.is_new_turn = false;
        let agent = MctsAgent::new(50, None, "mcts_temp".to_string());
        let m = agent.choose_move(&gs, &std::collections::HashMap::new(), false);
        match m {
            AgentMove::Move { .. } => {},
            _ => panic!("Expected move"),
        }
    }

    #[test]
    fn test_choose_color_mcts() {
        let mut gs = setup_test_board();
        gs.is_new_turn = true;
        let agent = MctsAgent::new(50, None, "mcts_temp".to_string());
        let valid_colors = vec!["Blue".to_string(), "Yellow".to_string()];
        let c = agent.choose_color(&gs, &valid_colors);
        assert!(valid_colors.contains(c));
    }
}
