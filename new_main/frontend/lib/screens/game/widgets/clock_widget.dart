import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme.dart';

/// Animated countdown clock for a player.
class ClockWidget extends StatefulWidget {
  final int initialMs;
  final bool isRunning;   // true when it's this player's turn
  final int lastTurnTs;   // epoch ms of when this turn started
  final double fontSize;

  const ClockWidget({
    super.key,
    required this.initialMs,
    required this.isRunning,
    required this.lastTurnTs,
    this.fontSize = 20,
  });

  @override
  State<ClockWidget> createState() => _ClockWidgetState();
}

class _ClockWidgetState extends State<ClockWidget> {
  late int _currentMs;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _currentMs = _effectiveMs();
    if (widget.isRunning) _startTicker();
  }

  @override
  void didUpdateWidget(ClockWidget old) {
    super.didUpdateWidget(old);
    _currentMs = _effectiveMs();
    if (widget.isRunning && _ticker == null) {
      _startTicker();
    } else if (!widget.isRunning) {
      _stopTicker();
    }
  }

  int _effectiveMs() {
    if (!widget.isRunning || widget.lastTurnTs <= 0) return widget.initialMs;
    final elapsed = DateTime.now().millisecondsSinceEpoch - widget.lastTurnTs;
    return (widget.initialMs - elapsed).clamp(0, widget.initialMs);
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(milliseconds: 200), (_) {
      if (!mounted) return;
      setState(() => _currentMs = _effectiveMs());
    });
  }

  void _stopTicker() {
    _ticker?.cancel();
    _ticker = null;
  }

  @override
  void dispose() {
    _stopTicker();
    super.dispose();
  }

  String _format(int ms) {
    if (ms <= 0) return '0:00';
    final total = ms ~/ 1000;
    final m = total ~/ 60;
    final s = total % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isCritical = _currentMs < 30000;
    final color = _currentMs <= 0
        ? DTheme.danger
        : isCritical
            ? DTheme.accent
            : DTheme.textMainDark;

    return Text(
      _format(_currentMs),
      style: TextStyle(
        fontFamily: 'monospace',
        fontSize: widget.fontSize,
        fontWeight: FontWeight.w700,
        color: color,
        letterSpacing: 1,
      ),
    );
  }
}
