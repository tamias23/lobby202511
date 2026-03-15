import { store } from '../games/store.js';

describe('Store State Management', () => {
  beforeEach(() => {
    // Reset state to initial values before each test
    store.state = {
      fullboardid: '',
      highlighted: [],
      circles: [],
      topEdgepolys: [],
      bottomEdgepolys: [],
      turn: 1,
      halfTurn: 1,
      whoseTurnItIs: 'white',
      colorChosen: 'noColor',
      circleIdToColor: {},
      kingHasTaken: 'no',
      kingHasTakenCounter: 0,
      kingHasTakenCounterMax: 2,
      soldierIsMoving: 'no',
      randomHash: '',
      amIWhiteOrYellow: '',
      boardRotated: 'no',
      newBoardRequested: 'no',
      actualYellowColor: 'yellow',
      piecesRemoved: [],
      animation_duration: 300,
      animation_duration_lastMove: -1,
      animation_delay: -1,
      setupIsDone: 'no',
      possibleSetupGoddessKings: { yellow: [], white: [] },
      timeInfo: {},
      board: null,
      transform: '',
      offset: ''
    };
  });

  test('updateTurn correctly updates the turn and halfTurn states', () => {
    store.updateTurn(5, 10);
    const state = store.getState();
    expect(state.turn).toBe(5);
    expect(state.halfTurn).toBe(10);
  });

  test('swapWhoseTurnItIs toggles seamlessly between white and yellow', () => {
    expect(store.getState().whoseTurnItIs).toBe('white');
    store.swapWhoseTurnItIs();
    expect(store.getState().whoseTurnItIs).toBe('yellow');
    store.swapWhoseTurnItIs();
    expect(store.getState().whoseTurnItIs).toBe('white');
  });

  test('resetTurnState clears the turn trackers: kingHasTakenCounter, soldierIsMoving, and colorChosen', () => {
    store.state.kingHasTakenCounter = 2;
    store.state.soldierIsMoving = 'white_soldier_1';
    store.setColorChosen('orange');
    
    store.resetTurnState();
    const state = store.getState();
    
    expect(state.kingHasTakenCounter).toBe(0);
    expect(state.soldierIsMoving).toBe('no');
    expect(state.colorChosen).toBe('noColor');
  });

  test('setHighlightedMoves correctly updates the state array', () => {
    const mockMoves = ['poly1', 'poly2', 'poly3'];
    store.setHighlightedMoves(mockMoves);
    expect(store.getState().highlighted).toEqual(mockMoves);
  });

  test('clearHighlightedMoves drops both highlighted and circles arrays', () => {
    store.state.highlighted = ['poly1', 'poly2'];
    store.state.circles = ['circle1', 'circle2'];
    
    store.clearHighlightedMoves();
    const state = store.getState();
    
    expect(state.highlighted).toEqual([]);
    expect(state.circles).toEqual([]);
  });

  test('addCircle appends IDs to the circles state array', () => {
    store.addCircle('circleA');
    store.addCircle('circleB');
    expect(store.getState().circles).toEqual(['circleA', 'circleB']);
  });

  test('incrementKingTakeCounter adds 1 continuously', () => {
    expect(store.getState().kingHasTakenCounter).toBe(0);
    store.incrementKingTakeCounter();
    expect(store.getState().kingHasTakenCounter).toBe(1);
    store.incrementKingTakeCounter();
    expect(store.getState().kingHasTakenCounter).toBe(2);
  });

  test('setKingHasTaken properly registers the king doing the capturing', () => {
    store.setKingHasTaken('yellow_king_1');
    expect(store.getState().kingHasTaken).toBe('yellow_king_1');
  });

  test('resetKingHasTaken clears the properties', () => {
    store.state.kingHasTaken = 'white_king_0';
    store.state.kingHasTakenCounter = 1;

    store.resetKingHasTaken();
    const state = store.getState();
    
    expect(state.kingHasTaken).toBe('no');
    expect(state.kingHasTakenCounter).toBe(0);
  });

  test('setSoldierIsMoving correctly identifies the active piece', () => {
    store.setSoldierIsMoving('white_soldier_5');
    expect(store.getState().soldierIsMoving).toBe('white_soldier_5');
  });

  test('setSetupIsDone validates changes to setup boolean states', () => {
    expect(store.getState().setupIsDone).toBe('no');
    store.setSetupIsDone('yes');
    expect(store.getState().setupIsDone).toBe('yes');
  });
});
