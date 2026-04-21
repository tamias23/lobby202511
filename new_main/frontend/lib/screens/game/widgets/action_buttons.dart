import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme.dart';
import '../game_board.dart' show ColorTheme, ColorThemeX;

/// Full-width stacked action buttons matching the legacy Games.jsx panel.
/// Shown in the right-side (or bottom) panel of the game board.
class ActionButtons extends StatefulWidget {
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
  State<ActionButtons> createState() => _ActionButtonsState();
}

class _ActionButtonsState extends State<ActionButtons> {
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
              label: oppTurn
                  ? 'Waiting for opponent…'
                  : _passConfirm
                      ? 'Confirm Pass'
                      : (isSetup ? 'End Turn' : 'Pass Turn'),
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
                  // Mirror legacy: only show confirmation if passCount >= 2 (3rd pass triggers penalty)
                  if (widget.myPassCount >= 2) {
                    if (_passConfirm) {
                      setState(() => _passConfirm = false);
                      widget.onPassTurn();
                    } else {
                      setState(() => _passConfirm = true);
                    }
                  } else {
                    // No confirmation needed — just pass
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
              label: oppTurn ? 'Waiting for opponent…' : 'Random Setup',
              bgColor: oppTurn ? const Color(0xFF7F8C8D) : const Color(0xFF9B59B6),
              shadowColor: const Color(0xFF9B59B6),
              enabled: !oppTurn,
              onTap: widget.onRandomSetup,
            ),
            const SizedBox(height: 8),
          ],

          // ── Flip Board ───────────────────────────────────────────────────
          _WideBtn(
            label: widget.isFlipped ? 'Unflip Board' : 'Flip Board',
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
                        label: 'Confirm Resign',
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
                        label: 'Cancel',
                        bgColor: const Color(0xFF34495E),
                        enabled: true,
                        onTap: () => setState(() => _resignConfirm = false),
                      ),
                    ),
                  ])
                : _WideBtn(
                    label: 'Resign',
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
                widget.spectator
                    ? (turnChosenColorGlobal != null
                        ? '${widget.turn == 'white' ? 'White' : 'Black'} Color'
                        : '${widget.turn == 'white' ? 'White' : 'Black'} Deciding…')
                    : widget.myTurn
                        ? (myChosenColor != null ? '◆ Your Color' : 'Choose Color')
                        : (oppColor != null ? 'Opponent Color' : 'Opponent Deciding…'),
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0x73FFFFFF),
                  letterSpacing: 0.06,
                ),
              ),
            ),
            const SizedBox(height: 10),
            // Legacy: colorChosen[turn] ? [colorChosen[turn]] : allColors
            // turnChosenColor = my color if myTurn, opponent's if !myTurn
            // For spectators: always use the current turn's color
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
            Container(
              height: 1,
              color: const Color(0x33FFA500),
            ),
            const SizedBox(height: 10),
            const Center(
              child: Text(
                'MAGE LOCKED',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFF97316),
                  letterSpacing: 0.05,
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Center(
              child: Text(
                'Choose all 4 colors',
                style: TextStyle(
                  fontSize: 10,
                  color: Color(0x80FFFFFF),
                ),
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
                '${widget.colorsEverChosen.length} / 4 seen',
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0x73FFFFFF),
                ),
              ),
            ),
          ],
          // ── Settings accordion (─ board color theme) ──────────────────────
          const SizedBox(height: 10),
          _divider(),
          const SizedBox(height: 6),
          GestureDetector(
            onTap: () => setState(() => _settingsOpen = !_settingsOpen),
            child: Row(
              children: [
                const Icon(Icons.settings_outlined, size: 13, color: Colors.white38),
                const SizedBox(width: 6),
                Text('Settings', style: GoogleFonts.outfit(
                  fontSize: 11, color: Colors.white38, letterSpacing: 0.5)),
                const Spacer(),
                Icon(_settingsOpen ? Icons.expand_less : Icons.expand_more,
                  size: 14, color: Colors.white38),
              ],
            ),
          ),
          if (_settingsOpen) ...[
            const SizedBox(height: 8),
            Text('Board Colors', style: GoogleFonts.outfit(
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
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.white.withValues(alpha: widget.enabled ? 1.0 : 0.6),
            ),
          ),
        ),
      ),
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
