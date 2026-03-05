// Test 2: Local API function test
// Load env vars first
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1]] = match[2]
    }
  })
  console.log('Loaded .env file')
}

const devicesHandler = require('./api/v2/devices.cjs')

// Mock request and response
const mockReq = {
  method: 'GET',
  query: {}
}

const mockRes = {
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
    console.log('Response ended with status:', this.statusCode)
    return this
  },
  
  json(data) {
    this.jsonData = data
    console.log('Response JSON:', JSON.stringify(data, null, 2))
    return this
  }
}

async function testDevicesAPI() {
  console.log('\nTest 2: Testing devices API function locally...')
  
  try {
    await devicesHandler(mockReq, mockRes)
    
    if (mockRes.statusCode === 200) {
      console.log('✅ Test 2 PASSED: Devices API works locally')
      console.log('Devices count:', mockRes.jsonData?.length || 0)
    } else {
      console.log('❌ Test 2 FAILED: Status', mockRes.statusCode)
    }
  } catch (err) {
    console.error('❌ Test 2 FAILED:', err.message)
    console.error(err.stack)
  }
}

testDevicesAPI()
