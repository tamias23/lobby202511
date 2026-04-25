import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../widgets/glass_panel.dart';
import '../../widgets/lobby_back_button.dart';

// BUILD_TIMESTAMP is injected at compile time via --dart-define=BUILD_TIMESTAMP=...
// Falls back to 'dev' when running locally without the define.
const String _kBuildTimestamp = String.fromEnvironment(
  'BUILD_TIMESTAMP',
  defaultValue: 'dev',
);

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Stack(
          children: [
            // Back button — top left
            const Positioned(
              top: 12,
              left: 12,
              child: LobbyBackButton(),
            ),
            // Centred card
            Center(
              child: GlassPanel(
                padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 36),
                borderRadius: 24,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Title
                    Text(
                      'DEDAL',
                      style: GoogleFonts.outfit(
                        fontSize: 36,
                        fontWeight: FontWeight.w900,
                        color: DTheme.textMainDark,
                        letterSpacing: -1,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'about this version',
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: DTheme.textMutedDark,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 28),
                    // Divider
                    Container(
                      height: 1,
                      width: 200,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                    const SizedBox(height: 28),
                    // Timestamp label
                    Text(
                      'Deployed',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        color: DTheme.textMutedDark,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Timestamp value
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
                      ),
                      child: Text(
                        _kBuildTimestamp,
                        style: GoogleFonts.sourceCodePro(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: DTheme.primary,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
