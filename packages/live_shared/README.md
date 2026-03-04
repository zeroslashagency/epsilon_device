# live_shared

Shared Dart package for the Epsilon live monitor apps.

Exports:

- `LiveLogApiClient`
- `LiveLogResponse`
- `LiveLogLatest`
- `ApiRequestException`

Notes:

- `LiveLogApiClient` targets proxy endpoints (`/api/live-log` and `/api/live-log/batch`).
- Proxy endpoints currently expect numeric `device_id` values.

Default base URL resolution:

1. `--dart-define=LIVE_PROXY_BASE_URL=...`
2. Web: current origin
3. Non-web: `http://localhost:8080`
