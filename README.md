# epsilon_live_sync monorepo

This repo is now split into separate folders for API, web, and mobile.

## Folder structure

- `services/live_proxy/` - Dart proxy API service
- `apps/web_dashboard/` - React + Vite web dashboard
- `apps/mobile_apk/` - Flutter Android app for sending device status
- `packages/live_shared/` - Shared Dart models/client for proxy integrations

> Existing root-level Flutter app files are kept as backup as requested.

## 1) Start proxy API (optional)

```bash
cd services/live_proxy
dart pub get
dart run bin/server.dart
```

Default endpoint examples:

- `GET http://localhost:8080/api/live-log?device_id=15`
- `GET http://localhost:8080/api/live-log/15`

## 2) Run web dashboard

```bash
cd apps/web_dashboard
cp .env.example .env.local
npm install
npm run dev
```

## 3) Run mobile APK app (Android)

```bash
cd apps/mobile_apk
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```

Build APK:

```bash
cd apps/mobile_apk
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```
