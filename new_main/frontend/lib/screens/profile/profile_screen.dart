import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import '../../core/socket_service.dart';
import 'package:timezone/timezone.dart' as tz;

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _socket = SocketService.instance;
  late String _selectedTimezone;

  @override
  void initState() {
    super.initState();
    // Initialize with current user timezone or UTC
    final auth = ref.read(authProvider).value;
    _selectedTimezone = auth?.timezone ?? 'UTC';
  }

  void _updateTimezone(String newZone) {
    setState(() => _selectedTimezone = newZone);
    _socket.emit('update_timezone', {'timezone': newZone});
    // Optimistically update the authProvider state
    final notifier = ref.read(authProvider.notifier);
    notifier.updateTimezone(newZone);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final auth = authState.value;

    if (auth == null) {
      return const Scaffold(body: Center(child: Text('Not logged in')));
    }

    // List of available timezones from the initialized database
    final availableZones = tz.timeZoneDatabase.locations.keys.toList()..sort();
    if (!availableZones.contains('UTC')) availableZones.insert(0, 'UTC');

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
                  
                  const SizedBox(height: 32),
                  
                  // Stats Grid
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildStat('Rating', auth.rating?.toStringAsFixed(0) ?? 'N/A'),
                      _buildStat('Rated Today', auth.ratedGamesPlayedToday.toString()),
                      _buildStat('Bots Today', auth.botGamesPlayedToday.toString()),
                    ],
                  ),
                  
                  const SizedBox(height: 32),

                  // Timezone Selector
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Timezone Preference', style: DTheme.bodyMuted),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: availableZones.contains(_selectedTimezone) ? _selectedTimezone : 'UTC',
                    dropdownColor: DTheme.bgDark,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      filled: true,
                      fillColor: Colors.black26,
                      border: OutlineInputBorder(),
                    ),
                    items: availableZones.map((z) => DropdownMenuItem(value: z, child: Text(z))).toList(),
                    onChanged: (v) {
                      if (v != null) _updateTimezone(v);
                    },
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

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold, color: DTheme.textMainDark)),
        const SizedBox(height: 4),
        Text(label, style: GoogleFonts.outfit(fontSize: 14, color: DTheme.textMutedDark)),
      ],
    );
  }
}
