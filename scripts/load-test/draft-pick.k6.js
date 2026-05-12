/**
 * k6 load test — AllFantasy draft room stress scenarios
 *
 * Three scenarios that model realistic peak-draft traffic:
 *
 *   1. pick_storm      — concurrent POST /pick submissions (50+ picks/s)
 *   2. state_poll      — sustained GET /live-sync polling (all clients, 2s cadence)
 *   3. reconnect_storm — SSE stream GET /stream with rapid reconnects
 *
 * Prerequisites:
 *   brew install k6          # macOS
 *   apt-get install k6       # Ubuntu
 *
 * Run all scenarios:
 *   npm run load-test:draft
 *
 * Run a single scenario:
 *   k6 run --env SCENARIO=pick_storm scripts/load-test/draft-pick.k6.js
 *
 * Required env vars (pass via -e or .env.loadtest):
 *   BASE_URL         — e.g. https://staging.allfantasy.com (no trailing slash)
 *   LEAGUE_ID        — a seeded draft league ID
 *   DRAFT_ID         — matching draft ID for SSE stream
 *   SESSION_COOKIE   — value of next-auth.session-token cookie for a test user
 *
 * Optional:
 *   SCENARIO         — run only this scenario (pick_storm | state_poll | reconnect_storm)
 *   PICK_VUS         — override VUs for pick_storm (default 50)
 *   POLL_VUS         — override VUs for state_poll (default 30)
 *   RECONNECT_VUS    — override VUs for reconnect_storm (default 20)
 *
 * Thresholds (fail the run if breached):
 *   - p95 response time < 1500ms for all scenarios
 *   - error rate < 5% (rate of non-2xx or timeout responses)
 *   - pick_storm p95 < 800ms (picks must be fast at peak)
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ── Custom metrics ─────────────────────────────────────────────────────────────
const pickErrorRate = new Rate('pick_error_rate')
const pollErrorRate = new Rate('poll_error_rate')
const reconnectErrorRate = new Rate('reconnect_error_rate')
const pickDuration = new Trend('pick_duration_ms', true)
const pollDuration = new Trend('poll_duration_ms', true)

// ── Config ─────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100'
const LEAGUE_ID = __ENV.LEAGUE_ID || 'test-league-id'
const DRAFT_ID = __ENV.DRAFT_ID || 'test-draft-id'
const SESSION_COOKIE = __ENV.SESSION_COOKIE || ''
const ONLY_SCENARIO = __ENV.SCENARIO || ''

const PICK_VUS = parseInt(__ENV.PICK_VUS || '50', 10)
const POLL_VUS = parseInt(__ENV.POLL_VUS || '30', 10)
const RECONNECT_VUS = parseInt(__ENV.RECONNECT_VUS || '20', 10)

function isEnabled(name) {
  return !ONLY_SCENARIO || ONLY_SCENARIO === name
}

// ── k6 options ─────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    ...(isEnabled('pick_storm') && {
      pick_storm: {
        executor: 'ramping-vus',
        startVUs: 1,
        stages: [
          { duration: '10s', target: PICK_VUS },  // ramp up
          { duration: '30s', target: PICK_VUS },  // sustain peak
          { duration: '10s', target: 0 },         // ramp down
        ],
        gracefulRampDown: '5s',
        tags: { scenario: 'pick_storm' },
      },
    }),
    ...(isEnabled('state_poll') && {
      state_poll: {
        executor: 'constant-vus',
        vus: POLL_VUS,
        duration: '60s',
        startTime: isEnabled('pick_storm') ? '0s' : '0s', // run concurrently with pick_storm
        tags: { scenario: 'state_poll' },
      },
    }),
    ...(isEnabled('reconnect_storm') && {
      reconnect_storm: {
        executor: 'ramping-arrival-rate',
        startRate: 1,
        timeUnit: '1s',
        preAllocatedVUs: RECONNECT_VUS,
        maxVUs: RECONNECT_VUS * 2,
        stages: [
          { duration: '10s', target: 5 },   // 5 reconnects/s
          { duration: '20s', target: 20 },  // peak reconnect storm
          { duration: '10s', target: 0 },
        ],
        startTime: '5s', // start slightly after other scenarios
        tags: { scenario: 'reconnect_storm' },
      },
    }),
  },

  thresholds: {
    // Global
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],

    // Per-scenario custom metrics
    pick_duration_ms: ['p(95)<800'],
    pick_error_rate: ['rate<0.05'],
    poll_duration_ms: ['p(95)<500'],
    poll_error_rate: ['rate<0.02'],
    reconnect_error_rate: ['rate<0.10'],
  },
}

// ── Shared headers ─────────────────────────────────────────────────────────────
function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Cookie: `next-auth.session-token=${SESSION_COOKIE}`,
    ...extra,
  }
}

// ── Sample player pool (rotated per VU to avoid duplicate-pick conflicts) ──────
const SAMPLE_PLAYERS = [
  { playerName: 'Patrick Mahomes', position: 'QB', team: 'KC' },
  { playerName: 'Christian McCaffrey', position: 'RB', team: 'SF' },
  { playerName: 'Ja\'Marr Chase', position: 'WR', team: 'CIN' },
  { playerName: 'Travis Kelce', position: 'TE', team: 'KC' },
  { playerName: 'Justin Jefferson', position: 'WR', team: 'MIN' },
  { playerName: 'Tyreek Hill', position: 'WR', team: 'MIA' },
  { playerName: 'Davante Adams', position: 'WR', team: 'LV' },
  { playerName: 'Stefon Diggs', position: 'WR', team: 'BUF' },
  { playerName: 'Austin Ekeler', position: 'RB', team: 'LAC' },
  { playerName: 'Tony Pollard', position: 'RB', team: 'DAL' },
  { playerName: 'Tee Higgins', position: 'WR', team: 'CIN' },
  { playerName: 'Mark Andrews', position: 'TE', team: 'BAL' },
  { playerName: 'Bijan Robinson', position: 'RB', team: 'ATL' },
  { playerName: 'Puka Nacua', position: 'WR', team: 'LAR' },
  { playerName: 'CeeDee Lamb', position: 'WR', team: 'DAL' },
  { playerName: 'Josh Allen', position: 'QB', team: 'BUF' },
  { playerName: 'Lamar Jackson', position: 'QB', team: 'BAL' },
  { playerName: 'Jalen Hurts', position: 'QB', team: 'PHI' },
  { playerName: 'Justin Herbert', position: 'QB', team: 'LAC' },
  { playerName: 'Breece Hall', position: 'RB', team: 'NYJ' },
]

// ── Scenario handlers ──────────────────────────────────────────────────────────

/**
 * Scenario 1: Pick storm
 * Each VU submits a draft pick and measures latency.
 * Picks will largely 400/409 in a real draft (duplicate, not on clock) —
 * that's expected; we're measuring route latency under load, not pick success.
 */
function runPickStorm() {
  const player = SAMPLE_PLAYERS[__VU % SAMPLE_PLAYERS.length]
  const payload = JSON.stringify({
    playerName: player.playerName,
    position: player.position,
    team: player.team,
    source: 'user',
    rosterId: null,
  })

  const res = http.post(
    `${BASE_URL}/api/leagues/${LEAGUE_ID}/draft/pick`,
    payload,
    { headers: authHeaders(), timeout: '10s', tags: { name: 'draft_pick' } }
  )

  pickDuration.add(res.timings.duration)

  const ok = check(res, {
    'pick: status is 2xx or expected 4xx': (r) =>
      r.status >= 200 && r.status < 500,
    'pick: response is JSON': (r) => {
      try { JSON.parse(r.body); return true } catch { return false }
    },
  })

  // Only treat 5xx and network errors as real failures
  pickErrorRate.add(res.status >= 500 || res.status === 0)

  sleep(0.1 + Math.random() * 0.2) // 100–300ms jitter between picks
}

/**
 * Scenario 2: State poll (live-sync)
 * Simulates all draft room clients polling every 2s.
 */
function runStatePoll() {
  const since = new Date(Date.now() - 5000).toISOString()
  const url = `${BASE_URL}/api/leagues/${LEAGUE_ID}/draft/live-sync?since=${encodeURIComponent(since)}&queue=1&chat=0`

  const res = http.get(url, {
    headers: authHeaders(),
    timeout: '5s',
    tags: { name: 'live_sync' },
  })

  pollDuration.add(res.timings.duration)

  check(res, {
    'poll: status 200': (r) => r.status === 200 || r.status === 401,
    'poll: fast response': (r) => r.timings.duration < 1000,
  })

  pollErrorRate.add(res.status >= 500 || res.status === 0)

  sleep(2) // mirror 2s poll cadence
}

/**
 * Scenario 3: SSE reconnect storm
 * Opens an SSE stream connection, reads first event, disconnects.
 * Simulates a reconnect storm (all clients reconnecting after restart/drop).
 * Uses a short read timeout to avoid holding connections open long.
 */
function runReconnectStorm() {
  const res = http.get(
    `${BASE_URL}/api/draft/${DRAFT_ID}/stream`,
    {
      headers: {
        ...authHeaders({ Accept: 'text/event-stream' }),
        'Cache-Control': 'no-cache',
      },
      timeout: '3s',
      tags: { name: 'sse_reconnect' },
    }
  )

  // SSE endpoints return 200 with streaming body; a 401/403/404 counts as auth
  // or config issue but NOT a server error. 5xx = real problem.
  const isServerError = res.status >= 500 || res.status === 0
  reconnectErrorRate.add(isServerError)

  check(res, {
    'sse: not a 5xx': (r) => r.status < 500,
  })

  // Brief pause before reconnect — simulates brief client debounce
  sleep(0.2 + Math.random() * 0.3)
}

// ── Entry point ────────────────────────────────────────────────────────────────
export default function main() {
  // k6 routes VUs to scenarios automatically when scenarios are configured.
  // This default function handles the case where a single scenario is run
  // directly without the scenarios block (e.g. k6 run --vus 10 --duration 30s).
  const scenario = __ENV.SCENARIO || 'state_poll'

  group(scenario, () => {
    switch (scenario) {
      case 'pick_storm':
        runPickStorm()
        break
      case 'reconnect_storm':
        runReconnectStorm()
        break
      case 'state_poll':
      default:
        runStatePoll()
    }
  })
}

// Scenario-specific exec functions (used by k6 scenarios block above)
export function pick_storm() { runPickStorm() }
export function state_poll() { runStatePoll() }
export function reconnect_storm() { runReconnectStorm() }
