import 'package:flutter/foundation.dart';

/// Stub implementation for non-web platforms.
void saveFile(String content, String filename) {
  debugPrint('Save file not implemented for this platform: $filename');
}

/// Stub implementation for non-web platforms.
Future<String?> pickFileContent() async {
  debugPrint('Pick file not implemented for this platform');
  return null;
}
