import { store } from './store.js';

export const boardstate = store.getState();

export let board = null;
export function setBoard(b) {
  board = b;
  store.setBoard(b);
}

export let transform = '';
export function setTransform(t) {
  transform = t;
  store.setTransform(t);
}

export let offset = '';
export function setOffset(o) {
  offset = o;
  store.setOffset(o);
}

const now = new Date();
const isoTimestamp = now.toISOString();
export const whoAmI = isoTimestamp.replaceAll(':', '_').replaceAll('-', '_').replaceAll('.', '_') + '_' + Math.floor(Math.random() * 1000000);
