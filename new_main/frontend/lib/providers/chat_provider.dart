import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';

// ── Chat message model (plain class, no freezed needed) ──────────────────────

class ChatMessage {
  final String id;
  final String userId;
  final String username;
  final String message;
  final DateTime createdAt;

  const ChatMessage({
    required this.id,
    required this.userId,
    required this.username,
    required this.message,
    required this.createdAt,
  });

  factory ChatMessage.fromMap(Map<String, dynamic> m) {
    DateTime ts;
    final raw = m['created_at'];
    if (raw is String) {
      ts = DateTime.tryParse(raw)?.toLocal() ?? DateTime.now();
    } else if (raw is num) {
      ts = DateTime.fromMillisecondsSinceEpoch(raw.toInt()).toLocal();
    } else {
      ts = DateTime.now();
    }
    return ChatMessage(
      id: m['id'] as String? ?? '',
      userId: m['user_id'] as String? ?? '',
      username: m['username'] as String? ?? '?',
      message: m['message'] as String? ?? '',
      createdAt: ts,
    );
  }
}

// ── Chat state ───────────────────────────────────────────────────────────────

class ChatState {
  final List<ChatMessage> messages;
  final bool loading;
  final String? error;
  final int maxChars;
  final int rateLimitMs;

  const ChatState({
    this.messages = const [],
    this.loading = true,
    this.error,
    this.maxChars = 300,
    this.rateLimitMs = 2000,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? loading,
    Object? error = _sentinel,
    int? maxChars,
    int? rateLimitMs,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      loading: loading ?? this.loading,
      error: error == _sentinel ? this.error : error as String?,
      maxChars: maxChars ?? this.maxChars,
      rateLimitMs: rateLimitMs ?? this.rateLimitMs,
    );
  }
}

const _sentinel = Object();

// ── Provider ─────────────────────────────────────────────────────────────────

final chatProvider = NotifierProvider<ChatNotifier, ChatState>(() {
  return ChatNotifier();
});

class ChatNotifier extends Notifier<ChatState> {
  final _socket = SocketService.instance;

  @override
  ChatState build() {
    _registerListeners();
    // Re-request lobby state so we catch chat data even if lobby_state
    // was already emitted before this provider was created.
    _socket.emit('enter_lobby');
    ref.onDispose(_removeListeners);
    return const ChatState();
  }

  // ── Socket listeners ────────────────────────────────────────────────────────

  void _onLobbyState(dynamic rawData) {
    try {
      final d = Map<String, dynamic>.from(rawData as Map);

      // Parse chat config
      int maxChars = 300;
      int rateLimitMs = 2000;
      if (d['chatConfig'] is Map) {
        final cfg = Map<String, dynamic>.from(d['chatConfig'] as Map);
        maxChars = (cfg['max_chars'] as num?)?.toInt() ?? 300;
        rateLimitMs = (cfg['rate_limit_ms'] as num?)?.toInt() ?? 2000;
      }

      // Parse chat messages
      List<ChatMessage> messages = [];
      if (d['chatMessages'] is List) {
        messages = (d['chatMessages'] as List)
            .map((e) => ChatMessage.fromMap(Map<String, dynamic>.from(e as Map)))
            .toList();
      }

      state = state.copyWith(
        messages: messages,
        loading: false,
        maxChars: maxChars,
        rateLimitMs: rateLimitMs,
      );
    } catch (e) {
      if (kDebugMode) print('[Chat] Failed to parse lobby_state chat data: $e');
      state = state.copyWith(loading: false);
    }
  }

  void _onNewMessage(dynamic data) {
    try {
      final m = ChatMessage.fromMap(Map<String, dynamic>.from(data as Map));
      final updated = [...state.messages, m];
      state = state.copyWith(messages: updated);
    } catch (e) {
      if (kDebugMode) print('[Chat] Failed to parse new message: $e');
    }
  }

  void _onDeleteMessage(dynamic data) {
    try {
      final d = Map<String, dynamic>.from(data as Map);
      final id = d['id'] as String?;
      if (id != null) {
        state = state.copyWith(
          messages: state.messages.where((m) => m.id != id).toList(),
        );
      }
    } catch (e) {
      if (kDebugMode) print('[Chat] Failed to handle delete_message: $e');
    }
  }

  void _registerListeners() {
    _socket.on('lobby_state', _onLobbyState);
    _socket.on('chat:new_message', _onNewMessage);
    _socket.on('chat:delete_message', _onDeleteMessage);
  }

  void _removeListeners() {
    _socket.off('lobby_state', _onLobbyState);
    _socket.off('chat:new_message', _onNewMessage);
    _socket.off('chat:delete_message', _onDeleteMessage);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  void sendMessage(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    _socket.emitWithAck('chat:send', {'message': trimmed}, ack: (response) {
      final res = Map<String, dynamic>.from(response as Map);
      if (res['success'] != true) {
        state = state.copyWith(error: res['error'] as String? ?? 'Failed to send.');
      }
    });
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}
