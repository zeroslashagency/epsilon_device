import 'dart:convert';

import 'package:http/http.dart' as http;

const String _proxyBaseUrlFromEnvironment = String.fromEnvironment(
  'LIVE_PROXY_BASE_URL',
);

const bool _isWebRuntime = bool.fromEnvironment('dart.library.js_util');

class LiveLogApiClient {
  LiveLogApiClient({http.Client? client, String? baseUrl})
    : _client = client ?? http.Client(),
      _baseUri = _resolveBaseUri(baseUrl);

  final http.Client _client;
  final Uri _baseUri;

  Uri get baseUri => _baseUri;

  static Uri _resolveBaseUri(String? baseUrl) {
    final rawBaseUrl = (baseUrl ?? _proxyBaseUrlFromEnvironment).trim();
    if (rawBaseUrl.isNotEmpty) {
      return Uri.parse(rawBaseUrl);
    }

    if (_isWebRuntime) {
      return Uri.parse(Uri.base.origin);
    }

    return Uri.parse('http://localhost:8080');
  }

  Future<LiveLogResponse> fetchLiveLog(int deviceId) async {
    final uri = _buildUri('/api/live-log', {'device_id': '$deviceId'});

    final response = await _client
        .get(uri)
        .timeout(const Duration(seconds: 12));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _buildApiError(response);
    }

    final payload = _decodeObject(response.body);
    return LiveLogResponse.fromJson(payload);
  }

  Future<List<LiveLogResponse>> fetchBatchLogs(List<int> deviceIds) async {
    final csvIds = deviceIds.join(',');
    final uri = _buildUri('/api/live-log/batch', {'device_ids': csvIds});

    final response = await _client
        .get(uri)
        .timeout(const Duration(seconds: 20));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _buildApiError(response);
    }

    final payload = _decodeObject(response.body);
    final rawItems = payload['items'];

    if (rawItems is! List) {
      throw const ApiRequestException('Invalid batch response payload.');
    }

    return rawItems
        .whereType<Map>()
        .map(
          (item) => LiveLogResponse.fromJson(
            item.map((key, value) => MapEntry('$key', value)),
          ),
        )
        .toList();
  }

  Uri _buildUri(String endpoint, [Map<String, String>? queryParameters]) {
    final normalizedEndpoint = endpoint.startsWith('/')
        ? endpoint
        : '/$endpoint';

    final basePath = _baseUri.path.endsWith('/')
        ? _baseUri.path.substring(0, _baseUri.path.length - 1)
        : _baseUri.path;

    final mergedPath = '$basePath$normalizedEndpoint';

    return _baseUri.replace(path: mergedPath, queryParameters: queryParameters);
  }

  ApiRequestException _buildApiError(http.Response response) {
    final status = response.statusCode;
    final fallback = 'Request failed with HTTP $status';

    try {
      final payload = _decodeObject(response.body);
      final error = payload['error'];

      if (error is String && error.isNotEmpty) {
        return ApiRequestException(error, statusCode: status);
      }

      if (error is Map && error['message'] is String) {
        return ApiRequestException('${error['message']}', statusCode: status);
      }
    } catch (_) {
      return ApiRequestException(fallback, statusCode: status);
    }

    return ApiRequestException(fallback, statusCode: status);
  }

  Map<String, dynamic> _decodeObject(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map) {
      throw const ApiRequestException('Invalid JSON payload.');
    }
    return decoded.map((key, value) => MapEntry('$key', value));
  }
}

class LiveLogResponse {
  const LiveLogResponse({required this.deviceId, this.latest, this.error});

  final int deviceId;
  final LiveLogLatest? latest;
  final String? error;

  bool get hasData => latest != null;

  factory LiveLogResponse.fromJson(Map<String, dynamic> json) {
    final rawDeviceId = json['device_id'];
    final deviceId = switch (rawDeviceId) {
      int value => value,
      num value => value.toInt(),
      String value => int.tryParse(value),
      _ => null,
    };

    if (deviceId == null) {
      throw const ApiRequestException('device_id is missing in response.');
    }

    final rawLatest = json['latest'];
    final latest = rawLatest is Map
        ? LiveLogLatest.fromJson(
            rawLatest.map((key, value) => MapEntry('$key', value)),
          )
        : null;

    final rawError = json['error'];
    final error = rawError == null ? null : '$rawError';

    return LiveLogResponse(deviceId: deviceId, latest: latest, error: error);
  }
}

class LiveLogLatest {
  const LiveLogLatest({required this.logTime, required this.battery});

  final DateTime logTime;
  final num? battery;

  factory LiveLogLatest.fromJson(Map<String, dynamic> json) {
    final rawLogTime = json['log_time'];
    final parsedLogTime = DateTime.tryParse('$rawLogTime');

    if (parsedLogTime == null) {
      throw const ApiRequestException('latest.log_time is invalid.');
    }

    final rawBattery = json['battery'];
    final battery = switch (rawBattery) {
      num value => value,
      String value => num.tryParse(value),
      _ => null,
    };

    return LiveLogLatest(logTime: parsedLogTime.toUtc(), battery: battery);
  }
}

class ApiRequestException implements Exception {
  const ApiRequestException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() {
    if (statusCode == null) {
      return message;
    }
    return 'HTTP $statusCode: $message';
  }
}
