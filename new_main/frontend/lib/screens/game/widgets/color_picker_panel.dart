import 'package:flutter/material.dart';
import '../../../core/theme.dart';

/// Color picker for the ColorChoice game phase.
/// Mirrors the legacy color-picker panel in GameBoard.jsx.
class ColorPickerPanel extends StatelessWidget {
  final ValueChanged<String> onColorSelected;

  const ColorPickerPanel({super.key, required this.onColorSelected});

  static const _colors = [
    ('orange', DTheme.polyOrange),
    ('green',  DTheme.polyGreen),
    ('blue',   DTheme.polyBlue),
    ('grey',   DTheme.polyGrey),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: DTheme.cardBgDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DTheme.borderDark),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Choose your color', style: DTheme.label.copyWith(color: DTheme.textMainDark, fontSize: 12)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.center,
            children: _colors.map((c) {
              return GestureDetector(
                onTap: () => onColorSelected(c.$1),
                child: _ColorSwatch(name: c.$1, color: c.$2),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _ColorSwatch extends StatefulWidget {
  final String name;
  final Color color;
  const _ColorSwatch({required this.name, required this.color});

  @override
  State<_ColorSwatch> createState() => _ColorSwatchState();
}

class _ColorSwatchState extends State<_ColorSwatch> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: widget.color,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: _hovered ? Colors.white : Colors.transparent,
            width: 2,
          ),
          boxShadow: _hovered
              ? [BoxShadow(color: widget.color.withValues(alpha: 0.6), blurRadius: 8)]
              : [],
        ),
        child: Tooltip(
          message: widget.name,
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}
