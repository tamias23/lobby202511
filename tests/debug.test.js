import fs from 'fs';

test('debug selection issue', async () => {
  // Setup fake DOM
  global.document = {
    getElementById: (id) => ({
      createSVGTransform: () => ({ setTranslate: () => {}, matrix: { e: 0, f: 0 }, insertItemBefore: () => {}, getItem: () => ({ matrix: { e: 0, f: 0 } }) }),
      querySelector: () => ({ style: {} }),
      style: {},
      setAttributeNS: () => {},
      getAttributeNS: () => {},
      setAttribute: () => {},
      classList: { contains: () => false, add: () => {}, remove: () => {} },
      transform: { baseVal: { numberOfItems: 0, clear: () => {}, appendItem: () => {}, insertItemBefore: () => {}, getItem: () => ({ matrix: { e: 0, f: 0 } }) } },
      children: [{ setAttribute: () => {} }],
      animate: () => ({ onfinish: null, play: () => {} }),
      getScreenCTM: () => ({ a: 1, d: 1, e: 0, f: 0 }),
      appendChild: () => {}
    }),
    getElementsByClassName: () => [],
    createElementNS: () => ({ setAttributeNS: () => {}, setAttribute: () => {} })
  };
  global.window = {};
  global.io = () => ({ on: () => {}, emit: () => {} });
  global.Audio = class { play() { return Promise.resolve(); } };

  const stateModule = await import('../games/state.js');
  const { setBoard, whoAmI } = stateModule;
  const { store } = await import('../games/store.js');
  const { renderer } = await import('../games/renderer.js');
  const dragDrop = await import('../games/dragDrop.js');
  const socketHandler = await import('../games/socketHandler.js');

  // 1. Mock the board creation
  const dataDir = './games/data';
  const boardFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('_board.json'));
  const boardData = JSON.parse(fs.readFileSync(`${dataDir}/${boardFiles[0]}`, 'utf8'));
  setBoard(boardData);
  
  // Initialize pieces and polygons with properties normally set by browser code (main.js)
  for (const pid in store.getState().board.allPieces) {
      store.getState().board.allPieces[pid].centerTransform = [0, 0];
      store.getState().board.allPieces[pid].canMove = 1;
      store.getState().board.allPieces[pid].initialTransform = '';
  }
  for (const polyId in store.getState().board.allPolygons) {
      store.getState().board.allPolygons[polyId].centerRotated = store.getState().board.allPolygons[polyId].center || [0,0];
      store.getState().board.allPolygons[polyId].isIn = 'empty';
  }

  // 2. Set up initial setup sequence randomly
  const initialSetupMsg = {};
  let availablePolys = Object.keys(store.getState().board.allPolygons);
  for (const pid in store.getState().board.allPieces) {
      if (!pid.includes('yellow') && !pid.includes('white')) continue;
      const poly = availablePolys.pop();
      initialSetupMsg[pid] = poly;
  }

  // 3. Emulate Receiving Setup
  socketHandler.playAction('initialSetup', initialSetupMsg);

  // 4. Color Selection
  socketHandler.playAction('colorSelection', 'orange');

  let state = store.getState();
  console.log('whoseTurnItIs: ', state.whoseTurnItIs);
  console.log('colorChosen: ', state.colorChosen);

  // 5. Find a white piece on an orange poly to simulate a valid click
  let targetPieceId = null;
  let targetPolyId = null;
  for (const poly in store.getState().board.allPolygons) {
    if (store.getState().board.allPolygons[poly].color === 'orange') {
        const piece = store.getState().board.allPolygons[poly].isIn;
        if (piece && piece.startsWith('white')) {
            targetPieceId = piece;
            targetPolyId = poly;
            break; // found one!
        }
    }
  }

  if (!targetPieceId) {
      console.log('Could not find white piece on orange... falling back');
      return;
  }

  console.log('Target Piece (White, on Orange poly):', targetPieceId, targetPolyId);
  console.log('Can piece move natively?:', store.getState().board.allPieces[targetPieceId].canMove);

  // 6. Simulate mousedown
  let mockEvt = {
      target: {
          getScreenCTM: () => ({ a: 1, d: 1, e: 0, f: 0 }),
          parentNode: {
            getScreenCTM: () => ({ a: 1, d: 1, e: 0, f: 0 }),
            classList: { contains: () => true },
            id: targetPieceId,
            transform: {
                baseVal: { numberOfItems: 0, insertItemBefore: () => {}, getItem: () => ({ matrix: { e: 0, f: 0 } }) }
            }
          }
      },
      clientX: 100,
      clientY: 100
  };

  console.log('Is dragging before?', state.dragging);
  dragDrop.mouseDown(mockEvt);
  console.log('Is dragging after?', state.dragging);
  console.log('Highlighted Array:', state.highlighted);
});
