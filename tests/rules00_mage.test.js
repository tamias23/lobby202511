import { boardstate, board, setBoard } from '../games/state.js';
import { getMoveMage } from '../games/rules.js';
import { removeConnex } from '../games/boardUtils.js';

jest.mock('../games/boardUtils.js', () => ({
  removePieceFromGame: jest.fn(),
  mySetTranslate: jest.fn(),
  iterTransforms: jest.fn(() => []),
  getFloatValue: jest.fn(() => 0),
  getDistanceBetweenKeyframes: jest.fn(() => 0),
  removeConnex: jest.fn((idPoly) => {
    const { board } = require('../games/state.js');
    let target = board.allPolygons[idPoly].isIn;
    if (target === 'empty') return;
    let targetSide = board.allPieces[target].side;
    require('../games/boardUtils.js').removePieceFromGame(target);
    for (let currentPoly of board.allPolygons[idPoly].neighbors) {
      let currentPiece = board.allPolygons[currentPoly].isIn;
      if (currentPiece !== 'empty' && board.allPieces[currentPiece].side === targetSide && board.allPieces[currentPiece].type !== 'trifoxes') {
        require('../games/boardUtils.js').removePieceFromGame(currentPiece);
      }
    }
  })
}));

describe('Rules: The Mage', () => {
  beforeEach(() => {
    let mockBoard = {};
    setBoard(mockBoard);

    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2'], neighbours: ['poly_2'], color: 'white', isIn: 'white_mage_0', center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_3'], neighbours: ['poly_1', 'poly_3'], color: 'yellow', isIn: 'empty', center: [10, 0] },
      'poly_3': { neighbors: ['poly_2', 'poly_4'], neighbours: ['poly_2', 'poly_4'], color: 'black', isIn: 'empty', center: [20, 0] },
      'poly_4': { neighbors: ['poly_3', 'poly_5'], neighbours: ['poly_3', 'poly_5'], color: 'white', isIn: 'empty', center: [30, 0] },
      'poly_5': { neighbors: ['poly_4', 'poly_6', 'poly_7', 'poly_8', 'poly_9'], neighbours: ['poly_4', 'poly_6', 'poly_7', 'poly_8', 'poly_9'], color: 'yellow', isIn: 'black_soldier_0', center: [40, 0] },
      'poly_6': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'white', isIn: 'black_soldier_1', center: [50, 0] },
      'poly_7': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'yellow', isIn: 'empty', center: [60, 0] },
      'poly_8': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'black', isIn: 'white_soldier_0', center: [40, 10] },
      'poly_9': { neighbors: ['poly_5'], neighbours: ['poly_5'], color: 'orange', isIn: 'black_trifoxes_0', center: [40, 20] },
    };

    board.allPieces = {
      'white_mage_0': { position: 'poly_1', side: 'white', type: 'mage', canMove: 1 },
      'black_soldier_0': { position: 'poly_5', side : 'black', type: 'soldier', canMove: 1 },
      'black_soldier_1': { position: 'poly_6', side : 'black', type: 'soldier', canMove: 1 },
      'black_trifoxes_0': { position: 'poly_9', side : 'black', type: 'trifoxes', canMove: 1 },
      'white_soldier_0': { position: 'poly_8', side: 'white', type: 'soldier', canMove: 1 },
    };
  });

  test('Mage can leap up to 3 polygons away (Test 1)', () => {
    let moves = getMoveMage(board, boardstate, 'white_mage_0');
    expect(moves).toContain('poly_3'); // 2 away, black
  });

  test('Mage cannot land on a polygon of its starting color (Test 2)', () => {
    let moves = getMoveMage(board, boardstate, 'white_mage_0');
    expect(moves).not.toContain('poly_4'); // 3 away, white (started on white)
  });

  test('Mage cannot leap 4 polygons away (Test 3)', () => {
    let moves = getMoveMage(board, boardstate, 'white_mage_0');
    expect(moves).not.toContain('poly_5'); // 4 away
  });

  test('Mage Chain Attack destroys adjacent pieces of the same team as target (Test 4)', () => {
    const { removePieceFromGame, removeConnex } = require('../games/boardUtils.js');
    removeConnex('poly_5'); // Target is yellow on poly_5
    expect(removePieceFromGame).toHaveBeenCalledWith('black_soldier_0'); // Target itself
    expect(removePieceFromGame).toHaveBeenCalledWith('black_soldier_1'); // Adjacent yellow piece
    expect(removePieceFromGame).not.toHaveBeenCalledWith('white_soldier_0'); // Adjacent white piece is safe
  });

  test('Mage Chain Attack does NOT destroy Trifoxes (Test 5)', () => {
    const { removePieceFromGame, removeConnex } = require('../games/boardUtils.js');
    removePieceFromGame.mockClear();
    removeConnex('poly_5'); // Target is yellow poly_5 
    expect(removePieceFromGame).not.toHaveBeenCalledWith('black_trifoxes_0'); // Adjacent yellow trifox is safe
  });
});
