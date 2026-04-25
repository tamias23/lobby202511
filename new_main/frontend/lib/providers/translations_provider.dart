import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'locale_provider.dart';

final translationsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final locale = ref.watch(localeProvider);
  final str = await rootBundle.loadString('assets/translations.json');
  final data = jsonDecode(str) as Map<String, dynamic>;
  
  // Return the specific language map, falling back to English if missing
  return (data[locale.languageCode] as Map<String, dynamic>?) ?? (data['en'] as Map<String, dynamic>);
});

// Helper class for UI strings
class Tr {
  static String get(WidgetRef ref, String key) {
    final t = ref.watch(translationsProvider).value;
    if (t == null) return '';
    
    final parts = key.split('.');
    dynamic current = t;
    for (final part in parts) {
      if (current is Map && current.containsKey(part)) {
        current = current[part];
      } else {
        return key; // Fallback to key name if not found
      }
    }
    return current.toString();
  }
}

// Extension for easier access in build methods
extension TranslationExtension on WidgetRef {
  String tr(String key) => Tr.get(this, key);
}
