// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AppUser _$AppUserFromJson(Map<String, dynamic> json) => _AppUser(
  id: json['id'] as String,
  username: json['username'] as String,
  role: json['role'] as String? ?? 'guest',
  rating: (json['rating'] as num?)?.toDouble(),
  token: json['token'] as String?,
);

Map<String, dynamic> _$AppUserToJson(_AppUser instance) => <String, dynamic>{
  'id': instance.id,
  'username': instance.username,
  'role': instance.role,
  'rating': instance.rating,
  'token': instance.token,
};

_Piece _$PieceFromJson(Map<String, dynamic> json) => _Piece(
  id: json['id'] as String,
  type: json['type'] as String,
  side: json['side'] as String,
  position: json['position'] as String,
);

Map<String, dynamic> _$PieceToJson(_Piece instance) => <String, dynamic>{
  'id': instance.id,
  'type': instance.type,
  'side': instance.side,
  'position': instance.position,
};

_BoardPolygon _$BoardPolygonFromJson(Map<String, dynamic> json) =>
    _BoardPolygon(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String,
      color: json['color'] as String,
      points: (json['points'] as List<dynamic>)
          .map(
            (e) =>
                (e as List<dynamic>).map((e) => (e as num).toDouble()).toList(),
          )
          .toList(),
      center: (json['center'] as List<dynamic>)
          .map((e) => (e as num).toDouble())
          .toList(),
      neighbors:
          (json['neighbors'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      neighbours:
          (json['neighbours'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      shape: json['shape'] as String? ?? 'hexagon',
    );

Map<String, dynamic> _$BoardPolygonToJson(_BoardPolygon instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'color': instance.color,
      'points': instance.points,
      'center': instance.center,
      'neighbors': instance.neighbors,
      'neighbours': instance.neighbours,
      'shape': instance.shape,
    };

_GameState _$GameStateFromJson(Map<String, dynamic> json) => _GameState(
  board: json['board'] as Map<String, dynamic>,
  pieces: (json['pieces'] as List<dynamic>)
      .map((e) => Piece.fromJson(e as Map<String, dynamic>))
      .toList(),
  turn: json['turn'] as String,
  phase: json['phase'] as String? ?? 'Setup',
  setupStep: (json['setupStep'] as num?)?.toInt() ?? 0,
  turnCounter: (json['turnCounter'] as num?)?.toInt() ?? 0,
  isNewTurn: json['isNewTurn'] as bool? ?? true,
  movesThisTurn: (json['movesThisTurn'] as num?)?.toInt() ?? 0,
  lockedSequencePiece: json['lockedSequencePiece'] as String?,
  heroeTakeCounter: (json['heroeTakeCounter'] as num?)?.toInt() ?? 0,
  clocks:
      (json['clocks'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {},
  lastTurnTimestamp: (json['lastTurnTimestamp'] as num?)?.toInt(),
  colorChosen: json['colorChosen'] as Map<String, dynamic>? ?? const {},
  colorsEverChosen:
      (json['colorsEverChosen'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const [],
  mageUnlocked: json['mageUnlocked'] as bool? ?? false,
  passCount:
      (json['passCount'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {'white': 0, 'black': 0},
  moves:
      (json['moves'] as List<dynamic>?)
          ?.map((e) => e as Map<String, dynamic>)
          .toList() ??
      const [],
  timeControl: json['timeControl'] as Map<String, dynamic>?,
  whiteName: json['whiteName'] as String?,
  blackName: json['blackName'] as String?,
  whiteRole: json['whiteRole'] as String?,
  blackRole: json['blackRole'] as String?,
  whiteRating: (json['whiteRating'] as num?)?.toDouble(),
  blackRating: (json['blackRating'] as num?)?.toDouble(),
  boardName: json['boardName'] as String?,
  side: json['side'] as String? ?? 'spectator',
);

Map<String, dynamic> _$GameStateToJson(_GameState instance) =>
    <String, dynamic>{
      'board': instance.board,
      'pieces': instance.pieces,
      'turn': instance.turn,
      'phase': instance.phase,
      'setupStep': instance.setupStep,
      'turnCounter': instance.turnCounter,
      'isNewTurn': instance.isNewTurn,
      'movesThisTurn': instance.movesThisTurn,
      'lockedSequencePiece': instance.lockedSequencePiece,
      'heroeTakeCounter': instance.heroeTakeCounter,
      'clocks': instance.clocks,
      'lastTurnTimestamp': instance.lastTurnTimestamp,
      'colorChosen': instance.colorChosen,
      'colorsEverChosen': instance.colorsEverChosen,
      'mageUnlocked': instance.mageUnlocked,
      'passCount': instance.passCount,
      'moves': instance.moves,
      'timeControl': instance.timeControl,
      'whiteName': instance.whiteName,
      'blackName': instance.blackName,
      'whiteRole': instance.whiteRole,
      'blackRole': instance.blackRole,
      'whiteRating': instance.whiteRating,
      'blackRating': instance.blackRating,
      'boardName': instance.boardName,
      'side': instance.side,
    };

_GameRequest _$GameRequestFromJson(Map<String, dynamic> json) => _GameRequest(
  requestId: json['requestId'] as String,
  userId: json['userId'] as String?,
  username: json['username'] as String,
  role: json['role'] as String,
  timeControl: json['timeControl'] as Map<String, dynamic>,
  boardId: json['boardId'] as String?,
  createdAt: (json['createdAt'] as num).toInt(),
);

Map<String, dynamic> _$GameRequestToJson(_GameRequest instance) =>
    <String, dynamic>{
      'requestId': instance.requestId,
      'userId': instance.userId,
      'username': instance.username,
      'role': instance.role,
      'timeControl': instance.timeControl,
      'boardId': instance.boardId,
      'createdAt': instance.createdAt,
    };

_ActiveGame _$ActiveGameFromJson(Map<String, dynamic> json) => _ActiveGame(
  hash: json['hash'] as String,
  whiteName: json['whiteName'] as String,
  blackName: json['blackName'] as String,
  whiteRole: json['whiteRole'] as String?,
  blackRole: json['blackRole'] as String?,
  timeControl: json['timeControl'] as Map<String, dynamic>,
  moveCount: (json['moveCount'] as num?)?.toInt() ?? 0,
  hasDisconnect: json['hasDisconnect'] as bool? ?? false,
  white: json['white'] as String?,
  black: json['black'] as String?,
  tournamentId: json['tournamentId'] as String?,
);

Map<String, dynamic> _$ActiveGameToJson(_ActiveGame instance) =>
    <String, dynamic>{
      'hash': instance.hash,
      'whiteName': instance.whiteName,
      'blackName': instance.blackName,
      'whiteRole': instance.whiteRole,
      'blackRole': instance.blackRole,
      'timeControl': instance.timeControl,
      'moveCount': instance.moveCount,
      'hasDisconnect': instance.hasDisconnect,
      'white': instance.white,
      'black': instance.black,
      'tournamentId': instance.tournamentId,
    };

_BotInfo _$BotInfoFromJson(Map<String, dynamic> json) => _BotInfo(
  agentType: json['agent_type'] as String,
  modelName: json['model_name'] as String,
  displayName: json['display_name'] as String,
  rating: (json['rating'] as num?)?.toDouble(),
  busy: json['busy'] as bool? ?? false,
);

Map<String, dynamic> _$BotInfoToJson(_BotInfo instance) => <String, dynamic>{
  'agent_type': instance.agentType,
  'model_name': instance.modelName,
  'display_name': instance.displayName,
  'rating': instance.rating,
  'busy': instance.busy,
};

_LiveStats _$LiveStatsFromJson(Map<String, dynamic> json) => _LiveStats(
  onlineUsers: (json['onlineUsers'] as num?)?.toInt() ?? 0,
  activeGames: (json['activeGames'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$LiveStatsToJson(_LiveStats instance) =>
    <String, dynamic>{
      'onlineUsers': instance.onlineUsers,
      'activeGames': instance.activeGames,
    };

_TournamentSummary _$TournamentSummaryFromJson(Map<String, dynamic> json) =>
    _TournamentSummary(
      id: json['id'] as String,
      format: json['format'] as String,
      status: json['status'] as String,
      timeControl: json['timeControl'] as Map<String, dynamic>,
      name: json['name'] as String?,
      creatorUsername: json['creatorUsername'] as String?,
      currentCount: (json['currentCount'] as num?)?.toInt(),
      maxParticipants: (json['maxParticipants'] as num?)?.toInt(),
      hasPassword: json['hasPassword'] as bool? ?? false,
      currentRound: (json['currentRound'] as num?)?.toInt(),
      maxRounds: (json['maxRounds'] as num?)?.toInt(),
    );

Map<String, dynamic> _$TournamentSummaryToJson(_TournamentSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'format': instance.format,
      'status': instance.status,
      'timeControl': instance.timeControl,
      'name': instance.name,
      'creatorUsername': instance.creatorUsername,
      'currentCount': instance.currentCount,
      'maxParticipants': instance.maxParticipants,
      'hasPassword': instance.hasPassword,
      'currentRound': instance.currentRound,
      'maxRounds': instance.maxRounds,
    };

_GameOverInfo _$GameOverInfoFromJson(Map<String, dynamic> json) =>
    _GameOverInfo(
      winner: json['winnerSide'] as String?,
      reason: json['reason'] as String?,
      winnerId: json['winnerId'] as String?,
    );

Map<String, dynamic> _$GameOverInfoToJson(_GameOverInfo instance) =>
    <String, dynamic>{
      'winnerSide': instance.winner,
      'reason': instance.reason,
      'winnerId': instance.winnerId,
    };

_RatingDelta _$RatingDeltaFromJson(Map<String, dynamic> json) => _RatingDelta(
  whitePlayerId: json['whitePlayerId'] as String,
  blackPlayerId: json['blackPlayerId'] as String,
  whiteRating: (json['whiteRating'] as num?)?.toDouble(),
  blackRating: (json['blackRating'] as num?)?.toDouble(),
  whiteRatingOld: (json['whiteRatingOld'] as num?)?.toDouble(),
  blackRatingOld: (json['blackRatingOld'] as num?)?.toDouble(),
);

Map<String, dynamic> _$RatingDeltaToJson(_RatingDelta instance) =>
    <String, dynamic>{
      'whitePlayerId': instance.whitePlayerId,
      'blackPlayerId': instance.blackPlayerId,
      'whiteRating': instance.whiteRating,
      'blackRating': instance.blackRating,
      'whiteRatingOld': instance.whiteRatingOld,
      'blackRatingOld': instance.blackRatingOld,
    };
