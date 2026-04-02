use crate::agents::{Agent, AgentMove};
use crate::agents::mcts::build_graph_data;
use crate::engine::{GameState, apply_move, apply_move_turnover};
use crate::models::PieceType;
use ndarray::{Array1, Array2, Axis};

/// Total number of learnable parameters in the TinyGNN.
pub const NUM_PARAMS: usize = 5025;

const F: usize = 12;  // Input feature dimension
const H: usize = 32;  // Hidden dimension

// Parameter offsets within the flat weight vector
const L1_MSG_W: usize = 0;                          // (2*F) * H = 768
const L1_MSG_B: usize = L1_MSG_W + 2 * F * H;      // H = 32  => offset 800
const L1_UPD_W: usize = L1_MSG_B + H;               // H * H = 1024  => offset 832
const L1_UPD_B: usize = L1_UPD_W + H * H;           // H = 32  => offset 1856
const L2_MSG_W: usize = L1_UPD_B + H;               // (2*H) * H = 2048  => offset 1888
const L2_MSG_B: usize = L2_MSG_W + 2 * H * H;       // H = 32  => offset 3936
const L2_UPD_W: usize = L2_MSG_B + H;               // H * H = 1024  => offset 3968
const L2_UPD_B: usize = L2_UPD_W + H * H;           // H = 32  => offset 4992
const RD_W: usize = L2_UPD_B + H;                    // H = 32  => offset 5024
const RD_B: usize = RD_W + H;                        // 1       => offset 5024 + 32... wait

// Readout: Linear(H, 1) => H weights + 1 bias = 33 params
// Total: 768 + 32 + 1024 + 32 + 2048 + 32 + 1024 + 32 + 32 + 1 = 5025 ✓

/// A tiny 2-layer message-passing GNN implemented as a pure-Rust forward pass.
/// No ONNX runtime needed — all matrix ops use ndarray.
struct TinyGNN {
    // Layer 1 message net: Linear(2*F, H)
    l1_msg_w: Array2<f32>,  // (2*F, H)
    l1_msg_b: Array1<f32>,  // (H,)
    // Layer 1 update net: Linear(H, H)
    l1_upd_w: Array2<f32>,  // (H, H)
    l1_upd_b: Array1<f32>,  // (H,)
    // Layer 2 message net: Linear(2*H, H)
    l2_msg_w: Array2<f32>,  // (2*H, H)
    l2_msg_b: Array1<f32>,  // (H,)
    // Layer 2 update net: Linear(H, H)
    l2_upd_w: Array2<f32>,  // (H, H)
    l2_upd_b: Array1<f32>,  // (H,)
    // Readout: Linear(H, 1)
    rd_w: Array1<f32>,      // (H,)
    rd_b: f32,
}

impl TinyGNN {
    /// Deserialize a flat weight vector into structured matrices.
    fn from_weights(w: &[f64]) -> Self {
        assert!(w.len() >= NUM_PARAMS, "Expected at least {} weights, got {}", NUM_PARAMS, w.len());

        let f32_w: Vec<f32> = w.iter().map(|&v| v as f32).collect();

        let mut offset = 0;

        let l1_msg_w = Array2::from_shape_vec((2 * F, H), f32_w[offset..offset + 2 * F * H].to_vec()).unwrap();
        offset += 2 * F * H;
        let l1_msg_b = Array1::from_vec(f32_w[offset..offset + H].to_vec());
        offset += H;

        let l1_upd_w = Array2::from_shape_vec((H, H), f32_w[offset..offset + H * H].to_vec()).unwrap();
        offset += H * H;
        let l1_upd_b = Array1::from_vec(f32_w[offset..offset + H].to_vec());
        offset += H;

        let l2_msg_w = Array2::from_shape_vec((2 * H, H), f32_w[offset..offset + 2 * H * H].to_vec()).unwrap();
        offset += 2 * H * H;
        let l2_msg_b = Array1::from_vec(f32_w[offset..offset + H].to_vec());
        offset += H;

        let l2_upd_w = Array2::from_shape_vec((H, H), f32_w[offset..offset + H * H].to_vec()).unwrap();
        offset += H * H;
        let l2_upd_b = Array1::from_vec(f32_w[offset..offset + H].to_vec());
        offset += H;

        let rd_w = Array1::from_vec(f32_w[offset..offset + H].to_vec());
        offset += H;
        let rd_b = f32_w[offset];

        Self { l1_msg_w, l1_msg_b, l1_upd_w, l1_upd_b, l2_msg_w, l2_msg_b, l2_upd_w, l2_upd_b, rd_w, rd_b }
    }

    /// Run a forward pass on the graph, returning a scalar score in [-1, 1].
    ///
    /// `x`: node features (N, F) or (N, H) depending on layer
    /// `adj`: adjacency list — adj[i] = list of neighbor indices for node i
    fn forward(&self, x: &Array2<f32>, adj: &[Vec<usize>]) -> f64 {
        let n = x.nrows();

        // === Layer 1: (N, F) -> (N, H) ===
        let mut h1 = Array2::<f32>::zeros((n, H));
        let mut agg_f = Array1::<f32>::zeros(F);
        let mut concat_f = Array1::<f32>::zeros(2 * F);

        for i in 0..n {
            agg_f.fill(0.0);
            let neighbors = &adj[i];
            if !neighbors.is_empty() {
                for &j in neighbors {
                    agg_f += &x.row(j);
                }
                agg_f /= neighbors.len() as f32;
            }
            
            concat_f.slice_mut(ndarray::s![..F]).assign(&x.row(i));
            concat_f.slice_mut(ndarray::s![F..]).assign(&agg_f);
            
            let msg = concat_f.dot(&self.l1_msg_w) + &self.l1_msg_b;
            let msg = msg.mapv(|v| v.max(0.0));
            let upd = msg.dot(&self.l1_upd_w) + &self.l1_upd_b;
            let upd = upd.mapv(|v| v.max(0.0));
            h1.row_mut(i).assign(&upd);
        }

        // === Layer 2: (N, H) -> (N, H) ===
        let mut h2 = Array2::<f32>::zeros((n, H));
        let mut agg_h = Array1::<f32>::zeros(H);
        let mut concat_h = Array1::<f32>::zeros(2 * H);

        for i in 0..n {
            agg_h.fill(0.0);
            let neighbors = &adj[i];
            if !neighbors.is_empty() {
                for &j in neighbors {
                    agg_h += &h1.row(j);
                }
                agg_h /= neighbors.len() as f32;
            }
            
            concat_h.slice_mut(ndarray::s![..H]).assign(&h1.row(i));
            concat_h.slice_mut(ndarray::s![H..]).assign(&agg_h);
            
            let msg = concat_h.dot(&self.l2_msg_w) + &self.l2_msg_b;
            let msg = msg.mapv(|v| v.max(0.0));
            let upd = msg.dot(&self.l2_upd_w) + &self.l2_upd_b;
            let upd = upd.mapv(|v| v.max(0.0));
            h2.row_mut(i).assign(&upd);
        }

        // === Global mean pool ===
        // Using average across nodes for simplicity
        let pooled = h2.mean_axis(Axis(0)).unwrap();

        // === Readout: tanh(pooled · rd_w + rd_b) ===
        let score = pooled.dot(&self.rd_w) + self.rd_b;
        (score as f64).tanh()
    }
}

/// Convert edge_index (2×E i64 tensor) into an adjacency list for N nodes.
fn edge_index_to_adj(edge_index: &Array2<i64>, n: usize) -> Vec<Vec<usize>> {
    let mut adj = vec![Vec::new(); n];
    let num_edges = edge_index.ncols();
    for e in 0..num_edges {
        let u = edge_index[[0, e]] as usize;
        let v = edge_index[[1, e]] as usize;
        if u < n && v < n {
            adj[u].push(v);
        }
    }
    adj
}

pub struct GreedyJackAgent {
    gnn: TinyGNN,
}

impl GreedyJackAgent {
    pub fn new(weights: Vec<f64>) -> Self {
        let gnn = TinyGNN::from_weights(&weights);
        Self { gnn }
    }

    /// Score the current board from the perspective of `perspective`.
    fn score_state(&self, state: &GameState) -> f64 {
        let (x, edge_index, _node_to_idx) = build_graph_data(state);
        let n = x.nrows();
        let adj = edge_index_to_adj(&edge_index, n);
        self.gnn.forward(&x, &adj)
    }
}

impl Agent for GreedyJackAgent {
    fn name(&self) -> &str {
        "GreedyJack"
    }

    fn choose_color<'a>(&self, state: &GameState, valid_colors: &'a [String]) -> &'a String {
        let mut best_color_idx = 0;
        let mut best_score = std::f64::NEG_INFINITY;
        let perspective = state.turn;

        // Clone state once and update in-place for all color evaluations
        let mut clone_state = state.clone();
        clone_state.is_new_turn = false;

        for (idx, color) in valid_colors.iter().enumerate() {
            clone_state.color_chosen.insert(perspective, color.clone());

            let score = self.score_state(&clone_state);
            if score > best_score {
                best_score = score;
                best_color_idx = idx;
            }
        }

        &valid_colors[best_color_idx]
    }

    fn choose_move(
        &self,
        state: &GameState,
        all_moves: &std::collections::HashMap<String, Vec<String>>,
        pass_allowed: bool,
    ) -> AgentMove {
        let perspective = state.turn;

        let mut best_piece = String::new();
        let mut best_target = String::new();
        let mut best_score = std::f64::NEG_INFINITY;

        if pass_allowed {
            let mut pass_state = state.clone();
            pass_state.turn_counter += 1;
            pass_state.turn = pass_state.get_enemy_side();
            pass_state.color_chosen.clear();
            pass_state.is_new_turn = true;
            pass_state.locked_sequence_piece = None;
            pass_state.heroe_take_counter = 0;

            best_score = self.score_state(&pass_state);
            best_piece = "PASS".to_string();
        }

        for (p_id, targets) in all_moves {
            for target in targets {
                let mut clone_state = state.clone();
                let was_returned = clone_state.board.pieces[p_id].position == "returned";
                let captured = apply_move(&mut clone_state, p_id, target);

                let goddess_captured = captured.contains(&PieceType::Goddess);
                if clone_state.phase == crate::engine::GamePhase::Playing {
                    apply_move_turnover(
                        &mut clone_state,
                        p_id,
                        target,
                        goddess_captured,
                        captured.is_empty(),
                        was_returned,
                    );
                } else {
                    crate::engine::apply_setup_placement_turnover(&mut clone_state, p_id, target);
                }

                let score = if goddess_captured {
                    std::f64::INFINITY
                } else {
                    self.score_state(&clone_state)
                };

                if score > best_score {
                    best_score = score;
                    best_piece = p_id.clone();
                    best_target = target.clone();
                }
            }
        }

        if best_piece == "PASS" {
            AgentMove::Pass
        } else {
            AgentMove::Move {
                piece: best_piece,
                target: best_target,
            }
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
    fn test_gnn_parameter_count() {
        // Verify the computed constant matches reality
        let total = 2 * F * H + H    // l1_msg
                  + H * H + H        // l1_upd
                  + 2 * H * H + H    // l2_msg
                  + H * H + H        // l2_upd
                  + H + 1;           // readout
        assert_eq!(total, NUM_PARAMS);
    }

    #[test]
    fn test_gnn_forward_deterministic() {
        let weights = vec![0.01_f64; NUM_PARAMS];
        let gnn = TinyGNN::from_weights(&weights);

        let gs = setup_test_board();
        let (x, edge_index, _) = build_graph_data(&gs);
        let n = x.nrows();
        let adj = edge_index_to_adj(&edge_index, n);

        let score1 = gnn.forward(&x, &adj);
        let score2 = gnn.forward(&x, &adj);
        assert!((score1 - score2).abs() < 1e-9, "Forward pass must be deterministic");
        assert!(score1.abs() <= 1.0, "Score must be in [-1, 1] (tanh output)");
    }

    #[test]
    fn test_agent_choose_move() {
        let weights = vec![0.01_f64; NUM_PARAMS];
        let agent = GreedyJackAgent::new(weights);

        let mut gs = setup_test_board();
        gs.phase = crate::engine::GamePhase::Playing;
        gs.color_chosen.insert(gs.turn, "Blue".to_string());
        gs.is_new_turn = false;

        let mut all_moves = std::collections::HashMap::new();
        all_moves.insert("w_goddess".to_string(), vec!["p3".to_string()]);

        let m = agent.choose_move(&gs, &all_moves, false);
        match m {
            AgentMove::Move { piece, target } => {
                assert_eq!(piece, "w_goddess");
                assert_eq!(target, "p3");
            }
            AgentMove::Pass => panic!("Expected a move, not a pass"),
        }
    }
}
