function initializeClock(gameState) {
  let minStart = 15.0;
  gameState.timeInfo = {};
  gameState.timeInfo['timeWhite'] = minStart * 60 * 1000; // * 1000 for ms
  gameState.timeInfo['timeBlack'] = minStart * 60 * 1000;
  gameState.timeInfo['bronstein'] = 0 * 1000; //US delay
  gameState.timeInfo['increment'] = 2 * 1000; //US delay
  gameState.timeInfo['delayCorrection'] = 100; // 100ms delay corrected
  gameState.timeInfo['clockStart'] = Date.now();
  gameState.timeInfo['lastUpdate'] = Date.now();
  gameState.timeInfo['timeWhiteServer'] = minStart * 60 * 1000; // * 1000 for ms
  gameState.timeInfo['timeBlackServer'] = minStart * 60 * 1000;
  console.log('initializeClock ' + JSON.stringify(gameState.timeInfo));
}

function correctDelayAndBronstein(gameState, timeInfo){
  gameState.timeInfo['timeWhite'] = timeInfo['timeWhite'];
  gameState.timeInfo['timeBlack'] = timeInfo['timeBlack'];

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

  if(gameState.timeInfo['timeBlackServer'] !== gameState.timeInfo['timeBlack']){

    let serverMoveDuration = newLastUpdate - gameState.timeInfo['lastUpdate'];
    let before = gameState.timeInfo['timeBlackServer'];
    
    if((gameState.timeInfo['timeBlackServer'] - serverMoveDuration) < gameState.timeInfo['timeBlack']){
      gameState.timeInfo['timeBlackServer'] = gameState.timeInfo['timeBlackServer'] - serverMoveDuration + Math.min(
        (gameState.timeInfo['timeBlack'] - (gameState.timeInfo['timeBlackServer'] - serverMoveDuration)), gameState.timeInfo['delayCorrection']
        );
    }
    else{
      gameState.timeInfo['timeBlackServer'] = gameState.timeInfo['timeBlackServer'] - serverMoveDuration;
    }
    
    gameState.timeInfo['timeBlackServer'] = Math.min(gameState.timeInfo['timeBlackServer'] + gameState.timeInfo['bronstein'], before);// 2024116 
    gameState.timeInfo['timeBlackServer'] = gameState.timeInfo['timeBlackServer'] + gameState.timeInfo['increment'];// 2024116 
    gameState.timeInfo['timeBlack'] = Math.max(0, gameState.timeInfo['timeBlackServer']);
  }
  
  gameState.timeInfo['lastUpdate'] = Date.now();
}

exports.initializeClock = initializeClock;
exports.correctDelayAndBronstein = correctDelayAndBronstein;
