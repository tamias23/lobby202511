export const store = {
  state: {
    fullboardid: '',
    highlighted: [],
    circles: [],
    topEdgepolys: [],
    bottomEdgepolys: [],
    turn: 1,
    halfTurn: 1,
    whoseTurnItIs: 'white',
    colorChosen: 'noColor',
    circleIdToColor: {},
    heroeHasTaken: 'no',
    heroeHasTakenCounter: 0,
    heroeHasTakenCounterMax: 2,
    soldierIsMoving: 'no',
    randomHash: '',
    amIWhiteOrBlack: '',
    boardRotated: 'no',
    newBoardRequested: 'no',
    actualBlackColor: 'yellow',
    piecesRemoved: [],
    animation_duration: 300,
    animation_duration_lastMove: -1,
    animation_delay: -1,
    setupIsDone: 'no',
    possibleSetupGoddessHeroe: { yellow: [], white: [] },
    timeInfo: {},
    board: null,
    transform: '',
    offset: ''
  },

  getState() {
    return this.state;
  },

  setBoard(b) {
    this.state.board = b;
  },

  setTransform(t) {
    this.state.transform = t;
  },

  setOffset(o) {
    this.state.offset = o;
  },

  updateTurn(newTurn, newHalfTurn) {
    this.state.turn = newTurn;
    this.state.halfTurn = newHalfTurn;
  },

  swapWhoseTurnItIs() {
    if (this.state.whoseTurnItIs === 'white') {
      this.state.whoseTurnItIs = 'black';
    } else {
      this.state.whoseTurnItIs = 'white';
    }
  },

  resetTurnState() {
    this.state.heroeHasTakenCounter = 0;
    this.state.soldierIsMoving = 'no';
    this.state.colorChosen = 'noColor';
  },

  setColorChosen(color) {
    this.state.colorChosen = color;
  },
  
  setHighlightedMoves(moves) {
    this.state.highlighted = moves;
  },

  clearHighlightedMoves() {
    this.state.highlighted = [];
    this.state.circles = [];
  },
  
  addCircle(id) {
    this.state.circles.push(id);
  },

  incrementHeroeTakeCounter() {
    this.state.heroeHasTakenCounter += 1;
  },
  
  setHeroeHasTaken(pieceId) {
    this.state.heroeHasTaken = pieceId;
  },

  resetHeroeHasTaken() {
    this.state.heroeHasTaken = 'no';
    this.state.heroeHasTakenCounter = 0;
  },

  setSoldierIsMoving(pieceId) {
    this.state.soldierIsMoving = pieceId;
  },

  setSetupIsDone(status) {
    this.state.setupIsDone = status;
  },

  setTimeInfo(timeInfo) {
    this.state.timeInfo = timeInfo;
  }
};
