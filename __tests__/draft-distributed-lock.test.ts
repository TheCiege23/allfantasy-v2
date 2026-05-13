/**
 * Draft distributed lock — unit tests for race condition protection.
 *
 * Tests five collision scenarios:
 *   1. Double-submit across instances    — same expectedOverall from two servers
 *   2. Simultaneous auto-pick + manual   — source='auto' races source='user'
 *   3. Auction close collision           — two resolveAuctionWin calls overlap
 *   4. Commissioner pause during submit  — pause races an in-flight pick
 *   5. Reconnect replay collision        — stale client re-sends same pick
 *
 * Strategy: mock `acquireAutomationLock` / `releaseAutomationLock` from
 * lib/automation/locks to control lock-busy and infra-error paths without
 * touching Redis or Postgres.  Prisma is mocked to return minimal session
 * data sufficient to reach the lock check.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock lib/automation/locks ─────────────────────────────────────────────────
vi.mock('@/lib/automation/locks', () => ({
  acquireAutomationLock: vi.fn(),
  releaseAutomationLock: vi.fn().mockResolvedValue(undefined),
}))

// ── Mock analytics so tests don't hit DB ─────────────────────────────────────
vi.mock('@/lib/analytics/recordAnalyticsEvent', () => ({
  recordEngineTelemetrySample: vi.fn(),
}))

// ── Import after mocks are registered ─────────────────────────────────────────
import { acquireAutomationLock, releaseAutomationLock } from '@/lib/automation/locks'
import { withPickLock, withAuctionLock, withControlLock } from '@/lib/draft/draftLock'
import { recordEngineTelemetrySample } from '@/lib/analytics/recordAnalyticsEvent'

const mockAcquire = vi.mocked(acquireAutomationLock)
const mockRelease = vi.mocked(releaseAutomationLock)
const mockTelemetry = vi.mocked(recordEngineTelemetrySample)

// ── Helpers ───────────────────────────────────────────────────────────────────

function acquireOk(backend: 'redis' | 'postgres' = 'redis') {
  mockAcquire.mockResolvedValueOnce({ ok: true, backend })
}

function acquireBusy(via: 'redis' | 'postgres' = 'redis') {
  mockAcquire.mockResolvedValueOnce({
    ok: false,
    reason: `Lock held (${via})`,
  })
}

function acquireInfraError() {
  mockAcquire.mockResolvedValueOnce({
    ok: false,
    reason: 'Postgres lock error: connection refused',
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Double-submit across instances
// Two Vercel instances receive the same pick at the same time.
// Instance A acquires the lock and writes successfully.
// Instance B arrives while A's lock is held → should get { acquired: false }.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 1 — double-submit across instances', () => {
  it('second instance receives acquired:false when lock is busy (Redis)', async () => {
    acquireBusy('redis')
    const fn = vi.fn().mockResolvedValue({ success: true })
    const result = await withPickLock('league-1', fn)

    expect(result.acquired).toBe(false)
    if (!result.acquired) expect(result.reason).toBe('busy')
    // fn must NOT be called when lock is held
    expect(fn).not.toHaveBeenCalled()
  })

  it('second instance receives acquired:false when lock is busy (Postgres fallback)', async () => {
    acquireBusy('postgres')
    const fn = vi.fn()
    const result = await withPickLock('league-2', fn)

    expect(result.acquired).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })

  it('first instance acquires lock, calls fn, releases on success', async () => {
    acquireOk('redis')
    const fn = vi.fn().mockResolvedValue({ success: true, snapshot: { overall: 5 } })
    const result = await withPickLock('league-1', fn)

    expect(result.acquired).toBe(true)
    if (result.acquired) {
      expect(result.backend).toBe('redis')
      expect(result.value).toEqual({ success: true, snapshot: { overall: 5 } })
    }
    expect(fn).toHaveBeenCalledOnce()
    expect(mockRelease).toHaveBeenCalledOnce()
  })

  it('lock is released even when fn throws', async () => {
    acquireOk()
    const fn = vi.fn().mockRejectedValue(new Error('DB error'))

    await expect(withPickLock('league-1', fn)).rejects.toThrow('DB error')
    expect(mockRelease).toHaveBeenCalledOnce()
  })

  it('emits DRAFT_LOCK_CONTENDED telemetry on busy', async () => {
    acquireBusy()
    await withPickLock('league-1', vi.fn())

    expect(mockTelemetry).toHaveBeenCalledWith(
      'engine.draft.lock_contended',
      expect.objectContaining({ meta: expect.objectContaining({ leagueId: 'league-1', domain: 'pick' }) })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Simultaneous auto-pick + manual pick
// Both path types go through withPickLock — same lock domain, same leagueId.
// Whichever arrives second sees the lock busy.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 2 — simultaneous auto-pick + manual pick', () => {
  it('manual pick while auto-pick holds lock → acquired:false', async () => {
    // Auto-pick got the lock. Manual pick attempt:
    acquireBusy('redis')
    const manualFn = vi.fn().mockResolvedValue({ success: true, source: 'user' })
    const result = await withPickLock('league-auto', manualFn)

    expect(result.acquired).toBe(false)
    expect(manualFn).not.toHaveBeenCalled()
  })

  it('auto-pick while manual holds lock → acquired:false', async () => {
    acquireBusy()
    const autoFn = vi.fn().mockResolvedValue({ success: true, source: 'auto' })
    const result = await withPickLock('league-auto', autoFn)

    expect(result.acquired).toBe(false)
    expect(autoFn).not.toHaveBeenCalled()
  })

  it('sequential picks on same league both run (different lock acquisitions)', async () => {
    acquireOk('redis')
    acquireOk('redis')

    const fn1 = vi.fn().mockResolvedValue({ success: true, overall: 1 })
    const fn2 = vi.fn().mockResolvedValue({ success: true, overall: 2 })

    const r1 = await withPickLock('league-seq', fn1)
    const r2 = await withPickLock('league-seq', fn2)

    expect(r1.acquired).toBe(true)
    expect(r2.acquired).toBe(true)
    expect(fn1).toHaveBeenCalledOnce()
    expect(fn2).toHaveBeenCalledOnce()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Auction close collision
// Two concurrent resolveAuctionWin calls (timer expiry on two instances).
// Both go through withAuctionLock on the same leagueId.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 3 — auction close collision', () => {
  it('second resolveAuctionWin call is rejected when lock is held', async () => {
    acquireBusy('redis')
    const fn = vi.fn().mockResolvedValue({ success: true, sold: true })
    const result = await withAuctionLock('auction-league', fn)

    expect(result.acquired).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })

  it('winning bid lock is released after resolution', async () => {
    acquireOk('redis')
    const fn = vi.fn().mockResolvedValue({ success: true, sold: true, winnerRosterId: 'r1', amount: 45 })
    const result = await withAuctionLock('auction-league', fn)

    expect(result.acquired).toBe(true)
    if (result.acquired) expect(result.value.sold).toBe(true)
    expect(mockRelease).toHaveBeenCalledOnce()
  })

  it('auction lock uses a separate key domain from pick lock', async () => {
    acquireOk('redis')
    acquireOk('redis')

    await withPickLock('multi-league', vi.fn().mockResolvedValue({}))
    await withAuctionLock('multi-league', vi.fn().mockResolvedValue({}))

    const pickKey = mockAcquire.mock.calls[0]?.[0]
    const auctionKey = mockAcquire.mock.calls[1]?.[0]

    expect(pickKey).toBe('draft:multi-league:pick')
    expect(auctionKey).toBe('draft:multi-league:auction')
    expect(pickKey).not.toBe(auctionKey)
  })

  it('emits DRAFT_LOCK_CONTENDED on auction busy', async () => {
    acquireBusy()
    await withAuctionLock('auction-league', vi.fn())

    expect(mockTelemetry).toHaveBeenCalledWith(
      'engine.draft.lock_contended',
      expect.objectContaining({ meta: expect.objectContaining({ domain: 'auction' }) })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Commissioner pause during pick submit
// These use DIFFERENT lock domains (pick vs control) so they should NOT
// block each other — the pick's DB transaction is the safety net if both
// arrive simultaneously.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 4 — commissioner pause during pick submit', () => {
  it('pick lock and control lock use separate key domains', async () => {
    acquireOk('redis')
    acquireOk('redis')

    await withPickLock('comm-league', vi.fn().mockResolvedValue({}))
    await withControlLock('comm-league', vi.fn().mockResolvedValue({}))

    const pickKey = mockAcquire.mock.calls[0]?.[0]
    const controlKey = mockAcquire.mock.calls[1]?.[0]

    expect(pickKey).toBe('draft:comm-league:pick')
    expect(controlKey).toBe('draft:comm-league:control')
    expect(pickKey).not.toBe(controlKey)
  })

  it('pick busy does not block control lock acquisition', async () => {
    // pick lock is busy (not relevant to control)
    acquireBusy('redis')  // this will be consumed by withPickLock
    acquireOk('redis')    // this will be consumed by withControlLock

    const pickFn = vi.fn()
    const controlFn = vi.fn().mockResolvedValue(true)

    const pickResult = await withPickLock('comm-league', pickFn)
    const controlResult = await withControlLock('comm-league', controlFn)

    expect(pickResult.acquired).toBe(false)   // pick blocked
    expect(controlResult.acquired).toBe(true) // control unaffected
    expect(pickFn).not.toHaveBeenCalled()
    expect(controlFn).toHaveBeenCalledOnce()
  })

  it('control lock TTL is 8 s (larger than pick TTL)', async () => {
    // Verify that the TTL passed to acquireAutomationLock matches the design.
    acquireOk()
    acquireOk()
    await Promise.all([
      withPickLock('l', vi.fn().mockResolvedValue({})),
      withControlLock('l', vi.fn().mockResolvedValue({})),
    ])

    const pickTtl = (mockAcquire.mock.calls[0]?.[1] as any)?.ttlMs
    const controlTtl = (mockAcquire.mock.calls[1]?.[1] as any)?.ttlMs
    expect(pickTtl).toBe(5_000)
    expect(controlTtl).toBe(8_000)
    expect(controlTtl).toBeGreaterThan(pickTtl)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Reconnect replay collision
// A client reconnects after a brief network drop and re-sends the same pick
// (same expectedOverall). The second request finds the lock busy because the
// first is still in-flight OR the DB sentinel catches it (DRAFT_PICK_RACE_RETRY).
// This test validates the lock layer handles the first case.
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario 5 — reconnect replay collision', () => {
  it('replayed pick while first is in-flight → acquired:false, fn not called', async () => {
    acquireBusy('redis')
    const replayFn = vi.fn()
    const result = await withPickLock('replay-league', replayFn)

    expect(result.acquired).toBe(false)
    if (!result.acquired) expect(result.reason).toBe('busy')
    expect(replayFn).not.toHaveBeenCalled()
  })

  it('replayed pick after first completes → lock is free, fn is called', async () => {
    // First pick completes and releases the lock.
    acquireOk('redis')
    const firstFn = vi.fn().mockResolvedValue({ success: true, overall: 7 })
    const r1 = await withPickLock('replay-league', firstFn)
    expect(r1.acquired).toBe(true)
    expect(mockRelease).toHaveBeenCalledOnce()

    // Second pick (replay) — lock is now free.
    acquireOk('redis')
    const replayFn = vi.fn().mockResolvedValue({ success: false, code: 'DRAFT_PICK_STALE_OVERALL' })
    const r2 = await withPickLock('replay-league', replayFn)

    expect(r2.acquired).toBe(true)
    if (r2.acquired) {
      // The DB sentinel correctly rejects the duplicate
      expect(r2.value).toMatchObject({ success: false, code: 'DRAFT_PICK_STALE_OVERALL' })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Infrastructure failure — fail open
// If Redis + Postgres both fail, the request proceeds without a lock so that
// active drafts are never blocked by a monitoring outage.
// ─────────────────────────────────────────────────────────────────────────────
describe('Fail-open: infrastructure error', () => {
  it('proceeds without lock and returns backend:passthrough', async () => {
    acquireInfraError()
    const fn = vi.fn().mockResolvedValue({ success: true })
    const result = await withPickLock('infra-down-league', fn)

    // Fail open: fn MUST still be called
    expect(fn).toHaveBeenCalledOnce()
    expect(result.acquired).toBe(true)
    if (result.acquired) expect(result.backend).toBe('passthrough')
  })

  it('does NOT call releaseAutomationLock on infra error (nothing to release)', async () => {
    acquireInfraError()
    await withPickLock('infra-league', vi.fn().mockResolvedValue({}))

    // Lock was never acquired, so release should not be called
    expect(mockRelease).not.toHaveBeenCalled()
  })

  it('emits DRAFT_LOCK_TIMEOUT telemetry on infra error', async () => {
    acquireInfraError()
    await withPickLock('infra-league', vi.fn().mockResolvedValue({}))

    expect(mockTelemetry).toHaveBeenCalledWith(
      'engine.draft.lock_timeout',
      expect.objectContaining({ meta: expect.objectContaining({ leagueId: 'infra-league' }) })
    )
  })

  it('auction lock also fails open on infra error', async () => {
    acquireInfraError()
    const fn = vi.fn().mockResolvedValue({ success: true, sold: false })
    const result = await withAuctionLock('infra-league', fn)

    expect(fn).toHaveBeenCalledOnce()
    if (result.acquired) expect(result.backend).toBe('passthrough')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Lock key structure
// Verifies the exact key format used in Redis/Postgres so ops dashboards and
// admin scripts can scope per-league lock monitoring.
// ─────────────────────────────────────────────────────────────────────────────
describe('Lock key format', () => {
  it('pick lock key is draft:{leagueId}:pick', async () => {
    acquireOk()
    await withPickLock('abc-123', vi.fn().mockResolvedValue({}))
    expect(mockAcquire.mock.calls[0]?.[0]).toBe('draft:abc-123:pick')
  })

  it('auction lock key is draft:{leagueId}:auction', async () => {
    acquireOk()
    await withAuctionLock('abc-123', vi.fn().mockResolvedValue({}))
    expect(mockAcquire.mock.calls[0]?.[0]).toBe('draft:abc-123:auction')
  })

  it('control lock key is draft:{leagueId}:control', async () => {
    acquireOk()
    await withControlLock('abc-123', vi.fn().mockResolvedValue({}))
    expect(mockAcquire.mock.calls[0]?.[0]).toBe('draft:abc-123:control')
  })

  it('lock owner is a UUID (unique per invocation)', async () => {
    acquireOk()
    acquireOk()
    await withPickLock('league-x', vi.fn().mockResolvedValue({}))
    await withPickLock('league-x', vi.fn().mockResolvedValue({}))

    const owner1 = (mockAcquire.mock.calls[0]?.[1] as any)?.owner
    const owner2 = (mockAcquire.mock.calls[1]?.[1] as any)?.owner
    expect(typeof owner1).toBe('string')
    expect(owner1).toMatch(/^[0-9a-f-]{36}$/)
    expect(owner1).not.toBe(owner2) // different UUIDs per invocation
  })
})
