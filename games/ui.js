import { boardstate } from './state.js';

export function setButtonAndFooterColor() {
  if (boardstate.whoseTurnItIs === 'white' ){
    document.getElementById('myButtonEndTurn').querySelector('text').style.fill = 'black';
    document.getElementById('myButtonEndTurn').querySelector('rect').style.fill = 'white';
    document.getElementById('purpleFooter').style.fill = 'white';
  } else {
    document.getElementById('myButtonEndTurn').querySelector('rect').style.fill = boardstate.actualYellowColor;
    document.getElementById('purpleFooter').style.fill = boardstate.actualYellowColor;
    if(boardstate.actualYellowColor === 'black') {
      document.getElementById('myButtonEndTurn').querySelector('text').style.fill = 'white';
    }
  }
}

export function toggleButtonVisibility(buttonElement) {
  buttonElement.style.visibility = buttonElement.style.visibility === 'hidden' ? 'visible' : 'hidden';
}

export function hideColorSelectors() {
  const colorSelectors = document.getElementsByClassName("colorSelector");
  for (let i = 0; i < colorSelectors.length; i++) {
    colorSelectors[i].style.display = "none";
  }
}

export function showColorSelectors() {
  const colorSelectors = document.getElementsByClassName("colorSelector");
  for (let i = 0; i < colorSelectors.length; i++) {
    colorSelectors[i].style.display = "block";
  }
}

export function updateClock() {
  boardstate.timeInfo['timeWhite'] = Math.max(0, boardstate.timeInfo['timeWhite'] || 0);
  boardstate.timeInfo['timeYellow'] = Math.max(0, boardstate.timeInfo['timeYellow'] || 0);

  let clockWhite = document.getElementById('clockWhite');
  if (clockWhite) {
    let minutes = Math.floor(boardstate.timeInfo['timeWhite'] / 60000);
    let seconds = Math.floor((boardstate.timeInfo['timeWhite'] % 60000) / 1000);
    clockWhite.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
  }

  let clockYellow = document.getElementById('clockYellow');
  if (clockYellow) {
    let minutes = Math.floor(boardstate.timeInfo['timeYellow'] / 60000);
    let seconds = Math.floor((boardstate.timeInfo['timeYellow'] % 60000) / 1000);
    clockYellow.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
  }
}

export function updateClockRotated() {
  boardstate.timeInfo['timeWhite'] = Math.max(0, boardstate.timeInfo['timeWhite'] || 0);
  boardstate.timeInfo['timeYellow'] = Math.max(0, boardstate.timeInfo['timeYellow'] || 0);
  
  let clockWhite = document.getElementById('clockYellow');
  if (clockWhite) {
    let minutes = Math.floor(boardstate.timeInfo['timeWhite'] / 60000);
    let seconds = Math.floor((boardstate.timeInfo['timeWhite'] % 60000) / 1000);
    clockWhite.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
  }

  let clockYellow = document.getElementById('clockWhite');
  if (clockYellow) {
    let minutes = Math.floor(boardstate.timeInfo['timeYellow'] / 60000);
    let seconds = Math.floor((boardstate.timeInfo['timeYellow'] % 60000) / 1000);
    clockYellow.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
  }
}
