import 'package:flutter/material.dart';
import 'legal_doc_dialog.dart';

class PrivacyDialog {
  static void show(BuildContext context) {
    LegalDocDialog.show(context,
      title: 'Privacy Policy',
      assetPath: 'assets/legal/privacy.md',
    );
  }
}
