import 'package:live_shared/live_shared.dart';
import 'package:test/test.dart';

void main() {
  group('LiveLogResponse parsing', () {
    test('parses valid live payload', () {
      final payload = {
        'device_id': 15,
        'latest': {'log_time': '2026-03-02T10:30:08Z', 'battery': 30},
      };

      final parsed = LiveLogResponse.fromJson(payload);

      expect(parsed.deviceId, 15);
      expect(parsed.latest, isNotNull);
      expect(parsed.latest?.battery, 30);
    });

    test('supports null latest', () {
      final payload = {'device_id': 16, 'latest': null};

      final parsed = LiveLogResponse.fromJson(payload);

      expect(parsed.deviceId, 16);
      expect(parsed.latest, isNull);
    });
  });
}
