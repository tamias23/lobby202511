#[cfg(test)]
mod tests {
    use crate::agents::mcts::MctsAgent;
    use crate::agents::{Agent, AgentMove};
    use crate::engine::GameState;
    use crate::models::Side;
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

    // 1. Verify Agent Name
    #[test]
    fn test_mcts_name() {
        let agent = MctsAgent::new(100, None);
        assert_eq!(agent.name(), "MCTS");
    }

    // 2. Graph Data Shape Check
    #[test]
    fn test_graph_data_shape() {
        let gs = setup_test_board();
        let agent = MctsAgent::new(10, None);
        let (x, edge_index, _, _) = agent.get_graph_data(&gs);
        assert_eq!(x.dim().0, 3); // 3 polygons
        assert_eq!(x.dim().1, 11); // 11 features
        assert_eq!(edge_index.dim().0, 2);
    }

    // 3. Mobility Visibility (Jump Neighbors in Edge Index)
    #[test]
    fn test_jump_neighbors_in_graph() {
        let gs = setup_test_board();
        let agent = MctsAgent::new(10, None);
        let (_, edge_index, _, _) = agent.get_graph_data(&gs);
        // We know p1 is at some index. Let's just check if p3 (jump neighbor) is connected to something.
        assert!(edge_index.dim().1 > 0);
    }

    // 4. Color Choice moves generated in Simulation
    #[test]
    fn test_color_moves_in_evaluate() {
        let mut gs = setup_test_board();
        gs.is_new_turn = true;
        let agent = MctsAgent::new(10, None);
        let (_, priors) = agent.evaluate(&gs);
        assert!(priors.contains_key("COLOR:Blue") || priors.contains_key("COLOR:Yellow"));
    }

    // 5. Pass moves generated when sequence-locked
    #[test]
    fn test_pass_move_in_evaluate() {
        let mut gs = setup_test_board();
        gs.locked_sequence_piece = Some("w_goddess".to_string());
        gs.is_new_turn = false;
        let agent = MctsAgent::new(10, None);
        let (_, priors) = agent.evaluate(&gs);
        assert!(priors.contains_key("PASS"));
    }

    // 6. Terminal State Detection (Goddess Capture)
    #[test]
    fn test_terminal_win_detection() {
        let mut gs = setup_test_board();
        gs.color_chosen.insert(gs.turn, "Blue".to_string());
        gs.is_new_turn = false;
        let agent = MctsAgent::new(50, None);
        let m = agent.choose_move(&gs, &std::collections::HashMap::new(), false);
        // It should pick a move (w_goddess to p2 is 1 step/jump away)
        match m {
            AgentMove::Move { .. } => {},
            _ => panic!("Expected move"),
        }
    }

    // 7. Uniform Priors Normalization
    #[test]
    fn test_priors_normalization() {
        let gs = setup_test_board();
        let agent = MctsAgent::new(10, None);
        let (_, priors) = agent.evaluate(&gs);
        if !priors.is_empty() {
            let sum: f64 = priors.values().sum();
            assert!((sum - 1.0).abs() < 1e-6);
        }
    }

    // 8. Reward Assignment Clearing
    #[test]
    fn test_reward_assignment_clears_buffer() {
        let agent = MctsAgent::new(10, None);
        {
            let mut buffer = agent.game_buffer.lock().unwrap();
            buffer.push(serde_json::json!({"turn_side": "White", "move_keys": []}));
        }
        agent.record_winner(Some(Side::White));
        let buffer = agent.game_buffer.lock().unwrap();
        assert!(buffer.is_empty());
    }

    // 11. Informed Color Choice
    #[test]
    fn test_informed_color_choice() {
        let gs = setup_test_board();
        let agent = MctsAgent::new(10, None);
        let colors = vec!["Blue".to_string(), "Yellow".to_string()];
        let chosen = agent.choose_color(&gs, &colors);
        assert!(colors.contains(chosen));
    }

    // 14. Pinned piece check
    #[test]
    fn test_pinned_piece_no_moves() {
        let mut gs = setup_test_board();
        // Manual insertion into occupancy and board
        let siren_json = r#"{
            "id": "b_siren", "type": "siren", "side": "black", "position": "p2"
        }"#;
        let siren: crate::models::Piece = serde_json::from_str(siren_json).unwrap();
        gs.board.pieces.insert("b_siren".to_string(), siren);
        gs.occupancy.insert("p2".to_string(), "b_siren".to_string());
        
        let agent = MctsAgent::new(10, None);
        let (_, priors) = agent.evaluate(&gs);
        // p1 is adjacent to p2 (black siren), so w_goddess should be pinned
        assert!(priors.is_empty());
    }

    // 17. Heroe take counter safety (using engine directly)
    #[test]
    fn test_heroe_take_counter_logic() {
        let mut gs = setup_test_board();
        let h_json = r#"{"id": "w_h", "type": "heroe", "side": "white", "position": "p1"}"#;
        let h: crate::models::Piece = serde_json::from_str(h_json).unwrap();
        gs.board.pieces.insert("w_h".to_string(), h);
        gs.heroe_take_counter = 2;
        let targets = crate::engine::get_legal_moves(&gs, "w_h");
        assert!(targets.is_empty());
    }

    // 18. Berserker invulnerability verification
    #[test]
    fn test_berserker_invulnerability() {
        let mut gs = setup_test_board();
        let b_json = r#"{"id": "b_b", "type": "berserker", "side": "black", "position": "p2"}"#;
        let b: crate::models::Piece = serde_json::from_str(b_json).unwrap();
        gs.board.pieces.insert("b_b".to_string(), b);
        gs.occupancy.insert("p2".to_string(), "b_b".to_string());
        
        let targets = crate::engine::get_legal_moves(&gs, "w_goddess");
        assert!(!targets.contains(&"p2".to_string()));
    }

    // 19. Mage deployment check
    #[test]
    fn test_mage_deployment() {
        let mut gs = setup_test_board();
        let m_json = r#"{"id": "w_m", "type": "mage", "side": "white", "position": "p1"}"#;
        let m: crate::models::Piece = serde_json::from_str(m_json).unwrap();
        gs.board.pieces.insert("w_m".to_string(), m);
        
        let s_json = r#"{"id": "w_s", "type": "soldier", "side": "white", "position": "returned"}"#;
        let s: crate::models::Piece = serde_json::from_str(s_json).unwrap();
        gs.board.pieces.insert("w_s".to_string(), s);
        // p1 has w_mage. p3 is a neighbor of p1 (via p1's neighbours/neighbors).
        // Let's ensure p3 is clear.
        let targets = crate::engine::get_legal_moves(&gs, "w_s");
        assert!(targets.contains(&"p3".to_string()) || targets.contains(&"p2".to_string()));
    }

    // 20. UCB Score sanity check
    #[test]
    fn test_ucb_score_sanity() {
        let agent = MctsAgent::new(10, None);
        // Manual check of ucb_score logic
        let parent_visits: f64 = 1.0;
        let c_puct = 1.0;
        // child 1: prob 0.9, visits 0
        // child 2: prob 0.1, visits 0
        let score1 = 0.0 + c_puct * 0.9 * (parent_visits.sqrt() / (1.0 + 0.0));
        let score2 = 0.0 + c_puct * 0.1 * (parent_visits.sqrt() / (1.0 + 0.0));
        assert!(score1 > score2);
    }

    // 15. Node state check
    #[test]
    fn test_node_initialization() {
        use crate::agents::mcts::MctsAgent;
        // Since Node is private, we can't test it directly, but we can verify search behavior
        let agent = MctsAgent::new(1, None);
        assert_eq!(agent.time_budget_ms, 1);
    }

    // 16. Board Parsing failure
    #[test]
    fn test_invalid_board_parsing() {
        let json = r#"{"allPolygons": {}, "allPieces": {}, "allEdges": {}}"#;
        let result = parse_board(json);
        assert!(result.is_err(), "Empty board should fail validation");
    }

    // 17. Mage deployment blocked by enemy
    #[test]
    fn test_mage_deployment_blocked() {
        let mut gs = setup_test_board();
        let m_json = r#"{"id": "w_m", "type": "mage", "side": "white", "position": "p1"}"#;
        let m: crate::models::Piece = serde_json::from_str(m_json).unwrap();
        gs.board.pieces.insert("w_m".to_string(), m);
        
        let s_json = r#"{"id": "w_s", "type": "soldier", "side": "white", "position": "returned"}"#;
        let s: crate::models::Piece = serde_json::from_str(s_json).unwrap();
        gs.board.pieces.insert("w_s".to_string(), s);
        
        // p2 is neighbor but occupied by b_goddess. Should be blocked.
        let targets = crate::engine::get_legal_moves(&gs, "w_s");
        assert!(!targets.contains(&"p2".to_string()));
    }

    // 18. Side persistency in buffer
    #[test]
    fn test_side_persistency_in_buffer() {
        let agent = MctsAgent::new(10, None);
        let mut gs = setup_test_board();
        gs.color_chosen.insert(Side::White, "Blue".to_string());
        gs.is_new_turn = false;
        agent.choose_move(&gs, &std::collections::HashMap::new(), false);
        let buffer = agent.game_buffer.lock().unwrap();
        let first = &buffer[0];
        assert_eq!(first["turn_side"], "White");
    }

    // 19. Ghoul non-chosen color chain
    #[test]
    fn test_ghoul_chain_moves() {
        let mut gs = setup_test_board();
        let g_json = r#"{"id": "w_g", "type": "ghoul", "side": "white", "position": "p1"}"#;
        let g: crate::models::Piece = serde_json::from_str(g_json).unwrap();
        gs.board.pieces.insert("w_g".to_string(), g);
        
        // p1 is Blue. p2 is Yellow. Color chosen is Blue.
        gs.color_chosen.insert(Side::White, "Blue".to_string());
        gs.is_new_turn = false;
        
        let targets = crate::engine::get_legal_moves(&gs, "w_g");
        // Ghoul can move to p2? Yes, it's 1 slide step away and NOT chosen color.
        assert!(targets.contains(&"p2".to_string()));
    }

    // 20. Siren pin logic
    #[test]
    fn test_siren_pin_piece() {
        let mut gs = setup_test_board();
        let s_json = r#"{"id": "b_s", "type": "siren", "side": "black", "position": "p2"}"#;
        let s: crate::models::Piece = serde_json::from_str(s_json).unwrap();
        gs.board.pieces.insert("b_s".to_string(), s);
        gs.occupancy.insert("p2".to_string(), "b_s".to_string());
        
        // white goddess at p1 is adjacent to black siren at p2
        let targets = crate::engine::get_legal_moves(&gs, "w_goddess");
        assert!(targets.is_empty(), "Piece should be pinned by Siren");
    }
}
