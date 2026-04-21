const fs = require('fs')
const path = require('path')

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function shouldResetNextArtifacts(rootDir) {
  const nextDir = path.join(rootDir, '.next')
  const manifestPath = path.join(nextDir, 'build-manifest.json')
  const chunksDir = path.join(nextDir, 'static', 'chunks')

  if (!fs.existsSync(nextDir) || !fs.existsSync(manifestPath) || !fs.existsSync(chunksDir)) {
    return false
  }

  const manifest = safeReadJson(manifestPath)
  const rootMainFiles = Array.isArray(manifest?.rootMainFiles) ? manifest.rootMainFiles : []
  const expectsMainApp = rootMainFiles.includes('static/chunks/main-app.js')

  if (!expectsMainApp) {
    return false
  }

  const unhashedMainAppPath = path.join(chunksDir, 'main-app.js')
  if (fs.existsSync(unhashedMainAppPath)) {
    return false
  }

  const chunkNames = fs.readdirSync(chunksDir)
  const hashedMainAppExists = chunkNames.some((name) => /^main-app-[^.]+\.js$/.test(name))

  return hashedMainAppExists
}

function main() {
  const rootDir = process.cwd()
  const nextDir = path.join(rootDir, '.next')

  if (!shouldResetNextArtifacts(rootDir)) {
    return
  }

  fs.rmSync(nextDir, { recursive: true, force: true })
  process.stdout.write('[clean-next-dev] Removed stale .next artifacts after main-app manifest mismatch.\n')
}

main()