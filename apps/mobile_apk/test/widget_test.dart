import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_apk/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows device setup flow', (tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const MobileApkApp());
    await tester.pumpAndSettle();

    expect(find.text('Set Device ID'), findsOneWidget);
    expect(find.text('Save Device ID'), findsOneWidget);
  });
}
