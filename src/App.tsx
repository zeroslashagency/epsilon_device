import { useEffect, useState } from 'react'
import { Activity, Droplets, BatteryFull, BatteryMedium, BatteryLow, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { supabase } from './lib/supabase'

interface DeviceStatusRow {
  device_id: string
  last_sync: string | null
  status: string | null
  battery_level: number | null
}

interface FillTriggerEvent {
  id: number
  device_id: string
  fill_percent: number
  threshold_percent: number
  triggered_at: string
}

interface DeviceState {
  id: string
  battery_level: number | null
  last_sync: string | null
  status: string | null
  latest_trigger: FillTriggerEvent | null
}

// Mobile app pings every 10s. If we don't hear from it in 30s, consider it offline.
const OFFLINE_THRESHOLD_MS = 30000

function App() {
  const [devices, setDevices] = useState<Record<string, DeviceState>>({})
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  // Timer to continuously force UI updates for the "Live / Offline" indicator
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(interval)
  }, [])

  // Initial Fetch & Realtime Setup
  useEffect(() => {
    let isMounted = true

    const fetchInitialData = async () => {
      try {
        // 1. Fetch all devices
        const { data: statusData, error: statusError } = await supabase
          .from('device_status')
          .select('*')
          .order('updated_at', { ascending: false })

        if (statusError) throw statusError

        // 2. Fetch the latest trigger event for each device
        const { data: triggerData, error: triggerError } = await supabase
          .from('feature_fill_trigger_events')
          .select('*')
          .order('triggered_at', { ascending: false })

        if (triggerError) throw triggerError

        if (!isMounted) return

        const newDevices: Record<string, DeviceState> = {}
        const sData = (statusData || []) as DeviceStatusRow[]
        const tData = (triggerData || []) as FillTriggerEvent[]

        for (const row of sData) {
          const latestTrigger = tData.find(t => t.device_id === row.device_id) || null
          newDevices[row.device_id] = {
            id: row.device_id,
            battery_level: row.battery_level,
            last_sync: row.last_sync,
            status: row.status,
            latest_trigger: latestTrigger
          }
        }

        setDevices(newDevices)

        // Select first device if none selected
        setDevices(current => {
          const keys = Object.keys(current)
          if (keys.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(keys[0])
          }
          return current
        })

      } catch (err: any) {
        if (isMounted) setGlobalError(err.message)
      }
    }

    void fetchInitialData()

    // --- REALTIME SUBSCRIPTIONS ---

    // 1. Listen for Live Battery / Status Updates
    const statusChannel = supabase.channel('public:device_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_status' }, (payload) => {
        const updatedRow = payload.new as DeviceStatusRow
        if (!updatedRow.device_id) return

        setDevices(prev => ({
          ...prev,
          [updatedRow.device_id]: {
            ...prev[updatedRow.device_id],
            id: updatedRow.device_id,
            battery_level: updatedRow.battery_level,
            last_sync: updatedRow.last_sync,
            status: updatedRow.status,
            // keep existing trigger
            latest_trigger: prev[updatedRow.device_id]?.latest_trigger || null
          }
        }))
      })
      .subscribe()

    // 2. Listen for Trigger Events
    const triggerChannel = supabase.channel('public:feature_fill_trigger_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feature_fill_trigger_events' }, (payload) => {
        const newTrigger = payload.new as FillTriggerEvent
        if (!newTrigger.device_id) return

        setDevices(prev => ({
          ...prev,
          [newTrigger.device_id]: {
            ...prev[newTrigger.device_id],
            id: newTrigger.device_id, // in case it triggered before status ping
            latest_trigger: newTrigger
          }
        }))
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(statusChannel)
      supabase.removeChannel(triggerChannel)
    }
  }, [selectedDeviceId])

  const deviceList = Object.values(devices)
  const selectedDevice = selectedDeviceId ? devices[selectedDeviceId] : null

  // Helpers
  const isOnline = (lastSync: string | null) => {
    if (!lastSync) return false
    return (now - new Date(lastSync).getTime()) <= OFFLINE_THRESHOLD_MS
  }

  const getBatteryIcon = (level: number | null) => {
    if (level === null) return <BatteryFull className="w-8 h-8 text-gray-500" />
    if (level > 50) return <BatteryFull className="w-8 h-8 text-emerald-400" />
    if (level > 20) return <BatteryMedium className="w-8 h-8 text-yellow-400" />
    return <BatteryLow className="w-8 h-8 text-red-500 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-white flex flex-col items-center pt-8 pb-20 font-sans">
      <div className="w-full max-w-5xl px-6">
        
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-light text-gray-200 tracking-wide flex items-center justify-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Unified Device Monitor
          </h1>
          <p className="text-sm text-gray-500 mt-2">Real-time battery tracking & trigger alerts</p>
        </header>

        {globalError && (
          <div className="mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-center">
            {globalError}
          </div>
        )}

        {deviceList.length === 0 ? (
          <div className="text-center p-12 bg-[#12151C] rounded-2xl border border-gray-800">
            <WifiOff className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300">No Devices Connected</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Launch the mobile app, enter a Device ID, and start syncing. Your device will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Sidebar: Device List */}
            <div className="col-span-1 flex flex-col gap-3">
              <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase ml-2 mb-2">Connected Devices</h2>
              
              {deviceList.map(device => {
                const online = isOnline(device.last_sync)
                const isSelected = selectedDeviceId === device.id
                
                return (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDeviceId(device.id)}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 border text-left ${
                      isSelected 
                        ? 'bg-[#1D222E] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-[#12151C] border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div>
                      <h3 className={`font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-300'}`}>
                        {device.id}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
                        <span className="text-xs text-gray-500 font-medium">
                          {online ? 'LIVE' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-light ${device.battery_level && device.battery_level <= 20 ? 'text-red-400' : 'text-gray-400'}`}>
                        {device.battery_level ?? '--'}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Main Content: Selected Device Details */}
            <div className="col-span-1 lg:col-span-2">
              {selectedDevice && (
                <div className="bg-[#12151C] border border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col gap-8 h-full">
                  
                  {/* Header Row */}
                  <div className="flex justify-between items-start border-b border-gray-800/50 pb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-100">{selectedDevice.id}</h2>
                      <p className="text-sm text-gray-500 mt-1 font-mono">
                        Last ping: {selectedDevice.last_sync ? new Date(selectedDevice.last_sync).toLocaleTimeString() : 'Never'}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${
                      isOnline(selectedDevice.last_sync) 
                        ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' 
                        : 'bg-red-900/20 border-red-500/30 text-red-400'
                    }`}>
                      {isOnline(selectedDevice.last_sync) ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                      <span className="text-sm font-bold tracking-wide uppercase">
                        {isOnline(selectedDevice.last_sync) ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>

                  {/* Battery Status Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0A0C10] p-6 rounded-2xl border border-gray-800/50 flex flex-col justify-center">
                      <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4">Live Battery Level</p>
                      <div className="flex items-center gap-4">
                        {getBatteryIcon(selectedDevice.battery_level)}
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-light text-white">
                            {selectedDevice.battery_level ?? '--'}
                          </span>
                          <span className="text-2xl text-gray-500">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Trigger Event Section INSIDE the device box */}
                    <div className={`p-6 rounded-2xl border relative overflow-hidden ${
                      selectedDevice.latest_trigger 
                        ? 'bg-red-900/10 border-red-900/30' 
                        : 'bg-[#0A0C10] border-gray-800/50'
                    }`}>
                      
                      {selectedDevice.latest_trigger && (
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
                      )}

                      <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
                        {selectedDevice.latest_trigger ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Droplets className="w-4 h-4 text-blue-400" />}
                        Latest Threshold Trigger
                      </p>

                      {selectedDevice.latest_trigger ? (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">
                            Triggered because battery dropped to <strong className="text-red-400">{selectedDevice.latest_trigger.fill_percent}%</strong> 
                            (Threshold: {selectedDevice.latest_trigger.threshold_percent}%)
                          </p>
                          <div className="inline-block mt-2 bg-black/40 px-3 py-1.5 rounded text-xs text-gray-300 font-mono border border-gray-800">
                            {new Date(selectedDevice.latest_trigger.triggered_at).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic mt-2">
                          No trigger events recorded for this device yet. Set a threshold in the mobile app to enable auto-triggers.
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default App
