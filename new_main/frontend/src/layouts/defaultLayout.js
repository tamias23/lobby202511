/**
 * Default grid layouts for the GameBoard dashboard.
 *
 * Grid spec: 12 columns, dynamic rowHeight filling GRID_ROWS in the container.
 * Margin / containerPadding: [6, 6].
 *
 * LAYOUT_VERSION: bump this whenever the default positions change significantly.
 * Old saved layouts with a different version are discarded and replaced by defaults.
 *
 * Panels: board · info · actions (contains color + mage inline) · tournament · spectator
 */

export const LAYOUT_VERSION = 13;

const LAYOUT_KEY_LANDSCAPE = 'gamePanelLayout_landscape';
const LAYOUT_KEY_PORTRAIT  = 'gamePanelLayout_portrait';

/**
 * Landscape — board centre, Info left, Actions right.
 * Grid has 24 rows; rowHeight ≈ 30px on a 900px screen.
 * Board h=15 ≈ 480px, Info h=8 ≈ 256px, Actions h=15 ≈ 480px.
 */
export const DEFAULT_LANDSCAPE = [
  { i: 'board',      x: 5,  y: 0, w: 14, h: 24, minW: 6, minH: 8 },
  { i: 'info',       x: 0,  y: 7, w: 5,  h: 10, minW: 4, minH: 5 },
  { i: 'actions',    x: 19, y: 7, w: 5,  h: 10, minW: 4, minH: 6 },
  { i: 'tournament', x: 0,  y: 0, w: 5,  h: 7,  minW: 4, minH: 4 },
];

/** Portrait — board top, Info + Actions side-by-side below, then optional panels */
export const DEFAULT_PORTRAIT = [
  { i: 'board',      x: 0,  y: 0,  w: 24, h: 12, minW: 12, minH: 8 },
  { i: 'info',       x: 4,  y: 12, w: 16, h: 5,  minW: 12, minH: 4 },
  { i: 'actions',    x: 4,  y: 17, w: 16, h: 7,  minW: 12, minH: 5 },
  { i: 'tournament', x: 2,  y: 24, w: 20, h: 5,  minW: 12, minH: 4 },
];

function keyFor(isPortrait) {
  return isPortrait ? LAYOUT_KEY_PORTRAIT : LAYOUT_KEY_LANDSCAPE;
}

/**
 * Load layout for the given orientation.
 * Returns null if nothing is stored, the data is malformed, OR the version doesn't match
 * (which forces a reset to current defaults).
 */
export function loadLayout(isPortrait) {
  try {
    const raw = localStorage.getItem(keyFor(isPortrait));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Version check — discard stale layouts automatically
    if (!parsed || parsed.v !== LAYOUT_VERSION) return null;
    if (!Array.isArray(parsed.layout) || parsed.layout.length === 0) return null;
    return parsed.layout;
  } catch {
    return null;
  }
}

/** Persist RGL layout (with version tag) for the given orientation. */
export function saveLayout(layout, isPortrait) {
  try {
    localStorage.setItem(keyFor(isPortrait), JSON.stringify({ v: LAYOUT_VERSION, layout }));
  } catch { /* quota / private-browsing — ignore */ }
}

/** Erase saved layout for the given orientation (triggers fallback to default). */
export function clearLayout(isPortrait) {
  localStorage.removeItem(keyFor(isPortrait));
}
