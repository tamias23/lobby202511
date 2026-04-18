import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

// ── Color palette matching the legacy JS colorChoices ────────────────────────
const _darkBubbleColor = Color(0xD90D1238); // rgba(13,18,56,0.85)

const _colorChoices = [
  Color(0xFF006400), // DarkGreen
  Color(0xFF556B2F), // DarkOliveGreen
  Color(0xFF00008B), // DarkBlue
  Color(0xFF2F4F4F), // DarkSlateGrey
  Color(0xFF808080), // Grey
  Color(0xFF808000), // Olive
  Color(0xFFFF4500), // OrangeRed
];

// ── Bubble physics object ─────────────────────────────────────────────────────

class _Bubble {
  double x, y, vx, vy, radius, mass;
  Color color;

  _Bubble({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.radius,
    required this.color,
  }) : mass = radius;

  void update(double w, double h) {
    x += vx;
    y += vy;
    if (x - radius <= 0)  { x = radius;       vx *= -1; }
    if (x + radius >= w)  { x = w - radius;   vx *= -1; }
    if (y - radius <= 0)  { y = radius;        vy *= -1; }
    if (y + radius >= h)  { y = h - radius;   vy *= -1; }
  }

  void draw(Canvas canvas, bool randomColors) {
    final paint = Paint()
      ..color = randomColors
          ? color.withValues(alpha: 0.8)
          : color;
    canvas.drawCircle(Offset(x, y), radius, paint);
  }
}

// ── Custom painter ────────────────────────────────────────────────────────────

class _BubblePainter extends CustomPainter {
  final List<_Bubble> bubbles;
  final bool randomColors;
  final Listenable repaint;

  _BubblePainter({required this.bubbles, required this.randomColors, required this.repaint})
      : super(repaint: repaint);

  @override
  void paint(Canvas canvas, Size size) {
    for (final b in bubbles) {
      b.draw(canvas, randomColors);
    }
  }

  @override
  bool shouldRepaint(_BubblePainter old) => true;
}

// ── Widget ────────────────────────────────────────────────────────────────────

/// Full-screen animated bubble background.
/// Ports the legacy BubbleBackground.jsx canvas physics 1:1:
///   • 65 bubbles, radius 5–30
///   • velocity × speedFactor
///   • elastic collision detection O(n²) — 2080 pairs @65 bubbles, fine at 60fps
///   • wall bouncing
class BubbleBackground extends StatefulWidget {
  final double speedFactor;
  final bool   randomColors;

  const BubbleBackground({
    super.key,
    this.speedFactor = 1.0,
    this.randomColors = false,
  });

  @override
  State<BubbleBackground> createState() => _BubbleBackgroundState();
}

class _BubbleBackgroundState extends State<BubbleBackground>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker;
  final _repaint = ValueNotifier<int>(0);
  final _rng = math.Random();
  final List<_Bubble> _bubbles = [];
  Size _size = Size.zero;

  static const int _numBubbles = 65;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((_) {
      if (_size != Size.zero) {
        _step();
        _repaint.value++;
      }
    })..start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _repaint.dispose();
    super.dispose();
  }

  void _init(Size size) {
    _size = size;
    _bubbles.clear();
    for (int i = 0; i < _numBubbles; i++) {
      final r = _rng.nextDouble() * 25 + 5;
      _bubbles.add(_Bubble(
        radius: r,
        x: _rng.nextDouble() * (size.width  - r * 2) + r,
        y: _rng.nextDouble() * (size.height - r * 2) + r,
        vx: (_rng.nextDouble() - 0.5) * 1.5 * widget.speedFactor,
        vy: (_rng.nextDouble() - 0.5) * 1.5 * widget.speedFactor,
        color: widget.randomColors
            ? _colorChoices[_rng.nextInt(_colorChoices.length)]
            : _darkBubbleColor,
      ));
    }
  }

  void _step() {
    final w = _size.width;
    final h = _size.height;
    // Random color flicker (on average once every 2 min at 60fps)
    for (final b in _bubbles) {
      if (widget.randomColors && _rng.nextDouble() < 1 / 7200) {
        b.color = _colorChoices[_rng.nextInt(_colorChoices.length)];
      }
      b.update(w, h);
    }
    // Elastic collision pairs
    for (int i = 0; i < _bubbles.length; i++) {
      for (int j = i + 1; j < _bubbles.length; j++) {
        _resolveCollision(_bubbles[i], _bubbles[j]);
      }
    }
  }

  static void _resolveCollision(_Bubble b1, _Bubble b2) {
    final dx = b2.x - b1.x;
    final dy = b2.y - b1.y;
    final dist = math.sqrt(dx * dx + dy * dy);
    if (dist >= b1.radius + b2.radius || dist == 0) return;

    final nx = dx / dist;
    final ny = dy / dist;
    final rvx = b2.vx - b1.vx;
    final rvy = b2.vy - b1.vy;
    final velAlongN = rvx * nx + rvy * ny;
    if (velAlongN > 0) return; // already separating

    const restitution = 1.0;
    double j = -(1 + restitution) * velAlongN;
    j /= 1 / b1.mass + 1 / b2.mass;

    final ix = j * nx;
    final iy = j * ny;
    b1.vx -= ix / b1.mass;
    b1.vy -= iy / b1.mass;
    b2.vx += ix / b2.mass;
    b2.vy += iy / b2.mass;

    // Separate overlapping bubbles
    final overlap = (b1.radius + b2.radius - dist) / 2;
    b1.x -= overlap * nx;
    b1.y -= overlap * ny;
    b2.x += overlap * nx;
    b2.y += overlap * ny;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (_, constraints) {
      final size = constraints.biggest;
      final sizeChanged = (_size.width - size.width).abs() +
                          (_size.height - size.height).abs() > 50;
      if (_bubbles.isEmpty || sizeChanged) {
        _init(size);
      }
      return CustomPaint(
        size: size,
        painter: _BubblePainter(
          bubbles: _bubbles,
          randomColors: widget.randomColors,
          repaint: _repaint,
        ),
      );
    });
  }
}
