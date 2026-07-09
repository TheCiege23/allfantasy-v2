/**
 * Fantasy OS Suite — Phase OS-B1: Commissioner Multi-League Command Center.
 *
 * `resolveCommissionerCommandCenterSnapshot` is pure composition over the already-tested
 * `resolveMissionControlSnapshot`, mirroring `platform-os.test.ts`'s own mocking convention exactly
 * (same boundary mocked, same fixture-building helpers). Proves ONLY this composition's own
 * aggregation/ranking/degradation contract — not Mission Control's own correctness.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveCommissionerCommandCenterSnapshot } from '@/lib/decision-os/commissionerCommandCenter'
import * as missionControl from '@/lib/decision-os/missionControl'
import type { MissionControlSnapshot } from '@/lib/decision-os/missionControl'
import type { LeagueHealthResult } from '@/lib/league-health'
import type { DecisionOsLeagueHealthResult } from '@/lib/decision-os/leagueHealthAlignment'

vi.mock('@/lib/decision-os/missionControl', async () => {
  const actual = await vi.importActual<typeof import('@/lib/decision-os/missionControl')>(
    '@/lib/decision-os/missionControl',
  )
  return { ...actual, resolveMissionControlSnapshot: vi.fn() }
})

const NOW = new Date('2026-07-09T12:00:00Z')

function makeEngine(o: Partial<LeagueHealthResult> = {}): LeagueHealthResult {
  return {
    leagueHealthScore: 70, engagementScore: 70, fairnessScore: 70, sustainabilityScore: 70,
    confidencePct: 80, overallStatus: 'healthy', biggestStrengths: [], biggestProblems: [],
    urgentAlerts: [], earlyWarningSignals: [], inactiveManagerNotes: [], transactionHealthNotes: [],
    waiverHealthNotes: [], tradeHealthNotes: [], rosterBalanceNotes: [], commissionerHealthNotes: [],
    interventionRecommendations: [], summary: 'League health: 70/100 (healthy).',
    generatedAt: NOW.toISOString(), healthTrend: 'stable', churnRiskScore: 10, disputeRiskScore: 0,
    abandonmentRiskScore: 0, engagementDropoffFlags: [], ...o,
  }
}

function makeSnapshot(leagueId: string, o: Partial<MissionControlSnapshot> = {}): MissionControlSnapshot {
  const engine = makeEngine()
  const result: DecisionOsLeagueHealthResult = {
    engine,
    decisionOs: {
      activityEventCount: 10, activeManagerCount: 10, inactiveManagerCount: 0, tradeCount: 2,
      waiverClaimCount: 5, draftPickCount: 0, commissionerActionCount: 0, rosterActivityCount: 4,
      managersAtRetentionRisk: [], trend: { available: false, reason: 'no_snapshots' },
    },
    fieldProvenance: {} as DecisionOsLeagueHealthResult['fieldProvenance'],
  }
  return {
    leagueId,
    generatedAt: NOW.toISOString(),
    leagueHealth: { available: true, result },
    trend: { available: false, reason: 'no_snapshots' },
    managerCounts: { activeManagers: 10, inactiveManagers: 0 },
    activity: { tradeCount: 2, waiverClaimCount: 5, draftPickCount: 0, rosterActivityCount: 4 },
    managersAtRetentionRisk: [],
    recommendedActions: [],
    fieldProvenance: result.fieldProvenance,
    ...o,
  }
}

const mockResolve = () => vi.mocked(missionControl.resolveMissionControlSnapshot)

afterEach(() => {
  vi.clearAllMocks()
})

describe('resolveCommissionerCommandCenterSnapshot', () => {
  it('degrades to an honest all-zero snapshot for an empty league list, never calling the composition', async () => {
    const snapshot = await resolveCommissionerCommandCenterSnapshot([], NOW)
    expect(snapshot).toMatchObject({
      totalLeagues: 0,
      healthyLeagueCount: 0,
      atRiskLeagueCount: 0,
      unavailableLeagueCount: 0,
      leagueSummaries: [],
      attentionQueue: [],
      recentChanges: [],
      warnings: ['no_leagues_specified'],
    })
    expect(mockResolve()).not.toHaveBeenCalled()
  })

  it('aggregates multiple leagues correctly: counts, health split, retention risk', async () => {
    mockResolve().mockImplementation(async (leagueId: string) => {
      if (leagueId === 'L1') {
        return makeSnapshot('L1', {
          managerCounts: { activeManagers: 10, inactiveManagers: 2 },
          managersAtRetentionRisk: [
            { managerId: 'm1', retentionRisk: 'high', retentionRiskReasons: ['inactive'], isInactive: false },
          ],
        })
      }
      return makeSnapshot('L2', {
        leagueHealth: { available: true, result: { ...makeSnapshot('L2').leagueHealth, engine: makeEngine({ overallStatus: 'at_risk' }) } as never },
        managerCounts: { activeManagers: 8, inactiveManagers: 0 },
      })
    })

    const snapshot = await resolveCommissionerCommandCenterSnapshot(['L1', 'L2'], NOW)

    expect(snapshot.totalLeagues).toBe(2)
    expect(snapshot.totalActiveManagers).toBe(18)
    expect(snapshot.totalInactiveManagers).toBe(2)
    expect(snapshot.totalRetentionRiskManagers).toBe(1)
    expect(snapshot.unavailableLeagueCount).toBe(0)
    expect(snapshot.leagueSummaries).toHaveLength(2)
    expect(snapshot.leagueSummaries.map((s) => s.leagueId)).toEqual(['L1', 'L2'])
  })

  it('excludes an unavailable league from ranking data, marking it unavailable rather than zeroing it silently', async () => {
    mockResolve().mockImplementation(async (leagueId: string) => {
      if (leagueId === 'L1') return makeSnapshot('L1')
      return { ...makeSnapshot('L2'), leagueHealth: { available: false, reason: 'league_health_unavailable' } } as MissionControlSnapshot
    })

    const snapshot = await resolveCommissionerCommandCenterSnapshot(['L1', 'L2'], NOW)

    expect(snapshot.unavailableLeagueCount).toBe(1)
    const l2 = snapshot.leagueSummaries.find((s) => s.leagueId === 'L2')
    expect(l2?.available).toBe(false)
    expect(l2?.overallStatus).toBeNull()
    expect(l2?.leagueHealthScore).toBeNull()
  })

  it('never lets one league throwing break the whole aggregation (defense-in-depth)', async () => {
    mockResolve().mockImplementation(async (leagueId: string) => {
      if (leagueId === 'L1') throw new Error('boom')
      return makeSnapshot('L2')
    })

    const snapshot = await resolveCommissionerCommandCenterSnapshot(['L1', 'L2'], NOW)

    expect(snapshot.unavailableLeagueCount).toBe(1)
    expect(snapshot.leagueSummaries.find((s) => s.leagueId === 'L2')?.available).toBe(true)
  })

  it('ranks the attention queue urgent-first, deterministically', async () => {
    mockResolve().mockImplementation(async (leagueId: string) => {
      if (leagueId === 'L1') {
        return makeSnapshot('L1', {
          recommendedActions: [
            { priority: 'standard', message: 'Standard from L1' },
            { priority: 'urgent', message: 'Urgent from L1' },
          ],
        })
      }
      return makeSnapshot('L2', {
        recommendedActions: [{ priority: 'urgent', message: 'Urgent from L2' }],
      })
    })

    const snapshot = await resolveCommissionerCommandCenterSnapshot(['L1', 'L2'], NOW)

    expect(snapshot.attentionQueue.map((e) => e.priority)).toEqual(['urgent', 'urgent', 'standard'])
    expect(snapshot.attentionQueue.map((e) => e.message)).toEqual([
      'Urgent from L1',
      'Urgent from L2',
      'Standard from L1',
    ])
  })

  it('only includes leagues with a real, available trend in recentChanges — never invents a delta', async () => {
    mockResolve().mockImplementation(async (leagueId: string) => {
      if (leagueId === 'L1') {
        return makeSnapshot('L1', { trend: { available: true, direction: 'increasing', eventCountDelta: 5 } as never })
      }
      return makeSnapshot('L2', { trend: { available: false, reason: 'no_snapshots' } })
    })

    const snapshot = await resolveCommissionerCommandCenterSnapshot(['L1', 'L2'], NOW)

    expect(snapshot.recentChanges).toHaveLength(1)
    expect(snapshot.recentChanges[0]).toMatchObject({ leagueId: 'L1', direction: 'increasing', eventCountDelta: 5 })
  })

  it('returns an honest empty attentionQueue/recentChanges when no leagues have real signals', async () => {
    mockResolve().mockImplementation(async (leagueId: string) => makeSnapshot(leagueId))

    const snapshot = await resolveCommissionerCommandCenterSnapshot(['L1'], NOW)

    expect(snapshot.attentionQueue).toEqual([])
    expect(snapshot.recentChanges).toEqual([])
  })
})
