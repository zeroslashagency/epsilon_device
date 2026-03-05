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
    const { data, error } = await supabase
      .from('device_status')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Map to clean format
    const devices = (data || []).map(device => ({
      id: device.device_id,
      battery: device.battery_level,
      status: device.status,
      lastSeen: device.last_sync,
      updatedAt: device.updated_at
    }))

    return res.status(200).json(devices)
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Failed to fetch devices',
      message: error.message 
    })
  }
}
