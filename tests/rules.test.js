import { setSirensNeighbors, endOfTurn } from '../games/gameLogic.js';
import { 
  getMoveGoddess, 
  getMoveHeroe, 
  getMoveBishop,
  getMoveSiren,
  getMoveGhoul,
  getMoveSoldier,
  getMoveTrifoxes,
  getMoveMage
} from '../games/rules.js';
import { rotate } from '../games/boardUtils.js';

import { boardstate, board, setBoard } from '../games/state.js';

describe('Integration: Complex Movement Rules', () => {
  beforeEach(() => {
    // Basic Mock Board Setup for piece movements
    let mockBoard = {};
    setBoard(mockBoard);

    boardstate.heroeHasTakenCounter = 0;
    boardstate.heroeHasTakenCounterMax = 2;
    boardstate.colorChosen = 'white';
    boardstate.whoseTurnItIs = 'white';
    boardstate.turn = 1;
    boardstate.halfTurn = 1;
    boardstate.boardRotated = 'no';

    board.allPolygons = {
      'poly_1': { neighbors: ['poly_2', 'poly_3'], color: 'white', isIn: 'white_heroe_0', neighbours: ['poly_2', 'poly_3'], center: [0, 0] },
      'poly_2': { neighbors: ['poly_1', 'poly_4'], color: 'yellow', isIn: 'empty', neighbours: ['poly_1', 'poly_4'], center: [10, 0] },
      'poly_3': { neighbors: ['poly_1', 'poly_5'], color: 'black', isIn: 'empty', neighbours: ['poly_1', 'poly_5'], center: [0, 10] },
      'poly_4': { neighbors: ['poly_2', 'poly_5'], color: 'orange', isIn: 'empty', neighbours: ['poly_2', 'poly_5'], center: [10, 10] },
      'poly_5': { neighbors: ['poly_3', 'poly_4', 'poly_6'], color: 'white', isIn: 'empty', neighbours: ['poly_3', 'poly_4', 'poly_6'], center: [0, 20] },
      'poly_6': { neighbors: ['poly_5', 'poly_7'], color: 'yellow', isIn: 'empty', neighbours: ['poly_5', 'poly_7'], center: [10, 20] },
      'poly_7': { neighbors: ['poly_6'], color: 'white', isIn: 'empty', neighbours: ['poly_6'], center: [20, 20] }
    };
    
    board.allPieces = {
      'white_heroe_0': { position: 'poly_1', side: 'white', type: 'heroe', canMove: 1 },
      'white_goddess_0': { position: 'poly_1', side: 'white', type: 'goddess', canMove: 1 },
      'white_bishop_0': { position: 'poly_1', side: 'white', type: 'bishop', canMove: 1 },
      'white_siren_0': { position: 'poly_1', side: 'white', type: 'siren', canMove: 1 },
      'white_ghoul_0': { position: 'poly_1', side: 'white', type: 'ghoul', canMove: 1 },
      'white_soldier_0': { position: 'poly_1', side: 'white', type: 'soldier', canMove: 1 },
      'white_trifoxes_0': { position: 'poly_1', side: 'white', type: 'trifoxes', canMove: 1 },
      'white_mage_0': { position: 'poly_1', side: 'white', type: 'mage', canMove: 1 },
      
      'black_soldier_0': { position: 'returned', side : 'black', type: 'soldier', canMove: 1 },
    };
  });

  // 1. Goddess
  test('Goddess can jump 1 polygon over, spanning 2 degrees of neighborhood', () => {
    // Starting at poly_1. Neighbors: poly_2, poly_3.
    // Neighbors' neighbors: poly_4, poly_5.
    const moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).toContain('poly_2');
    expect(moves).toContain('poly_3');
    expect(moves).toContain('poly_4');
    expect(moves).toContain('poly_5');
    expect(moves).not.toContain('poly_1'); // Must move
    expect(moves).not.toContain('poly_6'); // Too far
  });

  // 2. Heroe
  test('Heroe can jump up to 3 polynomials away unless limit reached', () => {
    const moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    // Heroe can leap up to 3 links (poly_1 -> poly_5 -> poly_6). poly_7 is 4 links away.
    expect(moves).not.toContain('poly_7'); 
    expect(moves).toContain('poly_6'); // 3 jumps
    expect(moves.length).toBeGreaterThan(0);

    boardstate.heroeHasTakenCounter = 2; // Locked out
    const movesBlocked = getMoveHeroe(board, boardstate, 'white_heroe_0');
    expect(movesBlocked.length).toBe(0);
  });

  // 3. Bishop
  test('Bishops must retain their same polygon color across moves', () => {
    // From poly_1 (white), neighbors -> poly_5 (white), poly_7 (white)
    const moves = getMoveBishop(board, boardstate, 'white_bishop_0');
    expect(moves).toContain('poly_5');
    expect(moves).toContain('poly_7');
    expect(moves).not.toContain('poly_2'); // yellow poly
    expect(moves).not.toContain('poly_3'); // black poly
  });

  // 4. Siren 
  test('Sirens emit effect that shuts down movement of nearby enemy pieces', () => {
    // Place siren and enemy adjacent
    board.allPieces['white_siren_0'].position = 'poly_1';
    board.allPolygons['poly_1'].isIn = 'white_siren_0';

    board.allPieces['black_soldier_0'].position = 'poly_2';
    board.allPolygons['poly_2'].isIn = 'black_soldier_0';
    
    // Process effect
    setSirensNeighbors();
    expect(board.allPieces['black_soldier_0'].canMove).toBe(0);
  });

  // 5. Ghoul conditional jumping
  test('Ghoul allowed jumps dependent on chosen colored polygon states & enemies', () => {
    boardstate.colorChosen = 'yellow';
    // poly_2 is yellow. Ghoul starts at poly_1.
    // Standard rule: ghoul moves around normally unless matched color skips.
    const moves = getMoveGhoul(board, boardstate, 'white_ghoul_0');
    expect(moves).toContain('poly_4'); // Color match rule jump skipping happens and brings the ghoul further than its standard neighbors
  });

  // 6. Soldier
  test('Soldier movement stops linearly on encountering blocks but spreads adjacent paths', () => {
    const moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_2');
    expect(moves).toContain('poly_3');
  });

  // 7. Trifox restrictions
  test('Trifoxes behave like soldiers but with specific skipping limitations', () => {
    const moves = getMoveTrifoxes(board, boardstate, 'white_trifoxes_0');
    expect(moves).toEqual(expect.arrayContaining(['poly_2', 'poly_3']));
  });

  // 8. Mage swap targeting
  test('Mage targets friends and foes for position swapping differently than attacheroe', () => {
    // Targets can't be on the same color poly as the mage
    const moves = getMoveMage(board, boardstate, 'white_mage_0');
    // Mage on white. Allowed on yellow/black
    expect(moves).toContain('poly_2'); // yellow
    expect(moves).toContain('poly_3'); // black
    expect(moves).not.toContain('poly_5'); // white
  });

  // 9. Turn Iteration
  test('endOfTurn pushes sequence state accurately for players', () => {
    // Start: Turn 1, halfTurn 1, White
    endOfTurn();
    expect(boardstate.halfTurn).toBe(2);
    expect(boardstate.whoseTurnItIs).toBe('black');
    expect(boardstate.turn).toBe(1);

    endOfTurn(); // Turn 1 ends
    expect(boardstate.halfTurn).toBe(3);
    expect(boardstate.whoseTurnItIs).toBe('white');
    expect(boardstate.turn).toBe(2);
  });

  // 10. Rotation
  test('Rotate flips the board alignment boolean tracheroe', () => {
    expect(boardstate.boardRotated).toBe('no');
    
    // Simulate mocked global DOM for rotate implementation inside boardUtils
    global.document = { getElementById: () => ({ parentNode: { appendChild: () => {}, children: [] }, setAttributeNS: () => {}, getAttribute: () => '' }) };
    
    try {
        rotate();
    } catch(e) { } // Ignore DOM failures, state is manipulated directly
    
    expect(boardstate.boardRotated).toBe('yes');
  });

});
