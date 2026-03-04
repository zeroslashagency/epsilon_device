import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';

Future<void> main() async {
  final port = int.tryParse(Platform.environment['PORT'] ?? '') ?? 8080;
  final upstreamBaseUrl = _resolveUpstreamBaseUrl();

  final logService = EpsilonDeviceLogService(
    client: http.Client(),
    epsilonBaseUri: Uri.parse(upstreamBaseUrl),
  );

  final router = Router()
    ..get('/health', (_) => _jsonResponse(200, {'status': 'ok'}))
    ..get(
      '/api/live-log',
      (request) => _singleLiveLogHandler(request, logService),
    )
    ..get(
      '/api/live-log/<id>',
      (request, String id) =>
          _singleLiveLogAliasHandler(request, id, logService),
    )
    ..get(
      '/api/live-log=<id>',
      (request, String id) =>
          _singleLiveLogAliasHandler(request, id, logService),
    )
    ..get(
      '/api/live-log/batch',
      (request) => _batchLiveLogHandler(request, logService),
    )
    ..options('/<ignored|.*>', (_) => _jsonResponse(200, {'status': 'ok'}));

  final handler = const Pipeline()
      .addMiddleware(logRequests())
      .addMiddleware(_corsMiddleware())
      .addHandler(router.call);

  final server = await shelf_io.serve(handler, InternetAddress.anyIPv4, port);
  server.autoCompress = true;

  stdout.writeln('Live proxy started on http://0.0.0.0:$port');
  stdout.writeln('Using upstream: $upstreamBaseUrl/api/v2/device-log');
}

Future<Response> _singleLiveLogHandler(
  Request request,
  EpsilonDeviceLogService logService,
) async {
  final rawDeviceId = request.url.queryParameters['device_id'];
  final deviceId = int.tryParse(rawDeviceId ?? '');

  if (deviceId == null) {
    return _jsonResponse(400, {'error': 'invalid_device_id'});
  }

  try {
    final result = await logService.fetchLatest(deviceId);
    return _jsonResponse(200, result);
  } on UpstreamApiException catch (error) {
    return _jsonResponse(error.statusCode ?? 502, {'error': error.message});
  } catch (_) {
    return _jsonResponse(500, {'error': 'unexpected_server_error'});
  }
}

Future<Response> _singleLiveLogAliasHandler(
  Request request,
  String rawDeviceId,
  EpsilonDeviceLogService logService,
) async {
  final deviceId = int.tryParse(rawDeviceId);

  if (deviceId == null) {
    return _jsonResponse(400, {'error': 'invalid_device_id'});
  }

  try {
    final result = await logService.fetchLatest(deviceId);
    return _jsonResponse(200, result);
  } on UpstreamApiException catch (error) {
    return _jsonResponse(error.statusCode ?? 502, {'error': error.message});
  } catch (_) {
    return _jsonResponse(500, {'error': 'unexpected_server_error'});
  }
}

Future<Response> _batchLiveLogHandler(
  Request request,
  EpsilonDeviceLogService logService,
) async {
  final rawDeviceIds = request.url.queryParameters['device_ids'];

  if (rawDeviceIds == null || rawDeviceIds.trim().isEmpty) {
    return _jsonResponse(400, {'error': 'device_ids_missing'});
  }

  final parsedIds = rawDeviceIds
      .split(',')
      .map((id) => id.trim())
      .where((id) => id.isNotEmpty)
      .map(int.tryParse)
      .toList();

  if (parsedIds.any((id) => id == null)) {
    return _jsonResponse(400, {'error': 'invalid_device_ids'});
  }

  final ids = parsedIds.whereType<int>().toSet().toList()..sort();

  final items = await Future.wait(
    ids.map((id) async {
      try {
        return await logService.fetchLatest(id);
      } on UpstreamApiException catch (error) {
        return {'device_id': id, 'latest': null, 'error': error.message};
      } catch (_) {
        return {'device_id': id, 'latest': null, 'error': 'unexpected_error'};
      }
    }),
  );

  return _jsonResponse(200, {'items': items});
}

class EpsilonDeviceLogService {
  EpsilonDeviceLogService({
    required http.Client client,
    required Uri epsilonBaseUri,
  }) : _client = client,
       _upstreamUri = epsilonBaseUri.replace(path: '/api/v2/device-log');

  final http.Client _client;
  final Uri _upstreamUri;

  Future<Map<String, dynamic>> fetchLatest(int deviceId) async {
    final now = DateTime.now();
    final startTime = now.subtract(const Duration(minutes: 1));

    final uri = _upstreamUri.replace(
      queryParameters: {
        'start_date': _formatDate(startTime),
        'end_date': _formatDate(now),
        'device_id': '$deviceId',
      },
    );

    http.Response response;
    try {
      response = await _client
          .get(uri, headers: {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw const UpstreamApiException('upstream_timeout', statusCode: 504);
    }

    final payload = _decodeMap(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw UpstreamApiException(
        _extractUpstreamError(payload) ??
            'upstream_http_${response.statusCode.toString()}',
        statusCode: response.statusCode,
      );
    }

    if (payload['success'] != true) {
      throw UpstreamApiException(
        _extractUpstreamError(payload) ?? 'upstream_failed',
      );
    }

    final logs = _extractLogs(payload);
    final latest = _pickLatestLog(logs);

    if (latest == null) {
      return {'device_id': deviceId, 'latest': null};
    }

    return {
      'device_id': deviceId,
      'latest': {
        'log_time': _normalizeLogTime(latest['log_time']),
        'battery': _parseBattery(latest['battery']),
      },
    };
  }

  List<Map<String, dynamic>> _extractLogs(Map<String, dynamic> payload) {
    final result = payload['result'];
    if (result is! Map) {
      return const [];
    }

    final rawLogs = result['logs'];
    if (rawLogs is! List) {
      return const [];
    }

    return rawLogs
        .whereType<Map>()
        .map((item) => item.map((key, value) => MapEntry('$key', value)))
        .toList();
  }

  Map<String, dynamic>? _pickLatestLog(List<Map<String, dynamic>> logs) {
    if (logs.isEmpty) {
      return null;
    }

    Map<String, dynamic>? latestLog;
    DateTime? latestTime;

    for (final log in logs) {
      final parsedTime = DateTime.tryParse('${log['log_time']}');
      if (parsedTime == null) {
        continue;
      }

      if (latestTime == null || parsedTime.isAfter(latestTime)) {
        latestTime = parsedTime;
        latestLog = log;
      }
    }

    return latestLog ?? logs.last;
  }

  String _normalizeLogTime(dynamic rawLogTime) {
    final parsed = DateTime.tryParse('$rawLogTime');
    if (parsed == null) {
      return '$rawLogTime';
    }
    return parsed.toUtc().toIso8601String();
  }

  num? _parseBattery(dynamic rawBattery) {
    return switch (rawBattery) {
      num value => value,
      String value => num.tryParse(value),
      _ => null,
    };
  }
}

class UpstreamApiException implements Exception {
  const UpstreamApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;
}

String _resolveUpstreamBaseUrl() {
  final upstreamBaseUrl =
      Platform.environment['UPSTREAM_BASE_URL']?.trim() ?? '';
  if (upstreamBaseUrl.isNotEmpty) {
    return upstreamBaseUrl;
  }

  final legacyEpsilonBaseUrl =
      Platform.environment['EPSILON_BASE_URL']?.trim() ?? '';
  if (legacyEpsilonBaseUrl.isNotEmpty) {
    return legacyEpsilonBaseUrl;
  }

  return 'https://app.epsilonengg.in';
}

String _formatDate(DateTime dateTime) {
  final local = dateTime.toLocal();
  return '${_two(local.day)}-${_two(local.month)}-${local.year} '
      '${_two(local.hour)}:${_two(local.minute)}';
}

String _two(int value) => value.toString().padLeft(2, '0');

String? _extractUpstreamError(Map<String, dynamic> payload) {
  final error = payload['error'];
  if (error is String && error.isNotEmpty) {
    return error;
  }
  if (error is Map) {
    final message = error['message'];
    if (message is String && message.isNotEmpty) {
      return message;
    }
  }
  return null;
}

Map<String, dynamic> _decodeMap(String responseBody) {
  final decoded = jsonDecode(responseBody);
  if (decoded is! Map) {
    throw const UpstreamApiException('invalid_upstream_payload');
  }

  return decoded.map((key, value) => MapEntry('$key', value));
}

Response _jsonResponse(int statusCode, Map<String, dynamic> payload) {
  return Response(
    statusCode,
    body: jsonEncode(payload),
    headers: {'Content-Type': 'application/json'},
  );
}

Middleware _corsMiddleware() {
  return (innerHandler) {
    return (request) async {
      if (request.method == 'OPTIONS') {
        return Response(200, headers: _corsHeaders);
      }

      final response = await innerHandler(request);
      return response.change(headers: {...response.headers, ..._corsHeaders});
    };
  };
}

const Map<String, String> _corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};
