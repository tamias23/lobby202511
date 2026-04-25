import 'package:flutter/material.dart';
import 'legal_doc_dialog.dart';

class TermsDialog {
  static void show(BuildContext context) {
    LegalDocDialog.show(context,
      title: 'Terms of Use',
      assetPath: 'assets/legal/terms.md',
    );
  }
}
