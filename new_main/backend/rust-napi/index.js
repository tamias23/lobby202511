/* Simplified NAPI loader — uses a single index.node binary */
const nativeBinding = require('./index.node');

const { 
    initGameStateNapi, 
    getLegalMovesNapi, 
    applyMoveNapi, 
    randomizeSetupNapi, 
    endTurnSetupNapi, 
    passTurnPlayingNapi 
} = nativeBinding;

module.exports.initGameStateNapi = initGameStateNapi;
module.exports.getLegalMovesNapi = getLegalMovesNapi;
module.exports.applyMoveNapi = applyMoveNapi;
module.exports.randomizeSetupNapi = randomizeSetupNapi;
module.exports.endTurnSetupNapi = endTurnSetupNapi;
module.exports.passTurnPlayingNapi = passTurnPlayingNapi;
