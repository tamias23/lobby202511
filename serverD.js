const os = require('os');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;
const dynamicRouter = express.Router();
const staticPath = path.join(__dirname, '.');

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use(express.static(staticPath));

//const myIp = '192.168.1.157';
let myIp = '';
{
  const interfaces = os.networkInterfaces();
  for (const deviceName in interfaces) {
    console.log(JSON.stringify(deviceName));
    for (const i of interfaces[deviceName]) {
      console.log('    ' + i.family + ' ' + i.address + ' ' + i.internal);
      if (i.family === 'IPv4' && i.internal === false) {
        console.log('    **** chosen => ' + i.address + ' ****');
        myIp = i.address;
      }
    }
  }
}

/*********************************************************************************/

var gameUtils = require('./modules/gameUtils');
var clockUtils = require('./modules/clockUtils');
var { gameState, setGameState, getGameStateDeepCopy, saveGameStateToFile } = require('./modules/gameState');
var createMush = require('./modules/createMush06');
gameUtils.setDataFolder('./games/data/');
createMush.setDataFolder('./games/data/');

/*********************************************************************************/

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addDynamicRoute(path, handler) {
  dynamicRouter.get(path, handler);
}

function constructRandomUrl(randomHash, protocol = 'http') {
  return `${protocol}://${myIp}:${port}/games/${randomHash}`;
}

function getRandomHash() {
  return crypto.randomBytes(16).toString('hex');
}

/*********************************************************************************/

const wsClients_to_hash = {};
const hash_to_wsClients = {};
const hash_to_boardId = {};
const allGameStates = {}; // indexed by hash

/*********************************************************************************/

app.use('/games/', dynamicRouter);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index2.html');
});

/*app.get('/rules', (req, res) => {
  res.sendFile(__dirname + '/Rules20241025.pdf');
  //res.sendFile(__dirname + '/Rules20241025.png');
});*/

app.get('/create_game', (req, res) => {
  const randomHash = 'ec74428d6356f7a841d93c4989624270'; //getRandomHash();
  const url = constructRandomUrl(randomHash);
  console.log('url : ' + url);
  gameUtils.loadRandomFilename();
  gameState.randomHash = randomHash;
  clockUtils.initializeClock(gameState);
  allGameStates[randomHash] = getGameStateDeepCopy(gameState);
  addDynamicRoute(`/${randomHash}`, (req, res) => {
    if (randomHash in hash_to_boardId) {
      //do nothing
      setGameState(allGameStates[randomHash]);
    }
    else{
      hash_to_boardId[randomHash] = gameState.boardId;
    }
    
    sleep(50).then(() => {
      res.setHeader("Content-Type", "text/html; charset=utf-8"); 
      res.writeHead(200);
      //res.write(createMush.getMainPage(hash_to_boardId[randomHash], gameUtils.allPiecesDict, 'yellow', gameState.timeInfo));
      res.write(createMush.getMainPage(gameState.boardId, gameUtils.allPiecesDict, 'yellow', gameState.timeInfo));
      res.end();
    });
  });
  res.send(url);
});

// We attached the http server (which handles Express) to port 3000 below.

const ioLobby = io.of('/lobby');

ioLobby.on('connection', (socket) => {
  console.log('new client connected to lobby ' + socket.handshake.address);
  socket.on('disconnect', () => console.log('client disconnected from lobby'));
  socket.on('error', function () {
    console.log('websocket error on lobby')
  });
});

const interval = setInterval(() => {
  let l = Object.keys(hash_to_wsClients).length;
  if (l > 0) {
    let myMessage = {};
    myMessage['listOfCurrentGames'] = hash_to_wsClients;
    ioLobby.emit('message', JSON.stringify(myMessage));
  }
}, 1000);

/*********************************************************************************/

const ioGame = io.of('/game');
let logOfMessages = [];

// Start the HTTP server (which runs both Express and Socket.IO)
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

ioGame.on('connection', (socket) => {
  console.log('new client connected to game ' + socket.handshake.address);
  /*const clientId = crypto.randomUUID();
  sleep(500).then(() => {
    ws.send(JSON.stringify({'your_UUID' : clientId}));
  });*/

  /*sleep(500).then(() => {
    ws.send(JSON.stringify({'logOfMessages' : logOfMessages}));
  });*/

  // ws.send(JSON.stringify({'logOfMessages' : logOfMessages}));
  /*gameUtils.initializeClock();
  ws.send(JSON.stringify({'timeInfo' : gameUtils.gameState.timeInfo, 'randomHash' : gameUtils.gameState.randomHash, 'whoAmI' : 'server'}));*/
  

  socket.on('disconnect', () => {
    console.log('client disconnected ' + socket.ws_id); // whoAmI = ws.ws_id
    if (socket.ws_id && wsClients_to_hash[socket.ws_id]) {
        let h = wsClients_to_hash[socket.ws_id];
        delete wsClients_to_hash[socket.ws_id];
        
        // Remove the client id from the hash list
        if (hash_to_wsClients[h]) {
            hash_to_wsClients[h] = hash_to_wsClients[h].filter(id => id !== socket.ws_id);
            if (hash_to_wsClients[h].length === 0) {
              delete hash_to_wsClients[h];
              delete hash_to_boardId[h];
            }
        }
    }
  });

  socket.on('message', data => {
    // console.log('****************************************');
    // console.log('XXXSITUATIONXXX ' + JSON.stringify(gameUtils.gameState.board.allPieces));
    let myMessage = JSON.parse(data);
    const typeOfMessage = Object.keys(myMessage)[0];
    // console.log('myMessage ' + data);
    // console.log(myMessage['whoAmI'] + ' ' + myMessage.whoAmI);
    // console.log('wsClients_to_hash' + JSON.stringify(wsClients_to_hash));
    // console.log("wsClients_to_hash[myMessage['whoAmI']] " + wsClients_to_hash[myMessage['whoAmI']] + ' // ' + myMessage['whoAmI']);
    console.log('typeOfMessage',typeOfMessage);
    if (typeOfMessage === 'my_boardid') {
      wsClients_to_hash[myMessage['whoAmI']] = myMessage['randomHash'];
      if (!hash_to_wsClients[myMessage['randomHash']]) {
        hash_to_wsClients[myMessage['randomHash']] = [];
      }
      hash_to_wsClients[myMessage['randomHash']].push(myMessage['whoAmI']);
      socket.ws_id = myMessage['whoAmI'];
      socket.join(myMessage['randomHash']); // Join a room for easier broadcasting later if needed
    }
    else {
      const stateToLoad = allGameStates[wsClients_to_hash[myMessage['whoAmI']]];
      if (stateToLoad) {
        setGameState(stateToLoad);
      }
      myMessage.randomHash = gameState.randomHash;
      // console.log('---------------       ----------------------');
      // console.log('typeOfMessage = ' + typeOfMessage);
      // console.log('[A] gameState.turnWhoIsToPlay = ' + gameState.turnWhoIsToPlay);

      switch(typeOfMessage) {
        case 'setUpRandomly':
          // console.log('### setUpRandomly : start');
          // gameUtils.setUpRandomly();
          gameUtils.setUpRandomly();
          clockUtils.initializeClock(gameState);
          // console.log('### setUpRandomly : end');
          let allInitialSetup = {}
          for (const id in gameState.board.allPieces){
            allInitialSetup[id] = gameState.board.allPieces[id].position
          }
          myMessage = {'initialSetup' : allInitialSetup, 'whoAmI' : 'server'};
          myMessage.randomHash = gameState.randomHash;
          break;
        case 'newBoardRequested':
          // console.log('### newBoardRequested');
          // logOfMessages = [];
          gameUtils.loadRandomFilename();
          clockUtils.initializeClock(gameState);
          gameState.randomHash = myMessage.randomHash;
          addDynamicRoute(`/${myMessage.randomHash}`, (req, res) => {
            sleep(50).then(() => {
              res.setHeader("Content-Type", "text/html; charset=utf-8"); 
              res.writeHead(200);
              res.write(createMush.getMainPage(gameState.boardId, gameUtils.allPiecesDict));
              res.end();
            });
          });
          break;
        case 'colorSelection':
          // console.log('### colorSelection');
          // console.log(JSON.stringify(myMessage));
          // gameUtils.selectChoice(myMessage['colorSelection']);
          clockUtils.correctDelayAndBronstein(gameState, myMessage['timeInfo']);
          break;

        case 'proposeNextMove':
          console.log('### proposeNextMove');
          break;

        case 'legalMoveA':
          // console.log('### legalMoveA myMessage = ' + JSON.stringify(myMessage))
          // console.log(myMessage['legalMoveA'].mySelectPieceId, '=>', myMessage['legalMoveA'].draggedOn);
          // gameUtils.legalMoveA(myMessage['legalMoveA'].mySelectPieceId, myMessage['legalMoveA'].draggedOn);
          clockUtils.correctDelayAndBronstein(gameState, myMessage['timeInfo']);
          break;

        case 'legalMoveB':
          // console.log('### legalMoveB myMessage = ' + JSON.stringify(myMessage))
          // console.log(myMessage['legalMoveB'].mySelectPieceId, '=>', myMessage['legalMoveB'].draggedOn);
          // gameUtils.legalMoveB(myMessage['legalMoveB'].mySelectPieceId, myMessage['legalMoveB'].draggedOn);
          clockUtils.correctDelayAndBronstein(gameState, myMessage['timeInfo']);
          break;

        case 'endOfTurn':
          //gameState.timeInfo['endOfTurn'].push(Date.now());
          // console.log('### endOfTurn ' + gameState.timeInfo['endOfTurn']);
          clockUtils.correctDelayAndBronstein(gameState, myMessage['timeInfo']);
          break;
      }

      allGameStates[gameState.randomHash] = getGameStateDeepCopy(gameState);
      
      //console.log('JSON.stringify(myMessage) = ' + JSON.stringify(myMessage));

      logOfMessages.push(JSON.stringify(myMessage));

      for (const [socketId, client] of ioGame.sockets) {
        if(wsClients_to_hash[client.ws_id] === gameState.randomHash){
          myMessage['timeInfo'] = gameState.timeInfo;
          client.emit('message', JSON.stringify(myMessage));
        }
      }
    }
  })

  socket.on('error', function () {
    console.log('websocket error');
  });

})































