/**
 * postinstall: run `prisma generate` with Windows-friendly retries.
 *
 * EPERM while renaming `query_engine-*.dll.node` usually means another Node
 * process (next dev, another install) still has the DLL open. Retrying after
 * a short delay often succeeds without killing every node.exe on the machine.
 */

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.join(__dirname, '..')
const isWin = process.platform === 'win32'
const maxAttempts = isWin ? 5 : 2
const delayMs = 2500

function delay(ms) {
  if (isWin) {
    spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', `Start-Sleep -Milliseconds ${ms}`],
      { stdio: 'ignore', cwd: root }
    )
  } else {
    spawnSync('sleep', [String(Math.ceil(ms / 1000))], { stdio: 'ignore', cwd: root })
  }
}

function isLikelyFileLockMessage(text) {
  const s = String(text || '').toLowerCase()
  return (
    s.includes('eperm') ||
    s.includes('operation not permitted') ||
    s.includes('access is denied') ||
    s.includes('EBUSY'.toLowerCase()) ||
    s.includes('being used by another process')
  )
}

function runPrismaGenerateOnce() {
  let prismaCli
  try {
    const pkgJson = require.resolve('prisma/package.json', { paths: [root] })
    prismaCli = path.join(path.dirname(pkgJson), 'build', 'index.js')
  } catch {
    process.stderr.write(
      '[prisma-generate-postinstall] prisma package not found; run npm install from repo root.\n'
    )
    return { code: 1, combined: 'missing prisma' }
  }

  const r = spawnSync(process.execPath, [prismaCli, 'generate'], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    maxBuffer: 24 * 1024 * 1024,
  })

  const stdout = r.stdout || ''
  const stderr = r.stderr || ''
  process.stdout.write(stdout)
  process.stderr.write(stderr)

  const code = r.status === null ? 1 : r.status
  const combined = `${stderr}\n${stdout}`
  return { code, combined }
}

let last = { code: 1, combined: '' }
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  last = runPrismaGenerateOnce()
  if (last.code === 0) {
    process.exit(0)
  }
  const lock = isLikelyFileLockMessage(last.combined)
  if (!lock) {
    process.exit(last.code)
  }
  if (attempt < maxAttempts) {
    process.stderr.write(
      `[prisma-generate-postinstall] generate failed (likely file lock, attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms…\n` +
        '[prisma-generate-postinstall] Stop next dev / other Node using this repo, or run: npm run dev:kill\n'
    )
    delay(delayMs)
  }
}

process.stderr.write(
  '[prisma-generate-postinstall] prisma generate still failing after retries.\n' +
    'Close Cursor terminals, run `npm run dev:kill`, then `npx prisma generate` (or open Cursor as Administrator once).\n'
)
process.exit(last.code)
