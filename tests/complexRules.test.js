import { setSirensNeighbors } from '../games/gameLogic.js';
import { getMoveKing } from '../games/rules.js';
import { boardstate, board, setBoard } from '../games/state.js';

beforeEach(() => {
  let mockBoard = {};
  setBoard(mockBoard);

  boardstate.kingHasTakenCounter = 0;
  boardstate.kingHasTakenCounterMax = 2;

  board.allPolygons = {
    'poly_1': { neighbors: ['poly_2', 'poly_3'], color: 'white', isIn: 'empty', neighbours: ['poly_2', 'poly_3'] },
    'poly_2': { neighbors: ['poly_1'], color: 'yellow', isIn: 'empty', neighbours: ['poly_1'] },
    'poly_3': { neighbors: ['poly_1'], color: 'black', isIn: 'white_siren_0', neighbours: ['poly_1'] }
  };
  
  board.allPieces = {
    'white_king_0': { position: 'poly_1', side: 'white', type: 'king', canMove: 1 },
    'yellow_soldier_0': { position: 'poly_2', side: 'yellow', type: 'soldier', canMove: 1 },
    'white_siren_0': { position: 'poly_3', side: 'white', type: 'siren', canMove: 1 }
  };
});

describe('Game Logic: Sirens and Kings', () => {

  test('setSirensNeighbors should restrict enemy neighbors', () => {
    // A white siren is on poly_3. poly_3 neighbors poly_1.
    // If a yellow soldier is on poly_1, it should lose movement.
    // Let's move the yellow soldier to poly_1, which borders poly_3
    board.allPolygons['poly_1'].isIn = 'yellow_soldier_0';
    board.allPieces['yellow_soldier_0'].position = 'poly_1';
    
    setSirensNeighbors();
    
    expect(board.allPieces['yellow_soldier_0'].canMove).toBe(0);
  });

  test('getMoveKing should return no moves if king limit reached', () => {
    // King is on poly_1. Normally it can move to poly_2 and poly_3.
    expect(getMoveKing(board, boardstate, 'white_king_0').length).toBeGreaterThan(0);

    // If king has reached its max take counter:
    boardstate.kingHasTakenCounter = 2;
    expect(getMoveKing(board, boardstate, 'white_king_0').length).toBe(0);
  });

});
