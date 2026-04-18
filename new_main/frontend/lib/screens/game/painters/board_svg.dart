import '../../../models/models.dart';

/// Generates a complete board SVG string, structurally identical to the
/// `renderBoard()` + `renderEdges()` functions in `GameBoard.jsx`.
///
/// The [scale] / [offsetX] / [offsetY] values must come from the same
/// `_computeTransform` calculation used to position piece widgets, so that
/// piece overlays land exactly on top of the polygons.
///
/// SVG structure:
/// ```
/// <svg width=W height=H>
///   <g transform="translate(ox oy) scale(s)">        ← matches Dart transform
///     <g transform="rotate(180 cx cy)">              ← only when isFlipped
///       <!-- pass 1 · polygon fills (+selected overlay) -->
///       <!-- pass 2 · thin polygon borders -->
///       <!-- pass 3 · black allEdges -->
///       <!-- pass 4 · red allEdges (always on top) -->
///       <!-- pass 5 · move-indicator dots / rings -->
///     </g>
///   </g>
/// </svg>
/// ```
String buildBoardSvg({
  required double width,
  required double height,
  required double scale,
  required double offsetX,
  required double offsetY,
  required Map<String, BoardPolygon> polygons,
  required Map<String, dynamic> allEdges,
  required Set<String> legalMoveTargets,
  required List<String> occupiedPolygons,
  required String colorTheme,
  required double boardCx,
  required double boardCy,
  required bool isFlipped,
  String? selectedPolygon,
}) {
  if (polygons.isEmpty) {
    return '<svg xmlns="http://www.w3.org/2000/svg" '
        'width="${width.toStringAsFixed(0)}" height="${height.toStringAsFixed(0)}"></svg>';
  }

  final buf = StringBuffer()
    ..write('<svg xmlns="http://www.w3.org/2000/svg" '
        'width="${width.toStringAsFixed(0)}" height="${height.toStringAsFixed(0)}">')
    ..write('<g transform="translate(${_f(offsetX)},${_f(offsetY)}) scale(${_f(scale)})">');

  // Flip group — a 180° rotation around the board centre (identical to legacy)
  if (isFlipped) {
    buf.write('<g transform="rotate(180 ${_f(boardCx)} ${_f(boardCy)})">');
  } else {
    buf.write('<g>');
  }

  // 1/scale not needed for strokes — board-space stroke values scale naturally.
  // Pass 5 uses centred coordinates which come from polygon.center (board-space).

  // ── Pass 1 · polygon fills ───────────────────────────────────────────────
  for (final entry in polygons.entries) {
    final poly  = entry.value;
    if (poly.points.length < 3) continue;
    final pts   = _polyPts(poly.points);
    final color = _themeColor(poly.color, colorTheme);
    buf.write('<polygon points="$pts" fill="$color"');

    // Selected polygon: slight white tint overlay (legacy: Color.lerp 35%)
    if (selectedPolygon == poly.name) {
      // Draw base, then white overlay, then white border
      // Use 2.5/scale to express 2.5 screen pixels in board-space.
      final selSw = _f(2.5 / scale);
      buf
        ..write(' stroke="none"/>')
        ..write('<polygon points="$pts" fill="rgba(255,255,255,0.35)"')
        ..write(' stroke="rgba(255,255,255,0.7)" stroke-width="$selSw"'
                ' stroke-linejoin="round"/>');
    } else {
      buf.write(' stroke="none"/>');
    }
  }

  // ── Pass 2 · thin polygon borders ────────────────────────────────────────
  // Legacy renderBoard(): stroke="black" strokeWidth="0.5" — board-space units.
  for (final poly in polygons.values) {
    if (poly.points.length < 3) continue;
    buf.write('<polygon points="${_polyPts(poly.points)}" fill="none" '
        'stroke="black" stroke-width="0.5" stroke-linejoin="round"/>');
  }

  // ── Pass 3 · black allEdges ────────────────────────────────────────
  _writeEdges(buf, allEdges, redOnly: false);

  // ── Pass 4 · red allEdges (always on top of black) ─────────────────────
  _writeEdges(buf, allEdges, redOnly: true);

  // ── Pass 5 · move indicator dots / rings ─────────────────────────────────
  // Legacy: r=5 filled dot for empty targets; r=16 tinted ring for occupied.
  for (final targetId in legalMoveTargets) {
    final poly = polygons[targetId];
    if (poly == null || poly.center.length < 2) continue;
    final cx = poly.center[0];
    final cy = poly.center[1];
    final isOccupied = occupiedPolygons.contains(targetId);
    if (isOccupied) {
      buf
        ..write('<circle cx="${_f(cx)}" cy="${_f(cy)}" r="16" '
            'fill="rgba(239,68,68,0.4)"/>')
        ..write('<circle cx="${_f(cx)}" cy="${_f(cy)}" r="16" fill="none" '
            'stroke="#ef4444" stroke-width="2"/>');
    } else {
      buf
        ..write('<circle cx="${_f(cx)}" cy="${_f(cy)}" r="5" '
            'fill="rgba(0,0,0,0.4)"/>')
        ..write('<circle cx="${_f(cx)}" cy="${_f(cy)}" r="5" fill="none" '
            'stroke="rgba(0,0,0,0.2)" stroke-width="1"/>');
    }
  }

  buf..write('</g></g></svg>');
  return buf.toString();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

void _writeEdges(StringBuffer buf, Map<String, dynamic> allEdges,
    {required bool redOnly}) {
  for (final ev in allEdges.values) {
    try {
      final edge  = ev as Map;
      final isRed = edge['color'] == 'red';
      if (isRed != redOnly) continue;

      final pts = edge['sharedPoints'] as List?;
      if (pts == null || pts.length < 2) continue;
      final p0 = pts[0] as List;
      final p1 = pts[1] as List;

      final x0 = (p0[0] as num).toDouble();
      final y0 = (p0[1] as num).toDouble();
      final x1 = (p1[0] as num).toDouble();
      final y1 = (p1[1] as num).toDouble();

  // Legacy renderEdges():
  //   red   → stroke="#ef4444"  stroke-width="3"  (board-space units)
  //   black → stroke="black"    stroke-width="0.5" opacity="0.6"
  final stroke = isRed ? '#ef4444' : 'black';
  final sw     = isRed ? '3'       : '0.5';
  final extra  = isRed ? '' : ' opacity="0.6"';
  buf.write('<line x1="${_f(x0)}" y1="${_f(y0)}" x2="${_f(x1)}" y2="${_f(y1)}" '
      'stroke="$stroke" stroke-width="$sw" '
      'stroke-linecap="round"$extra/>');
  } catch (_) {}
  }
}

/// Board-space polygon points string: "x1,y1 x2,y2 …"
String _polyPts(List<List<double>> pts) =>
    pts.map((p) => '${_f(p[0])},${_f(p[1])}').join(' ');

/// Compact float string (3 decimal places max).
String _f(double v) => v.toStringAsFixed(3);

/// Polygon color for the given theme — mirrors `getThemeColor()` in GameBoard.jsx.
String _themeColor(String name, String theme) {
  switch (theme) {
    case 'classic':
      switch (name.toLowerCase()) {
        case 'orange': return 'rgb(100%,54.9%,0%)';
        case 'green':  return 'rgb(0%,80%,32.2%)';
        case 'blue':   return 'rgb(20%,60%,100%)';
        case 'grey':   return 'rgb(66.7%,66.7%,66.7%)';
      }
    case 'tutorial':
      switch (name.toLowerCase()) {
        case 'orange': return '#f97316';
        case 'green':  return '#22c55e';
        case 'blue':   return '#3b82f6';
        case 'grey':   return '#64748b';
      }
    default: // 'default' — CSS named colors (legacy default theme)
      switch (name.toLowerCase()) {
        case 'orange': return 'orange';
        case 'green':  return 'green';
        case 'blue':   return 'blue';
        case 'grey':   return 'grey';
      }
  }
  return name;
}
