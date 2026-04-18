import 'package:flutter/material.dart';
import '../../../core/theme.dart';
import 'clock_widget.dart';

/// Player info bar — name, rating, clock, turn indicator.
/// Shown above (opponent) and below (me) the board.
class PlayerInfoBar extends StatelessWidget {
  final String name;
  final String role;
  final double? rating;
  final String side;            // 'white' | 'black'
  final bool isCurrentTurn;
  final int clockMs;
  final int? lastTurnTs;
  final bool isMyTurn;
  final bool isFlipped;

  const PlayerInfoBar({
    super.key,
    required this.name,
    required this.role,
    required this.rating,
    required this.side,
    required this.isCurrentTurn,
    required this.clockMs,
    required this.lastTurnTs,
    required this.isMyTurn,
    required this.isFlipped,
  });

  String _formatName() {
    if (role == 'guest' && name.startsWith('guest_')) {
      return 'guest_${name.substring(6, name.length > 13 ? 13 : name.length)}';
    }
    return name;
  }

  @override
  Widget build(BuildContext context) {
    final isActive = isCurrentTurn;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? DTheme.primary.withValues(alpha: 0.12) : DTheme.cardBgDark,
        border: Border(
          bottom: BorderSide(color: DTheme.borderDark),
          top: BorderSide(color: DTheme.borderDark),
        ),
      ),
      child: Row(
        children: [
          // Side indicator circle
          Container(
            width: 12, height: 12,
            decoration: BoxDecoration(
              color: side == 'white' ? Colors.white : Colors.black,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.grey.shade400, width: 1),
            ),
          ),
          const SizedBox(width: 8),

          // Name + rating
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatName(),
                  style: DTheme.body.copyWith(fontWeight: FontWeight.w700, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
                if (rating != null)
                  Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.star, size: 10, color: DTheme.textMutedDark),
                    const SizedBox(width: 2),
                    Text(rating!.toStringAsFixed(0), style: DTheme.bodyMuted.copyWith(fontSize: 11)),
                  ]),
              ],
            ),
          ),

          // Active turn indicator
          if (isActive)
            Container(
              width: 8, height: 8,
              margin: const EdgeInsets.only(right: 8),
              decoration: const BoxDecoration(
                color: DTheme.success,
                shape: BoxShape.circle,
              ),
            ),

          // Clock
          ClockWidget(
            initialMs: clockMs,
            isRunning: isMyTurn,
            lastTurnTs: lastTurnTs ?? 0,
          ),
        ],
      ),
    );
  }
}
