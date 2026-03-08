// Test 1: Direct Supabase connection test
const { createClient } = require('@supabase/supabase-js')
const { loadEnv, requireEnv } = require('./test-env.cjs')

const loadedFiles = loadEnv()

if (loadedFiles.length > 0) {
  console.log(`Loaded environment from: ${loadedFiles.join(', ')}`)
}

requireEnv(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

async function main() {
  console.log('Test 1: Testing direct Supabase connection...')
  console.log('URL:', supabaseUrl)
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Supabase client created')

  const { data, error } = await supabase
    .from('device_status')
    .select('*')
    .limit(1)

  if (error) {
    throw error
  }

  console.log('✅ Test 1 PASSED: Supabase connection works')
  console.log('Data received:', JSON.stringify(data, null, 2))
}

main().catch((err) => {
  console.error('❌ Test 1 FAILED:', err.message)
  process.exit(1)
})
