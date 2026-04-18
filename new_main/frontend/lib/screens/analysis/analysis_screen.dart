import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../../core/theme.dart';
import '../../core/config.dart';
import '../../models/models.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../game/painters/board_svg.dart';
import '../game/painters/piece_svg.dart';
import '../game/widgets/board_widget.dart';
import '../../providers/bg_provider.dart';
import '../game/widgets/clock_widget.dart';

// ── Constants ─────────────────────────────────────────────────────────────────

const _reasonLabels = {
  'timeout':          'Time ran out',
  'goddess_captured': 'Goddess captured',
  'abandoned':        'Opponent disconnected',
  'resign':           'A player resigned',
  'pass_limit':       'Passed 3 times in a row',
};

const _phaseColors = {
  'Setup':      Color(0xFF8B5CF6),
  'ColorChoice':Color(0xFFF59E0B),
  'Playing':    Color(0xFF22C55E),
  'GameOver':   Color(0xFFEF4444),
};

// Color map for polygon bg colors
const _polyHex = {
  'orange': Color(0xFFF27813),
  'blue':   Color(0xFF46B0D4),
  'green':  Color(0xFF2ECC71),
  'grey':   Color(0xFF94A3B8),
};

// ── Screen ────────────────────────────────────────────────────────────────────

class AnalysisScreen extends ConsumerStatefulWidget {
  final Map<String,dynamic>? initialRecord;
  const AnalysisScreen({super.key, this.initialRecord});
  @override ConsumerState<AnalysisScreen> createState() => _AnalysisScreenState();
}

class _AnalysisScreenState extends ConsumerState<AnalysisScreen> {
  Map<String,dynamic>? _record;
  int  _stepIdx   = 0;
  bool _isFlipped = false;
  bool _autoPlaying = false;
  bool _replayLoading = false;
  bool _dragActive = false;

  // Board geometry
  Map<String,dynamic>? _rawBoard; // raw JSON from server
  Map<String,BoardPolygon> _polygons = {};
  Map<String,dynamic> _allEdges = {};
  String _viewBoxStr = '-100 -10 610 445';

  // Computed from replay engine
  List<Map<String,dynamic>> _pieces = [];
  String _currentTurn  = 'white';
  String _currentPhase = '';
  Map<String,dynamic> _colorChosen = {};

  // Board transform
  double _scale = 1, _offsetX = 0, _offsetY = 0;
  Offset _boardCenter = const Offset(205, 217);

  // Board SVG cache — the topology (polygons+edges) never changes between steps,
  // so we cache the SVG string and only invalidate on record/size change.
  String? _cachedBoardSvg;
  Size?   _cachedBoardSize;

  // Auto-play
  Timer? _autoTimer;

  // Move list scroll
  final ScrollController _moveScroll = ScrollController();

  int get _totalSteps => _record == null ? 0 : ((_record!['moves'] as List?)?.length ?? 0) + 1;

  @override
  void initState() {
    super.initState();
    // Pre-load a game record if navigated here from game-over overlay
    final rec = widget.initialRecord;
    if (rec != null) {
      _record = rec;
      final boardId = rec['board_id'] as String?;
      if (boardId != null) {
        SchedulerBinding.instance.addPostFrameCallback((_) {
          _fetchBoard(boardId).then((_) => _fetchReplayState(0));
        });
      }
    }
  }

  @override
  void dispose() {
    _autoTimer?.cancel();
    _moveScroll.dispose();
    super.dispose();
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────

  void _onKey(KeyEvent e) {
    if (e is! KeyDownEvent) return;
    switch (e.logicalKey) {
      case LogicalKeyboardKey.arrowRight:
      case LogicalKeyboardKey.arrowDown:
        _stopAutoPlay(); _goTo(_stepIdx + 1); break;
      case LogicalKeyboardKey.arrowLeft:
      case LogicalKeyboardKey.arrowUp:
        _stopAutoPlay(); _goTo(_stepIdx - 1); break;
      case LogicalKeyboardKey.home:
        _stopAutoPlay(); _goTo(0); break;
      case LogicalKeyboardKey.end:
        _stopAutoPlay(); _goTo(_totalSteps - 1); break;
      case LogicalKeyboardKey.space:
        _autoPlaying ? _stopAutoPlay() : _startAutoPlay(); break;
      default: break;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  void _goTo(int idx) {
    final next = idx.clamp(0, _totalSteps - 1);
    if (next == _stepIdx) return;
    setState(() => _stepIdx = next);
    _fetchReplayState(next);
    _scrollToActive();
  }

  void _startAutoPlay() {
    if (_autoTimer != null) return;
    setState(() => _autoPlaying = true);
    _autoTimer = Timer.periodic(const Duration(milliseconds: 900), (_) {
      if (_stepIdx >= _totalSteps - 1) { _stopAutoPlay(); return; }
      _goTo(_stepIdx + 1);
    });
  }

  void _stopAutoPlay() {
    _autoTimer?.cancel(); _autoTimer = null;
    if (mounted) setState(() => _autoPlaying = false);
  }

  void _scrollToActive() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_moveScroll.hasClients) return;
      // rough estimate: each item ≈ 36px
      final pos = _stepIdx * 36.0;
      _moveScroll.animateTo(pos.clamp(0, _moveScroll.position.maxScrollExtent),
        duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    });
  }

  // ── Board fetch ───────────────────────────────────────────────────────────

  Future<void> _fetchBoard(String boardId) async {
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final res  = await http.get(Uri.parse('$base/api/boards/${Uri.encodeComponent(boardId)}'));
      if (!mounted || res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String,dynamic>;
      _parseBoard(data);
    } catch (e) {
      debugPrint('Analysis: board fetch error: $e');
    }
  }

  void _parseBoard(Map<String,dynamic> data) {
    final raw = data['allPolygons'] as Map<String,dynamic>? ?? {};
    final polygons = <String,BoardPolygon>{};
    double minX =  1e9, minY =  1e9;
    double maxX = -1e9, maxY = -1e9;
    for (final e in raw.entries) {
      try {
        final p = BoardPolygon.fromJson(e.value as Map<String,dynamic>);
        polygons[e.key] = p;
        for (final pt in p.points) {
          if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
        }
      } catch (_) {}
    }
    const pad = 60.0;
    final cx = (minX + maxX) / 2;
    final cy = (minY + maxY) / 2;
    if (mounted) setState(() {
      _polygons    = polygons;
      _allEdges    = data['allEdges'] as Map<String,dynamic>? ?? {};
      _boardCenter = Offset(cx, cy);
      _viewBoxStr  = '${minX-pad} ${minY-pad} ${maxX-minX+pad*2} ${maxY-minY+pad*2}';
      _cachedBoardSvg  = null;  // invalidate: board topology changed
      _cachedBoardSize = null;
    });
  }

  // ── Replay fetch ──────────────────────────────────────────────────────────

  Future<void> _fetchReplayState(int step) async {
    if (_record == null || _polygons.isEmpty) return;
    final boardId   = _record!['board_id'] as String?;
    final movesJson = jsonEncode(_record!['moves'] ?? []);
    if (boardId == null) return;
    setState(() => _replayLoading = true);
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final res  = await http.post(
        Uri.parse('$base/api/replay'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'board_id': boardId, 'movesJson': movesJson, 'step': step}),
      );
      if (!mounted || res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String,dynamic>;
      setState(() {
        _pieces      = (data['pieces'] as List<dynamic>? ?? [])
            .map((p) => p as Map<String,dynamic>).toList();
        _currentTurn  = data['turn']        as String? ?? 'white';
        _currentPhase = data['phase']       as String? ?? '';
        _colorChosen  = data['colorChosen'] as Map<String,dynamic>? ?? {};
      });
    } catch (e) {
      debugPrint('Analysis: replay fetch error: $e');
    } finally {
      if (mounted) setState(() => _replayLoading = false);
    }
  }

  // ── File loading ──────────────────────────────────────────────────────────

  void _tryLoadJson(String text) {
    try {
      final data = jsonDecode(text) as Map<String,dynamic>;
      setState(() {
        _record  = data;
        _stepIdx = 0;
        _pieces  = [];
        _currentTurn  = 'white';
        _currentPhase = '';
        _colorChosen  = {};
      });
      final boardId = data['board_id'] as String?;
      if (boardId != null) {
        _fetchBoard(boardId).then((_) => _fetchReplayState(0));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Invalid game JSON: $e'),
            backgroundColor: DTheme.danger));
      }
    }
  }

  // ── Board transform ───────────────────────────────────────────────────────

  void _computeTransform(Size size) {
    if (_polygons.isEmpty) return;
    // Parse the viewBox to figure out content bounds
    final parts = _viewBoxStr.split(' ').map(double.parse).toList();
    if (parts.length < 4) return;
    final vbX = parts[0], vbY = parts[1], vbW = parts[2], vbH = parts[3];
    final s = (size.width / vbW) < (size.height / vbH)
        ? size.width / vbW
        : size.height / vbH;
    _scale   = s;
    _offsetX = (size.width  - vbW * s) / 2 - vbX * s;
    _offsetY = (size.height - vbH * s) / 2 - vbY * s;
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.of(context).size.width > 750;
    final bg   = ref.watch(bgProvider);
    return KeyboardListener(
      focusNode: FocusNode()..requestFocus(),
      onKeyEvent: _onKey,
      autofocus: true,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Stack(
            children: [
              Column(children: [
                _buildTopBar(context),
                Expanded(child: _record == null
                    ? _buildUploadZone()
                    : wide
                         ? Row(children: [
                            SizedBox(width: 130, child: _buildAnalysisPlayerPanel()),
                            Expanded(child: _buildBoardColumn()),
                            SizedBox(width: 160, child: _buildSidebar()),
                          ])
                        : Column(children: [
                            Expanded(child: _buildBoardColumn()),
                            SizedBox(height: 200, child: _buildSidebar()),
                          ])),
              ]),
              // Background toggle — top right
              Positioned(
                top: 8, right: 8,
                child: _AnalysisBgToggle(
                  bg: bg,
                  onTap: () => ref.read(bgProvider.notifier).cycle(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Top bar ───────────────────────────────────────────────────────────────

  Widget _buildTopBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
      child: Row(children: [
        GestureDetector(
          onTap: () => context.go('/'),
          child: Row(children: [
            const Icon(Icons.arrow_back_ios_new, color: Colors.white70, size: 14),
            const SizedBox(width: 4),
            Text('Lobby', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13)),
          ]),
        ),
        const SizedBox(width: 16),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Analysis Room', style: GoogleFonts.outfit(
            fontSize: 16, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
          if (_record != null)
            Text('${_record!['whiteName'] ?? '?'} vs ${_record!['blackName'] ?? '?'}',
              style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
        ]),
        const Spacer(),
        // File picker (web-compatible via text paste dialog)
        if (_record != null)
          _TopBtn('⬇ Download', () => _downloadRecord()),
        const SizedBox(width: 8),
        _TopBtn('📂 Load File', () => _showLoadDialog()),
      ]),
    );
  }

  void _downloadRecord() {
    if (_record == null) return;
    final json = jsonEncode(_record);
    // Flutter web: create download via data URI — shown as copyable text
    showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      title: Text('Game JSON', style: GoogleFonts.outfit(color: Colors.white)),
      content: SizedBox(
        width: 500, height: 300,
        child: SelectableText(json, style: const TextStyle(color: Colors.white70, fontSize: 11))),
      actions: [
        TextButton(
          onPressed: () { Clipboard.setData(ClipboardData(text: json)); Navigator.pop(context); },
          child: Text('Copy to clipboard', style: GoogleFonts.outfit(color: DTheme.primary))),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Close', style: GoogleFonts.outfit(color: Colors.white54))),
      ],
    ));
  }

  void _showLoadDialog() {
    final ctrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      title: Text('Paste Game JSON', style: GoogleFonts.outfit(color: Colors.white, fontSize: 16)),
      content: SizedBox(
        width: 500, height: 250,
        child: TextField(
          controller: ctrl,
          maxLines: null, expands: true,
          style: const TextStyle(color: Colors.white, fontSize: 12),
          decoration: const InputDecoration(
            hintText: 'Paste game JSON here…',
            hintStyle: TextStyle(color: Colors.white38),
            border: InputBorder.none),
        )),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.white54))),
        TextButton(
          onPressed: () { Navigator.pop(context); _tryLoadJson(ctrl.text.trim()); },
          child: Text('Load', style: GoogleFonts.outfit(color: DTheme.primary, fontWeight: FontWeight.w700))),
      ],
    ));
  }

  // ── Upload zone ───────────────────────────────────────────────────────────

  Widget _buildUploadZone() {
    return Center(
      child: GestureDetector(
        onTap: _showLoadDialog,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 420, height: 260,
          margin: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: Colors.white.withValues(alpha: _dragActive ? 0.10 : 0.05),
            border: Border.all(
              color: _dragActive ? DTheme.primary : Colors.white.withValues(alpha: 0.15),
              width: _dragActive ? 2 : 1),
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('📋', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text('Load a Dedal game JSON', style: GoogleFonts.outfit(
              fontSize: 18, fontWeight: FontWeight.w600, color: DTheme.textMainDark)),
            const SizedBox(height: 8),
            Text('Click to paste JSON · keyboard: ← → Space',
              style: GoogleFonts.outfit(color: Colors.white38, fontSize: 13)),
          ]),
        ),
      ),
    );
  }

  // ── Clock computation ────────────────────────────────────────────────────

  /// Compute remaining clock for [side] after [step] moves.
  ///   • Setup-phase moves do NOT deduct time (no clock in setup).
  ///   • Uses elapsed_ms if stored (≥backend change); else falls back
  ///     to consecutive timestamp_ms differences.
  int _clockAt(String side, int step) {
    final tc = _record?['timeControl'] as Map?;
    if (tc == null) return 0;
    final initialMs = ((tc['minutes']   as num?) ?? 10).toInt() * 60000;
    final increment  = ((tc['increment'] as num?) ??  0).toInt() * 1000;
    final moves = (_record!['moves'] as List? ?? []);
    int whiteMs = initialMs, blackMs = initialMs;

    for (int i = 0; i < step && i < moves.length; i++) {
      final m     = moves[i] as Map;
      final phase = m['phase'] as String? ?? 'playing';
      if (phase == 'setup') continue;  // setup moves don't consume clock

      // ── Elapsed time for this individual move ───────────────────────────
      final int elapsed;
      if (m.containsKey('elapsed_ms')) {
        elapsed = ((m['elapsed_ms'] as num?)?.toInt() ?? 0).clamp(0, 600000);
      } else {
        final ts     = (m['timestamp_ms'] as num?)?.toInt() ?? 0;
        final prevTs = i > 0
            ? ((moves[i - 1] as Map)['timestamp_ms'] as num?)?.toInt() ?? ts
            : ts;
        elapsed = math.max(0, ts - prevTs).clamp(0, 600000);
      }

      final active = m['active_side'] as String? ?? 'white';
      if (active == 'white') {
        whiteMs = math.max(0, whiteMs - elapsed);
      } else {
        blackMs = math.max(0, blackMs - elapsed);
      }

      // ── Increment: once per TURN, not per move ───────────────────────────
      // A turn ends when the NEXT stored move has a different active_side.
      // We look at moves[i+1] regardless of the [step] boundary so that
      // mid-turn positions correctly withhold the increment.
      if (increment > 0) {
        final nextM      = (i + 1 < moves.length) ? moves[i + 1] as Map : null;
        final nextPhase  = nextM?['phase'] as String? ?? 'playing';
        final nextActive = nextM?['active_side'] as String? ?? '';
        // Turn boundary: no next move, next is setup→play transition, or
        // active_side switches to the other player.
        final isLastOfTurn = nextM == null ||
            nextPhase == 'setup' ||
            nextActive != active;
        if (isLastOfTurn) {
          if (active == 'white') whiteMs += increment;
          else                   blackMs += increment;
        }
      }
    }
    return side == 'white' ? whiteMs : blackMs;
  }

  // ── Left player panel (mirrors game screen) ───────────────────────────────

  Widget _buildAnalysisPlayerPanel() {
    if (_record == null) return const SizedBox.shrink();
    // White is at bottom (unflipped default), black at top
    final topSide    = _isFlipped ? 'white' : 'black';
    final bottomSide = _isFlipped ? 'black' : 'white';
    final topName    = topSide == 'black'
        ? (_record!['blackName'] as String? ?? '?')
        : (_record!['whiteName'] as String? ?? '?');
    final bottomName = bottomSide == 'black'
        ? (_record!['blackName'] as String? ?? '?')
        : (_record!['whiteName'] as String? ?? '?');
    final topClock    = _clockAt(topSide,    _stepIdx);
    final bottomClock = _clockAt(bottomSide, _stepIdx);
    final topActive    = _currentTurn == topSide    && _currentPhase != 'GameOver';
    final bottomActive = _currentTurn == bottomSide && _currentPhase != 'GameOver';
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        border: Border(right: BorderSide(color: Colors.white.withValues(alpha: 0.07))),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Top player
          Padding(
            padding: const EdgeInsets.fromLTRB(5, 0, 5, 0),
            child: _AnalysisPlayerCard(
              side: topSide, name: topName, clockMs: topClock, isActive: topActive,
              nameOnTop: false,
            ),
          ),
          // Phase badge
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              _currentPhase.isEmpty ? 'ANALYSIS'
                  : _currentPhase == 'GameOver' ? 'END'
                  : _currentPhase.toUpperCase(),
              style: GoogleFonts.outfit(
                fontSize: 9, color: Colors.white38,
                fontWeight: FontWeight.w700, letterSpacing: 1),
              textAlign: TextAlign.center,
            ),
          ),
          // Bottom player
          Padding(
            padding: const EdgeInsets.fromLTRB(5, 0, 5, 0),
            child: _AnalysisPlayerCard(
              side: bottomSide, name: bottomName, clockMs: bottomClock, isActive: bottomActive,
              nameOnTop: true,
            ),
          ),
        ],
      ),
    );
  }

  // ── Board column ──────────────────────────────────────────────────────────────────────────────

  Widget _buildBoardColumn() {
    // Convert Map pieces → BoardPieceData (on-board only; off-board rendered by BoardWidget)
    final displayPieces = _pieces
        .where((p) =>
            (p['position'] as String?) != 'graveyard' &&
            (p['position'] as String?) != 'returned')
        .map((p) => BoardPieceData(
              id:       p['id']       as String? ?? UniqueKey().toString(),
              type:     p['type']     as String? ?? 'soldier',
              side:     p['side']     as String? ?? 'white',
              position: p['position'] as String? ?? '',
            ))
        .toList();

    return Column(children: [
      Expanded(
        child: BoardWidget(
          polygons:         _polygons,
          allEdges:         _allEdges,
          legalMoveTargets: const {},  // analysis is read-only
          selectedPolygon:  null,
          isFlipped:        _isFlipped,
          colorTheme:       'default',
          pieces:           displayPieces,
          overlays: [
            if (_replayLoading)
              Container(
                color: Colors.black.withValues(alpha: 0.2),
                child: const Center(child: CircularProgressIndicator())),
          ],
        ),
      ),
      _buildTransport(),
    ]);
  }


  // ── Transport bar ─────────────────────────────────────────────────────────

  Widget _buildTransport() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
      child: Row(children: [
        _TransBtn('⏮', () { _stopAutoPlay(); _goTo(0); }),
        _TransBtn('◀', () { _stopAutoPlay(); _goTo(_stepIdx - 1); }),
        _TransBtn(_autoPlaying ? '⏸' : '▶',
          () => _autoPlaying ? _stopAutoPlay() : _startAutoPlay(),
          active: _autoPlaying),
        _TransBtn('▶', () { _stopAutoPlay(); _goTo(_stepIdx + 1); }),
        _TransBtn('⏭', () { _stopAutoPlay(); _goTo(_totalSteps - 1); }),
        const SizedBox(width: 8),
        Expanded(child: Slider(
          value: _stepIdx.toDouble(),
          min: 0, max: (_totalSteps - 1).toDouble().clamp(0, 9999),
          activeColor: DTheme.primary,
          onChanged: (v) { _stopAutoPlay(); _goTo(v.round()); },
        )),
        const SizedBox(width: 8),
        Text('$_stepIdx / ${_totalSteps - 1}',
          style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
        const SizedBox(width: 8),
        _TransBtn('↕ Flip', () => setState(() => _isFlipped = !_isFlipped), wide: true),
      ]),
    );
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────

  Widget _buildSidebar() {
    final record = _record!;
    final reason = _reasonLabels[record['reason'] as String? ?? ''] ?? record['reason'] ?? '';
    final tc     = record['timeControl'] as Map<String,dynamic>?;
    final currentMove = _stepIdx > 0
        ? (record['moves'] as List?)!.elementAtOrNull(_stepIdx - 1) as Map<String,dynamic>?
        : null;
    final phaseColor = _phaseColors[_currentPhase] ?? Colors.white54;

    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Result card
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: Colors.white.withValues(alpha: 0.06)),
          child: Column(children: [
            Text('🏆 ${record['winner'] ?? '?'}',
              style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
            if (reason.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(reason, style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
            ],
            if (tc != null) ...[
              const SizedBox(height: 4),
              Text('${tc['minutes']}+${tc['increment'] ?? 0}',
                style: GoogleFonts.outfit(color: DTheme.primary, fontSize: 12)),
            ],
          ]),
        ),
        const SizedBox(height: 10),
        // Phase / move detail
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            color: Colors.white.withValues(alpha: 0.04)),
          child: currentMove != null ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  color: phaseColor.withValues(alpha: 0.15),
                  border: Border.all(color: phaseColor.withValues(alpha: 0.4))),
                child: Text(_currentPhase, style: GoogleFonts.outfit(
                  color: phaseColor, fontSize: 10, fontWeight: FontWeight.w700))),
              const SizedBox(width: 8),
              Text('#$_stepIdx', style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11)),
            ]),
            const SizedBox(height: 6),
            Text(
              '${currentMove['piece_id'] ?? '?'} → ${currentMove['target_id'] ?? '?'}',
              style: GoogleFonts.outfit(color: DTheme.textMainDark, fontSize: 13, fontWeight: FontWeight.w600)),
          ]) : Text('Start position',
            style: GoogleFonts.outfit(color: Colors.white38, fontSize: 12)),
        ),
        const SizedBox(height: 10),
        // Color chosen indicator
        _buildColorCircles(),
        const SizedBox(height: 10),
        // Move list header
        Text('Move List', style: GoogleFonts.outfit(
          fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white54, letterSpacing: 0.5)),
        const SizedBox(height: 6),
        // Move list
        Expanded(child: ListView.builder(
          controller: _moveScroll,
          itemCount: _totalSteps,
          itemBuilder: (_, i) {
            final isActive = i == _stepIdx;
            final move = i == 0 ? null
                : (record['moves'] as List?)?.elementAtOrNull(i - 1) as Map<String,dynamic>?;
            final side = move?['active_side'] as String? ?? 'white';
            final phase = move?['phase'] as String? ?? '';
            return GestureDetector(
              onTap: () { _stopAutoPlay(); _goTo(i); },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 100),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  color: isActive ? DTheme.primary.withValues(alpha: 0.18) : Colors.transparent),
                child: Row(children: [
                  SizedBox(width: 28, child: Text('$i',
                    style: GoogleFonts.outfit(
                      fontSize: 11, color: isActive ? DTheme.primary : Colors.white38))),
                  if (move != null) ...[
                    Container(width: 8, height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: side == 'white' ? Colors.white : Colors.black,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.3)))),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        color: (_phaseColors[phase] ?? Colors.white54).withValues(alpha: 0.15)),
                      child: Text(phase.length > 3 ? phase.substring(0,3) : phase,
                        style: GoogleFonts.outfit(fontSize: 8, color: _phaseColors[phase] ?? Colors.white54))),
                    const SizedBox(width: 4),
                    Expanded(child: Text(
                      '${move['piece_id']} → ${move['target_id']}',
                      style: GoogleFonts.outfit(
                        fontSize: 11, color: isActive ? DTheme.textMainDark : Colors.white60),
                      overflow: TextOverflow.ellipsis)),
                  ] else
                    Text('Start', style: GoogleFonts.outfit(
                      fontSize: 11, color: isActive ? DTheme.textMainDark : Colors.white60)),
                ]),
              ),
            );
          },
        )),
      ]),
    );
  }

  Widget _buildColorCircles() {
    final chosen = _colorChosen[_currentTurn] as String?;
    final colors = chosen != null ? [chosen] : ['grey', 'green', 'blue', 'orange'];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.white.withValues(alpha: 0.03),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06))),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(chosen != null ? 'Color: ' : 'No selection',
          style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11)),
        const SizedBox(width: 6),
        ...colors.map((c) {
          final col = _polyHex[c] ?? Colors.grey;
          return Container(
            width: 20, height: 20,
            margin: const EdgeInsets.only(left: 4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: col.withValues(alpha: chosen != null ? 1.0 : 0.6),
              border: Border.all(
                color: chosen == c ? Colors.white : Colors.white.withValues(alpha: 0.1),
                width: chosen == c ? 2 : 1),
              boxShadow: chosen == c ? [BoxShadow(color: col.withValues(alpha: 0.6), blurRadius: 8)] : null,
            ),
          );
        }),
      ]),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _PlayerBox extends StatelessWidget {
  final String name, side;
  final bool active;
  final int clockMs;  // remaining milliseconds; 0 = unknown
  const _PlayerBox(this.name, this.side, this.active, this.clockMs);

  String _fmt(int ms) {
    if (ms <= 0) return '--:--';
    final s = ms ~/ 1000;
    return '${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}';
  }

  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    child: Row(children: [
      Container(width: 10, height: 10,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: side == 'white' ? Colors.white : Colors.black,
          border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
          boxShadow: active ? [BoxShadow(color: DTheme.primary.withValues(alpha: 0.8), blurRadius: 8)] : null)),
      const SizedBox(width: 10),
      Expanded(child: Text(name, style: GoogleFonts.outfit(
        fontSize: 14, fontWeight: active ? FontWeight.w700 : FontWeight.w400,
        color: active ? DTheme.textMainDark : Colors.white54))),
      if (active) ...[const SizedBox(width: 8),
        Container(width: 8, height: 8, decoration: BoxDecoration(
          shape: BoxShape.circle, color: DTheme.primary,
          boxShadow: [BoxShadow(color: DTheme.primary.withValues(alpha: 0.6), blurRadius: 6)]))],
      const SizedBox(width: 12),
      // Clock display
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          color: active
              ? DTheme.primary.withValues(alpha: 0.15)
              : Colors.white.withValues(alpha: 0.05),
          border: Border.all(
            color: active
                ? DTheme.primary.withValues(alpha: 0.4)
                : Colors.white.withValues(alpha: 0.10)),
        ),
        child: Text(_fmt(clockMs), style: GoogleFonts.outfit(
          fontSize: 14, fontWeight: FontWeight.w700,
          color: active ? DTheme.primary : Colors.white54,
          fontFeatures: [const FontFeature.tabularFigures()])),
      ),
    ]),
  );
}

class _TransBtn extends StatelessWidget {
  final String label; final VoidCallback onTap; final bool active, wide;
  const _TransBtn(this.label, this.onTap, {this.active = false, this.wide = false});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: EdgeInsets.symmetric(horizontal: wide ? 10 : 6, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        color: active ? DTheme.primary.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.06),
        border: Border.all(color: active ? DTheme.primary.withValues(alpha: 0.4) : Colors.transparent)),
      child: Text(label, style: GoogleFonts.outfit(
        color: active ? DTheme.primary : Colors.white60, fontSize: 13))));
}

class _TopBtn extends StatelessWidget {
  final String label; final VoidCallback onTap;
  const _TopBtn(this.label, this.onTap);
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.white.withValues(alpha: 0.08),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15))),
      child: Text(label, style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13))));
}

// ── Analysis player card (mirrors _PlayerCard in game_board.dart) ──────────────────

class _AnalysisPlayerCard extends StatelessWidget {
  final String side, name;
  final int    clockMs;
  final bool   isActive;
  final bool   nameOnTop;  // false = clock then name; true = name then clock
  const _AnalysisPlayerCard({
    required this.side, required this.name,
    required this.clockMs, required this.isActive, required this.nameOnTop,
  });

  @override
  Widget build(BuildContext context) {
    final sideColor = isActive ? DTheme.primary : Colors.white30;
    final nameRow = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 8, height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: side == 'white' ? Colors.white : Colors.black,
            border: Border.all(color: Colors.white38),
            boxShadow: isActive ? [BoxShadow(
              color: DTheme.primary.withValues(alpha: 0.7), blurRadius: 6)] : null),
        ),
        const SizedBox(width: 5),
        Flexible(child: Text(
          name,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.outfit(
            fontSize: 11,
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
            color: isActive ? DTheme.textMainDark : Colors.white54),
        )),
      ],
    );
    final clock = ClockWidget(
      initialMs: clockMs,
      isRunning: false,    // static display in analysis
      lastTurnTs: 0,
      fontSize: 28,        // same relative size as game (scaled to 130px panel)
    );
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: isActive
            ? DTheme.primary.withValues(alpha: 0.08)
            : Colors.white.withValues(alpha: 0.03),
        border: Border.all(
          color: isActive
              ? DTheme.primary.withValues(alpha: 0.25)
              : Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: nameOnTop
            ? [nameRow, const SizedBox(height: 4), clock]
            : [clock,   const SizedBox(height: 4), nameRow],
      ),
    );
  }
}

// ── Background toggle (mirrors game screen _GameBgToggle) ─────────────────────

class _AnalysisBgToggle extends StatefulWidget {
  final AppBg bg;
  final VoidCallback onTap;
  const _AnalysisBgToggle({required this.bg, required this.onTap});
  @override State<_AnalysisBgToggle> createState() => _AnalysisBgToggleState();
}

class _AnalysisBgToggleState extends State<_AnalysisBgToggle> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) => MouseRegion(
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
            color: Colors.white.withValues(alpha: _hovered ? 0.25 : 0.10)),
        ),
        child: Text(widget.bg.emoji, style: const TextStyle(fontSize: 15)),
      ),
    ),
  );
}
