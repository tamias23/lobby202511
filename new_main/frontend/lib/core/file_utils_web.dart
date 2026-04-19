// ignore: avoid_web_libraries_in_flutter
import 'dart:async';
import 'dart:html' as html;

/// Web-specific implementation using AnchorElement to trigger a browser download.
void saveFile(String content, String filename) {
  final blob = html.Blob([content], 'application/json');
  final url = html.Url.createObjectUrlFromBlob(blob);
  final anchor = html.AnchorElement(href: url)
    ..setAttribute("download", filename)
    ..click();
  html.Url.revokeObjectUrl(url);
}

/// Web-specific implementation using a hidden file input to pick a JSON file.
Future<String?> pickFileContent() {
  final completer = Completer<String?>();
  final input = html.FileUploadInputElement()
    ..accept = '.json'
    ..click();

  input.onChange.listen((event) {
    final files = input.files;
    if (files == null || files.isEmpty) {
      completer.complete(null);
      return;
    }
    final reader = html.FileReader();
    reader.onLoadEnd.listen((_) {
      completer.complete(reader.result as String?);
    });
    reader.onError.listen((_) {
      completer.complete(null);
    });
    reader.readAsText(files[0]);
  });

  // If user cancels the dialog, complete with null after a timeout
  // (there's no reliable cancel event in browsers)
  return completer.future;
}
