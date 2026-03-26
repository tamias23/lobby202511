use crate::agents::{Agent, AgentMove};
use crate::engine::{get_legal_moves, GameState, apply_move, apply_move_turnover, get_legal_colors};
use crate::models::{Side, PieceType};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use std::sync::Mutex;
use rand::seq::IndexedRandom;
use ort::session::Session;
use ort::value::Value;
use ndarray::Array2;

pub struct MctsAgent {
    pub time_budget_ms: u64,
    pub model_path: Option<String>,
    pub session: Option<Mutex<Session>>,
    pub(crate) game_buffer: Mutex<Vec<serde_json::Value>>,
}

#[derive(Clone, Debug)]
struct Node {
    visit_count: f64,
    value_sum: f64,
    prior_prob: f64,
    children: HashMap<String, Node>, // move_key -> Node
}

impl Node {
    fn new(prior_prob: f64) -> Self {
        Self {
            visit_count: 0.0,
            value_sum: 0.0,
            prior_prob,
            children: HashMap::new(),
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
    pub fn new(time_budget_ms: u64, model_path: Option<String>) -> Self {
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
        }
    }

    fn ucb_score(&self, parent_visits: f64, child: &Node, c_puct: f64) -> f64 {
        let u_value = c_puct * child.prior_prob * (parent_visits.sqrt() / (1.0 + child.visit_count));
        child.q_value() + u_value
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
                x[[i, 0]] = if p.side == Side::White { 1.0 } else { -1.0 };
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

    fn check_winner(&self, _gs: &GameState) -> Option<f64> {
        // Find if any goddess is captured (position == "returned" but we need to know who recently moved)
        // Simplest: Check if the current player's goddess is missing from board/returned? No.
        // Let's rely on the simulation loop to tell us if a goddess was captured.
        // For evaluation, we can check basic heuristics or just return 0.0 if not terminal.
        None
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

    fn save_search_data(&self, gs: &GameState, root: &Node) {
        let (x, edge_index, legal_moves, move_keys) = self.get_graph_data(gs);
        let mut pi = HashMap::new();
        for (m_key, child) in &root.children {
            pi.insert(m_key.clone(), child.visit_count / root.visit_count);
        }
        
        let data = serde_json::json!({
            "x": x.to_owned().into_raw_vec_and_offset().0,
            "edge_index": edge_index.to_owned().into_raw_vec_and_offset().0,
            "legal_moves": legal_moves.to_owned().into_raw_vec_and_offset().0,
            "move_keys": move_keys,
            "pi": pi,
            "turn_side": format!("{:?}", gs.turn), // Exact side at this state
        });
        
        // Push to buffer instead of file
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
        
        let data_dir = "./rust/mcts_temp";
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
        
        let mut best_color = &valid_colors[0];
        let mut max_value = -f64::INFINITY;
        
        for color in valid_colors {
            let mut clone_gs = gs.clone();
            clone_gs.color_chosen.insert(gs.turn, color.clone());
            clone_gs.is_new_turn = false;
            
            // Run a shallow MCTS or just evaluate the state
            let (val, _) = self.evaluate(&clone_gs);
            if val > max_value {
                max_value = val;
                best_color = color;
            }
        }
        best_color
    }

    fn choose_move(
        &self,
        gs: &GameState,
        _all_moves: &HashMap<String, Vec<String>>,
        _pass_allowed: bool,
    ) -> AgentMove {
        let start_time = Instant::now();
        let budget = Duration::from_millis(self.time_budget_ms);

        let mut root = Node::new(1.0);
        let c_puct = 1.0;

        while start_time.elapsed() < budget {
            let mut current_gs = gs.clone();
            let mut path = vec![];
            
            // 1. Selection
            let mut current_node = &mut root;
            while current_node.is_expanded() {
                let parent_visits = current_node.visit_count;
                let best_child_key = current_node.children.iter()
                    .max_by(|a, b| {
                        let score_a = self.ucb_score(parent_visits, a.1, c_puct);
                        let score_b = self.ucb_score(parent_visits, b.1, c_puct);
                        score_a.partial_cmp(&score_b).unwrap()
                    })
                    .map(|(k, _)| k.clone())
                    .unwrap();
                
                path.push(best_child_key.clone());
                
                // Apply move to state
                if best_child_key == "PASS" {
                    // turnover
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
                    if parts.len() < 2 { continue; } // Should not happen
                    let p_id = parts[0];
                    let target = parts[1];
                    
                    if !current_gs.board.pieces.contains_key(p_id) {
                        break; // Safety break if piece disappeared (should not happen in MCTS)
                    }

                    let was_returned = current_gs.board.pieces[p_id].position == "returned";
                    let captured = apply_move(&mut current_gs, p_id, target);
                    let goddess_captured = captured.contains(&PieceType::Goddess);
                    apply_move_turnover(
                        &mut current_gs,
                        p_id,
                        target,
                        goddess_captured,
                        captured.is_empty(),
                        was_returned,
                    );
                    
                    if goddess_captured {
                        // Game Over!
                        current_node = current_node.children.get_mut(&best_child_key).unwrap();
                        path.push(best_child_key); // Just for path length
                        break; 
                    }
                }
                
                current_node = current_node.children.get_mut(&best_child_key).unwrap();
            }

            // 2. Expansion & Evaluation
            let (value, priors) = self.evaluate(&current_gs);
            for (m_key, prob) in priors {
                current_node.children.insert(m_key, Node::new(prob));
            }

            // 3. Backpropagation (Backup)
            // Value is from the perspective of the player at current_gs
            let mut val = value;
            let mut backup_node = &mut root;
            backup_node.visit_count += 1.0;
            backup_node.value_sum += val;

            // Track whose turn it was to flip values accordingly
            let mut _last_side = gs.turn;
            let mut search_gs = gs.clone();

            for key in path {
                // Determine if side changed
                let prev_side = search_gs.turn;
                
                // Simulate move to check for side change
                if key == "PASS" {
                    search_gs.turn = search_gs.get_enemy_side();
                } else if !key.starts_with("COLOR:") {
                    let parts: Vec<&str> = key.split(':').collect();
                    let p_id = parts[0];
                    let target = parts[1];
                    let was_returned = search_gs.board.pieces[p_id].position == "returned";
                    let captured = apply_move(&mut search_gs, p_id, target);
                    let goddess_captured = captured.contains(&PieceType::Goddess);
                    apply_move_turnover(&mut search_gs, p_id, target, goddess_captured, captured.is_empty(), was_returned);
                }
                
                if search_gs.turn != prev_side {
                    val = -val;
                }

                backup_node = backup_node.children.get_mut(&key).unwrap();
                backup_node.visit_count += 1.0;
                backup_node.value_sum += val;
                _last_side = search_gs.turn;
            }
        }

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

        let data_dir = "./rust/mcts_temp";
        let _ = std::fs::create_dir_all(data_dir);
        let filename = format!("{}/game_{}.json", data_dir, uuid::Uuid::new_v4());
        
        if let Ok(json_str) = serde_json::to_string(&final_turns) {
            let _ = std::fs::write(filename, json_str);
        }
    }
}
