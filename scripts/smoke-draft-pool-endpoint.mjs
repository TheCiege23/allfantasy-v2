#!/usr/bin/env node

/**
 * Repeatable draft-pool endpoint smoke checks.
 *
 * Usage:
 *   node scripts/smoke-draft-pool-endpoint.mjs --leagueId=<id>
 *   node scripts/smoke-draft-pool-endpoint.mjs --url=http://127.0.0.1:3101/api/leagues/<id>/draft/pool?limit=300
 */

const DEFAULT_BASE_URLS = [
  'http://127.0.0.1:3101',
  'http://127.0.0.1:3201',
  'http://127.0.0.1:3000',
]

const ALLOWED_INJURY_STATUSES = new Set([
  'IR',
  'PUP',
  'SUSPENDED',
  'OUT',
  'DOUBTFUL',
  'QUESTIONABLE',
  'PROBABLE',
  'ACTIVE',
  'UNKNOWN',
])

function parseArgs(argv) {
  const out = {
    leagueId: '',
    url: '',
    limit: 300,
    cacheBust: `smoke-${Date.now()}`,
    timeoutMs: 30000,
    baseUrls: [...DEFAULT_BASE_URLS],
  }

  for (const part of argv) {
    if (part.startsWith('--leagueId=')) out.leagueId = part.slice('--leagueId='.length)
    else if (part.startsWith('--league=')) out.leagueId = part.slice('--league='.length)
    else if (part.startsWith('--url=')) out.url = part.slice('--url='.length)
    else if (part.startsWith('--limit=')) out.limit = Number(part.slice('--limit='.length)) || out.limit
    else if (part.startsWith('--cacheBust=')) out.cacheBust = part.slice('--cacheBust='.length)
    else if (part.startsWith('--timeoutMs=')) out.timeoutMs = Number(part.slice('--timeoutMs='.length)) || out.timeoutMs
    else if (part.startsWith('--baseUrls=')) {
      const parsed = part
        .slice('--baseUrls='.length)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      if (parsed.length > 0) out.baseUrls = parsed
    }
  }

  return out
}

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getHeadshotUrl(entry) {
  const direct = String(entry?.imageUrl ?? '').trim()
  if (direct) return direct
  const nested = String(entry?.display?.assets?.headshotUrl ?? '').trim()
  if (nested) return nested
  return ''
}

function getInjuryStatus(entry) {
  const raw = entry?.injuryStatus
  if (raw == null) return ''
  return String(raw).trim()
}

function isTeamLogoLike(url) {
  const v = url.toLowerCase()
  return (
    v.includes('/teams/') ||
    v.includes('team-logo') ||
    v.includes('/team/logo') ||
    v.includes('/nfl/teams') ||
    v.includes('/nba/teams') ||
    v.includes('/mlb/teams') ||
    v.includes('/nhl/teams')
  )
}

function assertCondition(condition, label, failures) {
  if (!condition) failures.push(label)
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

async function resolveUrl(args) {
  if (args.url) return args.url
  if (!args.leagueId) {
    throw new Error('Missing --leagueId=<id> when --url is not provided')
  }

  const candidates = args.baseUrls.map(
    (base) =>
      `${base}/api/leagues/${encodeURIComponent(args.leagueId)}/draft/pool?limit=${encodeURIComponent(String(args.limit))}&cacheBust=${encodeURIComponent(args.cacheBust)}`,
  )

  const errors = []
  for (const candidate of candidates) {
    try {
      await fetchJson(candidate, args.timeoutMs)
      return candidate
    } catch (error) {
      errors.push({ url: candidate, error: error instanceof Error ? error.message : String(error) })
    }
  }

  throw new Error(`No reachable endpoint candidates: ${JSON.stringify(errors)}`)
}

function buildSummary(url, payload) {
  const entries = Array.isArray(payload?.entries) ? payload.entries : []
  const failures = []

  const top50 = entries.slice(0, 50)
  let top50Monotonic = true
  for (let i = 1; i < top50.length; i += 1) {
    const prev = numberOrNull(top50[i - 1]?.adp)
    const cur = numberOrNull(top50[i]?.adp)
    if (prev != null && cur != null && cur < prev) {
      top50Monotonic = false
      break
    }
  }

  let firstNullAdpIndex = -1
  for (let i = 0; i < entries.length; i += 1) {
    if (numberOrNull(entries[i]?.adp) == null) {
      firstNullAdpIndex = i
      break
    }
  }

  let nonNullAfterFirstNull = 0
  if (firstNullAdpIndex >= 0) {
    for (let i = firstNullAdpIndex + 1; i < entries.length; i += 1) {
      if (numberOrNull(entries[i]?.adp) != null) nonNullAfterFirstNull += 1
    }
  }

  const seenNames = new Set()
  let duplicateNameCount = 0
  for (const entry of entries) {
    const key = normalizeName(entry?.name)
    if (!key) continue
    if (seenNames.has(key)) duplicateNameCount += 1
    else seenNames.add(key)
  }

  let httpImages = 0
  let dataUriImages = 0
  let missingImageUrl = 0
  let teamLogoLikeHeadshotUrls = 0
  for (const entry of entries) {
    const img = getHeadshotUrl(entry)
    if (!img) {
      missingImageUrl += 1
      continue
    }
    if (img.startsWith('http://') || img.startsWith('https://')) httpImages += 1
    else if (img.startsWith('data:')) dataUriImages += 1
    if (isTeamLogoLike(img)) teamLogoLikeHeadshotUrls += 1
  }

  let rookieCount = 0
  let yearsExpZeroCount = 0
  for (const entry of entries) {
    if (entry?.isRookie === true) rookieCount += 1
    if (Number(entry?.yearsExp) === 0) yearsExpZeroCount += 1
  }

  let injuryStatusPresent = 0
  let unexpectedInjuryStatusCount = 0
  const unexpectedInjurySamples = []
  for (const entry of entries) {
    const status = getInjuryStatus(entry)
    if (!status) continue
    injuryStatusPresent += 1
    if (!ALLOWED_INJURY_STATUSES.has(status)) {
      unexpectedInjuryStatusCount += 1
      if (unexpectedInjurySamples.length < 20 && !unexpectedInjurySamples.includes(status)) {
        unexpectedInjurySamples.push(status)
      }
    }
  }

  assertCondition(entries.length > 0, 'entries > 0', failures)
  assertCondition(top50Monotonic, 'top-50 ADP monotonic ordering', failures)
  assertCondition(nonNullAfterFirstNull === 0, 'null ADP tail has no non-null ADP after first null', failures)
  assertCondition(duplicateNameCount === 0, 'duplicate player names = 0', failures)
  assertCondition(missingImageUrl === 0, 'missing image URL = 0', failures)
  assertCondition(teamLogoLikeHeadshotUrls === 0, 'team-logo-like headshot URLs = 0', failures)
  assertCondition(unexpectedInjuryStatusCount === 0, 'injuryStatus values are canonical-only', failures)

  return {
    url,
    checks: {
      pass: failures.length === 0,
      failures,
    },
    metrics: {
      entryCount: entries.length,
      top50Monotonic,
      firstNullAdpIndex,
      nonNullAfterFirstNull,
      duplicateNameCount,
      missingImageUrl,
      teamLogoLikeHeadshotUrls,
      rookieCount,
      yearsExpZeroCount,
      injuryStatusPresent,
      unexpectedInjuryStatusCount,
      unexpectedInjurySamples,
      imageDistribution: {
        httpImages,
        dataUriImages,
      },
    },
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = await resolveUrl(args)
  const payload = await fetchJson(url, args.timeoutMs)
  const summary = buildSummary(url, payload)

  console.log(JSON.stringify(summary, null, 2))

  if (!summary.checks.pass) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('[smoke-draft-pool-endpoint] failed:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
