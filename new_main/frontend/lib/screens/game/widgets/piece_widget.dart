import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../models/models.dart';
import '../painters/piece_svg.dart';

/// A piece overlay rendered as an [AnimatedPositioned] on the board Stack.
///
/// Supports both click-to-move (onTap) and drag-and-drop (onDropTarget).
/// During drag the widget switches to a non-animated [Positioned] so the
/// piece follows the pointer with zero lag.
class PieceWidget extends StatefulWidget {
  final Piece piece;
  final Offset position;    // centre in screen coords (Stack-local)
  final double size;        // widget side length in px
  final bool isSelected;
  final bool isEligible;    // kept for API compat
  final bool isDraggable;
  final bool isGrayed;      // off-board + ineligible: grayscale + dim
  final ValueChanged<Piece> onTap;
  /// Called when a drag gesture begins — use to select the piece and show legal moves.
  final ValueChanged<Piece>? onDragStart;
  /// Called immediately on pointer-down (before gesture arena resolves).
  /// Use to pre-fetch legal moves so they're cached before the drag ends.
  final ValueChanged<Piece>? onPointerDown;
  /// Called on drag-end: pos is the finger's final position (Stack-local), id is piece.id.
  /// Delivering the piece id avoids reading stale legalMoves from the provider.
  final void Function(Offset pos, String pieceId)? onDropTarget;

  const PieceWidget({
    super.key,
    required this.piece,
    required this.position,
    required this.size,
    required this.isSelected,
    required this.isEligible,
    required this.isDraggable,
    required this.onTap,
    this.isGrayed = false,
    this.onDragStart,
    this.onPointerDown,
    this.onDropTarget,
  });

  @override
  State<PieceWidget> createState() => _PieceWidgetState();
}

class _PieceWidgetState extends State<PieceWidget> {
  /// Non-null only while the user is dragging.
  Offset? _dragPos;

  // Grayscale ColorFilter — matches legacy CSS grayscale(100%)
  static const _grayFilter = ColorFilter.matrix(<double>[
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0,      0,      0,      1, 0,
  ]);

  @override
  void didUpdateWidget(covariant PieceWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When the game state moves this piece to a new polygon, widget.position
    // changes.  Clear _dragPos so AnimatedPositioned smoothly animates from
    // the drag-drop point to the new polygon center.
    if (widget.position != oldWidget.position && _dragPos != null) {
      setState(() => _dragPos = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final p = widget.piece;

    // ── SVG icon (legacy-faithful PieceIcon) ─────────────────────────────────
    Widget icon = SvgPicture.string(
      buildPieceSvg(p.type, p.side, isSelected: widget.isSelected),
      width: s,
      height: s,
      fit: BoxFit.contain,
    );

    if (widget.isGrayed) {
      icon = Opacity(
        opacity: 0.7,
        child: ColorFiltered(colorFilter: _grayFilter, child: icon),
      );
    }

    // Slightly enlarge piece during drag for visual feedback
    if (_dragPos != null) {
      icon = Transform.scale(scale: 1.15, child: icon);
    }

    // ── Gesture layer ─────────────────────────────────────────────────────────
    final gesture = GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () => widget.onTap(p),

      // ── Drag ─────────────────────────────────────────────────────────────
      onPanStart: widget.isDraggable
          ? (d) {
              // Select the piece immediately so legal-move circles appear
              widget.onDragStart?.call(widget.piece);
              setState(() => _dragPos = widget.position);
            }
          : null,
      onPanUpdate: widget.isDraggable
          ? (d) => setState(() => _dragPos = _dragPos! + d.delta)
          : null,
      onPanEnd: widget.isDraggable
          ? (d) {
              final endPos = _dragPos;
              // DON'T clear _dragPos here — keep the piece at the drop position.
              // _dragPos is cleared in didUpdateWidget when widget.position
              // changes (game state update), so the piece animates smoothly
              // from drop-point → target polygon center.
              if (endPos != null) {
                widget.onDropTarget?.call(endPos, widget.piece.id);
                // Safety: if the move is illegal (widget.position won't change),
                // snap back after a short delay.
                Future.delayed(const Duration(milliseconds: 100), () {
                  if (mounted && _dragPos != null) {
                    setState(() => _dragPos = null);
                  }
                });
              }
            }
          : null,
      onPanCancel: widget.isDraggable
          ? () => setState(() => _dragPos = null)
          : null,

      child: icon,
    );

    // Wrap with Listener so onPointerDown fires immediately,
    // before the gesture arena resolves — giving the server
    // a head-start to compute legal moves.
    final listener = Listener(
      onPointerDown: widget.onPointerDown != null
          ? (_) => widget.onPointerDown!(p)
          : null,
      child: gesture,
    );

    // ── Positioning ───────────────────────────────────────────────────────────
    // IMPORTANT: Always use AnimatedPositioned (same widget type).
    // Switching between Positioned and AnimatedPositioned mid-gesture
    // destroys the child subtree (including the GestureDetector), killing
    // the active pan gesture — causing the "first drag doesn't work" bug.
    final center = _dragPos ?? widget.position;
    final left   = center.dx - s / 2;
    final top    = center.dy - s / 2;

    return AnimatedPositioned(
      duration: _dragPos != null
          ? Duration.zero                            // drag: instant updates
          : const Duration(milliseconds: 100),       // idle: smooth animation
      curve: Curves.easeOut,
      left: left, top: top,
      width: s, height: s,
      child: listener,
    );
  }
}
