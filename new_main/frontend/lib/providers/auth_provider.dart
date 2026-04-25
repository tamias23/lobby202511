import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_service.dart';
import '../core/socket_service.dart';
import '../models/models.dart';

final authProvider = AsyncNotifierProvider<AuthNotifier, AppUser?>(() {
  return AuthNotifier();
});

class AuthNotifier extends AsyncNotifier<AppUser?> {
  final _api = ApiService.instance;
  final _socket = SocketService.instance;

  @override
  Future<AppUser?> build() async {
    // Restore session from stored JWT on startup
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return null;

    try {
      final data = await _api.getMe();
      final user = AppUser.fromJson({...data, 'token': token});
      // Announce identity to server
      _socket.emit('join_lobby', {'userId': user.id, 'role': user.role});
      return user;
    } catch (_) {
      // Token expired / invalid
      await prefs.remove('jwt_token');
      return null;
    }
  }

  Future<void> login(String usernameOrEmail, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final data = await _api.login(usernameOrEmail, password);
      final token = data['token'] as String;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_token', token);

      // Update socket auth and reconnect
      _socket.setToken(token);
      _socket.connect();

      final user = AppUser.fromJson({...data, 'token': token});
      _socket.emit('join_lobby', {'userId': user.id, 'role': user.role});
      return user;
    });
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    _socket.setToken(null);
    _socket.emit('join_lobby', {}); // guest mode
    state = const AsyncData(null);
  }

  /// Called when the server emits session_conflict — another session took over.
  void forceLogout() {
    SharedPreferences.getInstance().then((p) => p.remove('jwt_token'));
    _socket.setToken(null);
    state = const AsyncData(null);
  }

  /// Update rating in memory after a match.
  void updateRating(String userId, double newRating) {
    final user = state.value;
    if (user != null && user.id == userId) {
      state = AsyncData(user.copyWith(rating: newRating));
    }
  }

  /// Called when the server emits role_updated — silently re-fetches /me
  /// so the new role (e.g. subscriber) is reflected instantly without logout.
  Future<void> refreshFromServer() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    if (token == null) return;
    try {
      final data = await _api.getMe();
      final user = AppUser.fromJson({...data, 'token': token});
      state = AsyncData(user);
      // Re-announce new role to server so socket.userRole is refreshed
      _socket.emit('join_lobby', {'userId': user.id, 'role': user.role});
    } catch (_) {
      // Silently ignore — user stays logged in with old data
    }
  }

  /// Permanently deletes the account via DELETE /api/me, then logs out locally.
  Future<void> deleteAccount() async {
    await _api.deleteAccount();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    _socket.setToken(null);
    _socket.emit('join_lobby', {}); // guest mode
    state = const AsyncData(null);
  }

}
