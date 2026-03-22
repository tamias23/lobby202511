import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveKing } from '../games/rules.js';

describe('Rules: The King', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    // Creates a line of 6 polygons: poly_1 - poly_2 - poly_3 - poly_4 - poly_5 - poly_6
    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'white', isIn: 'white_king_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'yellow', isIn: 'empty', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'yellow', isIn: 'empty', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'yellow', isIn: 'empty', center: [30, 0] },
      'poly_5': { neighbors: ['poly_4', 'poly_6'], neighbours: ['poly_4', 'poly_6'], color: 'yellow', isIn: 'empty', center: [40, 0] },
      'poly_6': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'black', isIn: 'empty', center: [50, 0] }
    };

    board.allPieces = {
      'white_king_0': { position: 'poly_1', color: 'white', type: 'king', canMove: 1 }
    };

    boardstate.kingHasTakenCounter = 0;
    boardstate.kingHasTakenCounterMax = 2;
  });

  test('King can leap 1 polygon away (Test 1)', () => {
    let moves = getMoveKing(board, boardstate, 'white_king_0');
    expect(moves).toContain('poly_2');
  });

  test('King can leap 2 polygons away (Test 2)', () => {
    let moves = getMoveKing(board, boardstate, 'white_king_0');
    expect(moves).toContain('poly_3');
  });

  test('King can leap 3 polygons away (Test 3)', () => {
    let moves = getMoveKing(board, boardstate, 'white_king_0');
    expect(moves).toContain('poly_4');
  });

  test('King cannot leap 4 polygons away (Test 4)', () => {
    let moves = getMoveKing(board, boardstate, 'white_king_0');
    expect(moves).not.toContain('poly_5');
  });

  test('King cannot move if kingHasTakenCounter >= max (Test 5)', () => {
    boardstate.kingHasTakenCounter = 2;
    let moves = getMoveKing(board, boardstate, 'white_king_0');
    expect(moves.length).toBe(0);
  });
});
