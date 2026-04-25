import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_service.dart';

/// Holds the runtime feature flags returned by GET /api/config.
/// Fetched once at app startup; defaults to safe "all features visible" if
/// the request fails (so a backend outage doesn't break the UI entirely).
class ServerConfig {
  final bool showSubscribeButton;
  final bool tournamentsEnabled;

  const ServerConfig({
    this.showSubscribeButton = true,
    this.tournamentsEnabled = true,
  });

  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    return ServerConfig(
      showSubscribeButton: json['showSubscribeButton'] as bool? ?? true,
      tournamentsEnabled:  json['tournamentsEnabled']  as bool? ?? true,
    );
  }
}

/// AsyncNotifier that fetches /api/config once and caches the result.
class ServerConfigNotifier extends AsyncNotifier<ServerConfig> {
  @override
  Future<ServerConfig> build() async {
    final data = await ApiService.instance.getConfig();
    return ServerConfig.fromJson(data);
  }
}

final serverConfigProvider =
    AsyncNotifierProvider<ServerConfigNotifier, ServerConfig>(
        ServerConfigNotifier.new);
