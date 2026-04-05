/// Tests for the Agent trait architecture:
/// - Agent trait interface contract
/// - RandomAgent produces valid moves
/// - perform_turn delegates correctly to agent
/// - Custom deterministic agent controls outcomes
/// - Pass is only offered when sequence-locked

#[cfg(test)]
mod agent_tests {
    use std::collections::HashMap;
    use crate::models::{BoardMap, Piece, Polygon, Side, PieceType};
    use crate::engine::{GameState, perform_turn, get_legal_moves, GamePhase};
    use crate::agents::{Agent, AgentMove};
    use crate::agents::random::RandomAgent;

    // ---------- Board helpers (same pattern as rules_tests) ----------

    fn create_board() -> BoardMap {
        BoardMap {
            width: Some(500.0),
            height: Some(500.0),
            polygons: HashMap::new(),
            pieces: HashMap::new(),
            edges: HashMap::new(),
        }
    }

    fn gs_playing(board: BoardMap) -> GameState {
        let mut gs = GameState::new(board);
        gs.phase = GamePhase::Playing;
        gs.color_chosen.insert(Side::White, "white".to_string());
        gs.color_chosen.insert(Side::Black, "black".to_string());
        // Rule 110: Unlock Mage by default in tests
        gs.colors_ever_chosen.insert("grey".to_string());
        gs.colors_ever_chosen.insert("green".to_string());
        gs.colors_ever_chosen.insert("blue".to_string());
        gs.colors_ever_chosen.insert("orange".to_string());
        gs
    }

    fn add_poly(board: &mut BoardMap, id: &str, color: &str, neighbors: Vec<&str>) {
        let num_id: usize = id.replace("p", "").parse().unwrap_or(0);
        board.polygons.insert(id.to_string(), Polygon {
            id: num_id,
            name: id.to_string(),
            shape: "hex".to_string(),
            neighbors: neighbors.iter().map(|s| s.to_string()).collect(),
            neighbours: neighbors.iter().map(|s| s.to_string()).collect(),
            color: color.to_string(),
            center: [0.0, 0.0],
            points: vec![],
        });
    }

    fn add_piece(board: &mut BoardMap, id: &str, pos: &str, side: Side, ptype: PieceType) {
        board.pieces.insert(id.to_string(), Piece {
            id: id.to_string(),
            position: pos.to_string(),
            side,
            piece_type: ptype,
        });
    }

    // ---------- Mock agents ----------

    /// Always picks the lexicographically first colour, piece, and target.
    struct DeterministicAgent;

    impl Agent for DeterministicAgent {
        fn name(&self) -> &str { "deterministic" }

        fn choose_color<'a>(&self, _gs: &GameState, valid_colors: &'a [String]) -> &'a String {
            let mut sorted = valid_colors.iter().collect::<Vec<_>>();
            sorted.sort();
            sorted[0]
        }

        fn choose_move(
            &self,
            _gs: &GameState,
            all_moves: &HashMap<String, Vec<String>>,
            _pass_allowed: bool,
        ) -> AgentMove {
            let mut pieces: Vec<&String> = all_moves.keys().collect();
            pieces.sort();
            let piece = pieces[0].clone();
            let mut targets = all_moves[&piece].clone();
            targets.sort();
            let target = targets[0].clone();
            AgentMove::Move { piece, target }
        }
    }

    /// Always passes when a pass is allowed.
    struct AlwaysPassAgent;

    impl Agent for AlwaysPassAgent {
        fn name(&self) -> &str { "always_pass" }

        fn choose_color<'a>(&self, _gs: &GameState, valid_colors: &'a [String]) -> &'a String {
            &valid_colors[0]
        }

        fn choose_move(
            &self,
            _gs: &GameState,
            _all_moves: &HashMap<String, Vec<String>>,
            pass_allowed: bool,
        ) -> AgentMove {
            if pass_allowed {
                AgentMove::Pass
            } else {
                let mut pieces: Vec<&String> = _all_moves.keys().collect();
                pieces.sort();
                let piece = pieces[0].clone();
                let mut targets = _all_moves[&piece].clone();
                targets.sort();
                AgentMove::Move { piece, target: targets[0].clone() }
            }
        }
    }

    // ---------- Tests ----------

    #[test]
    fn test_agent_trait_name_random() {
        let agent = RandomAgent;
        assert_eq!(agent.name(), "random");
    }

    #[test]
    fn test_agent_trait_name_deterministic() {
        let agent = DeterministicAgent;
        assert_eq!(agent.name(), "deterministic");
    }

    #[test]
    fn test_random_agent_choose_color_within_valid_set() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "blue", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let gs = gs_playing(board);
        let valid = vec!["blue".to_string(), "grey".to_string()];
        let chosen = RandomAgent.choose_color(&gs, &valid);
        assert!(valid.contains(chosen));
    }

    #[test]
    fn test_random_agent_choose_move_produces_legal_move() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "blue", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "blue".to_string());

        let legal = get_legal_moves(&gs, "w_soldier");
        let mut all_moves = HashMap::new();
        all_moves.insert("w_soldier".to_string(), legal.clone());

        let result = RandomAgent.choose_move(&gs, &all_moves, false);
        match result {
            AgentMove::Move { piece, target } => {
                assert_eq!(piece, "w_soldier");
                assert!(legal.contains(&target));
            }
            AgentMove::Pass => panic!("RandomAgent should not pass when not asked"),
        }
    }

    #[test]
    fn test_deterministic_agent_always_picks_first() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "blue", vec!["p2", "p3"]);
        add_poly(&mut board, "p2", "grey", vec!["p1"]);
        add_poly(&mut board, "p3", "grey", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "blue".to_string());

        let mut all_moves = HashMap::new();
        all_moves.insert("w_soldier".to_string(), vec!["p2".to_string(), "p3".to_string()]);

        let result = DeterministicAgent.choose_move(&gs, &all_moves, false);
        match result {
            AgentMove::Move { piece, target } => {
                assert_eq!(piece, "w_soldier");
                assert_eq!(target, "p2"); // lexicographically first
            }
            AgentMove::Pass => panic!("DeterministicAgent should not pass"),
        }
    }

    #[test]
    fn test_perform_turn_with_deterministic_agent_advances_state() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "blue", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = gs_playing(board);
        gs.turn = Side::White;

        // First call: colour selection phase (is_new_turn == true)
        // DeterministicAgent picks 'blue' (first sorted). p1 is 'blue'.
        perform_turn(&mut gs, &DeterministicAgent);
        assert!(!gs.is_new_turn);
        assert_eq!(gs.color_chosen.get(&Side::White).unwrap(), "blue");

        // Second call: move execution phase
        perform_turn(&mut gs, &DeterministicAgent);
        // Soldier landed on grey (not chosen=blue) → turn doesn't end
        assert_eq!(gs.board.pieces.get("w_soldier").unwrap().position, "p2");
    }

    #[test]
    fn test_perform_turn_turn_ends_when_choosing_chosen_color() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "blue", vec!["p2"]);
        add_poly(&mut board, "p2", "blue", vec!["p1"]);
        // Add a second piece so there IS a valid non-blue piece too if we wanted,
        // but our piece is w_goddess on blue.
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        let mut gs = gs_playing(board);
        gs.turn = Side::White;

        // Colour phase -> Picks 'blue'
        perform_turn(&mut gs, &DeterministicAgent);
        // Move phase — lands on chosen colour (blue) → turn ends (Goddess is not Soldier)
        perform_turn(&mut gs, &DeterministicAgent);

        assert_eq!(gs.turn, Side::Black);
        assert!(gs.is_new_turn);
    }

    #[test]
    fn test_perform_turn_no_valid_moves_skips_turn() {
        let mut board = create_board();
        // Goddess on a dead-end polygon
        add_poly(&mut board, "p1", "blue", vec![]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        // No legal moves at all
        let mut gs = gs_playing(board);
        gs.turn = Side::White;

        // Call 1: Colour phase
        perform_turn(&mut gs, &DeterministicAgent);
        // Call 2: Move phase — no legal moves -> skipped to opponent
        let result = perform_turn(&mut gs, &DeterministicAgent).0;
        assert!(!result); // No Goddess captured
        assert_eq!(gs.turn, Side::Black); // Skipped to opponent
    }

    #[test]
    fn test_always_pass_agent_ends_turn_immediately_when_locked() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = gs_playing(board);
        gs.turn = Side::White;

        // Manually set up a locked sequence scenario
        // Colour phase
        perform_turn(&mut gs, &DeterministicAgent);
        // Move soldier to p2 (chosen colour orange) → soldier gets locked
        perform_turn(&mut gs, &DeterministicAgent);
        // Soldier is now locked on p2, it's still White's turn
        if gs.turn == Side::White {
            // Now the AlwaysPassAgent will see pass_allowed=true and end the turn
            perform_turn(&mut gs, &AlwaysPassAgent);
            assert_eq!(gs.turn, Side::Black);
        }
    }

    #[test]
    fn test_perform_turn_captures_goddess_returns_true() {
        let mut board = create_board();
        add_poly(&mut board, "p1", "blue", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "b_goddess", "p2", Side::Black, PieceType::Goddess);
        let mut gs = gs_playing(board);
        gs.turn = Side::White;

        // Colour phase
        perform_turn(&mut gs, &DeterministicAgent);
        // Move phase — Heroe captures Black Goddess
        let (result, _) = perform_turn(&mut gs, &DeterministicAgent);
        assert!(result, "perform_turn should return true when a Goddess is captured");
    }

    #[test]
    fn test_perform_random_turn_is_consistent_with_perform_turn_random() {
        // Both should advance the game — compare turn counting
        use crate::engine::perform_random_turn;

        let mut board = create_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);

        let mut gs1 = gs_playing(board.clone());
        gs1.turn = Side::White;
        let mut gs2 = gs_playing(board);
        gs2.turn = Side::White;

        // Both should complete a full turn in two calls (colour + move)
        perform_random_turn(&mut gs1);
        perform_turn(&mut gs2, &RandomAgent);
        // Both should be in the same phase (move phase, colour chosen)
        assert!(!gs1.is_new_turn);
        assert!(!gs2.is_new_turn);
    }
}
