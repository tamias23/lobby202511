import { boardstate, board, setBoard } from '../games/state.js';
import { getListOfPossibleTargetsForSetup, getListOfPossibleTargets } from '../games/rules.js';

describe('Rules: General and Supplementary Mechanics', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    boardstate.colorChosen = 'yellow';
    boardstate.possibleSetupGoddessKings = {
      'white': ['poly_1 poly_2 poly_3'],
      'yellow': ['poly_4 poly_5 poly_6']
    };

    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'white', isIn: 'empty', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'yellow', isIn: 'empty', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'black', isIn: 'empty', center: [20, 0] },
      'poly_7': { neighbors: [], neighbours: [], color: 'yellow', isIn: 'empty', center: [30, 0] }, // Chosen color empty
      'poly_8': { neighbors: ['poly_9'], neighbours: ['poly_9'], color: 'black', isIn: 'white_mage_0', center: [40, 0] },
      'poly_9': { neighbors: ['poly_8'], neighbours: ['poly_8'], color: 'orange', isIn: 'yellow_soldier_0', center: [50, 0] }, // enemy
    };

    board.allPieces = {
      'white_goddess_0': { position: 'returned', side: 'white', type: 'goddess', canMove: 1 },
      'white_king_0': { position: 'returned', side: 'white', type: 'king', canMove: 1 },
      
      'white_soldier_0': { position: 'returned', side: 'white', type: 'soldier', canMove: 1 },
      'white_mage_0': { position: 'poly_8', side: 'white', type: 'mage', canMove: 1 },
      
      'white_bishop_0': { position: 'returned', side: 'white', type: 'bishop', canMove: 1 },
      'yellow_soldier_0': { position: 'poly_9', side: 'yellow', type: 'soldier', canMove: 1 }
    };
  });

  // Test quantities implicitly through the setup process 
  test('Pieces must be placed on the board during setup (Test 1)', () => {
    let moves = getListOfPossibleTargetsForSetup(board, boardstate, 'white_goddess_0');
    expect(moves).toContain('poly_1'); // based on possibleSetupGoddessKings mockup
  });

  test('Re-entering pieces can be placed on chosen color (Test 2)', () => {
    // poly_7 is chosen color (yellow) and empty
    boardstate.colorChosen = 'yellow';
    let moves = getListOfPossibleTargets(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_7');
  });

  test('Re-entering pieces can be placed next to a friendly Mage (Test 3)', () => {
    boardstate.colorChosen = 'black'; // not matching poly_9
    // poly_8 has white_mage_0. poly_9 is adjacent and has an enemy. poly_8 has no other empty neighbors.
    board.allPolygons['poly_10'] = { neighbors: ['poly_8'], neighbours: ['poly_8'], color: 'white', isIn: 'empty', center: [60,0] };
    board.allPolygons['poly_8'].neighbors.push('poly_10');
    
    // poly_10 is an empty neighbor of friendly mage poly_8
    let moves = getListOfPossibleTargets(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_10');
  });

  test('Bishop CANNOT re-enter on chosen color next to an enemy piece (Test 4)', () => {
    boardstate.colorChosen = 'orange'; 
    // poly_9 is orange (chosen) but occupied by enemy. Let's make a new one.
    board.allPolygons['poly_11'] = { neighbors: ['poly_9'], neighbours: ['poly_9'], color: 'orange', isIn: 'empty', center: [70,0] };
    board.allPolygons['poly_9'].neighbors.push('poly_11');
    
    let soldierMoves = getListOfPossibleTargets(board, boardstate, 'white_soldier_0');
    expect(soldierMoves).toContain('poly_11'); // Soldier can enter here

    let bishopMoves = getListOfPossibleTargets(board, boardstate, 'white_bishop_0');
    expect(bishopMoves).not.toContain('poly_11'); // Bishop blocked because neighbor poly_9 has an enemy
  });

  test('Bishop CANNOT re-enter next to friendly Mage if also next to enemy piece (Test 5)', () => {
    // Mage at poly_8. Poly_9 is an enemy. 
    // Let's create an empty poly that touches both Mage(poly_8) and Enemy(poly_9).
    board.allPolygons['poly_12'] = { neighbors: ['poly_8', 'poly_9'], neighbours: ['poly_8', 'poly_9'], color: 'white', isIn: 'empty', center: [80,0] };
    board.allPolygons['poly_8'].neighbors.push('poly_12');
    board.allPolygons['poly_9'].neighbors.push('poly_12');

    let soldierMoves = getListOfPossibleTargets(board, boardstate, 'white_soldier_0');
    expect(soldierMoves).toContain('poly_12'); // Soldier can use the Mage proximity

    let bishopMoves = getListOfPossibleTargets(board, boardstate, 'white_bishop_0');
    expect(bishopMoves).not.toContain('poly_12'); // Bishop blocked by enemy proximity
  });
});
