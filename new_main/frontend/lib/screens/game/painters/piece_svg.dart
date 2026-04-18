/// Generates self-contained SVG strings for each piece type.
///
/// Content is a **verbatim** translation of the `PieceIcon` switch in
/// `GameBoard.jsx`.  Only JSX attribute names are renamed to XML (e.g.
/// `strokeWidth` → `stroke-width`).  Shape coordinates, transforms, and
/// colour constants are identical to the legacy.
///
/// The SVG uses `viewBox="-18 -18 36 36"` which maps to a 36×36 board-unit
/// space centred at the piece origin — the same coordinate frame used by the
/// legacy `<g transform="translate(cx, cy)">` wrapper.

// Precomputed siren hexagon (legacy: Array.from 6 sides at 14-unit radius)
const _hexPts = '14,0 7,12.124 -7,12.124 -14,0 -7,-12.124 7,-12.124';

/// Cache: key = "${type}_${side}_${isSelected}" → SVG string.
final _cache = <String, String>{};

/// Returns a complete `<svg>` string for [type]+[side].
///
/// [isSelected] adds the yellow selection halo at r=16 (legacy `.selected-piece`).
String buildPieceSvg(
  String type,
  String side, {
  bool isSelected = false,
}) {
  final key = '${type}_${side}_$isSelected';
  return _cache.putIfAbsent(key, () => _build(type, side, isSelected));
}

String _build(String type, String side, bool isSelected) {
  final isBlack = side == 'black' || side == 'yellow';
  final fill    = isBlack ? 'black' : 'white';
  final inner   = _icon(type, isBlack, fill) + (isSelected ? _halo() : '');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-18 -18 36 36">$inner</svg>';
}

// ── Selection ring (yellow, r=16, matches legacy .selected-piece visual) ──────
String _halo() =>
    '<circle cx="0" cy="0" r="16" fill="rgba(241,196,15,0.4)" '
    'stroke="#f1c40f" stroke-width="1.5" stroke-linejoin="round"/>';

// ── Per-type SVG bodies (verbatim from GameBoard.jsx PieceIcon) ───────────────

String _icon(String type, bool isBlack, String fill) {
  switch (type) {

    // ── minotaur: triskelion – three arcs at 120° (+ inner arcs for black) ──
    case 'minotaur':
      final outer = [0, 120, 240].map((a) =>
        '<path d="M 0 0 A 10 25 0 0 1 110 110 Z" '
        'fill="$fill" stroke="#000" stroke-width="20" '
        'transform="rotate($a 0 0)"/>'
      ).join();
      final inner = isBlack ? [0, 120, 240].map((a) =>
        '<path d="M 0 0 A 10 25 0 0 1 110 110 Z" '
        'fill="black" stroke="white" stroke-width="15" '
        'transform="rotate($a 0 0) scale(0.5)"/>'
      ).join() : '';
      return '<g transform="scale(0.09)">$outer$inner</g>';

    // ── soldier: two concentric ellipses ─────────────────────────────────────
    case 'soldier':
      return '<g transform="scale(0.9)">'
          '<ellipse cx="0" cy="0" rx="10" ry="10" '
            'fill="$fill" stroke="${isBlack ? 'black' : 'white'}" stroke-width="4"/>'
          '<ellipse cx="0" cy="0" rx="12" ry="12" '
            'fill="none" stroke="black" stroke-width="2"/>'
          '</g>';

    // ── goddess: diamond + inner diamond ─────────────────────────────────────
    case 'goddess':
      return '<g transform="scale(0.23)">'
          '<polygon points="0,-55 50,15 0,55 -50,15" '
            'fill="$fill" stroke="black" stroke-width="8"/>'
          '<polygon points="0,-15 20,10 0,20 -20,10" '
            'fill="black" '
            'stroke="${isBlack ? 'white' : 'black'}" '
            'stroke-width="${isBlack ? '4' : '8'}"/>'
          '</g>';

    // ── witch: small upward-pointing triangle ─────────────────────────────────
    case 'witch':
      return '<g transform="translate(-40, -44)">'
          '<polygon points="40,32 30,50 50,50" '
            'fill="$fill" stroke="black" stroke-width="2"/>'
          '</g>';

    // ── heroe / king: five-pointed star crown ────────────────────────────────
    case 'heroe':
    case 'king':
      return '<g transform="scale(0.46) translate(-50, -187)">'
          '<polygon '
            'points="50,165 55,180 70,180 60,190 65,205 50,195 35,205 40,190 30,180 45,180" '
            'fill="$fill" stroke="black" stroke-width="3"/>'
          '</g>';

    // ── mage: hexagon + vertex circles + centre ring ─────────────────────────
    case 'mage':
      return isBlack ? _mageBlack() : _mageWhite();

    // ── siren: hexagon + cross lines + dot ───────────────────────────────────
    case 'siren':
      return _siren(isBlack, fill);

    // ── ghoul: square (+ inner square for black) ──────────────────────────────
    case 'ghoul':
      final inner = isBlack
          ? '<rect x="7" y="7" width="5" height="5" fill="black" stroke="white" stroke-width="1"/>'
          : '';
      return '<g transform="scale(0.8) translate(-9.5, -9.5)">'
          '<rect x="0" y="0" width="19" height="19" '
            'fill="$fill" stroke="black" stroke-width="2"/>'
          '$inner'
          '</g>';

    default:
      final letter = type.isEmpty ? '?' : type[0].toUpperCase();
      return '<text dy=".3em" text-anchor="middle" font-size="10" fill="$fill">$letter</text>';
  }
}

// ── Mage (black variant): filled hexagon + corner circles + concentric rings ──
String _mageBlack() => '<g transform="scale(0.04) translate(-255.77, -221.5)">'
    '<polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01" '
      'fill="black" stroke="black" stroke-width="30"/>'
    '<ellipse cx="130.77" cy="438.01" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="5.77"   cy="221.50" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="130.77" cy="5"      rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="380.77" cy="5"      rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="505.77" cy="221.50" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="380.77" cy="438.01" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="255.77" cy="221.5"  rx="80"  ry="80"  fill="none" stroke="white" stroke-width="30"/>'
    '<ellipse cx="255.77" cy="221.5"  rx="110" ry="110" fill="none" stroke="black" stroke-width="20"/>'
    '<ellipse cx="255.77" cy="221.5"  rx="140" ry="140" fill="none" stroke="white" stroke-width="30"/>'
    '</g>';

// ── Mage (white variant): outline hexagon + filled corner dots + black rings ──
String _mageWhite() => '<g transform="scale(0.04) translate(-255.77, -221.5)">'
    // six corner dots (black filled circles)
    '<ellipse cx="130.77" cy="438.01" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="5.77"   cy="221.50" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="130.77" cy="5"      rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="380.77" cy="5"      rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="505.77" cy="221.50" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    '<ellipse cx="380.77" cy="438.01" rx="80" ry="80" fill="black" stroke="black" stroke-width="10"/>'
    // white hexagon outline
    '<polygon points="130.77,438.01 5.77,221.5 130.77,5 380.77,5 505.77,221.5 380.77,438.01" '
      'fill="white" stroke="black" stroke-width="35"/>'
    // white dots over the corner circles (to produce ring effect)
    '<ellipse cx="130.77" cy="438.01" rx="40" ry="40" fill="white" stroke="white" stroke-width="1"/>'
    '<ellipse cx="5.77"   cy="221.50" rx="40" ry="40" fill="white" stroke="white" stroke-width="1"/>'
    '<ellipse cx="130.77" cy="5"      rx="40" ry="40" fill="white" stroke="white" stroke-width="1"/>'
    '<ellipse cx="380.77" cy="5"      rx="40" ry="40" fill="white" stroke="white" stroke-width="1"/>'
    '<ellipse cx="505.77" cy="221.50" rx="40" ry="40" fill="white" stroke="white" stroke-width="1"/>'
    '<ellipse cx="380.77" cy="438.01" rx="40" ry="40" fill="white" stroke="white" stroke-width="1"/>'
    // two black concentric rings in centre
    '<ellipse cx="255.77" cy="221.5" rx="80"  ry="80"  fill="none" stroke="black" stroke-width="35"/>'
    '<ellipse cx="255.77" cy="221.5" rx="140" ry="140" fill="none" stroke="black" stroke-width="35"/>'
    '</g>';

// ── Siren: hexagon + cross + dot (different colours for black vs white) ────────
String _siren(bool isBlack, String fill) {
  final lineStroke = isBlack ? 'white' : 'black';
  final cross =
      '<line x1="-8" x2="8" y1="-8" y2="8"  stroke="$lineStroke" stroke-width="1"/>'
      '<line x1="-8" x2="8" y1="8"  y2="-8" stroke="$lineStroke" stroke-width="1"/>'
      '<line x1="10" x2="-10" y1="0" y2="0" stroke="$lineStroke" stroke-width="1"/>'
      '<line x1="0" x2="0" y1="-10" y2="10" stroke="$lineStroke" stroke-width="1"/>';
  final dot = isBlack
      ? '<circle r="6.5" fill="white" stroke-width="0"/>'
        '<circle r="5.5" fill="black" stroke-width="0"/>'
      : '<circle r="6.5" fill="black" stroke="black" stroke-width="0"/>'
        '<circle r="4"   fill="white" stroke="white" stroke-width="0"/>';
  return '<g transform="scale(0.8)">'
      '<ellipse cx="0" cy="0" rx="10" ry="10" fill="white" stroke="white" stroke-width="4"/>'
      '<polygon points="$_hexPts" fill="$fill" stroke="black" stroke-width="2"/>'
      '$cross$dot'
      '</g>';
}
