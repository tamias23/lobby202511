import { endOfTurn } from '../games/gameLogic.js';
import { board } from '../games/state.js';
import { store } from '../games/store.js';

// We need to mock document since jsdom isn't loaded and gameLogic tries to manipulate the DOM for SVGs
beforeEach(() => {
  global.document = {
    getElementById: jest.fn().mockReturnValue({
      querySelector: jest.fn().mockReturnValue({
        style: {}
      }),
      style: {}
    }),
    getElementsByClassName: jest.fn().mockReturnValue([])
  };

  // Reset boardstate before each test
  store.updateTurn(1, 1);
  let state = store.getState();
  state.whoseTurnItIs = 'white';
  store.setColorChosen('noColor');
  store.resetTurnState();
  state.actualYellowColor = 'yellow';
  state.circleIdToColor = {};
});

describe('Game Logic: endOfTurn', () => {
  test('should swap turn from white to yellow', () => {
    let state = store.getState();
    state.whoseTurnItIs = 'white';
    
    endOfTurn();
    
    state = store.getState();
    expect(state.whoseTurnItIs).toBe('yellow');
    expect(state.halfTurn).toBe(2);
    expect(state.turn).toBe(1); // Turn only increments when yellow finishes
    expect(state.kingHasTakenCounter).toBe(0);
    expect(state.soldierIsMoving).toBe('no');
    expect(state.colorChosen).toBe('noColor');
  });

  test('should swap turn from yellow to white and increment full turn', () => {
    let state = store.getState();
    state.whoseTurnItIs = 'yellow';
    state.turn = 1;
    state.halfTurn = 2;
    
    endOfTurn();
    
    state = store.getState();
    expect(state.whoseTurnItIs).toBe('white');
    expect(state.halfTurn).toBe(3);
    expect(state.turn).toBe(2); // Turn increments when yellow finishes
  });
});
