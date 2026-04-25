import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';

/// Dio-based HTTP client for all REST API calls.
/// Automatically injects JWT Bearer token from SharedPreferences.
class ApiService {
  ApiService._internal();
  static final ApiService instance = ApiService._internal();
  factory ApiService() => instance;

  late final Dio _dio;

  void init() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    // Auth interceptor — inject JWT on every request
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // 401 → could trigger logout in auth provider
        return handler.next(error);
      },
    ));
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> login(String usernameOrEmail, String password) async {
    final response = await _dio.post('/login', data: {
      'identifier': usernameOrEmail,
      'password': password,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<void> register(String username, String email, String password) async {
    await _dio.post('/register', data: {
      'username': username,
      'email': email,
      'password': password,
    });
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get('/api/me');
    return response.data as Map<String, dynamic>;
  }

  // ── Boards ──────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getRandomBoards(int count) async {
    final response = await _dio.get('/api/boards/random/$count');
    return (response.data as Map<String, dynamic>)['boards'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> getBoard(String boardId) async {
    final response = await _dio.get('/api/boards/$boardId');
    return response.data as Map<String, dynamic>;
  }

  // ── Replay ──────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> replay(Map<String, dynamic> payload) async {
    final response = await _dio.post('/api/replay', data: payload);
    return response.data as Map<String, dynamic>;
  }

  // ── Tutorial ────────────────────────────────────────────────────────────────

  Future<List<dynamic>> tutorialMoves(Map<String, dynamic> payload) async {
    final response = await _dio.post('/api/tutorial/moves', data: payload);
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> tutorialApply(Map<String, dynamic> payload) async {
    final response = await _dio.post('/api/tutorial/apply', data: payload);
    return response.data as Map<String, dynamic>;
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getLeaderboard() async {
    final response = await _dio.get('/leaderboard');
    return response.data as Map<String, dynamic>;
  }

  // ── Game History ─────────────────────────────────────────────────────────────

  Future<List<dynamic>> getMyGames() async {
    final response = await _dio.get('/api/me/games');
    final data = response.data as Map<String, dynamic>;
    return data['games'] as List<dynamic>? ?? [];
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getAdminUsers({String query = ''}) async {
    final response = await _dio.get('/api/admin/users', queryParameters: {'q': query});
    final data = response.data as Map<String, dynamic>;
    return data['users'] as List<dynamic>? ?? [];
  }

  Future<List<dynamic>> getAdminUserGames(String userId) async {
    final response = await _dio.get('/api/admin/users/$userId/games');
    final data = response.data as Map<String, dynamic>;
    return data['games'] as List<dynamic>? ?? [];
  }

  // ── Account deletion ─────────────────────────────────────────────────────────

  Future<void> deleteAccount() async {
    await _dio.delete('/api/me');
  }
}
