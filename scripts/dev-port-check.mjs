/**
 * scripts/dev-port-check.mjs
 *
 * Diagnose (or kill) lingering Node processes holding the dev-server ports
 * (3000, 3001). Helpful for the Windows + Next 14 + HMR pathology where a
 * dev process gets stuck and the next `next dev` boot reuses or fails over
 * to a different port, leaving stale `.next/` artifacts and 500 responses.
 *
 * USAGE
 *   node scripts/dev-port-check.mjs              # report only
 *   node scripts/dev-port-check.mjs --kill       # kill the holders (after a confirmation print)
 *   node scripts/dev-port-check.mjs --ports=3000,3001,52712  # explicit list
 *
 * No external deps. Uses `lsof` / `netstat` via child_process, with platform
 * detection for Windows vs POSIX. Never silently mutates anything; `--kill`
 * is required to send signals.
 */

import { execSync, spawnSync } from 'node:child_process'

const ARGV = process.argv.slice(2)
const FLAG_KILL = ARGV.includes('--kill')
const FLAG_QUIET = ARGV.includes('--quiet') || ARGV.includes('-q')
const PORTS = (() => {
  const arg = ARGV.find((a) => a.startsWith('--ports='))
  if (!arg) return [3000, 3001]
  return arg
    .slice('--ports='.length)
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
})()

const IS_WINDOWS = process.platform === 'win32'

function log(msg) {
  if (!FLAG_QUIET) process.stdout.write(`[dev-port-check] ${msg}\n`)
}

/**
 * Returns array of { port, pid, processName } for every PID listening on the
 * requested ports. Best-effort; returns [] on a CLI failure rather than
 * crashing.
 */
function findHolders(ports) {
  const raw = IS_WINDOWS ? findHoldersWindows(ports) : findHoldersPosix(ports)
  // netstat (Windows) and lsof (POSIX) often report the same listener twice
  // — once for IPv4 and once for IPv6. Dedupe by `port|pid`.
  const seen = new Set()
  const out = []
  for (const h of raw) {
    const key = `${h.port}|${h.pid}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
  }
  return out
}

function findHoldersWindows(ports) {
  const out = []
  let netstatOut = ''
  try {
    netstatOut = execSync('netstat -ano', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return out
  }
  // netstat -ano lines look like:
  //   TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
  for (const rawLine of netstatOut.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('TCP')) continue
    if (!/\bLISTENING\b/i.test(line)) continue
    const parts = line.split(/\s+/)
    if (parts.length < 5) continue
    const local = parts[1]
    const pid = Number(parts[parts.length - 1])
    if (!Number.isFinite(pid) || pid <= 0) continue
    const portMatch = local.match(/:(\d+)$/)
    if (!portMatch) continue
    const port = Number(portMatch[1])
    if (!ports.includes(port)) continue
    out.push({ port, pid, processName: lookupProcessNameWindows(pid) })
  }
  return out
}

function lookupProcessNameWindows(pid) {
  try {
    const csv = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    // CSV rows: "node.exe","12345","Console","1","123,456 K"
    const first = String(csv).split(/\r?\n/).find((l) => l.includes(`"${pid}"`)) || ''
    const m = first.match(/^"([^"]+)"/)
    return m ? m[1] : 'unknown'
  } catch {
    return 'unknown'
  }
}

function findHoldersPosix(ports) {
  const out = []
  for (const port of ports) {
    let pidsRaw = ''
    try {
      pidsRaw = execSync(`lsof -t -i tcp:${port} -sTCP:LISTEN`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    } catch {
      continue
    }
    for (const pidStr of pidsRaw.split(/\s+/).filter(Boolean)) {
      const pid = Number(pidStr)
      if (!Number.isFinite(pid)) continue
      out.push({ port, pid, processName: lookupProcessNamePosix(pid) })
    }
  }
  return out
}

function lookupProcessNamePosix(pid) {
  try {
    const cmd = execSync(`ps -p ${pid} -o comm=`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return cmd.trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

function killHolder(holder) {
  if (IS_WINDOWS) {
    // /T terminates the process subtree (children). Respawners are often stopped
    // only by killing a higher parent; if this fails with Access denied, use
    // Admin PowerShell and taskkill the root PID from the parent chain.
    const r = spawnSync('taskkill', ['/F', '/T', '/PID', String(holder.pid)], { encoding: 'utf8' })
    if (r.status === 0) return { ok: true }
    return { ok: false, error: (r.stderr || r.stdout || '').trim() }
  }
  try {
    process.kill(holder.pid, 'SIGTERM')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) }
  }
}

function main() {
  log(`checking ports: ${PORTS.join(', ')}  (platform=${IS_WINDOWS ? 'win32' : process.platform})`)
  const holders = findHolders(PORTS)

  if (holders.length === 0) {
    log('no listeners found — ports are free')
    process.exit(0)
  }

  for (const h of holders) {
    log(`port ${h.port} held by pid ${h.pid} (${h.processName})`)
  }

  if (!FLAG_KILL) {
    log('')
    log('to free these ports, re-run with --kill, or manually:')
    if (IS_WINDOWS) {
      for (const h of holders) log(`  taskkill /F /T /PID ${h.pid}`)
    } else {
      for (const h of holders) log(`  kill ${h.pid}`)
    }
    process.exit(0)
  }

  let killed = 0
  let failed = 0
  for (const h of holders) {
    const r = killHolder(h)
    if (r.ok) {
      log(`killed pid ${h.pid} on port ${h.port}`)
      killed++
    } else {
      log(`FAILED to kill pid ${h.pid}: ${r.error}`)
      const combined = `${r.error}`.toLowerCase()
      if (IS_WINDOWS && /access|denied|privilege|not allowed/i.test(combined)) {
        log('')
        log('Windows refused termination (common for a protected or foreign integrity process).')
        log('1) Open PowerShell as Administrator.')
        log('2) Walk parents until you find the launcher root, e.g.:')
        log(`     Get-CimInstance Win32_Process -Filter "ProcessId = ${h.pid}" | Select-Object Name,ParentProcessId,CommandLine`)
        log('3) Kill the root of the tree (example):')
        log('     taskkill /F /T /PID <rootPid>')
        log('Or use Task Manager → Details → End process tree on the top parent.')
      } else if (IS_WINDOWS) {
        log('If the port comes back immediately, a parent may be respawning node — kill the root shell with taskkill /F /T /PID <parent>.')
      }
      failed++
    }
  }
  log(`done — killed ${killed}, failed ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
