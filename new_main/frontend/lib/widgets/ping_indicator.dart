import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/ping_provider.dart';

class PingIndicator extends ConsumerWidget {
  const PingIndicator({super.key});

  Color _pingColor(int ms) {
    if (ms < 80)  return const Color(0xFF00E676);  // green
    if (ms < 200) return Colors.amber;
    return Colors.redAccent;
  }

  String _pingLabel(int ms) {
    if (ms < 80)  return 'Excellent';
    if (ms < 200) return 'Good';
    return 'Poor';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latency = ref.watch(latencyProvider);

    return latency.when(
      loading: () => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 10, height: 10,
            child: CircularProgressIndicator(strokeWidth: 1.5, color: Colors.white38),
          ),
          const SizedBox(width: 6),
          Text('Measuring ping…',
              style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
        ],
      ),
      error: (_, __) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off, size: 14, color: Colors.redAccent),
          const SizedBox(width: 6),
          Text('No connection', style: GoogleFonts.outfit(fontSize: 12, color: Colors.redAccent)),
        ],
      ),
      data: (ms) {
        final color = _pingColor(ms);
        return AnimatedContainer(
          duration: const Duration(milliseconds: 400),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: color.withAlpha(25),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withAlpha(89)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.network_ping, size: 14, color: color),
              const SizedBox(width: 6),
              Text(
                '$ms ms',
                style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: color),
              ),
              const SizedBox(width: 6),
              Text(
                '· ${_pingLabel(ms)}',
                style: GoogleFonts.outfit(fontSize: 12, color: color.withAlpha(191)),
              ),
            ],
          ),
        );
      },
    );
  }
}
