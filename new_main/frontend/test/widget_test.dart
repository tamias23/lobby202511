import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dedal_app/app.dart';

void main() {
  testWidgets('App launches', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: DedalApp()));
    expect(find.byType(ProviderScope), findsOneWidget);
  });
}
