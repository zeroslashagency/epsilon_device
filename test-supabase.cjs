// Test 1: Direct Supabase connection test
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zvjiqzdkylwarykhbzsg.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2amlxemRreWx3YXJ5a2hienNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Mjg4MjMsImV4cCI6MjA4MDMwNDgyM30.1wjMkuR-IEmwmbwSjwd7V8T6nK20e7q4mr1kZrkBe_w'

async function testSupabase() {
  console.log('Test 1: Testing direct Supabase connection...')
  console.log('URL:', supabaseUrl)
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Supabase client created')
    
    const { data, error } = await supabase
      .from('device_status')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Supabase query error:', error)
      process.exit(1)
    }
    
    console.log('✅ Test 1 PASSED: Supabase connection works')
    console.log('Data received:', JSON.stringify(data, null, 2))
    return true
  } catch (err) {
    console.error('❌ Test 1 FAILED:', err.message)
    process.exit(1)
  }
}

testSupabase()
