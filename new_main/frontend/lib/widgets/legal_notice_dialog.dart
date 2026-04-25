import 'package:flutter/material.dart';
import 'legal_doc_dialog.dart';

class LegalNoticeDialog {
  static void show(BuildContext context) {
    LegalDocDialog.show(context,
      title: 'Legal Notice',
      assetPath: 'assets/legal/legal_notice.md',
    );
  }
}
