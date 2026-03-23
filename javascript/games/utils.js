import { board } from './state.js';

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateNewCoordinates(x1, y1, centerX, centerY, angleDegrees) {
  const angleRadians = angleDegrees * Math.PI / 180;
  const dx = x1 - centerX;
  const dy = y1 - centerY;
  const newX = centerX + dx * Math.cos(angleRadians) - dy * Math.sin(angleRadians);
  const newY = centerY + dx * Math.sin(angleRadians) + dy * Math.cos(angleRadians);
  return { x: newX, y: newY };
}

export function getHashElementInGameUrl(str) {
  const parts = str.split('/');
  return parts[parts.length - 1] || '';
}

export function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export function getRandomElement(list) {
  const listLength = list.length;
  const randomIndex = Math.floor(Math.random() * listLength);
  return list[randomIndex];
}

export function mySetTranslate(selectedElement, x, y){
  let transforms = selectedElement.transform.baseVal;
  for (let i = 0; i < transforms.numberOfItems; i++) {
    const item = transforms.getItem(i);
    if (item.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
      item.setTranslate(x, y);
      break;
    }
  }
}

export function iterTransforms(selectedElement){
  let transforms = selectedElement.transform.baseVal;
  let myTextToReturn = '';
  for (let i = 0; i < transforms.numberOfItems; i++) {
    const item = transforms.getItem(i);
    if (item.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
      myTextToReturn = myTextToReturn + ' translate(' + item.matrix.e + 'px, ' + item.matrix.f + 'px) ';
    }
    if (item.type === SVGTransform.SVG_TRANSFORM_SCALE) {
      myTextToReturn = myTextToReturn + ' scale(' + item.matrix.d + ') ';
    }
  }
  return myTextToReturn;
}

export function getDistanceBetweenKeyframes(stringA, stringB){
  const regex = /(-?\d+\.?\d*)/g;
  let matchA = stringA.match(regex);    
  let matchB = stringB.match(regex);
  if(matchA && matchB && matchA.length > 0 && matchB.length > 0){
    return Math.sqrt((matchA[0]-matchB[0])*(matchA[0]-matchB[0]) + (matchA[1]-matchB[1])*(matchA[1]-matchB[1]));
  }
  return 0;
}

export function getFloatValue(result) {
  return typeof result === 'number' ? result : 0;
}

export function iterTransformsGetScale(selectedElement){
  let transforms = selectedElement.transform.baseVal;
  let myScaleToReturn = 1.0;
  for (let i = 0; i < transforms.numberOfItems; i++) {
    const item = transforms.getItem(i);
    if (item.type === SVGTransform.SVG_TRANSFORM_SCALE) {
      myScaleToReturn = item.matrix.d;
    }
  }
  return myScaleToReturn;
}

export function iterTransformGetTranslate(selectedElement){
  let transforms = selectedElement.transform.baseVal;
  let my_x = 0;
  let my_y = 0;
  for (let i = 0; i < transforms.numberOfItems; i++) {
    const item = transforms.getItem(i);
    if (item.type === SVGTransform.SVG_TRANSFORM_TRANSLATE) {
      my_x = item.matrix.e;
      my_y = item.matrix.f;
    }
  }
  return [my_x, my_y];
}

export function getDistanceBetweenPoly(poly1, poly2){
  let cA = board.allPolygons[poly1].center;
  let cB = board.allPolygons[poly2].center;
  return Math.sqrt((cA[0]-cB[0])*(cA[0]-cB[0]) + (cA[1]-cB[1])*(cA[1]-cB[1]));
}

export function getMousePosition(evt, ctmElement) {
  let CTM = ctmElement.getScreenCTM();
  if (evt.changedTouches) { evt = evt.changedTouches[0]; }
  return {
    x: (evt.clientX - CTM.e) / CTM.a,
    y: (evt.clientY - CTM.f) / CTM.d
  };
}
