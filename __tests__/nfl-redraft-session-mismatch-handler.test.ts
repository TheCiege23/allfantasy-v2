/**
 * NFL redraft snake draft — session-mismatch in-place recovery lock (Commit J).
 *
 * Locks the contract that a `409 DRAFT_SESSION_MISMATCH` response from the
 * session route is recovered IN-PLACE — never via `router.push`,
 * `router.replace`, or `window.location.{href,assign,replace}`. The
 * unified-state contract from Commit E (one DraftRoomShell, one DraftBoard,
 * status transitions in place) extends to mismatch recovery.
 *
 * Asserts the contract on three surfaces:
 *   1. The 409 branch in `fetchSession` flips
 *      `setSessionMismatchRecovering(true)`, increments the attempt counter
 *      ref, and schedules a single in-place refetch via `setTimeout` —
 *      no navigation primitives anywhere on this path.
 *   2. The render tree shows an inline banner (`role="status"`,
 *      `data-testid="draft-session-mismatch-banner"`) when the recovering
 *      flag is true, with a "Try again" button surfaced after 3 failed
 *      retry attempts.
 *   3. Successful 2xx responses clear the recovering flag and reset the
 *      retry counter (idempotent — safe even when no prior mismatch was
 *      observed).
 *
 * Static-source assertions only — JSDOM-rendering DraftRoomPageClient
 * pulls in 5000+ lines of session/poll/AppShell wiring; the source-level
 * invariants are the contract.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Session-mismatch state lives on DraftRoomPageClient', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('declares sessionMismatchRecovering useState', () => {
    expect(src).toMatch(
      /const \[sessionMismatchRecovering, setSessionMismatchRecovering\] = useState\(false\)/,
    )
  })

  it('declares sessionMismatchRetryTimerRef + sessionMismatchAttemptsRef', () => {
    expect(src).toMatch(/sessionMismatchRetryTimerRef = useRef<number \| null>\(null\)/)
    expect(src).toMatch(/sessionMismatchAttemptsRef = useRef\(0\)/)
  })

  it('documents the no-navigation contract above the state declaration', () => {
    const idx = src.indexOf(
      'const [sessionMismatchRecovering, setSessionMismatchRecovering] = useState(false)',
    )
    expect(idx).toBeGreaterThan(0)
    const above = src.slice(Math.max(0, idx - 700), idx)
    expect(above).toMatch(/router\.push/)
    expect(above).toMatch(/router\.replace/)
    expect(above).toMatch(/window\.location\.replace/)
    expect(above).toMatch(/in.place|in-place/i)
  })
})

describe('fetchSession 409 handler', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  // Slice the fetchSession body so the regex window doesn't pick up
  // unrelated code elsewhere in the 5000-line file.
  const fetchStart = src.indexOf('const fetchSession = useCallback(')
  const fetchEnd = fetchStart >= 0 ? src.indexOf('}, [leagueId])', fetchStart) : -1
  const fetchBody =
    fetchStart >= 0 && fetchEnd > fetchStart
      ? src.slice(fetchStart, fetchEnd + '}, [leagueId])'.length)
      : ''

  it('fetchSession body is bounded', () => {
    expect(fetchStart).toBeGreaterThan(0)
    expect(fetchEnd).toBeGreaterThan(fetchStart)
  })

  it('detects 409 with code DRAFT_SESSION_MISMATCH', () => {
    expect(fetchBody).toMatch(
      /res\.status === 409 && \(data as \{ code\?: unknown \}\)\?\.code === 'DRAFT_SESSION_MISMATCH'/,
    )
  })

  it('flips the recovering banner state on the 409 branch', () => {
    expect(fetchBody).toMatch(/setSessionMismatchRecovering\(true\)/)
  })

  it('increments the attempt counter via the ref (no state thrash)', () => {
    expect(fetchBody).toMatch(/sessionMismatchAttemptsRef\.current \+= 1/)
  })

  it('schedules an in-place refetch via setTimeout, capped at 3 retries', () => {
    expect(fetchBody).toMatch(/sessionMismatchAttemptsRef\.current <= 3/)
    expect(fetchBody).toMatch(/window\.setTimeout\(/)
    expect(fetchBody).toMatch(/void fetchSession\(\)/)
  })

  it('clears any prior retry timer before scheduling a new one (no leaks)', () => {
    expect(fetchBody).toMatch(/window\.clearTimeout\(sessionMismatchRetryTimerRef\.current\)/)
  })

  it('NEVER calls router.push / router.replace / window.location on the 409 path', () => {
    expect(fetchBody).not.toMatch(/router\.push\(/)
    expect(fetchBody).not.toMatch(/router\.replace\(/)
    expect(fetchBody).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
  })

  it('clears the recovering flag and resets the attempt counter on a 2xx success', () => {
    expect(fetchBody).toMatch(
      /setSessionMismatchRecovering\(false\)\s+sessionMismatchAttemptsRef\.current = 0/,
    )
  })
})

describe('Inline mismatch banner (no shell or board swap)', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('renders a status-role banner with the canonical testid when recovering', () => {
    expect(src).toMatch(
      /sessionMismatchRecovering \? \([\s\S]*?data-testid="draft-session-mismatch-banner"/,
    )
  })

  it('shows the canonical recovery copy', () => {
    expect(src).toMatch(/Draft status changed\. Refreshing room state/)
  })

  it('exposes a "Try again" button after 3 retries (data-testid="draft-session-mismatch-retry")', () => {
    expect(src).toMatch(/data-testid="draft-session-mismatch-retry"/)
    expect(src).toMatch(/sessionMismatchAttemptsRef\.current > 3/)
  })

  it('the "Try again" button resets the retry counter and re-invokes fetchSession in place', () => {
    const buttonIdx = src.indexOf('data-testid="draft-session-mismatch-retry"')
    expect(buttonIdx).toBeGreaterThan(0)
    const window = src.slice(Math.max(0, buttonIdx - 400), buttonIdx + 200)
    expect(window).toMatch(/sessionMismatchAttemptsRef\.current = 0/)
    expect(window).toMatch(/void fetchSession\(\)/)
    expect(window).not.toMatch(/router\.push\(/)
    expect(window).not.toMatch(/router\.replace\(/)
    expect(window).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
  })

  it('the banner is rendered as a peer of existing status banners — NOT inside a shell or board mount', () => {
    const bannerIdx = src.indexOf('data-testid="draft-session-mismatch-banner"')
    expect(bannerIdx).toBeGreaterThan(0)
    const window = src.slice(Math.max(0, bannerIdx - 400), bannerIdx + 800)
    expect(window).not.toMatch(/<DraftRoomShell\b/)
    expect(window).not.toMatch(/<DraftBoard\b/)
  })
})

describe('Commit E unified-state lock still holds after Slice J', () => {
  const src = read('components/app/draft-room/DraftRoomPageClient.tsx')

  it('exactly one <DraftRoomShell> mount in the component', () => {
    const matches = src.match(/<DraftRoomShell\b/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('exactly one <DraftBoard> mount in the component', () => {
    const matches = src.match(/<DraftBoard\b/g) ?? []
    expect(matches.length).toBe(1)
  })

  it('handleStartDraft + handleCommissionerAction still navigation-free', () => {
    const actionStart = src.indexOf('const handleCommissionerAction = useCallback(')
    const actionEnd =
      actionStart >= 0 ? src.indexOf('const handleCommissionerUndoPick =', actionStart) : -1
    const actionBody =
      actionStart >= 0 && actionEnd > actionStart ? src.slice(actionStart, actionEnd) : ''
    expect(actionBody).not.toMatch(/router\.push\(/)
    expect(actionBody).not.toMatch(/router\.replace\(/)
    expect(actionBody).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)

    const startStart = src.indexOf('const handleStartDraft = useCallback(')
    const startEnd =
      startStart >= 0 ? src.indexOf('const handleSettingsPatch', startStart) : -1
    const startBody =
      startStart >= 0 && startEnd > startStart ? src.slice(startStart, startEnd) : ''
    expect(startBody).not.toMatch(/router\.push\(/)
    expect(startBody).not.toMatch(/router\.replace\(/)
    expect(startBody).not.toMatch(/window\.location\.(href|assign|replace)\s*[=(]/)
  })
})
