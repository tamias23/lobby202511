import 'package:auto_size_text/auto_size_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme.dart';
import '../../../providers/translations_provider.dart';
import '../game_board.dart' show ColorTheme, ColorThemeX;

/// Full-width stacked action buttons matching the legacy Games.jsx panel.
/// Shown in the right-side (or bottom) panel of the game board.
class ActionButtons extends ConsumerStatefulWidget {
  final String gameId;
  final String phase;
  final String side;
  final String turn;    // current turn: 'white' or 'black'
  final bool myTurn;
  final bool isFlipped;
  final bool spectator;

  // Color-choice state (Playing phase)
  final Map<String, dynamic> colorChosen;   // e.g. {'white': 'orange'}
  final bool mageUnlocked;
  final List<String> colorsEverChosen;

  /// My (current player's) pass count — used to decide when to confirm.
  final int myPassCount;

  // Color theme
  final ColorTheme colorTheme;
  final void Function(ColorTheme) onColorThemeChanged;

  final VoidCallback onFlip;
  final VoidCallback onEndTurnSetup;
  final VoidCallback onRandomSetup;
  final VoidCallback onPassTurn;
  final VoidCallback onResign;
  final void Function(String color) onColorSelected;

  const ActionButtons({
    super.key,
    required this.gameId,
    required this.phase,
    required this.side,
    required this.turn,
    required this.myTurn,
    required this.isFlipped,
    required this.spectator,
    required this.colorChosen,
    required this.mageUnlocked,
    required this.colorsEverChosen,
    this.myPassCount = 0,
    required this.colorTheme,
    required this.onColorThemeChanged,
    required this.onFlip,
    required this.onEndTurnSetup,
    required this.onRandomSetup,
    required this.onPassTurn,
    required this.onResign,
    required this.onColorSelected,
  });

  @override
  ConsumerState<ActionButtons> createState() => _ActionButtonsState();
}

class _ActionButtonsState extends ConsumerState<ActionButtons> {
  bool _resignConfirm  = false;
  bool _passConfirm    = false;  // shown only when myPassCount >= 2
  bool _settingsOpen   = false;  // collapsible settings panel

  // Legacy CSS named board colours — must match the default theme rendering
  static const _allColors = ['grey', 'green', 'blue', 'orange'];

  static const Map<String, Color> _cssColor = {
    'orange': Color(0xFFFFA500),
    'green':  Color(0xFF008000),
    'blue':   Color(0xFF0000FF),
    'grey':   Color(0xFF9CA3AF),
  };

  @override
  Widget build(BuildContext context) {
    final oppTurn = !widget.myTurn;
    final isSetup    = widget.phase == 'Setup';
    final isPlaying  = widget.phase == 'Playing';
    final isGameOver = widget.phase == 'GameOver';

    final myChosenColor  = widget.colorChosen[widget.side]  as String?;
    final oppSide        = widget.side == 'white' ? 'black' : 'white';
    final oppColor       = widget.colorChosen[oppSide] as String?;
    // For spectators, use the current turn's chosen color directly
    final turnChosenColorGlobal = widget.colorChosen[widget.turn] as String?;

    // ── Localized labels ──────────────────────────────────────────────────────
    final t = ref;
    final String turnKey = widget.turn == 'white' ? 'ui.white' : 'ui.black';

    final String endTurnLabel = oppTurn
        ? t.tr('ui.waiting_opponent')
        : _passConfirm
            ? t.tr('ui.confirm_pass')
            : (isSetup ? t.tr('ui.end_turn') : t.tr('ui.pass_turn'));

    final String colorPickerLabel = widget.spectator
        ? (turnChosenColorGlobal != null
            ? '${t.tr(turnKey)} ${t.tr('ui.white_color').split(' ').last}'
            : '${t.tr(turnKey)} ${t.tr('ui.white_deciding').split(' ').last}')
        : widget.myTurn
            ? (myChosenColor != null ? t.tr('ui.your_color') : t.tr('ui.choose_color'))
            : (oppColor != null ? t.tr('ui.opponent_color') : t.tr('ui.opponent_deciding'));

    // Spectator color label helper
    String spectatorColorLabel() {
      if (widget.turn == 'white') {
        return turnChosenColorGlobal != null
            ? '${t.tr('ui.white')} Color'
            : t.tr('ui.white_deciding');
      } else {
        return turnChosenColorGlobal != null
            ? '${t.tr('ui.black')} Color'
            : t.tr('ui.black_deciding');
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2332),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [

          // ── End Turn / Pass ──────────────────────────────────────────────
          if (isSetup || isPlaying) ...[
            _WideBtn(
              label: endTurnLabel,
              bgColor: oppTurn
                  ? const Color(0xFF7F8C8D)
                  : _passConfirm
                      ? const Color(0xFFC0392B)
                      : isSetup
                          ? const Color(0xFF2ECC71)
                          : const Color(0xFFE67E22),
              shadowColor: oppTurn
                  ? null
                  : _passConfirm
                      ? const Color(0xFFC0392B)
                      : isSetup
                          ? const Color(0xFF2ECC71)
                          : const Color(0xFFE67E22),
              enabled: !oppTurn,
              onTap: () {
                if (isSetup) {
                  widget.onEndTurnSetup();
                } else {
                  // Mirror legacy: only show confirmation if passCount >= 2
                  if (widget.myPassCount >= 2) {
                    if (_passConfirm) {
                      setState(() => _passConfirm = false);
                      widget.onPassTurn();
                    } else {
                      setState(() => _passConfirm = true);
                    }
                  } else {
                    widget.onPassTurn();
                  }
                }
              },
            ),
            const SizedBox(height: 8),
          ],

          // ── Random Setup ─────────────────────────────────────────────────
          if (isSetup && !widget.spectator) ...[
            _WideBtn(
              label: oppTurn ? t.tr('ui.waiting_opponent') : t.tr('ui.random_setup'),
              bgColor: oppTurn ? const Color(0xFF7F8C8D) : const Color(0xFF9B59B6),
              shadowColor: const Color(0xFF9B59B6),
              enabled: !oppTurn,
              onTap: widget.onRandomSetup,
            ),
            const SizedBox(height: 8),
          ],

          // ── Flip Board ───────────────────────────────────────────────────
          _WideBtn(
            label: widget.isFlipped ? t.tr('ui.unflip_board') : t.tr('ui.flip_board'),
            bgColor: const Color(0xFF34495E),
            shadowColor: const Color(0xFF34495E),
            enabled: true,
            onTap: widget.onFlip,
          ),
          const SizedBox(height: 8),

          // ── Resign ───────────────────────────────────────────────────────
          if (!widget.spectator && !isGameOver)
            _resignConfirm
                ? Row(children: [
                    Expanded(
                      child: _WideBtn(
                        label: t.tr('ui.confirm_resign'),
                        bgColor: const Color(0xFFC0392B),
                        shadowColor: const Color(0xFFC0392B),
                        enabled: true,
                        onTap: () {
                          setState(() => _resignConfirm = false);
                          widget.onResign();
                        },
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: _WideBtn(
                        label: t.tr('ui.cancel'),
                        bgColor: const Color(0xFF34495E),
                        enabled: true,
                        onTap: () => setState(() => _resignConfirm = false),
                      ),
                    ),
                  ])
                : _WideBtn(
                    label: t.tr('ui.resign'),
                    bgColor: const Color(0xFF7F8C8D),
                    enabled: true,
                    onTap: () => setState(() => _resignConfirm = true),
                  ),

          // ── Color Picker (Playing phase) ─────────────────────────────────
          if (isPlaying) ...[
            const SizedBox(height: 14),
            _divider(),
            const SizedBox(height: 10),
            Center(
              child: Text(
                widget.spectator ? spectatorColorLabel() : colorPickerLabel,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0x73FFFFFF),
                  letterSpacing: 0.06,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Builder(builder: (_) {
              final turnChosenColor = widget.spectator
                  ? turnChosenColorGlobal
                  : (widget.myTurn ? myChosenColor : oppColor);
              final colorsToShow = turnChosenColor != null ? [turnChosenColor] : _allColors;
              final canPick = widget.myTurn && myChosenColor == null;
              return Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: colorsToShow.map((color) {
                  final c = _cssColor[color] ?? Colors.grey;
                  return _ColorDot(
                    color: c,
                    enabled: canPick,
                    onTap: canPick ? () => widget.onColorSelected(color) : null,
                  );
                }).toList(),
              );
            }),
          ],

          // ── Mage Locked (Playing + not yet unlocked) ─────────────────────
          if (isPlaying && !widget.mageUnlocked) ...[
            const SizedBox(height: 14),
            Container(height: 1, color: const Color(0x33FFA500)),
            const SizedBox(height: 10),
            Center(
              child: Text(
                t.tr('ui.mage_locked'),
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFF97316),
                  letterSpacing: 0.05,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Center(
              child: Text(
                t.tr('ui.choose_all_4'),
                style: const TextStyle(fontSize: 10, color: Color(0x80FFFFFF)),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: _allColors.map((color) {
                final seen = widget.colorsEverChosen.contains(color);
                final c = _cssColor[color] ?? Colors.grey;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 400),
                    width: 26,
                    height: 26,
                    decoration: BoxDecoration(
                      color: c.withValues(alpha: seen ? 1.0 : 0.18),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: seen
                            ? Colors.white.withValues(alpha: 0.85)
                            : Colors.white.withValues(alpha: 0.12),
                        width: 2,
                      ),
                      boxShadow: seen
                          ? [BoxShadow(color: c.withValues(alpha: 0.6), blurRadius: 10)]
                          : [],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 6),
            Center(
              child: Text(
                t.tr('ui.seen_count').replaceAll('{n}', '${widget.colorsEverChosen.length}'),
                style: const TextStyle(fontSize: 10, color: Color(0x73FFFFFF)),
              ),
            ),
          ],

          // ── Settings accordion (board color theme) ────────────────────────
          const SizedBox(height: 10),
          _divider(),
          const SizedBox(height: 6),
          GestureDetector(
            onTap: () => setState(() => _settingsOpen = !_settingsOpen),
            child: Row(
              children: [
                const Icon(Icons.settings_outlined, size: 13, color: Colors.white38),
                const SizedBox(width: 6),
                Text(t.tr('ui.settings'), style: GoogleFonts.outfit(
                  fontSize: 11, color: Colors.white38, letterSpacing: 0.5)),
                const Spacer(),
                Icon(_settingsOpen ? Icons.expand_less : Icons.expand_more,
                  size: 14, color: Colors.white38),
              ],
            ),
          ),
          if (_settingsOpen) ...[
            const SizedBox(height: 8),
            Text(t.tr('ui.board_colors'), style: GoogleFonts.outfit(
              fontSize: 10, color: Colors.white38)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6, runSpacing: 6,
              children: ColorTheme.values.map((theme) {
                final active = theme == widget.colorTheme;
                return GestureDetector(
                  onTap: () => widget.onColorThemeChanged(theme),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      color: active
                          ? DTheme.primary.withValues(alpha: 0.18)
                          : Colors.white.withValues(alpha: 0.05),
                      border: Border.all(
                        color: active ? DTheme.primary : Colors.white.withValues(alpha: 0.12)),
                    ),
                    child: Text(theme.label, style: GoogleFonts.outfit(
                      fontSize: 11,
                      color: active ? DTheme.primary : Colors.white60,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w400)),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _divider() => Container(height: 1, color: Colors.white.withValues(alpha: 0.08));
}

// ── Wide full-width button ────────────────────────────────────────────────────

class _WideBtn extends StatefulWidget {
  final String label;
  final Color bgColor;
  final Color? shadowColor;
  final bool enabled;
  final VoidCallback onTap;

  const _WideBtn({
    required this.label,
    required this.bgColor,
    required this.enabled,
    required this.onTap,
    this.shadowColor,
  });

  @override
  State<_WideBtn> createState() => _WideBtnState();
}

class _WideBtnState extends State<_WideBtn> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    // LayoutBuilder captures the *actual* rendered parent width — the only
    // reliable source when the ancestor may give loose or unbounded constraints.
    return LayoutBuilder(
      builder: (context, bc) {
        // Horizontal space available inside the button (minus our side padding).
        final availW = (bc.maxWidth.isFinite ? bc.maxWidth : 220.0) - 12.0;

        // Measure label at the target font size with no width constraint.
        const baseSize = 13.0;
        final tp = TextPainter(
          text: TextSpan(
            text: widget.label,
            style: TextStyle(
              fontSize: baseSize,
              fontWeight: FontWeight.w600,
            ),
          ),
          maxLines: 1,
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: double.infinity);

        // Scale font down proportionally; never go below 8 pt.
        final fontSize = tp.width > availW && availW > 0
            ? (baseSize * availW / tp.width).clamp(8.0, baseSize)
            : baseSize;

        return MouseRegion(
          cursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
          onEnter: (_) => setState(() => _hovered = true),
          onExit:  (_) => setState(() => _hovered = false),
          child: GestureDetector(
            onTap: widget.enabled ? widget.onTap : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: widget.bgColor,
                borderRadius: BorderRadius.circular(8),
                boxShadow: widget.shadowColor != null && widget.enabled
                    ? [BoxShadow(
                        color: widget.shadowColor!.withValues(alpha: 0.35),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      )]
                    : [],
              ),
              transform: _hovered && widget.enabled
                  ? (Matrix4.identity()..scale(1.03))
                  : Matrix4.identity(),
              child: Text(
                widget.label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.clip,
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withValues(alpha: widget.enabled ? 1.0 : 0.6),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}


// ── Colour dot for colour picker ─────────────────────────────────────────────

class _ColorDot extends StatefulWidget {
  final Color color;
  final bool enabled;
  final VoidCallback? onTap;

  const _ColorDot({required this.color, required this.enabled, this.onTap});

  @override
  State<_ColorDot> createState() => _ColorDotState();
}

class _ColorDotState extends State<_ColorDot> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
      onEnter: (_) => widget.enabled ? setState(() => _hovered = true)  : null,
      onExit:  (_) => widget.enabled ? setState(() => _hovered = false) : null,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 44,
          height: 44,
          transform: _hovered ? (Matrix4.identity()..scale(1.18)) : Matrix4.identity(),
          transformAlignment: Alignment.center,
          decoration: BoxDecoration(
            color: widget.color,
            shape: BoxShape.circle,
            border: Border.all(
              color: widget.enabled
                  ? Colors.white.withValues(alpha: 0.85)
                  : Colors.white.withValues(alpha: 0.2),
              width: 3,
            ),
            boxShadow: widget.enabled
                ? [BoxShadow(
                    color: widget.color.withValues(alpha: 0.7),
                    blurRadius: 16,
                  )]
                : [],
          ),
        ),
      ),
    );
  }
}
