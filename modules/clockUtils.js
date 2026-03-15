function initializeClock(gameState) {
  let minStart = 15.0;
  gameState.timeInfo = {};
  gameState.timeInfo['timeWhite'] = minStart * 60 * 1000; // * 1000 for ms
  gameState.timeInfo['timeYellow'] = minStart * 60 * 1000;
  gameState.timeInfo['bronstein'] = 0 * 1000; //US delay
  gameState.timeInfo['increment'] = 2 * 1000; //US delay
  gameState.timeInfo['delayCorrection'] = 100; // 100ms delay corrected
  gameState.timeInfo['clockStart'] = Date.now();
  gameState.timeInfo['lastUpdate'] = Date.now();
  gameState.timeInfo['timeWhiteServer'] = minStart * 60 * 1000; // * 1000 for ms
  gameState.timeInfo['timeYellowServer'] = minStart * 60 * 1000;
  console.log('initializeClock ' + JSON.stringify(gameState.timeInfo));
}

function correctDelayAndBronstein(gameState, timeInfo){
  gameState.timeInfo['timeWhite'] = timeInfo['timeWhite'];
  gameState.timeInfo['timeYellow'] = timeInfo['timeYellow'];

  let newLastUpdate = Date.now();

  if(gameState.timeInfo['timeWhiteServer'] !== gameState.timeInfo['timeWhite']){

    let serverMoveDuration = newLastUpdate - gameState.timeInfo['lastUpdate'];
    let before = gameState.timeInfo['timeWhiteServer'];
    
    if((gameState.timeInfo['timeWhiteServer'] - serverMoveDuration) < gameState.timeInfo['timeWhite']){
      gameState.timeInfo['timeWhiteServer'] = gameState.timeInfo['timeWhiteServer'] - serverMoveDuration + Math.min(
        (gameState.timeInfo['timeWhite'] - (gameState.timeInfo['timeWhiteServer'] - serverMoveDuration)), gameState.timeInfo['delayCorrection']
        );
    }
    else{
      gameState.timeInfo['timeWhiteServer'] = gameState.timeInfo['timeWhiteServer'] - serverMoveDuration;
    }
    
    gameState.timeInfo['timeWhiteServer'] = Math.min(gameState.timeInfo['timeWhiteServer'] + gameState.timeInfo['bronstein'], before);// 2024116 
    gameState.timeInfo['timeWhiteServer'] = gameState.timeInfo['timeWhiteServer'] + gameState.timeInfo['increment'];// 2024116 
    gameState.timeInfo['timeWhite'] = Math.max(0, gameState.timeInfo['timeWhiteServer']);
  }

  if(gameState.timeInfo['timeYellowServer'] !== gameState.timeInfo['timeYellow']){

    let serverMoveDuration = newLastUpdate - gameState.timeInfo['lastUpdate'];
    let before = gameState.timeInfo['timeYellowServer'];
    
    if((gameState.timeInfo['timeYellowServer'] - serverMoveDuration) < gameState.timeInfo['timeYellow']){
      gameState.timeInfo['timeYellowServer'] = gameState.timeInfo['timeYellowServer'] - serverMoveDuration + Math.min(
        (gameState.timeInfo['timeYellow'] - (gameState.timeInfo['timeYellowServer'] - serverMoveDuration)), gameState.timeInfo['delayCorrection']
        );
    }
    else{
      gameState.timeInfo['timeYellowServer'] = gameState.timeInfo['timeYellowServer'] - serverMoveDuration;
    }
    
    gameState.timeInfo['timeYellowServer'] = Math.min(gameState.timeInfo['timeYellowServer'] + gameState.timeInfo['bronstein'], before);// 2024116 
    gameState.timeInfo['timeYellowServer'] = gameState.timeInfo['timeYellowServer'] + gameState.timeInfo['increment'];// 2024116 
    gameState.timeInfo['timeYellow'] = Math.max(0, gameState.timeInfo['timeYellowServer']);
  }
  
  gameState.timeInfo['lastUpdate'] = Date.now();
}

exports.initializeClock = initializeClock;
exports.correctDelayAndBronstein = correctDelayAndBronstein;
