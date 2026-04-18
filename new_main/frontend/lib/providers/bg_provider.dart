import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The 6 background themes, matching the legacy cycle:
///   dark → light → rain → bubble → bubble_slow → bubble_color → dark …
enum AppBg {
  dark,        // 🌙 default dark radial gradient
  light,       // ☀️ light grey gradient
  rain,        // 🌧️ diagonal stripe pattern
  bubble,      // 🫧 bouncing dark circles (speed 1.0)
  bubbleSlow,  // 🐌 same, speed 0.33
  bubbleColor, // 🎨 colorful slow circles
}

extension AppBgX on AppBg {
  String get emoji {
    switch (this) {
      case AppBg.dark:        return '🌙';
      case AppBg.light:       return '☀️';
      case AppBg.rain:        return '🌧️';
      case AppBg.bubble:      return '🫧';
      case AppBg.bubbleSlow:  return '🐌';
      case AppBg.bubbleColor: return '🎨';
    }
  }

  AppBg get next {
    final vals = AppBg.values;
    return vals[(vals.indexOf(this) + 1) % vals.length];
  }
}

/// Riverpod 3.x Notifier (StateNotifier removed in v3)
class BgNotifier extends Notifier<AppBg> {
  @override
  AppBg build() {
    // Load persisted value asynchronously after initial build
    _load();
    return AppBg.dark;
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString('app_bg');
      if (saved != null) {
        final found = AppBg.values.where((b) => b.name == saved).firstOrNull;
        if (found != null) state = found;
      }
    } catch (_) {}
  }

  Future<void> cycle() async {
    state = state.next;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('app_bg', state.name);
    } catch (_) {}
  }
}

final bgProvider = NotifierProvider<BgNotifier, AppBg>(BgNotifier.new);
