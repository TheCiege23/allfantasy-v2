/**
 * Phase 3.3 — Intelligence API expansion handler tests.
 * Covers the 3 new handlers: leagueManagersIntelligenceHandler,
 * leagueTrendIntelligenceHandler, leagueDeadlineIntelligenceHandler.
 * Same gate/scope/param-validation conventions as intelligence-api-routes.test.ts.
 */
import { vi, describe, it, expect, afterEach } from 'vitest'
import type { ManagerBehavioralIntelligence } from '../../lib/decision-os/behavioral/manager-intelligence'
import {
  leagueManagersIntelligenceHandler,
  leagueTrendIntelligenceHandler,
  leagueDeadlineIntelligenceHandler,
} from '../../lib/decision-os/behavioral/api/intelligence-handlers'
import type { IntelligenceDataProvider, IntelligenceApiContext } from '../../lib/decision-os/behavioral/api/intelligence-handlers'
import type { IntelligenceApiError, ManagerSummaryV1, LeagueTrendV1, LeagueDeadlineV1 } from '../../lib/decision-os/behavioral/api/contracts'

vi.mock('../../lib/decision-os/behavioral/history/snapshots', () => ({
  getRecentLeagueSnapshots: vi.fn(),
}))
vi.mock('../../lib/decision-os/behavioral/deadlines/deadlineIntelligence', () => ({
  deriveLeagueDeadlineIntelligence: vi.fn(),
}))

import { getRecentLeagueSnapshots } from '../../lib/decision-os/behavioral/history/snapshots'
import { deriveLeagueDeadlineIntelligence } from '../../lib/decision-os/behavioral/deadlines/deadlineIntelligence'

const TEST_KEY_COMMISSIONER = 'afk_test_abcdefghijklmnop2'
const TEST_KEY_MANAGER      = 'afk_test_abcdefghijklmnop3'

const TEST_KEYS_MAP = JSON.stringify({
  [TEST_KEY_COMMISSIONER]: 'commissioner',
  [TEST_KEY_MANAGER]:      'manager',
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

function enableApi() {
  vi.stubEnv('DECISION_OS_INTELLIGENCE_API_ENABLED', 'true')
  vi.stubEnv('INTELLIGENCE_API_TEST_KEYS', TEST_KEYS_MAP)
}

function makeCtx(apiKey?: string, searchParams: Record<string, string> = {}): IntelligenceApiContext {
  const headers = new Map<string, string>()
  if (apiKey) headers.set('x-allfantasy-api-key', apiKey)
  return {
    headers:      { get: (k) => headers.get(k.toLowerCase()) ?? null },
    searchParams: new URLSearchParams(searchParams),
  }
}

function errCode(body: unknown): string {
  return (body as IntelligenceApiError).code
}

function makeManagerIntel(overrides: Partial<ManagerBehavioralIntelligence> = {}): ManagerBehavioralIntelligence {
  return {
    managerId: 'mgr-001', leagueId: 'lgr-001',
    participationTier: 'active', retentionRisk: 'low', retentionRiskReasons: ['stable'],
    lineupEngagement: { score: 80, level: 'high', eventCount: 8, lastEventAt: null, warnings: [] },
    waiverEngagement: { score: 55, level: 'moderate', eventCount: 3, lastEventAt: null, warnings: [] },
    tradeEngagement:  { score: 40, level: 'low', eventCount: 1, lastEventAt: null, warnings: [] },
    draftEngagement:  { score: 90, level: 'high', eventCount: 1, lastEventAt: null, warnings: [] },
    overallEngagementScore: 65,
    daysSinceLastActivity: 2, isInactive: false, inactivityWarning: null,
    nudges: [],
    completeness: 90, derivedFrom: 10, lookbackDays: 90, warnings: [],
    derivedAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
  } as ManagerBehavioralIntelligence
}

function makeProvider(overrides: Partial<IntelligenceDataProvider> = {}): IntelligenceDataProvider {
  return {
    getManagerIntelligence: async () => null,
    getLeagueIntelligence: async () => null,
    getPlatformIntelligence: async () => null,
    getLeagueManagerIntelligences: async () => [makeManagerIntel()],
    ...overrides,
  }
}

// ── League managers handler ───────────────────────────────────────────────────

describe('leagueManagersIntelligenceHandler', () => {
  it('503 when the feature flag is off', async () => {
    const r = await leagueManagersIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }), makeProvider())
    expect(r.status).toBe(503)
  })

  it('403 for a tier without intelligence:league:read (manager tier)', async () => {
    enableApi()
    const r = await leagueManagersIntelligenceHandler(makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001' }), makeProvider())
    expect(r.status).toBe(403)
    expect(errCode(r.body)).toBe('FORBIDDEN')
  })

  it('400 when leagueId is missing', async () => {
    enableApi()
    const r = await leagueManagersIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER), makeProvider())
    expect(r.status).toBe(400)
    expect(errCode(r.body)).toBe('INVALID_REQUEST')
  })

  it('503 when the provider returns null (data unavailable)', async () => {
    enableApi()
    const r = await leagueManagersIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }),
      makeProvider({ getLeagueManagerIntelligences: async () => null }),
    )
    expect(r.status).toBe(503)
  })

  it('200 with a ManagerSummaryV1[] shaped list, no managerName field (no identity resolution — that is the caller\'s concern)', async () => {
    enableApi()
    const r = await leagueManagersIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }),
      makeProvider({ getLeagueManagerIntelligences: async () => [makeManagerIntel({ managerId: 'mgr-x', retentionRisk: 'high' })] }),
    )
    expect(r.status).toBe(200)
    const data = (r.body as { data: ManagerSummaryV1[] }).data
    expect(data).toHaveLength(1)
    expect(data[0].managerId).toBe('mgr-x')
    expect(data[0].retentionRisk).toBe('high')
    expect('managerName' in data[0]).toBe(false)
    expect('nudges' in data[0]).toBe(false)
    expect('engagementDimensions' in data[0]).toBe(false)
  })

  it('returns an empty list, not an error, when the league has zero surfaced managers', async () => {
    enableApi()
    const r = await leagueManagersIntelligenceHandler(
      makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }),
      makeProvider({ getLeagueManagerIntelligences: async () => [] }),
    )
    expect(r.status).toBe(200)
    expect((r.body as { data: ManagerSummaryV1[] }).data).toEqual([])
  })
})

// ── League trend handler ──────────────────────────────────────────────────────

describe('leagueTrendIntelligenceHandler', () => {
  it('503 when the feature flag is off', async () => {
    const r = await leagueTrendIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(503)
  })

  it('403 for a tier without intelligence:league:read', async () => {
    enableApi()
    const r = await leagueTrendIntelligenceHandler(makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(403)
  })

  it('400 when leagueId is missing', async () => {
    enableApi()
    const r = await leagueTrendIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER))
    expect(r.status).toBe(400)
  })

  it('200 with available:false + insufficient_historical_data honestly, with fewer than 2 real snapshots', async () => {
    enableApi()
    vi.mocked(getRecentLeagueSnapshots).mockResolvedValue([])
    const r = await leagueTrendIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(200)
    const data = (r.body as { data: LeagueTrendV1 }).data
    expect(data).toEqual({ available: false, reason: 'insufficient_historical_data', snapshotCount: 0 })
  })

  it('200 with a real, flat comparison shape (not nested under trend) with 2 real snapshots', async () => {
    enableApi()
    vi.mocked(getRecentLeagueSnapshots).mockResolvedValue([
      { capturedAt: 'T2', leagueEngagementScore: 90, leagueEngagementTier: 'elite', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
      { capturedAt: 'T1', leagueEngagementScore: 70, leagueEngagementTier: 'active', tradeActivityRate: 1, waiverActivityRate: 1, draftActivityRate: 1 },
    ])
    const r = await leagueTrendIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(200)
    const data = (r.body as { data: LeagueTrendV1 }).data
    expect(data).toEqual({
      available: true,
      direction: 'up',
      magnitude: 20,
      scoreDelta: 20,
      previousScore: 70,
      currentScore: 90,
      capturedAt: 'T2',
      comparedToCapturedAt: 'T1',
    })
  })
})

// ── League deadlines handler ───────────────────────────────────────────────────

describe('leagueDeadlineIntelligenceHandler', () => {
  it('503 when the feature flag is off', async () => {
    const r = await leagueDeadlineIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(503)
  })

  it('403 for a tier without intelligence:league:read', async () => {
    enableApi()
    const r = await leagueDeadlineIntelligenceHandler(makeCtx(TEST_KEY_MANAGER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(403)
  })

  it('400 when leagueId is missing', async () => {
    enableApi()
    const r = await leagueDeadlineIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER))
    expect(r.status).toBe(400)
  })

  it('503 when the league does not exist', async () => {
    enableApi()
    vi.mocked(deriveLeagueDeadlineIntelligence).mockResolvedValue(null)
    const r = await leagueDeadlineIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'missing' }))
    expect(r.status).toBe(503)
  })

  it('200 with the real derived deadline intelligence, unmodified', async () => {
    enableApi()
    const intel = {
      leagueId: 'lgr-001', season: 2026, currentWeek: 7,
      tradeDeadline: { label: 'trade_deadline' as const, week: 10, weeksAway: 3, hasPassed: false },
      playoffsStart: { label: 'playoffs_start' as const, week: 14, weeksAway: 7, hasPassed: false },
      draft: null,
      nextWaiverProcessing: null,
      nextActionableEvent: { label: 'trade_deadline' as const, week: 10, weeksAway: 3, hasPassed: false },
      derivedAt: '2026-07-03T00:00:00.000Z',
    }
    vi.mocked(deriveLeagueDeadlineIntelligence).mockResolvedValue(intel)
    const r = await leagueDeadlineIntelligenceHandler(makeCtx(TEST_KEY_COMMISSIONER, { leagueId: 'lgr-001' }))
    expect(r.status).toBe(200)
    const data = (r.body as { data: LeagueDeadlineV1 }).data
    expect(data.tradeDeadline).toEqual(intel.tradeDeadline)
    expect(data.playoffsStart).toEqual(intel.playoffsStart)
    expect(data.currentWeek).toBe(7)
  })
})
