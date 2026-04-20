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
        // Optional navigation extras (side, initialState, opponent, tournamentId)
        final extra = state.extra as Map<String, dynamic>?;
        return GameScreen(hash: hash, extra: extra);
      },
    ),
    GoRoute(
      path: '/analysis',
      builder: (context, state) {
        final record = state.extra as Map<String, dynamic>?;
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
      final message = (data as Map<String, dynamic>)['message'] as String? ?? 'Session conflict.';
      ref.read(authProvider.notifier).forceLogout();
      _router.go('/', extra: {'notification': message, 'notifType': 'error'});
    });

    // Rating updates → propagate to auth
    socket.on('rating_updated', (data) {
      final d = data as Map<String, dynamic>;
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
