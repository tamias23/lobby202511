import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens ported from legacy index.css CSS variables.
/// See frontend_legacy/src/index.css :root for the source of truth.
class DTheme {
  DTheme._();

  // ── Brand palette ──────────────────────────────────────────────────────────
  static const Color primary       = Color(0xFF46B0D4); // --primary
  static const Color primaryHover  = Color(0xFF3A96B8); // --primary-hover
  static const Color accent        = Color(0xFFF59E0B); // --accent (amber)
  static const Color success       = Color(0xFF22C55E); // --success (green)
  static const Color danger        = Color(0xFFEF4444); // --danger (red)

  // ── Dark theme ─────────────────────────────────────────────────────────────
  static const Color bgDark        = Color(0xFF0F172A); // dark bg base
  static const Color bgDarkTop     = Color(0xFF1E293B); // dark bg gradient top
  static const Color cardBgDark    = Color(0xB81E293B); // rgba(30,41,59,0.72)
  static const Color textMainDark  = Color(0xFFF8FAFC);
  static const Color textMutedDark = Color(0xFF94A3B8);
  static const Color borderDark    = Color(0x1AFFFFFF); // rgba(255,255,255,0.1)

  // ── Board polygon colors ────────────────────────────────────────────────────
  static const Color polyOrange = Color(0xFFF97316);
  static const Color polyGreen  = Color(0xFF22C55E);
  static const Color polyBlue   = Color(0xFF3B82F6);
  static const Color polyGrey   = Color(0xFF64748B);

  static Color? boardPolyColor(String name) {
    switch (name.toLowerCase()) {
      case 'orange': return polyOrange;
      case 'green':  return polyGreen;
      case 'blue':   return polyBlue;
      case 'grey':   return polyGrey;
      default:       return null;
    }
  }

  // ── Typography ──────────────────────────────────────────────────────────────
  static TextStyle get heading => GoogleFonts.outfit(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: textMainDark,
    letterSpacing: -0.5,
  );

  static TextStyle get subtitle => GoogleFonts.outfit(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: textMutedDark,
  );

  static TextStyle get body => GoogleFonts.inter(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: textMainDark,
  );

  static TextStyle get bodyMuted => GoogleFonts.inter(
    fontSize: 13,
    color: textMutedDark,
  );

  static TextStyle get label => GoogleFonts.outfit(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: textMutedDark,
    letterSpacing: 1.0,
  );

  // ── Theme Data ───────────────────────────────────────────────────────────────
  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgDark,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: accent,
        surface: cardBgDark,
        error: danger,
        onPrimary: Colors.white,
        onSecondary: Colors.black,
        onSurface: textMainDark,
        outline: borderDark,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        headlineLarge:  GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w700, color: textMainDark),
        headlineMedium: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w700, color: textMainDark),
        titleLarge:     GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600, color: textMainDark),
        titleMedium:    GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w600, color: textMainDark),
        bodyLarge:      GoogleFonts.inter(fontSize: 15, color: textMainDark),
        bodyMedium:     GoogleFonts.inter(fontSize: 13, color: textMutedDark),
        labelSmall:     GoogleFonts.outfit(fontSize: 11, letterSpacing: 0.8, color: textMutedDark),
      ),
      cardTheme: CardThemeData(
        color: cardBgDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: borderDark, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          textStyle: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cardBgDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        labelStyle: GoogleFonts.inter(color: textMutedDark, fontSize: 13),
        hintStyle: GoogleFonts.inter(color: textMutedDark, fontSize: 13),
      ),
      dividerTheme: const DividerThemeData(color: borderDark, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: cardBgDark,
        contentTextStyle: GoogleFonts.inter(color: textMainDark, fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
