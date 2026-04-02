import { boardstate, board, whoAmI } from './state.js';
import { store } from './store.js';
import { setButtonAndFooterColor } from './ui.js';
import { renderer } from './renderer.js';

export function endOfTurn() {
  let state = store.getState();
  console.log('endOfTurn ' + state.whoseTurnItIs + ' [' + state.turn + ',' + state.halfTurn + ']');
  
  if (state.setupIsDone === 'no') {
    state.setupPlacementsThisTurn = 0;
    
    // Hide End Turn button at start of new turn
    if (typeof document !== 'undefined') {
      let btnEnd = document.getElementById('myButtonEndTurn');
      if (btnEnd) btnEnd.style.visibility = 'hidden';
    }

    if (checkSetupStepComplete(board, 'white', state) && checkSetupStepComplete(board, 'black', state)) {
      store.advanceSetupStep();
    }
  } else {
    store.resetTurnState();
  }

  let currentHalfTurn = state.halfTurn + 1;
  let currentTurn = state.turn;
  if (state.whoseTurnItIs !== 'white' ){
    currentTurn = currentTurn + 1;
  }
  
  store.updateTurn(currentTurn, currentHalfTurn);
  store.swapWhoseTurnItIs();

  // Update DOM via renderer
  if (typeof document !== 'undefined') {
    renderer.updateUIOnTurnEnd();
    setButtonAndFooterColor();
    // Update piece visibility/graying out
    if (state.setupIsDone === 'no') updateSetupVisibility();
  }
}

function checkSetupStepComplete(board, side, state) {
  if (!board || !board.allPieces) return false;
  const step = state.setupStep;
  if (step === 0) { // Goddess
    let g = board.allPieces[side + '_goddess_0'];
    return g && g.position !== 'returned';
  } else if (step === 1) { // Hero
    let count = 0;
    for (let i=0; i<2; i++) {
        let h = board.allPieces[side + '_heroe_' + i];
        if (h && h.position !== 'returned') count++;
    }
    return count === 2;
  } else if (step === 2) { // Berserker
    let count = 0;
    for (let i=0; i<2; i++) {
        let b = board.allPieces[side + '_berserker_' + i];
        if (b && b.position !== 'returned') count++;
    }
    return count === 2;
  } else if (step === 3) { // Bishop
    let count = 0;
    for (let i=0; i<4; i++) {
        let b = board.allPieces[side + '_bishop_' + i];
        if (b && b.position !== 'returned') count++;
    }
    return count === 4;
  } else if (step === 4) { // Infantry
    let count = 0;
    for (let i=0; i<9; i++) {
        let s = board.allPieces[side + '_siren_' + i];
        let g = board.allPieces[side + '_ghoul_' + i];
        if (s && s.position !== 'returned') count++;
        if (g && g.position !== 'returned') count++;
    }
    return count === 18;
  }
  return false;
}

export function updateSetupVisibility() {
  if (!board || !board.allPieces) return;
  const state = store.getState();
  const step = state.setupStep;
  const currentSide = state.whoseTurnItIs;

  const stepMap = {
    0: ['goddess'],
    1: ['heroe'],
    2: ['berserker'],
    3: ['bishop'],
    4: ['ghoul', 'siren']
  };
  const activeTypes = stepMap[step] || [];

  for (const id in board.allPieces) {
    const piece = board.allPieces[id];
    const el = document.getElementById(id);
    if (!el) continue;

    if (state.setupIsDone === 'yes') {
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.pointerEvents = 'auto';
      continue;
    }

    if (piece.position !== 'returned') {
      el.style.opacity = '1';
      el.style.filter = 'none';
      continue;
    }

    if (piece.side === currentSide && activeTypes.includes(piece.type)) {
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0.4';
      el.style.filter = 'grayscale(100%)';
      el.style.pointerEvents = 'none';
    }
  }
}

export function highlightPossibleMoves() {
  renderer.highlightPossibleMoves();
}

export function setSirenNeighbors() {
  for (const id in board.allPieces){
    board.allPieces[id].canMove = 1;
  }
  for (const id in board.allPieces){
    if (board.allPieces[id].type === 'siren' && board.allPieces[id].position !== 'returned') {
      for (let k of board.allPolygons[board.allPieces[id].position].neighbors){
        if (board.allPolygons[k].isIn !== 'empty'){
          if (board.allPieces[board.allPolygons[k].isIn].side !== board.allPieces[id].side) {
            board.allPieces[board.allPolygons[k].isIn].canMove = 0;
          }
        }
      }
    }
  }    
}

export function removePossibleMoves() {
  renderer.removePossibleMoves();
}


