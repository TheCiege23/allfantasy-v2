#!/usr/bin/env node
/**
 * Staging / production smoke-validation suite.
 *
 * Runs a battery of HTTP checks against a deployed AllFantasy instance.
 * Designed to run after a Vercel Preview or production deploy to confirm:
 *   - Health endpoint reports valid env + DB connected
 *   - Core API routes return expected status codes (not 5xx)
 *   - SSE stream endpoint is reachable
 *   - Key pages render (200 / redirect, never 5xx)
 *
 * Usage:
 *   BASE_URL=https://preview-xyz.vercel.app node scripts/staging-validate.mjs
 *   BASE_URL=https://www.allfantasy.ai     node scripts/staging-validate.mjs
 *
 * Default BASE_URL (no env var): https://www.allfantasy.ai
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * Optional env:
 *   STAGING_LEAGUE_ID  — a seeded league ID for draft-endpoint checks (default: skips draft-specific checks)
 *   STAGING_DRAFT_ID   — matching draft ID for SSE stream check
 *   VERBOSE=1          — print full response bodies on failure
 */

import { createWriteStream, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE_URL = (process.env.BASE_URL ?? 'https://www.allfantasy.ai').replace(/\/$/, '')
const VERBOSE = process.env.VERBOSE === '1'
const LEAGUE_ID = process.env.STAGING_LEAGUE_ID ?? ''
const DRAFT_ID = process.env.STAGING_DRAFT_ID ?? ''
const TIMEOUT_MS = 15_000

// ── Utilities ────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const results = []

function pass(name, ms, note = '') {
  passed++
  const entry = { status: 'PASS', name, ms, note }
  results.push(entry)
  console.log(`  ✅  ${name} (${ms}ms)${note ? `  — ${note}` : ''}`)
}

function fail(name, ms, reason) {
  failed++
  const entry = { status: 'FAIL', name, ms, reason }
  results.push(entry)
  console.log(`  ❌  ${name} (${ms}ms)  — ${reason}`)
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

async function timedFetch(url, init = {}) {
  const t0 = Date.now()
  try {
    const res = await fetchWithTimeout(url, init)
    return { res, ms: Date.now() - t0 }
  } catch (err) {
    return { res: null, ms: Date.now() - t0, err }
  }
}

// ── Check helpers ─────────────────────────────────────────────────────────────

async function checkGet(name, path, { expectedStatuses = [200], mustContainJson = null, sseMode = false } = {}) {
  const url = `${BASE_URL}${path}`
  const headers = sseMode
    ? { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' }
    : { Accept: 'application/json' }

  const { res, ms, err } = await timedFetch(url, { headers })

  if (!res) {
    fail(name, ms, `Network error: ${err?.message ?? 'unknown'}`)
    return null
  }

  if (!expectedStatuses.includes(res.status)) {
    let body = ''
    try { body = (await res.text()).slice(0, 200) } catch {}
    if (VERBOSE) console.log(`     body: ${body}`)
    fail(name, ms, `Expected status in [${expectedStatuses.join(',')}], got ${res.status}`)
    return null
  }

  if (mustContainJson) {
    let data
    try { data = await res.json() } catch (e) {
      fail(name, ms, `Response is not valid JSON: ${e.message}`)
      return null
    }
    for (const [key, expected] of Object.entries(mustContainJson)) {
      const actual = key.split('.').reduce((o, k) => o?.[k], data)
      if (actual !== expected) {
        fail(name, ms, `JSON field "${key}" expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
        if (VERBOSE) console.log('     full response:', JSON.stringify(data, null, 2))
        return data
      }
    }
    pass(name, ms)
    return data
  }

  pass(name, ms)
  return null
}

async function checkPost(name, path, body, { expectedStatuses = [200, 400, 401, 403, 422] } = {}) {
  const url = `${BASE_URL}${path}`
  const { res, ms, err } = await timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res) {
    fail(name, ms, `Network error: ${err?.message ?? 'unknown'}`)
    return
  }

  if (res.status >= 500) {
    let body = ''
    try { body = (await res.text()).slice(0, 200) } catch {}
    if (VERBOSE) console.log(`     body: ${body}`)
    fail(name, ms, `Server error: ${res.status}`)
    return
  }

  if (!expectedStatuses.includes(res.status)) {
    fail(name, ms, `Expected status in [${expectedStatuses.join(',')}], got ${res.status}`)
    return
  }

  pass(name, ms)
}

// ── Check 1: Health endpoint ──────────────────────────────────────────────────

console.log(`\n[staging-validate] Target: ${BASE_URL}\n`)
console.log('── Health endpoint ─────────────────────────────────────')

const healthUrl = `${BASE_URL}/api/health`
const { res: healthRes, ms: healthMs, err: healthErr } = await timedFetch(healthUrl, {
  headers: { Accept: 'application/json' },
})

if (!healthRes || healthErr) {
  fail('/api/health reachable', healthMs, healthErr?.message ?? 'no response')
} else {
  let healthData
  try { healthData = await healthRes.json() } catch (e) {
    fail('/api/health valid JSON', healthMs, `Parse error: ${e.message}`)
    healthData = null
  }

  if (healthData) {
    if (healthRes.status === 200) {
      pass('/api/health HTTP 200', healthMs)
    } else {
      fail('/api/health HTTP 200', healthMs, `Got ${healthRes.status}`)
    }

    // ok: true
    if (healthData.ok === true) {
      pass('/api/health ok:true', 0)
    } else {
      fail('/api/health ok:true', 0, `ok=${JSON.stringify(healthData.ok)}`)
    }

    // timestamp present
    if (typeof healthData.timestamp === 'string' && healthData.timestamp.length > 10) {
      pass('/api/health timestamp present', 0)
    } else {
      fail('/api/health timestamp present', 0, `timestamp=${JSON.stringify(healthData.timestamp)}`)
    }

    // database.configured
    if (healthData.database?.configured === true) {
      pass('/api/health database.configured:true', 0)
    } else {
      fail('/api/health database.configured:true', 0, `database.configured=${JSON.stringify(healthData.database?.configured)}`)
    }

    // database.connected
    if (healthData.database?.connected === true) {
      pass('/api/health database.connected:true', 0)
    } else {
      fail('/api/health database.connected:true', 0, `database.connected=${JSON.stringify(healthData.database?.connected)} — ${healthData.database?.error ?? 'no error msg'}`)
    }

    // env.valid — only present after P2 Fix #11 is deployed
    if (healthData.env === undefined || healthData.env === null) {
      // Old API format (pre-P2 health endpoint changes): soft warn, not a hard failure
      console.log(`  ⚠️   /api/health env field absent (0ms)  — old API version; P2 env-validator not deployed yet`)
    } else if (healthData.env?.valid === true) {
      pass('/api/health env.valid:true', 0)
    } else {
      fail('/api/health env.valid:true', 0, `errorCount=${healthData.env?.errorCount ?? '?'}`)
    }

    // env.features shape present
    const features = healthData.env?.features
    if (healthData.env === undefined || healthData.env === null) {
      // already warned above
    } else if (features && typeof features === 'object') {
      const featureList = Object.entries(features)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')
      pass('/api/health env.features present', 0, featureList)
    } else {
      fail('/api/health env.features present', 0, 'missing or wrong type')
    }

    if (VERBOSE) {
      console.log('\n  Health payload:', JSON.stringify(healthData, null, 4))
    }
  }
}

// ── Check 2: Core pages render ────────────────────────────────────────────────

console.log('\n── Core pages ──────────────────────────────────────────')

// Home page
await checkGet('GET / (home, no 5xx)', '/', {
  expectedStatuses: [200, 301, 302, 307, 308],
})

// Sign-in page (app uses /login, not /auth/signin)
await checkGet('GET /login (no 5xx)', '/login', {
  expectedStatuses: [200, 301, 302, 307, 308],
})

// Dashboard (expect redirect to sign-in when unauthenticated)
await checkGet('GET /dashboard (auth redirect or 200)', '/dashboard', {
  expectedStatuses: [200, 301, 302, 307, 308],
})

// Leagues list (expect 200 or auth redirect)
await checkGet('GET /leagues (no 5xx)', '/leagues', {
  expectedStatuses: [200, 301, 302, 307, 308],
})

// ── Check 3: Core API routes (unauthenticated → expect 401/403, never 5xx) ───

console.log('\n── API routes (unauthenticated) ────────────────────────')

await checkGet('GET /api/health (duplicate, confirms routing)', '/api/health', {
  expectedStatuses: [200],
})

await checkPost('POST /api/mock-draft/simulate (no 5xx)', '/api/mock-draft/simulate', {
  teamCount: 12, rounds: 4, format: 'redraft',
}, { expectedStatuses: [200, 400, 401, 403] })

await checkPost('POST /api/chat/chimmy (no 5xx)', '/api/chat/chimmy', {
  message: 'smoke test', privateMode: true, targetUsername: 'smoke',
}, { expectedStatuses: [200, 400, 401, 403] })

await checkGet('GET /api/bracket/leagues (no 5xx)', '/api/bracket/leagues', {
  expectedStatuses: [200, 400, 401, 403],
})

await checkPost('POST /api/waiver-ai/grok (no 5xx)', '/api/waiver-ai/grok', {
  leagueId: 'smoke-test', roster: [], freeAgents: [],
}, { expectedStatuses: [200, 400, 401, 403] })

// ── Check 4: SSE stream endpoint ──────────────────────────────────────────────

console.log('\n── SSE stream ──────────────────────────────────────────')

if (DRAFT_ID) {
  // Open the SSE connection briefly; any non-5xx response is OK
  const sseUrl = `${BASE_URL}/api/draft/${DRAFT_ID}/stream`
  const { res: sseRes, ms: sseMs, err: sseErr } = await timedFetch(sseUrl, {
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })

  if (!sseRes || sseErr) {
    fail(`GET /api/draft/${DRAFT_ID}/stream reachable`, sseMs, sseErr?.message ?? 'no response')
  } else if (sseRes.status >= 500) {
    fail(`GET /api/draft/${DRAFT_ID}/stream no 5xx`, sseMs, `status=${sseRes.status}`)
  } else {
    const contentType = sseRes.headers.get('content-type') ?? ''
    if (sseRes.status === 200 && contentType.includes('text/event-stream')) {
      pass(`GET /api/draft/${DRAFT_ID}/stream (SSE headers correct)`, sseMs, `status=${sseRes.status} content-type=${contentType}`)
    } else {
      pass(`GET /api/draft/${DRAFT_ID}/stream (no 5xx)`, sseMs, `status=${sseRes.status} content-type=${contentType}`)
    }
    // Abort body read (streaming)
    try { await sseRes.body?.cancel() } catch {}
  }
} else {
  console.log('  ⏭   SSE stream check skipped — set STAGING_DRAFT_ID to enable')
}

// ── Check 5: Draft pick + live-sync (if league seeded) ───────────────────────

console.log('\n── Draft endpoints ─────────────────────────────────────')

if (LEAGUE_ID) {
  await checkPost(
    `POST /api/leagues/${LEAGUE_ID}/draft/pick (no 5xx, unauthed→401)`,
    `/api/leagues/${LEAGUE_ID}/draft/pick`,
    { playerName: 'Smoke Test Player', position: 'QB', team: 'KC', source: 'user' },
    { expectedStatuses: [200, 400, 401, 403, 409, 422] }
  )

  await checkGet(
    `GET /api/leagues/${LEAGUE_ID}/draft/live-sync (no 5xx)`,
    `/api/leagues/${LEAGUE_ID}/draft/live-sync?since=${encodeURIComponent(new Date(Date.now() - 5000).toISOString())}&queue=1&chat=0`,
    { expectedStatuses: [200, 400, 401, 403] }
  )
} else {
  console.log('  ⏭   Draft-endpoint checks skipped — set STAGING_LEAGUE_ID to enable')
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n── Summary ─────────────────────────────────────────────')
console.log(`  Target   : ${BASE_URL}`)
console.log(`  Passed   : ${passed}`)
console.log(`  Failed   : ${failed}`)
console.log(`  Total    : ${passed + failed}`)

if (failed > 0) {
  console.log('\n  Failures:')
  for (const r of results.filter((r) => r.status === 'FAIL')) {
    console.log(`    ❌  ${r.name} — ${r.reason}`)
  }
  console.log('')
  process.exit(1)
} else {
  console.log('\n  ✅  All checks passed.\n')
  process.exit(0)
}
