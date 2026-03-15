import { endOfTurn } from '../games/gameLogic.js';
import { boardstate, board, setBoard } from '../games/state.js';
import { store } from '../games/store.js';
import { rotate } from '../games/boardUtils.js';

// Mock DOM
global.document = {
  getElementById: jest.fn().mockReturnValue({
    querySelector: jest.fn().mockReturnValue({ style: {} }),
    style: {},
    setAttributeNS: jest.fn(),
    getAttributeNS: jest.fn(),
    classList: { contains: jest.fn() },
    transform: { baseVal: [] }
  }),
  getElementsByClassName: jest.fn().mockReturnValue([]),
  createElementNS: jest.fn().mockReturnValue({ setAttributeNS: jest.fn(), setAttribute: jest.fn() })
};

describe('7-Turn Game Simulation with Rotations', () => {
  beforeEach(() => {
    const mockBoard = {
      allPolygons: {
        'poly_1': { center: [0, 0], centerRotated: [100, 100], neighbors: [], neighbours: [], isIn: 'empty' }
      },
      allPieces: {
        'white_king_0': { position: 'poly_1', color: 'white', type: 'king', canMove: 1, centerTransform: [0, 0] }
      }
    };
    setBoard(mockBoard);
    store.updateTurn(1, 1);
    boardstate.whoseTurnItIs = 'white';
    boardstate.boardRotated = 'no';
  });

  test('Simulation of 7 full turns (14 half-turns) with rotations', () => {
    const sequence = [];
    
    for (let i = 0; i < 14; i++) {
      sequence.push({
        turn: boardstate.turn,
        halfTurn: boardstate.halfTurn,
        player: boardstate.whoseTurnItIs,
        rotated: boardstate.boardRotated
      });

      // Rotate on turns 2 and 5
      if (boardstate.turn === 2 && boardstate.whoseTurnItIs === 'white' && boardstate.boardRotated === 'no') {
        rotate();
      }
      if (boardstate.turn === 5 && boardstate.whoseTurnItIs === 'yellow' && boardstate.boardRotated === 'yes') {
        rotate();
      }

      endOfTurn();
    }

    // Verify turn progression
    expect(sequence[0]).toEqual({ turn: 1, halfTurn: 1, player: 'white', rotated: 'no' });
    expect(sequence[1]).toEqual({ turn: 1, halfTurn: 2, player: 'yellow', rotated: 'no' });
    expect(sequence[2]).toEqual({ turn: 2, halfTurn: 3, player: 'white', rotated: 'no' });
    
    // Check rotation states in sequence (sequence records state BEFORE endOfTurn call)
    // Turn 2 White: rotate() is called, so next record should be rotated
    expect(sequence[3].rotated).toBe('yes'); // Turn 2 Yellow
    expect(sequence[8].rotated).toBe('yes'); // Turn 5 White
    
    // Turn 5 Yellow: rotate() is called back to 'no'
    expect(sequence[10].rotated).toBe('no'); // Turn 6 White

    // Verify 7 full turns completed (14 half-turns means start of turn 8)
    expect(boardstate.turn).toBe(8);
    expect(boardstate.halfTurn).toBe(15);
  });
});
