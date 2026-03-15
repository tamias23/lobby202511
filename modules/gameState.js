const fs = require('fs');

let gameState = {
  boardId : '',
  hasWon : '',
  white : '',
  yellow : '',
  colorSet : '',
  turnNumber : 0,
  turnStep : 'chooseColor',
  listOfChoices : '',
  turnWhoIsToPlay : 'white',
  turnColorChosen : 'notYetChosen',
  board : '',
  kingHasTaken : 'no',
  timeInfo : {}
}


// myDict can be incomplete
function setGameState(myDict){
  if (!myDict) return;
  for (const [k, v] of Object.entries(myDict)) {
    gameState[k] = JSON.parse(JSON.stringify(v));
  }
}

function getGameStateDeepCopy(){
  return JSON.parse(JSON.stringify(gameState));
}

function saveGameStateToFile(){
  fs.writeFileSync('gameState.json', JSON.stringify(gameState, null, 2));
}

exports.gameState = gameState;
exports.setGameState = setGameState;
exports.getGameStateDeepCopy = getGameStateDeepCopy;
exports.saveGameStateToFile = saveGameStateToFile;
