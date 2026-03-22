import { board, setBoard, whoAmI } from './state.js';
import { store } from './store.js';
const boardstate = store.getState();
import { getHashElementInGameUrl, sleep, calculateNewCoordinates } from './utils.js';
import { sendMessageFromClient } from './socketHandler.js';
import { hideColorSelectors, updateClock, updateClockRotated, toggleButtonVisibility } from './ui.js';
import { rotate } from './boardUtils.js';
import { mouseDown, mouseMove, mouseUp } from './dragDrop.js';
import { endOfTurn } from './gameLogic.js';

window.onload = function firstLaunch(evt) {
  boardstate.fullboardid = document.getElementById('board').getAttribute('fullboardid');
  console.log('fetching... ./data/' + boardstate.fullboardid + '_board.json');
  fetch('./data/' + boardstate.fullboardid + '_board.json')
    .then((response) => response.json())
    .then((json) => {
      afterLoadingData(json);
    });
}

function afterLoadingData(_board) {
  const currentUrl = window.location.href;
  boardstate.randomHash = getHashElementInGameUrl(currentUrl);
  
  sleep(500).then(() => {
    sendMessageFromClient(JSON.stringify({
      'my_boardid' : boardstate.fullboardid, 
      'randomHash' : boardstate.randomHash, 
      'whoAmI' : whoAmI, 
      'timeInfo' : boardstate.timeInfo
    }));
  });

  let textparts = document.getElementById('clockBlack').textContent.split(':');
  boardstate.timeInfo['timeWhite'] = (parseInt(textparts[0]) * 60 + parseInt(textparts[1])) * 1000;
  boardstate.timeInfo['timeBlack'] = boardstate.timeInfo['timeWhite'];

  hideColorSelectors();

  setBoard(_board);
  board.allPieces = {};
  boardstate.selectedElement = false;

  document.getElementById('myButtonEndTurn').querySelector('rect').style.fill = 'white';
  boardstate.actualBlackColor = document.getElementById('board').getAttribute('actualyellowcolor');
  document.getElementById('purpleFooter').style.fill = 'white';
  
  Array.from(document.getElementsByClassName('colorSelector')).forEach(function(item) {
    boardstate.circleIdToColor[item.getAttribute('id')] = item.getAttribute('color');
  });

  Array.from(document.getElementsByClassName('draggable')).forEach(element => {
    if (!board.allPieces.hasOwnProperty(element.id)) {
      board.allPieces[element.id] = {
        side : element.id.split('_')[0],
        id : element.id,
        initialTransform : '',
        position : 'returned',
        canMove : 1,
        type : element.id.split('_')[1]
      };
    }
  });

  board.topEdgepolys = [];
  board.bottomEdgepolys = [];
  for (const k in board.allPolygons){
    if ((board.allPolygons[k].points.length ) > board.allPolygons[k].neighbours.length & (board.allPolygons[k].center[1] < 63)) {
      if ((board.allPolygons[k].center[0] > 1) & (board.allPolygons[k].center[0] < (board.width - 1))) {
        board.topEdgepolys.push(k);
      }
    }
    if ((board.allPolygons[k].points.length ) > board.allPolygons[k].neighbours.length & (board.allPolygons[k].center[1] > (board.height - 63))) {
      if ((board.allPolygons[k].center[0] > 1) & (board.allPolygons[k].center[0] < (board.width - 1))) {
        board.bottomEdgepolys.push(k);
      }
    }
  }

  for (const k in board.allPolygons){
    const result = calculateNewCoordinates(board.allPolygons[k].center[0], board.allPolygons[k].center[1], 205, 205, 180);
    board.allPolygons[k].centerRotated = [result.x, result.y];
    document.getElementById(k).setAttributeNS(null, 'centerRotated', board.allPolygons[k].centerRotated);
  }

  for (const id in board.allPieces){
    let t_text = '';
    for (const t in document.getElementById(id).transform.baseVal){
      let myTransform = document.getElementById(id).transform.baseVal[t];
      if (myTransform.type == 2 ){
        t_text = t_text + 'translate(' + myTransform.matrix.e + ', ' + myTransform.matrix.f + ') ' ;
      }
      if (myTransform.type == 3){
        t_text = t_text + 'scale(' + myTransform.matrix.a + ') ' ;
      }
    }
    board.allPieces[id].initialTransform = t_text;
  }

  for (const id in board.allPolygons){
    board.allPolygons[id].isIn = 'empty';
  }

  Array.from(document.getElementsByClassName('draggable')).forEach(element => {
    if (element.classList.contains('soldier')) board.allPieces[element.id].centerTransform = [0, 0];
    if (element.classList.contains('goddess')) board.allPieces[element.id].centerTransform = [0, 0];
    if (element.classList.contains('bishop')) board.allPieces[element.id].centerTransform = [-40, -42];
    if (element.classList.contains('heroe')) board.allPieces[element.id].centerTransform = [-23, -85];
    if (element.classList.contains('mage')) board.allPieces[element.id].centerTransform = [-10, -9.3];
    if (element.classList.contains('ghoul')) board.allPieces[element.id].centerTransform = [-8, -7];
    if (element.classList.contains('siren')) board.allPieces[element.id].centerTransform = [0, 0];
    if (element.classList.contains('trifoxes')) board.allPieces[element.id].centerTransform = [0, 0];
  });

  setTimeout(() => {
    setUpIdentifyGoddessHeroesPositions();
  }, 0);

  bindEventListeners();

  setInterval(() => {
    if(!('timeSetOnClient' in boardstate.timeInfo)) {
      boardstate.timeInfo['timeSetOnClient'] = Date.now();
    }
    let tempDateNow = Date.now();
    
    if(boardstate.setupIsDone === 'yes'){
      if(boardstate.whoseTurnItIs === 'white'){
        boardstate.timeInfo['timeWhite'] = boardstate.timeInfo['timeWhite'] - tempDateNow + boardstate.timeInfo['timeSetOnClient'];
      } else {
        boardstate.timeInfo['timeBlack'] = boardstate.timeInfo['timeBlack'] - tempDateNow + boardstate.timeInfo['timeSetOnClient'];
      }
    } else {
      let howManyPiecesSetW = 0;
      for (const id in board.allPieces){
        if(board.allPieces[id].position === 'returned' && board.allPieces[id].side === 'white'){
          howManyPiecesSetW++;
        }
      }
      if (howManyPiecesSetW > 0) {         
        boardstate.timeInfo['timeWhite'] = boardstate.timeInfo['timeWhite'] - tempDateNow + boardstate.timeInfo['timeSetOnClient'];
      }
      
      let howManyPiecesSetY = 0;
      for (const id in board.allPieces){
        if(board.allPieces[id].position === 'returned' && board.allPieces[id].side === 'black'){
          howManyPiecesSetY++;
        }
      }
      if (howManyPiecesSetY > 0) {         
        boardstate.timeInfo['timeBlack'] = boardstate.timeInfo['timeBlack'] - tempDateNow + boardstate.timeInfo['timeSetOnClient'];
      }
    }

    if (boardstate.boardRotated === 'yes') {
      updateClockRotated();
    } else {
      updateClock();
    }
    boardstate.timeInfo['timeSetOnClient'] = tempDateNow;
  }, 130);
}

function bindEventListeners() {
  const boardEl = document.getElementById('board');
  
  boardEl.addEventListener('mousedown', mouseDown);
  boardEl.addEventListener('touchstart', (evt) => { evt.preventDefault(); mouseDown(evt); });

  boardEl.addEventListener('mousemove', mouseMove);
  boardEl.addEventListener('touchmove', mouseMove);

  boardEl.addEventListener('mouseup', mouseUp);
  boardEl.addEventListener('touchend', mouseUp);

  document.addEventListener('contextmenu', (event) => { event.preventDefault(); });

  let btnSetup = document.getElementById('myButtonSetupRandomly');
  if (btnSetup) {
    btnSetup.addEventListener('click', () => {
      sendMessageFromClient(JSON.stringify({'setUpRandomly' : '', 'randomHash' : boardstate.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : boardstate.timeInfo}));
    });
    btnSetup.addEventListener('touchstart', () => {
      sendMessageFromClient(JSON.stringify({'setUpRandomly' : '', 'randomHash' : boardstate.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : boardstate.timeInfo}));
    });
  }

  let btnRotate = document.getElementById('myButton5');
  if (btnRotate) {
    btnRotate.addEventListener('click', rotate);
    btnRotate.addEventListener('touchstart', rotate);
  }

  let btnEndTurn = document.getElementById('myButtonEndTurn');
  if (btnEndTurn) {
    let lastEndTurnTime = 0;
    const et = (evt) => {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      const now = Date.now();
      if (now - lastEndTurnTime < 500) return;
      lastEndTurnTime = now;

      if(boardstate.colorChosen !== 'noColor'){
        sendMessageFromClient(JSON.stringify({'endOfTurn' : {'whoseTurnItIs' : boardstate.whoseTurnItIs}, 'randomHash' : boardstate.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : boardstate.timeInfo}));
      }
    };
    btnEndTurn.addEventListener('click', et);
    btnEndTurn.addEventListener('touchstart', et);
  }

  let btnNewBoard = document.getElementById('myButtonNewBoardRequested');
  if (btnNewBoard) {
    const nb = () => {
      if(boardstate.newBoardRequested === 'no'){
        boardstate.newBoardRequested = 'yes';
        sleep(500).then(() => {
          sendMessageFromClient(JSON.stringify({'newBoardRequested' : whoAmI, 'randomHash' : boardstate.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : boardstate.timeInfo}));
        });
      }
    };
    btnNewBoard.addEventListener('click', nb);
    btnNewBoard.addEventListener('touchstart', nb);
  }

  Array.from(document.getElementsByClassName('colorSelector')).forEach(item1 => {
    const sel = () => {
      if (item1.getAttribute('fill') !== 'black' && boardstate.colorChosen === 'noColor'){
        sendMessageFromClient(JSON.stringify({'colorSelection' : item1.getAttribute('color'), 'randomHash' : boardstate.randomHash, 'whoAmI' : whoAmI, 'timeInfo' : boardstate.timeInfo}));

        Array.from(document.getElementsByClassName('colorSelector')).forEach(item2 => {
          if (item2.id !== item1.id){
            item2.setAttributeNS(null, 'fill', 'black');
          } else {
            if (item1.getAttribute('fill') !== 'black'){
              boardstate.colorChosen = item1.getAttribute('color');
              item2.querySelector('circle').style.stroke = 'aquamarine';
              item2.querySelector('circle').style.strokeWidth = '3';
            }
          }
        });
      }
    };
    item1.addEventListener('click', sel);
    item1.addEventListener('touchstart', sel);
  });
}

function setPieceToPolyFake(mySelectPieceId, idPoly){
  board.allPieces[mySelectPieceId].position = idPoly;
  board.allPolygons[idPoly].isIn = mySelectPieceId;
}

function setUpIdentifyGoddessHeroesPositions() {
  for (const id in board.allPolygons){
    board.allPolygons[id].isIn = 'empty';
  }

  let lowerP = 1;
  let higherP = 2;
  
  let color_Edges = {'white' : board.topEdgepolys, 'black' : board.bottomEdgepolys};

  for (let i=0;i<300;i++) {
    for (const side of ['white', 'black']) {
      let goddessAndHeroesKO = 1;
      while (goddessAndHeroesKO) {
        let alreadyOccupied_temp = [];
        let randomPoly = color_Edges[side][Math.floor(Math.random() * color_Edges[side].length)];
        alreadyOccupied_temp.push(randomPoly);
        setPieceToPolyFake(side + '_goddess_0', randomPoly);
        
        randomPoly = color_Edges[side][Math.floor(Math.random() * color_Edges[side].length)];
        while(alreadyOccupied_temp.includes(randomPoly)){
          randomPoly = color_Edges[side][Math.floor(Math.random() * color_Edges[side].length)];
        }
        alreadyOccupied_temp.push(randomPoly);
        setPieceToPolyFake(side + '_heroe_0', randomPoly);

        randomPoly = color_Edges[side][Math.floor(Math.random() * color_Edges[side].length)];
        while(alreadyOccupied_temp.includes(randomPoly)){
          randomPoly = color_Edges[side][Math.floor(Math.random() * color_Edges[side].length)];
        }
        alreadyOccupied_temp.push(randomPoly);
        setPieceToPolyFake(side + '_heroe_1', randomPoly);

        goddessAndHeroesKO = 0;
        
        const getPolysCloseLocal = (selectedPiece, d) => {
          let toBeReturned = [board.allPieces[selectedPiece].position];
          let alreadyTested = [];
          for (let compteur=0; compteur < d; compteur++){
            let temp = [];
            toBeReturned = [...new Set(toBeReturned)];
            for (const e of toBeReturned){
              if(!alreadyTested.includes(e)) {
                for (const n1 of board.allPolygons[e].neighbours){
                  temp.push(n1);
                }
                alreadyTested.push(e);
              }
            }
            toBeReturned = toBeReturned.concat(temp);
          }
          return [...new Set(toBeReturned)];
        };

        if (getPolysCloseLocal(side + '_heroe_0', higherP).includes(board.allPieces[side + '_heroe_1'].position)) {
          goddessAndHeroesKO = 1;
        }
        else if (getPolysCloseLocal(side + '_goddess_0', lowerP).includes(board.allPieces[side + '_heroe_0'].position)){
          goddessAndHeroesKO = 1;
        }
        else if (!getPolysCloseLocal(side + '_goddess_0', higherP).includes(board.allPieces[side + '_heroe_0'].position)) {
          goddessAndHeroesKO = 1;
        }
        else if (getPolysCloseLocal(side + '_goddess_0', lowerP).includes(board.allPieces[side + '_heroe_1'].position)){
          goddessAndHeroesKO = 1;
        }
        else if (!getPolysCloseLocal(side + '_goddess_0', higherP).includes(board.allPieces[side + '_heroe_1'].position)) {
          goddessAndHeroesKO = 1;
        }

        if(goddessAndHeroesKO){
          for (const id of [side + '_goddess_0', side + '_heroe_0', side + '_heroe_1']){
            if (board.allPieces[id].position !== 'returned') {
              board.allPolygons[board.allPieces[id].position].isIn = 'empty';
              board.allPieces[id].position = 'returned';
            }
          }
        } else {
          boardstate.possibleSetupGoddessHeroes[side].push(board.allPieces[side + '_goddess_0'].position + ' ' + board.allPieces[side + '_heroe_0'].position + ' '+ board.allPieces[side + '_heroe_1'].position);
          for (const id of [side + '_goddess_0', side + '_heroe_0', side + '_heroe_1']){
            if (board.allPieces[id].position !== 'returned') {
              board.allPolygons[board.allPieces[id].position].isIn = 'empty';
              board.allPieces[id].position = 'returned';
            }
          }
        }
      }
    }
  }

  for (const side of ['white', 'black']) {
    for (const id of [side + '_goddess_0', side + '_heroe_0', side + '_heroe_1']){
      if (board.allPieces[id].position !== 'returned') {
        board.allPolygons[board.allPieces[id].position].isIn = 'empty';
        board.allPieces[id].position = 'returned';
      }
    }
  }

  boardstate.possibleSetupGoddessHeroes['black'] = [...new Set(boardstate.possibleSetupGoddessHeroes['black'])];
  boardstate.possibleSetupGoddessHeroes['white'] = [...new Set(boardstate.possibleSetupGoddessHeroes['white'])];
}
