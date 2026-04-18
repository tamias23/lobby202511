import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../models/models.dart';
import '../painters/board_svg.dart';
import '../painters/piece_svg.dart';

/// A simple piece descriptor for [BoardWidget].
/// Used in read-only contexts (analysis, tutorial) where no Piece model is needed.
class BoardPieceData {
  final String id;
  final String type;
  final String side;
  final String position; // polygon id | 'returned' | 'graveyard'
  final bool isSelected;
  const BoardPieceData({
    required this.id,
    required this.type,
    required this.side,
    required this.position,
    this.isSelected = false,
  });
}

/// A self-contained board + piece renderer, reusable across game and analysis.
///
/// Internally mirrors the game screen's board stack exactly:
///   • board drawn with [SvgPicture.string] (key: 'board_svg') — stable across
///     rebuilds when SVG content doesn't change → zero async-reparse flicker.
///   • pieces drawn with [AnimatedPositioned] keyed by piece id — same widget
///     element is reused across steps, moves animate smoothly.
///
/// [onPolyTap] and [onPieceTap] are optional; omit for a read-only board.
/// [onGeometry] fires once per layout with the current transform values so the
/// parent can cache them for drag-and-drop coordinate conversion.
class BoardWidget extends StatelessWidget {
  final Map<String, BoardPolygon> polygons;
  final Map<String, dynamic> allEdges;
  final Set<String> legalMoveTargets;
  final String? selectedPolygon;
  final bool isFlipped;
  final String colorTheme;
  final List<BoardPieceData> pieces;

  /// Optional polygon tap handler (enables board gesture detection).
  final void Function(String polyId)? onPolyTap;

  /// Optional piece tap handler.
  final void Function(BoardPieceData piece)? onPieceTap;

  /// Extra overlay widgets placed on top (banners, game-over cards, etc.).
  final List<Widget> overlays;

  /// Called during each layout with the resolved transform values.
  /// Use this to cache values needed for drag coordinate conversion.
  final void Function(
    double scale,
    double offsetX,
    double offsetY,
    double boardCx,
    double boardCy,
  )? onGeometry;

  const BoardWidget({
    super.key,
    required this.polygons,
    required this.allEdges,
    required this.legalMoveTargets,
    this.selectedPolygon,
    required this.isFlipped,
    required this.colorTheme,
    required this.pieces,
    this.onPolyTap,
    this.onPieceTap,
    this.overlays = const [],
    this.onGeometry,
  });

  // ── Board-bounds helper (mirrors _boardBounds in game_board.dart) ───────────
  ({double minX, double minY, double maxX, double maxY}) _bounds() {
    double minX = double.infinity, minY = double.infinity;
    double maxX = double.negativeInfinity, maxY = double.negativeInfinity;
    for (final poly in polygons.values) {
      for (final pt in poly.points) {
        minX = math.min(minX, pt[0]);
        minY = math.min(minY, pt[1]);
        maxX = math.max(maxX, pt[0]);
        maxY = math.max(maxY, pt[1]);
      }
    }
    return (minX: minX, minY: minY, maxX: maxX, maxY: maxY);
  }

  // ── Point-in-polygon (ray-casting) ─────────────────────────────────────────
  bool _pip(double x, double y, List<List<double>> pts) {
    bool inside = false;
    for (int i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      final xi = pts[i][0], yi = pts[i][1];
      final xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) != (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  @override
  Widget build(BuildContext context) {
    if (polygons.isEmpty) return const SizedBox.shrink();

    final b = _bounds();
    final boardCx = (b.minX + b.maxX) / 2;
    final boardCy = (b.minY + b.maxY) / 2;

    return LayoutBuilder(builder: (context, constraints) {
      const padding = 16.0;
      final availW = constraints.maxWidth  - padding * 2;
      final availH = constraints.maxHeight - padding * 2;
      final scale  = math.min(
        availW / (b.maxX - b.minX),
        availH / (b.maxY - b.minY),
      );
      final offsetX = padding + (availW - (b.maxX - b.minX) * scale) / 2
                      - b.minX * scale;
      final offsetY = padding + (availH - (b.maxY - b.minY) * scale) / 2
                      - b.minY * scale;

      // Inform parent of the transform (for drag coordinate conversion)
      onGeometry?.call(scale, offsetX, offsetY, boardCx, boardCy);

      final pSize = (scale * 36.0).clamp(28.0, 90.0);

      // Board SVG — key is STABLE so the SvgPicture widget is never recreated.
      // When SVG content doesn't change, flutter_svg reuses the parsed picture → no flicker.
      final boardSvg = buildBoardSvg(
        width:            constraints.maxWidth,
        height:           constraints.maxHeight,
        scale:            scale,
        offsetX:          offsetX,
        offsetY:          offsetY,
        polygons:         polygons,
        allEdges:         allEdges,
        legalMoveTargets: legalMoveTargets,
        selectedPolygon:  selectedPolygon,
        isFlipped:        isFlipped,
        colorTheme:       colorTheme,
        boardCx:          boardCx,
        boardCy:          boardCy,
        occupiedPolygons: pieces
            .where((p) => p.position != 'returned' && p.position != 'graveyard')
            .map((p) => p.position)
            .toList(),
      );

      return Stack(
        clipBehavior: Clip.none,
        children: [
          // ── Board ───────────────────────────────────────────────────────────
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTapUp: onPolyTap != null
                  ? (d) {
                      double bx = (d.localPosition.dx - offsetX) / scale;
                      double by = (d.localPosition.dy - offsetY) / scale;
                      if (isFlipped) {
                        bx = 2 * boardCx - bx;
                        by = 2 * boardCy - by;
                      }
                      for (final poly in polygons.values) {
                        if (_pip(bx, by, poly.points)) {
                          onPolyTap!(poly.name);
                          return;
                        }
                      }
                    }
                  : null,
              child: SvgPicture.string(
                boardSvg,
                key: const ValueKey('board_svg'),
                fit: BoxFit.none,
              ),
            ),
          ),

          // ── Pieces (AnimatedPositioned + ValueKey = zero flicker) ────────
          for (final p in pieces) _buildPiece(
            p, pSize, scale, offsetX, offsetY, boardCx, boardCy,
          ),

          // ── Extra overlays (banners etc.) ────────────────────────────────
          ...overlays,
        ],
      );
    });
  }

  Widget _buildPiece(
    BoardPieceData p,
    double pSize,
    double scale,
    double offsetX,
    double offsetY,
    double boardCx,
    double boardCy,
  ) {
    if (p.position == 'graveyard' || p.position == 'returned') {
      return const SizedBox.shrink();
    }
    final poly = polygons[p.position];
    if (poly == null) return const SizedBox.shrink();

    double cx = poly.center[0], cy = poly.center[1];
    if (isFlipped) {
      cx = 2 * boardCx - cx;
      cy = 2 * boardCy - cy;
    }
    final left = offsetX + cx * scale - pSize / 2;
    final top  = offsetY + cy * scale - pSize / 2;

    final icon = SvgPicture.string(
      buildPieceSvg(p.type, p.side, isSelected: p.isSelected),
      fit: BoxFit.contain,
    );

    return AnimatedPositioned(
      key: ValueKey('bw_${p.id}'),
      duration: const Duration(milliseconds: 150),
      curve: Curves.easeOut,
      left: left, top: top,
      width: pSize, height: pSize,
      child: onPieceTap != null
          ? GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => onPieceTap!(p),
              child: icon,
            )
          : icon,
    );
  }
}
