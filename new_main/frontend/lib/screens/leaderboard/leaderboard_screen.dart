import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_service.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';

// Column width constants
const double _colRank     = 44;
const double _colUsername = 160;
const double _colRating   = 72;
const double _colTotal    = _colRank + _colUsername + _colRating;
const double _colPad      = 20; // horizontal padding between categories

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _api = ApiService.instance;
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  final _horizScroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchLeaderboard();
  }

  @override
  void dispose() {
    _horizScroll.dispose();
    super.dispose();
  }

  Future<void> _fetchLeaderboard() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.getLeaderboard();
      if (data.containsKey('error')) {
        setState(() { _error = data['error']; _loading = false; });
      } else {
        setState(() { _data = data; _loading = false; });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load leaderboard. Please try again later.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: DTheme.textMainDark),
          onPressed: () => context.go('/'),
        ),
        title: Text('Leaderboard',
            style: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: DTheme.textMainDark),
            onPressed: _fetchLeaderboard,
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
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 64, color: DTheme.danger),
              const SizedBox(height: 16),
              Text(_error!, style: DTheme.bodyMuted, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _fetchLeaderboard,
                style: ElevatedButton.styleFrom(backgroundColor: DTheme.primary),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_data == null || _data!.isEmpty) {
      return Center(child: Text('No data available.', style: DTheme.bodyMuted));
    }

    const categories = ['bullet', 'blitz', 'rapid', 'classical'];
    const labels = {
      'bullet':    'Bullet',
      'blitz':     'Blitz',
      'rapid':     'Rapid',
      'classical': 'Classical',
    };

    // Build the player lists for all categories once
    final allPlayers = {
      for (final cat in categories)
        cat: ((_data![cat]?['players']) as List? ?? [])
    };

    return Column(
      children: [
        // ── Sticky column headers ────────────────────────────────────────────
        Scrollbar(
          controller: _horizScroll,
          thumbVisibility: true,
          child: SingleChildScrollView(
            controller: _horizScroll,
            scrollDirection: Axis.horizontal,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: categories.map((cat) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: _colPad / 2),
                    child: _CategoryHeader(label: labels[cat] ?? cat, width: _colTotal),
                  );
                }).toList(),
              ),
            ),
          ),
        ),

        // ── Column sub-headers (Rank / Player / Rating) ──────────────────────
        SingleChildScrollView(
          controller: _horizScroll,
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            child: Row(
              children: categories.map((_) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: _colPad / 2),
                  child: SizedBox(
                    width: _colTotal,
                    child: Row(
                      children: [
                        SizedBox(width: _colRank,
                            child: _subHdr('#', TextAlign.center)),
                        SizedBox(width: _colUsername,
                            child: _subHdr('Player', TextAlign.left)),
                        SizedBox(width: _colRating,
                            child: _subHdr('Rating', TextAlign.center)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),

        const SizedBox(height: 4),
        Divider(height: 1, color: Colors.white.withValues(alpha: 0.08)),

        // ── Scrollable body (vertical only, horizontal locked to header) ─────
        Expanded(
          child: SingleChildScrollView(
            // vertical scroll
            child: SingleChildScrollView(
              controller: _horizScroll,
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: categories.map((cat) {
                    final players = allPlayers[cat]!;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: _colPad / 2),
                      child: SizedBox(
                        width: _colTotal,
                        child: Column(
                          children: List.generate(50, (i) {
                            if (i < players.length) {
                              final p = players[i];
                              return _PlayerRow(
                                rank: i + 1,
                                username: p['username']?.toString() ?? '?',
                                rating: (p['rating'] as num?)?.toInt() ?? 0,
                                isBot: p['is_bot'] == true,
                              );
                            } else {
                              return _EmptyRow(rank: i + 1);
                            }
                          }),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _subHdr(String text, TextAlign align) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
    child: Text(text,
        textAlign: align,
        style: GoogleFonts.outfit(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Colors.white38,
            letterSpacing: 1.2)),
  );
}

// ── Category header ───────────────────────────────────────────────────────────

class _CategoryHeader extends StatelessWidget {
  final String label;
  final double width;
  const _CategoryHeader({required this.label, required this.width});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [DTheme.primary.withValues(alpha: 0.8), DTheme.accent.withValues(alpha: 0.5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(color: DTheme.primary.withValues(alpha: 0.25), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Text(label,
          textAlign: TextAlign.center,
          style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
    );
  }
}

// ── Player row ────────────────────────────────────────────────────────────────

class _PlayerRow extends StatelessWidget {
  final int rank;
  final String username;
  final int rating;
  final bool isBot;
  const _PlayerRow({required this.rank, required this.username, required this.rating, this.isBot = false});

  @override
  Widget build(BuildContext context) {
    final bool isTop3 = rank <= 3;
    final Color rankColor = rank == 1
        ? Colors.amber
        : rank == 2
            ? Colors.grey[300]!
            : rank == 3
                ? Colors.orange[300]!
                : DTheme.textMutedDark;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: GlassPanel(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        borderRadius: 7,
        child: Row(
          children: [
            // Rank
            SizedBox(
              width: _colRank,
              child: Text('#$rank',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                      fontSize: 13,
                      fontWeight: isTop3 ? FontWeight.bold : FontWeight.normal,
                      color: rankColor)),
            ),
            // Username + optional bot badge
            SizedBox(
              width: _colUsername,
              child: Row(
                children: [
                  if (isBot)
                    const Padding(
                      padding: EdgeInsets.only(right: 4),
                      child: Icon(Icons.smart_toy, size: 13, color: Colors.tealAccent),
                    ),
                  Expanded(
                    child: Text(username,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                            fontSize: 13,
                            fontWeight: isTop3 ? FontWeight.bold : FontWeight.normal,
                            color: isBot ? Colors.tealAccent.withValues(alpha: 0.85) : DTheme.textMainDark)),
                  ),
                ],
              ),
            ),
            // Rating
            SizedBox(
              width: _colRating,
              child: Text(rating.toString(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: DTheme.accent)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Empty row ─────────────────────────────────────────────────────────────────

class _EmptyRow extends StatelessWidget {
  final int rank;
  const _EmptyRow({required this.rank});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.02),
          borderRadius: BorderRadius.circular(7),
          border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: _colRank,
              child: Text('#$rank',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                      fontSize: 13, color: DTheme.textMutedDark.withValues(alpha: 0.35))),
            ),
            SizedBox(
              width: _colUsername,
              child: Text('—',
                  style: GoogleFonts.outfit(
                      fontSize: 13, color: DTheme.textMutedDark.withValues(alpha: 0.25))),
            ),
            SizedBox(
              width: _colRating,
              child: Text('—',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                      fontSize: 13, color: DTheme.textMutedDark.withValues(alpha: 0.25))),
            ),
          ],
        ),
      ),
    );
  }
}
