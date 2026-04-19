import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/lobby_provider.dart';
import '../../providers/bg_provider.dart';
import '../../widgets/glass_panel.dart';

// ── Gradient constants (matching legacy) ─────────────────────────────────────
const _kBlue   = Color(0xFF46B0D4);
const _kOrange = Color(0xFFF27813);
const _kGrad   = LinearGradient(
  colors: [_kBlue, _kOrange],
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
);

// ── Time control definitions ─────────────────────────────────────────────────

class _TC {
  final String label;
  final String description;
  final int minutes;
  final int increment;
  final Color color;
  const _TC({required this.label, required this.description,
      required this.minutes, required this.increment, required this.color});
}

const _timeControls = [
  _TC(label: '10 + 5',  description: 'Blitz',  minutes: 10, increment: 5,  color: Color(0xFFF59E0B)),
  _TC(label: '10 + 10', description: 'Blitz',  minutes: 10, increment: 10, color: Color(0xFFFB923C)),
  _TC(label: '15 + 10', description: 'Rapid',  minutes: 15, increment: 10, color: Color(0xFF06B6D4)),
  _TC(label: '15 + 30', description: 'Rapid',  minutes: 15, increment: 30, color: Color(0xFFF27813)),
  _TC(label: '30 + 30', description: 'Medium', minutes: 30, increment: 30, color: Color(0xFF46B0D4)),
  _TC(label: '60 + 30', description: 'Long',   minutes: 60, increment: 30, color: Color(0xFFEC4899)),
];

// ── Lobby screen ─────────────────────────────────────────────────────────────

class LobbyScreen extends ConsumerStatefulWidget {
  const LobbyScreen({super.key});
  @override
  ConsumerState<LobbyScreen> createState() => _LobbyScreenState();
}

class _LobbyScreenState extends ConsumerState<LobbyScreen> {
  bool _showBotPanel  = false;
  bool _showCustomForm = false;
  int  _customMin = 15;
  int  _customInc = 10;
  int  _botMin    = 15;
  int  _botInc    = 10;

  final _socket = SocketService.instance;

  @override
  void initState() {
    super.initState();
    _socket.on('game_created', _onGameCreated);
  }

  @override
  void dispose() {
    _socket.off('game_created', _onGameCreated);
    super.dispose();
  }

  void _onGameCreated(dynamic data) {
    final d = data as Map<String, dynamic>;
    final hash = d['hash'] as String;
    if (!mounted) return;
    context.go('/games/$hash', extra: {
      'side': d['side'],
      'opponent': d['opponent'],
      'initialState': d['initialState'],
      'gameHash': hash,
      'tournamentId': d['tournamentId'],
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  void _onTimeControl(_TC tc) {
    final user = ref.read(authProvider).value;
    ref.read(lobbyProvider.notifier).createGameRequest(
      minutes: tc.minutes, increment: tc.increment,
      userId: user?.id, username: user?.username, role: user?.role ?? 'guest',
    );
  }

  void _onCustomSubmit() {
    final user = ref.read(authProvider).value;
    ref.read(lobbyProvider.notifier).createGameRequest(
      minutes: _customMin, increment: _customInc,
      userId: user?.id, username: user?.username, role: user?.role ?? 'guest',
    );
    setState(() => _showCustomForm = false);
  }

  void _onPlayBot(BotInfo bot) {
    final user = ref.read(authProvider).value;
    ref.read(lobbyProvider.notifier).createBotGame(
      userId: user?.id, username: user?.username, role: user?.role ?? 'guest',
      minutes: _botMin, increment: _botInc,
      agentType: bot.agentType, modelName: bot.modelName,
      budgetMs: bot.agentType == 'mcts' ? 500 : null,
    );
    setState(() => _showBotPanel = false);
  }

  String _formatUsername(String? name, String? role) {
    if (name == null) return '???';
    if (role == 'guest' && name.startsWith('guest_')) {
      return 'guest_${name.substring(6, name.length > 13 ? 13 : name.length)}';
    }
    return name;
  }

  String _formatTimeAgo(int ts) {
    final diff = (DateTime.now().millisecondsSinceEpoch - ts) ~/ 1000;
    if (diff < 60)   return '${diff}s ago';
    if (diff < 3600) return '${diff ~/ 60}m ago';
    return '${diff ~/ 3600}h ago';
  }

  String _formatTC(Map<String, dynamic> tc) => '${tc['minutes']}+${tc['increment']}';

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final lobby = ref.watch(lobbyProvider);
    final auth  = ref.watch(authProvider).value;
    final w     = MediaQuery.of(context).size.width;
    final wide  = w > 900;

    // Notification snackbar
    ref.listen(lobbyProvider.select((s) => s.notification), (_, notif) {
      if (notif != null && mounted) {
        final type = ref.read(lobbyProvider).notifType;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(notif),
          backgroundColor: type == 'error' ? DTheme.danger
              : type == 'success' ? DTheme.success : DTheme.primary,
          duration: const Duration(seconds: 3),
        ));
        ref.read(lobbyProvider.notifier).clearNotification();
      }
    });

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
          child: Stack(children: [
            // ── Scrollable content ──────────────────────────────────────────
            CustomScrollView(slivers: [
              // ── Title — first content, sits at the very top ──────────────
              SliverToBoxAdapter(child: _buildTitle(context, lobby)),
              // ── Main area: stats | TC grid | (right space) ───────────────
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(
                  child: wide
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(width: 140, child: _buildStatsPanel(lobby.stats)),
                            const SizedBox(width: 20),
                            Expanded(child: _buildTCSection(context, lobby, auth)),
                            const SizedBox(width: 140),
                          ],
                        )
                      : _buildTCSection(context, lobby, auth),
                ),
              ),
              // ── Bot / Custom panel ────────────────────────────────────────
              if (_showBotPanel || _showCustomForm)
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                  sliver: SliverToBoxAdapter(
                    child: Center(
                      child: SizedBox(
                        width: MediaQuery.of(context).size.width * 0.5,
                        child: _showBotPanel ? _buildBotPanel(lobby) : _buildCustomForm(),
                      ),
                    ),
                  ),
                ),
              // ── Bottom panels (4 cols or 2×2 or stacked) ─────────────────
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                sliver: SliverToBoxAdapter(
                  child: _buildBottomPanels(context, lobby, auth, wide),
                ),
              ),
            ]),
            // ── Auth / nav bar floated at top (like legacy position:absolute) ─
            Positioned(
              top: 0, left: 0, right: 0,
              child: _buildTopBar(context, auth),
            ),
          ]),
        ),
    );
  }

  // ── Sub-builders ──────────────────────────────────────────────────────────

  Widget _buildTopBar(BuildContext context, AppUser? auth) {
    final bg = ref.watch(bgProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Auth / nav row
          Row(
            children: [
              _HeaderButton(label: 'Analysis', onTap: () => context.go('/analysis')),
              const SizedBox(width: 6),
              _HeaderButton(label: 'Tutorial', onTap: () => context.go('/tutorial')),
              const Spacer(),
              if (auth == null) ...[
                _HeaderButton(label: 'Login',    onTap: () => context.go('/login')),
                const SizedBox(width: 6),
                _HeaderButton(label: 'Register', onTap: () => context.go('/register')),
              ] else
                _UserBadge(auth: auth, onLogout: () => ref.read(authProvider.notifier).logout()),
            ],
          ),
          // Background toggle — icon only, right-aligned below auth row
          const SizedBox(height: 4),
          _BgToggle(bg: bg, onTap: () => ref.read(bgProvider.notifier).cycle()),
        ],
      ),
    );
  }

  Widget _buildTitle(BuildContext context, LobbyState lobby) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Center(
        child: Column(
          children: [
            // "welcome to ..." in muted small caps
            Text('WELCOME TO …',
              style: GoogleFonts.outfit(
                fontSize: 11, fontWeight: FontWeight.w700,
                color: DTheme.textMutedDark, letterSpacing: 3,
              ),
            ),
            const SizedBox(height: 2),
            // "DEDAL" with gradient text (ShaderMask)
            ShaderMask(
              shaderCallback: (bounds) => _kGrad.createShader(bounds),
              child: Text('DEDAL',
                style: GoogleFonts.outfit(
                  fontSize: 64, fontWeight: FontWeight.w900,
                  color: Colors.white, letterSpacing: -2, height: 1,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text('Choose a time control and jump into a game',
              style: GoogleFonts.outfit(
                fontSize: 14, color: DTheme.textMutedDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsPanel(LiveStats stats) {
    return GlassPanel(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
      borderRadius: 18,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 4),
          // Pulsing green dot
          Container(
            width: 8, height: 8,
            decoration: const BoxDecoration(
              color: DTheme.success, shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: Color(0x9922C55E), blurRadius: 8)],
            ),
          ),
          const SizedBox(height: 10),
          _StatLine('${stats.activeGames}', 'live games'),
          const SizedBox(height: 8),
          _StatLine('${stats.onlineUsers}', 'online'),
        ],
      ),
    );
  }

  Widget _buildTCSection(BuildContext context, LobbyState lobby, AppUser? auth) {
    final mq        = MediaQuery.of(context).size;
    const spacing   = 10.0;
    const nCols   = 3;
    const nRows   = 3;   // 6 preset + custom + vsBot + tourney = always 3 rows

    final gridW = mq.width  * 0.5;
    final gridH = mq.height * 0.5;

    // childAspectRatio that makes n_rows × n_cols fill exactly gridW × gridH
    final btnW      = (gridW - (nCols - 1) * spacing) / nCols;
    final btnH      = (gridH - (nRows - 1) * spacing) / nRows;
    final ratio     = btnH > 0 ? btnW / btnH : 2.0;
    // Label font = 35% of button height
    final labelSize = btnH * 0.35;

    return Column(
      children: [
        // TC grid — exactly 50 % screen width × 50 % screen height
        Center(
          child: SizedBox(
            width: gridW,
            height: gridH,
            child: GridView.count(
              crossAxisCount: nCols,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: spacing,
              crossAxisSpacing: spacing,
              childAspectRatio: ratio,
              children: [
                ..._timeControls.map((tc) {
                  final isActive = lobby.myRequestId != null &&
                      lobby.gameRequests.any((r) =>
                          r.requestId == lobby.myRequestId &&
                          r.timeControl['minutes'] == tc.minutes &&
                          r.timeControl['increment'] == tc.increment);
                  return _TCButton(
                    label: tc.label, description: tc.description,
                    color: tc.color, isActive: isActive, isWaiting: isActive,
                    fontSize: labelSize,
                    onTap: () => _onTimeControl(tc),
                  );
                }),
                _TCButton(
                  label: 'Custom',
                  description: _showCustomForm ? '✕ Close' : 'User Choice',
                  color: const Color(0xFFF27813),
                  isActive: _showCustomForm,
                  fontSize: labelSize,
                  onTap: () => setState(() {
                    _showCustomForm = !_showCustomForm;
                    if (_showCustomForm) _showBotPanel = false;
                  }),
                ),
                if (lobby.availableBots.isNotEmpty)
                  _TCButton(
                    label: 'vs Bot', description: 'Play AI',
                    color: const Color(0xFF8B5CF6), isActive: _showBotPanel,
                    fontSize: labelSize,
                    onTap: () => setState(() {
                      _showBotPanel = !_showBotPanel;
                      if (_showBotPanel) _showCustomForm = false;
                    }),
                  ),
                if (auth != null && lobby.tournamentsEnabled)
                  _TCButton(
                    label: 'Tourney', description: 'Create',
                    color: DTheme.success,
                    fontSize: labelSize,
                    onTap: () => context.go('/tournament/create'),
                  ),
              ],
            ),
          ),
        ),
        // Cancel my request
        if (lobby.myRequestId != null)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: _GradientButton(
              label: '✕ Cancel my request',
              onTap: () => ref.read(lobbyProvider.notifier).cancelGameRequest(),
              danger: true,
            ),
          ),
      ],
    );
  }


  Widget _buildBotPanel(LobbyState lobby) {
    final presets = [
      (label: '10+5', min: 10, inc: 5),
      (label: '15+10', min: 15, inc: 10),
      (label: '30+30', min: 30, inc: 30),
    ];
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: GlassPanel(
        padding: const EdgeInsets.all(18),
        borderRadius: 18,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Play vs AI',
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
            const SizedBox(height: 12),
            // Time control presets
            Row(children: presets.map((p) {
              final active = _botMin == p.min && _botInc == p.inc;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: _PillToggle(
                  label: p.label, active: active,
                  onTap: () => setState(() { _botMin = p.min; _botInc = p.inc; }),
                  activeColor: _kBlue,
                ),
              );
            }).toList()),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10, runSpacing: 10,
              children: lobby.availableBots.map((bot) => _BotCard(
                bot: bot,
                onTap: bot.busy ? null : () => _onPlayBot(bot),
              )).toList(),
            ),
            const SizedBox(height: 10),
            Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.warning_amber_rounded, size: 13, color: DTheme.textMutedDark),
              const SizedBox(width: 4),
              Text('First move may take a few seconds on cold start.',
                style: DTheme.bodyMuted.copyWith(fontSize: 11)),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomForm() {
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: GlassPanel(
        padding: const EdgeInsets.all(18),
        borderRadius: 18,
        child: Column(
          children: [
            Row(children: [
              Expanded(child: _LabeledNumberField(
                label: 'MIN', value: _customMin,
                onChange: (v) => setState(() => _customMin = v),
                min: 1, max: 120,
              )),
              const SizedBox(width: 12),
              Expanded(child: _LabeledNumberField(
                label: 'INC (s)', value: _customInc,
                onChange: (v) => setState(() => _customInc = v),
                min: 3, max: 120,
              )),
            ]),
            const SizedBox(height: 18),
            Row(children: [
              Expanded(child: _GradientButton(label: 'Post Request', onTap: _onCustomSubmit)),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomPanels(BuildContext context, LobbyState lobby, AppUser? auth, bool wide) {
    final panels = [
      _buildRequestsPanel(lobby, auth),
      _buildActiveGamesPanel(context, lobby, auth),
      _buildOpenTournamentsPanel(lobby, auth),
      _buildActiveTournamentsPanel(context, lobby),
    ];
    if (wide) {
      // 4-column grid
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: panels.map((p) => Expanded(
          child: Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: p),
        )).toList(),
      );
    }
    if (MediaQuery.of(context).size.width > 600) {
      // 2×2
      return Column(children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Padding(padding: const EdgeInsets.only(right: 6), child: panels[0])),
          Expanded(child: Padding(padding: const EdgeInsets.only(left: 6), child: panels[1])),
        ]),
        const SizedBox(height: 12),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Padding(padding: const EdgeInsets.only(right: 6), child: panels[2])),
          Expanded(child: Padding(padding: const EdgeInsets.only(left: 6), child: panels[3])),
        ]),
      ]);
    }
    return Column(children: [
      panels[0], const SizedBox(height: 12),
      panels[1], const SizedBox(height: 12),
      panels[2], const SizedBox(height: 12),
      panels[3],
    ]);
  }

  // ── List panels ────────────────────────────────────────────────────────────

  Widget _buildRequestsPanel(LobbyState lobby, AppUser? auth) {
    return _ListPanel(
      title: 'Open Requests',
      count: lobby.gameRequests.length,
      emptyLine1: 'No open requests yet.',
      emptyLine2: 'Be the first!',
      children: lobby.gameRequests.map((req) {
        final isMine = req.requestId == lobby.myRequestId;
        return _RequestCard(
          username: _formatUsername(req.username, req.role),
          tc: _formatTC(req.timeControl),
          timeAgo: _formatTimeAgo(req.createdAt),
          isMine: isMine,
          onAccept: isMine ? null : () => ref.read(lobbyProvider.notifier)
              .acceptGameRequest(req, userId: auth?.id, username: auth?.username, role: auth?.role ?? 'guest'),
        );
      }).toList(),
    );
  }

  Widget _buildActiveGamesPanel(BuildContext context, LobbyState lobby, AppUser? auth) {
    final sorted = [...lobby.activeGames]
      ..sort((a, b) => (b.hasDisconnect ? 1 : 0) - (a.hasDisconnect ? 1 : 0));
    return _ListPanel(
      title: 'Active Games',
      count: sorted.length,
      emptyLine1: 'No games in progress.',
      emptyLine2: 'Start one above!',
      accentColor: DTheme.success,
      children: sorted.map((game) {
        final isMe = auth != null && (game.white == auth.id || game.black == auth.id);
        return _ActiveGameCard(
          whiteName: _formatUsername(game.whiteName, game.whiteRole),
          blackName: _formatUsername(game.blackName, game.blackRole),
          tc: _formatTC(game.timeControl),
          moveCount: game.moveCount,
          hasDisconnect: game.hasDisconnect,
          isMe: isMe,
          onAction: () => context.go('/games/${game.hash}', extra: {
            'spectator': !isMe,
            'gameHash': game.hash,
            'tournamentId': game.tournamentId,
          }),
        );
      }).toList(),
    );
  }

  Widget _buildOpenTournamentsPanel(LobbyState lobby, AppUser? auth) {
    final formatLabel = {'swiss': '🏔️ Swiss', 'arena': '⚔️ Arena', 'knockout': '🥊 KO', 'round_robin': '🔄 RR'};
    return _ListPanel(
      title: 'Open Tournaments',
      count: lobby.openTournaments.length,
      emptyLine1: 'No open tournaments.',
      emptyLine2: 'Create one!',
      children: lobby.openTournaments.map((t) => _TournamentOpenCard(
        username: t.name ?? formatLabel[t.format] ?? t.format,
        tc: 'by ${t.creatorUsername ?? 'System'} · ${t.timeControl['minutes']}+${t.timeControl['increment']}',
        info: '${t.currentCount ?? 0}/${t.maxParticipants ?? '?'}${t.hasPassword ? ' 🔒' : ''}',
        onView: () => context.go('/tournament/${t.id}'),
        onJoin: auth == null ? null : () => ref.read(lobbyProvider.notifier).joinTournament(t.id),
      )).toList(),
    );
  }


  Widget _buildActiveTournamentsPanel(BuildContext context, LobbyState lobby) {
    final formatLabel = {'swiss': '🏔️ Swiss', 'arena': '⚔️ Arena', 'knockout': '🥊 KO', 'round_robin': '🔄 RR'};
    return _ListPanel(
      title: 'Active Tournaments',
      count: lobby.activeTournaments.length,
      emptyLine1: 'No active tournaments.',
      emptyLine2: '',
      accentColor: DTheme.success,
      children: lobby.activeTournaments.map((t) => _ActiveGameCard(
        whiteName: t.name ?? formatLabel[t.format] ?? t.format,
        blackName: 'by ${t.creatorUsername ?? 'System'}',
        tc: '${t.timeControl['minutes']}+${t.timeControl['increment']}',
        moveCount: t.currentCount ?? 0,
        hasDisconnect: false,
        isMe: false,
        label: t.status == 'completed' ? 'View ✅' : 'View',
        onAction: () => context.go('/tournament/${t.id}'),
      )).toList(),
    );
  }
}

// ═══ Shared sub-widgets ══════════════════════════════════════════════════════

// ── Stat panel line ───────────────────────────────────────────────────────────

class _StatLine extends StatelessWidget {
  final String value;
  final String label;
  const _StatLine(this.value, this.label);
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value,
          style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w800, color: DTheme.textMainDark)),
        Text(label,
          style: GoogleFonts.outfit(fontSize: 10, color: DTheme.textMutedDark, letterSpacing: 0.5)),
      ],
    );
  }
}

// ── Time control button ───────────────────────────────────────────────────────

class _TCButton extends StatefulWidget {
  final String label;
  final String description;
  final Color  color;
  final bool   isActive;
  final bool   isWaiting;
  final double fontSize;   // 35% of button height, passed from grid builder
  final VoidCallback onTap;

  const _TCButton({
    required this.label, required this.description,
    required this.color, required this.onTap,
    this.isActive = false, this.isWaiting = false,
    this.fontSize = 15,
  });

  @override
  State<_TCButton> createState() => _TCButtonState();
}

class _TCButtonState extends State<_TCButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final c = widget.color;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          transform: _hovered
              ? (Matrix4.identity()..translate(0.0, -4.0)..scale(1.02))
              : Matrix4.identity(),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1923),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: (widget.isActive || _hovered)
                  ? c : Colors.white.withValues(alpha: 0.08),
              width: widget.isActive ? 2 : 1.5,
            ),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 20),
              if (widget.isActive || _hovered)
                BoxShadow(color: c.withValues(alpha: _hovered ? 0.3 : 0.22), blurRadius: 30),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(19),
            child: Stack(children: [
              // Gradient overlay (::before in CSS)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [c.withValues(alpha: _hovered ? 0.18 : widget.isActive ? 0.15 : 0.08), Colors.transparent],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      stops: const [0, 0.6],
                    ),
                  ),
                ),
              ),
              // Content — Align ensures it centres in the Stack cell
              Align(
                alignment: Alignment.center,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(widget.label,
                        style: GoogleFonts.outfit(
                          fontSize: widget.fontSize,
                          fontWeight: FontWeight.w900,
                          color: DTheme.textMainDark, letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: widget.fontSize * 0.1),
                      Text(widget.description.toUpperCase(),
                        style: GoogleFonts.outfit(
                          fontSize: (widget.fontSize * 0.4).clamp(7, 14),
                          fontWeight: FontWeight.w600,
                          color: DTheme.textMutedDark, letterSpacing: 1.5,
                        ),
                      ),
                      if (widget.isWaiting) ...[
                        SizedBox(height: widget.fontSize * 0.08),
                        Text('Waiting…',
                          style: GoogleFonts.outfit(
                            fontSize: (widget.fontSize * 0.35).clamp(7, 12),
                            color: c, fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

// ── Gradient primary button ───────────────────────────────────────────────────

class _GradientButton extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  final bool danger;
  const _GradientButton({required this.label, required this.onTap, this.danger = false});
  @override
  State<_GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<_GradientButton> {
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
          transform: _hovered ? (Matrix4.identity()..scale(1.03)) : Matrix4.identity(),
          transformAlignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 11),
          decoration: BoxDecoration(
            gradient: widget.danger
                ? const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF97316)])
                : const LinearGradient(colors: [_kBlue, _kOrange]),
            borderRadius: BorderRadius.circular(12),
            boxShadow: _hovered
                ? [BoxShadow(
                    color: (widget.danger ? const Color(0xFFEF4444) : _kBlue).withValues(alpha: 0.45),
                    blurRadius: 20)]
                : [],
          ),
          child: Center(
            child: Text(widget.label,
              style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
        ),
      ),
    );
  }
}

// ── Pill toggle chip ──────────────────────────────────────────────────────────

class _PillToggle extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  final Color activeColor;
  const _PillToggle({required this.label, required this.active,
      required this.onTap, required this.activeColor});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
        decoration: BoxDecoration(
          color: active ? activeColor.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? activeColor : Colors.white.withValues(alpha: 0.12), width: 1.5,
          ),
        ),
        child: Text(label,
          style: GoogleFonts.outfit(
            fontSize: 12, fontWeight: FontWeight.w600,
            color: active ? activeColor : DTheme.textMutedDark,
          ),
        ),
      ),
    );
  }
}

// ── Bot card ──────────────────────────────────────────────────────────────────

class _BotCard extends StatefulWidget {
  final BotInfo bot;
  final VoidCallback? onTap;
  const _BotCard({required this.bot, this.onTap});
  @override
  State<_BotCard> createState() => _BotCardState();
}

class _BotCardState extends State<_BotCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    final busy = widget.bot.busy;
    return MouseRegion(
      cursor: busy ? SystemMouseCursors.forbidden : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: _hovered && !busy
                ? const Color(0xFF8B5CF6).withValues(alpha: 0.15)
                : Colors.white.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _hovered && !busy
                  ? const Color(0xFF8B5CF6).withValues(alpha: 0.5)
                  : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.bot.displayName,
                style: DTheme.body.copyWith(fontWeight: FontWeight.w600, fontSize: 13,
                    color: busy ? DTheme.textMutedDark : DTheme.textMainDark)),
              const SizedBox(height: 2),
              Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(busy ? Icons.hourglass_empty : Icons.star, size: 11, color: DTheme.textMutedDark),
                const SizedBox(width: 3),
                Text(busy ? 'In a game…' : (widget.bot.rating?.toStringAsFixed(0) ?? '1500'),
                  style: DTheme.bodyMuted),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Labeled number field ──────────────────────────────────────────────────────

class _LabeledNumberField extends StatelessWidget {
  final String label;
  final int value;
  final ValueChanged<int> onChange;
  final int min;
  final int max;
  const _LabeledNumberField({required this.label, required this.value,
      required this.onChange, required this.min, required this.max});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
          style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w700,
              color: DTheme.textMutedDark, letterSpacing: 1.5)),
        const SizedBox(height: 6),
        TextFormField(
          initialValue: '$value',
          style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700,
              color: DTheme.textMainDark),
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
            ),
          ),
          onChanged: (v) {
            final n = int.tryParse(v);
            if (n != null && n >= min && n <= max) onChange(n);
          },
        ),
      ],
    );
  }
}

// ── List panel wrapper ────────────────────────────────────────────────────────

class _ListPanel extends StatelessWidget {
  final String  title;
  final int     count;
  final String  emptyLine1;
  final String  emptyLine2;
  final Color   accentColor;
  final List<Widget> children;

  const _ListPanel({
    required this.title, required this.count,
    required this.emptyLine1, required this.emptyLine2,
    this.accentColor = _kBlue,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: const EdgeInsets.all(18),
      borderRadius: 18,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 300),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(children: [
            Expanded(child: Text(title,
              style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700,
                  color: DTheme.textMainDark))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('$count',
                style: TextStyle(color: accentColor, fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 12),
          // Body
          if (children.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Text(emptyLine1,
                      style: DTheme.bodyMuted.copyWith(fontSize: 13), textAlign: TextAlign.center),
                    if (emptyLine2.isNotEmpty)
                      Text(emptyLine2,
                        style: DTheme.bodyMuted.copyWith(fontSize: 11),
                        textAlign: TextAlign.center),
                  ],
                ),
              ),
            )
          else
            ...children,
        ],
        ),
      ),
    );
  }
}

// ── Game request card ─────────────────────────────────────────────────────────

class _RequestCard extends StatefulWidget {
  final String  username;
  final String  tc;
  final String  timeAgo;
  final bool    isMine;
  final String  acceptLabel;
  final VoidCallback? onAccept;

  const _RequestCard({
    required this.username, required this.tc, required this.timeAgo,
    required this.isMine, this.onAccept, this.acceptLabel = 'Accept',
  });
  @override
  State<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends State<_RequestCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: widget.isMine
                ? const Color(0xFFF59E0B).withValues(alpha: 0.05)
                : _hovered ? Colors.white.withValues(alpha: 0.06) : Colors.white.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: widget.isMine
                  ? const Color(0xFFF59E0B).withValues(alpha: 0.4)
                  : _hovered ? _kBlue.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            children: [
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.username,
                    style: DTheme.body.copyWith(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(widget.tc,
                    style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: _kBlue)),
                  Text(widget.timeAgo, style: DTheme.bodyMuted.copyWith(fontSize: 11)),
                ],
              )),
              if (widget.isMine)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text('Your request',
                    style: TextStyle(color: const Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.w600)),
                )
              else if (widget.onAccept != null)
                _MiniGradBtn(label: widget.acceptLabel, onTap: widget.onAccept!),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Active game card ──────────────────────────────────────────────────────────

class _ActiveGameCard extends StatefulWidget {
  final String  whiteName;
  final String  blackName;
  final String  tc;
  final int     moveCount;
  final bool    hasDisconnect;
  final bool    isMe;
  final String  label;
  final VoidCallback onAction;

  const _ActiveGameCard({
    required this.whiteName, required this.blackName,
    required this.tc, required this.moveCount,
    required this.hasDisconnect, required this.isMe,
    required this.onAction, this.label = '',
  });
  @override
  State<_ActiveGameCard> createState() => _ActiveGameCardState();
}

class _ActiveGameCardState extends State<_ActiveGameCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    final btnLabel = widget.label.isNotEmpty ? widget.label : (widget.isMe ? '▶ Rejoin' : 'Watch');
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: widget.hasDisconnect
                ? const Color(0xFFFBBF24).withValues(alpha: 0.07)
                : _hovered ? Colors.white.withValues(alpha: 0.06) : Colors.white.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: widget.hasDisconnect
                  ? const Color(0xFFFBBF24).withValues(alpha: 0.55)
                  : _hovered ? DTheme.success.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (widget.hasDisconnect)
                Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.bolt, size: 11, color: Color(0xFFFBBF24)),
                  const SizedBox(width: 4),
                  Text('Reconnecting…',
                    style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 11, fontWeight: FontWeight.w600)),
                ]),
              Text(
                '${widget.whiteName} vs ${widget.blackName}',
                style: DTheme.body.copyWith(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 2),
              Text('${widget.tc} · Move ${widget.moveCount}', style: DTheme.bodyMuted.copyWith(fontSize: 11)),
            ])),
            _MiniGreenBtn(label: btnLabel, isMe: widget.isMe, onTap: widget.onAction),
          ]),
        ),
      ),
    );
  }
}

// ── Mini gradient accept button ───────────────────────────────────────────────

class _MiniGradBtn extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  const _MiniGradBtn({required this.label, required this.onTap});
  @override
  State<_MiniGradBtn> createState() => _MiniGradBtnState();
}
class _MiniGradBtnState extends State<_MiniGradBtn> {
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
          transform: _hovered ? (Matrix4.identity()..scale(1.05)) : Matrix4.identity(),
          transformAlignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [_kBlue, _kOrange]),
            borderRadius: BorderRadius.circular(10),
            boxShadow: _hovered
                ? [const BoxShadow(color: Color(0x5546B0D4), blurRadius: 14)]
                : [],
          ),
          child: Text(widget.label,
            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }
}

// ── Mini green watch/rejoin button ────────────────────────────────────────────

class _MiniGreenBtn extends StatefulWidget {
  final String       label;
  final bool         isMe;
  final VoidCallback onTap;
  const _MiniGreenBtn({required this.label, required this.isMe, required this.onTap});
  @override
  State<_MiniGreenBtn> createState() => _MiniGreenBtnState();
}
class _MiniGreenBtnState extends State<_MiniGreenBtn> {
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
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: _hovered ? DTheme.success.withValues(alpha: 0.18) : DTheme.success.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _hovered ? DTheme.success.withValues(alpha: 0.6) : DTheme.success.withValues(alpha: 0.3),
            ),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (widget.isMe) ...[
              const Icon(Icons.play_arrow, size: 12, color: DTheme.success),
              const SizedBox(width: 4),
            ],
            Text(widget.label,
              style: const TextStyle(color: DTheme.success, fontSize: 12, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}

// ── Header button ─────────────────────────────────────────────────────────────

class _HeaderButton extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  const _HeaderButton({required this.label, required this.onTap});
  @override
  State<_HeaderButton> createState() => _HeaderButtonState();
}
class _HeaderButtonState extends State<_HeaderButton> {
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
          duration: const Duration(milliseconds: 130),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: _hovered ? Colors.white.withValues(alpha: 0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.white.withValues(alpha: _hovered ? 0.2 : 0.1)),
          ),
          child: Text(widget.label,
            style: GoogleFonts.outfit(
              fontSize: 12, fontWeight: FontWeight.w600,
              color: _hovered ? DTheme.textMainDark : DTheme.textMutedDark,
            ),
          ),
        ),
      ),
    );
  }
}

// ── User badge ────────────────────────────────────────────────────────────────

class _UserBadge extends StatelessWidget {
  final AppUser auth;
  final VoidCallback onLogout;
  const _UserBadge({required this.auth, required this.onLogout});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onLogout,
      child: GlassPanel(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        borderRadius: 12,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.person, size: 14, color: _kBlue),
          const SizedBox(width: 6),
          Text(auth.username,
            style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: DTheme.textMainDark)),
          if (auth.rating != null) ...[
            const SizedBox(width: 6),
            ShaderMask(
              shaderCallback: (b) => _kGrad.createShader(b),
              child: const Icon(Icons.star, size: 12, color: Colors.white),
            ),
            const SizedBox(width: 2),
            Text(auth.rating!.toStringAsFixed(0),
              style: const TextStyle(fontSize: 11, color: _kOrange)),
          ],
          const SizedBox(width: 10),
          Text('Logout',
            style: GoogleFonts.outfit(fontSize: 11, color: DTheme.textMutedDark)),
        ]),
      ),
    );
  }
}

// ── Background theme toggle (icon only) ──────────────────────────────────────

class _BgToggle extends StatefulWidget {
  final AppBg bg;
  final VoidCallback onTap;
  const _BgToggle({required this.bg, required this.onTap});
  @override
  State<_BgToggle> createState() => _BgToggleState();
}

class _BgToggleState extends State<_BgToggle> {
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
// ── Open tournament card (View + optional Join) ───────────────────────────────

class _TournamentOpenCard extends StatefulWidget {
  final String  username;
  final String  tc;
  final String  info;
  final VoidCallback  onView;
  final VoidCallback? onJoin;
  const _TournamentOpenCard({
    required this.username, required this.tc, required this.info,
    required this.onView, this.onJoin,
  });
  @override
  State<_TournamentOpenCard> createState() => _TournamentOpenCardState();
}

class _TournamentOpenCardState extends State<_TournamentOpenCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: _hovered ? Colors.white.withValues(alpha: 0.06) : Colors.white.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _hovered ? _kBlue.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.username,
                style: DTheme.body.copyWith(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 2),
              Text(widget.tc,
                style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: _kBlue)),
              Text(widget.info, style: DTheme.bodyMuted.copyWith(fontSize: 11)),
            ])),
            // View button — always present
            _MiniGradBtn(label: 'View', onTap: widget.onView),
            // Join button — only for logged-in non-participant users
            if (widget.onJoin != null) ...[
              const SizedBox(width: 6),
              _MiniGreenBtn(label: 'Join', isMe: false, onTap: widget.onJoin!),
            ],
          ]),
        ),
      ),
    );
  }
}
