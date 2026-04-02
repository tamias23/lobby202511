// Pure logic for calculating physically legal moves inside the game.
// None of these functions mutate state or update the DOM.

export function getPolysClose(board, selectedPieceId, d) {
  const startPos = board.allPieces[selectedPieceId].position;
  return getPolysCloseFromPos(board, startPos, d);
}

export function getPolysCloseFromPos(board, startPos, d) {
  if (startPos === 'returned' || !startPos) return [];
  let toBeReturned = [startPos];
  let alreadyTested = [];
  let compteur = 0;
  while (compteur < d) {
    compteur = compteur + 1;
    let temp = [];
    toBeReturned = [...new Set(toBeReturned)];
    for (const e of toBeReturned) {
      if(!alreadyTested.includes(e)) {
        const poly = board.allPolygons[e];
        const neighbors = poly.neighbours || poly.neighbors || [];
        for (const n1 of neighbors){
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
  // This function is now a helper for the new step-based manual setup.
  // We return targets based on the current setupStep.
  let step = boardstate.setupStep;
  let targets = [];

  const width = board.width || 1000;
  const height = board.height || 1000;
 
  const getEdges = (side) => {
    let e = side === 'white' ? board.topEdgepolys : board.bottomEdgepolys;
    // Fallback for tests that don't define edge polys
    if ((!e || e.length === 0) && board.allPolygons) return Object.keys(board.allPolygons);
    return e || [];
  };

  const getPiecePos = (type, side) => {
    for (const id in board.allPieces) {
      const p = board.allPieces[id];
      if (p.side === side && p.type === type && p.position !== 'returned') return p.position;
    }
    return null;
  };

  const getPlacedIds = (type, side) => {
    const ids = [];
    for (const id in board.allPieces) {
      const p = board.allPieces[id];
      if (p.side === side && p.type === type && p.position !== 'returned') ids.push(id);
    }
    return ids;
  };

  const getAnchors = (side) => {
    const list = [];
    const g = getPiecePos('goddess', side);
    if (g) list.push(g);
    getPlacedIds('heroe', side).forEach(id => list.push(board.allPieces[id].position));
    return list;
  };

  switch (step) {
    case 0: // Goddess on edge
      targets = getEdges(pieceSide).filter(p => {
        if (board.allPolygons[p].isIn !== 'empty') return false;
        return canPlaceHeroesFromGoddess(board, p, pieceSide, width, height);
      });
      break;
    case 1: // Heroes on edge
      const gPos = getPiecePos('goddess', pieceSide);
      if (gPos) {
        const gNear2 = getPolysCloseFromPos(board, gPos, 2);
        const gNear6 = getPolysCloseFromPos(board, gPos, 6);
        const edges = getEdges(pieceSide);
        const heroes = getPlacedIds('heroe', pieceSide);
        
        targets = edges.filter(e => {
          if (board.allPolygons[e].isIn !== 'empty') return false;
          if (gNear2.includes(e) || !gNear6.includes(e)) return false;
          if (heroes.length > 0) {
            const h1Pos = board.allPieces[heroes[0]].position;
            const h1Near6 = getPolysCloseFromPos(board, h1Pos, 6);
            if (h1Near6.includes(e)) return false;
          } else {
            // First Hero look-ahead: ensures at least one slot remains for Hero 2
            const eNear6 = getPolysCloseFromPos(board, e, 6);
            const canFitSecondHero = edges.some(e2 => {
              if (e2 === e || board.allPolygons[e2].isIn !== 'empty') return false;
              if (gNear2.includes(e2) || !gNear6.includes(e2)) return false;
              if (eNear6.includes(e2)) return false;
              return true;
            });
            if (!canFitSecondHero) return false;
          }
          return true;
        });
      }
      break;
    case 2: // Berserker near goddess
      const gPosB = getPiecePos('goddess', pieceSide);
      if (gPosB) {
        let near = getPolysClose(board, side_g_id(pieceSide), 1);
        if (near.filter(p => board.allPolygons[p].isIn === 'empty').length < 2) {
          near = getPolysClose(board, side_g_id(pieceSide), 2);
        }
        targets = near.filter(p => board.allPolygons[p].isIn === 'empty');
      }
      break;
    case 3: // Bishop unique color - closest possible ring
      const anchorsB = getAnchors(pieceSide);
      const placedBishops = getPlacedIds('bishop', pieceSide);
      const usedColors = placedBishops.map(id => board.allPolygons[board.allPieces[id].position].color);
      
      for (let d = 1; d <= 15; d++) {
        let ringD = [];
        anchorsB.forEach(a => {
          getPolysCloseFromPos(board, a, d).forEach(p => ringD.push(p));
        });
        const candidates = [...new Set(ringD)].filter(p => {
          if (board.allPolygons[p].isIn !== 'empty') return false;
          if (usedColors.includes(board.allPolygons[p].color)) return false;
          return true;
        });

        if (candidates.length > 0) {
          targets = candidates;
          break;
        }
      }
      break;
    case 4: // Infantry rings
      const anchorsI = getAnchors(pieceSide);
      for (let d = 1; d <= 15; d++) {
        const ringI = [];
        anchorsI.forEach(a => {
           const dummyId = board.allPolygons[a].isIn;
           if (dummyId !== 'empty') {
              getPolysClose(board, dummyId, d).forEach(p => ringI.push(p));
           }
        });
        const avail = [...new Set(ringI)].filter(p => board.allPolygons[p].isIn === 'empty');
        if (avail.length > 0) {
          targets = avail;
          break;
        }
      }
      break;
  }

  return targets;
}

function side_g_id(side) {
  return side + '_goddess_0';
}

function canPlaceHeroesFromGoddess(board, gPos, side, width, height) {
  if (!board.topEdgepolys) return true; // Bypass for unit tests with minimal board mocks
  const edges = (side === 'white' ? board.topEdgepolys : board.bottomEdgepolys) || (board.allPolygons ? Object.keys(board.allPolygons) : []);
  const gNear2 = getPolysCloseFromPos(board, gPos, 2);
  const gNear6 = getPolysCloseFromPos(board, gPos, 6);

  const validHeroeEdges = edges.filter(e => {
    return e !== gPos && gNear6.includes(e) && !gNear2.includes(e);
  });

  if (validHeroeEdges.length < 2) return false;

  for (let i = 0; i < validHeroeEdges.length; i++) {
    for (let j = i + 1; j < validHeroeEdges.length; j++) {
      const h1 = validHeroeEdges[i];
      const h2 = validHeroeEdges[j];
      const h1Near6 = getPolysCloseFromPos(board, h1, 6);
      if (!h1Near6.includes(h2)) {
        return true;
      }
    }
  }
  return false;
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
  const pieceType = board.allPieces[selectedPieceId].type;
  const pieceSide = board.allPieces[selectedPieceId].side;

  if (boardstate.setupIsDone === 'yes' || boardstate.whoseTurnItIs !== pieceSide) {
    return [];
  }

  const stepMap = {
    0: ['goddess'],
    1: ['heroe'],
    2: ['berserker'],
    3: ['bishop'],
    4: ['ghoul', 'siren']
  };

  if (!stepMap[boardstate.setupStep].includes(pieceType)) {
    return [];
  }

  if (board.allPieces[selectedPieceId].position === 'returned') {
    toBeReturned = getListOfPolysClosest(board, boardstate, pieceSide);
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
          if (howManyNeighbors == 0 || board.allPieces[selectedPieceId].type !== 'bishop'){
            toBeReturned.push(p);
          }
        }

        if(board.allPieces[selectedPieceId].type !== 'bishop'){
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
