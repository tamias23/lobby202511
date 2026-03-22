import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveHeroe } from '../games/rules.js';

describe('Rules: The Heroe', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    // Creates a line of 6 polygons: poly_1 - poly_2 - poly_3 - poly_4 - poly_5 - poly_6
    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'white', isIn: 'white_heroe_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'yellow', isIn: 'empty', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'yellow', isIn: 'empty', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'yellow', isIn: 'empty', center: [30, 0] },
      'poly_5': { neighbors: ['poly_4', 'poly_6'], neighbours: ['poly_4', 'poly_6'], color: 'yellow', isIn: 'empty', center: [40, 0] },
      'poly_6': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'black', isIn: 'empty', center: [50, 0] }
    };

    board.allPieces = {
      'white_heroe_0': { position: 'poly_1', side: 'white', type: 'heroe', canMove: 1 }
    };

    boardstate.heroeHasTakenCounter = 0;
    boardstate.heroeHasTakenCounterMax = 2;
  });

  test('Heroe can leap 1 polygon away (Test 1)', () => {
    let moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    expect(moves).toContain('poly_2');
  });

  test('Heroe can leap 2 polygons away (Test 2)', () => {
    let moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    expect(moves).toContain('poly_3');
  });

  test('Heroe can leap 3 polygons away (Test 3)', () => {
    let moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    expect(moves).toContain('poly_4');
  });

  test('Heroe cannot leap 4 polygons away (Test 4)', () => {
    let moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    expect(moves).not.toContain('poly_5');
  });

  test('Heroe cannot move if heroeHasTakenCounter >= max (Test 5)', () => {
    boardstate.heroeHasTakenCounter = 2;
    let moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    expect(moves.length).toBe(0);
  });
});
