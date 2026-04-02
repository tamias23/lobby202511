import { board, whoAmI } from './state.js';
import { store } from './store.js';
const boardstate = store.getState();
import { toggleButtonVisibility, setButtonAndFooterColor } from './ui.js';
import { rotate, setPieceToPoly, removePieceFromGame, removeConnex, removeAdjacent } from './boardUtils.js';
import { endOfTurn, setSirenNeighbors, updateSetupVisibility } from './gameLogic.js';
import { sleep, getDistanceBetweenPoly, shuffleArray } from './utils.js';
import { showColorSelectors } from './ui.js';

export const webSocket = io('/game');

webSocket.on('connect', () => {
  console.log('connected');
});

export function sendMessageFromClient(text) {
  webSocket.emit('message', text);
  const myMessage = JSON.parse(text);
  const typeOfMessage = Object.keys(myMessage)[0];
  playAction(typeOfMessage, myMessage[typeOfMessage]);
}

const audioMove = new Audio('sounds/assets_sounds_standard_move.mp3');

export function playAction(typeOfMessage, message) {
  console.log('playAction // typeOfMessage = ' + typeOfMessage);
  console.log('playAction // message = ' + JSON.stringify(message));

  switch(typeOfMessage) {
    case 'timeInfo':
      console.log('timeInfo ' +  message);
      boardstate.timeInfo = message;
      break;
    case 'newBoardRequested':
      window.location.reload();
      boardstate.boardRotated = 'no';
      boardstate.newBoardRequested = 'no';
      boardstate.timeInfo = message.timeInfo;
      sleep(200).then(() => {
        let myButtonSetupRandomly = document.getElementById('myButtonSetupRandomly');
        if (myButtonSetupRandomly) toggleButtonVisibility(myButtonSetupRandomly);
      });
      break;
    case 'initialSetup':
      if (boardstate.boardRotated === 'yes') {
        rotate();          
      }

      for (let id in board.allPieces){
        let e = document.getElementById(id);
        e.setAttributeNS(null, 'transform', board.allPieces[id].initialTransform);
        if (board.allPieces[id].position !== 'returned') {
          board.allPolygons[board.allPieces[id].position].isIn = 'empty';
          board.allPieces[id].position = 'returned';
        }
      }

      for (const piece in message){
        if (message[piece] !== 'returned') {
          setPieceToPoly(piece, message[piece]);
        }
      }

      if (boardstate.boardRotated === 'yes') {
        for (let id in board.allPieces){
          let p = document.getElementById(id);
          let rotatePiece = 'rotate(180, 205, 205) rotate(180, ' + board.allPolygons[board.allPieces[id].position].center[0] + ', ' + board.allPolygons[board.allPieces[id].position].center[1] + ') ';
          p.setAttributeNS(null, 'transform', rotatePiece + p.getAttribute('transform'));
        }
      }
      boardstate.setupIsDone = 'yes';
      updateSetupVisibility();
      showColorSelectors();
      let myButtonSetupRandomly = document.getElementById('myButtonSetupRandomly');
      let myButtonNewBoardRequested = document.getElementById('myButtonNewBoardRequested');
      if (myButtonSetupRandomly && myButtonSetupRandomly.style.visibility == 'visible'){
        toggleButtonVisibility(myButtonSetupRandomly);
        if(myButtonNewBoardRequested) toggleButtonVisibility(myButtonNewBoardRequested);
      }
      boardstate.whoseTurnItIs = shuffleArray(['white', 'white'])[0];
      setButtonAndFooterColor();
      break;
    case 'endOfTurn':
      endOfTurn();
      break;
    case 'colorSelection':
      console.log('colorSelection : ' + message);
      boardstate.colorChosen = message;

      Array.from(document.getElementsByClassName('colorSelector')).forEach(
        function(item2){
          if (item2.getAttribute('color') !== boardstate.colorChosen){
            item2.setAttributeNS(null, 'fill', 'black');
          } else {
            if (boardstate.colorChosen !== 'black'){
              item2.querySelector('circle').style.stroke = 'aquamarine';
              item2.querySelector('circle').style.strokeWidth = '3';
            }
          }
        });
      break;
    case 'legalMoveA':
      {
        const mySelectPieceId = message.mySelectPieceId;
        boardstate.draggedOn = message.draggedOn;
        let thisIsTheEndOfTurn = false;
        if (board.allPieces[mySelectPieceId].position === 'returned'){
          thisIsTheEndOfTurn = true;
        }

        setPieceToPoly(message.mySelectPieceId, message.draggedOn);

        if(board.allPieces[mySelectPieceId].type == 'bishop'){
          removeAdjacent(boardstate.draggedOn, board.allPieces[mySelectPieceId].side);
        }

        if (board.allPolygons[boardstate.draggedOn].color === boardstate.colorChosen){
          if((board.allPieces[mySelectPieceId].type !== 'soldier' && board.allPieces[mySelectPieceId].type !== 'berserker') | thisIsTheEndOfTurn){
            endOfTurn();
          }
          else if(board.allPieces[mySelectPieceId].type === 'soldier' | board.allPieces[mySelectPieceId].type === 'berserker'){
            boardstate.soldierIsMoving = mySelectPieceId;
          }
        } else {
          boardstate.soldierIsMoving = 'no';
        }

        boardstate.heroeHasTaken = 'no';
        boardstate.heroeHasTakenCounter = 0;

        if(boardstate.soldierIsMoving != 'no'){
          setSirenNeighbors();
          if(board.allPieces[boardstate.soldierIsMoving].canMove === 0) {
            endOfTurn();
          }
        }

        audioMove.play().catch(e => console.log('Audio error:', e));

        let howManyPiecesSet = 0;
        for (const id in board.allPieces){
          if(board.allPieces[id].position !== 'returned'){
            howManyPiecesSet = howManyPiecesSet + 1;
          }
        }
        if (boardstate.setupIsDone === 'no' && howManyPiecesSet == 54) {
          boardstate.setupIsDone = 'yes';
          updateSetupVisibility();
          showColorSelectors();
          let btnSetup = document.getElementById('myButtonSetupRandomly');
          let btnNewBoard = document.getElementById('myButtonNewBoardRequested');
          if (btnSetup && btnSetup.style.visibility == 'visible'){
            toggleButtonVisibility(btnSetup);
            if(btnNewBoard) toggleButtonVisibility(btnNewBoard);
          }
          boardstate.whoseTurnItIs = shuffleArray(['white', 'white'])[0];
          setButtonAndFooterColor();
        }
      }
      break;
    case 'legalMoveB':
      {
        const mySelectPieceId = message.mySelectPieceId;
        boardstate.draggedOn = message.draggedOn;
        
        boardstate.animation_delay = (getDistanceBetweenPoly(board.allPieces[mySelectPieceId].position, boardstate.draggedOn) / 200) * boardstate.animation_duration;

        if(board.allPieces[mySelectPieceId].type == 'mage'){
          removeConnex(boardstate.draggedOn);
        } else {
          let targetPieceId = board.allPolygons[boardstate.draggedOn].isIn;
          if (targetPieceId !== 'empty') {
            removePieceFromGame(targetPieceId);
          }
        }

        setPieceToPoly(message.mySelectPieceId, message.draggedOn);

        if (board.allPolygons[boardstate.draggedOn].color === boardstate.colorChosen){
          if(board.allPieces[mySelectPieceId].type !== 'soldier' && board.allPieces[mySelectPieceId].type !== 'berserker'){
            endOfTurn();
          } else if(board.allPieces[mySelectPieceId].type === 'heroe' && boardstate.heroeHasTakenCounter >= boardstate.heroeHasTakenCounterMax) {
            boardstate.heroeHasTakenCounter = 0;
            endOfTurn();
          } else if(board.allPieces[mySelectPieceId].type === 'soldier' | board.allPieces[mySelectPieceId].type === 'berserker'){
            boardstate.soldierIsMoving = mySelectPieceId;
          }
        } else {
          boardstate.soldierIsMoving = 'no';
        }

        if (board.allPieces[mySelectPieceId].type === 'heroe' && boardstate.heroeHasTakenCounter < boardstate.heroeHasTakenCounterMax){
          boardstate.heroeHasTaken = mySelectPieceId;
          boardstate.heroeHasTakenCounter = boardstate.heroeHasTakenCounter + 1;
          if (boardstate.heroeHasTakenCounter == boardstate.heroeHasTakenCounterMax){
            if (board.allPolygons[boardstate.draggedOn].color === boardstate.colorChosen){
              endOfTurn();
            } else {
              board.allPieces[mySelectPieceId].canMove === 0;
              boardstate.heroeHasTaken = 'no';
              boardstate.heroeHasTakenCounter = 0;
            }
          } else if (board.allPolygons[boardstate.draggedOn].color === boardstate.colorChosen){
            setSirenNeighbors();
            if(board.allPieces[mySelectPieceId].canMove === 0) {
              endOfTurn();
            }
          }
        }

        if(boardstate.soldierIsMoving != 'no'){
          setSirenNeighbors();
          if(board.allPieces[boardstate.soldierIsMoving].canMove === 0) {
            endOfTurn();
          }
        }
        audioMove.play().catch(e => console.log('Audio error:', e));
      }
      break;
  }
}

webSocket.on('message', (data) => {
  const myMessage = JSON.parse(data);
  const typeOfMessage = Object.keys(myMessage)[0];
  console.log('typeOfMessage ' + typeOfMessage);
  const whoIsIt = myMessage['whoAmI'];
  boardstate.timeInfo = myMessage['timeInfo'];
  boardstate.timeInfo['timeSetOnClient'] = Date.now();

  if(boardstate.randomHash == myMessage['randomHash']){
    if (whoIsIt !== whoAmI | typeOfMessage === 'newBoardRequested'){
      playAction(typeOfMessage, myMessage[typeOfMessage]);
    }
  }
});
