import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'config.dart';

/// Singleton Socket.io client service.
/// Mirrors the legacy `socket.js` — wraps socket_io_client with JWT auth,
/// reconnection strategy, and a simple listen/emit API.
class SocketService {
  SocketService._internal();
  static final SocketService instance = SocketService._internal();
  factory SocketService() => instance;

  io.Socket? _socket;     // nullable — avoids LateInitializationError
  bool _initialized = false;

  // ── Ping latency ─────────────────────────────────────────────────────────────

  final _pingController = StreamController<int>.broadcast();
  /// Stream of round-trip latency values in milliseconds, updated every ~10s.
  Stream<int> get latencyStream => _pingController.stream;

  Timer? _pingTimer;

  void _startPingLoop() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 10), (_) => _measurePing());
    // Fire once immediately so the profile has a value right away
    Future.delayed(const Duration(seconds: 1), _measurePing);
  }

  void _stopPingLoop() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  void _measurePing() {
    if (_socket == null || !_socket!.connected) return;
    final sent = DateTime.now().millisecondsSinceEpoch;
    _socket!.emitWithAck('client:ping', {'ts': sent}, ack: (data) {
      final rtt = DateTime.now().millisecondsSinceEpoch - sent;
      if (!_pingController.isClosed) _pingController.add(rtt);
    });
  }

  bool get _ready => _socket != null;

  // ── Initialization ──────────────────────────────────────────────────────────

  void init({String? token}) {
    if (_initialized) return;

    final url = AppConfig.socketUrl;
    final opts = io.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .disableAutoConnect()   // connect() is called explicitly
        .enableReconnection()
        .setReconnectionAttempts(99999)  // effectively unlimited; double.infinity.toInt() == 0 on web
        .setReconnectionDelay(1000)
        .setReconnectionDelayMax(5000)
        .build();

    _socket = io.io(url, opts);

    // Set auth separately — avoids null value in the options map
    if (token != null) {
      _socket!.auth = {'token': token};
    }

    // Start/stop ping loop with connection state
    _socket!.onConnect((_) => _startPingLoop());
    _socket!.onDisconnect((_) => _stopPingLoop());

    _initialized = true;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  /// Update JWT token and force a reconnect so the server sees the new token.
  void setToken(String? token) {
    if (!_ready) return;
    _socket!.auth = {'token': token};
    if (_socket!.connected) {
      _socket!.disconnect();
      _socket!.connect();
    }
  }

  // ── Connection ──────────────────────────────────────────────────────────────

  void connect() {
    if (!_ready) return;
    if (!_socket!.connected) _socket!.connect();
  }

  void disconnect() {
    if (!_ready) return;
    _socket!.disconnect();
  }

  bool get isConnected => _socket?.connected ?? false;

  // ── Emit ────────────────────────────────────────────────────────────────────

  void emit(String event, [dynamic data]) {
    if (!_ready) return;   // silently drop if socket not initialized
    _socket!.emit(event, data);
  }

  void emitWithAck(String event, dynamic data, {required Function ack}) {
    if (!_ready) return;
    _socket!.emitWithAck(event, data, ack: ack);
  }

  // ── Listen ──────────────────────────────────────────────────────────────────

  void on(String event, Function(dynamic) handler) {
    if (!_ready) return;
    _socket!.on(event, handler);
  }

  void off(String event, [Function(dynamic)? handler]) {
    if (!_ready) return;
    if (handler != null) {
      _socket!.off(event, handler);
    } else {
      _socket!.off(event);
    }
  }

  void once(String event, Function(dynamic) handler) {
    if (!_ready) return;
    _socket!.once(event, handler);
  }

  /// Register a callback that fires on every (re)connection.
  /// This is the right place to re-enter rooms (e.g. 'lobby').
  void onConnect(void Function() handler) {
    if (!_ready) return;
    _socket!.onConnect((_) => handler());
  }

  /// Register a callback for reconnection events specifically.
  void onReconnect(void Function() handler) {
    if (!_ready) return;
    _socket!.onReconnect((_) => handler());
  }

  // ── Connection state stream ──────────────────────────────────────────────────

  Stream<bool> get connectionStream {
    final controller = StreamController<bool>.broadcast();
    if (_ready) {
      _socket!.onConnect((_) => controller.add(true));
      _socket!.onDisconnect((_) => controller.add(false));
    }
    return controller.stream;
  }
}
