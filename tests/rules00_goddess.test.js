import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveGoddess } from '../games/rules.js';

describe('Rules: The Goddess', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    // Creates a line of 5 polygons: poly_1 - poly_2 - poly_3 - poly_4 - poly_5
    // And one separated poly_6
    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'white', isIn: 'white_goddess_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'yellow', isIn: 'empty', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'yellow', isIn: 'empty', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'yellow', isIn: 'empty', center: [30, 0] },
      'poly_5': { neighbors: ['poly_4'], neighbours: ['poly_4'], color: 'yellow', isIn: 'empty', center: [40, 0] },
      'poly_6': { neighbors: [], neighbours: [], color: 'black', isIn: 'empty', center: [50, 0] }
    };

    board.allPieces = {
      'white_goddess_0': { position: 'poly_1', side: 'white', type: 'goddess', canMove: 1 }
    };
  });

  test('Goddess can leap 1 polygon away (Test 1)', () => {
    let moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).toContain('poly_2');
  });

  test('Goddess can leap 2 polygons away (Test 2)', () => {
    let moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).toContain('poly_3');
  });

  test('Goddess cannot leap 3 polygons away (Test 3)', () => {
    let moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).not.toContain('poly_4');
  });

  test('Goddess cannot leap 4 polygons away (Test 4)', () => {
    let moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).not.toContain('poly_5');
  });

  test('Goddess cannot leap to unconnected polygons (Test 5)', () => {
    let moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).not.toContain('poly_6');
  });
});
