# External API Documentation

Because this project uses Supabase, you do not need to build a custom backend to fetch device data. You can securely query the Supabase REST API directly from your external services to get the real-time battery status of any device.

## Get Current Device Status & Battery

You can fetch the current live battery level for a specific device using a simple `GET` request.

**Endpoint:**
```
GET https://zvjiqzdkylwarykhbzsg.supabase.co/rest/v1/device_status?device_id=eq.YOUR_DEVICE_ID&select=battery_level,status,last_sync
```

**Headers Required:**
```
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

### Example using cURL
Replace `YOUR_DEVICE_ID` with the actual string you entered in the mobile app (e.g., `SMARTOFFICE-001`).

```bash
curl -X GET "https://zvjiqzdkylwarykhbzsg.supabase.co/rest/v1/device_status?device_id=eq.SMARTOFFICE-001&select=battery_level,status,last_sync" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amlxemRreWx3YXJ5a2hienNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg4MjMsImV4cCI6MjA4MDMwNDgyM30.1wjMkuR-IEmwmbwSjwd7V8T6nK20e7q4mr1kZrkBe_w" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amlxemRreWx3YXJ5a2hienNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg4MjMsImV4cCI6MjA4MDMwNDgyM30.1wjMkuR-IEmwmbwSjwd7V8T6nK20e7q4mr1kZrkBe_w"
```

### Example JSON Response
```json
[
  {
    "battery_level": 84,
    "status": "online",
    "last_sync": "2026-03-03T21:00:00.000Z"
  }
]
```

## Get Latest Fill Triggers

If your external API needs to check if a device recently fell below its battery threshold, you can query the `feature_fill_trigger_events` table.

```bash
curl -X GET "https://zvjiqzdkylwarykhbzsg.supabase.co/rest/v1/feature_fill_trigger_events?device_id=eq.SMARTOFFICE-001&order=triggered_at.desc&limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amlxemRreWx3YXJ5a2hienNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg4MjMsImV4cCI6MjA4MDMwNDgyM30.1wjMkuR-IEmwmbwSjwd7V8T6nK20e7q4mr1kZrkBe_w" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amlxemRreWx3YXJ5a2hienNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg4MjMsImV4cCI6MjA4MDMwNDgyM30.1wjMkuR-IEmwmbwSjwd7V8T6nK20e7q4mr1kZrkBe_w"
```
