import 'package:flutter/foundation.dart' show kIsWeb;

/// Application-wide configuration.
/// API URL can be injected at build time via --dart-define=API_URL=https://...
/// Defaults to empty string (same-origin: socket.io connects to current host).
class AppConfig {
  AppConfig._();

  static const String apiUrl = String.fromEnvironment('API_URL', defaultValue: '');

  /// Socket.io server URL.
  /// - In production: the explicit API_URL (e.g. https://dedalthegame.com)
  /// - In local dev (empty API_URL): use the current page's origin so
  ///   socket.io connects back to the same host:port (e.g. http://localhost:4000).
  ///   Empty string is NOT valid for socket_io_client — it throws.
  static String get socketUrl {
    if (apiUrl.isNotEmpty) return apiUrl;
    // Web: derive origin from the browser URL
    if (kIsWeb) return Uri.base.origin;
    // Native (debug): connect to localhost
    return 'http://localhost:4000';
  }

  /// True when running on the web platform.
  static bool get isWeb => kIsWeb;
}
