import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'providers/socket_provider.dart';
import 'screens/lobby/lobby_screen.dart';
import 'screens/game/game_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/tournament/tournament_create_screen.dart';
import 'screens/tournament/tournament_room_screen.dart';
import 'screens/analysis/analysis_screen.dart';
import 'screens/tutorial/tutorial_screen.dart';
import 'screens/about/about_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/profile/game_history_screen.dart';
import 'screens/admin/admin_jobs_screen.dart';
import 'screens/admin/admin_users_screen.dart';
import 'screens/leaderboard/leaderboard_screen.dart';
import 'core/theme.dart';
import 'widgets/app_background.dart';

/// Router definition — mirrors the React routes in App.jsx
final _router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const LobbyScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/games/:hash',
      builder: (context, state) {
        final hash = state.pathParameters['hash']!;
        // Deep-convert extra from Map<dynamic,dynamic> (socket) to Map<String,dynamic>
        final rawExtra = state.extra;
        final extra = rawExtra is Map
            ? _deepMapStr(rawExtra)
            : null;
        return GameScreen(hash: hash, extra: extra);
      },
    ),
    GoRoute(
      path: '/analysis',
      builder: (context, state) {
        // state.extra may be Map<dynamic,dynamic> from socket data in dart2js;
        // convert safely instead of hard-casting.
        final raw = state.extra;
        final record = raw is Map
            ? Map<String, dynamic>.from(raw.map((k, v) => MapEntry(k.toString(), v)))
            : null;
        return AnalysisScreen(initialRecord: record);
      },
    ),
    GoRoute(
      path: '/tutorial',
      builder: (context, state) => const TutorialScreen(),
    ),
    GoRoute(
      path: '/tournament/create',
      builder: (context, state) => const TournamentCreateScreen(),
    ),
    GoRoute(
      path: '/tournament/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return TournamentRoomScreen(tournamentId: id);
      },
    ),
    GoRoute(
      path: '/about',
      builder: (context, state) => const AboutScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/profile/games',
      builder: (context, state) => const GameHistoryScreen(),
    ),
    GoRoute(
      path: '/admin/jobs',
      builder: (context, state) => const AdminJobsScreen(),
    ),
    GoRoute(
      path: '/admin/users',
      builder: (context, state) => const AdminUsersScreen(),
    ),
    GoRoute(
      path: '/leaderboard',
      builder: (context, state) => const LeaderboardScreen(),
    ),
  ],
);

class DedalApp extends ConsumerStatefulWidget {
  const DedalApp({super.key});

  @override
  ConsumerState<DedalApp> createState() => _DedalAppState();
}

class _DedalAppState extends ConsumerState<DedalApp> {
  @override
  void initState() {
    super.initState();
    // Socket session_conflict → force logout
    final socket = ref.read(socketServiceProvider);
    socket.on('session_conflict', (data) {
      final message = Map<String, dynamic>.from(data as Map)['message'] as String? ?? 'Session conflict.';
      ref.read(authProvider.notifier).forceLogout();
      _router.go('/', extra: {'notification': message, 'notifType': 'error'});
    });

    // Rating updates → propagate to auth
    socket.on('rating_updated', (data) {
      final d = Map<String, dynamic>.from(data as Map);
      final whiteId = d['whitePlayerId'] as String?;
      final blackId = d['blackPlayerId'] as String?;
      final whiteRating = (d['whiteRating'] as num?)?.toDouble();
      final blackRating = (d['blackRating'] as num?)?.toDouble();
      if (whiteId != null && whiteRating != null) {
        ref.read(authProvider.notifier).updateRating(whiteId, whiteRating);
      }
      if (blackId != null && blackRating != null) {
        ref.read(authProvider.notifier).updateRating(blackId, blackRating);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Dedal',
      debugShowCheckedModeBanner: false,
      theme: DTheme.dark,
      routerConfig: _router,
      // Global background layer
      builder: (context, child) => Stack(
        children: [
          const AppBackground(),
          if (child != null) child,
        ],
      ),
    );
  }
}

/// Deep-converts Map<dynamic,dynamic> (as delivered by Socket.IO / dart2js) to
/// Map<String,dynamic> so all downstream 'as Map<String,dynamic>' casts are safe.
Map<String, dynamic> _deepMapStr(Map raw) {
  return raw.map((k, v) {
    dynamic val;
    if (v is Map)       val = _deepMapStr(v);
    else if (v is List) val = _deepListStr(v);
    else                val = v;
    return MapEntry(k.toString(), val);
  });
}

List<dynamic> _deepListStr(List raw) =>
    raw.map((v) => v is Map ? _deepMapStr(v) : (v is List ? _deepListStr(v) : v)).toList();
