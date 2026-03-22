import { 
  getMoveSoldier, 
  getMoveHeroe, 
  getMoveGoddess, 
  getMoveMage, 
  getMoveBishop, 
  getMoveSiren, 
  getMoveGhoul, 
  getMoveBerserker 
} from '../games/rules.js';
import { boardstate, board, setBoard } from '../games/state.js';

describe('Piece Movement Tests', () => {
  beforeEach(() => {
    const mockBoard = {
      allPolygons: {},
      allPieces: {},
      width: 410,
      height: 410,
      topEdgepolys: [],
      bottomEdgepolys: []
    };
    setBoard(mockBoard);

    // Initialize state
    boardstate.heroeHasTakenCounter = 0;
    boardstate.heroeHasTakenCounterMax = 2;
    boardstate.colorChosen = 'orange';

    // Create a 5x5 grid of polygons for testing
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const id = `poly_${x}_${y}`;
        board.allPolygons[id] = {
          id,
          center: [x * 50, y * 50],
          centerRotated: [400 - x * 50, 400 - y * 50],
          neighbours: [],
          neighbors: [],
          color: (x + y) % 2 === 0 ? 'orange' : 'grey',
          isIn: 'empty'
        };
      }
    }

    // Set up neighbors (simple orthogonal)
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const id = `poly_${x}_${y}`;
        if (x > 0) board.allPolygons[id].neighbors.push(`poly_${x-1}_${y}`);
        if (x < 4) board.allPolygons[id].neighbors.push(`poly_${x+1}_${y}`);
        if (y > 0) board.allPolygons[id].neighbors.push(`poly_${x}_${y-1}`);
        if (y < 4) board.allPolygons[id].neighbors.push(`poly_${x}_${y+1}`);
        board.allPolygons[id].neighbours = board.allPolygons[id].neighbors;
      }
    }
  });

  const placePiece = (id, polyId, color, type) => {
    board.allPieces[id] = { id, position: polyId, color, type, canMove: 1 };
    if (polyId !== 'returned') board.allPolygons[polyId].isIn = id;
  };

  test('Soldier Movement: moves onto same color neighbors', () => {
    placePiece('white_soldier_0', 'poly_2_2', 'white', 'soldier');
    // colorChosen is orange. poly_2_2 is orange (2+2=4). 
    // Neighbors: poly_1_2 (grey), poly_3_2 (grey), poly_2_1 (grey), poly_2_3 (grey)
    // No neighbors are orange. So only neighbors should be returned.
    const moves = getMoveSoldier(board, boardstate, 'white_soldier_0');
    expect(moves).toContain('poly_1_2');
    expect(moves).toContain('poly_2_1');
  });

  test('Heroe Movement: 3-step range', () => {
    placePiece('white_heroe_0', 'poly_0_0', 'white', 'heroe');
    const moves = getMoveHeroe(board, boardstate, 'white_heroe_0');
    // Should reach poly_3_0, poly_0_3, poly_1_1 etc.
    expect(moves).toContain('poly_3_0');
    expect(moves).toContain('poly_0_3');
    expect(moves).not.toContain('poly_4_0'); // 4 steps away
  });

  test('Goddess Movement: 2-step range', () => {
    placePiece('white_goddess_0', 'poly_2_2', 'white', 'goddess');
    const moves = getMoveGoddess(board, boardstate, 'white_goddess_0');
    expect(moves).toContain('poly_0_2');
    expect(moves).toContain('poly_2_0');
    expect(moves).not.toContain('poly_0_0'); // 4 steps? No, (0,2) is 2 steps. (0,0) is 4 steps diagonally if we only follow neighbors.
  });

  test('Mage Movement: 3-step range, different color', () => {
    placePiece('white_mage_0', 'poly_2_2', 'white', 'mage'); // poly_2_2 is orange
    const moves = getMoveMage(board, boardstate, 'white_mage_0');
    expect(moves).toContain('poly_1_2'); // grey, reachable
    expect(moves).not.toContain('poly_0_2'); // orange, same color as start
  });

  test('Bishop Movement: 4-step range, same color only', () => {
    placePiece('white_bishop_0', 'poly_2_2', 'white', 'bishop'); // orange
    const moves = getMoveBishop(board, boardstate, 'white_bishop_0');
    expect(moves).toContain('poly_0_2'); // orange, reachable
    expect(moves).not.toContain('poly_1_2'); // grey
  });

  test('Siren Movement: 2-step range', () => {
    placePiece('white_siren_0', 'poly_2_2', 'white', 'siren');
    const moves = getMoveSiren(board, boardstate, 'white_siren_0');
    expect(moves).toContain('poly_4_2');
    expect(moves).toContain('poly_2_0');
  });

  test('Berserker Movement: identical to soldier', () => {
    placePiece('white_berserker_0', 'poly_2_2', 'white', 'berserker');
    const moves = getMoveBerserker(board, boardstate, 'white_berserker_0');
    const soldierMoves = getMoveSoldier(board, boardstate, 'white_berserker_0');
    expect(moves).toEqual(soldierMoves);
  });
});
