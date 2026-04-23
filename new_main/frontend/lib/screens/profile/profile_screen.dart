import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ping_provider.dart';
import '../../core/socket_service.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _socket = SocketService.instance;

  @override
  void initState() {
    super.initState();
  }


  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final auth = authState.value;

    if (auth == null) {
      return const Scaffold(body: Center(child: Text('Not logged in')));
    }


    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: DTheme.textMainDark),
          onPressed: () => context.pop(),
        ),
        title: Text('User Profile', style: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: GlassPanel(
              padding: const EdgeInsets.all(32),
              borderRadius: 20,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.account_circle, size: 80, color: DTheme.accent),
                  const SizedBox(height: 16),
                  Text(auth.username, style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: DTheme.textMainDark)),
                  
                  const SizedBox(height: 8),
                  // Role badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: auth.role == 'guest' ? Colors.grey.withValues(alpha: 0.2) : DTheme.success.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      auth.role.toUpperCase(),
                      style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: auth.role == 'guest' ? Colors.grey : DTheme.success),
                    ),
                  ),

                  const SizedBox(height: 12),
                  _PingIndicator(),
                  
                  const SizedBox(height: 32),
                  
                  // Category Ratings
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStat('Bullet', auth.ratingBullet?.toStringAsFixed(0) ?? '1500', small: true),
                            _buildStat('Blitz', auth.ratingBlitz?.toStringAsFixed(0) ?? '1500', small: true),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStat('Rapid', auth.ratingRapid?.toStringAsFixed(0) ?? '1500', small: true),
                            _buildStat('Classical', auth.ratingClassical?.toStringAsFixed(0) ?? '1500', small: true),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Activity Stats
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildStat('Last Rating', auth.rating?.toStringAsFixed(0) ?? 'N/A'),
                      _buildStat('Rated Today', auth.ratedGamesPlayedToday.toString()),
                      _buildStat('Bots Today', auth.botGamesPlayedToday.toString()),
                    ],
                  ),
                                    const SizedBox(height: 32),
                  
                  // Subscription Section
                  if (auth.role != 'guest' && !auth.isSubscriber)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF6A11CB), Color(0xFF2575FC)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Text('Unlock Premium Features', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 8),
                          Text('Play unlimited rated & bot games.', style: DTheme.bodyMuted, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF2575FC),
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscription coming soon!')));
                            },
                            child: const Text('Subscribe Now', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  
                  if (auth.isSubscriber)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 24),
                          const SizedBox(width: 12),
                          Text('Active Subscriber', style: GoogleFonts.outfit(color: Colors.amber, fontSize: 16, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  
                  const SizedBox(height: 32),
                  
                  // Actions
                  if (auth.role != 'guest') ...[ 
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: DTheme.accent.withValues(alpha: 0.15),
                          foregroundColor: DTheme.accent,
                          side: BorderSide(color: DTheme.accent.withValues(alpha: 0.5)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.history),
                        label: const Text('My Games'),
                        onPressed: () => context.push('/profile/games'),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (auth.role == 'admin') ...[
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: DTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.admin_panel_settings),
                        label: const Text('Admin Dashboard'),
                        onPressed: () => context.push('/admin/jobs'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.07),
                          foregroundColor: Colors.white70,
                          side: const BorderSide(color: Colors.white24),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.manage_accounts),
                        label: const Text('User Management'),
                        onPressed: () => context.push('/admin/users'),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.redAccent,
                        side: const BorderSide(color: Colors.redAccent),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.logout),
                      label: const Text('Logout'),
                      onPressed: () {
                        ref.read(authProvider.notifier).logout();
                        context.go('/');
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value, {bool small = false}) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.outfit(
          fontSize: small ? 18 : 24, 
          fontWeight: FontWeight.bold, 
          color: small ? DTheme.accent : DTheme.textMainDark,
        )),
        const SizedBox(height: 4),
        Text(label, style: GoogleFonts.outfit(fontSize: small ? 12 : 14, color: DTheme.textMutedDark)),
      ],
    );
  }
}

// ── Ping indicator ────────────────────────────────────────────────────────────

class _PingIndicator extends ConsumerWidget {
  const _PingIndicator();

  Color _pingColor(int ms) {
    if (ms < 80)  return const Color(0xFF00E676);  // green
    if (ms < 200) return Colors.amber;
    return Colors.redAccent;
  }

  String _pingLabel(int ms) {
    if (ms < 80)  return 'Excellent';
    if (ms < 200) return 'Good';
    return 'Poor';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latency = ref.watch(latencyProvider);

    return latency.when(
      loading: () => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 10, height: 10,
            child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white38),
          ),
          const SizedBox(width: 6),
          Text('Measuring ping…',
              style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
        ],
      ),
      error: (_, __) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off, size: 14, color: Colors.redAccent),
          const SizedBox(width: 6),
          Text('No connection', style: GoogleFonts.outfit(fontSize: 12, color: Colors.redAccent)),
        ],
      ),
      data: (ms) {
        final color = _pingColor(ms);
        return AnimatedContainer(
          duration: const Duration(milliseconds: 400),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: 0.35)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Signal bars icon
              Icon(Icons.network_ping, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                '$ms ms',
                style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: color),
              ),
              const SizedBox(width: 6),
              Text(
                '· ${_pingLabel(ms)}',
                style: GoogleFonts.outfit(fontSize: 12, color: color.withValues(alpha: 0.75)),
              ),
            ],
          ),
        );
      },
    );
  }
}
