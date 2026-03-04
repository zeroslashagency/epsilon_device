# live_proxy

Dart proxy service for Epsilon device logs.

## Run

```bash
dart pub get
dart run bin/server.dart
```

## Endpoints

- `GET /api/live-log?device_id=15`
- `GET /api/live-log/15`
- `GET /api/live-log/batch?device_ids=15,16,17,18,19`
- `GET /health`

## Optional environment variables

- `PORT` (default `8080`)
- `UPSTREAM_BASE_URL` (default `https://app.epsilonengg.in`)
- `EPSILON_BASE_URL` (legacy alias of `UPSTREAM_BASE_URL`)
