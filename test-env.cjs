const fs = require('fs')
const path = require('path')

const ENV_FILES = ['.env', '.env.local']

function parseEnvFile(filePath, lockedKeys) {
  const envContent = fs.readFileSync(filePath, 'utf8')

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      return
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) {
      return
    }

    const [, key, rawValue] = match
    if (lockedKeys.has(key)) {
      return
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  })
}

function loadEnv() {
  const loadedFiles = []
  const lockedKeys = new Set(Object.keys(process.env))

  for (const fileName of ENV_FILES) {
    const envPath = path.join(__dirname, fileName)
    if (!fs.existsSync(envPath)) {
      continue
    }

    parseEnvFile(envPath, lockedKeys)
    loadedFiles.push(fileName)
  }

  return loadedFiles
}

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

module.exports = {
  loadEnv,
  requireEnv,
}
