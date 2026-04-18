import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';
import '../models/models.dart';

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
    final d = data as Map<String, dynamic>;
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
    if (d['setupStep'] != null) updated = updated.copyWith(setupStep: d['setupStep'] as int);
    if (d['turnCounter'] != null) updated = updated.copyWith(turnCounter: d['turnCounter'] as int);
    if (d['isNewTurn'] != null) updated = updated.copyWith(isNewTurn: d['isNewTurn'] as bool);
    if (d['movesThisTurn'] != null) updated = updated.copyWith(movesThisTurn: d['movesThisTurn'] as int);
    // Use containsKey so null properly clears lockedSequencePiece
    if (d.containsKey('lockedSequencePiece')) {
      updated = updated.copyWith(lockedSequencePiece: d['lockedSequencePiece'] as String?);
    }
    if (d['heroeTakeCounter'] != null) updated = updated.copyWith(heroeTakeCounter: d['heroeTakeCounter'] as int);
    if (d['clocks'] != null) updated = updated.copyWith(clocks: Map<String, int>.from(d['clocks'] as Map));
    if (d['lastTurnTimestamp'] != null) updated = updated.copyWith(lastTurnTimestamp: d['lastTurnTimestamp'] as int?);
    if (d['colorChosen'] != null) updated = updated.copyWith(colorChosen: Map<String, dynamic>.from(d['colorChosen'] as Map));
    if (d['colorsEverChosen'] != null) updated = updated.copyWith(colorsEverChosen: List<String>.from(d['colorsEverChosen'] as List));
    if (d['mageUnlocked'] != null) updated = updated.copyWith(mageUnlocked: d['mageUnlocked'] as bool);
    if (d['passCount'] != null) updated = updated.copyWith(passCount: Map<String, int>.from(d['passCount'] as Map));
    if (d['moves'] != null) updated = updated.copyWith(moves: List<Map<String, dynamic>>.from(d['moves'] as List));

    debugPrint('[GameUpdate] turn=${updated.turn} phase=${updated.phase}'
        ' locked=${updated.lockedSequencePiece} colorChosen=${updated.colorChosen}');

    state = state.copyWith(gameState: updated, legalMoves: [], selectedPieceId: null);
    // New game state = new turn → cached legal moves are no longer valid.
    _prefetchedMoves.clear();
  }

  void _onLegalMoves(dynamic data) {
    final d = data as Map<String, dynamic>;
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
    final d = data as Map<String, dynamic>;
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
    final d = data as Map<String, dynamic>;
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
    final pieces = (raw['pieces'] as List? ?? [])
        .map((e) => Piece.fromJson(e as Map<String, dynamic>))
        .toList();
    return GameState(
      board: raw['board'] as Map<String, dynamic>? ?? {},
      pieces: pieces,
      turn: raw['turn'] as String? ?? 'white',
      phase: raw['phase'] as String? ?? 'Setup',
      setupStep: raw['setupStep'] as int? ?? 0,
      turnCounter: raw['turnCounter'] as int? ?? 0,
      isNewTurn: raw['isNewTurn'] as bool? ?? true,
      movesThisTurn: raw['movesThisTurn'] as int? ?? 0,
      lockedSequencePiece: raw['lockedSequencePiece'] as String?,
      heroeTakeCounter: raw['heroeTakeCounter'] as int? ?? 0,
      clocks: raw['clocks'] != null ? Map<String, int>.from(raw['clocks'] as Map) : {'white': 900000, 'black': 900000},
      lastTurnTimestamp: raw['lastTurnTimestamp'] as int?,
      colorChosen: raw['colorChosen'] != null ? Map<String, dynamic>.from(raw['colorChosen'] as Map) : {},
      colorsEverChosen: raw['colorsEverChosen'] != null ? List<String>.from(raw['colorsEverChosen'] as List) : [],
      mageUnlocked: raw['mageUnlocked'] as bool? ?? false,
      passCount: raw['passCount'] != null ? Map<String, int>.from(raw['passCount'] as Map) : {'white': 0, 'black': 0},
      timeControl: raw['timeControl'] as Map<String, dynamic>?,
      whiteName: raw['whiteName'] as String?,
      blackName: raw['blackName'] as String?,
      whiteRole: raw['whiteRole'] as String?,
      blackRole: raw['blackRole'] as String?,
      whiteRating: (raw['whiteRating'] as num?)?.toDouble(),
      blackRating: (raw['blackRating'] as num?)?.toDouble(),
      boardName: raw['boardName'] as String?,
      side: side,
    );
  }
}
