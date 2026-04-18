import 'package:flutter/material.dart';
import '../core/theme.dart';

/// Glassmorphism panel — mirrors `.glass-panel` from legacy index.css
class GlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final double borderRadius;
  final Color? color;

  const GlassPanel({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = 18,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color ?? DTheme.cardBgDark,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: DTheme.borderDark, width: 1),
        boxShadow: const [
          BoxShadow(
            color: Color(0x59000000),
            blurRadius: 32,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}
