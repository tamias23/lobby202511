import { boardstate, board, whoAmI } from './state.js';
import { store } from './store.js';
import { setButtonAndFooterColor } from './ui.js';
import { renderer } from './renderer.js';

export function endOfTurn() {
  let state = store.getState();
  console.log('endOfTurn ' + state.whoseTurnItIs + ' [' + state.turn + ',' + state.halfTurn + ']');
  
  store.resetTurnState();
  
  let currentHalfTurn = state.halfTurn + 1;
  let currentTurn = state.turn;
  if (state.whoseTurnItIs !== 'white' ){
    currentTurn = currentTurn + 1;
  }
  
  store.updateTurn(currentTurn, currentHalfTurn);
  store.swapWhoseTurnItIs();

  // Update DOM via renderer
  if (typeof document !== 'undefined') renderer.updateUIOnTurnEnd();
}

export function highlightPossibleMoves() {
  renderer.highlightPossibleMoves();
}

export function setSirensNeighbors() {
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


