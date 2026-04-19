import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme.dart';
import '../../../models/models.dart';
import '../../../widgets/glass_panel.dart';

class GameOverOverlay extends StatelessWidget {
  final String gameId;
  final GameState gameState;
  final GameOverInfo? gameOverInfo;
  final RatingDelta? ratingDelta;
  final String side;
  final String? tournamentId;
  final VoidCallback onLobby;
  /// Serialized move list — passed to Analysis for pre-loaded review.
  final List<Map<String,dynamic>> gameMoves;
  final String? boardName;

  const GameOverOverlay({
    super.key,
    required this.gameId,
    required this.gameState,
    required this.gameOverInfo,
    required this.ratingDelta,
    required this.side,
    required this.tournamentId,
    required this.onLobby,
    this.gameMoves = const [],
    this.boardName,
  });

  @override
  Widget build(BuildContext context) {
    final winner = gameOverInfo?.winner;
    final reason = gameOverInfo?.reason ?? '';

    final isSpectator = side == 'spectator';

    final isWinner = !isSpectator && (
        (side == 'white' && winner == 'white') ||
        (side == 'black' && winner == 'black') ||
        (gameOverInfo?.winnerId != null && ratingDelta != null &&
         ((side == 'white' && gameOverInfo?.winnerId == ratingDelta?.whitePlayerId) ||
          (side == 'black' && gameOverInfo?.winnerId == ratingDelta?.blackPlayerId))));
    final isDraw = winner == 'draw';

    // Spectators see a neutral icon regardless of result
    final IconData icon;
    final String headline;
    final Color headlineColor;
    if (isSpectator) {
      icon = isDraw ? Icons.handshake_outlined : Icons.flag_outlined;
      headline = isDraw ? 'Draw!'
          : winner != null ? '${winner == "white" ? "White" : "Black"} Wins'
          : 'Game Over';
      headlineColor = isDraw ? DTheme.accent : DTheme.primary;
    } else {
      icon = isDraw
          ? Icons.handshake_outlined
          : (isWinner ? Icons.emoji_events : Icons.sentiment_very_dissatisfied);
      headline = isDraw
          ? 'Draw!'
          : (isWinner ? 'You Win!' : (winner != null ? '${winner == "white" ? "White" : "Black"} Wins' : 'Game Over'));
      headlineColor = isWinner ? DTheme.success : (isDraw ? DTheme.accent : DTheme.danger);
    }

    // Reason subtitle — neutral for spectators (no "you" references)
    final sub = isSpectator
        ? _reasonLabelNeutral(reason)
        : _reasonLabel(reason, isWinner);
    // Resolve the winner's display name from GameState
    final winnerName = winner == 'white'
        ? (gameState.whiteName ?? 'White')
        : winner == 'black'
            ? (gameState.blackName ?? 'Black')
            : null;

    return Positioned.fill(
      child: Container(
        color: Colors.black.withValues(alpha: 0.68),
        child: Center(
          child: GlassPanel(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 52, color: headlineColor),
                const SizedBox(height: 12),
                Text(headline, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: headlineColor)),
                if (winnerName != null && !isDraw) ...[
                  const SizedBox(height: 4),
                  Text('($winnerName)', style: TextStyle(
                    fontSize: 15, color: headlineColor.withValues(alpha: 0.75),
                    fontWeight: FontWeight.w500)),
                ],
                if (sub.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(sub, style: DTheme.bodyMuted),
                ],

                // Rating deltas
                if (ratingDelta != null) ...[
                  const SizedBox(height: 16),
                  _buildRatingRow(ratingDelta!),
                ],

                const SizedBox(height: 24),

                // Buttons
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ElevatedButton.icon(
                      onPressed: onLobby,
                      icon: const Icon(Icons.home_outlined, size: 16),
                      label: const Text('Lobby'),
                    ),
                    if (tournamentId != null) ...[
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: () => context.go('/tournament/$tournamentId'),
                        child: const Text('Tournament'),
                      ),
                    ],
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: () {
                        final record = _buildRecord();
                        context.go('/analysis', extra: record);
                      },
                      icon: const Icon(Icons.replay, size: 16),
                      label: const Text('Review'),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: () => _showDownload(context),
                      icon: const Icon(Icons.download, size: 16),
                      label: const Text('Download'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRatingRow(RatingDelta delta) {
    return Column(
      children: [
        Text('Rating Changes', style: DTheme.label.copyWith(color: DTheme.textMainDark)),
        const SizedBox(height: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _ratingDeltaChip('White', Colors.white, delta.whiteRatingOld, delta.whiteRating),
            const SizedBox(width: 12),
            _ratingDeltaChip('Black', const Color(0xFF444444), delta.blackRatingOld, delta.blackRating),
          ],
        ),
      ],
    );
  }

  Widget _ratingDeltaChip(String label, Color sideColor, double? oldR, double? newR) {
    final diff = (newR ?? 0) - (oldR ?? 0);
    final color = diff >= 0 ? DTheme.success : DTheme.danger;
    return Column(
      children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 9, height: 9, color: sideColor),
          const SizedBox(width: 4),
          Text(label, style: DTheme.bodyMuted.copyWith(fontSize: 11)),
        ]),
        Text(
          '${newR?.toStringAsFixed(0) ?? '—'}  (${diff >= 0 ? '+' : ''}${diff.toStringAsFixed(0)})',
          style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13),
        ),
      ],
    );
  }

  String _reasonLabel(String reason, bool isWinner) {
    switch (reason) {
      case 'time':
        return isWinner ? 'Victory on time! Your speed was superior.' : 'Ran out of time. The clock is a cruel master.';
      case 'resign':
        return isWinner ? 'Opponent has surrendered to your might.' : 'You have chosen to withdraw from the field.';
      case 'goddess_captured':
        return isWinner ? 'Victory! The enemy Goddess has been captured.' : 'Your Goddess has been captured. Defeat.';
      case 'aborted':
        return 'Game aborted (tournament ended)';
      case 'draw':
        return 'A hard-fought draw. Peace is restored.';
      default:
        return reason;
    }
  }

  String _reasonLabelNeutral(String reason) {
    switch (reason) {
      case 'time':         return 'Victory on time.';
      case 'resign':       return 'One side has resigned.';
      case 'goddess_captured': return 'The Goddess has been captured.';
      case 'aborted':      return 'Game aborted (tournament ended)';
      case 'draw':         return 'A hard-fought draw.';
      default:             return reason;
    }
  }

  /// Build a v3 record Map compatible with AnalysisScreen.
  Map<String, dynamic> _buildRecord() {
    return {
      'version': 3,
      'board_id': boardName ?? 'Template',
      'whiteName': gameState.whiteName ?? 'White',
      'blackName': gameState.blackName ?? 'Black',
      'winner': gameOverInfo?.winner,
      'reason': gameOverInfo?.reason ?? '',
      'timeControl': gameState.timeControl,
      'moves': gameMoves,
    };
  }

  void _showDownload(BuildContext context) {
    final json = jsonEncode(_buildRecord());
    showDialog(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF1E293B),
      title: Text('Game JSON', style: GoogleFonts.outfit(color: Colors.white)),
      content: SizedBox(
        width: 500, height: 280,
        child: SelectableText(json,
          style: const TextStyle(color: Colors.white70, fontSize: 11))),
      actions: [
        TextButton(
          onPressed: () {
            Clipboard.setData(ClipboardData(text: json));
            Navigator.pop(context);
          },
          child: Text('Copy to clipboard',
            style: GoogleFonts.outfit(color: DTheme.primary))),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Close',
            style: GoogleFonts.outfit(color: Colors.white54))),
      ],
    ));
  }
}
