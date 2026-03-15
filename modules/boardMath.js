const { gameState } = require('./gameState');

function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

function getPolysClose(selectedPiece, d) {
  let startPosition = gameState.board.allPieces[selectedPiece].position;
  let currentLayer = new Set([startPosition]);
  let visited = new Set([startPosition]);

  for (let step = 0; step < d; step++) {
    let nextLayer = new Set();
    for (const poly of currentLayer) {
      for (const neighbor of gameState.board.allPolygons[poly].neighbours) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextLayer.add(neighbor);
        }
      }
    }
    currentLayer = nextLayer;
  }
  
  return Array.from(visited);
}

function getRandomElement(list) {
  const listLength = list.length;
  const randomIndex = Math.floor(Math.random() * listLength);
  return list[randomIndex];
}

exports.shuffleArray = shuffleArray;
exports.getPolysClose = getPolysClose;
exports.getRandomElement = getRandomElement;
