const assert = require('assert')
const { loadEnv, requireEnv } = require('./test-env.cjs')

const loadedFiles = loadEnv()

if (loadedFiles.length > 0) {
  console.log(`Loaded environment from: ${loadedFiles.join(', ')}`)
}

requireEnv(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])

function createMockRes() {
  return {
    headers: {},
    statusCode: null,
    jsonData: null,

    setHeader(key, value) {
      this.headers[key] = value
    },

    status(code) {
      this.statusCode = code
      return this
    },

    end() {
      return this
    },

    json(data) {
      this.jsonData = data
      return this
    },
  }
}

async function loadHandlers() {
  const devicesModule = await import('./api/devices.js')
  const triggersModule = await import('./api/triggers.js')

  return {
    devicesHandler: devicesModule.default,
    triggersHandler: triggersModule.default,
  }
}

async function runHandler(handler, req) {
  const res = createMockRes()
  await handler(req, res)
  return res
}

async function main() {
  const { devicesHandler, triggersHandler } = await loadHandlers()

  console.log('\nTest 2A: Testing devices API handler locally...')
  const devicesRes = await runHandler(devicesHandler, {
    method: 'GET',
    query: {},
  })

  assert.strictEqual(devicesRes.statusCode, 200, 'devices handler should return 200')
  assert.ok(Array.isArray(devicesRes.jsonData), 'devices handler should return an array')
  console.log(`✅ Test 2A PASSED: devices handler returned ${devicesRes.jsonData.length} device(s)`)

  const firstDeviceId = devicesRes.jsonData[0]?.id

  console.log('\nTest 2B: Testing triggers API handler locally...')
  const triggersRes = await runHandler(triggersHandler, {
    method: 'GET',
    query: firstDeviceId ? { device: firstDeviceId } : {},
  })

  assert.strictEqual(triggersRes.statusCode, 200, 'triggers handler should return 200')
  assert.ok(Array.isArray(triggersRes.jsonData), 'triggers handler should return an array')
  assert.ok(
    triggersRes.jsonData.every((trigger) => typeof trigger.triggerType === 'string'),
    'triggers handler should expose triggerType for each event',
  )
  console.log(`✅ Test 2B PASSED: triggers handler returned ${triggersRes.jsonData.length} trigger(s)`)
}

main().catch((err) => {
  console.error('❌ Test 2 FAILED:', err.message)
  process.exit(1)
})
