import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/socket_service.dart';

class TournamentState {
  final Map<String, dynamic>? data;
  final String? pendingGameHash;
  final bool isAborted;

  const TournamentState({this.data, this.pendingGameHash, this.isAborted = false});

  TournamentState copyWith({
    Map<String, dynamic>? data,
    Object? pendingGameHash = _sentinel,
    bool? isAborted,
  }) => TournamentState(
    data: data ?? this.data,
    pendingGameHash: pendingGameHash == _sentinel ? this.pendingGameHash : pendingGameHash as String?,
    isAborted: isAborted ?? this.isAborted,
  );
}

const _sentinel = Object();

final tournamentProvider = NotifierProvider.family<TournamentNotifier, TournamentState, String>(
  (id) => TournamentNotifier(id),
);

class TournamentNotifier extends Notifier<TournamentState> {
  final _socket = SocketService.instance;
  final String _tournamentId;

  TournamentNotifier(this._tournamentId);

  @override
  TournamentState build() {
    _socket.emit('enter_tournament_room', {'tournamentId': _tournamentId});
    _socket.on('tournament_update', _onUpdate);
    _socket.on('tournament_game_start', _onGameStart);
    _socket.on('tournament_game_aborted', _onGameAborted);
    ref.onDispose(() {
      _socket.emit('leave_tournament_room', {'tournamentId': _tournamentId});
      _socket.off('tournament_update', _onUpdate);
      _socket.off('tournament_game_start', _onGameStart);
      _socket.off('tournament_game_aborted', _onGameAborted);
    });
    return const TournamentState();
  }

  void _onUpdate(dynamic data) {
    final d = Map<String, dynamic>.from(data as Map);
    if (d['id'] == _tournamentId || d['id'] == null) {
      state = state.copyWith(data: d);
    }
  }

  void _onGameStart(dynamic data) {
    final d = Map<String, dynamic>.from(data as Map);
    state = state.copyWith(pendingGameHash: d['hash'] as String?);
  }

  void _onGameAborted(dynamic _) {
    state = state.copyWith(isAborted: true);
  }

  void clearPendingGame() => state = state.copyWith(pendingGameHash: null);
  void leaveTournament() => _socket.emit('leave_tournament', {'tournamentId': _tournamentId});
  void downloadGames() => _socket.emit('download_tournament_games', {'tournamentId': _tournamentId});
}
