# mobile_apk

Android-only Flutter app for manual live device checks.

## Run

```bash
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```

## Build release APK

```bash
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
```

Flow:

- Enter `device_id` once
- Tap `Push Status Ping`
- Optional `Change Device ID`
