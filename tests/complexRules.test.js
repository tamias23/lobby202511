import { setSirenNeighbors } from '../games/gameLogic.js';
import { getMoveHeroe } from '../games/rules.js';
import { boardstate, board, setBoard } from '../games/state.js';

beforeEach(() => {
  let mockBoard = {};
  setBoard(mockBoard);

  boardstate.heroeHasTakenCounter = 0;
  boardstate.heroeHasTakenCounterMax = 2;

  board.allPolygons = {
    'poly_1': { neighbors: ['poly_2', 'poly_3'], color: 'white', isIn: 'empty', neighbours: ['poly_2', 'poly_3'] },
    'poly_2': { neighbors: ['poly_1'], color: 'yellow', isIn: 'empty', neighbours: ['poly_1'] },
    'poly_3': { neighbors: ['poly_1'], color: 'black', isIn: 'white_siren_0', neighbours: ['poly_1'] }
  };
  
  board.allPieces = {
    'white_heroe_0': { position: 'poly_1', side: 'white', type: 'heroe', canMove: 1 },
    'black_soldier_0': { position: 'poly_2', side : 'black', type: 'soldier', canMove: 1 },
    'white_siren_0': { position: 'poly_3', side: 'white', type: 'siren', canMove: 1 }
  };
});

describe('Game Logic: Siren and Heroe', () => {

  test('setSirenNeighbors should restrict enemy neighbors', () => {
    // A white siren is on poly_3. poly_3 neighbors poly_1.
    // If a yellow soldier is on poly_1, it should lose movement.
    // Let's move the yellow soldier to poly_1, which borders poly_3
    board.allPolygons['poly_1'].isIn = 'black_soldier_0';
    board.allPieces['black_soldier_0'].position = 'poly_1';
    
    setSirenNeighbors();
    
    expect(board.allPieces['black_soldier_0'].canMove).toBe(0);
  });

  test('getMoveHeroe should return no moves if heroe limit reached', () => {
    // Heroe is on poly_1. Normally it can move to poly_2 and poly_3.
    expect(getMoveHeroe(board, boardstate, 'white_heroe_0').length).toBeGreaterThan(0);

    // If heroe has reached its max take counter:
    boardstate.heroeHasTakenCounter = 2;
    expect(getMoveHeroe(board, boardstate, 'white_heroe_0').length).toBe(0);
  });

});
