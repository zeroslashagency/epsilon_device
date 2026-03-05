import { useEffect, useState, useCallback } from 'react'
import { Activity, Droplets, BatteryFull, BatteryMedium, BatteryLow, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react'
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

interface ThresholdSetting {
  device_id: string
  threshold_percent: number
}

interface DeviceState {
  id: string
  battery_level: number | null
  last_sync: string | null
  status: string | null
  threshold_percent: number | null
}

// Mobile app pings every 10s. If we don't hear from it in 30s, consider it offline.
const OFFLINE_THRESHOLD_MS = 30000

function App() {
  const [devices, setDevices] = useState<Record<string, DeviceState>>({})
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [allTriggers, setAllTriggers] = useState<FillTriggerEvent[]>([])

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

        // 2. Fetch all trigger events for history
        const { data: triggerData, error: triggerError } = await supabase
          .from('feature_fill_trigger_events')
          .select('*')
          .order('triggered_at', { ascending: false })

        if (triggerError) throw triggerError

        // 3. Fetch threshold settings for all devices
        const { data: thresholdData, error: thresholdError } = await supabase
          .from('feature_fill_trigger_settings')
          .select('*')

        if (thresholdError) throw thresholdError

        if (!isMounted) return

        const newDevices: Record<string, DeviceState> = {}
        const sData = (statusData || []) as DeviceStatusRow[]
        const tData = (triggerData || []) as FillTriggerEvent[]
        const thData = (thresholdData || []) as ThresholdSetting[]

        for (const row of sData) {
          const thresholdSetting = thData.find(t => t.device_id === row.device_id)
          newDevices[row.device_id] = {
            id: row.device_id,
            battery_level: row.battery_level,
            last_sync: row.last_sync,
            status: row.status,
            threshold_percent: thresholdSetting?.threshold_percent ?? null
          }
        }

        setDevices(newDevices)
        setAllTriggers(tData)

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
            threshold_percent: prev[updatedRow.device_id]?.threshold_percent ?? null
          }
        }))
      })
      .subscribe()

    // 2. Listen for Trigger Events
    const triggerChannel = supabase.channel('public:feature_fill_trigger_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feature_fill_trigger_events' }, (payload) => {
        const newTrigger = payload.new as FillTriggerEvent
        if (!newTrigger.device_id) return

        setAllTriggers(prev => [newTrigger, ...prev])
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
  
  // Get triggers for selected device
  const selectedDeviceTriggers = selectedDeviceId 
    ? allTriggers.filter(t => t.device_id === selectedDeviceId)
    : []

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Re-fetch all data
      const { data: statusData } = await supabase
        .from('device_status')
        .select('*')
        .order('updated_at', { ascending: false })
      
      const { data: triggerData } = await supabase
        .from('feature_fill_trigger_events')
        .select('*')
        .order('triggered_at', { ascending: false })
      
      const { data: thresholdData } = await supabase
        .from('feature_fill_trigger_settings')
        .select('*')

      const newDevices: Record<string, DeviceState> = {}
      const sData = (statusData || []) as DeviceStatusRow[]
      const tData = (triggerData || []) as FillTriggerEvent[]
      const thData = (thresholdData || []) as ThresholdSetting[]

      for (const row of sData) {
        const thresholdSetting = thData.find(t => t.device_id === row.device_id)
        newDevices[row.device_id] = {
          id: row.device_id,
          battery_level: row.battery_level,
          last_sync: row.last_sync,
          status: row.status,
          threshold_percent: thresholdSetting?.threshold_percent ?? null
        }
      }

      setDevices(newDevices)
      setAllTriggers(tData)
      setGlobalError(null)
    } catch (err: any) {
      setGlobalError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

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
        
        <header className="mb-10">
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-light text-gray-200 tracking-wide flex items-center justify-center gap-3">
                <Activity className="w-8 h-8 text-blue-500" />
                Unified Device Monitor
              </h1>
              <p className="text-sm text-gray-500 mt-2">Real-time battery tracking & trigger alerts</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#12151C] border border-gray-700 rounded-lg hover:border-blue-500/50 hover:bg-[#1D222E] transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
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
          <div className="flex gap-8">
            
            {/* Sidebar: Device List */}
            <div className="w-72 flex flex-col gap-2 flex-shrink-0">
              <h2 className="text-xs font-bold tracking-widest text-gray-500 uppercase ml-2 mb-2">Connected Devices</h2>
              
              {deviceList.map(device => {
                const isSelected = selectedDeviceId === device.id
                
                return (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDeviceId(device.id)}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 border text-left ${
                      isSelected 
                        ? 'bg-[#1D222E] border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-[#12151C] border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className={`font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-300'}`}>
                      {device.id}
                    </span>
                    <span className={`text-sm font-light ${device.battery_level && device.battery_level <= 20 ? 'text-red-400' : 'text-gray-400'}`}>
                      {device.battery_level ?? '--'}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Main Content: Selected Device Details */}
            <div className="flex-1">
              {selectedDevice && (
                <div className="space-y-6">
                  
                  {/* Device Header */}
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-100">{selectedDevice.id}</h2>
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

                  {/* Live Battery Level Box */}
                  <div className="bg-[#12151C] border border-gray-800 rounded-2xl p-8">
                    <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-6">Live Battery Level</p>
                    <div className="flex items-center gap-6">
                      {getBatteryIcon(selectedDevice.battery_level)}
                      <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-light text-white">
                          {selectedDevice.battery_level ?? '--'}
                        </span>
                        <span className="text-3xl text-gray-500">%</span>
                      </div>
                    </div>
                    
                    {selectedDevice.threshold_percent !== null && (
                      <div className="mt-6 pt-6 border-t border-gray-800/50">
                        <p className="text-sm text-gray-400">
                          Alert Threshold: <span className="text-orange-400 font-semibold">{selectedDevice.threshold_percent}%</span>
                        </p>
                      </div>
                    )}
                    
                    <p className="mt-4 text-sm text-gray-500">
                      Last updated: {selectedDevice.last_sync 
                        ? new Date(selectedDevice.last_sync).toLocaleString() 
                        : 'Never'}
                    </p>
                  </div>

                  {/* Trigger Log Section */}
                  <div className={`bg-[#12151C] border rounded-2xl overflow-hidden ${
                    selectedDeviceTriggers.length > 0 
                      ? 'border-red-900/30' 
                      : 'border-gray-800'
                  }`}>
                    {selectedDeviceTriggers.length > 0 && (
                      <div className="h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
                    )}
                    
                    <div className="p-6">
                      <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 flex items-center gap-2">
                        {selectedDeviceTriggers.length > 0 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Droplets className="w-4 h-4 text-blue-400" />}
                        Log of Trigger
                      </p>

                      {selectedDeviceTriggers.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                          {selectedDeviceTriggers.map((trigger) => (
                            <div key={trigger.id} className="flex items-start gap-3 p-3 bg-[#0A0C10] rounded-lg border border-gray-800/50">
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-300">
                                  Battery dropped to <span className="text-red-400 font-semibold">{trigger.fill_percent}%</span>
                                  <span className="text-gray-500"> (Threshold: {trigger.threshold_percent}%)</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  {new Date(trigger.triggered_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
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
