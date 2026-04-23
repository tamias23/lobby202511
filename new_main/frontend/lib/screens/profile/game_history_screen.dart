import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_service.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';

class GameHistoryScreen extends StatefulWidget {
  const GameHistoryScreen({super.key});

  @override
  State<GameHistoryScreen> createState() => _GameHistoryScreenState();
}

class _GameHistoryScreenState extends State<GameHistoryScreen> {
  final _api = ApiService.instance;
  List<dynamic> _games = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final games = await _api.getMyGames();
      setState(() { _games = games; _loading = false; });
    } catch (e) {
      setState(() { _error = 'Failed to load game history.'; _loading = false; });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  Color _resultColor(String? result) => switch (result) {
    'Win'  => DTheme.success,
    'Loss' => Colors.redAccent,
    _      => Colors.amber,
  };

  IconData _resultIcon(String? result) => switch (result) {
    'Win'  => Icons.emoji_events,
    'Loss' => Icons.close,
    _      => Icons.handshake,
  };

  Color _categoryColor(String? cat) => switch (cat?.toLowerCase()) {
    'bullet'    => Colors.redAccent,
    'blitz'     => Colors.orange,
    'rapid'     => Colors.lightBlue,
    'classical' => Colors.teal,
    _           => Colors.grey,
  };

  String _fmt(dynamic ts, dynamic tsUtc) {
    if (tsUtc is String && tsUtc.isNotEmpty) return tsUtc.substring(0, 16);
    if (ts is num) {
      final dt = DateTime.fromMillisecondsSinceEpoch(ts.toInt(), isUtc: true);
      return '${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')} '
             '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
    }
    return '—';
  }

  // ── Navigation to analysis ─────────────────────────────────────────────────

  void _openAnalysis(Map<String, dynamic> g) {
    context.push('/analysis', extra: {
      'moves':       g['moves'],
      'white_name':  g['my_color'] == 'white' ? 'Me' : g['opponent'],
      'black_name':  g['my_color'] == 'black' ? 'Me' : g['opponent'],
      'game_id':     g['game_id'],
    });
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: DTheme.textMainDark),
          onPressed: () => context.pop(),
          tooltip: 'Back to Profile',
        ),
        title: Text('My Games',
            style: GoogleFonts.outfit(
                color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: DTheme.textMainDark),
            onPressed: _fetch,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: DTheme.accent));
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 56, color: DTheme.danger),
            const SizedBox(height: 12),
            Text(_error!, style: DTheme.bodyMuted),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetch,
              style: ElevatedButton.styleFrom(backgroundColor: DTheme.primary),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_games.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.sports_esports, size: 64, color: Colors.white.withValues(alpha: 0.15)),
            const SizedBox(height: 16),
            Text('No games yet.', style: DTheme.bodyMuted),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _games.length,
      itemBuilder: (context, i) => _buildGameCard(_games[i] as Map<String, dynamic>),
    );
  }

  Widget _buildGameCard(Map<String, dynamic> g) {
    final result   = g['result'] as String?;
    final category = g['category'] as String?;
    final tc       = g['time_control'] as String? ?? '?+?';
    final opponent = g['opponent'] as String? ?? '?';
    final color    = g['my_color'] as String? ?? '?';
    final hasTournament = (g['tournament_id'] as String?)?.isNotEmpty == true;
    final dateStr  = _fmt(g['timestamp'], g['timestamp_utc']);
    final hasReplay = (g['moves'] as String?)?.isNotEmpty == true;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassPanel(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        borderRadius: 12,
        child: Row(
          children: [
            // Result badge
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _resultColor(result).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _resultColor(result).withValues(alpha: 0.4)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(_resultIcon(result), size: 18, color: _resultColor(result)),
                  Text(result ?? '?',
                      style: GoogleFonts.outfit(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: _resultColor(result))),
                ],
              ),
            ),

            const SizedBox(width: 12),

            // Main info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Opponent + color
                  Row(
                    children: [
                      Icon(
                        color == 'white' ? Icons.circle : Icons.circle_outlined,
                        size: 10,
                        color: color == 'white' ? Colors.white : Colors.grey[400],
                      ),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(
                          'vs $opponent',
                          style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: DTheme.textMainDark),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 5),

                  // Time control chip + category chip + tournament badge
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _chip(tc, Colors.white24),
                      _chip(
                        category ?? '?',
                        _categoryColor(category).withValues(alpha: 0.25),
                        textColor: _categoryColor(category),
                      ),
                      if (hasTournament)
                        _chip('Tournament', Colors.purple.withValues(alpha: 0.25),
                            textColor: Colors.purpleAccent),
                    ],
                  ),

                  const SizedBox(height: 4),

                  Text(dateStr,
                      style: GoogleFonts.outfit(
                          fontSize: 11, color: Colors.white38)),
                ],
              ),
            ),

            // Analyse button
            if (hasReplay)
              Tooltip(
                message: 'Open Analysis',
                child: InkWell(
                  onTap: () => _openAnalysis(g),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: DTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: DTheme.primary.withValues(alpha: 0.4)),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.analytics_outlined, size: 18, color: DTheme.primary),
                        const SizedBox(height: 2),
                        Text('Analyse',
                            style: GoogleFonts.outfit(
                                fontSize: 10,
                                color: DTheme.primary,
                                fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, Color bg, {Color? textColor}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
    child: Text(label,
        style: GoogleFonts.outfit(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: textColor ?? Colors.white70)),
  );
}
