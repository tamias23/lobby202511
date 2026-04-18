import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Paints a single piece icon exactly matching the SVG PieceIcon component
/// from the legacy GameBoard.jsx.
///
/// Coordinate strategy:
///   canvas.translate(cx, cy)  ← centre on widget
///   canvas.scale(unit)        ← 1 SVG board-unit = unit pixels
///   where unit = size.width / 36.0
///   (the widget covers ±18 board-units so the selection halo r=18 just touches
///    the edges; piece bodies are ≤ ±12 board-units so they fit with room)
///
/// All shapes below are expressed in board-space coordinates AFTER the SVG
/// piece-level transform (scale / translate on the <g>) has been applied,
/// i.e. they are already in the same coordinate space as the polygon centres.
class PieceIconPainter extends CustomPainter {
  final String type;
  final String side;       // 'white' | 'black'
  final bool isSelected;
  final bool isEligible;

  const PieceIconPainter({
    required this.type,
    required this.side,
    this.isSelected = false,
    this.isEligible = false,
  });

  bool get isBlack => side == 'black' || side == 'yellow';
  Color get fill   => isBlack ? Colors.black : Colors.white;

  @override
  void paint(Canvas canvas, Size size) {
    final cx   = size.width  / 2;
    final cy   = size.height / 2;
    final unit = size.width  / 36.0; // 1 SVG board-unit in pixels

    canvas.save();
    canvas.translate(cx, cy);
    canvas.scale(unit);

    // ── Selection halo (legacy: circle r=18 fill=#f1c40f opacity=0.4) ────────
    if (isSelected) {
      canvas.drawCircle(Offset.zero, 18,
          Paint()..color = const Color(0x66F1C40F)); // 0x66 ≈ opacity 0.4
    }

    // ── Piece icon ────────────────────────────────────────────────────────────
    switch (type) {
      case 'minotaur': _minotaur(canvas);
      case 'soldier':  _soldier(canvas);
      case 'goddess':  _goddess(canvas);
      case 'witch':    _witch(canvas);
      case 'heroe':
      case 'king':     _heroe(canvas);
      case 'mage':     _mage(canvas);
      case 'siren':    _siren(canvas);
      case 'ghoul':    _ghoul(canvas);
      default:         _unknown(canvas, size);
    }

    canvas.restore();
  }

  // ── MINOTAUR ────────────────────────────────────────────────────────────────
  // SVG: <g scale(0.09)>
  //   <path d="M 0 0 A 10 25 0 0 1 110 110 Z" rotate(0/120/240) fill stroke=black strokeWidth=20>
  //   [black only] same path at scale(0.5), stroke=white strokeWidth=15
  // Board-space coords (all × 0.09):
  //   outer arm: (0,0) → (9.9,9.9), rx=0.9 ry=2.25, clockwise, largeArc=false
  //   inner arm: (0,0) → (4.95,4.95), rx=0.45 ry=1.125 (additionally × 0.5)
  void _minotaur(Canvas canvas) {
    final outerFill  = Paint()..color = fill  ..style = PaintingStyle.fill;
    final outerStrok = Paint()
      ..color      = Colors.black
      ..style      = PaintingStyle.stroke
      ..strokeWidth = 1.8; // 20 * 0.09 board-units

    final outerPath = _triskeleArmOuter();
    for (final deg in [0, 120, 240]) {
      canvas.save();
      canvas.rotate(deg * math.pi / 180);
      canvas.drawPath(outerPath, outerFill);
      canvas.drawPath(outerPath, outerStrok);
      canvas.restore();
    }

    if (isBlack) {
      final innerFill  = Paint()..color = Colors.black..style = PaintingStyle.fill;
      final innerStrok = Paint()
        ..color      = Colors.white
        ..style      = PaintingStyle.stroke
        ..strokeWidth = 0.675; // 15 * 0.09 * 0.5 board-units (no extra canvas.scale) ..isAntiAlias = true

      final innerPath = _triskeleArmInner();
      for (final deg in [0, 120, 240]) {
        canvas.save();
        canvas.rotate(deg * math.pi / 180);
        canvas.drawPath(innerPath, innerFill);
        canvas.drawPath(innerPath, innerStrok);
        canvas.restore();
      }
    }
  }

  /// Outer triskelion arm: SVG "M 0 0 A 10 25 0 0 1 110 110 Z" at scale(0.09).
  /// Flutter's arcToPoint implements the same spec as SVG arcs, including
  /// automatic radius scaling when the radii are too small to reach the endpoint.
  Path _triskeleArmOuter() {
    final p = Path();
    p.moveTo(0, 0);
    p.arcToPoint(
      const Offset(9.9, 9.9),                       // 110 × 0.09
      radius: const Radius.elliptical(0.9, 2.25),  // rx=10×0.09  ry=25×0.09
      clockwise: true,
      largeArc: false,
    );
    p.close();
    return p;
  }

  /// Inner arm: same arc additionally scaled × 0.5 (pre-applied to coords).
  Path _triskeleArmInner() {
    final p = Path();
    p.moveTo(0, 0);
    p.arcToPoint(
      const Offset(4.95, 4.95),                       // 9.9 × 0.5
      radius: const Radius.elliptical(0.45, 1.125),  // radii × 0.5
      clockwise: true,
      largeArc: false,
    );
    p.close();
    return p;
  }

  // ── SOLDIER ─────────────────────────────────────────────────────────────────
  // SVG: <g scale(0.9)>
  //   <ellipse rx=10 ry=10 fill, stroke=self, strokeWidth=4>
  //   <ellipse rx=12 ry=12 fill=none stroke=black strokeWidth=2>
  // In board-space: inner r=9, outer r=10.8
  void _soldier(Canvas canvas) {
    const rInner = 9.0;     // 10 * 0.9
    const rOuter = 10.8;    // 12 * 0.9

    canvas.drawCircle(Offset.zero, rInner, Paint()..color = fill..style = PaintingStyle.fill);
    canvas.drawCircle(Offset.zero, rInner, Paint()
      ..color = isBlack ? Colors.black : Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4 * 0.9
        ..isAntiAlias = true);
    canvas.drawCircle(Offset.zero, rOuter, Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2 * 0.9
        ..isAntiAlias = true);
  }

  // ── GODDESS ─────────────────────────────────────────────────────────────────
  // SVG: <g scale(0.23)>
  //   outer polygon "0,-55 50,15 0,55 -50,15" strokeWidth=8
  //   inner polygon "0,-15 20,10 0,20 -20,10" strokeWidth=4|8
  // Board-space (× 0.23):
  //   outer: (0,-12.65), (11.5,3.45), (0,12.65), (-11.5,3.45)
  //   inner: (0,-3.45),  (4.6,2.3),   (0,4.6),   (-4.6,2.3)
  void _goddess(Canvas canvas) {
    const s = 0.23; // SVG scale already applied to coordinates below

    final outer = _poly([
      const Offset(0, -55*s), const Offset(50*s, 15*s),
      const Offset(0,  55*s), const Offset(-50*s, 15*s),
    ]);
    canvas.drawPath(outer, Paint()..color = fill..style = PaintingStyle.fill);
    canvas.drawPath(outer, Paint()
      ..color = Colors.black..style = PaintingStyle.stroke..strokeWidth = 8*s
        ..isAntiAlias = true);

    final inner = _poly([
      const Offset(0, -15*s), const Offset(20*s, 10*s),
      const Offset(0,  20*s), const Offset(-20*s, 10*s),
    ]);
    canvas.drawPath(inner, Paint()..color = Colors.black..style = PaintingStyle.fill);
    canvas.drawPath(inner, Paint()
      ..color = isBlack ? Colors.white : Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = (isBlack ? 4.0 : 8.0) * s
        ..isAntiAlias = true);
  }

  // ── WITCH ───────────────────────────────────────────────────────────────────
  // SVG: <g translate(-40,-44)>
  //   polygon "40,32 30,50 50,50" strokeWidth=2
  // Board-space (after translate): (0,-12), (-10,6), (10,6)
  void _witch(Canvas canvas) {
    final tri = _poly([
      const Offset(0, -12), const Offset(-10, 6), const Offset(10, 6),
    ]);
    canvas.drawPath(tri, Paint()..color = fill..style = PaintingStyle.fill);
    canvas.drawPath(tri, Paint()
      ..color = Colors.black..style = PaintingStyle.stroke..strokeWidth = 2.0
        ..isAntiAlias = true);
  }

  // ── HEROE / KING ────────────────────────────────────────────────────────────
  void _heroe(Canvas canvas) {
    const s = 0.46;
    final pts = <Offset>[
      Offset((50-50)*s, (165-187)*s), Offset((55-50)*s, (180-187)*s),
      Offset((70-50)*s, (180-187)*s), Offset((60-50)*s, (190-187)*s),
      Offset((65-50)*s, (205-187)*s), Offset((50-50)*s, (195-187)*s),
      Offset((35-50)*s, (205-187)*s), Offset((40-50)*s, (190-187)*s),
      Offset((30-50)*s, (180-187)*s), Offset((45-50)*s, (180-187)*s),
    ];
    final crown = _poly(pts);
    canvas.drawPath(crown, Paint()..color = fill..style = PaintingStyle.fill);
    canvas.drawPath(crown, Paint()
      ..color = Colors.black..style = PaintingStyle.stroke..strokeWidth = 3*s
        ..isAntiAlias = true);
  }

  // ── MAGE ────────────────────────────────────────────────────────────────────
  // Exact SVG: <g transform="scale(0.04) translate(-255.77, -221.5)">
  // Board-space: hex vertices at r≈10, bigR=3.2, smallR=1.6, rings at 3.2/4.4/5.6
  //
  // WHITE draw order (matches JSX):
  //   1. 6× big black circles (r=3.2) at vertices   ← protrude outside hex
  //   2. white hexagon fill (stroke=black 1.4 wide)
  //   3. 6× small white circles (r=1.6) at vertices ← cap inner portion of bump
  //      → leaves visible black ring (1.6 board-units) outside hex at each vertex
  //   4-5. two concentric black rings at centre
  //
  // BLACK draw order:
  //   1. filled black hexagon (+ black stroke)
  //   2. 6× big black circles
  //   3. white / black / white concentric rings at centre
  void _mage(Canvas canvas) {
    const double s  = 0.04;
    const double tx = -255.77;
    const double ty = -221.5;

    // Hex vertex positions in board-space after scale(0.04) translate(-255.77,-221.5):
    final List<Offset> hexPts = [
      Offset((130.77 + tx) * s, (438.01 + ty) * s),  // (-5.00,  8.66)
      Offset((  5.77 + tx) * s, (221.50 + ty) * s),  // (-10.00, 0.00)
      Offset((130.77 + tx) * s, (  5.00 + ty) * s),  // (-5.00, -8.66)
      Offset((380.77 + tx) * s, (  5.00 + ty) * s),  // ( 5.00, -8.66)
      Offset((505.77 + tx) * s, (221.50 + ty) * s),  // ( 10.00, 0.00)
      Offset((380.77 + tx) * s, (438.01 + ty) * s),  // ( 5.00,  8.66)
    ];
    final hexPath = _poly(hexPts);

    const double bigR   = 80.0  * s;   // 3.2
    const double smallR = 40.0  * s;   // 1.6

    if (isBlack) {
      // 1. Filled black hexagon
      canvas.drawPath(hexPath,
          Paint()..color = Colors.black..style = PaintingStyle.fill);
      canvas.drawPath(hexPath, Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 30.0 * s
        ..isAntiAlias = true);

      // 2. Big black circles at corners
      for (final v in hexPts) {
        canvas.drawCircle(v, bigR, Paint()..color = Colors.black);
      }

      // 3. Concentric rings at centre: white / black / white
      canvas.drawCircle(Offset.zero, 80.0  * s, Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 30.0 * s
        ..isAntiAlias = true);
      canvas.drawCircle(Offset.zero, 110.0 * s, Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 20.0 * s
        ..isAntiAlias = true);
      canvas.drawCircle(Offset.zero, 140.0 * s, Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 30.0 * s
        ..isAntiAlias = true);

    } else {
      // WHITE MAGE
      // 1. Big black circles FIRST (protrude outside hex)
      for (final v in hexPts) {
        canvas.drawCircle(v, bigR, Paint()..color = Colors.black);
      }

      // 2. White hexagon covers the interior of the big circles
      canvas.drawPath(hexPath,
          Paint()..color = Colors.white..style = PaintingStyle.fill);
      canvas.drawPath(hexPath, Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 35.0 * s
        ..isAntiAlias = true);

      // 3. Small white circles cap inner portion → black ring visible outside
      for (final v in hexPts) {
        canvas.drawCircle(v, smallR, Paint()..color = Colors.white);
      }

      // 4-5. Two concentric black rings at centre
      canvas.drawCircle(Offset.zero, 80.0  * s, Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 35.0 * s
        ..isAntiAlias = true);
      canvas.drawCircle(Offset.zero, 140.0 * s, Paint()
        ..color = Colors.black
        ..style = PaintingStyle.stroke
        ..strokeWidth = 35.0 * s
        ..isAntiAlias = true);
    }
  }


  // ── SIREN ───────────────────────────────────────────────────────────────────
  // SVG: <g scale(0.8)>
  //   ellipse r=10 (white bg)
  //   hexagon r=14
  //   crosshair lines ±8 diagonal, ±10 horizontal/vertical
  //   circles ±6.5 / 5.5 (black) or ±6.5 / 4 (white)
  // Board-space: all × 0.8
  void _siren(Canvas canvas) {
    const s = 0.8;

    // White background circle
    canvas.drawCircle(Offset.zero, 10*s, Paint()..color = Colors.white);

    // Hexagonal body
    final hexPath = Path();
    for (int i = 0; i < 6; i++) {
      final a = (math.pi / 3) * i;
      final v = Offset(14*s * math.cos(a), 14*s * math.sin(a));
      i == 0 ? hexPath.moveTo(v.dx, v.dy) : hexPath.lineTo(v.dx, v.dy);
    }
    hexPath.close();
    canvas.drawPath(hexPath, Paint()..color = fill..style = PaintingStyle.fill);
    canvas.drawPath(hexPath, Paint()
      ..color = Colors.black..style = PaintingStyle.stroke..strokeWidth = 2*s
        ..isAntiAlias = true);

    // Crosshair (in board-space, at scale 0.8)
    final crossColor = isBlack ? Colors.white : Colors.black;
    final crossPaint = Paint()..color = crossColor..strokeWidth = 1*s..style = PaintingStyle.stroke;
    const d = 8.0 * s,  h = 10.0 * s;
    canvas.drawLine(Offset(-d, -d), Offset(d, d), crossPaint);
    canvas.drawLine(Offset(-d,  d), Offset(d, -d), crossPaint);
    canvas.drawLine(Offset(-h,  0), Offset(h,  0), crossPaint);
    canvas.drawLine(Offset(0, -h), Offset(0,   h), crossPaint);

    if (isBlack) {
      canvas.drawCircle(Offset.zero, 6.5*s, Paint()..color = Colors.white);
      canvas.drawCircle(Offset.zero, 5.5*s, Paint()..color = Colors.black);
    } else {
      canvas.drawCircle(Offset.zero, 6.5*s, Paint()..color = Colors.black);
      canvas.drawCircle(Offset.zero, 4.0*s, Paint()..color = Colors.white);
    }
  }

  // ── GHOUL ───────────────────────────────────────────────────────────────────
  // SVG: <g scale(0.8) translate(-9.5,-9.5)>
  //   rect x=0,y=0,w=19,h=19  → board-space: ±7.6 square
  //   inner rect x=7,y=7,w=5,h=5 → board-space: (-2,-2) to (2,2) for black
  void _ghoul(Canvas canvas) {
    const s   = 0.8;
    const ext = 9.5 * s;  // 7.6
    const iExt = 2.5 * s; // 2
    final outer = Rect.fromCenter(center: Offset.zero, width: ext*2, height: ext*2);
    canvas.drawRect(outer, Paint()..color = fill..style = PaintingStyle.fill);
    canvas.drawRect(outer, Paint()
      ..color = Colors.black..style = PaintingStyle.stroke..strokeWidth = 2*s
        ..isAntiAlias = true);

    if (isBlack) {
      final inner = Rect.fromCenter(center: Offset.zero, width: iExt*2, height: iExt*2);
      canvas.drawRect(inner, Paint()..color = Colors.black..style = PaintingStyle.fill);
      canvas.drawRect(inner, Paint()
        ..color = Colors.white..style = PaintingStyle.stroke..strokeWidth = 1*s
        ..isAntiAlias = true);
    }
  }

  // ── UNKNOWN fallback ────────────────────────────────────────────────────────
  void _unknown(Canvas canvas, Size size) {
    final tp = TextPainter(
      text: TextSpan(
        text: type.isNotEmpty ? type[0].toUpperCase() : '?',
        style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    // (already translated to centre)
    tp.paint(canvas, Offset(-tp.width / 2, -tp.height / 2));
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  Path _poly(List<Offset> pts) {
    final p = Path();
    p.moveTo(pts[0].dx, pts[0].dy);
    for (int i = 1; i < pts.length; i++) {
      p.lineTo(pts[i].dx, pts[i].dy);
    }
    p.close();
    return p;
  }

  @override
  bool shouldRepaint(PieceIconPainter old) =>
      old.type != type || old.side != side ||
      old.isSelected != isSelected || old.isEligible != isEligible;
}
