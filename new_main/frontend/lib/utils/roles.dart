class Roles {
  static const Map<String, List<String>> permissions = {
    "game_watcher": ["guest", "registered", "subscriber", "admin"],
    "unrated_game_player": ["guest", "registered", "subscriber", "admin"],
    "rated_game_player": ["registered", "subscriber", "admin"],
    "unrated_game_creator": ["guest", "registered", "subscriber", "admin"],
    "rated_game_creator": ["registered", "subscriber", "admin"],
    "tournament_creator": ["subscriber", "admin"],
    "unrated_tournament_participant": ["registered", "subscriber", "admin"],
    "rated_tournament_participant": ["subscriber", "admin"],
    "tournament_game_watcher": ["guest", "registered", "subscriber", "admin"],
    "analysis_room_user": ["registered", "subscriber", "admin"],
    "history_viewer_self": ["registered", "subscriber", "admin"],
    "history_viewer_all": ["subscriber", "admin"],
    "chat_user": ["registered", "subscriber", "admin"],
    "board_chooser": ["subscriber", "admin"],
    "manage_jobs": ["admin"]
  };

  static const Map<String, Map<String, int>> limits = {
    "rated_games_per_24h": { "guest": 0, "registered": 3, "subscriber": -1, "admin": -1 },
    "bot_games_per_24h": { "guest": 1, "registered": 10, "subscriber": -1, "admin": -1 }
  };

  static bool canUser(String? role, String action) {
    final r = role ?? 'guest';
    final allowed = permissions[action];
    if (allowed == null) return false;
    return allowed.contains(r);
  }

  static int getLimit(String? role, String limitName) {
    final r = role ?? 'guest';
    final typeLimits = limits[limitName];
    if (typeLimits == null) return 0;
    return typeLimits[r] ?? typeLimits['guest'] ?? 0;
  }
}
