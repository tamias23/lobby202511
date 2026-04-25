import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';
import '../providers/translations_provider.dart';

/// Canonical "← Lobby" back button.
/// Drop it wherever a screen needs to navigate back to the lobby root.
/// Matches the design used across tournament, about, tutorial, and analysis screens.
class LobbyBackButton extends ConsumerStatefulWidget {
  /// Override the tap handler (e.g. analysis can pop before going to '/').
  final VoidCallback? onTap;

  const LobbyBackButton({super.key, this.onTap});

  @override
  ConsumerState<LobbyBackButton> createState() => _LobbyBackButtonState();
}

class _LobbyBackButtonState extends ConsumerState<LobbyBackButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final label = ref.tr('ui.lobby');

    void defaultTap() => context.go('/');

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap ?? defaultTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: _hovered
                ? Colors.white.withValues(alpha: 0.10)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: Colors.white.withValues(alpha: _hovered ? 0.22 : 0.12),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.arrow_back_ios_new,
                size: 13,
                color: _hovered ? DTheme.textMainDark : Colors.white70,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _hovered ? DTheme.textMainDark : Colors.white70,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
