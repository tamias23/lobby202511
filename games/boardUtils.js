import { boardstate, board } from './state.js';
import { 
  mySetTranslate, 
  iterTransforms, 
  getFloatValue, 
  getDistanceBetweenKeyframes, 
  iterTransformsGetScale,
  sleep 
} from './utils.js';

export function setPieceToPolyFake(mySelectPieceId, idPoly) {
  board.allPieces[mySelectPieceId].position = idPoly;
  board.allPolygons[idPoly].isIn = mySelectPieceId;
}

export function setPieceToPoly(mySelectPieceId, idPoly) {
  let selectedElement = document.getElementById(mySelectPieceId);
  let tempA = iterTransforms(selectedElement);

  if(boardstate.boardRotated === 'yes') {
    mySetTranslate(selectedElement, board.allPieces[mySelectPieceId].centerTransform[0] + board.allPolygons[idPoly].centerRotated[0], board.allPieces[mySelectPieceId].centerTransform[1] + board.allPolygons[idPoly].centerRotated[1]);
  } else {
    mySetTranslate(selectedElement, board.allPieces[mySelectPieceId].centerTransform[0] + board.allPolygons[idPoly].center[0], board.allPieces[mySelectPieceId].centerTransform[1] + board.allPolygons[idPoly].center[1]);
  }

  let tempB = iterTransforms(selectedElement);
  let myDistanceToTravel = getFloatValue(getDistanceBetweenKeyframes(tempA, tempB));

  const keyframes = [
    { transform: tempA },
    { transform: tempB}
  ];

  boardstate.animation_duration_lastMove = (myDistanceToTravel / 200) * boardstate.animation_duration;
  boardstate.animation_delay = boardstate.animation_duration_lastMove;
  
  const animation = selectedElement.animate(
    keyframes,
    {
      duration: boardstate.animation_duration_lastMove
    }
  );
  animation.play();

  if (board.allPieces[mySelectPieceId].position !== 'returned') {
    board.allPolygons[board.allPieces[mySelectPieceId].position].isIn = 'empty';
  }
  board.allPieces[mySelectPieceId].position = idPoly;
  board.allPolygons[idPoly].isIn = mySelectPieceId;
}

export function removePieceFromGame(id) {
  let selectedElement = document.getElementById(id);
  let tempA = iterTransforms(selectedElement);

  let howManyAlreadyReturned = 0;
  for (const id2 in board.allPieces) {
    if (board.allPieces[id2].type === board.allPieces[id].type && board.allPieces[id2].color === board.allPieces[id].color && board.allPieces[id2].position === 'returned') {
      howManyAlreadyReturned = howManyAlreadyReturned + 1;
    }
  }
  
  let tempB = board.allPieces[id].initialTransform.replace(',', 'px,').replace(') s', 'px) s');
  let myDistanceToTravel = getFloatValue(getDistanceBetweenKeyframes(tempA, tempB));
  let myDuration = (myDistanceToTravel / 200) * boardstate.animation_duration;

  if (howManyAlreadyReturned >= 10 && board.allPieces[id].type != 'soldier') {
    const keyframes = [
      { transform: tempA },
      { transform: tempB}
    ];

    const animation = selectedElement.animate(
      keyframes,
      {
        delay: boardstate.animation_delay, 
        duration: myDuration / 2.0
      }
    );
    animation.play();

    if (board.allPieces[id].position !== 'returned') {
      board.allPolygons[board.allPieces[id].position].isIn = 'empty';
    }

    delete board.allPieces[id];

    sleep(boardstate.animation_delay + myDuration / 2.0).then(() => {
      selectedElement.remove();
      boardstate.piecesRemoved.push(id);
    });
  } else {
    if (board.allPieces[id].position !== 'returned') {
      board.allPolygons[board.allPieces[id].position].isIn = 'empty';
    }

    board.allPieces[id]['position'] = 'returned';
    board.allPieces[id]['canMove'] = 1;

    const keyframes = [
      { transform: tempA },
      { transform: tempB}
    ];

    const animation = selectedElement.animate(
      keyframes,
      {
        delay: boardstate.animation_delay,
        duration: myDuration / 2.0
      }
    );
    animation.play();
    
    sleep(boardstate.animation_delay + myDuration / 2.0).then(() => {
      selectedElement.setAttributeNS(null, 'transform', board.allPieces[id].initialTransform);
    });
  }
}

export function removeAdjacent(idPoly, color) {
  for (let k of board.allPolygons[idPoly].neighbors) {
    if (board.allPolygons[k].isIn !== 'empty') {
      if (board.allPieces[board.allPolygons[k].isIn].color !== color && board.allPieces[board.allPolygons[k].isIn].type !== 'trifoxes') {
        removePieceFromGame(board.allPolygons[k].isIn);
      }
    }
  }
}

export function removeConnex(idPoly) {
  let targetColor = board.allPieces[board.allPolygons[idPoly].isIn].color;
  let toBeChecked = [idPoly];

  let popped = toBeChecked.pop();
  if (board.allPolygons[popped].isIn !== 'empty') {
    if (board.allPieces[board.allPolygons[popped].isIn].color === targetColor && board.allPieces[board.allPolygons[popped].isIn].type !== 'trifoxes') {
      for (let k of board.allPolygons[popped].neighbors){
        toBeChecked.push(k);
      }
      removePieceFromGame(board.allPolygons[popped].isIn);
    }
  }

  while(toBeChecked.length > 0) {
    popped = toBeChecked.pop();
    if (board.allPolygons[popped].isIn !== 'empty') {
      if (board.allPieces[board.allPolygons[popped].isIn].color === targetColor && board.allPieces[board.allPolygons[popped].isIn].type !== 'trifoxes') {
        removePieceFromGame(board.allPolygons[popped].isIn);
      }
    }
  }
}

export function rotate() {
  let b = document.getElementById('boardOfPolys');
  if (boardstate.boardRotated === 'no') {
    boardstate.boardRotated = 'yes';
    b.setAttributeNS(null, 'transform', 'translate(200, 10) rotate(180, 205, 205) scale(1.0)');
    for (let id in board.allPieces){
      if (board.allPieces[id].position !== 'returned'){
        let p = document.getElementById(id);
        p.setAttributeNS(null, 'transform', 'translate(' + (board.allPolygons[board.allPieces[id].position].centerRotated[0] + board.allPieces[id].centerTransform[0]) + ', ' + (board.allPolygons[board.allPieces[id].position].centerRotated[1] + board.allPieces[id].centerTransform[1]) + ') scale(' + iterTransformsGetScale(p) + ')');
      }
    }
  } else {
    boardstate.boardRotated = 'no';
    b.setAttributeNS(null, 'transform', 'translate(200, 10) scale(1.0)');
    for (let id in board.allPieces) {
      if (board.allPieces[id].position !== 'returned') {
        let p = document.getElementById(id);
        p.setAttributeNS(null, 'transform', 'translate(' + (board.allPolygons[board.allPieces[id].position].center[0] + board.allPieces[id].centerTransform[0]) + ', ' + (board.allPolygons[board.allPieces[id].position].center[1] + board.allPieces[id].centerTransform[1]) + ') scale(' + iterTransformsGetScale(p) + ')');
      }
    }
  }
}
