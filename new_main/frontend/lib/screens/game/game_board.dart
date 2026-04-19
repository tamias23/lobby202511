import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/game_provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'painters/board_svg.dart';
import 'widgets/piece_widget.dart';
import 'widgets/clock_widget.dart';
import 'widgets/action_buttons.dart';
import 'widgets/game_over_overlay.dart';
import '../../providers/bg_provider.dart';

// ── Color themes — mirrors legacy COLOR_THEMES in GameBoard.jsx ───────────────

enum ColorTheme {
  default_theme, // 'default' — CSS named colors
  classic,       // 'classic' — faithful rgb() values
  tutorial,      // 'tutorial' — hex values
}

extension ColorThemeX on ColorTheme {
  String get themeString {
    switch (this) {
      case ColorTheme.default_theme: return 'default';
      case ColorTheme.classic:       return 'classic';
      case ColorTheme.tutorial:      return 'tutorial';
    }
  }
  String get label {
    switch (this) {
      case ColorTheme.default_theme: return '🟠 Default';
      case ColorTheme.classic:       return '🎨 Classic';
      case ColorTheme.tutorial:      return '📘 Tutorial';
    }
  }
  String resolveColor(String logicalColor) {
    switch (this) {
      case ColorTheme.default_theme:
        switch (logicalColor) {
          case 'orange': return '#F97316';
          case 'green':  return '#22C55E';
          case 'blue':   return '#3B82F6';
          case 'grey':   return '#94A3B8';
          default:       return logicalColor;
        }
      case ColorTheme.classic:
        switch (logicalColor) {
          case 'orange': return 'rgb(100%,54.9%,0%)';
          case 'green':  return 'rgb(0%,80%,32.2%)';
          case 'blue':   return 'rgb(20%,60%,100%)';
          case 'grey':   return 'rgb(66.7%,66.7%,66.7%)';
          default:       return logicalColor;
        }
      case ColorTheme.tutorial:
        switch (logicalColor) {
          case 'orange': return '#F97316';
          case 'green':  return '#22C55E';
          case 'blue':   return '#3B82F6';
          case 'grey':   return '#64748B';
          default:       return logicalColor;
        }
    }
  }
}

/// Main game board widget.
/// Layout: a Column with player bars above/below a Stack containing
/// the board canvas (CustomPaint) + piece widgets (PieceWidget overlays).
class GameBoard extends ConsumerStatefulWidget {
  final String gameId;
  final String side;          // 'white' | 'black' | 'spectator'
  final String? tournamentId;

  const GameBoard({
    super.key,
    required this.gameId,
    required this.side,
    this.tournamentId,
  });

  @override
  ConsumerState<GameBoard> createState() => _GameBoardState();
}

class _GameBoardState extends ConsumerState<GameBoard> {
  bool _isFlipped = false;
  ColorTheme _colorTheme = ColorTheme.default_theme;

  // ── Geometry cached during build — safe to read in gesture handlers ─────────
  // Direct assignment (no setState) keeps them in sync with the latest build
  // but avoids triggering spurious rebuilds.
  Map<String, BoardPolygon> _latestPolygons = {};
  double _latestScale   = 1.0;
  double _latestOffsetX = 0.0;
  double _latestOffsetY = 0.0;
  double _latestBoardCx = 0.0;
  double _latestBoardCy = 0.0;

  // 20-second disconnect auto-navigate timer (mirrors legacy)
  Timer? _disconnectTimer;

  @override
  void initState() {
    super.initState();
    // Always orient board so the local player's pieces are at the bottom.
    _isFlipped = widget.side == 'black';
  }

  String _resolveColor(String logicalColor) => _colorTheme.resolveColor(logicalColor);

  /// Compute bounding box of all polygons for viewBox calculation.
  ({double minX, double minY, double maxX, double maxY}) _boardBounds(
      Map<String, BoardPolygon> polys) {
    double minX = double.infinity, minY = double.infinity;
    double maxX = double.negativeInfinity, maxY = double.negativeInfinity;
    for (final poly in polys.values) {
      for (final pt in poly.points) {
        minX = math.min(minX, pt[0]);
        minY = math.min(minY, pt[1]);
        maxX = math.max(maxX, pt[0]);
        maxY = math.max(maxY, pt[1]);
      }
    }
    // Mirror the legacy SVG viewBox calculation:
    //   padX = 60  — wide enough to include off-board piece clusters
    //               at x≈-33 (white side) and x≈443 (black side).
    // Without this, off-board pieces at negative X board-coords produce
    // a negative screen-X that falls outside the Stack's layout box,
    // so their GestureDetectors are never hit-tested.
    const double padX = 60;
    const double padY = 20;
    return (minX: minX - padX, minY: minY - padY,
            maxX: maxX + padX, maxY: maxY + padY);
  }

  /// Convert raw board JSON to a map of BoardPolygon objects.
  Map<String, BoardPolygon> _parsePolygons(Map<String, dynamic> boardData) {
    final rawPolys = boardData['allPolygons'] as Map<String, dynamic>?;
    if (rawPolys == null) return {};
    final result = <String, BoardPolygon>{};
    for (final entry in rawPolys.entries) {
      try {
        result[entry.key] = BoardPolygon.fromJson(entry.value as Map<String, dynamic>);
      } catch (_) {}
    }
    return result;
  }

  /// Extract allEdges map from board JSON (raw — painter handles it).
  Map<String, dynamic> _parseEdges(Map<String, dynamic> boardData) {
    final raw = boardData['allEdges'];
    if (raw == null) return {};
    try {
      return Map<String, dynamic>.from(raw as Map);
    } catch (_) {
      return {};
    }
  }

  /// Map a board canvas coordinate to widget screen offset, accounting for
  /// the transform matrix used by the FittedBox/CustomPaint.
  Offset _boardToScreen(
    List<double> center, {
    required double scaleX,
    required double scaleY,
    required double offsetX,
    required double offsetY,
    required bool flipped,
    required double boardCx,
    required double boardCy,
  }) {
    double x = center[0];
    double y = center[1];
    if (flipped) {
      x = 2 * boardCx - x;
      y = 2 * boardCy - y;
    }
    return Offset(offsetX + x * scaleX, offsetY + y * scaleY);
  }

  // ── Interaction ─────────────────────────────────────────────────────────────

  void _onPolyTap(String polyName, GameBoardState gameState) {
    final gs = gameState.gameState;
    if (gs == null) return;
    final notifier = ref.read(gameProvider(widget.gameId).notifier);
    final myTurn = (gs.turn == 'white' && widget.side == 'white') ||
        (gs.turn == 'black' && widget.side == 'black');

    if (!myTurn && widget.side != 'spectator') return;
    if (widget.side == 'spectator') return;

    final selected = gameState.selectedPieceId;

    // If a piece is selected and this polygon is in legal moves → apply move
    if (selected != null && gameState.legalMoves.contains(polyName)) {
      notifier.applyMove(pieceId: selected, targetPolygon: polyName);
      return;
    }

    // Check if a piece is on this polygon → select it (local eligibility)
    final pieceOnPoly = gs.pieces.firstWhere(
      (p) => p.position == polyName,
      orElse: () => const Piece(id: '', type: '', side: '', position: ''),
    );
    if (pieceOnPoly.id.isNotEmpty && _isEligible(pieceOnPoly, gs)) {
      notifier.selectPiece(pieceOnPoly.id);
    }
  }

  /// Local eligibility — mirrors key rules from get_eligible_pieces_wasm.
  /// Fixes vs previous version:
  ///   1. Must be MY turn (widget.side == gs.turn), not just piece's side's turn.
  ///   2. Returned pieces ARE selectable (to place back) — only blocked before
  ///      color choice in Playing phase (legacy rule).
  ///   3. Graveyard pieces can never be selected.
  bool _isEligible(Piece piece, GameState gs) {
    if (widget.side == 'spectator') return false;
    // Must be the player's own turn
    if (gs.turn != widget.side) return false;
    // Can only select own pieces
    if (piece.side != widget.side) return false;
    // Graveyard: never selectable
    if (piece.position == 'graveyard') return false;
    // Returned pieces are blocked ONLY before color is chosen (legacy rule):
    //   if (phase==='Playing' && !colorChosen[side] && piece.position==='returned') return
    if (gs.phase == 'Playing' &&
        piece.position == 'returned' &&
        gs.colorChosen[widget.side] == null) return false;
    // If a specific piece is locked, only it is eligible
    final locked = gs.lockedSequencePiece;
    if (locked != null && locked.isNotEmpty && piece.id != locked) return false;
    return true;
  }

  void _onPieceTap(Piece piece, GameBoardState gameState) {
    final gs = gameState.gameState;
    if (gs == null) return;
    if (widget.side == 'spectator') return;
    final notifier = ref.read(gameProvider(widget.gameId).notifier);
    final myTurn = gs.turn == widget.side;

    // Debug: always visible in F12 console
    debugPrint('[PieceTap] id=${piece.id} type=${piece.type} side=${piece.side}'
        ' pos=${piece.position}');
    debugPrint('[PieceTap] gs.turn=${gs.turn} widget.side=${widget.side}'
        ' myTurn=$myTurn phase=${gs.phase}');
    debugPrint('[PieceTap] locked=${gs.lockedSequencePiece}'
        ' colorChosen=${gs.colorChosen}');
    debugPrint('[PieceTap] legalMoves=${gameState.legalMoves}'
        ' selectedPiece=${gameState.selectedPieceId}');

    // If this piece is a legal move target (enemy on a legal square) → apply move
    if (gameState.selectedPieceId != null && gameState.legalMoves.contains(piece.position)) {
      debugPrint('[PieceTap] → applying move to ${piece.position}');
      notifier.applyMove(pieceId: gameState.selectedPieceId!, targetPolygon: piece.position);
      return;
    }

    if (!myTurn) {
      debugPrint('[PieceTap] REJECTED — not my turn');
      return;
    }

    // Select/deselect using local eligibility (no WASM needed)
    final eligible = _isEligible(piece, gs);
    debugPrint('[PieceTap] isEligible=$eligible');
    if (eligible) {
      notifier.selectPiece(piece.id);
    } else {
      if (gs.turn != widget.side) debugPrint('[PieceTap] REJECT — wrong turn');
      else if (piece.side != widget.side) debugPrint('[PieceTap] REJECT — opponent piece');
      else if (piece.position == 'graveyard') debugPrint('[PieceTap] REJECT — graveyard');
      else if (gs.phase == 'Playing' && piece.position == 'returned'
               && gs.colorChosen[widget.side] == null)
        debugPrint('[PieceTap] REJECT — returned+no color yet');
      else if (gs.lockedSequencePiece != null && gs.lockedSequencePiece!.isNotEmpty
               && piece.id != gs.lockedSequencePiece)
        debugPrint('[PieceTap] REJECT — locked to ${gs.lockedSequencePiece}');
    }
  }

  @override
  void dispose() {
    _disconnectTimer?.cancel();
    super.dispose();
  }

  // ── Disconnect timer ─────────────────────────────────────────────────────────

  void _onDisconnected() {
    _disconnectTimer ??= Timer(const Duration(seconds: 20), () {
      if (!mounted) return;
      final dest = widget.tournamentId != null ? '/tournament/${widget.tournamentId}' : '/';
      context.go(dest);
    });
  }

  void _onReconnected() {
    _disconnectTimer?.cancel();
    _disconnectTimer = null;
  }

  @override
  Widget build(BuildContext context) {
    final gameState = ref.watch(gameProvider(widget.gameId));
    final gs = gameState.gameState;

    // Drive disconnect / reconnect timer from UI side so we have context.
    if (gameState.isSocketDisconnected) {
      _onDisconnected();
    } else {
      _onReconnected();
    }

    if (gs == null) {
      return const Scaffold(
        backgroundColor: DTheme.bgDark,
        body: Center(child: CircularProgressIndicator(color: DTheme.primary)),
      );
    }

    final polygons = _parsePolygons(gs.board);

    final bg = ref.watch(bgProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,  // let global AppBackground show through
      body: SafeArea(
        child: Stack(
          children: [
            // ── Main layout ────────────────────────────────────────────────
            Row(
              children: [
                // ── Left player panel ──────────────────────────────────────
                SizedBox(
                  width: 193,
                  child: _buildPlayerPanel(gs),
                ),

                // ── Board + right action panel ──────────────────────────────
                Expanded(
                  child: Column(
                    children: [
                      // ── Main board area ───────────────────────────────────
                      Expanded(
                        child: Row(
                          children: [
                            Expanded(
                              flex: 3,
                              child: _buildBoardStack(context, gs, polygons, gameState),
                            ),
                            if (MediaQuery.of(context).size.width > 600)
                              SizedBox(
                                width: 180,
                                child: SingleChildScrollView(
                                  child: _buildActionPanel(context, gs, gameState)),
                              ),
                          ],
                        ),
                      ),
                      if (MediaQuery.of(context).size.width <= 600)
                        _buildActionPanel(context, gs, gameState),
                    ],
                  ),
                ),
              ],
            ),

            // ── Background toggle — top right (mirrors lobby) ──────────────
            Positioned(
              top: 8, right: 8,
              child: _GameBgToggle(
                bg: bg,
                onTap: () => ref.read(bgProvider.notifier).cycle(),
              ),
            ),
            // ── Spectator banner — top left ────────────────────────────────
            if (widget.side == 'spectator')
              Positioned(
                top: 8, left: 200, // offset from the left panel
                child: _SpectatorBanner(tournamentId: widget.tournamentId),
              ),
          ],
        ),
      ),
    );
  }

  // ── Left vertical player panel ───────────────────────────────────────────────

  Widget _buildPlayerPanel(GameState gs) {
    final topSide    = _isFlipped ? 'black' : 'white';
    final bottomSide = _isFlipped ? 'white' : 'black';

    String nameFor(String side) => side == 'black'
        ? (gs.blackName ?? 'Black') : (gs.whiteName ?? 'White');
    String roleFor(String side) => side == 'black'
        ? (gs.blackRole ?? 'player') : (gs.whiteRole ?? 'player');
    double? ratingFor(String side) => side == 'black' ? gs.blackRating : gs.whiteRating;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        border: Border(right: BorderSide(color: Colors.white.withValues(alpha: 0.07))),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Top player card
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 0, 6, 0),
            child: _PlayerCard(
              side: topSide,
              name: nameFor(topSide),
              role: roleFor(topSide),
              rating: ratingFor(topSide),
              clockMs: gs.clocks[topSide] ?? 0,
              lastTurnTs: gs.lastTurnTimestamp,
              isActive: gs.turn == topSide && gs.phase != 'GameOver',
              isRunning: gs.turn == topSide,
              nameOnTop: false, // opponent at top: clock first, name below
            ),
          ),
          // Phase badge
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Text(
                gs.phase == 'GameOver' ? 'END'
                    : gs.phase == 'Setup' ? 'SETUP'
                    : 'PLAY',
                style: GoogleFonts.outfit(
                  fontSize: 9, color: Colors.white38,
                  fontWeight: FontWeight.w700, letterSpacing: 1),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          // Bottom player card
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 0, 6, 0),
            child: _PlayerCard(
              side: bottomSide,
              name: nameFor(bottomSide),
              role: roleFor(bottomSide),
              rating: ratingFor(bottomSide),
              clockMs: gs.clocks[bottomSide] ?? 0,
              lastTurnTs: gs.lastTurnTimestamp,
              isActive: gs.turn == bottomSide && gs.phase != 'GameOver',
              isRunning: gs.turn == bottomSide,
              nameOnTop: true, // local player at bottom: name first, clock below
            ),
          ),
        ],
      ),
    );
  }

  // ── Board Stack (canvas + pieces) ───────────────────────────────────────────


  Widget _buildBoardStack(
      BuildContext context, GameState gs, Map<String, BoardPolygon> polygons, GameBoardState gameState) {
    if (polygons.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: DTheme.primary));
    }

    final bounds = _boardBounds(polygons);
    final boardCx = (bounds.minX + bounds.maxX) / 2;
    final boardCy = (bounds.minY + bounds.maxY) / 2;

    return LayoutBuilder(builder: (context, constraints) {
      const padding = 16.0;
      final availW = constraints.maxWidth  - padding * 2;
      final availH = constraints.maxHeight - padding * 2;
      final scaleX = availW / (bounds.maxX - bounds.minX);
      final scaleY = availH / (bounds.maxY - bounds.minY);
      final scale  = math.min(scaleX, scaleY);

      // Center the scaled board in the available area.
      final scaledBoardW = (bounds.maxX - bounds.minX) * scale;
      final scaledBoardH = (bounds.maxY - bounds.minY) * scale;
      final offsetX = padding + (availW - scaledBoardW) / 2 - bounds.minX * scale;
      final offsetY = padding + (availH - scaledBoardH) / 2 - bounds.minY * scale;

      // ── Cache geometry for gesture handlers (direct assignment, no setState) ──
      _latestPolygons = polygons;
      _latestScale    = scale;
      _latestOffsetX  = offsetX;
      _latestOffsetY  = offsetY;
      _latestBoardCx  = boardCx;
      _latestBoardCy  = boardCy;

      // Selected polygon for the board highlight
      final selectedPiece = gameState.selectedPieceId != null
          ? gs.pieces.firstWhere((p) => p.id == gameState.selectedPieceId,
              orElse: () => const Piece(id: '', type: '', side: '', position: ''))
          : null;

      return Stack(
        clipBehavior: Clip.none,
        children: [
          // ── Board canvas ─────────────────────────────────────────────────
          Positioned.fill(
            child: GestureDetector(
              onTapUp: (details) {
                // screen → raw board coords (inverse of: screen = offsetXY + raw * scale)
                final localPos = details.localPosition;
                double boardX = (localPos.dx - offsetX) / scale;
                double boardY = (localPos.dy - offsetY) / scale;
                // Undo flip if needed
                if (_isFlipped) {
                  boardX = 2 * boardCx - boardX;
                  boardY = 2 * boardCy - boardY;
                }

                String? hit;
                for (final poly in polygons.values) {
                  if (_pointInPolygon(boardX, boardY, poly.points)) {
                    hit = poly.name;
                    break;
                  }
                }
                if (hit != null) _onPolyTap(hit, gameState);
              },
              child: SvgPicture.string(
                buildBoardSvg(
                  width:      constraints.maxWidth,
                  height:     constraints.maxHeight,
                  scale:      scale,
                  offsetX:    offsetX,
                  offsetY:    offsetY,
                  polygons:   polygons,
                  allEdges:   _parseEdges(gs.board),
                  legalMoveTargets: Set<String>.from(gameState.legalMoves),
                  selectedPolygon:  selectedPiece?.position,
                  isFlipped:   _isFlipped,
                  colorTheme:  _colorTheme.themeString,
                  boardCx: boardCx, boardCy: boardCy,
                  occupiedPolygons: gs.pieces
                      .where((p) => p.position != 'returned' && p.position != 'graveyard')
                      .map((p) => p.position)
                      .toList(),
                ),
                fit: BoxFit.none,  // transform already applied inside SVG
              ),
            ),
          ),

          // ── Piece widgets ─────────────────────────────────────────────────
          // Sort by type then id for stable stacking order (legacy uses same sort)
          ...() {
            final sorted = gs.pieces
                .where((p) => p.position != 'graveyard')
                .toList()
              ..sort((a, b) {
                final t = a.type.compareTo(b.type);
                return t != 0 ? t : a.id.compareTo(b.id);
              });
            // Pre-count off-board pieces per side for dynamic step calculation
            final offCounts = {'white': 0, 'black': 0};
            for (final p in sorted) {
              if (p.position == 'returned') {
                offCounts[p.side] = (offCounts[p.side] ?? 0) + 1;
              }
            }
            // Running indices per side
            final offIndices = {'white': 0, 'black': 0};
            return sorted.map((piece) {
              int offIdx = 0, offCnt = 0;
              if (piece.position == 'returned') {
                offIdx = offIndices[piece.side] ?? 0;
                offCnt = offCounts[piece.side] ?? 0;
                offIndices[piece.side] = offIdx + 1;
              }
              return _buildPieceWidget(
                piece, gs, polygons, gameState,
                scale: scale, offsetX: offsetX, offsetY: offsetY,
                boardCx: boardCx, boardCy: boardCy,
                offBoardIdx: offIdx, offBoardCount: offCnt,
              );
            }).toList();
          }(),

          // ── Disconnect banner ─────────────────────────────────────────────
          if (gameState.isSocketDisconnected)
            const Positioned(
              top: 8,
              left: 0,
              right: 0,
              child: _DisconnectBanner(),
            ),

          // ── Game Over overlay ─────────────────────────────────────────────
          if (gameState.gameOverInfo != null || gs.phase == 'GameOver')
            GameOverOverlay(
              gameId: widget.gameId,
              gameState: gs,
              gameOverInfo: gameState.gameOverInfo,
              ratingDelta: gameState.ratingDelta,
              side: widget.side,
              tournamentId: widget.tournamentId,
              gameMoves: gs.moves,
              boardName: gs.boardName,
              onLobby: () => context.go('/'),
            ),
        ],
      );
    });
  }

  Widget _buildPieceWidget(
    Piece piece, GameState gs, Map<String, BoardPolygon> polygons,
    GameBoardState gameState, {
    required double scale,
    required double offsetX,
    required double offsetY,
    required double boardCx,
    required double boardCy,
    // Off-board positioning context
    int offBoardCount = 0,   // total off-board pieces for this side
    int offBoardIdx   = 0,   // this piece's index within off-board list
  }) {
    Offset pos;
    final isOffBoard = piece.position == 'returned';

    if (isOffBoard) {
      // ━━ Legacy landscape layout (GameBoard.jsx renderPieces) ━━━━━━━━━━━━━━━
      // AVAIL_H=350, step = clamp(7.2, 28, 350/total)
      // xOffset = step<16 ? (even ? +13 : -13) : 0
      // white: cx=-20+xOff,  cy=60+idx*step  (board coords)
      // black: cx=430+xOff,  cy=60+idx*step
      const double availH  = 350;
      const double minStep = 7.2;
      const double maxStep = 28;
      final double step    = offBoardCount <= 0
          ? maxStep
          : availH / offBoardCount.clamp(1, 9999).toDouble();
      final double vertStep = step.clamp(minStep, maxStep);
      final double xOff = vertStep < 16
          ? (offBoardIdx.isEven ? 13.0 : -13.0)
          : 0.0;
      final bool isWhite = piece.side == 'white';
      final double rawCx  = (isWhite ? -20.0 : 430.0) + xOff;
      final double rawCy  = 60.0 + offBoardIdx * vertStep;
      // Screen position = same formula as on-board pieces
      pos = Offset(offsetX + rawCx * scale, offsetY + rawCy * scale);
    } else {
      final poly = polygons[piece.position];
      if (poly == null) return const SizedBox.shrink();
      double cx = poly.center[0], cy = poly.center[1];
      if (_isFlipped) { cx = 2 * boardCx - cx; cy = 2 * boardCy - cy; }
      pos = Offset(offsetX + cx * scale, offsetY + cy * scale);
    }

    final pieceSize = (scale * 36.0).clamp(28.0, 90.0);
    // Off-board pieces that aren't eligible should be grayed (legacy: grayscale+dim)
    final isGrayed = isOffBoard && !_isEligible(piece, gs);

    return PieceWidget(
      key: ValueKey(piece.id),
      piece: piece,
      position: pos,
      size: pieceSize,
      isSelected: gameState.selectedPieceId == piece.id,
      isEligible: false,
      isDraggable: widget.side != 'spectator',
      isGrayed: isGrayed,
      onTap: (p) => _onPieceTap(p, gameState),
      onDragStart: (p) => _onPieceDragStart(p, gameState),
      onPointerDown: (p) => _onPiecePointerDown(p, gameState),
      // onDropTarget: pieceId is passed so we can call applyMove directly
      // without waiting for the async legalMoves WebSocket response.
      onDropTarget: (screenPos, pieceId) => _onDragDrop(screenPos, pieceId),
    );
  }

  /// Called on pointer-down (before gesture resolution): pre-fetches legal moves
  /// into the provider cache so that [selectPiece] can return them instantly.
  void _onPiecePointerDown(Piece piece, GameBoardState gameState) {
    final gs = gameState.gameState;
    if (gs == null || widget.side == 'spectator') return;
    if (!_isEligible(piece, gs)) return;
    ref.read(gameProvider(widget.gameId).notifier).prefetchLegalMoves(piece.id);
  }

  /// Called when drag begins on [piece]: selects it to show legal-move circles.
  /// Uses [forceSelectPiece] (never toggles off) so repeated drags on the
  /// same piece don't deselect it.
  void _onPieceDragStart(Piece piece, GameBoardState gameState) {
    final gs = gameState.gameState;
    if (gs == null || widget.side == 'spectator') return;
    if (!_isEligible(piece, gs)) return;
    final notifier = ref.read(gameProvider(widget.gameId).notifier);
    notifier.forceSelectPiece(piece.id);
  }

  /// Called when a piece is drag-released.
  /// Converts screen pos → board coords → polygon, then applies the move
  /// only if the target is in the (prefetched) legal moves list.
  ///
  /// The prefetch fires on pointer-down (hundreds of ms before the finger
  /// lifts), so legalMoves is almost always populated by drop time.
  /// If the prefetch hasn't arrived yet, we fall back to just selecting
  /// the piece so the user can click/tap the target square.
  void _onDragDrop(Offset screenPos, String pieceId) {
    final freshState = ref.read(gameProvider(widget.gameId));
    final notifier = ref.read(gameProvider(widget.gameId).notifier);

    double bx = (screenPos.dx - _latestOffsetX) / _latestScale;
    double by = (screenPos.dy - _latestOffsetY) / _latestScale;
    if (_isFlipped) {
      bx = 2 * _latestBoardCx - bx;
      by = 2 * _latestBoardCy - by;
    }

    for (final poly in _latestPolygons.values) {
      if (_pointInPolygon(bx, by, poly.points)) {
        final legalMoves = freshState.legalMoves;
        if (legalMoves.contains(poly.name)) {
          // Legal target — apply the move.
          notifier.applyMove(pieceId: pieceId, targetPolygon: poly.name);
        } else {
          debugPrint('[DragDrop] ${poly.name} not in legalMoves=$legalMoves');
          // Piece stays selected (from onDragStart) — circles remain visible
          // so the user can tap a legal square instead.
        }
        return;
      }
    }
    // Dropped outside all polygons — piece stays selected, circles visible.
  }


  // ── Action panel ────────────────────────────────────────────────────────────

  Widget _buildActionPanel(BuildContext context, GameState gs, GameBoardState gameState) {
    final notifier = ref.read(gameProvider(widget.gameId).notifier);
    final myTurn = (gs.turn == 'white' && widget.side == 'white') ||
        (gs.turn == 'black' && widget.side == 'black');
    final myPassCount = (gs.passCount[widget.side] ?? 0);

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          child: ActionButtons(
            gameId: widget.gameId,
            phase: gs.phase,
            side: widget.side,
            myTurn: myTurn,
            isFlipped: _isFlipped,
            spectator: widget.side == 'spectator',
            colorChosen: gs.colorChosen,
            mageUnlocked: gs.mageUnlocked,
            colorsEverChosen: gs.colorsEverChosen,
            myPassCount: myPassCount,
            colorTheme: _colorTheme,
            onColorThemeChanged: (t) => setState(() => _colorTheme = t),
            onFlip: () => setState(() => _isFlipped = !_isFlipped),
            onEndTurnSetup: notifier.endTurnSetup,
            onRandomSetup: () => notifier.randomizeSetup(widget.side),
            onPassTurn: notifier.passTurnPlaying,
            onResign: notifier.resign,
            onColorSelected: (color) => notifier.selectColor(color, widget.side),
          ),
        ),
        // ── Move history ────────────────────────────────────────────────────
        if (gs.moves.isNotEmpty)
          _buildMoveHistory(gs.moves),
      ],
    );
  }

  /// Compact scrollable move list — shown in the action panel below the buttons.
  Widget _buildMoveHistory(List<Map<String, dynamic>> moves) {
    return Container(
      margin: const EdgeInsets.fromLTRB(6, 0, 6, 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Move History (${moves.length})',
            style: GoogleFonts.outfit(
              fontSize: 10, color: Colors.white38, fontWeight: FontWeight.w600,
              letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: moves.length,
              reverse: true, // newest first
              itemBuilder: (_, i) {
                final move = moves[moves.length - 1 - i];
                final side  = move['active_side'] as String? ?? 'white';
                final piece = move['piece_id']   as String? ?? '?';
                final tgt   = move['target_id']  as String? ?? '?';
                final phase = move['phase']       as String? ?? '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Row(children: [
                    SizedBox(width: 26,
                      child: Text('${moves.length - i}',
                        style: GoogleFonts.outfit(color: Colors.white24, fontSize: 10))),
                    Container(width: 7, height: 7,
                      margin: const EdgeInsets.only(right: 5),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: side == 'white' ? Colors.white : Colors.black,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.35)))),
                    Expanded(child: Text('$piece → $tgt',
                      style: GoogleFonts.outfit(
                        color: Colors.white60, fontSize: 10),
                      overflow: TextOverflow.ellipsis)),
                    if (phase.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          color: Colors.white.withValues(alpha: 0.07)),
                        child: Text(phase.length > 3 ? phase.substring(0, 3) : phase,
                          style: GoogleFonts.outfit(color: Colors.white24, fontSize: 8))),
                  ]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ── Geometry helper ─────────────────────────────────────────────────────────

  bool _pointInPolygon(double x, double y, List<List<double>> pts,
      {bool isFlipped = false, double cx = 0, double cy = 0}) {
    final transformed = pts.map((p) {
      if (isFlipped) return Offset(2 * cx - p[0], 2 * cy - p[1]);
      return Offset(p[0], p[1]);
    }).toList();

    bool inside = false;
    final n = transformed.length;
    for (int i = 0, j = n - 1; i < n; j = i++) {
      final xi = transformed[i].dx, yi = transformed[i].dy;
      final xj = transformed[j].dx, yj = transformed[j].dy;
      if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }
}

// ── Disconnect banner ──────────────────────────────────────────────────────────

class _DisconnectBanner extends StatelessWidget {
  const _DisconnectBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: DTheme.danger.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          const Expanded(child: Text('Connection lost — reconnecting…',
              style: TextStyle(color: Colors.white, fontSize: 12))),
        ],
      ),
    );
  }
}

// ── Compact player card for the left side panel ──────────────────────────────

class _PlayerCard extends StatelessWidget {
  final String side;
  final String name;
  final String role;
  final double? rating;
  final int clockMs;
  final int? lastTurnTs;
  final bool isActive;
  final bool isRunning;
  /// true  → name/rating row is ABOVE the clock  (local player at bottom)
  /// false → clock is first, name/rating row BELOW (opponent at top)
  final bool nameOnTop;

  const _PlayerCard({
    required this.side,
    required this.name,
    required this.role,
    required this.rating,
    required this.clockMs,
    required this.lastTurnTs,
    required this.isActive,
    required this.isRunning,
    required this.nameOnTop,
  });

  String _displayName() {
    if (role == 'guest' && name.startsWith('guest_')) {
      return 'guest_${name.substring(6, name.length > 13 ? 13 : name.length)}';
    }
    return name;
  }

  @override
  Widget build(BuildContext context) {
    // ── Name + rating row ──────────────────────────────────────────────────
    final nameRow = Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 13, height: 13,
          margin: const EdgeInsets.only(right: 6),
          decoration: BoxDecoration(
            color: side == 'white' ? Colors.white : Colors.black,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.grey.shade400, width: 1.5),
          ),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _displayName(),
                style: GoogleFonts.outfit(
                  fontSize: 14, fontWeight: FontWeight.w700,
                  color: isActive ? DTheme.primary : Colors.white70),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
              if (rating != null)
                Text('★ ${rating!.toStringAsFixed(0)}',
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.white.withValues(alpha: 0.45))),
            ],
          ),
        ),
      ],
    );

    // ── Clock ──────────────────────────────────────────────────────────────
    final clock = ClockWidget(
      initialMs: clockMs,
      isRunning: isRunning,
      lastTurnTs: lastTurnTs ?? 0,
      fontSize: 43,
    );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: isActive
            ? DTheme.primary.withValues(alpha: 0.10)
            : Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isActive
              ? DTheme.primary.withValues(alpha: 0.4)
              : Colors.white.withValues(alpha: 0.06),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: nameOnTop
            ? [nameRow, const SizedBox(height: 6), clock]
            : [clock,   const SizedBox(height: 6), nameRow],
      ),
    );
  }
}

// ── Background toggle (mirrors lobby _BgToggle) ───────────────────────────────

class _GameBgToggle extends StatefulWidget {
  final AppBg bg;
  final VoidCallback onTap;
  const _GameBgToggle({required this.bg, required this.onTap});
  @override
  State<_GameBgToggle> createState() => _GameBgToggleState();
}

class _GameBgToggleState extends State<_GameBgToggle> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: _hovered
                ? Colors.white.withValues(alpha: 0.15)
                : Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: Colors.white.withValues(alpha: _hovered ? 0.25 : 0.10),
            ),
          ),
          child: Text(widget.bg.emoji, style: const TextStyle(fontSize: 15)),
        ),
      ),
    );
  }
}

// ── Spectator Banner ─────────────────────────────────────────────────────────

class _SpectatorBanner extends StatelessWidget {
  final String? tournamentId;
  const _SpectatorBanner({this.tournamentId});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (tournamentId != null) ...[
          _NavBtn(
            label: '← Tournament',
            onTap: () => context.go('/tournament/$tournamentId'),
            isPrimary: true,
          ),
          const SizedBox(width: 8),
        ],
        _NavBtn(
          label: tournamentId != null ? 'Lobby' : '← Lobby',
          onTap: () => context.go('/'),
          isPrimary: false,
        ),
      ],
    );
  }
}

class _NavBtn extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  final bool isPrimary;
  const _NavBtn({required this.label, required this.onTap, this.isPrimary = false});

  @override
  State<_NavBtn> createState() => _NavBtnState();
}

class _NavBtnState extends State<_NavBtn> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    final color = widget.isPrimary ? DTheme.primary : Colors.white;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: _hovered ? color.withValues(alpha: 0.15) : color.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _hovered ? color.withValues(alpha: 0.4) : color.withValues(alpha: 0.15),
            ),
          ),
          child: Text(
            widget.label,
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _hovered ? color : color.withValues(alpha: 0.7),
            ),
          ),
        ),
      ),
    );
  }
}
