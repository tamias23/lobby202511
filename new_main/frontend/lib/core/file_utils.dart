import 'file_utils_stub.dart'
    if (dart.library.html) 'file_utils_web.dart';

/// Triggers a browser download of the given [content] string.
void downloadFile(String content, String filename) {
  saveFile(content, filename);
}

/// Opens a file picker dialog and returns the content of the selected JSON file.
/// Returns null if no file was selected or reading failed.
Future<String?> pickJsonFile() {
  return pickFileContent();
}
