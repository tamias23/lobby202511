// Define global mock for io() before any imports that depend on it
global.io = () => ({ on: () => {}, emit: () => {} });
global.Audio = class { play() { return Promise.resolve(); } };

let playAction, boardstate, board, setBoard, store;

beforeAll(async () => {
  const socketHandlerModule = await import('../games/socketHandler.js');
  playAction = socketHandlerModule.playAction;
  
  const stateModule = await import('../games/state.js');
  boardstate = stateModule.boardstate;
  board = stateModule.board;
  setBoard = stateModule.setBoard;
  
  const storeModule = await import('../games/store.js');
  store = storeModule.store;
});

describe('Socket Event Handlers Integration', () => {

  beforeEach(() => {
    // Basic DOM mocking required for playAction internals that alter CSS dynamically
    global.document = {
      getElementById: (id) => ({
        setAttributeNS: () => {},
        getAttribute: () => '',
        style: {}
      }),
      getElementsByClassName: (className) => {
        if (className === 'colorSelector') {
          return [
            { getAttribute: () => 'orange', setAttributeNS: () => {}, querySelector: () => ({ style: {} }) },
            { getAttribute: () => 'yellow', setAttributeNS: () => {}, querySelector: () => ({ style: {} }) }
          ];
        }
        return [];
      }
    };

    setBoard({
      allPieces: {},
      allPolygons: {}
    });

    boardstate.colorChosen = 'noColor';
  });

  test('playAction guarantees global store state synchronization for colorSelection', () => {
    expect(boardstate.colorChosen).toBe('noColor');
    expect(store.getState().colorChosen).toBe('noColor');

    // Simulate Receiving websocket color selection event for 'orange'
    playAction('colorSelection', 'orange');

    // Validate mutations properly synced on global variables managed by the store module
    expect(boardstate.colorChosen).toBe('orange');
    expect(store.getState().colorChosen).toBe('orange');
  });

});
