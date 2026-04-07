use crate::agents::{Agent, AgentMove};
use crate::engine::{get_legal_moves, GameState, apply_move, apply_move_turnover, get_legal_colors, GamePhase, get_setup_legal_placements, apply_setup_placement_turnover, perform_setup_turn, check_setup_step_complete};
use crate::models::{Side, PieceType};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use std::sync::{Mutex, Arc};
use ort::session::Session;
use ort::value::Value;
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
        PieceType::Soldier, PieceType::Siren, PieceType::Ghoul, PieceType::Golem,
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
                "Golem" => PieceType::Golem,
                _ => PieceType::Soldier,
            };
            let type_idx = match p_type {
                PieceType::Goddess => 1, PieceType::Heroe => 2, PieceType::Mage => 3,
                PieceType::Witch => 4, PieceType::Soldier => 5, PieceType::Siren => 6,
                PieceType::Ghoul => 7, PieceType::Golem => 8,
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
                PieceType::Ghoul => 7, PieceType::Golem => 8,
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

pub struct MctsAgent {
    pub time_budget_ms: u64,
    /// Number of parallel root-search threads (1 = single-threaded, unchanged behaviour).
    pub num_threads: usize,
    pub model_path: Option<String>,
    /// One compiled ONNX session per thread slot (empty if no model loaded).
    sessions: Vec<Arc<Mutex<Session>>>,
    pub(crate) game_buffer: Mutex<Vec<serde_json::Value>>,
    pub data_dir: String,
    pub record_data: bool,
    pub verbosity: u8,
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
    /// Create a single-threaded MCTS agent (backwards-compatible constructor).
    pub fn new(time_budget_ms: u64, model_path: Option<String>, data_dir: String, record_data: bool, verbosity: u8) -> Self {
        Self::with_threads(time_budget_ms, model_path, data_dir, record_data, verbosity, 1)
    }

    /// Create an MCTS agent with root-parallel search across `num_threads` threads.
    /// `num_threads = 1` is identical in behaviour to `new()`.
    pub fn with_threads(time_budget_ms: u64, model_path: Option<String>, data_dir: String, record_data: bool, verbosity: u8, num_threads: usize) -> Self {
        let num_threads = num_threads.max(1);
        if verbosity >= 1 {
            println!("[MCTS] Initializing agent (budget={}ms, threads={}, model={:?})", time_budget_ms, num_threads, model_path);
            std::io::Write::flush(&mut std::io::stdout()).unwrap();
        }

        // Load model bytes once, then compile N sessions (one per thread slot).
        let sessions = if let Some(ref path) = model_path {
            if verbosity >= 1 {
                println!("[MCTS] Loading ONNX model from {} ({} session(s))...", path, num_threads);
                std::io::Write::flush(&mut std::io::stdout()).unwrap();
            }
            match std::fs::read(path) {
                Ok(bytes) => {
                    let mut built = Vec::with_capacity(num_threads);
                    for _ in 0..num_threads {
                        if let Ok(mut builder) = Session::builder() {
                            if let Ok(session) = builder.commit_from_memory(&bytes) {
                                built.push(Arc::new(Mutex::new(session)));
                            }
                        }
                    }
                    if verbosity >= 1 {
                        println!("[MCTS] Loaded {} ONNX session(s) successfully.", built.len());
                        std::io::Write::flush(&mut std::io::stdout()).unwrap();
                    }
                    built
                }
                Err(e) => {
                    if verbosity >= 1 {
                        println!("[MCTS] Warning: could not read model file '{}': {}. Using uniform priors.", path, e);
                    }
                    Vec::new()
                }
            }
        } else {
            Vec::new()
        };

        Self {
            time_budget_ms,
            num_threads,
            model_path,
            sessions,
            game_buffer: Mutex::new(Vec::new()),
            data_dir,
            record_data,
            verbosity,
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
        let (x, edge_index, node_to_idx) = build_graph_data(gs);

        let mut legal_move_keys = Vec::new();
        let mut moves_flat = Vec::new();
        if gs.phase == GamePhase::Setup {
            let placements = get_setup_legal_placements(gs);
            for (p_id, targets) in placements {
                let p = &gs.board.pieces[&p_id];
                let stock_id = format!("STOCK_{:?}_{:?}", p.side, p.piece_type);
                if let Some(&u) = node_to_idx.get(&stock_id) {
                    for target in targets {
                        if let Some(&v) = node_to_idx.get(&target) {
                            legal_move_keys.push(format!("{}:{}", p_id, target));
                            moves_flat.push(u as i64);
                            moves_flat.push(v as i64);
                        }
                    }
                }
            }
            // PASS during setup: allowed only if:
            // 1. Player placed at least 1 piece this turn
            // 2. The opponent still has pieces to place for the current setup step
            //    (if opponent is done, this player must finish too before advancing)
            if gs.setup_placements_this_turn > 0 {
                let enemy = gs.get_enemy_side();
                let enemy_done = check_setup_step_complete(gs, enemy);
                if !enemy_done {
                    legal_move_keys.push("PASS".to_string());
                }
            }
        } else if gs.is_new_turn {
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
                let p = &gs.board.pieces[&p_id];
                let source_idx = if p.position == "returned" {
                    let stock_id = format!("STOCK_{:?}_{:?}", p.side, p.piece_type);
                    node_to_idx.get(&stock_id).copied()
                } else {
                    node_to_idx.get(&p.position).copied()
                };

                if let Some(u) = source_idx {
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


    /// Evaluate a game state using the given ONNX session, returning (value, priors).
    /// Falls back to uniform priors if no session is provided.
    pub(crate) fn evaluate_with(&self, gs: &GameState, session: Option<&Arc<Mutex<Session>>>) -> (f64, HashMap<String, f64>) {
        let (x, edge_index, legal_moves, move_keys) = self.get_graph_data(gs);
        
        let mut priors = HashMap::new();
        let mut value = 0.0;

        if let Some(session_arc) = session {
            let mut session = session_arc.lock().unwrap();
            
            let x_val = Value::from_array(x).unwrap();
            let edge_val = Value::from_array(edge_index).unwrap();
            let legal_val = Value::from_array(legal_moves).unwrap();

            let inputs = ort::inputs![
                "x" => x_val,
                "edge_index" => edge_val,
                "legal_moves" => legal_val
            ]; 

            if self.verbosity >= 3 {
                println!("[MCTS] Running ONNX inference...");
                std::io::Write::flush(&mut std::io::stdout()).unwrap();
            }
            if let Ok(outputs) = session.run(inputs) {
                if self.verbosity >= 3 {
                    println!("[MCTS] ONNX inference success.");
                    std::io::Write::flush(&mut std::io::stdout()).unwrap();
                }
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
            // Uniform priors (no model)
            if !move_keys.is_empty() {
                let p = 1.0 / (move_keys.len() as f64);
                for m_key in move_keys {
                    priors.insert(m_key, p);
                }
            }
        }
        (value, priors)
    }

    /// Backwards-compatible wrapper: evaluate using the first available session.
    pub(crate) fn evaluate(&self, gs: &GameState) -> (f64, HashMap<String, f64>) {
        self.evaluate_with(gs, self.sessions.first())
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

    /// Core MCTS search — single-threaded, uses the given session for evaluation.
    /// This is the inner loop; call `run_mcts_parallel` for the public entry point.
    fn run_mcts_core(&self, gs: &GameState, session: Option<&Arc<Mutex<Session>>>) -> Node {
        let start_time = Instant::now();
        let budget = Duration::from_millis(self.time_budget_ms);

        let mut root = Node::new(1.0, gs.turn);
        let c_puct = 1.0;

        let mut max_depth_reached = 0;
        let mut sim_count = 0;

        while start_time.elapsed() < budget {
            if self.verbosity >= 3 {
                println!("[MCTS] Starting simulation {}", sim_count + 1);
                std::io::Write::flush(&mut std::io::stdout()).unwrap();
            }
            let mut current_gs = gs.clone();
            sim_count += 1;
            
            // 1. Selection & Expansion
            let mut path = Vec::new(); // move_key
            let mut current_node = &mut root;
            let mut terminal_value = None;
            let mut current_depth = 0;

            while current_node.is_expanded() {
                current_depth += 1;
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
                } else if current_gs.phase == GamePhase::Setup {
                    if best_child_key == "PASS" {
                        current_gs.turn = current_gs.get_enemy_side();
                        current_gs.setup_placements_this_turn = 0;
                    } else {
                        let parts: Vec<&str> = best_child_key.split(':').collect();
                        if parts.len() >= 2 {
                            let p_id = parts[0];
                            let target = parts[1];
                            apply_setup_placement_turnover(&mut current_gs, p_id, target);
                        }
                    }
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
            
            if current_depth > max_depth_reached {
                max_depth_reached = current_depth;
            }

            // 2. Evaluation & Expansion
            let v_leaf = if let Some(val) = terminal_value {
                val
            } else {
                let (val, priors) = self.evaluate_with(&current_gs, session);
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
        
        if self.verbosity >= 2 {
            let elapsed = start_time.elapsed().as_millis();
            println!("[MCTS] Search Complete: {} sims, max_depth={}, time={}ms, best_q={:.3}", 
                sim_count, max_depth_reached, elapsed, root.q_value());
        }
        
        root
    }

    /// Merge multiple root nodes from independent trees by summing visit counts.
    fn aggregate_roots(&self, mut roots: Vec<Node>) -> Node {
        if roots.is_empty() {
            return Node::new(1.0, Side::White); // shouldn't happen
        }
        if roots.len() == 1 {
            return roots.remove(0);
        }
        let mut base = roots.remove(0);
        for other in roots {
            base.visit_count += other.visit_count;
            base.value_sum += other.value_sum;
            for (key, child) in other.children {
                let entry = base.children
                    .entry(key)
                    .or_insert_with(|| Node::new(child.prior_prob, child.turn));
                entry.visit_count += child.visit_count;
                entry.value_sum += child.value_sum;
            }
        }
        base
    }

    /// Main entry point for MCTS search. Uses root-parallelisation when num_threads > 1.
    ///
    /// With 1 thread (default): identical to the original single-threaded behaviour.
    /// With N threads: spawns N independent trees and aggregates visit counts.
    fn run_mcts_parallel(&self, gs: &GameState) -> Node {
        let effective_threads = if self.sessions.is_empty() {
            // No model: thread count is still controlled by num_threads field
            self.num_threads
        } else {
            // Have model: one session per thread; actual thread count = sessions.len()
            self.sessions.len()
        };

        if effective_threads <= 1 {
            // Single-threaded — no overhead, same as original.
            return self.run_mcts_core(gs, self.sessions.first());
        }

        // Root parallelisation: spawn one thread per slot, each with its own session.
        let roots: Vec<Node> = if self.sessions.is_empty() {
            // No model — spawn threads using uniform priors.
            std::thread::scope(|scope| {
                let handles: Vec<_> = (0..effective_threads)
                    .map(|_| scope.spawn(|| self.run_mcts_core(gs, None)))
                    .collect();
                handles.into_iter().map(|h| h.join().expect("MCTS thread panicked")).collect()
            })
        } else {
            // With model — each thread gets its own dedicated session.
            std::thread::scope(|scope| {
                let handles: Vec<_> = self.sessions.iter()
                    .map(|session| scope.spawn(|| self.run_mcts_core(gs, Some(session))))
                    .collect();
                handles.into_iter().map(|h| h.join().expect("MCTS thread panicked")).collect()
            })
        };

        self.aggregate_roots(roots)
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
        
        let root = self.run_mcts_parallel(gs);
        let best_key = self.get_best_move_key(&root).unwrap_or_else(|| format!("COLOR:{}", valid_colors[0]));
        
        if self.verbosity >= 1 {
            println!("[Agent] Selected Color Decision: {}", best_key);
        }

        if self.record_data {
            self.save_search_data(gs, &root);
        }
        
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
        let root = self.run_mcts_parallel(gs);
        let best_key = self.get_best_move_key(&root).unwrap_or_else(|| "PASS".to_string());
        
        if self.verbosity >= 1 {
            println!("[Agent] Selected Move Decision: {}", best_key);
        }

        if self.record_data {
            self.save_search_data(gs, &root);
        }
        self.key_to_move(&best_key)
    }

    fn record_winner(&self, winner: Option<crate::models::Side>) {
        if !self.record_data {
            return;
        }
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
        let agent = MctsAgent::new(100, None, "mcts_temp".to_string(), true, 0);
        assert_eq!(agent.name(), "MCTS");
    }

    #[test]
    fn test_graph_data_shape() {
        let gs = setup_test_board();
        let agent = MctsAgent::new(10, None, "mcts_temp".to_string(), true, 0);
        let (x, edge_index, _, _) = agent.get_graph_data(&gs);
        // 3 polygons + 16 stock nodes = 19 nodes
        assert_eq!(x.dim().0, 19);
        assert_eq!(x.dim().1, 12);
        assert_eq!(edge_index.dim().0, 2);
    }

    #[test]
    fn test_return_moves_in_graph() {
        let mut gs = setup_test_board();
        // Move b_goddess to "returned" stock
        // Black needs a Hero on the board to serve as an anchor for the Goddess to return
        gs.board.pieces.insert("b_heroe".to_string(), crate::models::Piece {
            id: "b_heroe".to_string(),
            piece_type: PieceType::Heroe,
            side: Side::Black,
            position: "p1".to_string(),
        });
        gs.occupancy.insert("p1".to_string(), "b_heroe".to_string());
        
        gs.occupancy.insert("p1".to_string(), "b_heroe".to_string());
        
        gs.board.pieces.get_mut("b_goddess").unwrap().position = "returned".to_string();
        gs.occupancy.remove("p2");
        gs.turn = Side::Black;
        gs.phase = GamePhase::Playing;
        // Must choose a color to allow deployment from stock
        gs.color_chosen.insert(Side::Black, "Blue".to_string());
        gs.is_new_turn = false;
        
        let agent = MctsAgent::new(10, None, "mcts_temp".to_string(), true, 0);
        let (x, _, legal_moves, move_keys) = agent.get_graph_data(&gs);
        
        // Find the index of STOCK_Black_Goddess
        let mut goddess_p3_move_idx = None;
        for (i, key) in move_keys.iter().enumerate() {
            if key == "b_goddess:p3" { // Deployment target from engine.rs logic (p3 is Blue)
                goddess_p3_move_idx = Some(i);
            }
        }
        
        assert!(goddess_p3_move_idx.is_some(), "Goddess should be able to return to Blue poly p3");
        if let Some(move_idx) = goddess_p3_move_idx {
            let src_node_idx = legal_moves[[0, move_idx]];
            assert!(x[[src_node_idx as usize, 11]] == 1.0); // IsStock must be 1.0
            assert!(x[[src_node_idx as usize, 1]] == 1.0);  // PieceType::Goddess must be 1.0
        }
    }

    #[test]
    fn test_ucb_score_sanity() {
        let agent = MctsAgent::new(10, None, "mcts_temp".to_string(), true, 0);
        let mut parent = Node::new(1.0, Side::White);
        parent.visit_count = 1.0;
        let score1 = agent.ucb_score(&parent, &Node::new(0.9, Side::White), 1.0);
        let score2 = agent.ucb_score(&parent, &Node::new(0.1, Side::White), 1.0);
        assert!(score1 > score2);
    }

    #[test]
    fn test_terminal_win_detection() {
        let mut gs = setup_test_board();
        gs.phase = GamePhase::Playing;
        gs.color_chosen.insert(gs.turn, "Blue".to_string());
        gs.is_new_turn = false;
        let agent = MctsAgent::new(300, None, "mcts_temp".to_string(), true, 0);
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
        let agent = MctsAgent::new(50, None, "mcts_temp".to_string(), true, 0);
        let valid_colors = vec!["Blue".to_string(), "Yellow".to_string()];
        let c = agent.choose_color(&gs, &valid_colors);
        assert!(valid_colors.contains(c));
    }

    #[test]
    fn test_root_parallel_same_result_shape() {
        // Ensure parallel search returns a valid move (not a panic).
        let mut gs = setup_test_board();
        gs.phase = GamePhase::Playing;
        gs.color_chosen.insert(gs.turn, "Blue".to_string());
        gs.is_new_turn = false;
        // 2 threads, no model → uniform priors, still must pick a move.
        let agent = MctsAgent::with_threads(100, None, "mcts_temp".to_string(), false, 0, 2);
        let m = agent.choose_move(&gs, &std::collections::HashMap::new(), false);
        match m {
            AgentMove::Move { .. } | AgentMove::Pass => {},
        }
    }
}
