import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../providers/translations_provider.dart';
import '../../core/theme.dart';
import '../../core/config.dart';
import '../../models/models.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../game/painters/board_svg.dart';
import '../game/painters/piece_svg.dart';
import '../../widgets/lobby_back_button.dart';

// ── Section list ───────────────────────────────────────────────────────────────

const _sections = [
  'intro', 'setup_phase', 'board', 'turn',
  'goddess', 'heroe', 'mage', 'siren', 'ghoul', 'witch', 'soldier', 'minotaur',
];

const _languages = [
  ('en', 'English'), ('fr', 'Français'), ('es', 'Español'),
  ('it', 'Italiano'), ('de', 'Deutsch'), ('pt', 'Português'),
  ('nl', 'Nederlands'), ('zh', '中文'), ('ja', '日本語'),
  ('ko', '한국어'), ('hi', 'हिन्दी'), ('ta', 'தமிழ்'),
  ('ar', 'العربية'), ('ur', 'اردو'),
  ('ru', 'Русский'), ('bn', 'বাংলা'),
  ('ms', 'Melayu'), ('id', 'Indonesia'),
];

/// Languages that use right-to-left script.
const _rtlLangs = {'ar', 'ur'};

// ── Piece presets — exact copy of SECTION_PIECES from TutorialPage.jsx ────────

typedef _P = Map<String, String>;

List<_P> _p(List<List<String>> raw) =>
    raw.map((r) => {'id': r[0], 'type': r[1], 'pos': r[2]}).toList();


final _sectionPieces = <String, List<_P>>{
  'intro': _p([
    ['white_goddess_0', 'goddess', 'oH1'],
    ['black_goddess_0', 'goddess', 'bF1'],
  ]),
  // setup_phase shows a valid position fetched from the backend at runtime
  'setup_phase': [],
  'board': [],
  'turn': [],
  'goddess': _p([
    ['white_goddess_0', 'goddess', 'oH1'],
    ['black_goddess_0', 'goddess', 'yJ1'],
  ]),
  'heroe': _p([
    ['white_heroe_0',   'heroe',   'oH1'],
    ['black_heroe_0',   'heroe',   'yJ1'],
    ['white_ghoul_0',   'ghoul',   'bF1'],
    ['black_ghoul_0',   'ghoul',   'yI1'],
    ['white_soldier_0', 'soldier', 'gE2'],
    ['white_soldier_1', 'soldier', 'bH2'],
    ['black_soldier_0', 'soldier', 'gI2'],
    ['black_soldier_1', 'soldier', 'yJ2'],
    ['white_siren_0',   'siren',   'oF1'],
    ['black_siren_0',   'siren',   'oJ1'],
    ['white_minotaur_0','minotaur','gH1'],
    ['black_minotaur_0','minotaur','gI1'],
  ]),
  'mage': _p([
    ['white_mage_0',    'mage',    'oH1'],
    ['black_mage_0',    'mage',    'oE2'],
    ['white_ghoul_0',   'ghoul',   'bF1'],
    ['white_ghoul_1',   'ghoul',   'bF2'],
    ['white_ghoul_2',   'ghoul',   'bH1'],
    ['white_ghoul_3',   'ghoul',   'bH2'],
    ['white_soldier_0', 'soldier', 'gH1'],
    ['white_soldier_1', 'soldier', 'gH2'],
    ['white_soldier_2', 'soldier', 'oF1'],
    ['black_ghoul_0',   'ghoul',   'yJ1'],
    ['black_ghoul_1',   'ghoul',   'yJ2'],
    ['black_ghoul_2',   'ghoul',   'gI1'],
    ['black_ghoul_3',   'ghoul',   'gI2'],
    ['black_soldier_0', 'soldier', 'gK1'],
    ['black_soldier_1', 'soldier', 'gK2'],
    ['black_soldier_2', 'soldier', 'oK1'],
  ]),
  'siren': _p([
    ['white_siren_0', 'siren', 'oH1'],
    ['white_siren_1', 'siren', 'gH1'],
    ['white_siren_2', 'siren', 'bF1'],
    ['white_siren_3', 'siren', 'bH2'],
    ['black_siren_0', 'siren', 'oK1'],
    ['black_siren_1', 'siren', 'gI1'],
    ['black_siren_2', 'siren', 'yJ1'],
    ['black_siren_3', 'siren', 'yI1'],
  ]),
  'ghoul': _p([
    ['white_ghoul_0', 'ghoul', 'oH1'],
    ['white_ghoul_1', 'ghoul', 'bF1'],
    ['white_ghoul_2', 'ghoul', 'bH1'],
    ['white_ghoul_3', 'ghoul', 'gH2'],
    ['black_ghoul_0', 'ghoul', 'bF2'],
    ['black_ghoul_1', 'ghoul', 'yJ1'],
    ['black_ghoul_2', 'ghoul', 'gI1'],
    ['black_ghoul_3', 'ghoul', 'oJ1'],
  ]),
  'witch': _p([
    ['white_witch_0', 'witch', 'gH2'],
    ['black_witch_0', 'witch', 'yI1'],
  ]),
  'soldier': _p([
    ['white_soldier_0', 'soldier', 'oH1'],
    ['white_soldier_1', 'soldier', 'gH1'],
    ['white_soldier_2', 'soldier', 'gH2'],
    ['white_soldier_3', 'soldier', 'oF1'],
    ['white_soldier_4', 'soldier', 'bH1'],
    ['white_soldier_5', 'soldier', 'bH2'],
    ['black_soldier_0', 'soldier', 'yJ1'],
    ['black_soldier_1', 'soldier', 'yI1'],
    ['black_soldier_2', 'soldier', 'yJ2'],
    ['black_soldier_3', 'soldier', 'oJ1'],
  ]),
  'minotaur': _p([
    ['white_minotaur_0', 'minotaur', 'gJ1'],
    ['black_minotaur_0', 'minotaur', 'gK1'],
  ]),
};

List<_P> _presetsFor(String section) =>
    _sectionPieces[section] ?? [];

// ── Lightweight HTML → Flutter renderer ───────────────────────────────────────

/// Accent color (maps to DTheme.primary / legacy .accent)
const _accentCol  = Color(0xFF46B0D4);
/// Highlight color (maps to legacy .highlight — warm amber)
const _highlightCol = Color(0xFFF59E0B);
/// Card border color default
const _cardBorder = Color(0xFF2D4A6A);

/// Converts an HTML content string (from tutorialTranslations) into a list of
/// Flutter widgets. Handles: <div class="card">, <h2>, <h3>, <p>, <ol>, <ul>,
/// <li>, <span class="accent|highlight">, <i>, <strong>, <br>.
List<Widget> renderHtml(String html, {TextDirection dir = TextDirection.ltr}) {
  final widgets = <Widget>[];
  // Split into top-level block tokens
  final blocks = _splitBlocks(html.trim());
  for (final block in blocks) {
    final w = _renderBlock(block, dir: dir);
    if (w != null) widgets.add(w);
  }
  return widgets;
}

// Regex patterns
final _tagRe = RegExp(r'<(/?\w+)[^>]*?(?:class="([^"]*)")?[^>]*>', dotAll: true);

/// Split HTML string into top-level block segments.
List<String> _splitBlocks(String html) {
  // Normalize newlines
  html = html.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  final blocks = <String>[];
  int i = 0;

  while (i < html.length) {
    // Skip whitespace between blocks
    while (i < html.length && html[i].trim().isEmpty) i++;
    if (i >= html.length) break;

    if (html[i] != '<') {
      // Bare text — collect until next tag
      final end = html.indexOf('<', i);
      final text = end == -1 ? html.substring(i) : html.substring(i, end);
      if (text.trim().isNotEmpty) blocks.add('<p>$text</p>');
      i = end == -1 ? html.length : end;
    } else {
      // Find the tag name
      final tagMatch = RegExp(r'^<(\w+)([^>]*)>').firstMatch(html.substring(i));
      if (tagMatch == null) { i++; continue; }
      final tagName = tagMatch.group(1)!.toLowerCase();

      if (tagName == 'div' || tagName == 'ol' || tagName == 'ul') {
        // Find matching closing tag (handles nesting for div)
        final (content, end) = _extractTag(html, i, tagName);
        blocks.add(content);
        i = end;
      } else if (tagName == 'p' || tagName == 'h2' || tagName == 'h3' || tagName == 'h4') {
        final (content, end) = _extractTag(html, i, tagName);
        blocks.add(content);
        i = end;
      } else if (tagName == 'br') {
        blocks.add('<br>');
        i += tagMatch.group(0)!.length;
      } else {
        // Unknown tag — try to collect as paragraph
        final end2 = html.indexOf('<', i + 1);
        final text2 = end2 == -1 ? html.substring(i) : html.substring(i, end2);
        if (text2.trim().isNotEmpty) blocks.add('<p>$text2</p>');
        i = end2 == -1 ? html.length : end2;
      }
    }
  }
  return blocks;
}

/// Extract content between matching open/close tags, starting at [start].
/// Returns (fullHtmlFragment, indexAfterClosingTag).
(String, int) _extractTag(String html, int start, String tag) {
  final openRe = RegExp('<$tag[^>]*>', caseSensitive: false);
  final closeRe = RegExp('</$tag>', caseSensitive: false);

  // Find the opening tag end
  final firstMatch = openRe.firstMatch(html.substring(start));
  if (firstMatch == null) return (html.substring(start), html.length);
  final contentStart = start + firstMatch.end;

  // Walk forward counting nesting depth
  int depth = 1;
  int j = contentStart;
  while (j < html.length && depth > 0) {
    final sub = html.substring(j);
    final nextOpen  = openRe.firstMatch(sub);
    final nextClose = closeRe.firstMatch(sub);
    if (nextClose == null) break;
    if (nextOpen != null && nextOpen.start < nextClose.start) {
      depth++;
      j += nextOpen.end;
    } else {
      depth--;
      if (depth == 0) {
        final full = html.substring(start, j + nextClose.end);
        return (full, j + nextClose.end);
      }
      j += nextClose.end;
    }
  }
  return (html.substring(start), html.length);
}

Widget? _renderBlock(String block, {TextDirection dir = TextDirection.ltr}) {
  block = block.trim();
  if (block.isEmpty || block == '<br>') {
    return const SizedBox(height: 8);
  }

  // h2
  if (block.startsWith('<h2')) {
    final text = _stripTags(block);
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 4),
      child: Text(text, style: GoogleFonts.outfit(
        fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white)),
    );
  }
  // h3
  if (block.startsWith('<h3') || block.startsWith('<h4')) {
    final text = _stripTags(block);
    final isAccent = block.contains('class="accent"');
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 3),
      child: Text(text, style: GoogleFonts.outfit(
        fontSize: 14, fontWeight: FontWeight.w700,
        color: isAccent ? _accentCol : Colors.white.withValues(alpha: 0.9))),
    );
  }
  // <p> paragraph
  if (block.startsWith('<p')) {
    final inner = _innerHtml(block);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: _buildRichText(_parseInline(inner), dir: dir),
    );
  }
  // <div class="card"> card box
  if (block.startsWith('<div')) {
    // Extract inner HTML
    final inner = _innerHtml(block);
    // Detect border color from style
    final borderColorMatch = RegExp(r'border-color:\s*([^;"]+)').firstMatch(block);
    final borderColor = borderColorMatch != null
        ? _parseColor(borderColorMatch.group(1)!.trim())
        : _cardBorder;

    final children = <Widget>[];
    for (final sub in _splitBlocks(inner)) {
      final w = _renderBlock(sub, dir: dir);
      if (w != null) children.add(w);
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor.withValues(alpha: 0.55)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }
  // <ol> numbered list
  if (block.startsWith('<ol')) {
    final items = _extractListItems(block);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items.asMap().entries.map((e) {
        final i = e.key + 1;
        final inner = _parseInline(e.value);
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 24,
              child: Text('$i.', style: GoogleFonts.outfit(
                color: _accentCol, fontWeight: FontWeight.w700, fontSize: 13))),
            Expanded(child: _buildRichText(inner, dir: dir)),
          ]),
        );
      }).toList(),
    );
  }
  // <ul> bullet list
  if (block.startsWith('<ul')) {
    final items = _extractListItems(block);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items.map((item) {
        final inner = _parseInline(item);
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Padding(
              padding: const EdgeInsets.only(top: 5, right: 8),
              child: Container(width: 6, height: 6,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle, color: _accentCol)),
            ),
            Expanded(child: _buildRichText(inner, dir: dir)),
          ]),
        );
      }).toList(),
    );
  }
  return null;
}

/// Extract <li> items from an ol/ul block, preserving their inner HTML.
List<String> _extractListItems(String html) {
  final items = <String>[];
  final liRe = RegExp(r'<li[^>]*>(.*?)</li>', dotAll: true, caseSensitive: false);
  for (final m in liRe.allMatches(html)) {
    items.add(m.group(1)!.trim());
  }
  return items;
}

/// Get the inner HTML of a wrapping tag (first level only).
String _innerHtml(String block) {
  final firstClose = block.indexOf('>');
  if (firstClose == -1) return block;
  final lastOpen = block.lastIndexOf('</');
  if (lastOpen == -1) return block.substring(firstClose + 1);
  return block.substring(firstClose + 1, lastOpen).trim();
}

/// Strip all HTML tags from a string, returning plain text.
String _stripTags(String html) =>
    html.replaceAll(RegExp(r'<[^>]+>'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

/// Parse an inline HTML fragment into a list of (text, style) tuples.
List<(String, TextStyle)> _parseInline(String html) {
  final spans = <(String, TextStyle)>[];
  // Replace <br> and <br/> with newline
  html = html.replaceAll(RegExp(r'<br\s*/?>'), '\n');

  final base = GoogleFonts.outfit(color: Colors.white.withValues(alpha: 0.87), fontSize: 13, height: 1.5);
  int i = 0;
  while (i < html.length) {
    if (html[i] != '<') {
      final end = html.indexOf('<', i);
      final text = end == -1 ? html.substring(i) : html.substring(i, end);
      if (text.isNotEmpty) spans.add((text, base));
      i = end == -1 ? html.length : end;
    } else {
      // Parse tag
      final tagMatch = RegExp(r'^<(/?\w+)([^>]*)>').firstMatch(html.substring(i));
      if (tagMatch == null) { spans.add((html[i], base)); i++; continue; }
      final tagName = tagMatch.group(1)!.toLowerCase();
      final attrs   = tagMatch.group(2) ?? '';
      i += tagMatch.group(0)!.length;

      if (tagName.startsWith('/')) continue; // closing tag

      // Find the closing tag
      final closeTag = '</${tagName.replaceFirst('/', '')}>';
      final closeIdx = html.toLowerCase().indexOf(closeTag.toLowerCase(), i);
      final innerEnd = closeIdx == -1 ? html.length : closeIdx;
      final inner    = html.substring(i, innerEnd);
      final innerText = _stripTags(inner); // strip any nested tags within span
      i = closeIdx == -1 ? html.length : closeIdx + closeTag.length;

      TextStyle style;
      final classMatch = RegExp(r'class="([^"]*)"').firstMatch(attrs);
      final cls = classMatch?.group(1) ?? '';

      if (tagName == 'span' && cls.contains('accent')) {
        style = base.copyWith(color: _accentCol, fontWeight: FontWeight.w600);
      } else if (tagName == 'span' && cls.contains('highlight')) {
        style = base.copyWith(color: _highlightCol, fontWeight: FontWeight.w600);
      } else if (tagName == 'i' || tagName == 'em') {
        style = base.copyWith(fontStyle: FontStyle.italic);
      } else if (tagName == 'strong' || tagName == 'b') {
        style = base.copyWith(fontWeight: FontWeight.w700);
      } else if (tagName == 'h3') {
        // inline h3 inside list item
        style = base.copyWith(color: _accentCol, fontWeight: FontWeight.w700);
      } else {
        style = base;
      }
      if (innerText.isNotEmpty) spans.add((innerText, style));
    }
  }
  return spans;
}

Widget _buildRichText(List<(String, TextStyle)> spans, {TextDirection dir = TextDirection.ltr}) {
  if (spans.isEmpty) return const SizedBox.shrink();
  return Directionality(
    textDirection: dir,
    child: RichText(
      text: TextSpan(children: spans.map((s) => TextSpan(text: s.$1, style: s.$2)).toList()),
    ),
  );
}

Color _parseColor(String raw) {
  if (raw.startsWith('#')) {
    try {
      final hex = raw.replaceFirst('#', '');
      final val = int.parse(hex.length == 6 ? 'FF$hex' : hex, radix: 16);
      return Color(val);
    } catch (_) {}
  }
  return _cardBorder;
}

// ── Tutorial screen ────────────────────────────────────────────────────────────

class TutorialScreen extends ConsumerStatefulWidget {
  const TutorialScreen({super.key});
  @override ConsumerState<TutorialScreen> createState() => _TutorialScreenState();
}

class _TutorialScreenState extends ConsumerState<TutorialScreen> {
  String _section = 'intro';
  bool   _sidebarOpen = false; // for mobile drawer

  // Board state
  Map<String, BoardPolygon>? _polygons;
  Map<String, dynamic> _allEdges = {};
  List<Map<String, String>> _pieces = [];
  String? _selected;
  List<String> _targets = [];
  double _scale = 1, _offsetX = 0, _offsetY = 0;
  Offset _boardCenter = const Offset(205, 217);
  double _boardWidth = 680;  // resizable — default 2× original 340

  // Cached valid setup position (loaded once from backend on startup)
  List<Map<String, String>> _cachedSetupPieces = [];

  @override
  void initState() {
    super.initState();
    _loadBoard();
  }

  // ── Asset loading ──────────────────────────────────────────────────────────


  // ── Board loading ──────────────────────────────────────────────────────────

  Future<void> _loadBoard() async {
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final res = await http.get(Uri.parse('$base/api/boards/board'));
      if (!mounted || res.statusCode != 200) return;
      _parseBoard(jsonDecode(res.body) as Map<String, dynamic>);
      _loadSetupPosition(); // fetch valid setup in background
      _resetPieces();
    } catch (e) {
      debugPrint('Tutorial: board fetch error: $e');
    }
  }

  /// Fetch one valid end-of-setup position from the backend and store it.
  /// When ready it updates the board display if we are on setup_phase.
  Future<void> _loadSetupPosition() async {
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final res = await http.get(Uri.parse('$base/api/tutorial/random-setup'));
      if (!mounted || res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final pieces = (data['placements'] as List? ?? [])
          .map((e) => Map<String, String>.from(e as Map))
          .toList();
      if (mounted) {
        _cachedSetupPieces = pieces;
        if (_section == 'setup_phase') _resetPieces();
      }
    } catch (e) {
      debugPrint('Tutorial: setup position error: $e');
    }
  }

  void _parseBoard(Map<String, dynamic> data) {
    final raw = data['allPolygons'] as Map<String, dynamic>? ?? {};
    final polys = <String, BoardPolygon>{};
    double minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (final e in raw.entries) {
      try {
        final p = BoardPolygon.fromJson(e.value as Map<String, dynamic>);
        polys[e.key] = p;
        for (final pt in p.points) {
          if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
        }
      } catch (_) {}
    }
    if (mounted) setState(() {
      _polygons  = polys;
      _allEdges  = data['allEdges'] as Map<String, dynamic>? ?? {};
      _boardCenter = Offset((minX + maxX) / 2, (minY + maxY) / 2);
    });
  }

  void _resetPieces() {
    if (_section == 'setup_phase' && _cachedSetupPieces.isNotEmpty) {
      setState(() {
        _pieces   = List<Map<String, String>>.from(_cachedSetupPieces);
        _selected = null;
        _targets  = [];
      });
      return;
    }
    setState(() {
      _pieces  = List<Map<String, String>>.from(
          _presetsFor(_section).map((p) => Map<String, String>.from(p)));
      _selected = null;
      _targets  = [];
    });
  }

  void _onSectionChanged(String sec) {
    setState(() {
      _section = sec;
      _selected = null;
      _targets  = [];
      _sidebarOpen = false;
    });
    _resetPieces();
  }

  // ── Board interaction ──────────────────────────────────────────────────────

  Future<void> _onBoardTap(String polyName) async {
    if (_polygons == null) return;

    // If a piece is selected and this polygon is a target → apply move
    if (_selected != null && _targets.contains(polyName)) {
      await _applyMove(_selected!, polyName);
      return;
    }

    // Try to select a piece on this polygon
    final piece = _pieces.where((p) => p['pos'] == polyName).firstOrNull;
    if (piece == null) { setState(() { _selected = null; _targets = []; }); return; }

    // Toggle off if tapping the already-selected piece
    if (piece['id'] == _selected) {
      setState(() { _selected = null; _targets = []; });
      return;
    }

    await _fetchMoves(piece['id']!);
  }

  Future<void> _fetchMoves(String pieceId) async {
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final body = jsonEncode({
        'pieceId': pieceId,
        'pieces': _pieces,
        'board': {'allPolygons': {for (final e in (_polygons ?? {}).entries) e.key: e.value.toJson()}, 'allEdges': _allEdges},
      });
      final res = await http.post(Uri.parse('$base/api/tutorial/moves'),
        headers: {'Content-Type': 'application/json'}, body: body);
      if (!mounted || res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      setState(() {
        _selected = pieceId;
        _targets  = List<String>.from(data['targets'] as List? ?? []);
      });
    } catch (e) {
      debugPrint('Tutorial moves error: $e');
    }
  }

  Future<void> _applyMove(String pieceId, String target) async {
    try {
      final base = AppConfig.apiUrl.isEmpty ? '' : AppConfig.apiUrl;
      final body = jsonEncode({
        'pieceId': pieceId,
        'targetId': target,
        'pieces': _pieces,
        'board': {'allPolygons': {for (final e in (_polygons ?? {}).entries) e.key: e.value.toJson()}, 'allEdges': _allEdges},
      });
      final res = await http.post(Uri.parse('$base/api/tutorial/apply'),
        headers: {'Content-Type': 'application/json'}, body: body);
      if (!mounted || res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      setState(() {
        _pieces   = (data['pieces'] as List)
            .map((p) => Map<String, String>.from(p as Map))
            .toList();
        _selected = null;
        _targets  = [];
      });
    } catch (e) {
      debugPrint('Tutorial apply error: $e');
    }
  }

  // ── Board transform ──────────────────────────────────────────────────────

  void _computeTransform(Size size) {
    if (_polygons == null) return;
    double minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (final p in _polygons!.values) {
      for (final pt in p.points) {
        if (pt[0] < minX) minX = pt[0]; if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1]; if (pt[1] > maxY) maxY = pt[1];
      }
    }
    const pad = 50.0;
    final vbW = maxX - minX + pad * 2;
    final vbH = maxY - minY + pad * 2;
    final s = (size.width / vbW) < (size.height / vbH)
        ? size.width / vbW : size.height / vbH;
    _scale   = s;
    _offsetX = (size.width  - vbW * s) / 2 - (minX - pad) * s;
    _offsetY = (size.height - vbH * s) / 2 - (minY - pad) * s;
  }

  // ── Translation helpers ────────────────────────────────────────────────────

  String _menuLabel(String sec) => ref.tr('menu.$sec');

  String _sectionTitle(String sec) => ref.tr('sections.$sec.title');

  String _sectionContent(String sec) => ref.tr('sections.$sec.content');

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.of(context).size.width > 900;
    final lang = ref.watch(localeProvider).languageCode;
    final isRtl = _rtlLangs.contains(lang);
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: wide
            ? Row(children: [
                _buildSidebar(isRtl),
                Expanded(child: _buildContent(isRtl)),
                SizedBox(width: _boardWidth, child: _buildBoard()),
              ])
            : Column(children: [
                _buildMobileTopBar(isRtl),
                Expanded(child: _buildContent(isRtl)),
                SizedBox(height: 300, child: _buildBoard()),
                if (_sidebarOpen) _buildMobileDrawer(isRtl),
              ]),
      ),
    );
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────

  Widget _buildSidebar(bool isRtl) {
    return Container(
      width: 220,
      color: Colors.white.withValues(alpha: 0.03),
      child: Column(children: [
        // Header — back button + DEDAL / Tutorial title
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // ← Lobby above the title
            const LobbyBackButton(),
            const SizedBox(height: 10),
            Text('DEDAL', style: GoogleFonts.outfit(
              fontSize: 18, fontWeight: FontWeight.w900, color: DTheme.primary,
              letterSpacing: 4)),
            Text('Tutorial', style: GoogleFonts.outfit(
              color: Colors.white38, fontSize: 12, letterSpacing: 1)),
          ]),
        ),
        // Language dropdown
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
          child: _buildLangDropdown(),
        ),
        // Section list
        Expanded(child: ListView(children: _sections.map((sec) => _buildNavItem(sec)).toList())),
      ]),
    );
  }

  Widget _buildNavItem(String sec) {
    final active = sec == _section;
    return GestureDetector(
      onTap: () => _onSectionChanged(sec),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: active ? DTheme.primary.withValues(alpha: 0.12) : Colors.transparent,
          border: Border(left: BorderSide(
            color: active ? DTheme.primary : Colors.transparent, width: 3)),
        ),
        child: Text(_menuLabel(sec), style: GoogleFonts.outfit(
          fontSize: 13, fontWeight: active ? FontWeight.w700 : FontWeight.w400,
          color: active ? DTheme.primary : Colors.white60)),
      ),
    );
  }

  Widget _buildLangDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
        color: Colors.white.withValues(alpha: 0.04),
      ),
      child: DropdownButton<String>(
        value: ref.watch(localeProvider).languageCode,
        isExpanded: true,
        dropdownColor: const Color(0xFF1E293B),
        underline: const SizedBox(),
        style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
        icon: const Icon(Icons.expand_more, color: Colors.white54, size: 16),
        onChanged: (v) { if (v != null) ref.read(localeProvider.notifier).setLocale(v); },
        items: _languages.map((l) => DropdownMenuItem(
          value: l.$1,
          child: Text(l.$2, style: GoogleFonts.outfit(fontSize: 13)),
        )).toList(),
      ),
    );
  }

  // ── Content pane ───────────────────────────────────────────────────────────

  Widget _buildContent(bool isRtl) {
    final title   = _sectionTitle(_section);
    final content = _sectionContent(_section);
    final dir     = isRtl ? TextDirection.rtl : TextDirection.ltr;

    return Directionality(
      textDirection: dir,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: GoogleFonts.outfit(
              fontSize: 22, fontWeight: FontWeight.w800, color: DTheme.textMainDark)),
            const Divider(color: Colors.white12, height: 20),
            if (ref.watch(translationsProvider).isLoading)
              const Center(child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator()))
            else if (content.isEmpty)
              Text('No content.', style: GoogleFonts.outfit(color: Colors.white38))
            else
              ...renderHtml(content, dir: dir),
          ],
        ),
      ),
    );
  }

  // ── Board pane ─────────────────────────────────────────────────────────────

  Widget _buildBoard() {
    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
      child: Column(children: [
        // Mini header with resize slider
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
          child: Row(children: [
            Text(ref.tr('ui.interactive_board'), style: GoogleFonts.outfit(
              fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white54, letterSpacing: 0.5)),
            const Spacer(),
            // Width slider — allows resizing the board panel
            SizedBox(
              width: 90,
              child: Slider(
                value: _boardWidth,
                min: 280, max: 900,
                activeColor: DTheme.primary,
                inactiveColor: Colors.white12,
                onChanged: (v) => setState(() => _boardWidth = v),
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: _resetPieces,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.15))),
                child: Text(ref.tr('ui.reset'), style: GoogleFonts.outfit(
                  color: Colors.white54, fontSize: 11)),
              ),
            ),
          ]),
        ),
        // Board canvas
        Expanded(child: _polygons == null
            ? const Center(child: CircularProgressIndicator())
            : LayoutBuilder(builder: (_, c) {
                _computeTransform(c.biggest);
                return GestureDetector(
                  onTapUp: (d) {
                    final pt = d.localPosition;
                    // Board-space coordinates
                    final bx = (pt.dx - _offsetX) / _scale;
                    final by = (pt.dy - _offsetY) / _scale;
                    for (final e in _polygons!.entries) {
                      if (_pointInPolygon(bx, by, e.value.points)) {
                        _onBoardTap(e.key);
                        return;
                      }
                    }
                    setState(() { _selected = null; _targets = []; });
                  },
                  child: Stack(children: [
                    SvgPicture.string(
                      buildBoardSvg(
                        width:    c.biggest.width,
                        height:   c.biggest.height,
                        polygons: _polygons!,
                        allEdges: _allEdges,
                        legalMoveTargets: Set<String>.from(_targets),
                        scale: _scale, offsetX: _offsetX, offsetY: _offsetY,
                        boardCx: _boardCenter.dx, boardCy: _boardCenter.dy,
                        isFlipped: false,
                        colorTheme: 'default',
                        occupiedPolygons: _pieces.map((p) => p['pos']!).toList(),
                      ),
                      fit: BoxFit.none,
                    ),
                    // Pieces
                    for (final piece in _pieces)
                      _buildPieceOverlay(piece),
                  ]),
                );
              })),
      ]),
    );
  }

  // Drag state
  String? _draggingId;
  Offset _dragOffset = Offset.zero;

  Widget _buildPieceOverlay(Map<String, String> piece) {
    final pos  = piece['pos'] ?? '';
    final poly = _polygons?[pos];
    if (poly == null) return const SizedBox.shrink();
    final cx = poly.center[0] * _scale + _offsetX;
    final cy = poly.center[1] * _scale + _offsetY;
    final sz = (_scale * 36.0).clamp(24.0, 90.0);
    final isSelected = piece['id'] == _selected;
    final isDragging = piece['id'] == _draggingId;
    final side = piece['id']?.startsWith('white') == true ? 'white' : 'black';
    final pieceId = piece['id'] ?? '';

    final left = isDragging ? _dragOffset.dx - sz / 2 : cx - sz / 2;
    final top  = isDragging ? _dragOffset.dy - sz / 2 : cy - sz / 2;

    return Positioned(
      left: left, top: top, width: sz, height: sz,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          // Toggle off if tapping the already-selected piece
          if (_selected == pieceId) {
            setState(() { _selected = null; _targets = []; });
          } else {
            _fetchMoves(pieceId);
          }
        },
        onPanStart: (_) {
          // Select the piece and start dragging
          _fetchMoves(pieceId);
          setState(() {
            _draggingId = pieceId;
            _dragOffset = Offset(cx, cy);
          });
        },
        onPanUpdate: (d) {
          if (_draggingId == pieceId) {
            setState(() => _dragOffset += d.delta);
          }
        },
        onPanEnd: (_) {
          if (_draggingId != pieceId) return;
          // Convert drag position to board coords and find target polygon
          final bx = (_dragOffset.dx - _offsetX) / _scale;
          final by = (_dragOffset.dy - _offsetY) / _scale;
          String? hitPoly;
          for (final e in _polygons!.entries) {
            if (_pointInPolygon(bx, by, e.value.points)) {
              hitPoly = e.key;
              break;
            }
          }
          setState(() => _draggingId = null);
          if (hitPoly != null && _targets.contains(hitPoly)) {
            _applyMove(pieceId, hitPoly);
          }
        },
        child: Container(
          decoration: isSelected || isDragging
              ? BoxDecoration(shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: DTheme.primary.withValues(alpha: 0.8), blurRadius: 10, spreadRadius: 2)])
              : null,
          child: Opacity(
            opacity: isDragging ? 0.85 : 1.0,
            child: SvgPicture.string(
              buildPieceSvg(piece['type'] ?? 'soldier', side, isSelected: isSelected || isDragging),
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }

  bool _pointInPolygon(double x, double y, List<List<double>> pts) {
    bool inside = false;
    final n = pts.length;
    for (int i = 0, j = n - 1; i < n; j = i++) {
      final xi = pts[i][0], yi = pts[i][1];
      final xj = pts[j][0], yj = pts[j][1];
      if (((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // ── Mobile UI ──────────────────────────────────────────────────────────────

  Widget _buildMobileTopBar(bool isRtl) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)))),
      child: Row(children: [
        IconButton(
          icon: const Icon(Icons.menu, color: Colors.white70),
          onPressed: () => setState(() => _sidebarOpen = !_sidebarOpen),
        ),
        Text(_menuLabel(_section), style: GoogleFonts.outfit(
          fontSize: 15, fontWeight: FontWeight.w700, color: DTheme.textMainDark)),
        const Spacer(),
        _buildLangDropdown(),
      ]),
    );
  }

  Widget _buildMobileDrawer(bool isRtl) {
    return Positioned.fill(
      child: Stack(children: [
        GestureDetector(
          onTap: () => setState(() => _sidebarOpen = false),
          child: Container(color: Colors.black.withValues(alpha: 0.4)),
        ),
        Align(
          alignment: Alignment.topLeft,
          child: Container(
            width: 240,
            color: const Color(0xFF1A2840),
            child: _buildSidebar(isRtl),
          ),
        ),
      ]),
    );
  }
}
