import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/bg_provider.dart';
import 'bubble_background.dart';

/// Global background layer rendered under every route.
/// Matched look-and-feel of the 6 legacy themes.
class AppBackground extends ConsumerWidget {
  const AppBackground({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bg = ref.watch(bgProvider);

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 600),
      child: SizedBox.expand(
        key: ValueKey(bg),
        child: _buildBg(bg),
      ),
    );
  }

  Widget _buildBg(AppBg bg) {
    switch (bg) {
      case AppBg.dark:
        return Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment.topRight,
              radius: 2.5,
              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
            ),
          ),
        );

      case AppBg.light:
        return Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFE2E8F0), Color(0xFFCBD5E1)],
            ),
          ),
        );

      case AppBg.rain:
        return const _RainBackground();

      case AppBg.bubble:
        return Container(
          color: const Color(0xFF2C3E50),
          child: const BubbleBackground(speedFactor: 1.0, randomColors: false),
        );

      case AppBg.bubbleSlow:
        return Container(
          color: const Color(0xFF2C3E50),
          child: const BubbleBackground(speedFactor: 0.33, randomColors: false),
        );

      case AppBg.bubbleColor:
        return Container(
          color: const Color(0xFF2C3E50),
          child: const BubbleBackground(speedFactor: 0.33, randomColors: true),
        );
    }
  }
}

// ── Rain background ───────────────────────────────────────────────────────────
/// Replicates: repeating-linear-gradient(105deg, #2c3e50 0, #2c3e50 15px, #34495e 15px, #34495e 16px)
class _RainBackground extends StatelessWidget {
  const _RainBackground();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: MediaQuery.of(context).size,
      painter: _RainPainter(),
    );
  }
}

class _RainPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Base fill
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFF2C3E50),
    );

    // CSS gradient direction 105° (measured from top, CW)
    // Direction vector: (sin105°, -cos105°) ≈ (0.966, 0.259)
    // Perpendicular (stripe direction): (-0.259, 0.966) — nearly vertical
    // We draw thin stripes (1px wide) every 16px along the gradient axis.
    const double periodPx = 16;       // full repeat period in CSS gradient units
    const double stripePx = 1;        // the thin darker line is 1px of the 16
    final double angleDeg = 105;
    final double angleRad = angleDeg * math.pi / 180;

    // Gradient axis unit vector (direction the gradient advances)
    final double gx = math.sin(angleRad);  //  0.966
    final double gy = -math.cos(angleRad); //  0.259

    // Stripe unit vector (perpendicular, along which stripes extend)
    final double sx = -gy; // -0.259
    final double sy =  gx; //  0.966

    // Projection of all four corners onto the gradient axis gives range
    final points = [
      Offset(0, 0), Offset(size.width, 0),
      Offset(0, size.height), Offset(size.width, size.height),
    ];
    double minProj = double.infinity, maxProj = -double.infinity;
    for (final p in points) {
      final proj = p.dx * gx + p.dy * gy;
      if (proj < minProj) minProj = proj;
      if (proj > maxProj) maxProj = proj;
    }

    final paint = Paint()
      ..color = const Color(0xFF34495E)
      ..strokeWidth = stripePx
      ..style = PaintingStyle.stroke;

    // Draw one line per period starting from the first before minProj
    double t = (minProj / periodPx).floorToDouble() * periodPx + (periodPx - stripePx / 2);
    while (t < maxProj) {
      // The stripe line passes through (t*gx, t*gy) in canvas space
      // and extends in direction (sx, sy). Clip to canvas by extending far.
      final cx = t * gx;
      final cy = t * gy;
      final far = size.width + size.height;
      canvas.drawLine(
        Offset(cx - sx * far, cy - sy * far),
        Offset(cx + sx * far, cy + sy * far),
        paint,
      );
      t += periodPx;
    }
  }

  @override
  bool shouldRepaint(_RainPainter old) => false;
}

// ── Theme toggle button ───────────────────────────────────────────────────────

/// Floating pill button at the bottom-right corner that cycles themes.
class ThemeToggleBtn extends ConsumerStatefulWidget {
  const ThemeToggleBtn({super.key});
  @override
  ConsumerState<ThemeToggleBtn> createState() => _ThemeToggleBtnState();
}

class _ThemeToggleBtnState extends ConsumerState<ThemeToggleBtn> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final bg = ref.watch(bgProvider);
    return Positioned(
      bottom: 16,
      right: 16,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit:  (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: () => ref.read(bgProvider.notifier).cycle(),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _hovered
                  ? Colors.white.withValues(alpha: 0.18)
                  : Colors.white.withValues(alpha: 0.09),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white.withValues(alpha: _hovered ? 0.3 : 0.14),
              ),
              boxShadow: _hovered
                  ? [const BoxShadow(color: Colors.black26, blurRadius: 12)]
                  : [],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(bg.emoji, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 6),
                Text(
                  bg.name.replaceAll('bubble', 'bubble ').trim(),
                  style: const TextStyle(
                    color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
