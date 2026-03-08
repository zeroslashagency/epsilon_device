const assert = require('assert')

const baseUrl = process.env.V2_API_BASE_URL || 'https://epsilondevice.vercel.app/v2'

async function expectJson(method, path, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
  })

  const bodyText = await response.text()

  assert.strictEqual(
    response.status,
    expectedStatus,
    `${method} ${path} should return ${expectedStatus}, got ${response.status}`,
  )

  return {
    headers: response.headers,
    bodyText,
  }
}

async function main() {
  console.log(`Testing live API at ${baseUrl}`)

  const devices = await expectJson('GET', '/devices', 200)
  const devicesJson = JSON.parse(devices.bodyText)
  assert.ok(Array.isArray(devicesJson), 'GET /devices should return an array')
  console.log(`✅ Live GET /devices PASSED: ${devicesJson.length} device(s)`)

  const triggers = await expectJson('GET', '/triggers', 200)
  const triggersJson = JSON.parse(triggers.bodyText)
  assert.ok(Array.isArray(triggersJson), 'GET /triggers should return an array')
  console.log(`✅ Live GET /triggers PASSED: ${triggersJson.length} trigger(s)`)

  await expectJson('OPTIONS', '/devices', 200)
  console.log('✅ Live OPTIONS /devices PASSED')

  const postDevices = await expectJson('POST', '/devices', 405)
  assert.ok(postDevices.bodyText.includes('Method not allowed'), 'POST /devices should reject writes')
  console.log('✅ Live POST /devices PASSED')
}

main().catch((err) => {
  console.error('❌ Live API test FAILED:', err.message)
  process.exit(1)
})
