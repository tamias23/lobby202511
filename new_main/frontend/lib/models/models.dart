import 'package:freezed_annotation/freezed_annotation.dart';

part 'models.freezed.dart';
part 'models.g.dart';

// ── User ──────────────────────────────────────────────────────────────────────

@freezed
abstract class AppUser with _$AppUser {
  const factory AppUser({
    required String id,
    required String username,
    @Default('guest') String role,
    double? rating,
    String? token,
  }) = _AppUser;

  factory AppUser.fromJson(Map<String, dynamic> json) => _$AppUserFromJson(json);
}

// ── Piece ─────────────────────────────────────────────────────────────────────

@freezed
abstract class Piece with _$Piece {
  const factory Piece({
    required String id,
    required String type,      // goddess | heroe | mage | witch | soldier | minotaur | siren | ghoul
    required String side,      // white | black
    required String position,  // polygon name | 'returned' | 'graveyard'
  }) = _Piece;

  factory Piece.fromJson(Map<String, dynamic> json) => _$PieceFromJson(json);
}

// ── Board polygon ─────────────────────────────────────────────────────────────

@freezed
abstract class BoardPolygon with _$BoardPolygon {
  const factory BoardPolygon({
    required int id,
    required String name,
    required String color,           // orange | green | blue | grey
    required List<List<double>> points,
    required List<double> center,
    @Default([]) List<String> neighbors,   // jump neighbors
    @Default([]) List<String> neighbours,  // slide neighbors
    @Default('hexagon') String shape,
  }) = _BoardPolygon;

  factory BoardPolygon.fromJson(Map<String, dynamic> json) => _$BoardPolygonFromJson(json);
}

// ── Game state ────────────────────────────────────────────────────────────────

@freezed
abstract class GameState with _$GameState {
  const factory GameState({
    /// Raw board JSON — used by the Rust engine wrapper.
    required Map<String, dynamic> board,
    required List<Piece> pieces,
    required String turn,            // 'white' | 'black'
    @Default('Setup') String phase,  // 'Setup' | 'ColorChoice' | 'Playing' | 'GameOver'
    @Default(0) int setupStep,
    @Default(0) int turnCounter,
    @Default(true) bool isNewTurn,
    @Default(0) int movesThisTurn,
    String? lockedSequencePiece,
    @Default(0) int heroeTakeCounter,
    @Default({}) Map<String, int> clocks,
    int? lastTurnTimestamp,
    @Default({}) Map<String, dynamic> colorChosen,
    @Default([]) List<String> colorsEverChosen,
    @Default(false) bool mageUnlocked,
    @Default({'white': 0, 'black': 0}) Map<String, int> passCount,
    @Default([]) List<Map<String, dynamic>> moves,
    // Time control
    Map<String, dynamic>? timeControl,
    // Player info
    String? whiteName,
    String? blackName,
    String? whiteRole,
    String? blackRole,
    double? whiteRating,
    double? blackRating,
    String? boardName,
    // Role of this player
    @Default('spectator') String side,
  }) = _GameState;

  factory GameState.fromJson(Map<String, dynamic> json) => _$GameStateFromJson(json);
}

// ── Game request (lobby) ──────────────────────────────────────────────────────

@freezed
abstract class GameRequest with _$GameRequest {
  const factory GameRequest({
    required String requestId,
    String? userId,          // optional — not always sent
    required String username,
    required String role,
    required Map<String, dynamic> timeControl,
    String? boardId,
    required int createdAt,
  }) = _GameRequest;

  factory GameRequest.fromJson(Map<String, dynamic> json) => _$GameRequestFromJson(json);
}

// ── Active game (lobby) ───────────────────────────────────────────────────────

@freezed
abstract class ActiveGame with _$ActiveGame {
  const factory ActiveGame({
    required String hash,
    required String whiteName,
    required String blackName,
    String? whiteRole,
    String? blackRole,
    required Map<String, dynamic> timeControl,
    @Default(0) int moveCount,
    @Default(false) bool hasDisconnect,
    String? white,  // userId
    String? black,  // userId
    String? tournamentId,
  }) = _ActiveGame;

  factory ActiveGame.fromJson(Map<String, dynamic> json) => _$ActiveGameFromJson(json);
}

// ── Bot info ──────────────────────────────────────────────────────────────────

@freezed
abstract class BotInfo with _$BotInfo {
  const factory BotInfo({
    @JsonKey(name: 'agent_type') required String agentType,
    @JsonKey(name: 'model_name') required String modelName,
    @JsonKey(name: 'display_name') required String displayName,
    double? rating,
    @Default(false) bool busy,
  }) = _BotInfo;

  factory BotInfo.fromJson(Map<String, dynamic> json) => _$BotInfoFromJson(json);
}

// ── Live stats (lobby) ────────────────────────────────────────────────────────

@freezed
abstract class LiveStats with _$LiveStats {
  const factory LiveStats({
    @Default(0) int onlineUsers,
    @Default(0) int activeGames,
  }) = _LiveStats;

  factory LiveStats.fromJson(Map<String, dynamic> json) => _$LiveStatsFromJson(json);
}

// ── Tournament ────────────────────────────────────────────────────────────────

@freezed
abstract class TournamentSummary with _$TournamentSummary {
  const factory TournamentSummary({
    required String id,
    required String format,     // swiss | knockout | round_robin | arena
    required String status,     // open | active | completed
    required Map<String, dynamic> timeControl,
    String? name,
    String? creatorUsername,
    int? currentCount,
    int? maxParticipants,
    @Default(false) bool hasPassword,
    int? currentRound,
    int? maxRounds,
  }) = _TournamentSummary;

  factory TournamentSummary.fromJson(Map<String, dynamic> json) => _$TournamentSummaryFromJson(json);
}

// ── Game over info ────────────────────────────────────────────────────────────

@freezed
abstract class GameOverInfo with _$GameOverInfo {
  const factory GameOverInfo({
    @JsonKey(name: 'winnerSide') String? winner,   // 'white' | 'black' | 'draw'
    String? reason,   // 'time' | 'resign' | 'goddess_captured' | 'draw'
    String? winnerId,
  }) = _GameOverInfo;

  factory GameOverInfo.fromJson(Map<String, dynamic> json) => _$GameOverInfoFromJson(json);
}

// ── Rating delta ──────────────────────────────────────────────────────────────

@freezed
abstract class RatingDelta with _$RatingDelta {
  const factory RatingDelta({
    @JsonKey(name: 'whitePlayerId') required String whitePlayerId,
    @JsonKey(name: 'blackPlayerId') required String blackPlayerId,
    double? whiteRating,
    double? blackRating,
    double? whiteRatingOld,
    double? blackRatingOld,
  }) = _RatingDelta;

  factory RatingDelta.fromJson(Map<String, dynamic> json) => _$RatingDeltaFromJson(json);
}
