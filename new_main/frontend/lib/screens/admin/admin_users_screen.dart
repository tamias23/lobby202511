import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_service.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';
import '../profile/game_history_screen.dart';
import '../analysis/analysis_screen.dart';

// ── Admin Users Screen ─────────────────────────────────────────────────────────
// Lets admins search any user/bot by username prefix and open their profile.

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});
  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final _api       = ApiService.instance;
  final _search    = TextEditingController();
  List<dynamic>    _users   = [];
  bool             _loading = false;
  String?          _error;

  @override
  void initState() {
    super.initState();
    _fetch('');
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _fetch(String q) async {
    setState(() { _loading = true; _error = null; });
    try {
      final users = await _api.getAdminUsers(query: q);
      setState(() { _users = users; _loading = false; });
    } catch (e) {
      setState(() { _error = 'Failed to load users.'; _loading = false; });
    }
  }

  void _openProfile(Map<String, dynamic> user) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => AdminUserProfileView(user: user),
    ));
  }

  Color _roleColor(String? role) => switch (role) {
    'admin' => Colors.amber,
    'bot'   => Colors.tealAccent,
    'guest' => Colors.grey,
    _       => DTheme.success,
  };

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
        ),
        title: Text('User Management',
            style: GoogleFonts.outfit(
                color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _search,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search by username…',
                hintStyle: const TextStyle(color: Colors.white38),
                prefixIcon: const Icon(Icons.search, color: Colors.white38),
                suffixIcon: _search.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.white38),
                        onPressed: () {
                          _search.clear();
                          _fetch('');
                        })
                    : null,
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.07),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (v) => _fetch(v),
            ),
          ),

          const SizedBox(height: 8),

          // Results
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: DTheme.accent))
                : _error != null
                    ? Center(child: Text(_error!, style: DTheme.bodyMuted))
                    : _users.isEmpty
                        ? Center(child: Text('No users found.', style: DTheme.bodyMuted))
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            itemCount: _users.length,
                            itemBuilder: (_, i) {
                              final u = _users[i] as Map<String, dynamic>;
                              final role = u['role'] as String? ?? 'registered';
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: GlassPanel(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 10, horizontal: 14),
                                  borderRadius: 10,
                                  child: InkWell(
                                    onTap: () => _openProfile(u),
                                    borderRadius: BorderRadius.circular(10),
                                    child: Row(
                                      children: [
                                        // Avatar / role icon
                                        Container(
                                          width: 40,
                                          height: 40,
                                          decoration: BoxDecoration(
                                            color: _roleColor(role)
                                                .withValues(alpha: 0.15),
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                          child: Icon(
                                            role == 'bot'
                                                ? Icons.smart_toy
                                                : Icons.account_circle,
                                            color: _roleColor(role),
                                            size: 22,
                                          ),
                                        ),
                                        const SizedBox(width: 12),

                                        // Username + email
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                u['username'] ?? '?',
                                                style: GoogleFonts.outfit(
                                                    fontSize: 15,
                                                    fontWeight:
                                                        FontWeight.w600,
                                                    color: DTheme.textMainDark),
                                              ),
                                              if (role != 'bot' &&
                                                  u['email'] != null)
                                                Text(
                                                  u['email'],
                                                  style: GoogleFonts.outfit(
                                                      fontSize: 11,
                                                      color: Colors.white38),
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                            ],
                                          ),
                                        ),

                                        // Role badge + rating
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.end,
                                          children: [
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 8,
                                                      vertical: 3),
                                              decoration: BoxDecoration(
                                                color: _roleColor(role)
                                                    .withValues(alpha: 0.18),
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                role.toUpperCase(),
                                                style: GoogleFonts.outfit(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: _roleColor(role)),
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '★ ${u['rating'] ?? 1500}',
                                              style: GoogleFonts.outfit(
                                                  fontSize: 12,
                                                  color: DTheme.accent),
                                            ),
                                          ],
                                        ),

                                        const SizedBox(width: 8),
                                        const Icon(Icons.chevron_right,
                                            color: Colors.white24, size: 20),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

// ── Admin User Profile View ────────────────────────────────────────────────────
// Shows the same info as the user's own profile screen, read-only.

class AdminUserProfileView extends StatefulWidget {
  final Map<String, dynamic> user;
  const AdminUserProfileView({super.key, required this.user});
  @override
  State<AdminUserProfileView> createState() => _AdminUserProfileViewState();
}

class _AdminUserProfileViewState extends State<AdminUserProfileView> {
  bool _showGames = false;

  @override
  Widget build(BuildContext context) {
    final u    = widget.user;
    final role = u['role'] as String? ?? 'registered';
    final isBot = role == 'bot';

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: DTheme.textMainDark),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(u['username'] ?? '?',
            style: GoogleFonts.outfit(
                color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
      ),
      body: _showGames
          ? _GamesPanel(
              userId: u['id'],
              username: u['username'] ?? '?',
              onBack: () => setState(() => _showGames = false),
            )
          : _buildProfile(u, role, isBot),
    );
  }

  Widget _buildProfile(Map<String, dynamic> u, String role, bool isBot) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: GlassPanel(
            padding: const EdgeInsets.all(32),
            borderRadius: 20,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isBot ? Icons.smart_toy : Icons.account_circle,
                  size: 72,
                  color: isBot ? Colors.tealAccent : DTheme.accent,
                ),
                const SizedBox(height: 12),
                Text(u['username'] ?? '?',
                    style: GoogleFonts.outfit(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: DTheme.textMainDark)),

                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(role.toUpperCase(),
                      style: GoogleFonts.outfit(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Colors.white54)),
                ),

                if (!isBot && u['email'] != null) ...[
                  const SizedBox(height: 8),
                  Text(u['email'],
                      style: GoogleFonts.outfit(
                          fontSize: 13, color: Colors.white38)),
                ],

                const SizedBox(height: 24),

                // Category ratings
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _stat('Bullet',    '${u['rating_bullet']    ?? 1500}'),
                          _stat('Blitz',     '${u['rating_blitz']     ?? 1500}'),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _stat('Rapid',     '${u['rating_rapid']     ?? 1500}'),
                          _stat('Classical', '${u['rating_classical'] ?? 1500}'),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Stats
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _stat('Last Rating', '${u['rating'] ?? 1500}', large: true),
                    if (!isBot) ...[
                      _stat('Rated Today', '${u['rated_games_played_today'] ?? 0}', large: true),
                      _stat('Bots Today',  '${u['bot_games_played_today']   ?? 0}', large: true),
                    ],
                  ],
                ),

                const SizedBox(height: 12),

                if (u['created_at_utc'] != null)
                  Text('Member since: ${(u['created_at_utc'] as String).substring(0, 10)}',
                      style: GoogleFonts.outfit(
                          fontSize: 12, color: Colors.white38)),

                if (u['is_subscriber'] == true) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 18),
                        const SizedBox(width: 8),
                        Text('Active Subscriber',
                            style: GoogleFonts.outfit(
                                color: Colors.amber,
                                fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 28),

                // View games button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DTheme.accent.withValues(alpha: 0.15),
                      foregroundColor: DTheme.accent,
                      side: BorderSide(color: DTheme.accent.withValues(alpha: 0.5)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.history),
                    label: const Text('View Games'),
                    onPressed: () => setState(() => _showGames = true),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, String value, {bool large = false}) => Column(
    children: [
      Text(value,
          style: GoogleFonts.outfit(
              fontSize: large ? 22 : 18,
              fontWeight: FontWeight.bold,
              color: large ? DTheme.textMainDark : DTheme.accent)),
      const SizedBox(height: 3),
      Text(label,
          style: GoogleFonts.outfit(
              fontSize: large ? 13 : 11, color: DTheme.textMutedDark)),
    ],
  );
}

// ── Games panel embedded in admin profile ─────────────────────────────────────

class _GamesPanel extends StatefulWidget {
  final String userId;
  final String username;
  final VoidCallback onBack;
  const _GamesPanel(
      {required this.userId, required this.username, required this.onBack});
  @override
  State<_GamesPanel> createState() => _GamesPanelState();
}

class _GamesPanelState extends State<_GamesPanel> {
  final _api = ApiService.instance;
  List<dynamic> _games   = [];
  bool          _loading = true;
  String?       _error;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final games = await _api.getAdminUserGames(widget.userId);
      setState(() { _games = games; _loading = false; });
    } catch (e) {
      setState(() { _error = 'Failed to load games.'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Back bar
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 4),
          child: Row(
            children: [
              TextButton.icon(
                icon: const Icon(Icons.arrow_back, size: 16),
                label: Text('Back to ${widget.username}'),
                style: TextButton.styleFrom(foregroundColor: Colors.white54),
                onPressed: widget.onBack,
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Colors.white12),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: DTheme.accent))
              : _error != null
                  ? Center(child: Text(_error!, style: DTheme.bodyMuted))
                  : _games.isEmpty
                      ? Center(
                          child: Text('No games found.',
                              style: DTheme.bodyMuted))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _games.length,
                          itemBuilder: (_, i) => _GameCard(
                              game: _games[i] as Map<String, dynamic>,
                              username: widget.username),
                        ),
        ),
      ],
    );
  }
}

// ── Reused from GameHistoryScreen ─────────────────────────────────────────────

class _GameCard extends StatelessWidget {
  final Map<String, dynamic> game;
  final String username;
  const _GameCard({required this.game, required this.username});

  Color _resultColor(String? r) => switch (r) {
    'Win'  => DTheme.success,
    'Loss' => Colors.redAccent,
    _      => Colors.amber,
  };

  IconData _resultIcon(String? r) => switch (r) {
    'Win'  => Icons.emoji_events,
    'Loss' => Icons.close,
    _      => Icons.handshake,
  };

  Color _catColor(String? c) => switch (c?.toLowerCase()) {
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

  @override
  Widget build(BuildContext context) {
    final result   = game['result'] as String?;
    final category = game['category'] as String?;
    final tc       = game['time_control'] as String? ?? '?+?';
    final opponent = game['opponent'] as String? ?? '?';
    final color    = game['my_color'] as String? ?? '?';
    final hasT     = (game['tournament_id'] as String?)?.isNotEmpty == true;
    final dateStr  = _fmt(game['timestamp'], game['timestamp_utc']);
    final hasReplay = (game['moves'] as String?)?.isNotEmpty == true;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GlassPanel(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        borderRadius: 10,
        child: Row(
          children: [
            // Result badge
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _resultColor(result).withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: _resultColor(result).withValues(alpha: 0.4)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(_resultIcon(result), size: 16, color: _resultColor(result)),
                  Text(result ?? '?',
                      style: GoogleFonts.outfit(
                          fontSize: 9, fontWeight: FontWeight.bold,
                          color: _resultColor(result))),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(
                      color == 'white' ? Icons.circle : Icons.circle_outlined,
                      size: 9,
                      color: color == 'white' ? Colors.white : Colors.grey[400],
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text('vs $opponent',
                          style: GoogleFonts.outfit(
                              fontSize: 14, fontWeight: FontWeight.w600,
                              color: DTheme.textMainDark),
                          overflow: TextOverflow.ellipsis),
                    ),
                  ]),
                  const SizedBox(height: 4),
                  Wrap(spacing: 5, runSpacing: 3, children: [
                    _chip(tc, Colors.white24),
                    _chip(category ?? '?',
                        _catColor(category).withValues(alpha: 0.25),
                        textColor: _catColor(category)),
                    if (hasT)
                      _chip('Tournament',
                          Colors.purple.withValues(alpha: 0.25),
                          textColor: Colors.purpleAccent),
                  ]),
                  const SizedBox(height: 3),
                  Text(dateStr,
                      style: GoogleFonts.outfit(
                          fontSize: 10, color: Colors.white38)),
                ],
              ),
            ),
            if (hasReplay)
              Tooltip(
                message: 'Open Analysis',
                child: InkWell(
                  onTap: () {
                    final whiteName = game['white_name'] as String? ??
                        (game['my_color'] == 'white' ? username : opponent);
                    final blackName = game['black_name'] as String? ??
                        (game['my_color'] == 'black' ? username : opponent);
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => AnalysisScreen(initialRecord: {
                        'board_id':   game['board_id'],
                        'moves':      game['moves'] is String
                            ? (jsonDecode(game['moves'] as String) as List? ?? [])
                            : (game['moves'] as List? ?? []),
                        'white_name': whiteName,
                        'black_name': blackName,
                        'game_id':    game['game_id'],
                      }),
                    ));
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: DTheme.primary.withValues(alpha: 0.13),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: DTheme.primary.withValues(alpha: 0.35)),
                    ),
                    child: Column(children: [
                      Icon(Icons.analytics_outlined,
                          size: 16, color: DTheme.primary),
                      const SizedBox(height: 2),
                      Text('Analyse',
                          style: GoogleFonts.outfit(
                              fontSize: 9, color: DTheme.primary,
                              fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label, Color bg, {Color? textColor}) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(5)),
    child: Text(label,
        style: GoogleFonts.outfit(
            fontSize: 10, fontWeight: FontWeight.w600,
            color: textColor ?? Colors.white70)),
  );
}
