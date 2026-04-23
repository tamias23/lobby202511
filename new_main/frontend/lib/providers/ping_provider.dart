import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';

/// Streams the latest round-trip latency (ms) from the Socket.IO ping loop.
/// Null until the first ping completes.
final latencyProvider = StreamProvider<int>((ref) {
  return SocketService.instance.latencyStream;
});
