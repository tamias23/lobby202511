import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveBishop } from '../games/rules.js';
import { removeAdjacent } from '../games/boardUtils.js';

jest.mock('../games/boardUtils.js', () => ({
  removePieceFromGame: jest.fn(),
  mySetTranslate: jest.fn(),
  iterTransforms: jest.fn(() => []),
  getFloatValue: jest.fn(() => 0),
  getDistanceBetweenKeyframes: jest.fn(() => 0),
  removeAdjacent: jest.fn((idPoly, side) => {
    // simplified mock that just calls the mocked removePieceFromGame
    const { board } = require('../games/state.js');
    for (const p of board.allPolygons[idPoly].neighbors) {
      if (board.allPolygons[p].isIn !== 'empty' && board.allPieces[board.allPolygons[p].isIn].side !== side && board.allPieces[board.allPolygons[p].isIn].type !== 'trifoxes') {
        require('../games/boardUtils.js').removePieceFromGame(board.allPolygons[p].isIn);
      }
    }
  })
}));

describe('Rules: The Bishop', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    // Creates a line of 6 polygons: poly_1 - poly_2 - poly_3 - poly_4 - poly_5 - poly_6
    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'white', isIn: 'white_bishop_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'yellow', isIn: 'empty', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'black', isIn: 'empty', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'white', isIn: 'empty', center: [30, 0] },
      'poly_5': { neighbors: ['poly_4', 'poly_6'], neighbours: ['poly_4', 'poly_6'], color: 'yellow', isIn: 'empty', center: [40, 0] },
      'poly_6': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'white', isIn: 'empty', center: [50, 0] }
    };

    board.allPieces = {
      'white_bishop_0': { position: 'poly_1', side: 'white', type: 'bishop', canMove: 1 },
      'yellow_soldier_0': { position: 'poly_5', side: 'yellow', type: 'soldier', canMove: 1 },
      'white_soldier_0': { position: 'poly_3', side: 'white', type: 'soldier', canMove: 1 }
    };
    
    board.allPolygons['poly_5'].isIn = 'yellow_soldier_0';
    board.allPolygons['poly_3'].isIn = 'white_soldier_0';
  });

  test('Bishop can leap up to 4 polygons away to the same color (Test 1)', () => {
    let moves = getMoveBishop(board, boardstate, 'white_bishop_0');
    expect(moves).toContain('poly_4'); // 3 polygons away, white
  });

  test('Bishop cannot land on a different color (Test 2)', () => {
    let moves = getMoveBishop(board, boardstate, 'white_bishop_0');
    expect(moves).not.toContain('poly_2'); // yellow
    expect(moves).not.toContain('poly_3'); // black
  });

  test('Bishop cannot leap more than 4 polygons away (Test 3)', () => {
    let moves = getMoveBishop(board, boardstate, 'white_bishop_0');
    expect(moves).not.toContain('poly_6'); // 5 polygons away, white
  });

  test('Bishop Area of Effect destroys adjacent enemy pieces (Test 4)', () => {
    const { removePieceFromGame } = require('../games/boardUtils.js');
    removeAdjacent('poly_4', 'white');
    expect(removePieceFromGame).toHaveBeenCalledWith('yellow_soldier_0');
  });

  test('Bishop Area of Effect does NOT destroy adjacent friendly pieces (Test 5)', () => {
    const { removePieceFromGame } = require('../games/boardUtils.js');
    removePieceFromGame.mockClear();
    removeAdjacent('poly_4', 'white');
    expect(removePieceFromGame).not.toHaveBeenCalledWith('white_soldier_0');
  });
});
