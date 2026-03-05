import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { device } = req.query
    
    let query = supabase
      .from('feature_fill_trigger_events')
      .select('*')
      .order('triggered_at', { ascending: false })

    // Filter by device if provided
    if (device && typeof device === 'string') {
      query = query.eq('device_id', device)
    }

    const { data, error } = await query

    if (error) throw error

    // Map to clean format
    const triggers = (data || []).map(trigger => ({
      id: trigger.id,
      deviceId: trigger.device_id,
      batteryLevel: trigger.fill_percent,
      threshold: trigger.threshold_percent,
      triggeredAt: trigger.triggered_at,
      backgroundColor: trigger.background_color,
      deviceType: trigger.device_type
    }))

    return res.status(200).json(triggers)
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Failed to fetch triggers',
      message: error.message 
    })
  }
}
