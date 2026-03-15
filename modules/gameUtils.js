/*
https://github.com/browserify/browserify
*/


const fs = require('fs');
let dataFolder = '../data/';
let boardFilename = 'noFilename';

//------------------------------------------------------------------------


const allPiecesDict = {
  'trifoxes' : 2,
  'goddess' : 1,
  'king' : 2,
  'soldier' : 9,
  'ghoul' : 9,
  'bishop' : 4,
  'mage' : 1,
  'siren' : 9
}



//------------------------------------------------------------------------



const { gameState, setGameState, getGameStateDeepCopy, saveGameStateToFile } = require('./gameState');
const { shuffleArray, getPolysClose, getRandomElement } = require('./boardMath');

function setDataFolder(dataFolder0){
  dataFolder = dataFolder0;
}

function getRandomFilename(){
  // console.log('Current directory: ' + process.cwd());
  const files = fs.readdirSync(dataFolder);
  const indice = Math.floor(Math.random() * (files.length)) 
  return files[indice].replace('_board.json', '');
}

function setPiecesAsGameBegins(){
  gameState.turnNumber = 0;
  gameState.turnStep = 'chooseColor';

  let colorFound = [];
  for (const k in gameState.board.allPolygons){
    colorFound.push(gameState.board.allPolygons[k].color);
  }
  gameState.colorSet = shuffleArray([...new Set(colorFound)]);
  gameState.listOfChoices = gameState.colorSet.map((x) => x);
  
  gameState.turnWhoIsToPlay = 'white';
  gameState.turnColorChosen = 'notYetChosen';
  
  gameState.board.allPieces = {};

  for (const color of ['white', 'yellow']){
    for (const [k, v] of Object.entries(allPiecesDict)) {
      for (let i = 0 ; i < v ; i++){
        let id = color + '_' + k + '_' + i;
        gameState.board.allPieces[id] = {
          color : color,
          id : id,
          position : 'returned',
          canMove : 1,
          isDeleted : 0,
          type : id.split('_')[1]
        };
      }
    }
  }
}

function identifyEdges(){
  gameState.board.topEdgepolys = [];
  gameState.board.bottomEdgepolys = [];
  for (const k in gameState.board.allPolygons){
    if ((gameState.board.allPolygons[k].points.length ) > gameState.board.allPolygons[k].neighbours.length && (gameState.board.allPolygons[k].center[1] < 63)) {
      if ((gameState.board.allPolygons[k].center[0] > 1) && (gameState.board.allPolygons[k].center[0] < (gameState.board.width - 1))) {
        gameState.board.topEdgepolys.push(k);
      }
    }
    if ((gameState.board.allPolygons[k].points.length ) > gameState.board.allPolygons[k].neighbours.length && (gameState.board.allPolygons[k].center[1] > (gameState.board.height - 63))) {
      if ((gameState.board.allPolygons[k].center[0] > 1) && (gameState.board.allPolygons[k].center[0] < (gameState.board.width - 1))) {
        gameState.board.bottomEdgepolys.push(k);
      }
    }
  }
}

function initBoardState(board) {
  board.allPieces = {};
  for (const id in board.allPolygons){
    board.allPolygons[id].isIn = 'empty';
  }
  gameState.board = board;
  gameState.turnNumber = 0;
  gameState.turnStep = 'chooseColor';
  gameState.turnWhoIsToPlay = 'white';
  setPiecesAsGameBegins();
  identifyEdges();

  let colorFound = [];
  for (const k in gameState.board.allPolygons){
    colorFound.push(gameState.board.allPolygons[k].color);
  }
  gameState.colorSet = shuffleArray([...new Set(colorFound)]);
  gameState.listOfChoices = gameState.colorSet.map((x) => x);
}

function loadRandomFilename(){
  boardFilename = getRandomFilename();
  gameState.boardId = boardFilename;
  const board = JSON.parse(fs.readFileSync(dataFolder + boardFilename + '_board.json'));  
  initBoardState(board);
}

function loadFilename(boardFilename0) {
  boardFilename = boardFilename0;
  gameState.boardId = boardFilename;
  const board = JSON.parse(fs.readFileSync(dataFolder + boardFilename + '_board.json'));  
  initBoardState(board);
}



function setPieceToPoly(mySelectPieceId, idPoly){
  // console.log('setPieceToPoly : ' + mySelectPieceId + ' ' + idPoly);
  gameState.board.allPieces[mySelectPieceId].position = idPoly;
  gameState.board.allPolygons[idPoly].isIn = mySelectPieceId;
}

function placeGoddessAndKings(lowerP = 3, higherP = 6) {
  for (const id in gameState.board.allPolygons){
    gameState.board.allPolygons[id].isIn = 'empty';
  }

  let color_Edges = {'white' : gameState.board.topEdgepolys, 'yellow' : gameState.board.bottomEdgepolys};

  for (const color of ['white', 'yellow']) {
    let goddessAndKingsKO = 1;
    while (goddessAndKingsKO) {
      let alreadyOccupied_temp = [];
      
      let randomPoly = getRandomElement(color_Edges[color]);
      alreadyOccupied_temp.push(randomPoly);
      setPieceToPoly(color + '_goddess_0', randomPoly);
      
      randomPoly = getRandomElement(color_Edges[color]);
      while(alreadyOccupied_temp.includes(randomPoly)){
        randomPoly = getRandomElement(color_Edges[color]);
      }
      alreadyOccupied_temp.push(randomPoly);
      setPieceToPoly(color + '_king_0', randomPoly);

      randomPoly = getRandomElement(color_Edges[color]);
      while(alreadyOccupied_temp.includes(randomPoly)){
        randomPoly = getRandomElement(color_Edges[color]);
      }
      alreadyOccupied_temp.push(randomPoly);
      setPieceToPoly(color + '_king_1', randomPoly);

      goddessAndKingsKO = 0;
      
      if (getPolysClose(color + '_king_0', higherP).includes(gameState.board.allPieces[color + '_king_1'].position)) {
        goddessAndKingsKO = 1;
      }
      if (getPolysClose(color + '_goddess_0', lowerP).includes(gameState.board.allPieces[color + '_king_0'].position) || !getPolysClose(color + '_goddess_0', higherP).includes(gameState.board.allPieces[color + '_king_0'].position)) {
        goddessAndKingsKO = 1;
      }
      if (getPolysClose(color + '_goddess_0', lowerP).includes(gameState.board.allPieces[color + '_king_1'].position) || !getPolysClose(color + '_goddess_0', higherP).includes(gameState.board.allPieces[color + '_king_1'].position)) {
        goddessAndKingsKO = 1;
      }

      if(goddessAndKingsKO){
        for (const id of [color + '_goddess_0', color + '_king_0', color + '_king_1']){
          if (gameState.board.allPieces[id].position !== 'returned') {
            gameState.board.allPolygons[gameState.board.allPieces[id].position].isIn = 'empty';
            gameState.board.allPieces[id].position = 'returned';
          }
        }
      }
    }
  }
}

// random initial setup
function setUpRandomly() {
  console.log('setUpRandomly() START');

  placeGoddessAndKings();
  
  let alreadyOccupied = [];
  alreadyOccupied.push(gameState.board.allPieces['white_king_0'].position);
  alreadyOccupied.push(gameState.board.allPieces['white_king_1'].position);
  alreadyOccupied.push(gameState.board.allPieces['white_goddess_0'].position);
  alreadyOccupied.push(gameState.board.allPieces['yellow_king_0'].position);
  alreadyOccupied.push(gameState.board.allPieces['yellow_king_1'].position);
  alreadyOccupied.push(gameState.board.allPieces['yellow_goddess_0'].position);

  //====================================================================================================

  for (const color of ['white', 'yellow']) {
    let set1_goddess = getPolysClose(color + '_goddess_0', 1);
    if (set1_goddess.length < 2) {
      set1_goddess = getPolysClose(color + '_goddess_0', 2);
    }

    let set1 = getPolysClose(color + '_king_0', 1);
    set1 = set1.concat(getPolysClose(color + '_king_1', 1));
    set1 = set1.concat(getPolysClose(color + '_goddess_0', 1));

    let set2 = getPolysClose(color + '_king_0', 2);
    set2 = set2.concat(getPolysClose(color + '_goddess_0', 2));
    set2 = set2.concat(getPolysClose(color + '_king_1', 2)).filter(x => set1.indexOf(x) === -1);


    let set3 = getPolysClose(color + '_king_0', 3);
    set3 = set3.concat(getPolysClose(color + '_goddess_0', 3));
    set3 = set3.concat(getPolysClose(color + '_king_1', 3)).filter(x => set2.indexOf(x) === -1);

    let set4 = getPolysClose(color + '_king_0', 4);
    set4 = set4.concat(getPolysClose(color + '_goddess_0', 4));
    set4 = set4.concat(getPolysClose(color + '_king_1', 4)).filter(x => set3.indexOf(x) === -1);

    set1_goddess = shuffleArray([...new Set(set1_goddess)]);
    set1 = shuffleArray([...new Set(set1)]);
    set2 = shuffleArray([...new Set(set2)]);
    set3 = shuffleArray([...new Set(set3)]);
    set4 = shuffleArray([...new Set(set4)]);
    //console.log(set1);
    //console.log(set4);

    {
      let k = 0;
      for (let i = 0; i < allPiecesDict['trifoxes']; i++) {
        while (gameState.board.allPolygons[set1_goddess[k]].isIn != 'empty'){
          k = k + 1;
        }
        setPieceToPoly(color + '_trifoxes_' + i, set1_goddess[k]);
      }
    }

    let setAll = [];
    for(const e of set1){
      setAll.push(e);
    }
    for(const e of set2){
      setAll.push(e);
    }
    for(const e of set3){
      setAll.push(e);
    }
    for(const e of set4){
      setAll.push(e);
    }

    let allPiecesToBeSet = [];

    
    let colorFound = [];
    let bishopToColor = {};
    {
      for (const idPoly of setAll) {
        colorFound.push(gameState.board.allPolygons[idPoly].color);
      }
      colorFound = shuffleArray([...new Set(colorFound)]);
      if (colorFound.length < 3){
        console.log('colorFound error ' + colorFound);
      }
      while (colorFound.length > 4){
        colorFound.pop();
      }
      while (colorFound.length > allPiecesDict['bishop']){
        colorFound.pop();
      }
      let compteurBishop = 0;
      for (const c of colorFound){
        bishopToColor[color + '_bishop_' + compteurBishop] = c;
        allPiecesToBeSet.push(color + '_bishop_' + compteurBishop);
        compteurBishop = compteurBishop + 1;
      }
    }
    //console.log(bishopToColor);


    for (let i = 0; i < allPiecesDict['ghoul']; i++) {
      allPiecesToBeSet.push(color + '_ghoul_' + i);
    }
    for (let i = 0; i < allPiecesDict['siren']; i++) {
      allPiecesToBeSet.push(color + '_siren_' + i);
    }
    //console.log(allPiecesToBeSet.length + ' ' + allPiecesToBeSet);
    //console.log(setAll.length + ' ' + setAll);



    let trifoxesColorNumber = {};
    for (const c of colorFound){
      trifoxesColorNumber[c] = 0;
    }

    for (let i = 0; i < allPiecesDict['trifoxes']; i++) {
      //console.log('||||||||||||| ' + JSON.stringify(gameState.board.allPieces[color + '_trifoxes_' + i]));
      let c = gameState.board.allPolygons[gameState.board.allPieces[color + '_trifoxes_' + i].position].color;
      trifoxesColorNumber[c] = trifoxesColorNumber[c] + 1;
    }
    //console.log('------------ ' + JSON.stringify(trifoxesColorNumber));



    let myCounter = 0;
    while(allPiecesToBeSet.length > 0){
      let p = allPiecesToBeSet.shift();
      let continuWhile = 1;
      while (continuWhile) {
        let idPoly = setAll[myCounter];
        if (gameState.board.allPolygons[idPoly].isIn === 'empty'){
          if(gameState.board.allPieces[p].type === 'soldier'){
            if (gameState.board.allPolygons[idPoly].color === soldierToColor[p]){
              setPieceToPoly(p, idPoly);
              continuWhile = 0;
              myCounter = 0;
            }
            else{
              myCounter = myCounter + 1;
            }
          }
          else if(gameState.board.allPieces[p].type === 'bishop'){
            if (gameState.board.allPolygons[idPoly].color === bishopToColor[p]){
              setPieceToPoly(p, idPoly);
              continuWhile = 0;
              myCounter = 0;
            }
            else{
              myCounter = myCounter + 1;
            }
          }
          else{
            setPieceToPoly(p, idPoly);
            continuWhile = 0;
            myCounter = myCounter + 1;
          }
        }
        else{
          myCounter = myCounter + 1;
        }
      }
    }

  }

  console.log('setUpRandomly() END');

}





//------------------------------------------------------------------------

exports.setDataFolder = setDataFolder;
exports.gameState = gameState;
exports.allPiecesDict = allPiecesDict;
exports.loadRandomFilename = loadRandomFilename;
exports.loadFilename = loadFilename;
exports.setUpRandomly = setUpRandomly;