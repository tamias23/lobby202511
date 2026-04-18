import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../../core/theme.dart';
import '../../core/config.dart';
import '../../providers/socket_provider.dart';
import '../../providers/auth_provider.dart';

// ── Format definition ─────────────────────────────────────────────────────────

class _FormatInfo {
  final String key, label, emoji, desc, durationType;
  final int minP, maxP;
  final int? defaultDur;
  const _FormatInfo({
    required this.key, required this.label, required this.emoji,
    required this.desc, required this.minP, required this.maxP,
    required this.durationType, this.defaultDur,
  });
}

const _formats = [
  _FormatInfo(key:'swiss',       label:'Swiss',       emoji:'🏔️', desc:'Paired by score each round. Everyone plays every round.',         minP:6,  maxP:200, durationType:'rounds',  defaultDur:6),
  _FormatInfo(key:'arena',       label:'Arena',       emoji:'⚔️', desc:'Continuous re-pairing immediately after finishing. Fastest format.',minP:6,  maxP:200, durationType:'minutes', defaultDur:30),
  _FormatInfo(key:'knockout',    label:'Knockout',    emoji:'🥊', desc:'Single-elimination. Lose and you\'re out!',                        minP:2,  maxP:64,  durationType:'rounds',  defaultDur:null),
  _FormatInfo(key:'round_robin', label:'Round Robin', emoji:'🔄', desc:'Everyone plays everyone. The true test of strength.',              minP:2,  maxP:10,  durationType:'rounds',  defaultDur:null),
];

const _tcPresets = [
  {'label':'5+5',   'm':5,  'i':5 },
  {'label':'10+5',  'm':10, 'i':5 },
  {'label':'10+10', 'm':10, 'i':10},
  {'label':'15+10', 'm':15, 'i':10},
  {'label':'15+30', 'm':15, 'i':30},
];

int _knockoutRounds(int n) => (n <= 1 ? 1 : (n - 1).bitLength);

// ── Board mini painter ────────────────────────────────────────────────────────

const _polyColors = {
  'orange': Color(0xFFF97316),
  'green':  Color(0xFF22C55E),
  'blue':   Color(0xFF3B82F6),
  'grey':   Color(0xFF64748B),
  'red':    Color(0xFFEF4444),
  'purple': Color(0xFFA855F7),
  'yellow': Color(0xFFEAB308),
};

class _BoardMiniPainter extends CustomPainter {
  final Map<String, dynamic> board;
  _BoardMiniPainter(this.board);

  @override
  void paint(Canvas canvas, Size size) {
    final polys = board['polygons'] as List<dynamic>? ?? [];
    final bbox  = board['bbox'] as Map<String, dynamic>?;
    if (polys.isEmpty || bbox == null) return;
    final minX = (bbox['minX'] as num).toDouble();
    final minY = (bbox['minY'] as num).toDouble();
    final bw   = (bbox['maxX'] as num).toDouble() - minX;
    final bh   = (bbox['maxY'] as num).toDouble() - minY;
    if (bw <= 0 || bh <= 0) return;
    final pad = 4.0;
    final scaleX = (size.width  - pad*2) / bw;
    final scaleY = (size.height - pad*2) / bh;
    final s = scaleX < scaleY ? scaleX : scaleY;
    final dx = pad + (size.width  - bw*s) / 2 - minX*s;
    final dy = pad + (size.height - bh*s) / 2 - minY*s;

    for (final poly in polys) {
      final pts = poly['points'] as List<dynamic>? ?? [];
      if (pts.length < 3) continue;
      final path = Path();
      for (int i = 0; i < pts.length; i++) {
        final pt = pts[i] as List<dynamic>;
        final x = (pt[0] as num).toDouble() * s + dx;
        final y = (pt[1] as num).toDouble() * s + dy;
        if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
      }
      path.close();
      final col = _polyColors[poly['color'] as String? ?? ''] ?? const Color(0xFF888888);
      canvas.drawPath(path, Paint()..color = col);
      canvas.drawPath(path, Paint()..color = Colors.black.withValues(alpha: 0.3)
        ..style = PaintingStyle.stroke ..strokeWidth = 0.5);
    }
  }

  @override bool shouldRepaint(_BoardMiniPainter old) => old.board != board;
}

// ── Main screen ───────────────────────────────────────────────────────────────

class TournamentCreateScreen extends ConsumerStatefulWidget {
  const TournamentCreateScreen({super.key});
  @override
  ConsumerState<TournamentCreateScreen> createState() => _TournamentCreateScreenState();
}

class _TournamentCreateScreenState extends ConsumerState<TournamentCreateScreen> {
  int _step = 1;

  // Config
  _FormatInfo? _format;
  int    _maxP = 8;
  int    _tcMinutes = 5, _tcIncrement = 5;
  bool   _usePassword = false;
  String _password = '';
  int    _ratingMin = 0, _ratingMax = 5000;
  int    _invitedBots = 0;
  bool   _creatorPlays = true;
  String _launchMode = 'when_complete';
  int    _launchDelay = 30;
  int    _durationValue = 6;

  // Board step
  String _boardMode = 'random';
  String? _selectedBoardId;
  List<Map<String,dynamic>> _boards = [];
  bool _loadingBoards = false;
  Map<String,dynamic>? _expandedBoard;

  bool _creating = false;
  String _error = '';

  int get _maxBots => (_maxP - (_creatorPlays ? 1 : 0)).clamp(0, _maxP);

  @override
  void initState() {
    super.initState();
    _listenSocket();
  }

  void _listenSocket() {
    final socket = ref.read(socketServiceProvider);
    socket.on('tournament_created', (data) {
      final d = data as Map<String,dynamic>;
      if (!mounted) return;
      setState(() => _creating = false);
      context.go('/tournament/${d['id']}');
    });
    socket.on('tournament_error', (data) {
      final d = data as Map<String,dynamic>;
      if (!mounted) return;
      setState(() { _creating = false; _error = d['message'] ?? 'Failed to create.'; });
    });
  }

  @override
  void dispose() {
    final socket = ref.read(socketServiceProvider);
    socket.off('tournament_created');
    socket.off('tournament_error');
    super.dispose();
  }

  void _selectFormat(_FormatInfo f) {
    setState(() {
      _format = f;
      _maxP = _maxP.clamp(f.minP, f.maxP);
      if (f.durationType == 'rounds' && f.defaultDur == null) {
        if (f.key == 'knockout')    _durationValue = _knockoutRounds(_maxP);
        if (f.key == 'round_robin') _durationValue = (_maxP - 1).clamp(1, 99);
      } else if (f.defaultDur != null) {
        _durationValue = f.defaultDur!;
      }
    });
  }

  Future<void> _loadBoards() async {
    if (_boards.isNotEmpty || _loadingBoards) return;
    setState(() => _loadingBoards = true);
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final res  = await http.get(Uri.parse('$base/api/boards/random/10'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String,dynamic>;
        final list = (data['boards'] as List<dynamic>? ?? [])
            .map((b) => b as Map<String,dynamic>).toList();
        if (mounted) setState(() { _boards = list; _loadingBoards = false; });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingBoards = false);
    }
  }

  void _handleCreate() {
    if (_creating || _format == null) return;
    final socket = ref.read(socketServiceProvider);
    setState(() { _creating = true; _error = ''; });
    socket.emit('create_tournament', {
      'format':               _format!.key,
      'maxParticipants':      _maxP,
      'timeControlMinutes':   _tcMinutes,
      'timeControlIncrement': _tcIncrement,
      'password':             _usePassword ? _password : null,
      'boardId':              _boardMode == 'fixed' ? _selectedBoardId : null,
      'ratingMin':            _ratingMin,
      'ratingMax':            _ratingMax,
      'durationValue':        _durationValue,
      'invitedBots':          _invitedBots,
      'creatorPlays':         _creatorPlays,
      'launchMode':           _launchMode,
      'launchDelayMinutes':   _launchDelay,
    });
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(children: [
          _buildHeader(context),
          _buildStepper(),
          Expanded(child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: _buildStep(),
            )),
          )),
        ]),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(children: [
        GestureDetector(
          onTap: () => context.go('/'),
          child: Row(children: [
            const Icon(Icons.arrow_back_ios_new, color: Colors.white70, size: 16),
            const SizedBox(width: 6),
            Text('Lobby', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
          ]),
        ),
        const SizedBox(width: 16),
        Text('Create Tournament', style: GoogleFonts.outfit(
          fontSize: 20, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
      ]),
    );
  }

  Widget _buildStepper() {
    final labels = ['Format', 'Settings', 'Board', 'Review'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
      child: Row(children: List.generate(labels.length, (i) {
        final n = i + 1;
        final done   = n < _step;
        final active = n == _step;
        return Expanded(child: Row(children: [
          Expanded(child: Column(children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 32, height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: done   ? DTheme.success
                    : active ? DTheme.primary
                    : Colors.white.withValues(alpha: 0.1),
                border: Border.all(
                  color: active ? DTheme.primary : Colors.transparent, width: 2),
              ),
              child: Center(child: done
                ? const Icon(Icons.check, color: Colors.white, size: 16)
                : Text('$n', style: GoogleFonts.outfit(
                    color: active ? Colors.white : Colors.white54,
                    fontWeight: FontWeight.w700))),
            ),
            const SizedBox(height: 4),
            Text(labels[i], style: GoogleFonts.outfit(
              fontSize: 11, color: active ? DTheme.primary : Colors.white54)),
          ])),
          if (i < labels.length - 1)
            Expanded(child: Container(height: 1,
              color: Colors.white.withValues(alpha: done ? 0.4 : 0.1))),
        ]));
      })),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1: return _buildStep1();
      case 2: return _buildStep2();
      case 3: return _buildStep3();
      case 4: return _buildStep4();
      default: return const SizedBox.shrink();
    }
  }

  // ── Step 1: Format ──────────────────────────────────────────────────────────
  Widget _buildStep1() {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 8),
      Text('Choose Format', style: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
      const SizedBox(height: 16),
      ..._formats.map((f) => _FormatCard(
        info: f, selected: _format?.key == f.key,
        onTap: () => _selectFormat(f),
      )),
      const SizedBox(height: 20),
      _PrimaryBtn(
        label: 'Next: Settings →',
        enabled: _format != null,
        onTap: () { if (_format != null) setState(() => _step = 2); },
      ),
    ]);
  }

  // ── Step 2: Settings ────────────────────────────────────────────────────────
  Widget _buildStep2() {
    final f = _format!;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 8),
      Text('Settings', style: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
      const SizedBox(height: 20),

      // Max participants slider
      _SettingsSection(
        label: 'Participants (${f.minP}–${f.maxP})',
        child: Row(children: [
          Expanded(child: Slider(
            value: _maxP.toDouble(),
            min: f.minP.toDouble(), max: f.maxP.toDouble(), divisions: f.maxP - f.minP,
            activeColor: DTheme.primary,
            onChanged: (v) {
              setState(() {
                _maxP = v.round();
                _invitedBots = _invitedBots.clamp(0, _maxBots);
                if (f.key == 'knockout')    _durationValue = _knockoutRounds(_maxP);
                if (f.key == 'round_robin') _durationValue = (_maxP - 1).clamp(1, 99);
              });
            },
          )),
          SizedBox(width: 40, child: Text('$_maxP',
            style: GoogleFonts.outfit(color: DTheme.primary, fontWeight: FontWeight.w700, fontSize: 16),
            textAlign: TextAlign.right)),
        ]),
      ),

      // Duration
      if (f.durationType == 'minutes' || (f.durationType == 'rounds' && f.defaultDur != null))
        _SettingsSection(
          label: 'Duration (${f.durationType})',
          child: Row(children: [
            Expanded(child: Slider(
              value: _durationValue.toDouble(),
              min: 1, max: f.durationType == 'minutes' ? 120 : 20,
              activeColor: DTheme.primary,
              onChanged: (v) => setState(() => _durationValue = v.round()),
            )),
            SizedBox(width: 60, child: Text('$_durationValue ${f.durationType}',
              style: GoogleFonts.outfit(color: DTheme.primary, fontWeight: FontWeight.w700),
              textAlign: TextAlign.right)),
          ]),
        ),
      if (f.key == 'knockout' || f.key == 'round_robin')
        _SettingsSection(
          label: 'Duration (auto)',
          child: Text('$_durationValue rounds (auto-calculated)',
            style: GoogleFonts.outfit(color: DTheme.primary, fontSize: 14)),
        ),

      // Time Control
      _SettingsSection(
        label: 'Time Control',
        child: Column(children: [
          Wrap(spacing: 8, runSpacing: 8, children: _tcPresets.map((tc) {
            final active = _tcMinutes == tc['m'] && _tcIncrement == tc['i'];
            return _ToggleBtn(
              label: tc['label'] as String, active: active,
              onTap: () => setState(() { _tcMinutes = tc['m'] as int; _tcIncrement = tc['i'] as int; }),
            );
          }).toList()),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _NumField(label: 'Min', value: _tcMinutes,
              onChanged: (v) => setState(() => _tcMinutes = v))),
            const Padding(padding: EdgeInsets.symmetric(horizontal: 8),
              child: Text('+', style: TextStyle(color: Colors.white54, fontSize: 18))),
            Expanded(child: _NumField(label: 'Inc', value: _tcIncrement,
              onChanged: (v) => setState(() => _tcIncrement = v))),
          ]),
        ]),
      ),

      // Password
      _SettingsSection(
        label: 'Password Protection',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            _ToggleBtn(label: 'Open', active: !_usePassword,
              onTap: () => setState(() => _usePassword = false)),
            const SizedBox(width: 8),
            _ToggleBtn(label: '🔒 Password', active: _usePassword,
              onTap: () => setState(() => _usePassword = true)),
          ]),
          if (_usePassword) ...[
            const SizedBox(height: 10),
            TextField(
              onChanged: (v) => _password = v,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter password',
                hintStyle: const TextStyle(color: Colors.white38),
                filled: true, fillColor: Colors.white.withValues(alpha: 0.05),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15))),
              ),
            ),
          ],
        ]),
      ),

      // Rating
      _SettingsSection(
        label: 'Rating Range ($_ratingMin – $_ratingMax)',
        child: RangeSlider(
          values: RangeValues(_ratingMin.toDouble(), _ratingMax.toDouble()),
          min: 0, max: 5000, divisions: 50,
          activeColor: DTheme.primary,
          onChanged: (r) => setState(() { _ratingMin = r.start.round(); _ratingMax = r.end.round(); }),
        ),
      ),

      // Bots
      _SettingsSection(
        label: 'Invite Bots (0–$_maxBots)',
        child: Row(children: [
          Expanded(child: Slider(
            value: _invitedBots.toDouble(), min: 0, max: _maxBots.toDouble().clamp(0, 99),
            divisions: _maxBots > 0 ? _maxBots : 1,
            activeColor: const Color(0xFF8B5CF6),
            onChanged: (v) => setState(() => _invitedBots = v.round()),
          )),
          SizedBox(width: 36, child: Text('$_invitedBots',
            style: GoogleFonts.outfit(color: const Color(0xFF8B5CF6), fontWeight: FontWeight.w700, fontSize: 16),
            textAlign: TextAlign.right)),
        ]),
      ),

      // Creator plays
      _SettingsSection(
        label: 'Will you play?',
        child: Row(children: [
          _ToggleBtn(label: 'Yes', active: _creatorPlays,
            onTap: () => setState(() { _creatorPlays = true; _invitedBots = _invitedBots.clamp(0, _maxBots); })),
          const SizedBox(width: 8),
          _ToggleBtn(label: 'No (spectate)', active: !_creatorPlays,
            onTap: () => setState(() => _creatorPlays = false)),
        ]),
      ),

      // Launch mode
      _SettingsSection(
        label: 'When to Start',
        child: Column(children: [
          Wrap(spacing: 8, runSpacing: 8, children: [
            _ToggleBtn(label: 'When Full', active: _launchMode == 'when_complete',
              onTap: () => setState(() => _launchMode = 'when_complete')),
            _ToggleBtn(label: 'At Time', active: _launchMode == 'at_time',
              onTap: () => setState(() => _launchMode = 'at_time')),
            _ToggleBtn(label: 'Either', active: _launchMode == 'both',
              onTap: () => setState(() => _launchMode = 'both')),
          ]),
          if (_launchMode == 'at_time' || _launchMode == 'both') ...[
            const SizedBox(height: 12),
            Row(children: [
              Text('Start in', style: GoogleFonts.outfit(color: Colors.white54, fontSize: 13)),
              const SizedBox(width: 12),
              Expanded(child: Slider(
                value: _launchDelay.toDouble(), min: 5, max: 120, divisions: 23,
                activeColor: DTheme.primary,
                onChanged: (v) => setState(() => _launchDelay = (v / 5).round() * 5),
              )),
              SizedBox(width: 40, child: Text('${_launchDelay}m',
                style: GoogleFonts.outfit(color: DTheme.primary, fontWeight: FontWeight.w700),
                textAlign: TextAlign.right)),
            ]),
          ],
        ]),
      ),

      const SizedBox(height: 24),
      Row(children: [
        _SecondaryBtn(label: '← Back', onTap: () => setState(() => _step = 1)),
        const SizedBox(width: 12),
        Expanded(child: _PrimaryBtn(label: 'Next: Board Selection →',
          onTap: () => setState(() { _step = 3; if (_boardMode == 'fixed') _loadBoards(); }))),
      ]),
    ]);
  }

  // ── Step 3: Board ───────────────────────────────────────────────────────────
  Widget _buildStep3() {
    if (_boardMode == 'fixed' && _boards.isEmpty && !_loadingBoards) _loadBoards();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 8),
      Text('Board Selection', style: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
      const SizedBox(height: 16),
      Row(children: [
        _ToggleBtn(label: 'Random Boards', active: _boardMode == 'random',
          onTap: () => setState(() => _boardMode = 'random')),
        const SizedBox(width: 8),
        _ToggleBtn(label: 'Fixed Board', active: _boardMode == 'fixed',
          onTap: () { setState(() => _boardMode = 'fixed'); _loadBoards(); }),
      ]),
      const SizedBox(height: 16),
      if (_boardMode == 'random')
        _GlassCard(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'Each game will use a randomly selected board from the server pool. '
            'This ensures variety and fairness.',
            style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14),
          ),
        ))
      else if (_loadingBoards)
        const Center(child: CircularProgressIndicator())
      else
        GridView.builder(
          shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 200, mainAxisSpacing: 12, crossAxisSpacing: 12,
            childAspectRatio: 0.85,
          ),
          itemCount: _boards.length,
          itemBuilder: (_, i) {
            final b   = _boards[i];
            final bid = b['id'] as String;
            final sel = _selectedBoardId == bid;
            return GestureDetector(
              onTap: () => setState(() => _selectedBoardId = bid),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.white.withValues(alpha: sel ? 0.12 : 0.05),
                  border: Border.all(
                    color: sel ? DTheme.primary : Colors.white.withValues(alpha: 0.1),
                    width: sel ? 2 : 1),
                ),
                padding: const EdgeInsets.all(8),
                child: Column(children: [
                  Expanded(child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: CustomPaint(painter: _BoardMiniPainter(b),
                      child: const SizedBox.expand()),
                  )),
                  const SizedBox(height: 6),
                  Text(bid, style: GoogleFonts.outfit(
                    fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white70),
                    overflow: TextOverflow.ellipsis),
                  Text('${b['polygonCount']} tiles', style: GoogleFonts.outfit(
                    fontSize: 10, color: Colors.white38)),
                  const SizedBox(height: 4),
                  GestureDetector(
                    onTap: () => setState(() => _expandedBoard = b),
                    child: const Text('🔍', style: TextStyle(fontSize: 14)),
                  ),
                ]),
              ),
            );
          },
        ),

      const SizedBox(height: 24),
      Row(children: [
        _SecondaryBtn(label: '← Back', onTap: () => setState(() => _step = 2)),
        const SizedBox(width: 12),
        Expanded(child: _PrimaryBtn(
          label: 'Next: Review →',
          enabled: _boardMode == 'random' || _selectedBoardId != null,
          onTap: () => setState(() => _step = 4),
        )),
      ]),

      // Expanded board overlay
      if (_expandedBoard != null)
        GestureDetector(
          onTap: () => setState(() => _expandedBoard = null),
          child: Container(
            color: Colors.black.withValues(alpha: 0.7),
            child: Center(
              child: GestureDetector(
                onTap: () {}, // prevent close
                child: Container(
                  width: 480, padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text(_expandedBoard!['id'].toString(),
                      style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                    const SizedBox(height: 12),
                    SizedBox(height: 340, child: CustomPaint(
                      painter: _BoardMiniPainter(_expandedBoard!),
                      child: const SizedBox.expand())),
                    const SizedBox(height: 8),
                    Text('${_expandedBoard!['polygonCount']} tiles',
                      style: GoogleFonts.outfit(color: Colors.white54)),
                    const SizedBox(height: 12),
                    _PrimaryBtn(label: 'Select this board', onTap: () => setState(() {
                      _selectedBoardId = _expandedBoard!['id'] as String;
                      _expandedBoard = null;
                    })),
                  ]),
                ),
              ),
            ),
          ),
        ),
    ]);
  }

  // ── Step 4: Review ──────────────────────────────────────────────────────────
  Widget _buildStep4() {
    final f = _format!;
    final rows = <(String, String)>[
      ('Format',  '${f.emoji} ${f.label}'),
      ('Players', '$_maxP'),
      ('Time',    '$_tcMinutes+$_tcIncrement'),
      ('Duration','$_durationValue ${f.durationType}'),
      ('Password',_usePassword ? '🔒 Yes' : '🔓 Open'),
      ('Rating',  '$_ratingMin – $_ratingMax'),
      ('Bots',    '$_invitedBots'),
      ('You play',_creatorPlays ? 'Yes' : 'No'),
      ('Board',   _boardMode == 'fixed' ? (_selectedBoardId ?? 'Random') : 'Random'),
      ('Launch',  _launchMode == 'when_complete' ? 'When full'
                : _launchMode == 'at_time'       ? 'In ${_launchDelay}m'
                :                                  'When full or in ${_launchDelay}m'),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 8),
      Text('Review', style: GoogleFonts.outfit(
        fontSize: 22, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
      const SizedBox(height: 16),
      _GlassCard(child: Column(children: rows.map((row) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(row.$1, style: GoogleFonts.outfit(color: Colors.white54, fontSize: 14)),
          Text(row.$2, style: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.w700, fontSize: 14)),
        ]),
      )).toList())),
      if (_error.isNotEmpty) ...[
        const SizedBox(height: 12),
        Text(_error, style: GoogleFonts.outfit(color: DTheme.danger, fontSize: 13)),
      ],
      const SizedBox(height: 20),
      Row(children: [
        _SecondaryBtn(label: '← Back', onTap: () => setState(() => _step = 3)),
        const SizedBox(width: 12),
        Expanded(child: _PrimaryBtn(
          label: _creating ? 'Creating…' : '🏆 Create Tournament',
          enabled: !_creating,
          onTap: _handleCreate,
        )),
      ]),
    ]);
  }
}

// ── Shared sub-widgets ────────────────────────────────────────────────────────

class _FormatCard extends StatefulWidget {
  final _FormatInfo info;
  final bool selected;
  final VoidCallback onTap;
  const _FormatCard({required this.info, required this.selected, required this.onTap});
  @override State<_FormatCard> createState() => _FormatCardState();
}
class _FormatCardState extends State<_FormatCard> {
  bool _hovered = false;
  @override Widget build(BuildContext context) {
    final c = DTheme.primary;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Colors.white.withValues(alpha: widget.selected ? 0.12 : (_hovered ? 0.08 : 0.04)),
            border: Border.all(
              color: widget.selected ? c : Colors.white.withValues(alpha: 0.12),
              width: widget.selected ? 2 : 1),
          ),
          child: Row(children: [
            Text(widget.info.emoji, style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.info.label, style: GoogleFonts.outfit(
                fontSize: 16, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
              const SizedBox(height: 4),
              Text(widget.info.desc, style: GoogleFonts.outfit(
                fontSize: 13, color: Colors.white54)),
            ])),
            if (widget.selected)
              Icon(Icons.check_circle, color: c, size: 22),
          ]),
        ),
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String label;
  final Widget child;
  const _SettingsSection({required this.label, required this.child});
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: GoogleFonts.outfit(
        fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white54,
        letterSpacing: 0.5)),
      const SizedBox(height: 10),
      child,
    ]),
  );
}

class _ToggleBtn extends StatelessWidget {
  final String label; final bool active; final VoidCallback onTap;
  const _ToggleBtn({required this.label, required this.active, required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: active ? DTheme.primary.withValues(alpha: 0.25) : Colors.white.withValues(alpha: 0.06),
        border: Border.all(
          color: active ? DTheme.primary : Colors.white.withValues(alpha: 0.12))),
      child: Text(label, style: GoogleFonts.outfit(
        fontSize: 13, fontWeight: FontWeight.w600,
        color: active ? DTheme.primary : Colors.white60)),
    ),
  );
}

class _NumField extends StatelessWidget {
  final String label; final int value; final void Function(int) onChanged;
  const _NumField({required this.label, required this.value, required this.onChanged});
  @override Widget build(BuildContext context) => TextField(
    keyboardType: TextInputType.number,
    controller: TextEditingController(text: '$value'),
    style: GoogleFonts.outfit(color: Colors.white),
    textAlign: TextAlign.center,
    decoration: InputDecoration(
      labelText: label, labelStyle: GoogleFonts.outfit(color: Colors.white38, fontSize: 12),
      filled: true, fillColor: Colors.white.withValues(alpha: 0.06),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
    ),
    onChanged: (v) { final n = int.tryParse(v); if (n != null) onChanged(n); },
  );
}

class _PrimaryBtn extends StatelessWidget {
  final String label; final VoidCallback onTap; final bool enabled;
  const _PrimaryBtn({required this.label, required this.onTap, this.enabled = true});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: enabled ? onTap : null,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        gradient: enabled ? const LinearGradient(
          colors: [Color(0xFF46B0D4), Color(0xFFF27813)],
          begin: Alignment.centerLeft, end: Alignment.centerRight)
          : null,
        color: enabled ? null : Colors.white.withValues(alpha: 0.08),
      ),
      child: Center(child: Text(label, style: GoogleFonts.outfit(
        fontSize: 15, fontWeight: FontWeight.w700,
        color: enabled ? Colors.white : Colors.white38))),
    ),
  );
}

class _SecondaryBtn extends StatelessWidget {
  final String label; final VoidCallback onTap;
  const _SecondaryBtn({required this.label, required this.onTap});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: Colors.white.withValues(alpha: 0.08),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15))),
      child: Text(label, style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
    ),
  );
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});
  @override Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      color: Colors.white.withValues(alpha: 0.05),
      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
    ),
    child: child,
  );
}
