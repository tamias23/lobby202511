import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'legal_doc_dialog.dart';
import '../providers/translations_provider.dart';

class PrivacyDialog {
  static void show(BuildContext context) {
    final container = ProviderScope.containerOf(context);
    final t = container.read(translationsProvider).value;
    final title = (t?['ui']?['privacy'] as String?) ?? 'Privacy Policy';
    LegalDocDialog.show(context,
      title: title,
      assetPath: 'assets/legal/privacy.md',
    );
  }
}
