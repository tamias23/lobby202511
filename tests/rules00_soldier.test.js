import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveSoldier, getMoveTrifoxes } from '../games/rules.js';

describe('Rules: Soldier and Trifoxes', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    boardstate.colorChosen = 'orange';

    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2', 'poly_10'], neighbours: ['poly_2', 'poly_10'], color: 'white', isIn: 'white_soldier_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'white', isIn: 'white_soldier_1', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'white', isIn: 'white_goddess_0', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'white', isIn: 'empty', center: [30, 0] }, // chain path
      
      'poly_10': { neighbors: ['poly_1', 'poly_11'], neighbours: ['poly_1', 'poly_11'], color: 'orange', isIn: 'empty', center: [0, 10] }, 
      'poly_11': { neighbors: ['poly_10', 'poly_12'], neighbours: ['poly_10', 'poly_12'], color: 'orange', isIn: 'empty', center: [10, 10] }, 
      'poly_12': { neighbors: ['poly_11', 'poly_13'], neighbours: ['poly_11', 'poly_13'], color: 'orange', isIn: 'empty', center: [20, 10] }, // chain path
      
      'poly_13': { neighbors: ['poly_12', 'poly_14'], neighbours: ['poly_12', 'poly_14'], color: 'orange', isIn: 'yellow_trifoxes_0', center: [30, 10] }, // Enemy block
      'poly_14': { neighbors: ['poly_13'], neighbours: ['poly_13'], color: 'orange', isIn: 'empty', center: [40, 10] }
    };

    board.allPieces = {
      'white_soldier_0': { position: 'poly_1', side: 'white', type: 'soldier', canMove: 1 },
      'white_soldier_1': { position: 'poly_2', side: 'white', type: 'soldier', canMove: 1 },
      'white_goddess_0': { position: 'poly_3', side: 'white', type: 'goddess', canMove: 1 },
      
      'yellow_trifoxes_0': { position: 'poly_13', side: 'yellow', type: 'trifoxes', canMove: 1 },
    };
  });

  test('Soldier can move 1 polygon away (Test 1)', () => {
    // Basic move from poly_1 to poly_10
    board.allPolygons['poly_10'].color = 'black'; // Disable chosen color logic for this
    let moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_10');
  });

  test('Soldier can chain movement through friendly pieces (Test 2)', () => {
    // poly_1 touches poly_2(friend) touches poly_3(friend) touches poly_4(empty)
    let moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_4');
  });

  test('Soldier can chain movement through empty chosen-color polygons (Test 3)', () => {
    // poly_1 touches poly_10(orange) touches poly_11(orange) touches poly_12(orange)
    let moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_12');
  });

  test('Soldier chain movement is blocked by enemy Trifoxes (Test 4)', () => {
    // Start at poly_12(black empty) touching poly_13(yellow trifox). 
    // Move soldier_0 to poly_12 to test direct blocking
    board.allPolygons['poly_1'].isIn = 'empty';
    board.allPolygons['poly_12'].isIn = 'white_soldier_0';
    board.allPieces['white_soldier_0'].position = 'poly_12';

    let moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    expect(moves).not.toContain('poly_13'); // Blocked by Trifox
    expect(moves).not.toContain('poly_14'); // Blocked by Trifox
  });

  test('Trifoxes behave like soldiers for chaining movement (Test 5)', () => {
    // yellow_trifoxes_0 at poly_13. It should be able to move to poly_14 (1 away)
    // and chain through poly_12/11/10 (orange chosen color) to get to poly_1 (empty)
    board.allPolygons['poly_1'].isIn = 'empty';

    let moves = getMoveTrifoxes(board, boardstate, 'yellow_trifoxes_0');
    expect(moves).toContain('poly_14'); // 1 away
    expect(moves).toContain('poly_12'); // Chain 1
    expect(moves).toContain('poly_11'); // Chain 2
    expect(moves).toContain('poly_10'); // Chain 3
    expect(moves).toContain('poly_1');  // Chain 4
  });
});
