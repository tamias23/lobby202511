import { getMoveSoldier } from '../games/rules.js';
import { boardstate, board, setBoard } from '../games/state.js';

beforeEach(() => {
  // Mock board and boardstate data for soldier testing
  boardstate.colorChosen = 'white';
  boardstate.highlighted = [];
  boardstate.circles = [];
  
  // Set up a tiny 3-polygon mocked board
  let mockBoard = {};
  setBoard(mockBoard);

  board.allPolygons = {
    'poly_1': { neighbors: ['poly_2', 'poly_3'], color: 'white', isIn: 'empty' },
    'poly_2': { neighbors: ['poly_1'], color: 'yellow', isIn: 'empty' },
    'poly_3': { neighbors: ['poly_1'], color: 'black', isIn: 'empty' }
  };
  
  board.allPieces = {
    'white_soldier_0': { position: 'poly_1', side: 'white', type: 'soldier' },
    'yellow_soldier_0': { position: 'poly_2', side: 'yellow', type: 'soldier' },
    'white_siren_0': { position: 'returned', side: 'white', type: 'siren'}
  };
});

describe('Game Logic: getMoveSoldier', () => {
  test('should return adjacent neighbor if valid', () => {
    // The soldier is on poly_1. Its neighbors are poly_2 and poly_3. 
    // poly_2 is occupied by an enemy, and poly_3 is empty but has a different color than chosen? 
    // Actually out original rules says it checks neighbor empty vs occupied.
    
    // poly_2 has yellow_soldier_0 (enemy). Soldiers cannot move onto enemies.
    // poly_3 is empty and its color is 'black', and our chosen color is 'white'. 
    // The soldier can move to adjacent empty polys if the player hasn't restricted color, or if it's the right color.
    
    // In our mocked getMoveSoldier, an initial adjacent poly is added if it is empty AND matches chosen color, OR if it's adjacent.
    
    // Let's modify the board so poly_2 is empty and matching color
    board.allPolygons['poly_2'].isIn = 'empty';
    board.allPolygons['poly_2'].color = 'white';
    
    const moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    
    expect(moves).toContain('poly_2');
    expect(moves).not.toContain('poly_1'); // Cannot move to current spot
  });
});
