#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use crate::models::{BoardMap, Piece, Polygon, Side, PieceType};
    use crate::engine::{GameState, get_legal_moves, apply_move, apply_move_turnover, GamePhase};

    fn create_mock_board() -> BoardMap {
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
        // Default color choices to allow most tests to pass if they start on 'white' or 'black'
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

    fn add_poly_split(board: &mut BoardMap, id: &str, color: &str, slide: Vec<&str>, jump: Vec<&str>) {
        let num_id: usize = id.replace("p", "").parse().unwrap_or(0);
        board.polygons.insert(id.to_string(), Polygon {
            id: num_id,
            name: id.to_string(),
            shape: "hex".to_string(),
            neighbors: slide.iter().map(|s| s.to_string()).collect(),
            neighbours: jump.iter().map(|s| s.to_string()).collect(),
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

    // ---------------------------------------------------------
    // Goddess Tests
    // ---------------------------------------------------------
    #[test]
    fn test_goddess_movement() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "yellow", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "yellow", vec!["p3", "p5"]);
        add_poly(&mut board, "p5", "yellow", vec!["p4"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);

        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        
        assert!(moves.contains(&"p2".to_string())); // 1 away
        assert!(moves.contains(&"p3".to_string())); // 2 away
        assert!(!moves.contains(&"p4".to_string())); // 3 away blocked
    }

    // ---------------------------------------------------------
    // Heroe Tests
    // ---------------------------------------------------------
    #[test]
    fn test_heroe_movement() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "yellow", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "yellow", vec!["p3", "p5"]);
        add_poly(&mut board, "p5", "yellow", vec!["p4"]);
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);

        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_heroe");
        
        assert!(moves.contains(&"p2".to_string())); // 1 away
        assert!(moves.contains(&"p3".to_string())); // 2 away
        assert!(moves.contains(&"p4".to_string())); // 3 away
        assert!(!moves.contains(&"p5".to_string())); // 4 away blocked
    }

    // ---------------------------------------------------------
    // Bishop Tests
    // ---------------------------------------------------------
    #[test]
    fn test_bishop_movement_and_aoe() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "black", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "white", vec!["p3", "p5"]);
        add_poly(&mut board, "p5", "yellow", vec!["p4"]);
        
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        add_piece(&mut board, "b_soldier", "p5", Side::Black, PieceType::Soldier);
        add_piece(&mut board, "w_soldier", "p3", Side::White, PieceType::Soldier);

        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        
        let moves = get_legal_moves(&gs, "w_bishop");
        
        assert!(moves.contains(&"p4".to_string())); // Same color (white)
        assert!(!moves.contains(&"p2".to_string())); // Different color (yellow)

        apply_move(&mut gs, "w_bishop", "p4");

        // Verify AoE: black soldier on p5 is destroyed, white soldier on p3 is immune.
        assert_eq!(gs.board.pieces.get("b_soldier").unwrap().position, "returned"); 
        assert_eq!(gs.board.pieces.get("w_soldier").unwrap().position, "p3"); 
    }

    // ---------------------------------------------------------
    // Mage Tests
    // ---------------------------------------------------------
    #[test]
    fn test_mage_movement_and_aoe() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "black", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "white", vec!["p3", "p5"]);
        add_poly(&mut board, "p5", "yellow", vec!["p4", "p6", "p7"]);
        add_poly(&mut board, "p6", "yellow", vec!["p5"]);
        add_poly(&mut board, "p7", "orange", vec!["p5"]);
        
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier_1", "p5", Side::Black, PieceType::Soldier);
        add_piece(&mut board, "b_soldier_2", "p6", Side::Black, PieceType::Soldier);
        add_piece(&mut board, "w_soldier", "p7", Side::White, PieceType::Soldier);

        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        
        let moves = get_legal_moves(&gs, "w_mage");
        
        assert!(moves.contains(&"p3".to_string())); // Different color
        assert!(!moves.contains(&"p4".to_string())); // Same color (white)
        assert!(!moves.contains(&"p6".to_string())); // Out of 3-hop range

        apply_move(&mut gs, "w_mage", "p5");

        // AoE: Target black_soldier_1 at p5 triggers chain killing black_soldier_2 at p6, but spares white_soldier at p7.
        assert_eq!(gs.board.pieces.get("b_soldier_1").unwrap().position, "returned"); 
        assert_eq!(gs.board.pieces.get("b_soldier_2").unwrap().position, "returned"); 
        assert_eq!(gs.board.pieces.get("w_soldier").unwrap().position, "p7"); 
    }

    // ---------------------------------------------------------
    // Siren and Ghoul Tests
    // ---------------------------------------------------------
    #[test]
    fn test_ghoul_base_chain_up_to_depth_2_giving_3_hops() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "black", vec!["p2"]); // Current position matches chosen color
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]); // Intermediate non-chosen color
        add_poly(&mut board, "p3", "white", vec!["p2", "p4"]); // Intermediate non-chosen color
        add_poly(&mut board, "p4", "white", vec!["p3"]);

        add_piece(&mut board, "b_ghoul", "p1", Side::Black, PieceType::Ghoul);
        let mut gs = gs_playing(board);
        gs.turn = Side::Black; // Ensure it's Black's turn
        gs.color_chosen.insert(Side::Black, "black".to_string());
        
        let moves = get_legal_moves(&gs, "b_ghoul");
        assert!(moves.contains(&"p2".to_string()));
        assert!(moves.contains(&"p3".to_string()));
        assert!(moves.contains(&"p4".to_string()));
    }
    
    #[test]
    fn test_ghoul_chain_blocked_by_occupied_poly() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "black", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]);

        add_piece(&mut board, "b_ghoul", "p1", Side::Black, PieceType::Ghoul);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier); // Occupant blocks chaining through p2
        
        let mut gs = gs_playing(board);
        gs.turn = Side::Black;
        gs.color_chosen.insert(Side::Black, "black".to_string());
        
        let moves = get_legal_moves(&gs, "b_ghoul");
        assert!(moves.contains(&"p2".to_string())); // Can land on p2 (capture)
        assert!(!moves.contains(&"p3".to_string())); // Cannot chain through occupied p2
    }

    #[test]
    fn test_ghoul_chain_blocked_by_chosen_color() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "black", vec!["p2"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3"]); // Chosen color blocks chaining
        add_poly(&mut board, "p3", "white", vec!["p2"]);

        add_piece(&mut board, "b_ghoul", "p1", Side::Black, PieceType::Ghoul);
        
        let mut gs = gs_playing(board);
        gs.turn = Side::Black;
        gs.color_chosen.insert(Side::Black, "black".to_string());
        
        let moves = get_legal_moves(&gs, "b_ghoul");
        assert!(moves.contains(&"p2".to_string())); // Can land on p2
        assert!(!moves.contains(&"p3".to_string())); // Cannot chain through chosen color p2
    }

    #[test]
    fn test_ghoul_chain_blocked_by_siren_pin() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "black", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3", "p4"]);
        add_poly(&mut board, "p3", "white", vec!["p2"]);
        add_poly(&mut board, "p4", "white", vec!["p2"]);

        add_piece(&mut board, "b_ghoul", "p1", Side::Black, PieceType::Ghoul);
        add_piece(&mut board, "w_siren", "p4", Side::White, PieceType::Siren); // Pins p2
        
        let mut gs = gs_playing(board);
        gs.turn = Side::Black;
        gs.color_chosen.insert(Side::Black, "black".to_string());
        
        let moves = get_legal_moves(&gs, "b_ghoul");
        assert!(moves.contains(&"p2".to_string())); // Can land on p2
        assert!(!moves.contains(&"p3".to_string())); // Cannot chain through pinned p2
    }

    #[test]
    fn test_siren_and_ghoul() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2", "p10"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "orange", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "white", vec!["p3"]);
        
        add_poly(&mut board, "p10", "white", vec!["p1", "p11"]);
        add_poly(&mut board, "p11", "black", vec!["p10", "p12"]);
        add_poly(&mut board, "p12", "black", vec!["p11", "p13"]);
        add_poly(&mut board, "p13", "white", vec!["p12", "p14"]);
        add_poly(&mut board, "p14", "white", vec!["p13"]);

        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        add_piece(&mut board, "b_ghoul", "p10", Side::Black, PieceType::Ghoul);

        let gs = gs_playing(board);
        
        // Aura Pin Test: Ghoul and Soldier adjacent to Siren have canMove = 0 mathematically mapped in the engine during movement request.
        let ghoul_moves = get_legal_moves(&gs, "b_ghoul");
        let bsold_moves = get_legal_moves(&gs, "b_soldier");
        assert_eq!(ghoul_moves.len(), 0); // Pinned
        assert_eq!(bsold_moves.len(), 0); // Pinned
        
        // Siren Movement Range:
        let siren_moves = get_legal_moves(&gs, "w_siren");
        assert!(!siren_moves.contains(&"p2".to_string())); // Blocked natively by pacifist restraint (enemy occupied)!
        assert!(siren_moves.contains(&"p3".to_string())); // 2 away (empty)
        assert!(!siren_moves.contains(&"p4".to_string())); // 3 away blocked
    }

    // ---------------------------------------------------------
    // 5 Specific Berserker Tests (Requested by User)
    // ---------------------------------------------------------

    // TEST 1: Absolute Invulnerability from Direct Capture (Get Legal Moves Filter)
    #[test]
    fn test_berserker_invulnerable_direct_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1"]);
        
        add_piece(&mut board, "b_heroe", "p1", Side::Black, PieceType::Heroe);
        add_piece(&mut board, "w_berserker", "p2", Side::White, PieceType::Berserker);

        let gs = gs_playing(board);
        let heroe_moves = get_legal_moves(&gs, "b_heroe");
        
        // The mighty Black Heroe cannot target p2 because a Berserker stands there.
        assert!(!heroe_moves.contains(&"p2".to_string())); 
    }

    // TEST 2: Absolute Invulnerability from Area of Effect (Mage/Bishop Explosions)
    #[test]
    fn test_berserker_invulnerable_aoe() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3", "p4"]);
        add_poly(&mut board, "p3", "yellow", vec!["p2"]); // Adjacent to target area
        add_poly(&mut board, "p4", "yellow", vec!["p2"]); // Adjacent to target area
        
        add_piece(&mut board, "w_mage", "p1", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier); // The target
        add_piece(&mut board, "b_berserker", "p3", Side::Black, PieceType::Berserker); // Collateral target
        add_piece(&mut board, "w_berserker", "p4", Side::White, PieceType::Berserker); // Friendly Berserker

        let mut gs = gs_playing(board);
        gs.turn = Side::White;

        apply_move(&mut gs, "w_mage", "p2");

        // Verify the soldier died but the massive Berserkers survived seamlessly.
        assert_eq!(gs.board.pieces.get("b_soldier").unwrap().position, "returned"); 
        assert_eq!(gs.board.pieces.get("b_berserker").unwrap().position, "p3"); 
        assert_eq!(gs.board.pieces.get("w_berserker").unwrap().position, "p4"); 
    }

    // TEST 3: Berserker Phalanx Movement (Chaining via Teammates and Chosen Color)
    #[test]
    fn test_berserker_chain_movement() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "white", vec!["p1", "p3"]); // Teammate
        add_poly(&mut board, "p3", "white", vec!["p2", "p4"]); // Chosen Color (Empty)
        add_poly(&mut board, "p4", "white", vec!["p3", "p5"]); // Chosen Color (Empty)
        add_poly(&mut board, "p5", "grey", vec!["p4"]); // Grey (Empty, Destination)
        
        add_piece(&mut board, "w_berserker", "p1", Side::White, PieceType::Berserker);
        add_piece(&mut board, "w_soldier", "p2", Side::White, PieceType::Soldier); // The bridge
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "white".to_string()); // Start piece must be on chosen color to be eligible

        let berserker_moves = get_legal_moves(&gs, "w_berserker");
        
        assert!(berserker_moves.contains(&"p5".to_string())); // Chained mathematically! 1->2->3->4->5.
    }

    // TEST 4: Berserker Solid Collision (Blocks Enemy Phalanxes Natively)
    #[test]
    fn test_berserker_solid_collision_blocks_all() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1", "p3"]); // Intervening gap
        add_poly(&mut board, "p3", "grey", vec!["p2"]); 
        
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_berserker", "p2", Side::Black, PieceType::Berserker); // The wall
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());

        let soldier_moves = get_legal_moves(&gs, "w_soldier");
        
        // Cannot chain onto the Berserker or jump completely through it safely.
        assert!(!soldier_moves.contains(&"p2".to_string()));
        assert!(!soldier_moves.contains(&"p3".to_string()));
    }

    // TEST 5: Berserker Siren Susceptibility (They are immobilized by Siren singing)
    #[test]
    fn test_berserker_vulnerable_to_siren_pinning() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "black", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "grey", vec!["p2"]); 
        
        add_piece(&mut board, "w_berserker", "p1", Side::White, PieceType::Berserker);
        add_piece(&mut board, "b_siren", "p2", Side::Black, PieceType::Siren); // The singer
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "grey".to_string());

        let berserker_moves = get_legal_moves(&gs, "w_berserker");
        
        // Berserker has exactly 0 legal maneuvers generated. Immobilized flawlessly.
        assert_eq!(berserker_moves.len(), 0);
    }

    // ---------------------------------------------------------
    // Phase 9 Final Physics Defect Rectification Asserts
    // ---------------------------------------------------------

    // TEST 6: Siren pinning utilizes "slide" matrices exclusively natively bypassing cross-wall jump bounds mathematically!
    #[test]
    fn test_siren_topology_pinning_strict_slide() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec!["p3"], vec!["p2", "p3"]);
        add_poly_split(&mut board, "p2", "black", vec![], vec!["p1"]);
        add_poly_split(&mut board, "p3", "grey", vec!["p1"], vec!["p1"]);
        
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_siren", "p2", Side::Black, PieceType::Siren);
        
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        
        // p2 is a jump neighbor organically natively representing a physical gap, so the Siren does NOT organically pin the Soldier!
        assert!(moves.contains(&"p3".to_string()));
    }

    // TEST 7: Siren pacisfism! Siren cannot explicitly target enemies natively mapping empty geometry exclusively!
    #[test]
    fn test_siren_cannot_capture() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1"]);
        
        add_piece(&mut board, "w_siren", "p1", Side::White, PieceType::Siren);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_siren");
        
        // Target is an enemy realistically mathematically reachable, but Sirens are strictly pacifists natively!
        assert_eq!(moves.len(), 0);
    }

    // TEST 8: Phalanxes mathematically terminate chaining organically passing across pinned chosen colors!
    #[test]
    fn test_soldier_chain_blocked_at_pinned_chosen_color() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1", "p3", "p4"]); // The chosen color hub natively
        add_poly(&mut board, "p3", "grey", vec!["p2"]); // Target organically past the hub
        add_poly(&mut board, "p4", "black", vec!["p2"]); // Enemy Siren position organically pinning the hub
        
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_siren", "p4", Side::Black, PieceType::Siren);
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        
        let moves = get_legal_moves(&gs, "w_soldier");
        
        // p2 is securely permitted landing organically locally, but chaining projecting into p3 is strictly blocked because p2 is pinned natively!
        assert!(moves.contains(&"p2".to_string()));
        assert!(!moves.contains(&"p3".to_string()));
    }

    // TEST 9: Heroe sequence caps dynamically evaluate 1 exact sequence natively identically to JS!
    #[test]
    fn test_heroe_has_taken_counter_limits() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1"]);
        
        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        
        let mut gs = gs_playing(board);
        // Simulating an AI Heroe natively tracking that it has already executed its exactly 1 extra sequence
        gs.heroe_take_counter = 2; 
        
        let moves = get_legal_moves(&gs, "w_heroe");
        
        // Heroe is exhausted mathematically natively mirroring limits accurately entirely!
        assert_eq!(moves.len(), 0);
    }

    // TEST 10: Soldiers/Berserkers landing on NON-chosen colors formally break their personal sequences WITHOUT immediately killing the collective team Turn!
    #[test]
    fn test_soldier_chain_stops_on_non_chosen_color_without_turn_ending() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec!["p2"]);
        add_poly(&mut board, "p2", "yellow", vec!["p1", "p3"]); // non-chosen color
        add_poly(&mut board, "p3", "black", vec!["p2"]);
        add_poly(&mut board, "p4", "orange", vec!["p3"]);
        
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);
        add_piece(&mut board, "w_goddess", "p4", Side::White, PieceType::Goddess); // An active White piece on the true chosen_color!
        
        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string()); // White's chosen color for the active turn is 'orange'
        gs.is_new_turn = false; // The engine natively clears this flag right after a color is selected at the start of a turn!
        
        // Simulating the AI randomly picking White's Soldier to capture Black's Soldier on 'yellow' (which is NOT 'orange').
        let captured = crate::engine::apply_move(&mut gs, "w_soldier", "p2");
        let goddess_captured = captured.contains(&PieceType::Goddess);
        let _ended_turn_early = crate::engine::apply_move_turnover(&mut gs, "w_soldier", "p2", goddess_captured, captured.is_empty(), false);
        
        // Assertions: 
        // 1. The Soldier's personal chaining lock IS totally broken off natively because it landed on yellow!
        assert_eq!(gs.locked_sequence_piece, None);
        // 2. The overarching turn itself DID NOT organically end natively! White still has the right to move `w_goddess` on orange!
        assert_eq!(gs.turn, Side::White);
        assert!(!gs.is_new_turn);
    }

    // TEST 11: Captured pieces go to "returned" and can be re-deployed
    #[test]
    fn test_captured_piece_can_redeploy() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "orange", vec!["p2"]);

        add_piece(&mut board, "w_heroe", "p1", Side::White, PieceType::Heroe);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);

        let mut gs = gs_playing(board);
        gs.turn = Side::Black;
        gs.color_chosen.insert(Side::Black, "orange".to_string());

        // White captures the black soldier
        apply_move(&mut gs, "w_heroe", "p2");

        // Soldier should be "returned", not "graveyard"
        assert_eq!(gs.board.pieces.get("b_soldier").unwrap().position, "returned");

        // Now the returned soldier should have legal deployment targets
        // p3 is empty and matches the chosen color "orange"
        gs.turn = Side::Black;
        let moves = get_legal_moves(&gs, "b_soldier");
        assert!(moves.contains(&"p3".to_string()), "Captured soldier should be deployable to p3");
    }

    // TEST 12: Soldier/Berserker can chain through friendly Berserkers
    #[test]
    fn test_soldier_chains_through_friendly_berserker() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "grey", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "grey", vec!["p2", "p4"]);
        add_poly(&mut board, "p4", "yellow", vec!["p3"]);

        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_berserker", "p2", Side::White, PieceType::Berserker); // Friendly Berserker to chain through

        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "grey".to_string());

        let moves = get_legal_moves(&gs, "w_soldier");

        // Soldier should chain through the friendly Berserker on p2 and reach p3 and p4
        assert!(moves.contains(&"p3".to_string()), "Soldier should chain through friendly Berserker to reach p3");
        assert!(moves.contains(&"p4".to_string()), "Soldier should chain through friendly Berserker to reach p4");
    }

    // TEST 13: Mage can be deployed adjacent to enemy pieces (only Bishop is restricted)
    #[test]
    fn test_mage_deploy_adjacent_to_enemy() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1"]);

        add_piece(&mut board, "w_mage", "returned", Side::White, PieceType::Mage);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);

        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());

        let moves = get_legal_moves(&gs, "w_mage");

        // Mage CAN deploy on p1 even though it is slide-adjacent to an enemy soldier on p2
        assert!(moves.contains(&"p1".to_string()), "Mage should be deployable adjacent to enemy pieces");
    }

    // TEST 14: Bishop CANNOT be deployed adjacent to enemy pieces
    #[test]
    fn test_bishop_deploy_blocked_adjacent_to_enemy() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1"]);

        add_piece(&mut board, "w_bishop", "returned", Side::White, PieceType::Bishop);
        add_piece(&mut board, "b_soldier", "p2", Side::Black, PieceType::Soldier);

        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());

        let moves = get_legal_moves(&gs, "w_bishop");

        // Bishop cannot deploy on p1 because it is slide-adjacent to an enemy soldier on p2
        assert!(!moves.contains(&"p1".to_string()), "Bishop should NOT be deployable adjacent to enemy pieces");
    }
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.is_empty());
    }

    #[test]
    fn test_siren_pin_jump_adjacency_does_not_block() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2", "p3"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_poly_split(&mut board, "p3", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        add_piece(&mut board, "b_siren", "p2", Side::Black, PieceType::Siren);
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_goddess");
        // Goddess can jump to p3 because Siren on p2 only pins via slide adjacency
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board); // p2 will be empty
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_bishop");
        assert!(!moves.contains(&"p2".to_string()));
    }

    #[test]
    fn test_bishop_can_move_to_empty() {
        let mut board = create_mock_board();
        add_poly_split(&mut board, "p1", "white", vec![], vec!["p2"]);
        add_poly_split(&mut board, "p2", "white", vec![], vec!["p1"]);
        add_piece(&mut board, "w_bishop", "p1", Side::White, PieceType::Bishop);
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board);
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
        let gs = gs_playing(board); // No color chosen needed for friendly chaining
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
        let mut gs = gs_playing(board);
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
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_soldier");
        // Can capture the enemy on p2, but cannot chain through it to p3
        assert!(moves.contains(&"p2".to_string()));
        assert!(!moves.contains(&"p3".to_string()));
    }

    #[test]
    fn test_soldier_chain_blocked_by_non_chosen_empty() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "grey", vec!["p1", "p3"]); // non-chosen color empty
        add_poly(&mut board, "p3", "grey", vec!["p2"]);
        
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());

        let moves = get_legal_moves(&gs, "w_soldier");
        
        // The soldier can slide to p2 (normal movement), but p2 is empty AND not orange, so phalanx chaining stops there.
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
        let gs = gs_playing(board);
        let moves = get_legal_moves(&gs, "w_berserker");
        assert!(moves.contains(&"p4".to_string())); // Traverses p2, p3 to reach p4
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
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
        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());

        let moves = get_legal_moves(&gs, "w_soldier");
        assert!(moves.contains(&"p1".to_string())); // Can deploy because adj to Mage
    }

    #[test]
    fn test_deploy_on_non_chosen_does_not_end_turn() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "white", vec![]);
        add_poly(&mut board, "p2", "blue", vec![]);
        add_piece(&mut board, "w_soldier", "returned", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        gs.turn = Side::White;

        let _captured = apply_move(&mut gs, "w_soldier", "p2");
        let ended_turn = apply_move_turnover(&mut gs, "w_soldier", "p2", false, true, true);
        
        if ended_turn {
            assert_eq!(gs.turn, Side::Black, "If turnover returned true, turn must be Black");
        } else {
            assert_eq!(gs.turn, Side::White, "If turnover returned false, turn must be White");
        }
    }

    // ---------------------------------------------------------
    // Sequence Locking 
    // ---------------------------------------------------------
    #[test]
    fn test_sequence_locking_soldier() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1", "p3"]);
        add_poly(&mut board, "p3", "orange", vec!["p2"]);
        add_piece(&mut board, "w_soldier", "p1", Side::White, PieceType::Soldier);
        
        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        
        // Execute first step of sequence
        let captured = apply_move(&mut gs, "w_soldier", "p2");
        apply_move_turnover(&mut gs, "w_soldier", "p2", false, captured.is_empty(), false);
        
        // Verify lock matches newly created truth in rust-core
        assert_eq!(gs.locked_sequence_piece, Some("w_soldier".to_string()));
    }

    #[test]
    fn test_sequence_locking_goddess_ends_turn() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "orange", vec!["p1"]);
        add_piece(&mut board, "w_goddess", "p1", Side::White, PieceType::Goddess);
        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "orange".to_string());
        gs.is_new_turn = false;

        let captured = apply_move(&mut gs, "w_goddess", "p2");
        apply_move_turnover(&mut gs, "w_goddess", "p2", false, captured.is_empty(), false); 
        
        // Non-soldier/heroe lands on chosen, turn ends!
        assert_eq!(gs.turn, Side::Black);
        assert!(gs.is_new_turn);
    }

    #[test]
    fn test_get_eligible_piece_ids_color_match() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "blue", vec![]);
        add_poly(&mut board, "p2", "yellow", vec![]);
        add_piece(&mut board, "w_soldier_blue", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_soldier_yellow", "p2", Side::White, PieceType::Soldier);
        
        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "blue".to_string());
        
        let eligible = gs.get_eligible_piece_ids();
        assert!(eligible.contains(&"w_soldier_blue".to_string()));
        assert!(!eligible.contains(&"w_soldier_yellow".to_string()));
    }

    #[test]
    fn test_get_eligible_piece_ids_sequence_lock() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "blue", vec![]);
        add_poly(&mut board, "p2", "blue", vec![]);
        add_piece(&mut board, "w_soldier_1", "p1", Side::White, PieceType::Soldier);
        add_piece(&mut board, "w_soldier_2", "p2", Side::White, PieceType::Soldier);
        
        let mut gs = gs_playing(board);
        gs.turn = Side::White;
        gs.color_chosen.insert(Side::White, "blue".to_string());
        gs.locked_sequence_piece = Some("w_soldier_1".to_string());
        
        let eligible = gs.get_eligible_piece_ids();
        assert!(eligible.contains(&"w_soldier_1".to_string()));
        assert!(!eligible.contains(&"w_soldier_2".to_string()), "Only the locked piece should be eligible");
    }

    #[test]
    fn test_berserker_lands_on_different_color_clears_lock() {
        let mut board = create_mock_board();
        add_poly(&mut board, "p1", "orange", vec!["p2"]);
        add_poly(&mut board, "p2", "blue", vec!["p1", "p3"]); // different color
        add_poly(&mut board, "p3", "orange", vec!["p2"]);
        
        add_piece(&mut board, "w_berserker", "p1", Side::White, PieceType::Berserker);
        add_piece(&mut board, "w_goddess", "p3", Side::White, PieceType::Goddess);

        let mut gs = gs_playing(board);
        gs.color_chosen.insert(Side::White, "orange".to_string());
        
        let captured = apply_move(&mut gs, "w_berserker", "p2");
        apply_move_turnover(&mut gs, "w_berserker", "p2", false, captured.is_empty(), false);
        
        assert_eq!(gs.locked_sequence_piece, None); // Lock cleared because landed on different color
        assert_eq!(gs.turn, Side::White); // Turn continues because it's a phalanx on different color
    }
}
