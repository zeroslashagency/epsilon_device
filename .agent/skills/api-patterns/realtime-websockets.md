# Realtime WebSockets & Pub/Sub Patterns

When building live dashboards or collaborative tools, replace REST polling (`setInterval(() => fetch(...), 5000)`) with persistent WebSocket connections for efficiency and instant updates.

## Core Rules

1.  **Do Not Poll:** Instead of fetching data every N seconds, establish a subscription channel to the database table or topic.
2.  **Graceful Disconnects:** Always provide a mechanism to unsubscribe or leave channels when a component unmounts or a user logs out to prevent memory leaks and zombie connections.
3.  **Connection Management:** Handle reconnection logic silently. If the connection drops, attempt to reconnect and fetch a full state sync upon success.
4.  **Payload Efficiency:** Filter subscriptions tightly (e.g., `filter: 'device_id=eq.123'`) to avoid pushing unnecessary data over the wire.

## Supabase Realtime Strategy (2025)

For applications utilizing Supabase, implement Realtime subscriptions to track INSERT, UPDATE, or DELETE events instantly.

**React Example (Receiver/Dashboard):**
```typescript
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export function useLiveDevice(deviceId: string) {
  const [device, setDevice] = useState(null)

  useEffect(() => {
    // 1. Initial Fetch
    const fetchInitial = async () => {
      const { data } = await supabase.from('device_status').select('*').eq('device_id', deviceId).single()
      setDevice(data)
    }
    fetchInitial()

    // 2. Setup Subscription
    const channel = supabase
      .channel(`device_${deviceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_status', filter: `device_id=eq.${deviceId}` },
        (payload) => {
          setDevice(payload.new) // Instantly apply live update
        }
      )
      .subscribe()

    // 3. Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [deviceId])

  return device
}
```

## Security & Context

*   **RLS Applies:** Realtime subscriptions respect Row Level Security (RLS). A client will only receive updates for rows they are authorized to read.
*   **Replication Status:** Ensure the target table has "Realtime" replication enabled in the database (`ALTER PUBLICATION supabase_realtime ADD TABLE tablename;`).
