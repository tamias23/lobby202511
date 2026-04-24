import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';
import '../models/models.dart';

// ── Deep-map helper (socket delivers Map<dynamic,dynamic> in dart2js) ─────────

Map<String, dynamic> _deepMap(Map raw) {
  return raw.map((k, v) {
    dynamic val;
    if (v is Map)       val = _deepMap(v);
    else if (v is List) val = _deepList(v);
    else                val = v;
    return MapEntry(k.toString(), val);
  });
}

List<dynamic> _deepList(List raw) =>
    raw.map((v) => v is Map ? _deepMap(v) : (v is List ? _deepList(v) : v)).toList();

// ── Per-game state ─────────────────────────────────────────────────────────────

class GameBoardState {
  final GameState? gameState;
  final List<String> legalMoves;
  final List<String> eligiblePieceIds;
  final String? selectedPieceId;
  final GameOverInfo? gameOverInfo;
  final RatingDelta? ratingDelta;
  final bool isSocketDisconnected;
  final String? notification;

  const GameBoardState({
    this.gameState,
    this.legalMoves = const [],
    this.eligiblePieceIds = const [],
    this.selectedPieceId,
    this.gameOverInfo,
    this.ratingDelta,
    this.isSocketDisconnected = false,
    this.notification,
  });

  GameBoardState copyWith({
    GameState? gameState,
    List<String>? legalMoves,
    List<String>? eligiblePieceIds,
    Object? selectedPieceId = _sentinel,
    Object? gameOverInfo = _sentinel,
    Object? ratingDelta = _sentinel,
    bool? isSocketDisconnected,
    Object? notification = _sentinel,
  }) {
    return GameBoardState(
      gameState: gameState ?? this.gameState,
      legalMoves: legalMoves ?? this.legalMoves,
      eligiblePieceIds: eligiblePieceIds ?? this.eligiblePieceIds,
      selectedPieceId: selectedPieceId == _sentinel ? this.selectedPieceId : selectedPieceId as String?,
      gameOverInfo: gameOverInfo == _sentinel ? this.gameOverInfo : gameOverInfo as GameOverInfo?,
      ratingDelta: ratingDelta == _sentinel ? this.ratingDelta : ratingDelta as RatingDelta?,
      isSocketDisconnected: isSocketDisconnected ?? this.isSocketDisconnected,
      notification: notification == _sentinel ? this.notification : notification as String?,
    );
  }
}

const _sentinel = Object();

// ── Provider — Riverpod 3 family via constructor arg ─────────────────────────

/// Usage: ref.watch(gameProvider('gameId-hash'))
final gameProvider = NotifierProvider.family<GameNotifier, GameBoardState, String>(
  (gameId) => GameNotifier(gameId),
);

class GameNotifier extends Notifier<GameBoardState> {
  final _socket = SocketService.instance;
  final String _gameId;

  GameNotifier(this._gameId);

  @override
  GameBoardState build() {
    _registerListeners();
    _socket.emit('join_game_room', {'gameId': _gameId});
    ref.onDispose(_dispose);
    return const GameBoardState();
  }

  void applyInitialState(Map<String, dynamic> raw, String side) {
    final gs = _parseGameState(raw, side);
    state = state.copyWith(gameState: gs);
  }

  // ── Socket listeners ──────────────────────────────────────────────────────

  void _onGameUpdate(dynamic data) {
    final d = _deepMap(data as Map);
    final gs = state.gameState;
    if (gs == null) return;

    GameState updated = gs;
    if (d['pieces'] != null) {
      updated = updated.copyWith(
        pieces: (d['pieces'] as List)
            .map((e) => Piece.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
    }
    if (d['turn'] != null) updated = updated.copyWith(turn: d['turn'] as String);
    if (d['phase'] != null) updated = updated.copyWith(phase: d['phase'] as String);
    if (d['setupStep'] != null) updated = updated.copyWith(setupStep: (d['setupStep'] as num).toInt());
    if (d['turnCounter'] != null) updated = updated.copyWith(turnCounter: (d['turnCounter'] as num).toInt());
    if (d['isNewTurn'] != null) updated = updated.copyWith(isNewTurn: d['isNewTurn'] as bool);
    if (d['movesThisTurn'] != null) updated = updated.copyWith(movesThisTurn: (d['movesThisTurn'] as num).toInt());
    // Use containsKey so null properly clears lockedSequencePiece
    if (d.containsKey('lockedSequencePiece')) {
      updated = updated.copyWith(lockedSequencePiece: d['lockedSequencePiece'] as String?);
    }
    if (d['heroeTakeCounter'] != null) updated = updated.copyWith(heroeTakeCounter: (d['heroeTakeCounter'] as num).toInt());
    if (d['clocks'] != null) updated = updated.copyWith(
      clocks: (d['clocks'] as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt())),
    );
    if (d['lastTurnTimestamp'] != null) updated = updated.copyWith(lastTurnTimestamp: (d['lastTurnTimestamp'] as num).toInt());
    if (d['colorChosen'] != null) updated = updated.copyWith(colorChosen: d['colorChosen'] as Map<String, dynamic>);
    if (d['colorsEverChosen'] != null) updated = updated.copyWith(colorsEverChosen: List<String>.from(d['colorsEverChosen'] as List));
    if (d['mageUnlocked'] != null) updated = updated.copyWith(mageUnlocked: d['mageUnlocked'] as bool);
    if (d['passCount'] != null) updated = updated.copyWith(
      passCount: (d['passCount'] as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt())),
    );
    if (d['moves'] != null) updated = updated.copyWith(
      moves: (d['moves'] as List).map((e) => e as Map<String, dynamic>).toList(),
    );

    debugPrint('[GameUpdate] turn=${updated.turn} phase=${updated.phase}'
        ' locked=${updated.lockedSequencePiece} colorChosen=${updated.colorChosen}');

    state = state.copyWith(gameState: updated, legalMoves: [], selectedPieceId: null);
    // New game state = new turn → cached legal moves are no longer valid.
    _prefetchedMoves.clear();
  }

  void _onLegalMoves(dynamic data) {
    final d = _deepMap(data as Map);
    final pieceId = d['pieceId'] as String? ?? '';
    final targets = List<String>.from(d['targets'] as List? ?? []);
    debugPrint('[LegalMoves] received ${targets.length} targets for $pieceId: $targets');

    // Always cache so that selectPiece() can return them instantly.
    if (pieceId.isNotEmpty) _prefetchedMoves[pieceId] = targets;

    // Update Riverpod state only if this response is for the currently selected piece.
    if (state.selectedPieceId == pieceId || pieceId.isEmpty) {
      state = state.copyWith(legalMoves: targets);
    }

    // colorChosen may be updated by the engine during legal-move computation
    final gs = state.gameState;
    if (gs != null && d['colorChosen'] != null) {
      final updated = gs.copyWith(
        colorChosen: Map<String, dynamic>.from(d['colorChosen'] as Map),
      );
      state = state.copyWith(gameState: updated);
    }
  }

  void _onGameOver(dynamic data) {
    final d = _deepMap(data as Map);
    final info = GameOverInfo.fromJson(d);
    final gs = state.gameState?.copyWith(phase: 'GameOver');
    state = state.copyWith(gameState: gs, gameOverInfo: info);
  }

  void _onGameAborted(dynamic _) {
    state = state.copyWith(gameOverInfo: const GameOverInfo(reason: 'aborted'));
  }

  void _onDisconnect(dynamic _) {
    state = state.copyWith(isSocketDisconnected: true);
  }

  void _onReconnect(dynamic _) {
    state = state.copyWith(isSocketDisconnected: false);
    _socket.emit('join_game_room', {'gameId': _gameId});
  }

  void _onRatingUpdated(dynamic data) {
    final d = _deepMap(data as Map);
    state = state.copyWith(ratingDelta: RatingDelta.fromJson(d));
  }

  void _registerListeners() {
    _socket.on('game_update', _onGameUpdate);
    _socket.on('legal_moves', _onLegalMoves);
    _socket.on('game_over', _onGameOver);
    _socket.on('game_aborted', _onGameAborted);
    _socket.on('disconnect', _onDisconnect);
    _socket.on('connect', _onReconnect);
    _socket.on('rating_updated', _onRatingUpdated);
  }

  void _dispose() {
    _socket.off('game_update', _onGameUpdate);
    _socket.off('legal_moves', _onLegalMoves);
    _socket.off('game_over', _onGameOver);
    _socket.off('game_aborted', _onGameAborted);
    _socket.off('disconnect', _onDisconnect);
    _socket.off('connect', _onReconnect);
    _socket.off('rating_updated', _onRatingUpdated);
    _socket.emit('leave_game_room', {'gameId': _gameId});
  }

  // ── Legal-move prefetch cache ───────────────────────────────────────────────
  /// pieceId → legal targets, populated by prefetchLegalMoves() responses.
  /// Cleared on every game_update (new turn) so stale data is never used.
  final Map<String, List<String>> _prefetchedMoves = {};

  /// Emits `get_legal_moves` without changing provider state.
  /// Call on pointer-down so the response arrives before the user lifts their
  /// finger, making legal-move circles appear the moment selectPiece() is called.
  void prefetchLegalMoves(String pieceId) {
    if (_prefetchedMoves.containsKey(pieceId)) return; // already cached
    debugPrint('[Prefetch] emitting get_legal_moves for $pieceId');
    _socket.emit('get_legal_moves', {'gameId': _gameId, 'pieceId': pieceId});
  }

  void selectPiece(String pieceId) {
    if (state.selectedPieceId == pieceId) {
      debugPrint('[SelectPiece] deselecting $pieceId');
      state = state.copyWith(selectedPieceId: null, legalMoves: []);
      return;
    }
    _doSelect(pieceId);
  }

  /// Like [selectPiece] but **never deselects**.
  /// Used by drag-start so repeated drags on the same piece don't toggle off.
  void forceSelectPiece(String pieceId) {
    if (state.selectedPieceId == pieceId && state.legalMoves.isNotEmpty) {
      return; // already selected with moves — nothing to do
    }
    _doSelect(pieceId);
  }

  void _doSelect(String pieceId) {
    final cached = _prefetchedMoves[pieceId];
    if (cached != null) {
      debugPrint('[SelectPiece] $pieceId — cache hit (${cached.length} moves)');
      state = state.copyWith(selectedPieceId: pieceId, legalMoves: cached);
    } else {
      debugPrint('[SelectPiece] selecting $pieceId → emitting get_legal_moves');
      state = state.copyWith(selectedPieceId: pieceId, legalMoves: []);
      _socket.emit('get_legal_moves', {'gameId': _gameId, 'pieceId': pieceId});
    }
  }

  void applyMove({required String pieceId, required String targetPolygon}) {
    final gs = state.gameState;
    if (gs == null) return;
    _socket.emit('apply_move', {
      'gameId': _gameId,
      'pieceId': pieceId,
      'targetPoly': targetPolygon,
      'board': gs.board,
      'pieces': gs.pieces.map((p) => {'id': p.id, 'type': p.type, 'side': p.side, 'position': p.position}).toList(),
      'turn': gs.turn,
      'phase': gs.phase,
      'setupStep': gs.setupStep,
      'colorChosen': gs.colorChosen,
      'colorsEverChosen': gs.colorsEverChosen,
      'turnCounter': gs.turnCounter,
      'isNewTurn': gs.isNewTurn,
      'movesThisTurn': gs.movesThisTurn,
      'lockedSequencePiece': gs.lockedSequencePiece,
      'heroeTakeCounter': gs.heroeTakeCounter,
    });
    state = state.copyWith(selectedPieceId: null, legalMoves: []);
  }

  void endTurnSetup() => _socket.emit('end_turn_setup', {'gameId': _gameId});
  void passTurnPlaying() => _socket.emit('pass_turn_playing', {'gameId': _gameId});
  void randomizeSetup(String side) => _socket.emit('randomize_setup', {'gameId': _gameId, 'side': side});
  void resign() => _socket.emit('resign', {'gameId': _gameId});
  void selectColor(String color, String side) => _socket.emit('color_selected', {'gameId': _gameId, 'color': color, 'side': side});

  // ── Helpers ────────────────────────────────────────────────────────────────

  GameState _parseGameState(Map<String, dynamic> raw, String side) {
    // Deep-normalise: socket delivers Map<dynamic,dynamic>; models.g.dart expects
    // Map<String,dynamic> for every nested map (board, timeControl, clocks, …)
    final r = _deepMap(raw);
    final pieces = (r['pieces'] as List? ?? [])
        .map((e) => Piece.fromJson(e as Map<String, dynamic>))
        .toList();
    return GameState(
      board: r['board'] as Map<String, dynamic>? ?? {},
      pieces: pieces,
      turn: r['turn'] as String? ?? 'white',
      phase: r['phase'] as String? ?? 'Setup',
      setupStep: (r['setupStep'] as num?)?.toInt() ?? 0,
      turnCounter: (r['turnCounter'] as num?)?.toInt() ?? 0,
      isNewTurn: r['isNewTurn'] as bool? ?? true,
      movesThisTurn: (r['movesThisTurn'] as num?)?.toInt() ?? 0,
      lockedSequencePiece: r['lockedSequencePiece'] as String?,
      heroeTakeCounter: (r['heroeTakeCounter'] as num?)?.toInt() ?? 0,
      clocks: r['clocks'] != null
          ? (r['clocks'] as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt()))
          : {'white': 900000, 'black': 900000},
      lastTurnTimestamp: (r['lastTurnTimestamp'] as num?)?.toInt(),
      colorChosen: r['colorChosen'] as Map<String, dynamic>? ?? {},
      colorsEverChosen: r['colorsEverChosen'] != null ? List<String>.from(r['colorsEverChosen'] as List) : [],
      mageUnlocked: r['mageUnlocked'] as bool? ?? false,
      passCount: r['passCount'] != null
          ? (r['passCount'] as Map<String, dynamic>).map((k, v) => MapEntry(k, (v as num).toInt()))
          : {'white': 0, 'black': 0},
      moves: r['moves'] != null
          ? (r['moves'] as List).map((e) => e as Map<String, dynamic>).toList()
          : [],
      timeControl: r['timeControl'] as Map<String, dynamic>?,
      whiteName: r['whiteName'] as String?,
      blackName: r['blackName'] as String?,
      whiteRole: r['whiteRole'] as String?,
      blackRole: r['blackRole'] as String?,
      whiteRating: (r['whiteRating'] as num?)?.toDouble(),
      blackRating: (r['blackRating'] as num?)?.toDouble(),
      boardName: r['boardName'] as String?,
      side: side,
    );
  }
}
