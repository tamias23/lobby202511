// Pure logic for calculating physically legal moves inside the game.
// None of these functions mutate state or update the DOM.

export function getPolysClose(board, selectedPieceId, d) {
  let toBeReturned = [board.allPieces[selectedPieceId].position];
  let alreadyTested = [];
  let compteur = 0;
  while (compteur < d) {
    compteur = compteur + 1;
    let temp = [];
    toBeReturned = [...new Set(toBeReturned)];
    for (const e of toBeReturned) {
      if(!alreadyTested.includes(e)) {
        for (const n1 of board.allPolygons[e].neighbours){
         temp.push(n1);
        }
        alreadyTested.push(e);
      }
    }
    for (const e of temp){
      toBeReturned.push(e);
    }
  }
  toBeReturned = [...new Set(toBeReturned)];
  return toBeReturned;
}

export function countReturnedPieceSide(board, pieceType, pieceSide) {
  let myCount = 0;
  for (const id in board.allPieces) {
    if(board.allPieces[id].type === pieceType && board.allPieces[id].side === pieceSide && board.allPieces[id].position === 'returned') {
      myCount = myCount + 1;
    }
  }
  return myCount;
}  

export function getListOfPolysClosest(board, boardstate, pieceSide) {
  let toBeReturned = [];
  
  if (board.allPieces[pieceSide + '_goddess_0'].position === 'returned') {
    let allPossibilities = boardstate.possibleSetupGoddessHeroe[pieceSide];
    let thisIsPossible = [];
    for (const ap of allPossibilities) {
      const places = ap.split(' ');
      thisIsPossible.push(places[0]);
    }
    toBeReturned = [...new Set(thisIsPossible)];
  } else if (board.allPieces[pieceSide + '_berserker_0'].position === 'returned') {
    toBeReturned = getPolysClose(board, pieceSide + '_goddess_0', 1);
  } else if (board.allPieces[pieceSide + '_berserker_1'].position === 'returned') {
    toBeReturned = getPolysClose(board, pieceSide + '_goddess_0', 1);
  } else if (board.allPieces[pieceSide + '_heroe_0'].position === 'returned' && board.allPieces[pieceSide + '_heroe_1'].position === 'returned') {
    let allPossibilities = boardstate.possibleSetupGoddessHeroe[pieceSide];
    let thisIsPossible = [];
    for (const ap of allPossibilities) {
      const places = ap.split(' ');
      if (places[0] === board.allPieces[pieceSide + '_goddess_0'].position){
        thisIsPossible.push(places[1]);
      }
    }
    toBeReturned = [...new Set(thisIsPossible)];
  } else if (board.allPieces[pieceSide + '_heroe_0'].position === 'returned' && board.allPieces[pieceSide + '_heroe_1'].position !== 'returned') {
    let allPossibilities = boardstate.possibleSetupGoddessHeroe[pieceSide];
    let thisIsPossible = [];
    for (const ap of allPossibilities) {
      const places = ap.split(' ');
      if (places[1] === board.allPieces[pieceSide + '_heroe_1'].position){
        thisIsPossible.push(places[2]);
      }
    }
    toBeReturned = [...new Set(thisIsPossible)];
  } else if (board.allPieces[pieceSide + '_heroe_1'].position === 'returned' && board.allPieces[pieceSide + '_heroe_0'].position !== 'returned') {
    let allPossibilities = boardstate.possibleSetupGoddessHeroe[pieceSide];
    let thisIsPossible = [];
    for (const ap of allPossibilities) {
      const places = ap.split(' ');
      if (places[1] === board.allPieces[pieceSide + '_heroe_0'].position){
        thisIsPossible.push(places[2]);
      }
    }
    toBeReturned = [...new Set(thisIsPossible)];
  } else if(
    (
      board.allPieces[pieceSide + '_bishop_0'].position !== 'returned' ||
      board.allPieces[pieceSide + '_bishop_1'].position !== 'returned' ||
      board.allPieces[pieceSide + '_bishop_2'].position !== 'returned' ||
      board.allPieces[pieceSide + '_bishop_3'].position !== 'returned' 
    ) &&
    (
      board.allPieces[pieceSide + '_bishop_0'].position === 'returned' ||
      board.allPieces[pieceSide + '_bishop_1'].position === 'returned' ||
      board.allPieces[pieceSide + '_bishop_2'].position === 'returned' ||
      board.allPieces[pieceSide + '_bishop_3'].position === 'returned' 
    )
  ) {
    let allColors = [];
    for (let i=0;i<4;i++) {
      if(board.allPieces[pieceSide + '_bishop_' + i].position !== 'returned'){
        allColors.push(board.allPolygons[board.allPieces[pieceSide + '_bishop_' + i].position].color);
      }
    }

    let n = 1;
    while(toBeReturned.length == 0){
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_goddess_0', n));
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_heroe_0', n));
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_heroe_1', n));
      toBeReturned = toBeReturned.filter(x => board.allPolygons[x].isIn === 'empty');
      toBeReturned = toBeReturned.filter(x => !allColors.includes(board.allPolygons[x].color));
      n = n + 1;
      if (n == 15) break;
    }
  } else if(countReturnedPieceSide(board, 'soldier', pieceSide) > 0 && countReturnedPieceSide(board, 'soldier', pieceSide) < 6) {
    let allColors = {'orange' : 0, 'grey' : 0, 'blue' : 0, 'green' : 0};

    allColors[board.allPolygons[board.allPieces[pieceSide + '_berserker_0'].position].color] = allColors[board.allPolygons[board.allPieces[pieceSide + '_berserker_0'].position].color] + 1;
    allColors[board.allPolygons[board.allPieces[pieceSide + '_berserker_1'].position].color] = allColors[board.allPolygons[board.allPieces[pieceSide + '_berserker_1'].position].color] + 1
    for (let i=0;i<6;i++) {
      if(board.allPieces[pieceSide + '_soldier_' + i].position !== 'returned'){
        allColors[board.allPolygons[board.allPieces[pieceSide + '_soldier_' + i].position].color] = allColors[board.allPolygons[board.allPieces[pieceSide + '_soldier_' + i].position].color] + 1;
      }
    }

    let n = 1;
    while(toBeReturned.length == 0){
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_goddess_0', n));
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_heroe_0', n));
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_heroe_1', n));
      toBeReturned = toBeReturned.filter(x => board.allPolygons[x].isIn === 'empty');
      toBeReturned = toBeReturned.filter(x => allColors[board.allPolygons[x].color] < 2);
      n = n + 1;
      if (n == 15) break;
    }
  } else {
    let n = 1;
    while(toBeReturned.length == 0){
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_goddess_0', n));
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_heroe_0', n));
      toBeReturned = toBeReturned.concat(getPolysClose(board, pieceSide + '_heroe_1', n));
      toBeReturned = toBeReturned.filter(x => board.allPolygons[x].isIn === 'empty');
      n = n + 1;
      if (n == 15) break;
    }
  }
  return toBeReturned;
}

export function getMoveSoldier(board, boardstate, selectedPieceId) {
  let toBeReturned = [];
  let forbidden = [];
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let soldierSide = board.allPieces[selectedPieceId].side;

  for (const n1 of board.allPolygons[selectedPoly].neighbors){
    toBeReturned.push(n1);
  }

  let added = 1;
  while (added === 1){
    added = 0;
    for (const n of toBeReturned){
      if (board.allPolygons[n].isIn !== 'empty'){
        if(board.allPieces[board.allPolygons[n].isIn].side === soldierSide){
          for (const n1 of board.allPolygons[n].neighbors){
            if (!toBeReturned.includes(n1) && !forbidden.includes(n1)){
              toBeReturned.push(n1);
              added = 1;
            }
          }
        } else {
          if (
            board.allPieces[board.allPolygons[n].isIn].side !== board.allPieces[selectedPieceId].side && 
            (board.allPieces[board.allPolygons[n].isIn].type === 'berserker')
          ) {
            forbidden.push(n);
          }
        }
      } else {
        if(boardstate.colorChosen === board.allPolygons[n].color){
          let nbSirenNeighbor = 0;
          for (const n2 of board.allPolygons[n].neighbors){
            if (
              board.allPolygons[n2].isIn !== 'empty' && 
              board.allPieces[board.allPolygons[n2].isIn].side !== board.allPieces[selectedPieceId].side && 
              board.allPieces[board.allPolygons[n2].isIn].type === 'siren'
              ){
              nbSirenNeighbor = nbSirenNeighbor + 1;
            }
          }
          if (nbSirenNeighbor === 0){
            for (const n1 of board.allPolygons[n].neighbors){
              if (!toBeReturned.includes(n1) && !forbidden.includes(n1)){
                toBeReturned.push(n1);
                added = 1;
              }
            }
          }
        }
      }
    }

    for (const n of toBeReturned){
    if (
      board.allPolygons[n].isIn !== 'empty' && 
      board.allPieces[board.allPolygons[n].isIn].side !== soldierSide && 
      (board.allPieces[board.allPolygons[n].isIn].type === 'berserker')
      ){
        forbidden.push(n);
      }
    }

    forbidden = [...new Set(forbidden)];
    toBeReturned = [...new Set(toBeReturned)];
    toBeReturned = toBeReturned.filter(x => forbidden.indexOf(x) === -1);
    toBeReturned = [...new Set(toBeReturned)];
  }
  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);

  return toBeReturned;
}

export function getMoveGhoul(board, boardstate, selectedPieceId) {
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let toBeReturned = [];
  for (const n1 of board.allPolygons[selectedPoly].neighbors){
    if (board.allPolygons[n1].isIn === 'empty'){
      toBeReturned.push(n1);
      let nbSirenNeighbor = 0;
      for (const n2 of board.allPolygons[n1].neighbors){
        if (
          board.allPolygons[n2].isIn !== 'empty' && 
          board.allPieces[board.allPolygons[n2].isIn].side !== board.allPieces[selectedPieceId].side && 
          board.allPieces[board.allPolygons[n2].isIn].type === 'siren'
          ){
          nbSirenNeighbor = nbSirenNeighbor + 1;
        }
      }
      if(nbSirenNeighbor === 0 && board.allPolygons[n1].color != boardstate.colorChosen){
        for (const n2 of board.allPolygons[n1].neighbors){
          toBeReturned.push(n2);
          if(board.allPolygons[n2].isIn === 'empty') {
            let nbSirenNeighbor2 = 0;
            for (const n3 of board.allPolygons[n2].neighbors){
              if (
                board.allPolygons[n3].isIn !== 'empty' && 
                board.allPieces[board.allPolygons[n3].isIn].side !== board.allPieces[selectedPieceId].side && 
                board.allPieces[board.allPolygons[n3].isIn].type === 'siren'
                ){
                nbSirenNeighbor2 = nbSirenNeighbor2 + 1;
              }
            }
            if(nbSirenNeighbor2 === 0 && board.allPolygons[n2].color != boardstate.colorChosen){
              for (const n3 of board.allPolygons[n2].neighbors){
                toBeReturned.push(n3);
              }
            }
          }
        }
      }
    } else if (board.allPieces[board.allPolygons[n1].isIn].side != board.allPieces[selectedPieceId].side){
      toBeReturned.push(n1);
    }
  }

  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);
  return toBeReturned;
}

export function getMoveSiren(board, boardstate, selectedPieceId) {
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let toBeReturned = [];
  for (const n1 of board.allPolygons[selectedPoly].neighbours){
    toBeReturned.push(n1);
    for (const n2 of board.allPolygons[n1].neighbours){
      toBeReturned.push(n2);
    }
  }
  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);
  return toBeReturned;
}

export function getMoveBerserker(board, boardstate, selectedPieceId) {
  let toBeReturned = getMoveSoldier(board, boardstate, selectedPieceId);
  return toBeReturned;
}

export function getMoveGoddess(board, boardstate, selectedPieceId) {
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let toBeReturned = [];
  for (const n1 of board.allPolygons[selectedPoly].neighbours){
    toBeReturned.push(n1);
    for (const n2 of board.allPolygons[n1].neighbours){
      toBeReturned.push(n2);
    }
  }
  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);
  return toBeReturned;
}

export function getMoveHeroe(board, boardstate, selectedPieceId) {
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let toBeReturned = [];
  for (const n1 of board.allPolygons[selectedPoly].neighbours){
    toBeReturned.push(n1);
    for (const n2 of board.allPolygons[n1].neighbours){
      toBeReturned.push(n2);
      for (const n3 of board.allPolygons[n2].neighbours){ 
        toBeReturned.push(n3);
      }
    }
  }
  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);
  
  if (boardstate.heroeHasTakenCounter >= boardstate.heroeHasTakenCounterMax) {
    toBeReturned = [];
  }

  return toBeReturned;
}

export function getMoveMage(board, boardstate, selectedPieceId) {
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let toBeReturned = [];
  for (const n1 of board.allPolygons[selectedPoly].neighbours){
    toBeReturned.push(n1);
    for (const n2 of board.allPolygons[n1].neighbours){
      toBeReturned.push(n2);
      for (const n3 of board.allPolygons[n2].neighbours){
        toBeReturned.push(n3);
      }
    }
  }
  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);
  toBeReturned = toBeReturned.filter(x => board.allPolygons[x].color !== board.allPolygons[selectedPoly].color);
  return toBeReturned;
}

export function getMoveBishop(board, boardstate, selectedPieceId) {
  let selectedPoly = board.allPieces[selectedPieceId].position;
  let toBeReturned = [];
  for (const n1 of board.allPolygons[selectedPoly].neighbours){
    toBeReturned.push(n1);
    for (const n2 of board.allPolygons[n1].neighbours){
      toBeReturned.push(n2);
      for (const n3 of board.allPolygons[n2].neighbours){
        toBeReturned.push(n3);
          for (const n4 of board.allPolygons[n3].neighbours){
            toBeReturned.push(n4);
        }
      }
    }
  }
  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);
  toBeReturned = toBeReturned.filter(x => board.allPolygons[x].color === board.allPolygons[selectedPoly].color);
  return toBeReturned;
}

export function getListOfPossibleTargetsForSetup(board, boardstate, selectedPieceId) {
  let toBeReturned = [];
  let inputOrder = ['goddess', 'berserker', 'heroe', 'bishop', 'mage', 'soldier'];

  if (board.allPieces[selectedPieceId].position === 'returned') {
    let pieceType = board.allPieces[selectedPieceId].type;
    let pieceSide = board.allPieces[selectedPieceId].side;
    const myIndexType = inputOrder.indexOf(pieceType);
    let howManyPiecesHaveToBeSetBefore = 0;
    for (let i=0;i<myIndexType;i++) {
      howManyPiecesHaveToBeSetBefore = howManyPiecesHaveToBeSetBefore + countReturnedPieceSide(board, inputOrder[i], pieceSide);
    }
    if(howManyPiecesHaveToBeSetBefore == 0){
      toBeReturned = getListOfPolysClosest(board, boardstate, pieceSide);
    }
  }

  toBeReturned = [...new Set(toBeReturned)];
  return toBeReturned;
}

export function getListOfPossibleTargets(board, boardstate, selectedPieceId) {
  let toBeReturned = [];
  let selectedPoly = board.allPieces[selectedPieceId].position;
  
  if (selectedPoly === 'returned') {
    if (boardstate.colorChosen === 'noColor'){
      toBeReturned = Object.keys(board.allPolygons);
    } else {
      for(const p in board.allPolygons){
        if (board.allPolygons[p].color === boardstate.colorChosen && board.allPolygons[p].isIn === 'empty'){
          let howManyNeighbors = 0;
          for (let k of board.allPolygons[p].neighbors){
            if (board.allPolygons[k].isIn !== 'empty' && board.allPieces[board.allPolygons[k].isIn].side !== board.allPieces[selectedPieceId].side){
              howManyNeighbors = howManyNeighbors + 1;
            }
          }
          // if (howManyNeighbors == 0 || board.allPieces[selectedPieceId].type !== 'bishop'){
          if (howManyNeighbors == 0 || !['bishop', 'mage'].includes(board.allPieces[selectedPieceId].type)){
            toBeReturned.push(p);
          }
        }

        //if(board.allPieces[selectedPieceId].type !== 'bishop'){
        if(!['bishop', 'mage'].includes(board.allPieces[selectedPieceId].type)){
          let mage0 = board.allPieces[selectedPieceId].side + '_mage_0';
          let mage1 = board.allPieces[selectedPieceId].side + '_mage_1';
          let mage2 = board.allPieces[selectedPieceId].side + '_mage_2';
          if (mage0 in board.allPieces && board.allPieces[mage0].position != 'returned'){
            toBeReturned = toBeReturned.concat(board.allPolygons[board.allPieces[mage0].position].neighbors.filter(x => board.allPolygons[x].isIn === 'empty'));
          }
          if (mage1 in board.allPieces && board.allPieces[mage1].position != 'returned'){
            toBeReturned = toBeReturned.concat(board.allPolygons[board.allPieces[mage1].position].neighbors.filter(x => board.allPolygons[x].isIn === 'empty'));
          }
          if (mage2 in board.allPieces && board.allPieces[mage2].position != 'returned'){
            toBeReturned = toBeReturned.concat(board.allPolygons[board.allPieces[mage2].position].neighbors.filter(x => board.allPolygons[x].isIn === 'empty'));
          }
        } else {
          let mage0 = board.allPieces[selectedPieceId].side + '_mage_0';
          let mage1 = board.allPieces[selectedPieceId].side + '_mage_1';
          let mage2 = board.allPieces[selectedPieceId].side + '_mage_2';
          let candidatePositions = [];
          if (mage0 in board.allPieces && board.allPieces[mage0].position != 'returned'){
            candidatePositions = candidatePositions.concat(board.allPolygons[board.allPieces[mage0].position].neighbors.filter(x => board.allPolygons[x].isIn === 'empty'));
          }
          if (mage1 in board.allPieces && board.allPieces[mage1].position != 'returned'){
            candidatePositions = candidatePositions.concat(board.allPolygons[board.allPieces[mage1].position].neighbors.filter(x => board.allPolygons[x].isIn === 'empty'));
          }
          if (mage2 in board.allPieces && board.allPieces[mage2].position != 'returned'){
            candidatePositions = candidatePositions.concat(board.allPolygons[board.allPieces[mage2].position].neighbors.filter(x => board.allPolygons[x].isIn === 'empty'));
          }

          for(const p7 of candidatePositions){
            let howManyNeighbors = 0;
            for (let k of board.allPolygons[p7].neighbors){
              if (board.allPolygons[k].isIn !== 'empty' && board.allPieces[board.allPolygons[k].isIn].side !== board.allPieces[selectedPieceId].side){
                howManyNeighbors = howManyNeighbors + 1;
              }
            }
            if (howManyNeighbors == 0){
              toBeReturned.push(p7);
            }
          }
        }
      }
    }
  } else {
    if (board.allPieces[selectedPieceId].type === 'heroe'){
      toBeReturned = getMoveHeroe(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'goddess'){
      toBeReturned = getMoveGoddess(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'mage'){
      toBeReturned = getMoveMage(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'bishop'){
      toBeReturned = getMoveBishop(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'siren'){
      toBeReturned = getMoveSiren(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'ghoul'){
      toBeReturned = getMoveGhoul(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'soldier'){
      toBeReturned = getMoveSoldier(board, boardstate, selectedPieceId);
    } else if (board.allPieces[selectedPieceId].type === 'berserker'){
      toBeReturned = getMoveBerserker(board, boardstate, selectedPieceId);
    }
  }

  toBeReturned = [...new Set(toBeReturned)];
  toBeReturned = toBeReturned.filter(x => x !== selectedPoly);

  // Global Berserker Invulnerability: No piece may capture a berserker natively.
  toBeReturned = toBeReturned.filter(n => {
    if (board.allPolygons[n].isIn !== 'empty') {
      if (board.allPieces[board.allPolygons[n].isIn].type === 'berserker') {
        return false;
      }
    }
    return true;
  });

  // Siren and Bishop can never capture: they only move to empty polygons.
  if (board.allPieces[selectedPieceId].type === 'siren' || board.allPieces[selectedPieceId].type === 'bishop') {
    toBeReturned = toBeReturned.filter(n => board.allPolygons[n].isIn === 'empty');
  }

  return toBeReturned;
}
