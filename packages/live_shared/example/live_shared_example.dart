import 'package:live_shared/live_shared.dart';

void main() {
  final client = LiveLogApiClient(baseUrl: 'http://localhost:8080');
  print('Proxy base URL: ${client.baseUri}');
}
