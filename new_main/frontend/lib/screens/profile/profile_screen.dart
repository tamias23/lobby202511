import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';
import '../../widgets/ping_indicator.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/translations_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/ping_provider.dart';
import '../../providers/server_config_provider.dart';
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
      return Scaffold(body: Center(child: Text(ref.tr('ui.not_logged_in'))));
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
        title: Text(ref.tr('ui.user_profile'), style: GoogleFonts.outfit(color: DTheme.textMainDark, fontWeight: FontWeight.bold)),
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
                      ref.tr('ui.role_${auth.role}').toUpperCase(),
                      style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: auth.role == 'guest' ? Colors.grey : DTheme.success),
                    ),
                  ),

                  const SizedBox(height: 12),
                  const PingIndicator(),
                  
                  const SizedBox(height: 24),
                  
                  // Language Selection
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(ref.tr('ui.language') + ':', style: GoogleFonts.outfit(color: DTheme.textMutedDark)),
                      const SizedBox(width: 12),
                      Theme(
                        data: Theme.of(context).copyWith(canvasColor: DTheme.cardBgDark),
                        child: DropdownButton<String>(
                          value: ref.watch(localeProvider).languageCode,
                          underline: const SizedBox(),
                          icon: const Icon(Icons.language, size: 16, color: DTheme.primary),
                          style: GoogleFonts.outfit(color: DTheme.textMainDark, fontSize: 14, fontWeight: FontWeight.bold),
                          items: const [
                            DropdownMenuItem(value: 'en', child: Text('English')),
                            DropdownMenuItem(value: 'fr', child: Text('Français')),
                            DropdownMenuItem(value: 'es', child: Text('Español')),
                            DropdownMenuItem(value: 'it', child: Text('Italiano')),
                            DropdownMenuItem(value: 'de', child: Text('Deutsch')),
                          ],
                          onChanged: (val) {
                            if (val != null) ref.read(localeProvider.notifier).setLocale(val);
                          },
                        ),
                      ),
                    ],
                  ),
                  
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
                            _buildStat(ref.tr('ui.bullet'), auth.ratingBullet?.toStringAsFixed(0) ?? '1500', small: true),
                            _buildStat(ref.tr('ui.blitz'), auth.ratingBlitz?.toStringAsFixed(0) ?? '1500', small: true),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStat(ref.tr('ui.rapid'), auth.ratingRapid?.toStringAsFixed(0) ?? '1500', small: true),
                            _buildStat(ref.tr('ui.classical'), auth.ratingClassical?.toStringAsFixed(0) ?? '1500', small: true),
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
                      _buildStat(ref.tr('ui.last_rating'), auth.rating?.toStringAsFixed(0) ?? 'N/A'),
                      _buildStat(ref.tr('ui.rated_today'), auth.ratedGamesPlayedToday.toString()),
                      _buildStat(ref.tr('ui.bots_today'), auth.botGamesPlayedToday.toString()),
                    ],
                  ),
                                    const SizedBox(height: 32),
                  
                  // Subscription Section
                  if (ref.watch(serverConfigProvider).asData?.value.showSubscribeButton ?? true) ...[  
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
                          Text(ref.tr('ui.unlock_premium'), style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 8),
                          Text(ref.tr('ui.play_unlimited'), style: DTheme.bodyMuted, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF2575FC),
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () {
                               ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(ref.tr('ui.sub_coming_soon'))));
                            },
                             child: Text(ref.tr('ui.subscribe_now'), style: const TextStyle(fontWeight: FontWeight.bold)),
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
                           Text(ref.tr('ui.active_subscriber'), style: GoogleFonts.outfit(color: Colors.amber, fontSize: 16, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ], // end showSubscribeButton
                  
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
                        label: Text(ref.tr('ui.my_games')),
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
                        label: Text(ref.tr('ui.admin_dashboard') != 'ui.admin_dashboard' ? ref.tr('ui.admin_dashboard') : 'Admin Dashboard'),
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
                        label: Text(ref.tr('ui.user_management') != 'ui.user_management' ? ref.tr('ui.user_management') : 'User Management'),
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
                      label: Text(ref.tr('ui.logout') != 'ui.logout' ? ref.tr('ui.logout') : 'Logout'),
                      onPressed: () {
                        ref.read(authProvider.notifier).logout();
                        context.go('/');
                      },
                    ),
                  ),

                  // ── Danger zone ───────────────────────────────────────────
                  const SizedBox(height: 32),
                  Divider(color: Colors.redAccent.withValues(alpha: 0.3), thickness: 1),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red.shade300,
                        side: BorderSide(color: Colors.red.withValues(alpha: 0.4)),
                        backgroundColor: Colors.red.withValues(alpha: 0.05),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.delete_forever_outlined),
                      label: Text(ref.tr('ui.delete_account')),
                      onPressed: () => _confirmDeleteAccount(context, auth.username),
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

  Future<void> _confirmDeleteAccount(BuildContext context, String username) async {
    // Step 1: Intent confirmation
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 28),
          const SizedBox(width: 12),
          Text(ref.tr('ui.delete_account'), style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
        ]),
        content: Text(
          ref.tr('ui.permanently_delete_warning'),
          style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(ref.tr('ui.cancel'), style: GoogleFonts.outfit(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(ref.tr('ui.continue_btn'), style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;

    // Step 2: Type username to confirm
    final confirmCtrl = TextEditingController();
    final finalConfirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          backgroundColor: const Color(0xFF1E1E2E),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(ref.tr('ui.confirm_deletion'), style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(children: [
                  TextSpan(text: '${ref.tr('ui.type_username_to_confirm')} ', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
                  TextSpan(text: username, style: GoogleFonts.outfit(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 14)),
                  TextSpan(text: ':', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
                ]),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: confirmCtrl,
                autofocus: true,
                style: GoogleFonts.outfit(color: Colors.white),
                decoration: InputDecoration(
                  hintText: username,
                  hintStyle: GoogleFonts.outfit(color: Colors.white24),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Colors.white24),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Colors.redAccent),
                  ),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(ref.tr('ui.cancel'), style: GoogleFonts.outfit(color: Colors.white54)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: confirmCtrl.text == username ? Colors.redAccent : Colors.grey,
                foregroundColor: Colors.white,
              ),
              onPressed: confirmCtrl.text == username ? () => Navigator.of(ctx).pop(true) : null,
              child: Text(ref.tr('ui.delete_forever'), style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
    confirmCtrl.dispose();
    if (finalConfirmed != true || !context.mounted) return;

    // Execute deletion
    try {
      await ref.read(authProvider.notifier).deleteAccount();
      if (context.mounted) context.go('/');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${ref.tr('ui.no_data')} : $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }
}
