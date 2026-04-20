import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';
import '../models/models.dart';

/// Recursively convert a Map<dynamic,dynamic> (as delivered by Socket.IO)
/// to Map<String,dynamic> so that generated fromJson code doesn't throw
/// in compiled dart2js mode.
Map<String, dynamic> _deepMap(Map raw) {
  return raw.map((k, v) {
    final value = v is Map ? _deepMap(v) : (v is List ? _deepList(v) : v);
    return MapEntry(k as String, value);
  });
}

List<dynamic> _deepList(List raw) {
  return raw.map((v) => v is Map ? _deepMap(v) : (v is List ? _deepList(v) : v)).toList();
}

// ── Lobby state ───────────────────────────────────────────────────────────────

class LobbyState {
  final List<GameRequest> gameRequests;
  final List<ActiveGame> activeGames;
  final LiveStats stats;
  final List<BotInfo> availableBots;
  final List<TournamentSummary> openTournaments;
  final List<TournamentSummary> activeTournaments;
  final bool tournamentsEnabled;
  final String? myRequestId;
  final String? notification;
  final String notifType;

  const LobbyState({
    this.gameRequests = const [],
    this.activeGames = const [],
    this.stats = const LiveStats(),
    this.availableBots = const [],
    this.openTournaments = const [],
    this.activeTournaments = const [],
    this.tournamentsEnabled = false,
    this.myRequestId,
    this.notification,
    this.notifType = 'info',
  });

  LobbyState copyWith({
    List<GameRequest>? gameRequests,
    List<ActiveGame>? activeGames,
    LiveStats? stats,
    List<BotInfo>? availableBots,
    List<TournamentSummary>? openTournaments,
    List<TournamentSummary>? activeTournaments,
    bool? tournamentsEnabled,
    String? myRequestId,
    Object? notification = _sentinel,
    String? notifType,
  }) {
    return LobbyState(
      gameRequests: gameRequests ?? this.gameRequests,
      activeGames: activeGames ?? this.activeGames,
      stats: stats ?? this.stats,
      availableBots: availableBots ?? this.availableBots,
      openTournaments: openTournaments ?? this.openTournaments,
      activeTournaments: activeTournaments ?? this.activeTournaments,
      tournamentsEnabled: tournamentsEnabled ?? this.tournamentsEnabled,
      myRequestId: myRequestId ?? this.myRequestId,
      notification: notification == _sentinel ? this.notification : notification as String?,
      notifType: notifType ?? this.notifType,
    );
  }
}

// ignore: prefer_void_to_null
const _sentinel = Object();

// ── Provider ──────────────────────────────────────────────────────────────────

final lobbyProvider = NotifierProvider<LobbyNotifier, LobbyState>(() {
  return LobbyNotifier();
});

class LobbyNotifier extends Notifier<LobbyState> {
  final _socket = SocketService.instance;

  @override
  LobbyState build() {
    _registerListeners();
    // Enter lobby now (buffered if socket not yet connected)
    _socket.emit('enter_lobby');
    // Also re-enter lobby on every (re)connection so the new server-side
    // socket joins the 'lobby' room again. Critical for mobile where
    // reconnections are frequent (network changes, sleep/wake, LB timeouts).
    _socket.onConnect(() {
      _socket.emit('enter_lobby');
    });
    ref.onDispose(_removeListeners);
    return const LobbyState();
  }

  // ── Socket listeners ────────────────────────────────────────────────────────

  void _onLobbyState(dynamic data) => _applyLobbyData(data);
  void _onLobbyUpdate(dynamic data) => _applyLobbyData(data);

  void _onRequestCreated(dynamic data) {
    final d = Map<String, dynamic>.from(data as Map);
    state = state.copyWith(
      myRequestId: d['requestId'] as String?,
      notification: 'Game request posted! Waiting for an opponent…',
      notifType: 'success',
    );
  }

  void _onRequestError(dynamic data) {
    final d = Map<String, dynamic>.from(data as Map);
    state = state.copyWith(
      notification: d['message'] as String? ?? 'Request error.',
      notifType: 'error',
    );
  }

  void _onBotError(dynamic data) {
    final d = Map<String, dynamic>.from(data as Map);
    state = state.copyWith(
      notification: 'Bot: ${d['message'] ?? 'Bot error.'}',
      notifType: 'error',
    );
  }

  void _applyLobbyData(dynamic rawData) {
    final Map<String, dynamic> d;
    try {
      d = Map<String, dynamic>.from(rawData as Map);
    } catch (e) {
      if (kDebugMode) print('[Lobby] Failed to cast lobby data: $e');
      return;
    }

    LobbyState next = state;

    try {
      if (d['gameRequests'] != null) {
        next = next.copyWith(
          gameRequests: (d['gameRequests'] as List)
              .map((e) => GameRequest.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList(),
        );
      }
    } catch (e) { if (kDebugMode) print('[Lobby] gameRequests: $e'); }

    try {
      if (d['activeGames'] != null) {
        next = next.copyWith(
          activeGames: (d['activeGames'] as List)
              .map((e) => ActiveGame.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList(),
        );
      }
    } catch (e) { if (kDebugMode) print('[Lobby] activeGames: $e'); }

    try {
      if (d['stats'] != null) {
        next = next.copyWith(
          stats: LiveStats.fromJson(Map<String, dynamic>.from(d['stats'] as Map)),
        );
      }
    } catch (e) { if (kDebugMode) print('[Lobby] stats: $e'); }

    try {
      if (d['available_bots'] != null) {
        next = next.copyWith(
          availableBots: (d['available_bots'] as List)
              .map((e) => BotInfo.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList(),
        );
      }
    } catch (e) { if (kDebugMode) print('[Lobby] available_bots: $e'); }

    try {
      if (d['tournaments'] != null) {
        final t = Map<String, dynamic>.from(d['tournaments'] as Map);
        next = next.copyWith(
          tournamentsEnabled: t['enabled'] != false,
          openTournaments: ((t['openTournaments'] as List?) ?? [])
              .map((e) => TournamentSummary.fromJson(_deepMap(e as Map)))
              .toList(),
          activeTournaments: ((t['activeTournaments'] as List?) ?? [])
              .map((e) => TournamentSummary.fromJson(_deepMap(e as Map)))
              .toList(),
        );
      }
    } catch (e) { if (kDebugMode) print('[Lobby] tournaments: $e'); }

    state = next;
  }

  void _registerListeners() {
    _socket.on('lobby_state', _onLobbyState);
    _socket.on('lobby_update', _onLobbyUpdate);
    _socket.on('request_created', _onRequestCreated);
    _socket.on('request_error', _onRequestError);
    _socket.on('bot_error', _onBotError);
  }

  void _removeListeners() {
    _socket.off('lobby_state', _onLobbyState);
    _socket.off('lobby_update', _onLobbyUpdate);
    _socket.off('request_created', _onRequestCreated);
    _socket.off('request_error', _onRequestError);
    _socket.off('bot_error', _onBotError);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  void createGameRequest({
    required int minutes,
    required int increment,
    required String? userId,
    required String? username,
    required String role,
    String? boardId,
  }) {
    if (state.myRequestId != null) {
      showNotif('You already have an open request. Cancel it first.', 'error');
      return;
    }
    _socket.emit('create_game_request', {
      'timeControl': {'minutes': minutes, 'increment': increment},
      'boardId': boardId,
      'userId': userId,
      'username': username,
      'role': role,
    });
  }

  void cancelGameRequest() {
    if (state.myRequestId == null) return;
    _socket.emit('cancel_game_request', {'requestId': state.myRequestId});
    state = state.copyWith(myRequestId: null);
    showNotif('Request cancelled.', 'info');
  }

  void acceptGameRequest(GameRequest req, {String? userId, String? username, String role = 'guest'}) {
    if (req.requestId == state.myRequestId) {
      showNotif("That's your own request!", 'error');
      return;
    }
    _socket.emit('accept_game_request', {
      'requestId': req.requestId,
      'userId': userId,
      'username': username,
      'role': role,
    });
  }

  void createBotGame({
    required String? userId,
    required String? username,
    required String role,
    required int minutes,
    required int increment,
    required String agentType,
    required String modelName,
    int? budgetMs,
  }) {
    _socket.emit('create_bot_game', {
      'userId': userId,
      'username': username,
      'role': role,
      'timeControl': {'minutes': minutes, 'increment': increment},
      'botConfig': {
        'type': agentType,
        'modelName': modelName,
        if (budgetMs != null) 'budgetMs': budgetMs,
      },
    });
  }

  void joinTournament(String tournamentId, {String? password}) {
    _socket.emit('join_tournament', {
      'tournamentId': tournamentId,
      if (password != null) 'password': password,
    });
  }

  void clearNotification() {
    state = state.copyWith(notification: null);
  }

  void showNotif(String msg, String type) {
    state = state.copyWith(notification: msg, notifType: type);
  }
}
