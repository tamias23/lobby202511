import { board } from './state.js';
import { store } from './store.js';

export const renderer = {
  
  /**
   * Draws highlight circles on valid polygons based on the given state
   */
  highlightPossibleMoves() {
    const ns = 'http://www.w3.org/2000/svg';
    let state = store.getState();
    
    for (let key in board.allPolygons){
      if (state.highlighted.includes(key)) {
        if (board.allPolygons[key].isIn === 'empty'){
          let e = document.getElementById(key);
          let myCircle = document.createElementNS(ns, 'circle');
          myCircle.setAttributeNS(null, 'cx', board.allPolygons[key].center[0]); 
          myCircle.setAttributeNS(null, 'cy', board.allPolygons[key].center[1]); 
          myCircle.setAttributeNS(null, 'r', 5); 
          myCircle.setAttributeNS(null, 'style', 'opacity:0.4;fill:black;stroke:black;stroke-width:0.1;');
          myCircle.setAttribute('id', 'circle_' + key);
          store.addCircle('circle_' + key);
          e.appendChild(myCircle);
        } else {
          if (board.allPieces[board.allPolygons[key].isIn].side !== board.allPieces[state.piece].side && board.allPieces[board.allPolygons[key].isIn].type != 'trifoxes') {
            if (
              board.allPieces[state.piece].type === 'king' ||
              board.allPieces[state.piece].type === 'goddess' ||
              board.allPieces[state.piece].type === 'trifoxes'
            ) {
              let e = document.getElementById(key);
              let myCircle = document.createElementNS(ns, 'circle');
              myCircle.setAttributeNS(null, 'cx', board.allPolygons[key].center[0]); 
              myCircle.setAttributeNS(null, 'cy', board.allPolygons[key].center[1]); 
              myCircle.setAttributeNS(null, 'r', 16); 
              myCircle.setAttributeNS(null, 'style', 'opacity:1.0;fill:red;stroke:black;stroke-width:0.1;');
              myCircle.setAttribute('id', 'circle_' + key);
              store.addCircle('circle_' + key);
              e.appendChild(myCircle);
            } else if(board.allPieces[state.piece].type !== 'bishop' && board.allPieces[state.piece].type !== 'siren') {
              let e = document.getElementById(key);
              let myCircle = document.createElementNS(ns, 'circle');
              myCircle.setAttributeNS(null, 'cx', board.allPolygons[key].center[0]); 
              myCircle.setAttributeNS(null, 'cy', board.allPolygons[key].center[1]); 
              myCircle.setAttributeNS(null, 'r', 16); 
              myCircle.setAttributeNS(null, 'style', 'opacity:1.0;fill:red;stroke:black;stroke-width:0.1;');
              myCircle.setAttribute('id', 'circle_' + key);
              store.addCircle('circle_' + key);
              e.appendChild(myCircle);
            }            
          }
        }
      }
    }
  },

  /**
   * Removes all highlight circles from the board
   */
  removePossibleMoves() {
    let state = store.getState();
    for (let k of state.circles){
      let c = document.getElementById(k);
      if(c) c.remove();
    }
    store.clearHighlightedMoves();
  },

  /**
   * Updates UI colors when the turn ends
   */
  updateUIOnTurnEnd() {
    let state = store.getState();
    if (state.whoseTurnItIs === 'yellow' ){ // It was swapped inside endOfTurn
      document.getElementById('myButtonEndTurn').querySelector('rect').style.fill = state.actualYellowColor;
      document.getElementById('purpleFooter').style.fill = state.actualYellowColor;
      if(state.actualYellowColor === 'black') {
        document.getElementById('myButtonEndTurn').querySelector('text').style.fill = 'white';
      }
    } else {
      document.getElementById('myButtonEndTurn').querySelector('text').style.fill = 'black';
      document.getElementById('myButtonEndTurn').querySelector('rect').style.fill = 'white';
      document.getElementById('purpleFooter').style.fill = 'white';
    }

    Array.from(document.getElementsByClassName('colorSelector')).forEach(function(item) {
      let actualColor = state.circleIdToColor[item.getAttribute('id')];
      if (actualColor == 'black'){
        item.setAttributeNS(null, 'fill', 'black');
      } else {
        item.setAttributeNS(null, 'fill', item.getAttribute('originalcolor'));
      }
      item.querySelector('circle').style.stroke = 'black';
      item.querySelector('circle').style.strokeWidth = '1';
    });
  }

};
