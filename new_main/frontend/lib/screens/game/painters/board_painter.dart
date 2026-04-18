import 'package:flutter/material.dart';
import '../../../models/models.dart';

/// Paints the board polygon layer: filled polygons + edge overlays.
/// Mirrors the legacy SVG rendering in GameBoard.jsx exactly:
///   – "default" CSS named colors (orange/green/blue/grey)
///   – thin black strokeWidth 0.5 on polygons
///   – allEdges rendered on top: red edges (#ef4444, width 3) and
///     black edges (width 0.5, opacity 0.6)
///   – legal-move highlight (green tint fill + green border)
///   – selected polygon highlight (white tint fill)
///
/// Screen transform (matches PieceWidget Positioned offsets exactly):
///   screen_pt = Offset(offsetX + raw.x * scale,  offsetY + raw.y * scale)
class BoardPainter extends CustomPainter {
  final Map<String, BoardPolygon> polygons;

  /// Raw edge data from board.allEdges: { id: {sharedPoints: [[x,y],[x,y]], color: 'red'|...} }
  final Map<String, dynamic> allEdges;

  final Set<String> legalMoveTargets;
  final String? selectedPolygon;
  final String colorTheme;
  final bool isFlipped;
  final Offset center;
  final List<String> occupiedPolygons; // polygon names that have a piece on them

  // Transform
  final double scale;
  final double offsetX;
  final double offsetY;

  const BoardPainter({
    required this.polygons,
    this.allEdges = const {},
    this.legalMoveTargets = const {},
    this.selectedPolygon,
    this.colorTheme = 'default',
    this.isFlipped = false,
    required this.center,
    required this.scale,
    required this.offsetX,
    required this.offsetY,
    this.occupiedPolygons = const [],
  });

  // ── Paint ──────────────────────────────────────────────────────────────────

  @override
  void paint(Canvas canvas, Size size) {
    if (polygons.isEmpty) return;

    // Apply the identical transform used for PieceWidget Positioned offsets.
    canvas.save();
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale, scale);

    // 1 / scale = the stroke width (in board-space) that renders as 1 screen pixel.
    // Using this ensures edges are always sharp and never sub-pixel thin.
    final px = 1.0 / scale;

    // Pass 1 — polygon fills
    for (final poly in polygons.values) {
      _paintPolyFill(canvas, poly);
    }

    // Pass 2 — thin black borders
    for (final poly in polygons.values) {
      _paintPolyBorder(canvas, poly, px);
    }

    // Pass 3 — allEdges overlay
    _paintEdges(canvas, px);

    // Pass 4 — move indicator dots (drawn after edges, below pieces)
    _paintMoveIndicators(canvas);

    canvas.restore();
  }

  // ── Polygon fill ────────────────────────────────────────────────────────────

  void _paintPolyFill(Canvas canvas, BoardPolygon poly) {
    if (poly.points.length < 3) return;
    final pts = _transformedPoints(poly.points);
    final path = _buildPath(pts);

    final isSelected = selectedPolygon == poly.name;
    final Color fill = isSelected
        ? Color.lerp(_polyColor(poly.color), Colors.white, 0.35)!
        : _polyColor(poly.color);

    canvas.drawPath(path, Paint()
      ..color = fill
      ..style = PaintingStyle.fill
      ..isAntiAlias = true);

    // Selected polygon: bright highlight ring
    if (isSelected) {
      canvas.drawPath(path, Paint()
        ..color = Colors.white.withValues(alpha: 0.7)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5 / scale   // 2.5 screen pixels
        ..strokeJoin = StrokeJoin.round
        ..isAntiAlias = true);
    }
  }

  // ── Thin black border on each polygon ─────────────────────────────────────

  void _paintPolyBorder(Canvas canvas, BoardPolygon poly, double px) {
    if (poly.points.length < 3) return;
    final pts = _transformedPoints(poly.points);
    final path = _buildPath(pts);

    canvas.drawPath(path, Paint()
      ..color = Colors.black.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0 * px        // 3 screen pixels
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true);
  }

  // ── allEdges overlay ────────────────────────────────────────────────────────
  // Legacy: red edges → stroke="#ef4444" strokeWidth="3" opacity=1
  //         black edges → stroke="black" strokeWidth="0.5" opacity=0.6
  //
  // Two-pass rendering: black edges first, then red on top — so red is always
  // in the foreground regardless of the order keys arrive in the map.

  void _paintEdges(Canvas canvas, double px) {
    _paintEdgePass(canvas, px, redOnly: false);  // pass 1: black edges
    _paintEdgePass(canvas, px, redOnly: true);   // pass 2: red edges (always on top)
  }

  void _paintEdgePass(Canvas canvas, double px, {required bool redOnly}) {
    for (final entry in allEdges.entries) {
      try {
        final edge = entry.value as Map;
        final isRed = edge['color'] == 'red';
        if (redOnly != isRed) continue;               // skip the other pass's edges

        final pts = edge['sharedPoints'];
        if (pts == null || (pts as List).length < 2) continue;
        final p0 = pts[0] as List;
        final p1 = pts[1] as List;

        final x0 = (p0[0] as num).toDouble();
        final y0 = (p0[1] as num).toDouble();
        final x1 = (p1[0] as num).toDouble();
        final y1 = (p1[1] as num).toDouble();

        // Apply flip
        double fx0 = x0, fy0 = y0, fx1 = x1, fy1 = y1;
        if (isFlipped) {
          fx0 = 2 * center.dx - x0; fy0 = 2 * center.dy - y0;
          fx1 = 2 * center.dx - x1; fy1 = 2 * center.dy - y1;
        }

        canvas.drawLine(
          Offset(fx0, fy0),
          Offset(fx1, fy1),
          Paint()
            ..color = isRed
                ? const Color(0xFFCC0000)            // deep red — not pinkish
                : Colors.black.withValues(alpha: 0.60)  // opacity 0.6
            ..strokeWidth = isRed ? 3.0 * px : 3.0 * px  // all edges 3px
            ..strokeCap = StrokeCap.round
            ..isAntiAlias = true,
        );
      } catch (_) {}
    }
  }

  // ── Move indicator dots ─────────────────────────────────────────────────────
  // Legacy: r=5 black circle for empty target; r=16 red ring for occupied target

  void _paintMoveIndicators(Canvas canvas) {
    for (final targetId in legalMoveTargets) {
      final poly = polygons[targetId];
      if (poly == null || poly.center.length < 2) continue;

      double cx = poly.center[0], cy = poly.center[1];
      if (isFlipped) {
        cx = 2 * center.dx - cx;
        cy = 2 * center.dy - cy;
      }
      final c = Offset(cx, cy);
      final isOccupied = occupiedPolygons.contains(targetId);

      if (isOccupied) {
        canvas.drawCircle(c, 16, Paint()
          ..color = const Color(0x66EF4444)
          ..style = PaintingStyle.fill
          ..isAntiAlias = true);
        canvas.drawCircle(c, 16, Paint()
          ..color = const Color(0xFFEF4444)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0 / scale
          ..isAntiAlias = true);
      } else {
        canvas.drawCircle(c, 5, Paint()
          ..color = const Color(0x66000000)
          ..style = PaintingStyle.fill
          ..isAntiAlias = true);
        canvas.drawCircle(c, 5, Paint()
          ..color = const Color(0x33000000)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.0 / scale
          ..isAntiAlias = true);
      }
    }
  }


  Path _buildPath(List<Offset> pts) {
    final path = Path();
    path.moveTo(pts[0].dx, pts[0].dy);
    for (int i = 1; i < pts.length; i++) {
      path.lineTo(pts[i].dx, pts[i].dy);
    }
    path.close();
    return path;
  }

  List<Offset> _transformedPoints(List<List<double>> rawPoints) {
    return rawPoints.map((p) {
      if (isFlipped) {
        return Offset(2 * center.dx - p[0], 2 * center.dy - p[1]);
      }
      return Offset(p[0], p[1]);
    }).toList();
  }

  /// CSS named color equivalents for the "default" theme (matches browser rendering).
  Color _polyColor(String name) {
    switch (colorTheme) {
      case 'classic':
        switch (name.toLowerCase()) {
          case 'orange': return const Color(0xFFFF8C00);
          case 'green':  return const Color(0xFF00CC52);
          case 'blue':   return const Color(0xFF3399FF);
          case 'grey':   return const Color(0xFFAAAAAA);
        }
      case 'tutorial':
        switch (name.toLowerCase()) {
          case 'orange': return const Color(0xFFF97316);
          case 'green':  return const Color(0xFF22C55E);
          case 'blue':   return const Color(0xFF3B82F6);
          case 'grey':   return const Color(0xFF64748B);
        }
      default: // 'default' — CSS named colors as rendered by most browsers
        switch (name.toLowerCase()) {
          case 'orange': return const Color(0xFFFFA500);
          case 'green':  return const Color(0xFF008000);
          case 'blue':   return const Color(0xFF0000FF);
          case 'grey':   return const Color(0xFF808080);
        }
    }
    return Colors.grey;
  }

  @override
  bool shouldRepaint(BoardPainter old) {
    return old.polygons != polygons ||
        old.allEdges != allEdges ||
        old.legalMoveTargets != legalMoveTargets ||
        old.selectedPolygon != selectedPolygon ||
        old.isFlipped != isFlipped ||
        old.colorTheme != colorTheme ||
        old.scale != scale ||
        old.offsetX != offsetX ||
        old.offsetY != offsetY;
  }
}
