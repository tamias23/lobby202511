import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveSiren, getMoveGhoul } from '../games/rules.js';
import { setSirensNeighbors } from '../games/gameLogic.js';

describe('Rules: Siren and Ghoul', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    boardstate.colorChosen = 'yellow';

    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2', 'poly_10'], neighbours: ['poly_2', 'poly_10'], color: 'white', isIn: 'white_siren_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'black', isIn: 'yellow_soldier_0', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'orange', isIn: 'empty', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'white', isIn: 'empty', center: [30, 0] },
      
      'poly_10': { neighbors: ['poly_1', 'poly_11'], neighbours: ['poly_1', 'poly_11'], color: 'white', isIn: 'yellow_ghoul_0', center: [0, 10] },
      'poly_11': { neighbors: ['poly_10', 'poly_12'], neighbours: ['poly_10', 'poly_12'], color: 'black', isIn: 'empty', center: [10, 10] },
      'poly_12': { neighbors: ['poly_11', 'poly_13'], neighbours: ['poly_11', 'poly_13'], color: 'black', isIn: 'empty', center: [20, 10] }, 
      'poly_13': { neighbors: ['poly_12', 'poly_14'], neighbours: ['poly_12', 'poly_14'], color: 'white', isIn: 'empty', center: [30, 10] },
      'poly_14': { neighbors: ['poly_13'], neighbours: ['poly_13'], color: 'white', isIn: 'empty', center: [40, 10] }
    };

    board.allPieces = {
      'white_siren_0': { position: 'poly_1', side: 'white', type: 'siren', canMove: 1 },
      'yellow_soldier_0': { position: 'poly_2', side: 'yellow', type: 'soldier', canMove: 1 },
      'yellow_ghoul_0': { position: 'poly_10', side: 'yellow', type: 'ghoul', canMove: 1 },
    };
  });

  // Siren
  test('Siren can leap up to 2 polygons away (Test 1)', () => {
    let moves = getMoveSiren(board, boardstate, 'white_siren_0');
    expect(moves).toContain('poly_2'); // 1 away
    expect(moves).toContain('poly_3'); // 2 away
  });

  test('Siren cannot leap 3 polygons away (Test 2)', () => {
    let moves = getMoveSiren(board, boardstate, 'white_siren_0');
    expect(moves).not.toContain('poly_4'); // 3 away
  });

  test('Siren passive aura pins adjacent enemy pieces (Test 3)', () => {
    setSirensNeighbors();
    expect(board.allPieces['yellow_soldier_0'].canMove).toBe(0);
    expect(board.allPieces['yellow_ghoul_0'].canMove).toBe(0);
  });

  // Ghoul
  test('Ghoul movement is blocked by adjacent Siren (Test 4)', () => {
    // Ghoul tries to chain through poly_11, but poly_11 neighbors poly_10 which neighbors white_siren_0 at poly_1.
    // Wait, let's move the siren so we can specifically test the constraint.
    board.allPolygons['poly_1'].isIn = 'empty';
    board.allPolygons['poly_2'].isIn = 'white_siren_0'; // Siren now at poly_2
    board.allPieces['white_siren_0'].position = 'poly_2';

    // Ghoul at poly_10 tries to jump to poly_11. poly_11 touches poly_2. Ghoul jump should fail here.
    board.allPolygons['poly_11'].neighbors = ['poly_10', 'poly_12', 'poly_2'];
    board.allPolygons['poly_2'].neighbors.push('poly_11');

    let moves = getMoveGhoul(board, boardstate, 'yellow_ghoul_0');
    // It can move to poly_11 but it cannot chain through it because poly_11 hugs a siren.
    expect(moves).toContain('poly_11');
    expect(moves).not.toContain('poly_12');
  });

  test('Ghoul chain jump is blocked by the chosen color (Test 5)', () => {
    board.allPolygons['poly_1'].isIn = 'empty'; // Clear siren
    // poly_12 becomes yellow (the chosen color) temporarily to test the block.
    board.allPolygons['poly_12'].color = 'yellow';
    
    let moves = getMoveGhoul(board, boardstate, 'yellow_ghoul_0');
    expect(moves).toContain('poly_11');
    expect(moves).toContain('poly_12'); // Can land on it (1 jump + 1 jump)
    expect(moves).not.toContain('poly_13'); // Cannot chain through it
    
    // restore poly_12
    board.allPolygons['poly_12'].color = 'black';
  });

  test('Ghoul can chain jump up to 3 polygons away if not blocked (Test 6)', () => {
    board.allPolygons['poly_1'].isIn = 'empty'; // Clear siren
    boardstate.colorChosen = 'orange'; // Change chosen color so black poly_11/12 are free
    
    let moves = getMoveGhoul(board, boardstate, 'yellow_ghoul_0');
    expect(moves).toContain('poly_11'); // 1 jump
    expect(moves).toContain('poly_12'); // 2 jumps
    expect(moves).toContain('poly_13'); // 3 jumps
    expect(moves).not.toContain('poly_14'); // 4 jumps forbidden
  });
});
