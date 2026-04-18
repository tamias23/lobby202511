import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';

/// Provides the global SocketService singleton.
final socketServiceProvider = Provider<SocketService>((ref) {
  return SocketService.instance;
});

/// Stream of connection state: true = connected, false = disconnected.
final socketConnectionProvider = StreamProvider<bool>((ref) {
  final service = ref.watch(socketServiceProvider);
  return service.connectionStream;
});
