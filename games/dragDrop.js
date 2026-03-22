import { board, whoAmI } from './state.js';
import { store } from './store.js';
import { getMousePosition, iterTransformGetTranslate } from './utils.js';
import { highlightPossibleMoves, removePossibleMoves } from './gameLogic.js';
import { getListOfPossibleTargetsForSetup, getListOfPossibleTargets } from './rules.js';
import { setPieceToPoly } from './boardUtils.js';
import { sendMessageFromClient } from './socketHandler.js';
import { showColorSelectors, toggleButtonVisibility, setButtonAndFooterColor } from './ui.js';
import { shuffleArray } from './utils.js';

export function mouseDown(evt) {
  let state = store.getState();
  if(state.setupIsDone === 'yes'){
    mouseDownAfterSetupIsDone(evt);
  } else {
    mouseDownBeforeSetupIsDone(evt);
  }
}

function getOrCreateTranslateTransform(element) {
  const transforms = element.transform.baseVal;
  for (let i = 0; i < transforms.numberOfItems; i++) {
    const item = transforms.getItem(i);
    if (item.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
      return item;
    }
  }
  const translate = document.getElementById('board').createSVGTransform();
  translate.setTranslate(0, 0);
  element.transform.baseVal.insertItemBefore(translate, 0);
  return element.transform.baseVal.getItem(0);
}

function mouseDownBeforeSetupIsDone(evt) {
  let state = store.getState();
  if (evt.target.parentNode.classList.contains('draggable')) {
    state.selectedElement = evt.target.parentNode;
    if(board.allPieces[state.selectedElement.id].position === 'returned'){
      store.setOffset(getMousePosition(evt, document.getElementById('board')));

      const _transform = getOrCreateTranslateTransform(state.selectedElement);
      store.setTransform(_transform);

      state.offset.x -= _transform.matrix.e;
      state.offset.y -= _transform.matrix.f;
    
      state.dragging = 1;
      state.piece = state.selectedElement.id;

      store.setHighlightedMoves(getListOfPossibleTargetsForSetup(board, state, state.piece));
      highlightPossibleMoves();
    } else {
      state.selectedElement = false;
    }
  }
}

function mouseDownAfterSetupIsDone(evt) {
  let state = store.getState();
  if (evt.target.parentNode.classList.contains('draggable') && state.colorChosen !== 'noColor') {
    state.selectedElement = evt.target.parentNode;

    if (
      (state.colorChosen != 'noColor' && (state.selectedElement.id in board.allPieces) && board.allPieces[state.selectedElement.id].position === 'returned' && state.whoseTurnItIs === board.allPieces[state.selectedElement.id].side) || 
      (
        board.allPieces[state.selectedElement.id].canMove && 
        state.whoseTurnItIs === board.allPieces[state.selectedElement.id].side && 
        state.colorChosen !== 'noColor' && 
        board.allPieces[state.selectedElement.id].position !== 'returned' && 
        (
          board.allPolygons[board.allPieces[state.selectedElement.id].position].color === state.colorChosen || 
          (
            board.allPieces[state.selectedElement.id].type === 'king' && state.kingHasTaken === state.selectedElement.id)
          )
        )
        && (state.soldierIsMoving === 'no' || state.soldierIsMoving === state.selectedElement.id)
      ){

      store.setOffset(getMousePosition(evt, document.getElementById('board')));

      const _transform = getOrCreateTranslateTransform(state.selectedElement);
      store.setTransform(_transform);

      state.offset.x -= _transform.matrix.e;
      state.offset.y -= _transform.matrix.f;
    
      state.dragging = 1;
      state.piece = state.selectedElement.id;

      store.setHighlightedMoves(getListOfPossibleTargets(board, state, state.piece));
      highlightPossibleMoves();
    } else {
      state.selectedElement = false;
    }
  }
}

export function mouseMove(evt) {
  let state = store.getState();
  if (state.selectedElement) {
    let coord = getMousePosition(evt, document.getElementById('board'));
    state.transform.setTranslate(coord.x - state.offset.x, coord.y - state.offset.y);
  }
}

export function getElementClosestToMouse(evt) {
  let state = store.getState();
  state.draggedOn = '';
  state.distDraggedOn = 500;
  let myMin = 5000000;
  const zzz = iterTransformGetTranslate(document.getElementById('boardOfPolys'));

  store.setOffset(getMousePosition(evt, document.getElementById('board')));

  for (const k in board.allPolygons){
    let center = board.allPolygons[k].center;
    if (state.boardRotated === 'yes'){
      center = board.allPolygons[k].centerRotated;
    }
    let d = (center[0] - state.offset.x + zzz[0]) * (center[0] - state.offset.x + zzz[0]) + (center[1] - state.offset.y + zzz[1]) * (center[1] - state.offset.y + zzz[1]);
    if(d < state.distDraggedOn){
      state.distDraggedOn = d;
      state.draggedOn = k;
    }
    if(d < myMin){
      myMin = d;
    }
  }
  return state.draggedOn;
}

export function mouseUp(evt) {
  let state = store.getState();
  if(state.setupIsDone === 'yes'){
    mouseUpAfterSetupIsDone(evt);
  } else {
    mouseUpBeforeSetupIsDone(evt);
    let howManyPiecesSet = 0;
    for (const id in board.allPieces){
      if(board.allPieces[id].position === 'returned'){
        howManyPiecesSet = howManyPiecesSet + 1;
      }
    }
    let myButtonSetupRandomly = document.getElementById('myButtonSetupRandomly');
    let myButtonNewBoardRequested = document.getElementById('myButtonNewBoardRequested');
    if (howManyPiecesSet < 67) {
      store.setSetupIsDone('yes');
      showColorSelectors();
      if (myButtonSetupRandomly && myButtonSetupRandomly.style.visibility == 'visible'){
        toggleButtonVisibility(myButtonSetupRandomly);
        if(myButtonNewBoardRequested) toggleButtonVisibility(myButtonNewBoardRequested);
      }
      state.whoseTurnItIs = 'white';
      setButtonAndFooterColor();
    }
  }
}

function mouseUpBeforeSetupIsDone(evt) {
  let state = store.getState();
  const mySelectPieceId = state.selectedElement.id;
  state.selectedElement = false;
  getElementClosestToMouse(evt);
  if(state.draggedOn !== '' && state.highlighted.includes(state.draggedOn)){
    setPieceToPoly(mySelectPieceId, state.draggedOn);
    sendMessageFromClient(JSON.stringify({'legalMoveA' : {'mySelectPieceId' : mySelectPieceId, 'draggedOn' : state.draggedOn}, 'randomHash' : state.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : state.timeInfo}));
  } else {
    if ((mySelectPieceId in board.allPieces) && board.allPieces[mySelectPieceId].position == 'returned'){
      let e = document.getElementById(mySelectPieceId);
      e.setAttributeNS(null, 'transform', board.allPieces[mySelectPieceId].initialTransform);
    }
  }

  removePossibleMoves();
}

function mouseUpAfterSetupIsDone(evt) {
  let state = store.getState();
  const mySelectPieceId = state.selectedElement.id;
  state.selectedElement = false;

  if (state.dragging > 0 && mySelectPieceId !== undefined){ 
    getElementClosestToMouse(evt);

    if (state.draggedOn !== '' && 'center' in board.allPolygons[state.draggedOn]){
      const possibleTargets = getListOfPossibleTargets(board, state, mySelectPieceId);
      console.log('DROP ATTEMPT:', mySelectPieceId, 'to', state.draggedOn, 'Targets:', possibleTargets);
      console.log('DESTINATION is empty?', board.allPolygons[state.draggedOn].isIn);
      console.log('possibleTargets includes draggedOn?', possibleTargets.includes(state.draggedOn));
      
      if (board.allPolygons[state.draggedOn].isIn == 'empty' && possibleTargets.includes(state.draggedOn)){
        let thisIsTheEndOfTurn = false;
        if (board.allPieces[mySelectPieceId].position === 'returned'){
          thisIsTheEndOfTurn = true;
        }
        
        sendMessageFromClient(JSON.stringify({'legalMoveA' : {'mySelectPieceId' : mySelectPieceId, 'draggedOn' : state.draggedOn}, 'randomHash' : state.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : state.timeInfo}));

      } else {
        if (state.highlighted.includes(state.draggedOn) && (document.getElementById('circle_' + state.draggedOn) !== null)) {
          let e = document.getElementById('circle_' + state.draggedOn);
          if (e.hasAttribute('style') && e.style.fill === 'red'){
            sendMessageFromClient(JSON.stringify({'legalMoveB' : {'mySelectPieceId' : mySelectPieceId, 'draggedOn' : state.draggedOn}, 'randomHash' : state.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : state.timeInfo}));
          }
        } else {
          if (board.allPieces[mySelectPieceId].position == 'returned'){
            let e = document.getElementById(mySelectPieceId);
            e.setAttributeNS(null, 'transform', board.allPieces[mySelectPieceId].initialTransform);
          } else {
            console.log('Reverting piece locally because it failed all legalMove checks!');
            setPieceToPoly(mySelectPieceId, board.allPieces[mySelectPieceId].position);
          }
        }
      }
    } else {
      console.log('Failed draggedOn center condition:', state.draggedOn);
      if (state.draggedOn === ''){
        if (board.allPieces[mySelectPieceId].position !== 'returned') {
          setPieceToPoly(mySelectPieceId, board.allPieces[mySelectPieceId].position);
        }
      }
    }
        
    state.dragging = 0;
  }

  removePossibleMoves();
}
