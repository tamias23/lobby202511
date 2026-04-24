import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../providers/game_provider.dart';
import 'game_board.dart';

// Mirrors the helper in game_provider.dart / app.dart — avoids a circular import.
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


/// GameScreen wraps GameBoard, handling:
/// - `join_game_by_hash` socket emit (replaces GamePage.jsx)
/// - Loading/error states while server responds with game_joined
/// - Passing initial state to GameBoard
class GameScreen extends ConsumerStatefulWidget {
  final String hash;        // URL `:hash` parameter — IS the gameId on server
  final Map<String, dynamic>? extra; // nav extras: side, initialState, opponent, tournamentId

  const GameScreen({super.key, required this.hash, this.extra});

  @override
  ConsumerState<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends ConsumerState<GameScreen> {
  final _socket = SocketService.instance;
  bool _joined = false;
  String? _side;
  Map<String, dynamic>? _initialStateRaw;
  String? _tournamentId;
  bool _spectator = false;

  @override
  void initState() {
    super.initState();

    // If we have nav extras (game_created path) — use them directly
    final extra = widget.extra;
    if (extra != null) {
      _side = extra['side'] as String? ?? 'spectator';
      _spectator = extra['spectator'] as bool? ?? false;
      _initialStateRaw = extra['initialState'] as Map<String, dynamic>?;
      _tournamentId = extra['tournamentId'] as String?;

      if (_initialStateRaw != null) {
        // Inject into provider after first frame
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          ref.read(gameProvider(widget.hash).notifier)
              .applyInitialState(_initialStateRaw!, _spectator ? 'spectator' : (_side ?? 'spectator'));
          setState(() => _joined = true);
        });
        return;
      }
    }

    // Otherwise join by hash (direct URL open / rejoin / spectate)
    _socket.once('game_joined', (data) {
      if (!mounted) return;
      final d = _deepMap(data as Map);
      if (d['error'] != null) {
        if (mounted) setState(() {}); // trigger rebuild to show error
        return;
      }
      _side = d['side'] as String? ?? 'spectator';
      _spectator = _side == 'spectator';
      _tournamentId = d['tournamentId'] as String?;
      final rawState = d['initialState'] as Map<String, dynamic>?;
      if (rawState != null) {
        ref.read(gameProvider(widget.hash).notifier)
            .applyInitialState(rawState, _spectator ? 'spectator' : (_side ?? 'spectator'));
      }
      if (mounted) setState(() => _joined = true);
    });

    final user = extra?['userId'];
    _socket.emit('join_game_by_hash', {
      'hash': widget.hash,
      'spectator': _spectator,
      if (user != null) 'userId': user,
    });
  }

  @override
  void dispose() {
    _socket.emit('leave_game_by_hash', {'hash': widget.hash});
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_joined) {
      return Scaffold(
        backgroundColor: DTheme.bgDark,
        body: const Center(child: CircularProgressIndicator(color: DTheme.primary)),
      );
    }

    return GameBoard(
      gameId: widget.hash,
      side: _spectator ? 'spectator' : (_side ?? 'spectator'),
      tournamentId: _tournamentId,
    );
  }
}
