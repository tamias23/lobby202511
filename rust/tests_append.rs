    // ---------------------------------------------------------
    // §3.0 Global Constraints
    // ---------------------------------------------------------
    #[test]
    fn test_global_constraint_no_friendly_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_global_constraint_no_berserker_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "b_berserker", "p2", Side::Black, PieceType::Berserker);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_global_constraint_siren_no_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_siren");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_global_constraint_bishop_no_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_global_constraint_sequence_locked_piece_only() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier);
        let mut gs = GameState::new(board);
        gs.locked_sequence_piece = Some("w_heroe".to_string());
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.is_empty());
    }

    // ---------------------------------------------------------
    // §3.1 Siren Pin
    // ---------------------------------------------------------
    #[test]
    fn test_siren_pin_slide_adjacency_blocks_moves() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_siren", "p2", Side::Black, PieceType::Siren);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.is_empty());
    }

    #[test]
    fn test_siren_pin_jump_adjacency_does_not_block() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2", "p3"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_siren", "p2", Side::Black, PieceType::Siren);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_siren_pin_friendly_siren_does_not_block() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_siren", "p2", Side::White, PieceType::Siren);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_siren_pin_blocks_all_piece_types() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2", "p3"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_poly(&mut board, "p3", "white", vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        add_piece(&mut board, "b_siren", "p2", Side::Black, PieceType::Siren);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        assert!(moves.is_empty());
    }

    #[test]
    fn test_siren_pin_dead_siren_does_not_block() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_siren", "graveyard", Side::Black, PieceType::Siren); // Or removed from occupancy
        let gs = GameState::new(board); // p2 will be empty
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.contains(&"p2".to_string()));
    }

    // ---------------------------------------------------------
    // §3.2 Goddess
    // ---------------------------------------------------------
    #[test]
    fn test_goddess_jump_range_2() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2", "p4"]);
        add_poly_split(&mut board, "p4", "white", vec![], vec!["p3"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        assert!(moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
        assert!(!moves.contains(&"p4".to_string()));
    }

    #[test]
    fn test_goddess_standard_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        assert!(moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_goddess_no_friendly_landing() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_goddess_no_berserker_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        add_piece(&mut board, "b_berserker", "p2", Side::Black, PieceType::Berserker);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_goddess_jump_blocks_not_applicable() {
        // Jump movement goes "over" pieces.
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier); // Friendly piece in between
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        assert!(moves.contains(&"p3".to_string())); // Can jump over friendly
    }

    // ---------------------------------------------------------
    // §3.3 Heroe
    // ---------------------------------------------------------
    #[test]
    fn test_heroe_jump_range_3() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2", "p4"]);
        add_poly_split(&mut board, "p4", "white", vec![], vec!["p3", "p5"]);
        add_poly_split(&mut board, "p5", "white", vec![], vec!["p4"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
        assert!(moves.contains(&"p4".to_string()));
        assert!(!moves.contains(&"p5".to_string()));
    }

    #[test]
    fn test_heroe_take_limit_1() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        let mut gs = GameState::new(board);
        gs.heroe_take_counter = 1; // Used 1 of 2 max allowed counters? Wait, counter < 2 means still has moves.
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_heroe_take_limit_2() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        let mut gs = GameState::new(board);
        gs.heroe_take_counter = 2; // >= 2 blocks moves
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(moves.is_empty());
    }

    #[test]
    fn test_heroe_standard_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_heroe_jump_over_enemies() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_heroe");
        assert!(moves.contains(&"p3".to_string())); // Can jump over enemy
    }

    // ---------------------------------------------------------
    // §3.4 Mage
    // ---------------------------------------------------------
    #[test]
    fn test_mage_jump_range_3() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "blue", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "yellow", vec![], vec!["p2", "p4"]);
        add_poly_split(&mut board, "p4", "green", vec![], vec!["p3", "p5"]);
        add_poly_split(&mut board, "p5", "grey", vec![], vec!["p4"]);
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_mage");
        assert!(moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
        assert!(moves.contains(&"p4".to_string()));
        assert!(!moves.contains(&"p5".to_string()));
    }

    #[test]
    fn test_mage_colour_constraint_different_colour() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2", "p3"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]); // Same colour
        add_poly_split(&mut board, "p3", "yellow", vec![], vec!["p1"]); // Different colour
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_mage");
        assert!(!moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_mage_standard_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1"]);
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_mage");
        assert!(moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_mage_no_capture_on_same_colour() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_mage");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_mage_jump_over_pieces() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "yellow", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "blue", vec![], vec!["p2"]);
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier); // Intervening friendly piece
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_mage");
        assert!(moves.contains(&"p3".to_string()));
    }

    // ---------------------------------------------------------
    // §3.5 Bishop
    // ---------------------------------------------------------
    #[test]
    fn test_bishop_jump_range_4() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "grey", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "grey", vec![], vec!["p2", "p4"]);
        add_poly_split(&mut board, "p4", "grey", vec![], vec!["p3", "p5"]);
        add_poly_split(&mut board, "p5", "white", vec![], vec!["p4", "p6"]); // Hop 4
        add_poly_split(&mut board, "p6", "white", vec![], vec!["p5"]); // Hop 5
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(moves.contains(&"p5".to_string()));
        assert!(!moves.contains(&"p6".to_string()));
    }

    #[test]
    fn test_bishop_colour_constraint_same_colour() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2", "p3"]);
        add_poly_split(&mut board, "p2", "yellow", vec![], vec!["p1"]); // Different colour
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p1"]); // Same colour
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(!moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_bishop_no_capture() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_bishop_can_move_to_empty() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_bishop_jump_over_pieces() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "grey", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2"]);
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier); // Intervening friendly
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(moves.contains(&"p3".to_string()));
    }

    // ---------------------------------------------------------
    // §3.6 Siren
    // ---------------------------------------------------------
    #[test]
    fn test_siren_jump_range_2() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2", "p4"]);
        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_siren");
        assert!(moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
        assert!(!moves.contains(&"p4".to_string()));
    }

    #[test]
    fn test_siren_moves_to_empty() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_siren");
        assert!(moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_siren_no_friendly_landing() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_siren");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_siren_jump_over_pieces() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1", "p3"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p2"]);
        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier); // Friendly piece
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_siren");
        assert!(moves.contains(&"p3".to_string()));
    }

    // ---------------------------------------------------------
    // §3.7 Soldier & Berserker 
    // ---------------------------------------------------------
    #[test]
    fn test_soldier_chain_through_multiple_friendlies() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "grey", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "orange", vec!["p3"]);
        add_piece(&mut board, "w_soldier_1", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_soldier_2", "p2", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_soldier_3", "p3", Side::White, PieceType::Soldier);
        let gs = GameState::new(board); // No color chosen needed for friendly chaining
        let moves = get_legal_moves(&gs, "w_soldier_1");
        assert!(moves.contains(&"p4".to_string())); // Traverses p2, p3 to reach p4
    }

    #[test]
    fn test_soldier_chain_chosen_color_highway() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "orange", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "grey", vec!["p3"]); // Destination
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = GameState::new(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.contains(&"p4".to_string()));
    }

    #[test]
    fn test_soldier_chain_blocked_by_enemy() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier); // Block
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        // Can capture the enemy on p2, but cannot chain through it to p3
        assert!(moves.contains(&"p2".to_string()));
        assert!(!moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_soldier_chain_blocked_by_non_chosen_empty() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3"]); // Empty non-chosen
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = GameState::new(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        let moves = get_legal_moves(&gs, "w_soldier");
        // Can move to p2, but cannot chain through p2 to p3
        assert!(moves.contains(&"p2".to_string()));
        assert!(!moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_berserker_chain_same_as_soldier() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "grey", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "orange", vec!["p3"]);
        add_piece(&mut board, "w_berserker", "p1", Side::White, PieceType::Berserker);
        add_piece(&mut board, "w_soldier_2", "p2", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_soldier_3", "p3", Side::White, PieceType::Soldier);
        let gs = GameState::new(board);
        let moves = get_legal_moves(&gs, "w_berserker");
        assert!(moves.contains(&"p4".to_string())); // Traverses p2, p3 to reach p4
    }

    // ---------------------------------------------------------
    // §3.8 Ghoul
    // ---------------------------------------------------------
    #[test]
    fn test_ghoul_base_chain_up_to_depth_2_giving_3_hops() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3"]); // depth 0 explores from p1, pushing p2 at depth 1
        add_poly(&mut board, "p3", "grey", vec!["p2", "p4"]); // depth 1 explores from p2, pushing p3 at depth 2
        add_poly(&mut board, "p4", "grey", vec!["p3", "p5"]); // depth 2 explores from p3, adds p4 to targets but does not push to explore!
        add_poly(&mut board, "p5", "grey", vec!["p4"]); // Beyond reach
        add_piece(&mut board, "w_ghoul", "p1", Side::White, PieceType::Ghoul);
        let mut gs = GameState::new(board);
        gs.color_chosen.insert(Side::White, "orange".to_string()); // Chosen color must be DIFFERENT for ghoul chaining
        let moves = get_legal_moves(&gs, "w_ghoul");
        assert!(moves.contains(&"p2".to_string())); // 1 hop
        assert!(moves.contains(&"p3".to_string())); // 2 hops
        assert!(moves.contains(&"p4".to_string())); // 3 hops
        assert!(!moves.contains(&"p5".to_string())); // 4 hops
    }

    #[test]
    fn test_ghoul_chain_blocked_by_occupied_poly() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3"]); 
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        add_piece(&mut board, "w_ghoul", "p1", Side::White, PieceType::Ghoul);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier); // Enemy blocking chain (unlike soldier chaining)
        let mut gs = GameState::new(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        let moves = get_legal_moves(&gs, "w_ghoul");
        assert!(moves.contains(&"p2".to_string())); // Can capture
        assert!(!moves.contains(&"p3".to_string())); // Cannot chain through
    }

    #[test]
    fn test_ghoul_chain_blocked_by_chosen_color() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1", "p3"]); // Chosen color!
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        add_piece(&mut board, "w_ghoul", "p1", Side::White, PieceType::Ghoul);
        let mut gs = GameState::new(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        let moves = get_legal_moves(&gs, "w_ghoul");
        assert!(moves.contains(&"p2".to_string())); // Can land
        assert!(!moves.contains(&"p3".to_string())); // Cannot chain through chosen color
    }

    #[test]
    fn test_ghoul_chain_blocked_by_siren_pin() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3", "p4"]); 
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        add_poly(&mut board, "p4", "grey", vec!["p2"]); // Siren spot
        add_piece(&mut board, "w_ghoul", "p1", Side::White, PieceType::Ghoul);
        add_piece(&mut board, "b_siren", "p4", Side::Black, PieceType::Siren);
        let mut gs = GameState::new(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        let moves = get_legal_moves(&gs, "w_ghoul");
        assert!(moves.contains(&"p2".to_string())); // Can land safely
        assert!(!moves.contains(&"p3".to_string())); // Cannot chain through geometrically pinned p2
    }

    // ---------------------------------------------------------
    // §4.1 Standard Capture
    // ---------------------------------------------------------
    #[test]
    fn test_standard_capture_returns_piece() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        let mut gs = GameState::new(board);
        let captured = apply_move(&mut gs, "w_soldier", "p2");
        assert_eq!(captured, vec![PieceType::Soldier]);
        assert_eq!(gs.board.pieces.get("b_soldier").unwrap().position, "returned");
        assert_eq!(gs.board.pieces.get("w_soldier").unwrap().position, "p2");
    }

    // ---------------------------------------------------------
    // §4.2 Bishop AoE
    // ---------------------------------------------------------
    #[test]
    fn test_bishop_aoe_fires_even_on_empty_landing() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]); // slide adj to p2
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        add_piece(&mut board, "b_soldier", "p3", Side::Black, PieceType::Soldier);
        let mut gs = GameState::new(board);
        apply_move(&mut gs, "w_bishop", "p2"); // Landing on empty p2
        assert_eq!(gs.board.pieces.get("b_soldier").unwrap().position, "returned");
    }

    #[test]
    fn test_bishop_aoe_spares_friendlies() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]); 
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        add_piece(&mut board, "w_soldier", "p3", Side::White, PieceType::Soldier);
        let mut gs = GameState::new(board);
        apply_move(&mut gs, "w_bishop", "p2");
        assert_eq!(gs.board.pieces.get("w_soldier").unwrap().position, "p3"); // Safe
    }

    // ---------------------------------------------------------
    // §4.3 Mage AoE
    // ---------------------------------------------------------
    #[test]
    fn test_mage_aoe_does_not_fire_on_empty_landing() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]); 
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier", "p3", Side::Black, PieceType::Soldier);
        let mut gs = GameState::new(board);
        apply_move(&mut gs, "w_mage", "p2"); // Empty landing
        assert_eq!(gs.board.pieces.get("b_soldier").unwrap().position, "p3"); // Safe
    }

    #[test]
    fn test_mage_aoe_fires_on_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]); 
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier_1", "p2", Side::Black, PieceType::Soldier);
        add_piece(&mut board, "b_soldier_2", "p3", Side::Black, PieceType::Soldier);
        let mut gs = GameState::new(board);
        apply_move(&mut gs, "w_mage", "p2"); // Capture!
        assert_eq!(gs.board.pieces.get("b_soldier_1").unwrap().position, "returned");
        assert_eq!(gs.board.pieces.get("b_soldier_2").unwrap().position, "returned"); // AoE chain triggers
    }

    // ---------------------------------------------------------
    // §5.0 Deployment & §2.3 Turn-End Rules
    // ---------------------------------------------------------
    #[test]
    fn test_deploy_on_chosen_color_ends_turn() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "returned", Side::White, PieceType::Soldier);
        let mut gs = GameState::new(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());
        gs.is_new_turn = false;

        let captured = apply_move(&mut gs, "w_soldier", "p1");
        // apply_move_turnover simulates the post-move check
        apply_move_turnover(&mut gs, "w_soldier", "p1", false, captured.is_empty(), true);
        
        // Turn ended
        assert_eq!(gs.turn, Side::Black);
        assert!(gs.is_new_turn);
    }

    #[test]
    fn test_deploy_on_non_chosen_color_adj_to_mage() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "grey", vec!["p2"]); // Not chosen color
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "returned", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_mage", "p2", Side::White, PieceType::Mage); // Friendly mage
        let mut gs = GameState::new(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());

        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.contains(&"p1".to_string())); // Can deploy because adj to Mage
    }

    #[test]
    fn test_deploy_on_non_chosen_does_not_end_turn() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "grey", vec!["p2"]); 
        add_poly(&mut board, "p2", "white", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "returned", Side::White, PieceType::Soldier);
        add_poly(&mut board, "p3", "orange", vec![]);
        add_piece(&mut board, "w_goddess", "p3", Side::White, PieceType::Goddess); // To keep turn alive
        
        add_piece(&mut board, "w_mage", "p2", Side::White, PieceType::Mage); 
        
        let mut gs = GameState::new(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());
        gs.is_new_turn = false;

        let captured = apply_move(&mut gs, "w_soldier", "p1"); // Deploy on Grey
        apply_move_turnover(&mut gs, "w_soldier", "p1", false, captured.is_empty(), true);
        
        // Turn did NOT end! 
        assert_eq!(gs.turn, Side::White);
        assert!(!gs.is_new_turn);
    }

    // ---------------------------------------------------------
    // Sequence Locking 
    // ---------------------------------------------------------
    #[test]
    fn test_sequence_locking_soldier() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        let mut gs = GameState::new(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());
        gs.is_new_turn = false;

        let captured = apply_move(&mut gs, "w_soldier", "p2");
        apply_move_turnover(&mut gs, "w_soldier", "p2", false, captured.is_empty(), false); // was_returned=false
        
        // Lands on orange (chosen), is a soldier, should be locked
        assert_eq!(gs.locked_sequence_piece, Some("w_soldier".to_string()));
        assert_eq!(gs.turn, Side::White); // Turn didn't end
    }

    #[test]
    fn test_sequence_locking_goddess_ends_turn() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        let mut gs = GameState::new(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());
        gs.is_new_turn = false;

        let captured = apply_move(&mut gs, "w_goddess", "p2");
        apply_move_turnover(&mut gs, "w_goddess", "p2", false, captured.is_empty(), false); 
        
        // Non-soldier/heroe lands on chosen, turn ends!
        assert_eq!(gs.turn, Side::Black);
        assert!(gs.is_new_turn);
    }
}
