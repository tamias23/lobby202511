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
import '../../core/file_utils.dart';

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

  // Multi-game (tournament) support
  List<Map<String,dynamic>> _allGames = [];
  int _selectedGameIdx = 0;

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
    _stepIdx = next; // Update index first (no setState yet)
    _fetchReplayState(next);
    _scrollToActive();
    if (mounted) setState(() {}); // Trigger single rebuild for everything
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
    _replayLoading = true;
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
      _replayLoading = false;
      if (mounted) setState(() {});
    }
  }

  // ── File loading ──────────────────────────────────────────────────────────

  void _tryLoadJson(String text) {
    try {
      final decoded = jsonDecode(text);

      // Tournament file: array of game objects
      if (decoded is List) {
        if (decoded.isEmpty) {
          _showError('Empty tournament file.');
          return;
        }
        final allGames = decoded
            .whereType<Map<String,dynamic>>()
            .map(_normalizeTournamentGame)
            .toList();
        if (allGames.isEmpty) {
          _showError('No games found in this file.');
          return;
        }
        // Find the first game with actual moves to auto-select
        final firstPlayable = allGames.indexWhere(
            (g) => (g['moves'] as List?)?.isNotEmpty == true);
        final startIdx = firstPlayable >= 0 ? firstPlayable : 0;
        setState(() {
          _allGames = allGames;
          _selectedGameIdx = startIdx;
        });
        _loadRecord(allGames[startIdx]);
        return;
      }

      // Single game file
      final data = decoded as Map<String,dynamic>;
      setState(() {
        _allGames = [];
        _selectedGameIdx = 0;
      });
      _loadRecord(data);
    } catch (e) {
      _showError('Invalid game JSON: $e');
    }
  }

  /// Resolve timeControl from various field naming conventions.
  /// Priority: explicit object > individual DB fields > null.
  Map<String,dynamic>? _resolveTimeControl(Map<String,dynamic> raw) {
    // 1. Already a proper object (from live game or game-over overlay)
    if (raw['timeControl'] is Map) return raw['timeControl'] as Map<String,dynamic>;
    if (raw['time_control'] is Map) return raw['time_control'] as Map<String,dynamic>;

    // 2. Individual fields from DB export (tournament games)
    final minutes   = raw['time_control_minutes']   ?? raw['timeControlMinutes'];
    final increment = raw['time_control_increment']  ?? raw['timeControlIncrement'];
    if (minutes != null) {
      return {'minutes': minutes, 'increment': increment ?? 0};
    }

    return null;
  }

  /// Normalize tournament-export field names to the analysis-compatible format.
  Map<String,dynamic> _normalizeTournamentGame(Map<String,dynamic> raw) {
    // Parse moves from JSON string if needed
    dynamic moves = raw['moves'];
    if (moves is String) {
      try { moves = jsonDecode(moves); } catch (_) { moves = []; }
    }
    moves ??= [];

    return {
      'board_id':    raw['board_id'] ?? raw['boardId'],
      'whiteName':   raw['white_name'] ?? raw['whiteName'] ?? '?',
      'blackName':   raw['black_name'] ?? raw['blackName'] ?? '?',
      'winner':      raw['winner'],
      'reason':      raw['reason'] ?? raw['end_reason'],
      'moves':       moves is List ? moves : [],
      'timeControl': _resolveTimeControl(raw),
      // Preserve tournament metadata for display
      'tournament_round_info': raw['tournament_round_info'],
      'game_id':     raw['game_id'],
    };
  }

  void _loadRecord(Map<String,dynamic> data) {
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
  }

  void _selectGame(int idx) {
    if (idx < 0 || idx >= _allGames.length || idx == _selectedGameIdx) return;
    _stopAutoPlay();
    setState(() => _selectedGameIdx = idx);
    _loadRecord(_allGames[idx]);
  }

  void _showError(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg), backgroundColor: DTheme.danger));
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
                             SizedBox(width: 200, child: _buildAnalysisPlayerPanel()),
                            Expanded(child: _buildBoardColumn()),
                            SizedBox(width: 240, child: _buildSidebar()),
                            if (_allGames.length > 1)
                              SizedBox(width: 240, child: _buildGameListPanel()),
                          ])
                        : Column(children: [
                            if (_allGames.length > 1)
                              SizedBox(height: 56, child: _buildGameStrip()),
                            Expanded(child: _buildBoardColumn()),
                            SizedBox(height: 280, child: _buildSidebar()),
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
          Text(_allGames.isNotEmpty
              ? 'Analysis Room · Game ${_selectedGameIdx + 1}/${_allGames.length}'
              : 'Analysis Room',
            style: GoogleFonts.outfit(
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
        _TopBtn('📂 Load File', () => _pickFile()),
        const SizedBox(width: 8),
        _TopBtn('📋 Paste', () => _showLoadDialog()),
      ]),
    );
  }

  void _downloadRecord() {
    if (_record == null) return;
    final json = const JsonEncoder.withIndent('  ').convert(_record);
    final boardName = _record!['board_id'] ?? _record!['boardName'] ?? 'game';
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    downloadFile(json, 'dedal_${boardName}_$timestamp.json');
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Game record downloaded to disk'))
      );
    }
  }

  Future<void> _pickFile() async {
    final content = await pickJsonFile();
    if (content != null && content.trim().isNotEmpty) {
      _tryLoadJson(content);
    }
  }

  void _showLoadDialog() {
    final ctrl = TextEditingController();
    showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      title: Row(children: [
        Text('Load Game Record', style: GoogleFonts.outfit(color: Colors.white, fontSize: 16)),
        const Spacer(),
        IconButton(
          icon: const Icon(Icons.file_open, color: DTheme.primary),
          onPressed: () { Navigator.pop(context); _pickFile(); },
          tooltip: 'Select file from disk',
        ),
      ]),
      content: SizedBox(
        width: 500, height: 250,
        child: TextField(
          controller: ctrl,
          maxLines: null, expands: true,
          style: const TextStyle(color: Colors.white, fontSize: 12),
          decoration: const InputDecoration(
            hintText: 'Paste game JSON here or click the folder icon to browse…',
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
        onTap: _pickFile,
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
            const Text('📂', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text('Load a Dedal game JSON', style: GoogleFonts.outfit(
              fontSize: 18, fontWeight: FontWeight.w600, color: DTheme.textMainDark)),
            const SizedBox(height: 8),
            Text('Click to browse your files · keyboard: ← → Space',
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
          _AnalysisPlayerCard(
            side: topSide, name: topName, clockMs: topClock, isActive: topActive,
            nameOnTop: false,
          ),
          // Phase badge
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Text(
              _currentPhase.isEmpty ? 'ANALYSIS'
                  : _currentPhase == 'GameOver' ? 'END'
                  : _currentPhase.toUpperCase(),
              style: GoogleFonts.outfit(
                fontSize: 11, color: Colors.white38,
                fontWeight: FontWeight.w700, letterSpacing: 1),
              textAlign: TextAlign.center,
            ),
          ),
          // Bottom player
          Padding(
            padding: EdgeInsets.zero,
            child: _AnalysisPlayerCard(
              side: bottomSide, name: bottomName, clockMs: bottomClock, isActive: bottomActive,
              nameOnTop: true,
            ),
          ),
        ],
      ),
    );
  }

  // ── Captured pieces column (left panel, wide screens) ─────────────────────
  // In Dedal the engine sets captured pieces to position='returned' (they go
  // back to the player's reserve). 'graveyard' is never actually assigned.
  // We only show these during Playing/GameOver to avoid confusing them with
  // un-placed setup pieces (which also start as 'returned').

  Widget _buildCapturedPieces({required String capturedBy}) {
    // During setup all pieces are 'returned' — skip to avoid noise
    if (_currentPhase != 'Playing' && _currentPhase != 'GameOver') {
      return const SizedBox(height: 6);
    }
    final opponentSide = capturedBy == 'white' ? 'black' : 'white';
    final captured = _pieces.where((p) {
      final pos  = p['position'] as String? ?? '';
      final side = p['side']     as String? ?? '';
      return (pos == 'returned' || pos == 'graveyard') && side == opponentSide;
    }).toList();

    if (captured.isEmpty) return const SizedBox(height: 6);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Column(children: [
        Text('captured', style: GoogleFonts.outfit(
          color: Colors.white24, fontSize: 9, letterSpacing: 0.5)),
        const SizedBox(height: 3),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 2,
          runSpacing: 2,
          children: captured.map((p) {
            final pieceType = p['type'] as String? ?? 'soldier';
            final pieceSide = p['side'] as String? ?? 'white';
            return Tooltip(
              message: pieceType,
              child: SvgPicture.string(
                buildPieceSvg(pieceType, pieceSide),
                width: 26,
                height: 26,
              ),
            );
          }).toList(),
        ),
      ]),
    );
  }
  // ── Sidebar captured pieces (two-row, always visible) ────────────────────
  // Engine uses 'returned' for off-board pieces (both un-placed and captured).
  // Only show during Playing/GameOver to avoid listing setup-phase pieces.

  Widget _buildSidebarCapturedPieces() {
    // During setup all pieces are 'returned' — nothing meaningful to show
    if (_currentPhase != 'Playing' && _currentPhase != 'GameOver') {
      return const SizedBox.shrink();
    }

    final whiteOffBoard = _pieces.where((p) {
      final pos = p['position'] as String? ?? '';
      return (pos == 'returned' || pos == 'graveyard') &&
             (p['side'] as String?) == 'white';
    }).toList();
    final blackOffBoard = _pieces.where((p) {
      final pos = p['position'] as String? ?? '';
      return (pos == 'returned' || pos == 'graveyard') &&
             (p['side'] as String?) == 'black';
    }).toList();

    if (whiteOffBoard.isEmpty && blackOffBoard.isEmpty) return const SizedBox.shrink();

    Widget pieceRow(String side, List<Map<String,dynamic>> pieces) {
      return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Side dot
        Padding(
          padding: const EdgeInsets.only(top: 6, right: 5),
          child: Container(
            width: 9, height: 9,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: side == 'white' ? Colors.white : Colors.black,
              border: Border.all(color: Colors.white38, width: 0.8)),
          ),
        ),
        // Piece icons
        Expanded(child: Wrap(
          spacing: 2, runSpacing: 2,
          children: pieces.map((p) {
            final pieceType = p['type'] as String? ?? 'soldier';
            return Tooltip(
              message: pieceType,
              child: SvgPicture.string(
                buildPieceSvg(pieceType, side),
                width: 22, height: 22,
              ),
            );
          }).toList(),
        )),
      ]);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.white.withValues(alpha: 0.04),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Off Board', style: GoogleFonts.outfit(
          fontSize: 10, color: Colors.white38, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        const SizedBox(height: 5),
        if (blackOffBoard.isNotEmpty) ...[
          pieceRow('black', blackOffBoard),
          const SizedBox(height: 3),
        ],
        if (whiteOffBoard.isNotEmpty)
          pieceRow('white', whiteOffBoard),
      ]),
    );
  }

  // ── Board column ──────────────────────────────────────────────────────────────────────────────

  double _boardPieceSize = 40; // updated by BoardWidget.onGeometry

  Widget _buildBoardColumn() {
    // On-board only for BoardWidget (it ignores returned/graveyard anyway)
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

    // Off-board pieces grouped by side, sorted by ID for stable ordering
    final whiteOff = _pieces.where((p) =>
        (p['position'] as String?) == 'returned' &&
        (p['side'] as String?) == 'white').toList()
      ..sort((a, b) => (a['id'] as String? ?? '').compareTo(b['id'] as String? ?? ''));
    final blackOff = _pieces.where((p) =>
        (p['position'] as String?) == 'returned' &&
        (p['side'] as String?) == 'black').toList()
      ..sort((a, b) => (a['id'] as String? ?? '').compareTo(b['id'] as String? ?? ''));

    // Only show side pieces during Playing/GameOver (in Setup, all pieces are 'returned')
    final showSide = _currentPhase == 'Playing' || _currentPhase == 'GameOver';
    final pSize = _boardPieceSize;

    return Column(children: [
      Expanded(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // ── White off-board pieces (left side) ──────────────────────────
            if (showSide && whiteOff.isNotEmpty)
              _buildSidePieceColumn(whiteOff, 'white', pSize),

            // ── Board ───────────────────────────────────────────────────────
            Expanded(
              child: RepaintBoundary(
                child: BoardWidget(
                  polygons:         _polygons,
                  allEdges:         _allEdges,
                  legalMoveTargets: const {},  // analysis is read-only
                  selectedPolygon:  null,
                  isFlipped:        _isFlipped,
                  colorTheme:       'default',
                  pieces:           displayPieces,
                  overlays: const [],
                  onGeometry: (scale, ox, oy, cx, cy) {
                    final newSize = (scale * 36.0).clamp(28.0, 90.0);
                    if ((newSize - _boardPieceSize).abs() > 1) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) setState(() => _boardPieceSize = newSize);
                      });
                    }
                  },
                ),
              ),
            ),

            // ── Black off-board pieces (right side) ─────────────────────────
            if (showSide && blackOff.isNotEmpty)
              _buildSidePieceColumn(blackOff, 'black', pSize),
          ],
        ),
      ),
      _buildTransport(),
    ]);
  }

  /// Renders off-board pieces on the side of the board, using the same
  /// zigzag layout as the game screen when pieces are tightly packed.
  Widget _buildSidePieceColumn(List<Map<String, dynamic>> pieces, String side, double pieceSize) {
    return LayoutBuilder(builder: (context, constraints) {
      final count = pieces.length;
      if (count == 0) return const SizedBox.shrink();

      final availH = constraints.maxHeight;
      // Compute vertical step: fill available height, clamped to reasonable range
      final rawStep = count <= 1 ? pieceSize : (availH - pieceSize) / (count - 1);
      final vertStep = rawStep.clamp(pieceSize * 0.2, pieceSize);

      // Zigzag horizontally when pieces overlap vertically
      final bool zigzag = vertStep < pieceSize * 0.8;
      final columnWidth = zigzag ? pieceSize * 1.6 : pieceSize;

      // Center the column of pieces vertically
      final totalH = pieceSize + (count - 1) * vertStep;
      final startY = ((availH - totalH) / 2).clamp(0.0, double.infinity);

      return SizedBox(
        width: columnWidth,
        child: Stack(
          clipBehavior: Clip.none,
          children: List.generate(count, (i) {
            final p = pieces[i];
            final pieceType = p['type'] as String? ?? 'soldier';
            final pieceSide = p['side'] as String? ?? side;
            final xOff = zigzag ? (i.isEven ? 0.0 : pieceSize * 0.55) : 0.0;

            return Positioned(
              top: startY + i * vertStep,
              left: side == 'white' ? xOff : null,
              right: side == 'black' ? xOff : null,
              width: pieceSize,
              height: pieceSize,
              child: Tooltip(
                message: pieceType,
                child: SvgPicture.string(
                  buildPieceSvg(pieceType, pieceSide),
                  width: pieceSize,
                  height: pieceSize,
                ),
              ),
            );
          }),
        ),
      );
    });
  }


  // ── Transport bar ─────────────────────────────────────────────────────────

  Widget _buildTransport() {
    return LayoutBuilder(builder: (context, constraints) {
      final narrow = constraints.maxWidth < 600;

      final btnFirst  = _TransBtn('⏮', () { _stopAutoPlay(); _goTo(0); });
      final btnPrev   = _TransBtn('◀',  () { _stopAutoPlay(); _goTo(_stepIdx - 1); });
      final btnPlay   = _TransBtn(_autoPlaying ? '⏸' : '▶',
          () => _autoPlaying ? _stopAutoPlay() : _startAutoPlay(),
          active: _autoPlaying);
      final btnNext   = _TransBtn('▶',  () { _stopAutoPlay(); _goTo(_stepIdx + 1); });
      final btnLast   = _TransBtn('⏭', () { _stopAutoPlay(); _goTo(_totalSteps - 1); });
      final btnFlip   = _TransBtn('↕ Flip', () => setState(() => _isFlipped = !_isFlipped), wide: true);
      final stepText  = Text('$_stepIdx / ${_totalSteps - 1}',
          style: GoogleFonts.outfit(color: Colors.white54, fontSize: 13));
      final slider = Expanded(child: Slider(
        value: _stepIdx.toDouble(),
        min: 0, max: (_totalSteps - 1).toDouble().clamp(0, 9999),
        activeColor: DTheme.primary,
        onChanged: (v) { _stopAutoPlay(); _goTo(v.round()); },
      ));

      final gap = const SizedBox(width: 4);

      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
        child: narrow
            // ── Two-row layout for phones ──────────────────────────────────
            ? Column(mainAxisSize: MainAxisSize.min, children: [
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  btnFirst, gap, btnPrev, gap, btnPlay, gap, btnNext, gap, btnLast,
                  const SizedBox(width: 12),
                  btnFlip,
                ]),
                const SizedBox(height: 6),
                Row(children: [slider, const SizedBox(width: 8), stepText]),
              ])
            // ── Single-row layout for desktop/tablet ───────────────────────
            : Row(children: [
                btnFirst, gap, btnPrev, gap, btnPlay, gap, btnNext, gap, btnLast,
                const SizedBox(width: 12),
                slider,
                const SizedBox(width: 8),
                stepText,
                const SizedBox(width: 12),
                btnFlip,
              ]),
      );
    });
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

  // ── Game list panel (desktop – right of sidebar) ───────────────────────────

  Widget _buildGameListPanel() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        border: Border(left: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
          ),
          child: Row(children: [
            const Text('🏆', style: TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text('Games', style: GoogleFonts.outfit(
              fontSize: 13, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: DTheme.primary.withValues(alpha: 0.15),
              ),
              child: Text('${_allGames.length}', style: GoogleFonts.outfit(
                fontSize: 11, fontWeight: FontWeight.w700, color: DTheme.primary)),
            ),
          ]),
        ),
        // Game list
        Expanded(child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          itemCount: _allGames.length,
          itemBuilder: (_, i) => _buildGameCard(i),
        )),
      ]),
    );
  }

  Widget _buildGameCard(int i) {
    final g = _allGames[i];
    final isActive = i == _selectedGameIdx;
    final wName = g['whiteName'] as String? ?? '?';
    final bName = g['blackName'] as String? ?? '?';
    final winner = g['winner'] as String?;
    final round = g['tournament_round_info'] as String? ?? '';
    final moveCount = (g['moves'] as List?)?.length ?? 0;
    final hasNoMoves = moveCount == 0;

    return GestureDetector(
      onTap: hasNoMoves ? null : () => _selectGame(i),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 5),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: isActive
              ? DTheme.primary.withValues(alpha: 0.14)
              : hasNoMoves
                  ? Colors.white.withValues(alpha: 0.02)
                  : Colors.white.withValues(alpha: 0.04),
          border: Border.all(
            color: isActive
                ? DTheme.primary.withValues(alpha: 0.4)
                : Colors.white.withValues(alpha: 0.06),
            width: isActive ? 1.5 : 1),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Row 1: Round + move count
          Row(children: [
            if (round.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: Colors.white.withValues(alpha: 0.08)),
                child: Text(round, style: GoogleFonts.outfit(
                  fontSize: 9, color: Colors.white38, fontWeight: FontWeight.w600)),
              ),
            const Spacer(),
            Text('${moveCount}m', style: GoogleFonts.outfit(
              fontSize: 9, color: hasNoMoves ? Colors.white24 : Colors.white38)),
          ]),
          const SizedBox(height: 4),
          // Row 2: White player
          Row(children: [
            Container(width: 7, height: 7, decoration: BoxDecoration(
              shape: BoxShape.circle, color: Colors.white,
              border: Border.all(color: Colors.white38, width: 0.5))),
            const SizedBox(width: 5),
            Expanded(child: Text(wName, style: GoogleFonts.outfit(
              fontSize: 11,
              color: winner == 'white'
                  ? DTheme.textMainDark
                  : hasNoMoves ? Colors.white30 : Colors.white60,
              fontWeight: winner == 'white' ? FontWeight.w700 : FontWeight.w400),
              overflow: TextOverflow.ellipsis)),
            if (winner == 'white')
              const Text('👑', style: TextStyle(fontSize: 10)),
          ]),
          const SizedBox(height: 2),
          // Row 3: Black player
          Row(children: [
            Container(width: 7, height: 7, decoration: BoxDecoration(
              shape: BoxShape.circle, color: Colors.black,
              border: Border.all(color: Colors.white38, width: 0.5))),
            const SizedBox(width: 5),
            Expanded(child: Text(bName, style: GoogleFonts.outfit(
              fontSize: 11,
              color: winner == 'black'
                  ? DTheme.textMainDark
                  : hasNoMoves ? Colors.white30 : Colors.white60,
              fontWeight: winner == 'black' ? FontWeight.w700 : FontWeight.w400),
              overflow: TextOverflow.ellipsis)),
            if (winner == 'black')
              const Text('👑', style: TextStyle(fontSize: 10)),
          ]),
        ]),
      ),
    );
  }

  // ── Game strip (mobile – horizontal scroll above board) ──────────────────

  Widget _buildGameStrip() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        itemCount: _allGames.length,
        itemBuilder: (_, i) {
          final g = _allGames[i];
          final isActive = i == _selectedGameIdx;
          final wName = g['whiteName'] as String? ?? '?';
          final bName = g['blackName'] as String? ?? '?';
          final winner = g['winner'] as String?;
          final moveCount = (g['moves'] as List?)?.length ?? 0;
          final hasNoMoves = moveCount == 0;
          final winIcon = winner == 'white' ? '⚪'
              : winner == 'black' ? '⚫'
              : winner == 'draw' ? '🤝' : '';
          return GestureDetector(
            onTap: hasNoMoves ? null : () => _selectGame(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 140,
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: isActive
                    ? DTheme.primary.withValues(alpha: 0.14)
                    : hasNoMoves
                        ? Colors.white.withValues(alpha: 0.02)
                        : Colors.white.withValues(alpha: 0.05),
                border: Border.all(
                  color: isActive
                      ? DTheme.primary.withValues(alpha: 0.4)
                      : Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(children: [
                    Text('G${i + 1}', style: GoogleFonts.outfit(
                      fontSize: 10, fontWeight: FontWeight.w700,
                      color: isActive ? DTheme.primary : Colors.white38)),
                    const Spacer(),
                    if (winIcon.isNotEmpty)
                      Text(winIcon, style: const TextStyle(fontSize: 9)),
                  ]),
                  const SizedBox(height: 2),
                  Text('$wName vs $bName', style: GoogleFonts.outfit(
                    fontSize: 9,
                    color: hasNoMoves ? Colors.white30 : Colors.white60),
                    overflow: TextOverflow.ellipsis, maxLines: 1),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildColorCircles() {
    final chosen = _colorChosen[_currentTurn] as String?;
    final colors = chosen != null ? [chosen] : ['grey', 'green', 'blue', 'orange'];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.white.withValues(alpha: 0.03),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06))),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(chosen != null ? 'Color:' : 'No color yet',
          style: GoogleFonts.outfit(color: Colors.white54, fontSize: 12)),
        const SizedBox(height: 6),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 6,
          children: colors.map((c) {
            final col = _polyHex[c] ?? Colors.grey;
            return Container(
              width: 26, height: 26,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: col.withValues(alpha: chosen != null ? 1.0 : 0.6),
                border: Border.all(
                  color: chosen == c ? Colors.white : Colors.white.withValues(alpha: 0.15),
                  width: chosen == c ? 2.5 : 1),
                boxShadow: chosen == c ? [BoxShadow(color: col.withValues(alpha: 0.7), blurRadius: 10)] : null,
              ),
            );
          }).toList(),
        ),
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
      padding: EdgeInsets.symmetric(horizontal: wide ? 14 : 10, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: active ? DTheme.primary.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.08),
        border: Border.all(color: active ? DTheme.primary.withValues(alpha: 0.5) : Colors.white.withValues(alpha: 0.12))),
      child: Text(label, style: GoogleFonts.outfit(
        color: active ? DTheme.primary : Colors.white70, fontSize: 15, fontWeight: FontWeight.w600))));
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
      fontSize: 36,        // scaled for the 200px panel
    );
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(10),
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
