import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/locale_provider.dart';
import '../providers/translations_provider.dart';
import '../core/theme.dart';
import 'ping_indicator.dart';

class SettingsDialog extends ConsumerWidget {
  const SettingsDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const SettingsDialog(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocale = ref.watch(localeProvider);
    
    final languages = [
      {'code': 'en', 'name': 'English'},
      {'code': 'fr', 'name': 'Français'},
      {'code': 'es', 'name': 'Español'},
      {'code': 'it', 'name': 'Italiano'},
      {'code': 'de', 'name': 'Deutsch'},
    ];

    return AlertDialog(
      backgroundColor: DTheme.cardBgDark,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      titlePadding: const EdgeInsets.fromLTRB(24, 24, 16, 8),
      contentPadding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
      title: Row(
        children: [
          Expanded(
            child: Text(
              ref.tr('ui.settings'),
              style: GoogleFonts.outfit(
                fontSize: 20, 
                fontWeight: FontWeight.bold, 
                color: DTheme.textMainDark
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: DTheme.textMutedDark, size: 20),
            onPressed: () => Navigator.of(context).pop(),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Language Selection
          Text(
            ref.tr('ui.language'),
            style: GoogleFonts.outfit(
              fontSize: 14, 
              fontWeight: FontWeight.w600, 
              color: DTheme.primary,
              letterSpacing: 0.5
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(13),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withAlpha(26)),
            ),
            child: Column(
              children: languages.map((lang) {
                final isSelected = currentLocale.languageCode == lang['code'];
                return InkWell(
                  onTap: () {
                    ref.read(localeProvider.notifier).setLocale(lang['code']!);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        Text(
                          lang['name']!,
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            color: isSelected ? DTheme.primary : DTheme.textMainDark,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                        const Spacer(),
                        if (isSelected)
                          const Icon(Icons.check, color: DTheme.primary, size: 18),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Connection / Ping Info
          Text(
            'Connection',
            style: GoogleFonts.outfit(
              fontSize: 14, 
              fontWeight: FontWeight.w600, 
              color: DTheme.primary,
              letterSpacing: 0.5
            ),
          ),
          const SizedBox(height: 12),
          const PingIndicator(),
        ],
      ),
    );
  }
}
