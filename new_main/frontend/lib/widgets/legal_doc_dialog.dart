import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';

/// Generic dialog that loads a markdown asset and renders it with simple
/// formatting (h1/h2, bold, bullets, horizontal rules, plain text).
/// No external markdown package required.
class LegalDocDialog extends StatelessWidget {
  final String title;
  final String assetPath; // e.g. 'assets/legal/privacy.md'

  const LegalDocDialog({
    super.key,
    required this.title,
    required this.assetPath,
  });

  static void show(BuildContext context, {required String title, required String assetPath}) {
    showDialog(
      context: context,
      builder: (_) => LegalDocDialog(title: title, assetPath: assetPath),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenH = MediaQuery.of(context).size.height;
    return AlertDialog(
      backgroundColor: DTheme.cardBgDark,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      titlePadding: const EdgeInsets.fromLTRB(24, 24, 16, 8),
      contentPadding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
      title: Row(children: [
        Expanded(
          child: Text(title,
            style: GoogleFonts.outfit(
              fontSize: 20, fontWeight: FontWeight.bold, color: DTheme.textMainDark)),
        ),
        IconButton(
          icon: const Icon(Icons.close, color: DTheme.textMutedDark, size: 20),
          onPressed: () => Navigator.of(context).pop(),
          visualDensity: VisualDensity.compact,
        ),
      ]),
      content: SizedBox(
        width: 560,
        height: screenH * 0.65,
        child: FutureBuilder<String>(
          future: rootBundle.loadString(assetPath),
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return Center(child: Text('Failed to load document.',
                style: GoogleFonts.outfit(color: DTheme.textMutedDark)));
            }
            return Scrollbar(
              thumbVisibility: true,
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 24, right: 8),
                child: _MdRenderer(snap.data!),
              ),
            );
          },
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('Close', style: GoogleFonts.outfit(color: DTheme.primary, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}

// ── Simple markdown renderer ──────────────────────────────────────────────────

class _MdRenderer extends StatelessWidget {
  final String source;
  const _MdRenderer(this.source);

  @override
  Widget build(BuildContext context) {
    final lines = source.split('\n');
    final widgets = <Widget>[];

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];

      // Blank line → small spacer
      if (line.trim().isEmpty) {
        widgets.add(const SizedBox(height: 6));
        continue;
      }

      // Horizontal rule ---
      if (RegExp(r'^-{3,}$').hasMatch(line.trim())) {
        widgets.add(Divider(color: Colors.white12, height: 24, thickness: 1));
        continue;
      }

      // H1
      if (line.startsWith('# ')) {
        widgets.add(_heading(line.substring(2), 18));
        continue;
      }

      // H2
      if (line.startsWith('## ')) {
        widgets.add(_heading(line.substring(3), 15));
        continue;
      }

      // H3
      if (line.startsWith('### ')) {
        widgets.add(_heading(line.substring(4), 13));
        continue;
      }

      // Bullet point
      if (line.startsWith('- ')) {
        widgets.add(_bullet(line.substring(2)));
        continue;
      }

      // Plain paragraph
      widgets.add(Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: _richText(line.trim(), GoogleFonts.outfit(fontSize: 13, color: DTheme.textMainDark.withValues(alpha: 0.85), height: 1.6)),
      ));
    }

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: widgets);
  }

  Widget _heading(String text, double size) => Padding(
    padding: const EdgeInsets.only(top: 16, bottom: 6),
    child: Text(text.trim(),
      style: GoogleFonts.outfit(
        fontSize: size,
        fontWeight: FontWeight.bold,
        color: DTheme.primary,
      )),
  );

  Widget _bullet(String text) => Padding(
    padding: const EdgeInsets.only(left: 8, bottom: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('• ', style: GoogleFonts.outfit(fontSize: 13, color: DTheme.primary, height: 1.6)),
        Expanded(child: _richText(text, GoogleFonts.outfit(fontSize: 13, color: DTheme.textMainDark.withValues(alpha: 0.85), height: 1.6))),
      ],
    ),
  );

  /// Renders inline **bold** and `email` patterns.
  Widget _richText(String text, TextStyle base) {
    // Split on **bold** markers
    final spans = <InlineSpan>[];
    final boldRe = RegExp(r'\*\*(.*?)\*\*');
    int last = 0;
    for (final m in boldRe.allMatches(text)) {
      if (m.start > last) spans.add(TextSpan(text: text.substring(last, m.start), style: base));
      spans.add(TextSpan(text: m.group(1), style: base.copyWith(fontWeight: FontWeight.bold, color: DTheme.textMainDark)));
      last = m.end;
    }
    if (last < text.length) spans.add(TextSpan(text: text.substring(last), style: base));
    return Text.rich(TextSpan(children: spans));
  }
}
