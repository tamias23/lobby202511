import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../core/file_utils.dart';
import '../../providers/socket_provider.dart';
import '../../providers/auth_provider.dart';

const _formatLabels = {
  'swiss':       '🏔️ Swiss',
  'arena':       '⚔️ Arena',
  'knockout':    '🥊 Knockout',
  'round_robin': '🔄 Round Robin',
};

class TournamentRoomScreen extends ConsumerStatefulWidget {
  final String tournamentId;
  const TournamentRoomScreen({super.key, required this.tournamentId});
  @override
  ConsumerState<TournamentRoomScreen> createState() => _TournamentRoomScreenState();
}

class _TournamentRoomScreenState extends ConsumerState<TournamentRoomScreen> {
  Map<String,dynamic>? _tournament;
  bool _showQuitConfirm = false;
  bool _isDownloading   = false;

  // Arena countdown tick
  Timer? _tick;
  int    _tickCount = 0;

  @override
  void initState() {
    super.initState();
    _joinRoom();
  }

  @override
  void dispose() {
    _tick?.cancel();
    _leaveRoom();
    super.dispose();
  }

  void _joinRoom() {
    final socket = ref.read(socketServiceProvider);
    socket.emit('enter_tournament_room', {'tournamentId': widget.tournamentId});

    socket.on('tournament_update', (data) {
      if (!mounted) return;
      final d = Map<String,dynamic>.from(data as Map);
      if (d['id'] == widget.tournamentId || d['id'] == null) {
        setState(() => _tournament = d);
        _maybeStartTick(d);
      }
    });

    socket.on('tournament_game_start', (data) {
      final d = Map<String,dynamic>.from(data as Map);
      if (!mounted) return;
      if (d['tournamentId'] == widget.tournamentId) {
        final auth = ref.read(authProvider).value;
        if (auth != null &&
            (d['whiteId'] == auth.id || d['blackId'] == auth.id)) {
          context.go('/games/${d['gameHash']}');
        }
      }
    });

    socket.on('tournament_game_aborted', (data) {
      final d = Map<String,dynamic>.from(data as Map);
      if (!mounted) return;
      if (d['tournamentId'] == widget.tournamentId) {
        context.go('/tournament/${widget.tournamentId}');
      }
    });
  }

  void _leaveRoom() {
    final socket = ref.read(socketServiceProvider);
    socket.emit('leave_tournament_room', {'tournamentId': widget.tournamentId});
    socket.off('tournament_update');
    socket.off('tournament_game_start');
    socket.off('tournament_game_aborted');
    socket.off('tournament_games_download_data');
  }

  void _maybeStartTick(Map<String,dynamic> t) {
    final isArenaActive = t['format'] == 'arena' &&
        t['status'] == 'active' && t['arenaEndAt'] != null;
    if (isArenaActive && _tick == null) {
      _tick = Timer.periodic(const Duration(milliseconds: 500), (_) {
        if (mounted) setState(() => _tickCount++);
      });
    } else if (!isArenaActive) {
      _tick?.cancel(); _tick = null;
    }
  }

  void _quit() {
    final socket = ref.read(socketServiceProvider);
    socket.emit('leave_tournament', {'tournamentId': widget.tournamentId});
    setState(() => _showQuitConfirm = false);
    context.go('/');
  }

  void _download() {
    if (_isDownloading) return;
    setState(() => _isDownloading = true);

    final socket = ref.read(socketServiceProvider);

    // Use .once to ensure this handler only fires once for this specific request.
    // This avoids duplicate downloads if the screen was rebuilt or stacked.
    socket.once('tournament_games_download_data', (data) {
      if (!mounted) return;
      final d = Map<String, dynamic>.from(data as Map);
      if (d['tournamentId'] != widget.tournamentId) return;

      setState(() => _isDownloading = false);
      _triggerDownload(d['json'] as String? ?? '');
    });

    socket.emit('download_tournament_games', {'tournamentId': widget.tournamentId});
  }

  void _triggerDownload(String jsonStr) {
    if (jsonStr.isEmpty) return;
    final tName = (_tournament?['name'] as String? ?? widget.tournamentId)
        .replaceAll(RegExp(r'[^\w\s-]'), '')
        .replaceAll(' ', '_');
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    downloadFile(jsonStr, 'tournament_${tName}_$timestamp.json');
  }

  String _formatTimeLeft(dynamic endAt) {
    if (endAt == null) return '';
    final end  = DateTime.fromMillisecondsSinceEpoch((endAt as num).toInt());
    final diff = end.difference(DateTime.now());
    if (diff.isNegative) return '0:00';
    final m = diff.inMinutes;
    final s = diff.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final t    = _tournament;
    final auth = ref.watch(authProvider).value;
    final wide = MediaQuery.of(context).size.width > 800;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: t == null
            ? const Center(child: CircularProgressIndicator())
            : Column(children: [
                _buildHeader(t),
                Expanded(child: wide
                    ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(flex: 2, child: _buildLeft(t, auth)),
                        Expanded(flex: 3, child: _buildRight(t, auth)),
                      ])
                    : SingleChildScrollView(child: Column(children: [
                        _buildLeft(t, auth),
                        _buildRight(t, auth),
                      ]))),
                _buildFooter(t, auth),
              ]),
      ),
    );
  }

  // ── Header ────────────────────────────────────────────────────────────────

  Widget _buildHeader(Map<String,dynamic> t) {
    final format    = t['format'] as String? ?? '';
    final status    = t['status'] as String? ?? 'open';
    final curRound  = (t['currentRound']  as num?)?.toInt() ?? 0;
    final maxRounds = (t['maxRounds']      as num?)?.toInt() ?? 0;
    final curCount  = (t['currentCount']   as num?)?.toInt() ?? 0;
    final maxP      = (t['maxParticipants'] as num?)?.toInt() ?? 0;
    final tc        = t['timeControl'] as Map<String,dynamic>?;
    final isActive  = status == 'active';
    final isArena   = format == 'arena';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          GestureDetector(
            onTap: () => context.go('/'),
            child: Row(children: [
              const Icon(Icons.arrow_back_ios_new, color: Colors.white70, size: 14),
              const SizedBox(width: 4),
              Text('Lobby', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13)),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(
            t['name'] as String? ?? t['id'] as String? ?? 'Tournament',
            style: GoogleFonts.outfit(
              fontSize: 18, fontWeight: FontWeight.w700, color: DTheme.textMainDark),
            overflow: TextOverflow.ellipsis)),
          Text(_formatLabels[format] ?? format,
            style: GoogleFonts.outfit(color: DTheme.primary, fontSize: 13, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 8),
        Wrap(spacing: 12, runSpacing: 6, children: [
          _StatusBadge(status),
          if (tc != null)
            _MetaChip('${tc['minutes']}+${tc['increment']}'),
          if (!isArena)
            _MetaChip('Round $curRound/$maxRounds'),
          if (isArena && t['arenaEndAt'] != null && isActive)
            _MetaChip('⏱️ ${_formatTimeLeft(t['arenaEndAt'])}'),
          _MetaChip('👥 $curCount/$maxP'),
        ]),
      ]),
    );
  }

  // ── Left: Details + Standings ─────────────────────────────────────────────

  Widget _buildLeft(Map<String,dynamic> t, dynamic auth) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        _buildDetails(t),
        const SizedBox(height: 16),
        _buildStandings(t, auth),
      ]),
    );
  }

  Widget _buildDetails(Map<String,dynamic> t) {
    final tc        = t['timeControl'] as Map<String,dynamic>?;
    final launchMode = t['launchMode'] as String? ?? 'when_complete';
    String launchStr;
    if (launchMode == 'at_time' && t['launchAt'] != null) {
      final d = DateTime.fromMillisecondsSinceEpoch((t['launchAt'] as num).toInt());
      launchStr = 'Scheduled at ${d.hour.toString().padLeft(2,'0')}:${d.minute.toString().padLeft(2,'0')}';
    } else if (launchMode == 'when_complete') {
      launchStr = 'Starts when full';
    } else {
      launchStr = 'Either time or full';
    }
    final createdAt = t['createdAt'] != null
        ? DateTime.fromMillisecondsSinceEpoch((t['createdAt'] as num).toInt())
        : null;

    return _PanelCard(
      title: 'Tournament Details',
      child: Wrap(spacing: 0, runSpacing: 0, children: [
        _DetailItem('Organizer',  t['creatorName'] as String? ?? t['creatorId'] as String? ?? 'System'),
        _DetailItem('Type',       (t['format'] as String? ?? 'standard').replaceAll('_', ' ')),
        if (createdAt != null) _DetailItem('Created', '${createdAt.day.toString().padLeft(2, '0')}/${createdAt.month.toString().padLeft(2, '0')}/${createdAt.year} ${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}'),
        _DetailItem('Start Plan', launchStr),
        _DetailItem('Board',      t['boardId'] as String? ?? 'Random'),
        _DetailItem('Rating',     '${t['ratingMin'] ?? 0} – ${t['ratingMax'] ?? 5000}'),
        if (tc != null) _DetailItem('Time Control', '${tc['minutes']}+${tc['increment']}'),
      ]),
    );
  }

  Widget _buildStandings(Map<String,dynamic> t, dynamic auth) {
    final standings  = t['standings'] as List<dynamic>? ?? [];
    final isCompleted = t['status'] == 'completed';
    final isSwiss     = t['format'] == 'swiss';

    return _PanelCard(
      title: 'Standings',
      child: standings.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(16),
              child: Text('No standings yet.',
                style: GoogleFonts.outfit(color: Colors.white38, fontSize: 13),
                textAlign: TextAlign.center))
          : Table(
              columnWidths: const {
                0: FixedColumnWidth(36),
                1: FlexColumnWidth(3),
                2: FixedColumnWidth(40),
                3: FixedColumnWidth(30),
                4: FixedColumnWidth(30),
                5: FixedColumnWidth(30),
              },
              children: [
                TableRow(
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
                  children: [
                    _TH('#'), _TH('Player'), _TH('Pts'),
                    _TH('W'), _TH('D'), _TH('L'),
                    if (isSwiss) _TH('TB'),
                  ].map((w) => Padding(padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4), child: w)).toList(),
                ),
                ...standings.asMap().entries.map((e) {
                  final i  = e.key;
                  final s  = Map<String,dynamic>.from(e.value as Map);
                  final isMe = auth != null && s['user_id'] == auth.id;
                  String rankStr;
                  if (isCompleted && i == 0) rankStr = '🥇';
                  else if (isCompleted && i == 1) rankStr = '🥈';
                  else if (isCompleted && i == 2) rankStr = '🥉';
                  else rankStr = '${s['rank'] ?? i+1}';
                  return TableRow(
                    decoration: BoxDecoration(
                      color: isMe ? DTheme.primary.withValues(alpha: 0.08) : null,
                    ),
                    children: [
                      _TD(rankStr),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                        child: Row(children: [
                          Expanded(child: Text(
                            s['username'] as String? ?? s['user_id'] as String? ?? '?',
                            style: GoogleFonts.outfit(
                              fontSize: 13, color: isMe ? DTheme.primary : Colors.white70,
                              fontWeight: isMe ? FontWeight.w700 : FontWeight.w400),
                            overflow: TextOverflow.ellipsis)),
                          if (s['eliminated'] == true)
                            const Text(' ✗', style: TextStyle(color: Colors.red, fontSize: 11)),
                        ])),
                      _TD('${s['score'] ?? 0}'),
                      _TD('${s['wins']   ?? 0}'),
                      _TD('${s['draws']  ?? 0}'),
                      _TD('${s['losses'] ?? 0}'),
                      if (isSwiss) _TD('${((s['tiebreak'] as num?) ?? 0.0).toStringAsFixed(1)}'),
                    ].take(isSwiss ? 7 : 6).toList(),
                  );
                }),
              ],
            ),
    );
  }

  // ── Right: Games or Bracket ────────────────────────────────────────────────

  Widget _buildRight(Map<String,dynamic> t, dynamic auth) {
    final format     = t['format'] as String? ?? '';
    final isKnockout = format == 'knockout';
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: _PanelCard(
        title: isKnockout ? 'Bracket' : 'Games',
        child: isKnockout
            ? _buildBracket(t, auth)
            : _buildGameList(t, auth),
      ),
    );
  }

  Widget _buildBracket(Map<String,dynamic> t, dynamic auth) {
    final bracket = t['bracket'] as List<dynamic>? ?? [];
    if (bracket.isEmpty) return Padding(
      padding: const EdgeInsets.all(16),
      child: Text('No bracket yet.', style: GoogleFonts.outfit(color: Colors.white38)));
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(crossAxisAlignment: CrossAxisAlignment.start,
        children: bracket.map((round) {
          final r = Map<String,dynamic>.from(round as Map);
          final matches = (r['matches'] as List<dynamic>?) ?? [];
          return Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Column(children: [
              Text('R${r['round']}', style: GoogleFonts.outfit(
                color: Colors.white54, fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...matches.map((m) {
                final match  = Map<String,dynamic>.from(m as Map);
                final white  = match['white'] != null ? Map<String,dynamic>.from(match['white'] as Map) : null;
                final black  = match['black'] != null ? Map<String,dynamic>.from(match['black'] as Map) : null;
                final result = match['result'] as String?;
                final hash   = match['gameHash'] as String?;
                final wId    = white?['user_id'] as String?;
                final bId    = black?['user_id'] as String?;
                final isMe   = auth != null && (wId == auth.id || bId == auth.id);
                return Container(
                  width: 160, margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.white.withValues(alpha: result != null ? 0.04 : 0.08),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.12))),
                  child: Column(children: [
                    _BracketPlayer(white?['username'] as String? ?? '?', result == 'white'),
                    Divider(height: 1, color: Colors.white.withValues(alpha: 0.08)),
                    _BracketPlayer(black?['username'] as String? ?? '?', result == 'black'),
                    if (hash != null && result == null)
                      GestureDetector(
                        onTap: () => context.go('/games/$hash'),
                        child: Container(
                          margin: const EdgeInsets.all(4),
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(6),
                            color: DTheme.primary.withValues(alpha: 0.2)),
                          child: Center(child: Text(
                            isMe ? '▶ Continue' : 'Watch',
                            style: GoogleFonts.outfit(color: DTheme.primary, fontSize: 11))),
                        ),
                      ),
                  ]));
              }),
            ]),
          );
        }).toList()),
    );
  }

  Widget _buildGameList(Map<String,dynamic> t, dynamic auth) {
    final standings = t['standings'] as List<dynamic>? ?? [];
    final games = ((t['games'] as List<dynamic>?) ?? []).reversed.toList();
    final isOpen = t['status'] == 'open';
    if (games.isEmpty) return Padding(
      padding: const EdgeInsets.all(16),
      child: Text(
        isOpen ? 'Waiting for the tournament to start…' : 'No games yet.',
        style: GoogleFonts.outfit(color: Colors.white38),
        textAlign: TextAlign.center));
    return Column(children: games.map((g) {
      final game  = Map<String,dynamic>.from(g as Map);
      final wId   = game['white_id'] as String?;
      final bId   = game['black_id'] as String?;
      final wName = (standings.firstWhere(
        (s) => Map<String,dynamic>.from(s as Map)['user_id'] == wId,
        orElse: () => <String,dynamic>{'username': wId}
      ) as Map)['username'] as String? ?? wId ?? '?';
      final bName = (standings.firstWhere(
        (s) => Map<String,dynamic>.from(s as Map)['user_id'] == bId,
        orElse: () => <String,dynamic>{'username': bId}
      ) as Map)['username'] as String? ?? bId ?? '?';
      final result = game['result'] as String?;
      final hash   = game['game_hash'] as String?;
      final isMe   = auth != null && (wId == auth.id || bId == auth.id);
      final isLive = result == null;
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          color: Colors.white.withValues(alpha: isLive ? 0.08 : 0.04),
          border: Border.all(
            color: isLive ? DTheme.primary.withValues(alpha: 0.3)
                : Colors.white.withValues(alpha: 0.08))),
        child: Row(children: [
          SizedBox(width: 30, child: Text('R${game['round'] ?? '?'}',
            style: GoogleFonts.outfit(fontSize: 11, color: Colors.white38))),
          Expanded(child: Text(wName,
            style: GoogleFonts.outfit(fontSize: 13,
              fontWeight: result == 'white' ? FontWeight.w700 : FontWeight.w400,
              color: result == 'white' ? DTheme.primary : Colors.white70),
            overflow: TextOverflow.ellipsis, textAlign: TextAlign.right)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(result != null ? '${game['white_score']}–${game['black_score']}' : 'vs',
              style: GoogleFonts.outfit(fontSize: 13, color: Colors.white54))),
          Expanded(child: Text(bName,
            style: GoogleFonts.outfit(fontSize: 13,
              fontWeight: result == 'black' ? FontWeight.w700 : FontWeight.w400,
              color: result == 'black' ? DTheme.primary : Colors.white70),
            overflow: TextOverflow.ellipsis)),
          if (hash != null && result == null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => context.go('/games/$hash'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  color: DTheme.primary.withValues(alpha: 0.2),
                  border: Border.all(color: DTheme.primary.withValues(alpha: 0.4))),
                child: Text(isMe ? '▶' : '👁', style: const TextStyle(fontSize: 12)))),
          ],
        ]),
      );
    }).toList());
  }

  // ── Footer ─────────────────────────────────────────────────────────────────

  Widget _buildFooter(Map<String,dynamic> t, dynamic auth) {
    final standings   = t['standings'] as List<dynamic>? ?? [];
    final games       = t['games']     as List<dynamic>? ?? [];
    final isCompleted = t['status'] == 'completed';
    final isOpen      = t['status'] == 'open';
    final isParticipant = auth != null &&
        standings.any((s) => (s as Map)['user_id'] == auth.id);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
        color: Colors.white.withValues(alpha: 0.03),
      ),
      child: Row(children: [
        if (isParticipant && isOpen) ...[
          if (_showQuitConfirm)
            Row(children: [
              Text('Are you sure? ', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13)),
              _FooterBtn(label: 'Yes, quit', danger: true, onTap: _quit),
              const SizedBox(width: 8),
              _FooterBtn(label: 'Cancel', onTap: () => setState(() => _showQuitConfirm = false)),
            ])
          else
            _FooterBtn(label: '🔴 Quit Tournament', danger: true,
              onTap: () => setState(() => _showQuitConfirm = true)),
          const SizedBox(width: 16),
        ],
        if (isCompleted || games.isNotEmpty)
          _FooterBtn(
            label: _isDownloading ? 'Preparing…' : '📥 Download Games',
            onTap: _isDownloading ? null : _download),
        const Spacer(),
        Text('ID: ', style: GoogleFonts.outfit(color: Colors.white38, fontSize: 11)),
        Text(widget.tournamentId, style: const TextStyle(
          color: Color(0xFF46B0D4), fontSize: 11, fontFamily: 'monospace')),
      ]),
    );
  }
}

// ── Shared sub-widgets ────────────────────────────────────────────────────────

class _PanelCard extends StatelessWidget {
  final String title; final Widget child;
  const _PanelCard({required this.title, required this.child});
  @override Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      color: Colors.white.withValues(alpha: 0.05),
      border: Border.all(color: Colors.white.withValues(alpha: 0.09))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Text(title, style: GoogleFonts.outfit(
          fontSize: 14, fontWeight: FontWeight.w700, color: DTheme.textMainDark))),
      const Divider(height: 1, color: Color(0x14FFFFFF)),
      child,
    ]),
  );
}

class _DetailItem extends StatelessWidget {
  final String label, value;
  const _DetailItem(this.label, this.value);
  @override Widget build(BuildContext context) => SizedBox(
    width: 200,
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: GoogleFonts.outfit(fontSize: 11, color: Colors.white38, letterSpacing: 0.5)),
        const SizedBox(height: 3),
        Text(value, style: GoogleFonts.outfit(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600)),
      ])),
  );
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge(this.status);
  @override Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'open'      => ('⏳ Open',      const Color(0xFFF59E0B)),
      'active'    => ('🔴 Live',      const Color(0xFFEF4444)),
      'completed' => ('✅ Completed', const Color(0xFF22C55E)),
      _           => (status,         Colors.white54),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: color.withValues(alpha: 0.15),
        border: Border.all(color: color.withValues(alpha: 0.4))),
      child: Text(label, style: GoogleFonts.outfit(color: color, fontSize: 12, fontWeight: FontWeight.w600)));
  }
}

class _MetaChip extends StatelessWidget {
  final String label;
  const _MetaChip(this.label);
  @override Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(8),
      color: Colors.white.withValues(alpha: 0.08)),
    child: Text(label, style: GoogleFonts.outfit(color: Colors.white60, fontSize: 12)));
}

class _TH extends StatelessWidget {
  final String t;
  const _TH(this.t);
  @override Widget build(BuildContext context) => Text(t,
    style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white38));
}

class _TD extends StatelessWidget {
  final String t;
  const _TD(this.t);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
    child: Text(t, style: GoogleFonts.outfit(fontSize: 12, color: Colors.white70)));
}

class _BracketPlayer extends StatelessWidget {
  final String name; final bool isWinner;
  const _BracketPlayer(this.name, this.isWinner);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
    child: Text(name, style: GoogleFonts.outfit(
      fontSize: 13, fontWeight: isWinner ? FontWeight.w700 : FontWeight.w400,
      color: isWinner ? DTheme.primary : Colors.white70),
      overflow: TextOverflow.ellipsis));
}

class _FooterBtn extends StatelessWidget {
  final String label; final VoidCallback? onTap; final bool danger;
  const _FooterBtn({required this.label, required this.onTap, this.danger = false});
  @override Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: danger ? DTheme.danger.withValues(alpha: 0.15)
            : Colors.white.withValues(alpha: 0.07),
        border: Border.all(
          color: danger ? DTheme.danger.withValues(alpha: 0.4)
              : Colors.white.withValues(alpha: 0.15))),
      child: Text(label, style: GoogleFonts.outfit(
        color: danger ? DTheme.danger : Colors.white70,
        fontSize: 13, fontWeight: FontWeight.w600))));
}
