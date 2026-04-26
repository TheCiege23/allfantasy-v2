/**
 * Clean dev artifacts before `next dev` starts.
 *
 * Two modes:
 *   default  — conservative. Only wipes `.next` when a specific corruption
 *              pattern is detected (missing vendor chunks, or a hashed main-app
 *              chunk without the unhashed counterpart). The webpack-runtime
 *              vendor-chunk check catches the exact `Cannot find module
 *              './vendor-chunks/next-auth.js'` failure mode that bites Next 14
 *              dev on Windows.
 *
 *   --deep   — aggressive. Wipes `.next` AND `node_modules/.cache` AND `.swc`
 *              unconditionally. Use when stale chunks keep re-rotting between
 *              restarts (the `npm run dev:reset` workflow).
 *
 * SAFETY: only deletes generated artifacts. Never touches source files,
 * prisma migrations, .env files, uploaded assets, or anything outside the
 * known-generated allow-list. EBUSY (locked file on Windows) is caught and
 * surfaced as a warning rather than a crash.
 */

const fs = require('fs')
const path = require('path')

const WINDOWS = process.platform === 'win32'
const ARGV = process.argv.slice(2)
const FLAG_DEEP = ARGV.includes('--deep')
const FLAG_VERBOSE = ARGV.includes('--verbose') || ARGV.includes('-v') || FLAG_DEEP

function envFlag(name) {
  const value = (process.env[name] || '').trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function log(msg) {
  process.stdout.write(`[clean-next-dev] ${msg}\n`)
}

/** Allow-list of paths that are safe to remove. ANY path passed to
 *  `removeIfPresent` must be one of these (or a child of `.next`). The
 *  function refuses anything else as a defense against typos / future bugs. */
const SAFE_ROOTS = new Set([
  '.next',
  'node_modules/.cache',
  '.swc',
  '.turbo',
])

function isSafePath(rootDir, target) {
  const rel = path.relative(rootDir, target).replace(/\\/g, '/')
  // Reject anything that escapes rootDir (relative path starting with `..`).
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false
  // Match exactly one of the safe roots, or be a descendant of `.next`.
  if (SAFE_ROOTS.has(rel)) return true
  if (rel.startsWith('.next/')) return true
  return false
}

function removeIfPresent(rootDir, relPath) {
  const target = path.join(rootDir, relPath)
  if (!isSafePath(rootDir, target)) {
    log(`SKIP unsafe path (not in allow-list): ${relPath}`)
    return { removed: false, reason: 'unsafe' }
  }
  if (!fs.existsSync(target)) {
    if (FLAG_VERBOSE) log(`skip ${relPath} (does not exist)`)
    return { removed: false, reason: 'missing' }
  }
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    log(`removed ${relPath}`)
    return { removed: true, reason: 'ok' }
  } catch (err) {
    const code = err && err.code
    if (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY') {
      // On Windows a still-running dev server can hold file handles open. We
      // surface this clearly so the user knows to kill the previous process
      // (use `npm run dev:kill` or close the previous `next dev` window).
      log(
        `WARN locked file under ${relPath} (${code}). Close any running ` +
          `dev server (or run \`npm run dev:kill\`) and try again.`,
      )
      return { removed: false, reason: 'locked', error: err }
    }
    log(`WARN failed to remove ${relPath}: ${err.message || String(err)}`)
    return { removed: false, reason: 'error', error: err }
  }
}

function collectVendorChunkRefs(runtimeSource) {
  const refs = new Set()
  const regex = /\.\/vendor-chunks\/([^"'\\]+)\.js/g
  let match
  while ((match = regex.exec(runtimeSource)) !== null) {
    refs.add(`${match[1]}.js`)
  }
  return refs
}

function hasMissingVendorChunks(nextDir) {
  const runtimePath = path.join(nextDir, 'server', 'webpack-runtime.js')
  if (!fs.existsSync(runtimePath)) {
    return false
  }

  const runtimeSource = safeReadText(runtimePath)
  if (!runtimeSource.includes('./vendor-chunks/')) {
    return false
  }

  const vendorDir = path.join(nextDir, 'server', 'vendor-chunks')
  const refs = collectVendorChunkRefs(runtimeSource)
  if (refs.size === 0) {
    return false
  }

  for (const fileName of refs) {
    if (!fs.existsSync(path.join(vendorDir, fileName))) {
      return true
    }
  }

  return false
}

function shouldResetNextArtifacts(rootDir) {
  const nextDir = path.join(rootDir, '.next')
  const manifestPath = path.join(nextDir, 'build-manifest.json')
  const chunksDir = path.join(nextDir, 'static', 'chunks')

  if (!fs.existsSync(nextDir)) {
    return false
  }

  // Optional full reset for Windows dev sessions where cache corruption is frequent.
  if (WINDOWS && envFlag('AF_NEXT_DEV_CLEAN_ALWAYS')) {
    return true
  }

  if (hasMissingVendorChunks(nextDir)) {
    return true
  }

  if (!fs.existsSync(manifestPath) || !fs.existsSync(chunksDir)) {
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

  if (FLAG_DEEP) {
    log('deep clean requested')
    removeIfPresent(rootDir, '.next')
    removeIfPresent(rootDir, 'node_modules/.cache')
    removeIfPresent(rootDir, '.swc')
    if (FLAG_VERBOSE) {
      // .turbo isn't always present; only cleaned when it exists.
      removeIfPresent(rootDir, '.turbo')
    } else {
      // silent attempt
      const target = path.join(rootDir, '.turbo')
      if (fs.existsSync(target)) removeIfPresent(rootDir, '.turbo')
    }
    log('deep clean complete')
    return
  }

  if (!shouldResetNextArtifacts(rootDir)) {
    if (FLAG_VERBOSE) log('no corruption detected; leaving .next intact')
    return
  }

  // Conservative path: only `.next` is wiped (matches historical behavior).
  // The vendor-chunk corruption pattern is the most common Windows failure
  // mode and is fully resolved by `.next` removal alone.
  removeIfPresent(rootDir, '.next')
  log('removed stale .next artifacts before dev startup')
}

// CommonJS exports for unit-testing the safety predicates without invoking
// main(). Tests import this file via `require()` and assert that
// `isSafePath` rejects source paths, prisma migrations, env files, etc.
module.exports = {
  isSafePath,
  SAFE_ROOTS,
  hasMissingVendorChunks,
  shouldResetNextArtifacts,
}

// Only run main() when invoked directly from the CLI (not when required by a test).
if (require.main === module) {
  main()
}
