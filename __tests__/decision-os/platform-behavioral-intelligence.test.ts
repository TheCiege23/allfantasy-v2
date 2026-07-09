/**
 * Phase 5.4 — Platform Behavioral Intelligence tests.
 *
 * Covers:
 *   - Empty platform (no leagues, managers, events)
 *   - Platform engagement score and tier (all 5 tiers)
 *   - League health distribution (counts + percents)
 *   - Commissioner quality distribution (counts + percents)
 *   - Retention distribution (manager-level + league-level)
 *   - Ecosystem dimensions: trade, waiver, draft (all 4 tiers + rates)
 *   - Activity heatmap (no events → empty; cells built correctly; peak identified)
 *   - Engagement trends (no events → insufficient; momentum signals; confidence levels)
 *   - Intervention opportunities (priority order; dedup by league; cap at 20; manager scope)
 *   - Data quality (completeness avg; uncertainty levels; warnings propagated)
 *   - No mutation invariant
 *   - Provenance (input counts; derivedAt; lookbackDays)
 */

import { describe, expect, it } from 'vitest'
import type { BehavioralEvent } from '../../lib/decision-os/behavioral/events/types'
import type { LeagueBehavioralIntelligence } from '../../lib/decision-os/behavioral/league-intelligence'
import type { ManagerBehavioralIntelligence } from '../../lib/decision-os/behavioral/manager-intelligence'
import {
  derivePlatformBehavioralIntelligence,
} from '../../lib/decision-os/behavioral/platform-intelligence'

// ── Fixed clock ───────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-30T12:00:00.000Z')

// ── Fixture helpers ───────────────────────────────────────────────────────────

let _leagueSeq = 0
let _managerSeq = 0

function makeLeagueIntel(
  overrides: Partial<LeagueBehavioralIntelligence> = {},
): LeagueBehavioralIntelligence {
  const leagueId = `league-${++_leagueSeq}`
  return {
    leagueId,
    leagueEngagementScore: 60,
    leagueEngagementTier:  'active',
    participationDistribution: {
      totalManagers:    10,
      activeManagers:   8,
      inactiveManagers: 2,
      activePercent:    80,
      inactivePercent:  20,
    },
    inactiveManagerCount: 2,
    tradeActivity:  { tier: 'moderate', count: 8,  perManagerRate: 0.8,  warnings: [] },
    waiverActivity: { tier: 'moderate', count: 12, perManagerRate: 1.2,  warnings: [] },
    draftActivity:  { tier: 'moderate', count: 80, perManagerRate: 8.0,  warnings: [] },
    retentionRisk:          'low',
    retentionRiskReasons:   [],
    commissionerWorkload:   'moderate',
    commissionerWorkloadItems: [],
    recommendations:        [],
    healthNarrativeInputs:  { engagementSummary: '8 of 10 managers are active', topConcern: null, standoutSignal: null },
    completeness:   80,
    derivedFrom:    100,
    managerCount:   10,
    lookbackDays:   90,
    warnings:       [],
    derivedAt:      NOW.toISOString(),
    ...overrides,
    // leagueId must come after spread so it stays fixed when not overridden
    leagueId: overrides.leagueId ?? leagueId,
  }
}

function makeManagerIntel(
  overrides: Partial<ManagerBehavioralIntelligence> = {},
): ManagerBehavioralIntelligence {
  const managerId = `manager-${++_managerSeq}`
  return {
    managerId,
    leagueId:              'league-1',
    participationTier:     'active',
    retentionRisk:         'low',
    retentionRiskReasons:  [],
    lineupEngagement:      { score: 65, level: 'moderate', eventCount: 3, lastEventAt: null, warnings: [] },
    waiverEngagement:      { score: 55, level: 'moderate', eventCount: 2, lastEventAt: null, warnings: [] },
    tradeEngagement:       { score: 40, level: 'low',      eventCount: 1, lastEventAt: null, warnings: [] },
    draftEngagement:       { score: 50, level: 'moderate', eventCount: 5, lastEventAt: null, warnings: [] },
    overallEngagementScore: 55,
    daysSinceLastActivity:  2,
    isInactive:             false,
    inactivityWarning:      null,
    nudges:                 [],
    completeness:           80,
    derivedFrom:            11,
    lookbackDays:           null,
    warnings:               [],
    derivedAt:              NOW.toISOString(),
    ...overrides,
    managerId: overrides.managerId ?? managerId,
  }
}

function makeCriticalManagerIntel(
  managerId: string,
  leagueId: string,
): ManagerBehavioralIntelligence {
  return makeManagerIntel({
    managerId,
    leagueId,
    retentionRisk:         'critical',
    retentionRiskReasons:  ['Manager has never taken any recorded action'],
    participationTier:     'inactive',
    overallEngagementScore: 0,
    isInactive:             true,
    inactivityWarning:      'No recorded manager activity',
  })
}

function makeEvent(
  overrides: Partial<BehavioralEvent> = {},
  occurredAt = '2026-06-28T14:00:00.000Z',
): BehavioralEvent {
  return {
    eventId:     `evt-${Math.random().toString(36).slice(2)}`,
    eventType:   'lineup_saved',
    occurredAt,
    recordedAt:  occurredAt,
    leagueId:    'league-1',
    managerId:   'manager-1',
    source:      'api',
    provenance:  { provider: null, sourceId: null, importedAt: null, derivedFrom: [] },
    completeness: 1,
    uncertainty:  { level: 'low', reason: null },
    metadata:    { week: 1, rosterSlotsFilled: 9, totalRosterSlots: 9 },
    ...overrides,
  } as BehavioralEvent
}

// ── Empty platform ────────────────────────────────────────────────────────────

describe('empty platform — no leagues, managers, or events', () => {
  // Reset sequences before each suite block
  _leagueSeq = 0
  _managerSeq = 0
  const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)

  it('platformEngagementScore is 0', () => {
    expect(intel.platformEngagementScore).toBe(0)
  })

  it('platformEngagementTier is inactive', () => {
    expect(intel.platformEngagementTier).toBe('inactive')
  })

  it('all distribution counts are 0', () => {
    expect(intel.leagueHealthDistribution.totalLeagues).toBe(0)
    expect(intel.commissionerQualityDistribution.totalLeagues).toBe(0)
    expect(intel.retentionDistribution.totalManagers).toBe(0)
    expect(intel.retentionDistribution.totalLeagues).toBe(0)
  })

  it('all ecosystem dimensions are none', () => {
    expect(intel.tradeEcosystem.tier).toBe('none')
    expect(intel.waiverEcosystem.tier).toBe('none')
    expect(intel.draftParticipation.tier).toBe('none')
  })

  it('activityHeatmap is empty', () => {
    expect(intel.activityHeatmap.cells).toHaveLength(0)
    expect(intel.activityHeatmap.peakCellKey).toBeNull()
    expect(intel.activityHeatmap.totalEventsAnalyzed).toBe(0)
    expect(intel.activityHeatmap.peakCount).toBe(0)
  })

  it('engagementTrends is insufficient_data', () => {
    expect(intel.engagementTrends.momentumSignal).toBe('insufficient_data')
    expect(intel.engagementTrends.recentActivityRatio).toBeNull()
    expect(intel.engagementTrends.recentlyActiveManagerPercent).toBeNull()
    expect(intel.engagementTrends.trendConfidence).toBe('insufficient')
  })

  it('no intervention opportunities', () => {
    expect(intel.interventionOpportunities).toHaveLength(0)
  })

  it('completeness is 0, uncertainty is very_high', () => {
    expect(intel.completeness).toBe(0)
    expect(intel.uncertainty).toBe('very_high')
  })

  it('warnings include no_league_intelligences_provided', () => {
    expect(intel.warnings).toContain('no_league_intelligences_provided')
    expect(intel.warnings).toContain('no_manager_intelligences_provided')
    expect(intel.warnings).toContain('no_events_provided')
  })

  it('derivedAt matches injected clock', () => {
    expect(intel.derivedAt).toBe(NOW.toISOString())
  })

  it('provenance reflects empty inputs', () => {
    expect(intel.provenance.leagueIntelligenceCount).toBe(0)
    expect(intel.provenance.managerIntelligenceCount).toBe(0)
    expect(intel.provenance.eventCount).toBe(0)
  })
})

// ── Platform engagement score ─────────────────────────────────────────────────

describe('platform engagement score', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('single league: score equals that league score', () => {
    const intel = derivePlatformBehavioralIntelligence(
      [makeLeagueIntel({ leagueEngagementScore: 72 })], [], [], NOW,
    )
    expect(intel.platformEngagementScore).toBe(72)
  })

  it('multiple leagues: score is average (rounded)', () => {
    // (70 + 50 + 30) / 3 = 50
    const leagues = [
      makeLeagueIntel({ leagueEngagementScore: 70 }),
      makeLeagueIntel({ leagueEngagementScore: 50 }),
      makeLeagueIntel({ leagueEngagementScore: 30 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementScore).toBe(50)
  })

  it('rounds correctly: (80 + 71) / 2 = 75.5 → 76', () => {
    const leagues = [
      makeLeagueIntel({ leagueEngagementScore: 80 }),
      makeLeagueIntel({ leagueEngagementScore: 71 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementScore).toBe(76)
  })

  it('all-zero league scores → score 0 → inactive tier', () => {
    const leagues = [
      makeLeagueIntel({ leagueEngagementScore: 0 }),
      makeLeagueIntel({ leagueEngagementScore: 0 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementScore).toBe(0)
    expect(intel.platformEngagementTier).toBe('inactive')
  })
})

// ── Platform engagement tier ──────────────────────────────────────────────────

describe('platform engagement tier', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('score ≥ 70 AND healthyPercent ≥ 70 → thriving', () => {
    // All elite leagues → healthyPercent = 100
    const leagues = Array.from({ length: 4 }, () =>
      makeLeagueIntel({ leagueEngagementScore: 80, leagueEngagementTier: 'elite' }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementScore).toBe(80)
    expect(intel.leagueHealthDistribution.healthyPercent).toBe(100)
    expect(intel.platformEngagementTier).toBe('thriving')
  })

  it('score ≥ 50 AND healthyPercent ≥ 50 → healthy', () => {
    // 2 active (score 60) + 1 moderate (score 35) → avg 52; healthyPercent = 67%
    const leagues = [
      makeLeagueIntel({ leagueEngagementScore: 60, leagueEngagementTier: 'active' }),
      makeLeagueIntel({ leagueEngagementScore: 60, leagueEngagementTier: 'active' }),
      makeLeagueIntel({ leagueEngagementScore: 35, leagueEngagementTier: 'moderate' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementScore).toBeGreaterThanOrEqual(50)
    expect(intel.leagueHealthDistribution.healthyPercent).toBeGreaterThanOrEqual(50)
    expect(intel.platformEngagementTier).toBe('healthy')
  })

  it('score ≥ 30 AND healthyPercent ≥ 30 → moderate', () => {
    // 1 active (75) + 2 passive (10) → avg 32; healthyPercent = 33%
    const leagues = [
      makeLeagueIntel({ leagueEngagementScore: 75, leagueEngagementTier: 'active' }),
      makeLeagueIntel({ leagueEngagementScore: 10, leagueEngagementTier: 'passive' }),
      makeLeagueIntel({ leagueEngagementScore: 10, leagueEngagementTier: 'passive' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementScore).toBeGreaterThanOrEqual(30)
    expect(intel.leagueHealthDistribution.healthyPercent).toBeGreaterThanOrEqual(30)
    expect(intel.platformEngagementTier).toBe('moderate')
  })

  it('score > 0 but thresholds not met → struggling', () => {
    // All passive (score 15) → healthyPercent = 0, score = 15
    const leagues = Array.from({ length: 4 }, () =>
      makeLeagueIntel({ leagueEngagementScore: 15, leagueEngagementTier: 'passive' }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.platformEngagementTier).toBe('struggling')
  })

  it('no leagues → inactive', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.platformEngagementTier).toBe('inactive')
  })
})

// ── League health distribution ────────────────────────────────────────────────

describe('league health distribution', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('counts each tier correctly', () => {
    const leagues = [
      makeLeagueIntel({ leagueEngagementTier: 'elite' }),
      makeLeagueIntel({ leagueEngagementTier: 'elite' }),
      makeLeagueIntel({ leagueEngagementTier: 'active' }),
      makeLeagueIntel({ leagueEngagementTier: 'moderate' }),
      makeLeagueIntel({ leagueEngagementTier: 'passive' }),
      makeLeagueIntel({ leagueEngagementTier: 'dormant' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    const d = intel.leagueHealthDistribution
    expect(d.elite).toBe(2)
    expect(d.active).toBe(1)
    expect(d.moderate).toBe(1)
    expect(d.passive).toBe(1)
    expect(d.dormant).toBe(1)
    expect(d.totalLeagues).toBe(6)
  })

  it('healthyPercent = (elite + active) / total × 100 → rounded', () => {
    // 3 elite + 1 active = 4 healthy out of 6 → 67%
    const leagues = [
      makeLeagueIntel({ leagueEngagementTier: 'elite' }),
      makeLeagueIntel({ leagueEngagementTier: 'elite' }),
      makeLeagueIntel({ leagueEngagementTier: 'elite' }),
      makeLeagueIntel({ leagueEngagementTier: 'active' }),
      makeLeagueIntel({ leagueEngagementTier: 'passive' }),
      makeLeagueIntel({ leagueEngagementTier: 'dormant' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.leagueHealthDistribution.healthyPercent).toBe(67)
  })

  it('atRiskPercent = (passive + dormant) / total × 100', () => {
    // 2 passive + 2 dormant = 4 at-risk out of 8 → 50%
    const leagues = [
      ...Array.from({ length: 4 }, () => makeLeagueIntel({ leagueEngagementTier: 'active' })),
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ leagueEngagementTier: 'passive' })),
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ leagueEngagementTier: 'dormant' })),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.leagueHealthDistribution.atRiskPercent).toBe(50)
  })

  it('empty → all zero', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    const d = intel.leagueHealthDistribution
    expect(d.elite + d.active + d.moderate + d.passive + d.dormant).toBe(0)
    expect(d.healthyPercent).toBe(0)
    expect(d.atRiskPercent).toBe(0)
  })
})

// ── Commissioner quality distribution ─────────────────────────────────────────

describe('commissioner quality distribution', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('counts each workload level correctly', () => {
    const leagues = [
      makeLeagueIntel({ commissionerWorkload: 'light' }),
      makeLeagueIntel({ commissionerWorkload: 'light' }),
      makeLeagueIntel({ commissionerWorkload: 'moderate' }),
      makeLeagueIntel({ commissionerWorkload: 'heavy' }),
      makeLeagueIntel({ commissionerWorkload: 'critical' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    const d = intel.commissionerQualityDistribution
    expect(d.light).toBe(2)
    expect(d.moderate).toBe(1)
    expect(d.heavy).toBe(1)
    expect(d.critical).toBe(1)
    expect(d.totalLeagues).toBe(5)
  })

  it('managedPercent = (light + moderate) / total × 100', () => {
    // 3 light + 2 moderate = 5 managed out of 8 → 63%
    const leagues = [
      ...Array.from({ length: 3 }, () => makeLeagueIntel({ commissionerWorkload: 'light' })),
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ commissionerWorkload: 'moderate' })),
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ commissionerWorkload: 'heavy' })),
      makeLeagueIntel({ commissionerWorkload: 'critical' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.commissionerQualityDistribution.managedPercent).toBe(63)
  })

  it('overloadedPercent > 30 → commissioner_overload_detected warning', () => {
    // 4 heavy out of 6 = 67%
    const leagues = [
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ commissionerWorkload: 'light' })),
      ...Array.from({ length: 4 }, () => makeLeagueIntel({ commissionerWorkload: 'heavy' })),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.commissionerQualityDistribution.overloadedPercent).toBeGreaterThan(30)
    expect(intel.warnings).toContain('commissioner_overload_detected')
  })
})

// ── Retention distribution ────────────────────────────────────────────────────

describe('retention distribution — manager-level', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('counts each risk level correctly', () => {
    const managers = [
      makeManagerIntel({ retentionRisk: 'critical' }),
      makeManagerIntel({ retentionRisk: 'critical' }),
      makeManagerIntel({ retentionRisk: 'high' }),
      makeManagerIntel({ retentionRisk: 'medium' }),
      makeManagerIntel({ retentionRisk: 'low' }),
      makeManagerIntel({ retentionRisk: 'low' }),
    ]
    const intel = derivePlatformBehavioralIntelligence([], managers, [], NOW)
    const d = intel.retentionDistribution
    expect(d.managersByCriticalRisk).toBe(2)
    expect(d.managersByHighRisk).toBe(1)
    expect(d.managersByMediumRisk).toBe(1)
    expect(d.managersByLowRisk).toBe(2)
    expect(d.totalManagers).toBe(6)
  })

  it('managerCriticalRiskPercent computed correctly', () => {
    // 3 critical out of 12 = 25%
    const managers = [
      ...Array.from({ length: 3 }, () => makeManagerIntel({ retentionRisk: 'critical' })),
      ...Array.from({ length: 9 }, () => makeManagerIntel({ retentionRisk: 'low' })),
    ]
    const intel = derivePlatformBehavioralIntelligence([], managers, [], NOW)
    expect(intel.retentionDistribution.managerCriticalRiskPercent).toBe(25)
  })

  it('managerCriticalRiskPercent > 20 → high_platform_retention_risk warning', () => {
    // 3 of 12 = 25%
    const managers = [
      ...Array.from({ length: 3 }, () => makeManagerIntel({ retentionRisk: 'critical' })),
      ...Array.from({ length: 9 }, () => makeManagerIntel({ retentionRisk: 'low' })),
    ]
    const intel = derivePlatformBehavioralIntelligence([], managers, [], NOW)
    expect(intel.warnings).toContain('high_platform_retention_risk')
  })

  it('managerAtRiskPercent = (critical + high) / total × 100', () => {
    // 2 critical + 3 high = 5 at-risk out of 10 = 50%
    const managers = [
      ...Array.from({ length: 2 }, () => makeManagerIntel({ retentionRisk: 'critical' })),
      ...Array.from({ length: 3 }, () => makeManagerIntel({ retentionRisk: 'high' })),
      ...Array.from({ length: 5 }, () => makeManagerIntel({ retentionRisk: 'low' })),
    ]
    const intel = derivePlatformBehavioralIntelligence([], managers, [], NOW)
    expect(intel.retentionDistribution.managerAtRiskPercent).toBe(50)
  })
})

describe('retention distribution — league-level', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('counts league risk levels correctly', () => {
    const leagues = [
      makeLeagueIntel({ retentionRisk: 'critical' }),
      makeLeagueIntel({ retentionRisk: 'high' }),
      makeLeagueIntel({ retentionRisk: 'medium' }),
      makeLeagueIntel({ retentionRisk: 'low' }),
      makeLeagueIntel({ retentionRisk: 'low' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    const d = intel.retentionDistribution
    expect(d.leaguesByCriticalRisk).toBe(1)
    expect(d.leaguesByHighRisk).toBe(1)
    expect(d.leaguesByMediumRisk).toBe(1)
    expect(d.leaguesByLowRisk).toBe(2)
    expect(d.totalLeagues).toBe(5)
  })

  it('leagueAtRiskPercent = (critical + high) / total × 100', () => {
    // 2 critical + 2 high = 4 at-risk out of 8 = 50%
    const leagues = [
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ retentionRisk: 'critical' })),
      ...Array.from({ length: 2 }, () => makeLeagueIntel({ retentionRisk: 'high' })),
      ...Array.from({ length: 4 }, () => makeLeagueIntel({ retentionRisk: 'low' })),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.retentionDistribution.leagueAtRiskPercent).toBe(50)
  })
})

// ── Ecosystem dimensions ──────────────────────────────────────────────────────

describe('trade ecosystem', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('all leagues have no trade → tier none', () => {
    const leagues = [
      makeLeagueIntel({ tradeActivity: { tier: 'none', count: 0, perManagerRate: 0, warnings: [] } }),
      makeLeagueIntel({ tradeActivity: { tier: 'none', count: 0, perManagerRate: 0, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.tradeEcosystem.tier).toBe('none')
    expect(intel.tradeEcosystem.activeLeagues).toBe(0)
    expect(intel.tradeEcosystem.totalEvents).toBe(0)
  })

  it('1 of 2 leagues has trades → tier low (50% < 50 threshold)', () => {
    const leagues = [
      makeLeagueIntel({ tradeActivity: { tier: 'high', count: 10, perManagerRate: 1, warnings: [] } }),
      makeLeagueIntel({ tradeActivity: { tier: 'none', count: 0,  perManagerRate: 0, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    // activeLeaguePercent = 50 → moderate (≥ 50 threshold)
    expect(intel.tradeEcosystem.tier).toBe('moderate')
    expect(intel.tradeEcosystem.activeLeagues).toBe(1)
    expect(intel.tradeEcosystem.activeLeaguePercent).toBe(50)
  })

  it('≥ 80% of leagues have trades → tier high', () => {
    const leagues = [
      ...Array.from({ length: 4 }, () =>
        makeLeagueIntel({ tradeActivity: { tier: 'moderate', count: 5, perManagerRate: 0.5, warnings: [] } }),
      ),
      makeLeagueIntel({ tradeActivity: { tier: 'none', count: 0, perManagerRate: 0, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    // 4 of 5 active = 80%
    expect(intel.tradeEcosystem.tier).toBe('high')
    expect(intel.tradeEcosystem.activeLeaguePercent).toBe(80)
  })

  it('perLeagueRate = totalEvents / totalLeagues (rounded 2dp)', () => {
    // 10 trades + 5 trades = 15 / 4 leagues = 3.75
    const leagues = [
      makeLeagueIntel({ tradeActivity: { tier: 'high', count: 10, perManagerRate: 1, warnings: [] } }),
      makeLeagueIntel({ tradeActivity: { tier: 'low',  count: 5,  perManagerRate: 0.5, warnings: [] } }),
      makeLeagueIntel({ tradeActivity: { tier: 'none', count: 0,  perManagerRate: 0, warnings: [] } }),
      makeLeagueIntel({ tradeActivity: { tier: 'none', count: 0,  perManagerRate: 0, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.tradeEcosystem.totalEvents).toBe(15)
    expect(intel.tradeEcosystem.perLeagueRate).toBe(3.75)
  })

  it('perManagerRate = totalEvents / totalManagers', () => {
    // 20 trades / 4 managers
    const managers = Array.from({ length: 4 }, () => makeManagerIntel())
    const leagues = [
      makeLeagueIntel({ tradeActivity: { tier: 'high', count: 20, perManagerRate: 5, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, managers, [], NOW)
    expect(intel.tradeEcosystem.perManagerRate).toBe(5)
  })
})

describe('waiver ecosystem', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('no waivers across all leagues → tier none', () => {
    const leagues = Array.from({ length: 3 }, () =>
      makeLeagueIntel({ waiverActivity: { tier: 'none', count: 0, perManagerRate: 0, warnings: [] } }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.waiverEcosystem.tier).toBe('none')
  })

  it('active leagues drive waiver tier', () => {
    const leagues = [
      ...Array.from({ length: 5 }, () =>
        makeLeagueIntel({ waiverActivity: { tier: 'high', count: 30, perManagerRate: 3, warnings: [] } }),
      ),
      makeLeagueIntel({ waiverActivity: { tier: 'none', count: 0, perManagerRate: 0, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    // 5 of 6 active = 83% → high
    expect(intel.waiverEcosystem.tier).toBe('high')
  })
})

describe('draft participation', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('no draft picks across all leagues → tier none', () => {
    const leagues = Array.from({ length: 3 }, () =>
      makeLeagueIntel({ draftActivity: { tier: 'none', count: 0, perManagerRate: 0, warnings: [] } }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.draftParticipation.tier).toBe('none')
    expect(intel.draftParticipation.activeLeagues).toBe(0)
  })

  it('draft picks counted correctly from draftActivity (not draftParticipation)', () => {
    // Verifies we correctly access l.draftActivity (not a renamed field)
    const leagues = [
      makeLeagueIntel({ draftActivity: { tier: 'high', count: 100, perManagerRate: 10, warnings: [] } }),
      makeLeagueIntel({ draftActivity: { tier: 'high', count: 100, perManagerRate: 10, warnings: [] } }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.draftParticipation.totalEvents).toBe(200)
    expect(intel.draftParticipation.activeLeagues).toBe(2)
    expect(intel.draftParticipation.tier).toBe('high')
  })
})

// ── Activity heatmap ──────────────────────────────────────────────────────────

describe('activity heatmap', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('no events → empty heatmap, no warnings (no UTC warning)', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.activityHeatmap.cells).toHaveLength(0)
    expect(intel.activityHeatmap.peakCellKey).toBeNull()
    expect(intel.activityHeatmap.totalEventsAnalyzed).toBe(0)
    expect(intel.activityHeatmap.warnings).toHaveLength(0)
  })

  it('single event → one cell in heatmap', () => {
    // 2026-06-28 is a Sunday (day 0), at 14:00 UTC → cell "0-14"
    const events = [makeEvent({}, '2026-06-28T14:00:00.000Z')]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.activityHeatmap.cells).toHaveLength(1)
    expect(intel.activityHeatmap.cells[0]).toMatchObject({ dayOfWeek: 0, hour: 14, count: 1 })
    expect(intel.activityHeatmap.peakCellKey).toBe('0-14')
    expect(intel.activityHeatmap.peakDayOfWeek).toBe(0)
    expect(intel.activityHeatmap.peakHour).toBe(14)
    expect(intel.activityHeatmap.peakCount).toBe(1)
  })

  it('multiple events in same slot → cell count accumulates', () => {
    const events = [
      makeEvent({}, '2026-06-29T10:00:00.000Z'),  // Monday=1, 10:00
      makeEvent({}, '2026-06-29T10:30:00.000Z'),  // Monday=1, 10:00 (same bucket)
      makeEvent({}, '2026-06-29T10:59:00.000Z'),  // Monday=1, 10:00 (same bucket)
    ]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    const cell = intel.activityHeatmap.cells.find((c) => c.dayOfWeek === 1 && c.hour === 10)
    expect(cell).toBeDefined()
    expect(cell!.count).toBe(3)
  })

  it('multiple events in different slots → peak identified correctly', () => {
    // Tuesday 19:00 appears 3 times; Sunday 14:00 appears once → peak = Tuesday 19:00
    // 2026-06-30 is Tuesday
    const events = [
      makeEvent({}, '2026-06-30T19:00:00.000Z'),
      makeEvent({}, '2026-06-30T19:15:00.000Z'),
      makeEvent({}, '2026-06-30T19:45:00.000Z'),
      makeEvent({}, '2026-06-28T14:00:00.000Z'),
    ]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.activityHeatmap.totalEventsAnalyzed).toBe(4)
    expect(intel.activityHeatmap.peakCount).toBe(3)
    // 2026-06-30 is a Tuesday = UTC day 2
    expect(intel.activityHeatmap.peakDayOfWeek).toBe(2)
    expect(intel.activityHeatmap.peakHour).toBe(19)
    expect(intel.activityHeatmap.peakCellKey).toBe('2-19')
  })

  it('cells are sorted by day-of-week then hour', () => {
    const events = [
      makeEvent({}, '2026-06-30T20:00:00.000Z'),  // Tue=2 20:00
      makeEvent({}, '2026-06-28T08:00:00.000Z'),  // Sun=0 08:00
      makeEvent({}, '2026-06-29T12:00:00.000Z'),  // Mon=1 12:00
    ]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    const days = intel.activityHeatmap.cells.map((c) => c.dayOfWeek)
    expect(days).toEqual([...days].sort((a, b) => a - b))
  })

  it('events → UTC warning present', () => {
    const events = [makeEvent({}, '2026-06-28T14:00:00.000Z')]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.activityHeatmap.warnings).toContain('activity_heatmap_uses_utc')
  })
})

// ── Engagement trends ─────────────────────────────────────────────────────────

describe('engagement trends', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('no events → insufficient_data momentum, insufficient confidence', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.engagementTrends.momentumSignal).toBe('insufficient_data')
    expect(intel.engagementTrends.trendConfidence).toBe('insufficient')
    expect(intel.engagementTrends.recentActivityRatio).toBeNull()
    expect(intel.engagementTrends.sevenDayEventCount).toBe(0)
    expect(intel.engagementTrends.thirtyDayEventCount).toBe(0)
  })

  it('all events older than 7d → dormant momentum', () => {
    // Events from 20 days ago
    const ago20 = new Date(NOW.getTime() - 20 * 86_400_000).toISOString()
    const events = [makeEvent({}, ago20), makeEvent({}, ago20)]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.engagementTrends.sevenDayEventCount).toBe(0)
    expect(intel.engagementTrends.thirtyDayEventCount).toBe(2)
    expect(intel.engagementTrends.recentActivityRatio).toBe(0)
    expect(intel.engagementTrends.momentumSignal).toBe('dormant')
  })

  it('all events from last 7d → accelerating momentum (ratio = 1.0 ≥ 0.5)', () => {
    const ago1 = new Date(NOW.getTime() - 1 * 86_400_000).toISOString()
    const events = Array.from({ length: 5 }, () => makeEvent({}, ago1))
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.engagementTrends.sevenDayEventCount).toBe(5)
    expect(intel.engagementTrends.recentActivityRatio).toBe(1)
    expect(intel.engagementTrends.momentumSignal).toBe('accelerating')
  })

  it('20% of events from last 7d → steady momentum (ratio = 0.2)', () => {
    const ago1  = new Date(NOW.getTime() -  1 * 86_400_000).toISOString()
    const ago20 = new Date(NOW.getTime() - 20 * 86_400_000).toISOString()
    const events = [
      makeEvent({}, ago1),
      ...Array.from({ length: 4 }, () => makeEvent({}, ago20)),
    ]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.engagementTrends.sevenDayEventCount).toBe(1)
    expect(intel.engagementTrends.recentActivityRatio).toBe(0.2)
    expect(intel.engagementTrends.momentumSignal).toBe('steady')
  })

  it('10% of events from last 7d → decelerating (ratio = 0.1)', () => {
    const ago1  = new Date(NOW.getTime() -  1 * 86_400_000).toISOString()
    const ago20 = new Date(NOW.getTime() - 20 * 86_400_000).toISOString()
    const events = [
      makeEvent({}, ago1),
      ...Array.from({ length: 9 }, () => makeEvent({}, ago20)),
    ]
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(intel.engagementTrends.momentumSignal).toBe('decelerating')
  })

  it('trendConfidence: low when < 10 events OR < 3 leagues', () => {
    const events = Array.from({ length: 5 }, () =>
      makeEvent({}, new Date(NOW.getTime() - 86_400_000).toISOString()),
    )
    const intel = derivePlatformBehavioralIntelligence([], [], events, NOW)
    // 5 events, 0 leagues → low
    expect(intel.engagementTrends.trendConfidence).toBe('low')
  })

  it('trendConfidence: high when ≥ 50 events AND ≥ 5 leagues', () => {
    const leagues = Array.from({ length: 5 }, () => makeLeagueIntel())
    const ago1    = new Date(NOW.getTime() - 86_400_000).toISOString()
    const events  = Array.from({ length: 50 }, () => makeEvent({}, ago1))
    const intel   = derivePlatformBehavioralIntelligence(leagues, [], events, NOW)
    expect(intel.engagementTrends.trendConfidence).toBe('high')
  })

  it('recentlyActiveManagerPercent uses unique manager IDs from events', () => {
    const ago1 = new Date(NOW.getTime() - 86_400_000).toISOString()
    const managers = Array.from({ length: 10 }, (_, i) => makeManagerIntel({ managerId: `m${i}` }))
    // Only managers m0, m1, m2 have recent events
    const events = [
      makeEvent({ managerId: 'm0' }, ago1),
      makeEvent({ managerId: 'm1' }, ago1),
      makeEvent({ managerId: 'm2' }, ago1),
      makeEvent({ managerId: 'm2' }, ago1),  // duplicate m2 — should not double-count
    ]
    const intel = derivePlatformBehavioralIntelligence([], managers, events, NOW)
    // 3 unique managers out of 10 = 30%
    expect(intel.engagementTrends.recentlyActiveManagerPercent).toBe(30)
  })
})

// ── Intervention opportunities ─────────────────────────────────────────────────

describe('intervention opportunities', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('no leagues or managers → no opportunities', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.interventionOpportunities).toHaveLength(0)
  })

  it('league with critical retention AND critical workload → single critical opportunity with combined signal', () => {
    const league = makeLeagueIntel({
      leagueId:              'league-danger',
      retentionRisk:         'critical',
      commissionerWorkload:  'critical',
    })
    const intel = derivePlatformBehavioralIntelligence([league], [], [], NOW)
    const opp = intel.interventionOpportunities.find((o) => o.leagueId === 'league-danger')
    expect(opp).toBeDefined()
    expect(opp!.priority).toBe('critical')
    expect(opp!.signal).toBe('critical_retention_and_workload')
    // Combined leagues appear only once (deduped by leagueId)
    const dangerOpps = intel.interventionOpportunities.filter((o) => o.leagueId === 'league-danger')
    expect(dangerOpps).toHaveLength(1)
  })

  it('league with critical retention only → critical opportunity', () => {
    const league = makeLeagueIntel({ retentionRisk: 'critical', commissionerWorkload: 'light' })
    const intel = derivePlatformBehavioralIntelligence([league], [], [], NOW)
    const opp = intel.interventionOpportunities[0]
    expect(opp.priority).toBe('critical')
    expect(opp.signal).toBe('critical_retention')
  })

  it('manager with critical retention → manager-scoped critical opportunity', () => {
    const manager = makeCriticalManagerIntel('m-crit', 'league-1')
    const intel = derivePlatformBehavioralIntelligence([], [manager], [], NOW)
    const opp = intel.interventionOpportunities.find((o) => o.managerId === 'm-crit')
    expect(opp).toBeDefined()
    expect(opp!.scope).toBe('manager')
    expect(opp!.priority).toBe('critical')
    expect(opp!.leagueId).toBe('league-1')
  })

  it('league with critical workload only (no critical retention) → critical opportunity', () => {
    const league = makeLeagueIntel({ retentionRisk: 'low', commissionerWorkload: 'critical' })
    const intel = derivePlatformBehavioralIntelligence([league], [], [], NOW)
    const opp = intel.interventionOpportunities[0]
    expect(opp.priority).toBe('critical')
    expect(opp.signal).toBe('critical_workload')
  })

  it('league with high retention → high priority opportunity', () => {
    const league = makeLeagueIntel({ retentionRisk: 'high', commissionerWorkload: 'light' })
    const intel = derivePlatformBehavioralIntelligence([league], [], [], NOW)
    const opp = intel.interventionOpportunities[0]
    expect(opp.priority).toBe('high')
    expect(opp.signal).toBe('high_retention')
  })

  it('league with heavy workload → high priority opportunity', () => {
    const league = makeLeagueIntel({ retentionRisk: 'low', commissionerWorkload: 'heavy' })
    const intel = derivePlatformBehavioralIntelligence([league], [], [], NOW)
    const opp = intel.interventionOpportunities[0]
    expect(opp.priority).toBe('high')
    expect(opp.signal).toBe('heavy_workload')
  })

  it('priority order: critical before high', () => {
    const leagues = [
      makeLeagueIntel({ retentionRisk: 'high',     commissionerWorkload: 'light' }),
      makeLeagueIntel({ retentionRisk: 'critical',  commissionerWorkload: 'light' }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    const firstCritical = intel.interventionOpportunities.findIndex((o) => o.priority === 'critical')
    const firstHigh     = intel.interventionOpportunities.findIndex((o) => o.priority === 'high')
    expect(firstCritical).toBeLessThan(firstHigh)
  })

  it('league appears only once even if it qualifies for multiple passes', () => {
    const league = makeLeagueIntel({
      leagueId:             'dedup-test',
      retentionRisk:        'critical',
      commissionerWorkload: 'critical',
    })
    const intel = derivePlatformBehavioralIntelligence([league], [], [], NOW)
    const count = intel.interventionOpportunities.filter((o) => o.leagueId === 'dedup-test').length
    expect(count).toBe(1)
  })

  it('more than 5 critical managers → only first 5 appear (cap)', () => {
    const managers = Array.from({ length: 8 }, (_, i) =>
      makeCriticalManagerIntel(`m${i}`, 'league-1'),
    )
    const intel = derivePlatformBehavioralIntelligence([], managers, [], NOW)
    const managerOpps = intel.interventionOpportunities.filter((o) => o.scope === 'manager')
    expect(managerOpps.length).toBeLessThanOrEqual(5)
  })

  it('overall cap of 20 interventions enforced', () => {
    const leagues = Array.from({ length: 25 }, () =>
      makeLeagueIntel({ retentionRisk: 'critical', commissionerWorkload: 'critical' }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.interventionOpportunities.length).toBeLessThanOrEqual(20)
  })

  it('recommendation messages contain no internal terminology', () => {
    const league   = makeLeagueIntel({ retentionRisk: 'critical', commissionerWorkload: 'critical' })
    const manager  = makeCriticalManagerIntel('m1', league.leagueId)
    const intel    = derivePlatformBehavioralIntelligence([league], [manager], [], NOW)
    for (const opp of intel.interventionOpportunities) {
      expect(opp.message).not.toContain('Decision OS')
      expect(opp.message).not.toContain('Canonical World')
      expect(opp.message).not.toContain('BehavioralEvent')
      expect(opp.message).not.toContain('managerId')
    }
  })
})

// ── Data quality ──────────────────────────────────────────────────────────────

describe('data quality — completeness and uncertainty', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('completeness is average of league completeness values', () => {
    const leagues = [
      makeLeagueIntel({ completeness: 80 }),
      makeLeagueIntel({ completeness: 60 }),
      makeLeagueIntel({ completeness: 40 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    // (80 + 60 + 40) / 3 = 60
    expect(intel.completeness).toBe(60)
  })

  it('completeness rounds correctly: (80 + 71) / 2 = 75.5 → 76', () => {
    const leagues = [
      makeLeagueIntel({ completeness: 80 }),
      makeLeagueIntel({ completeness: 71 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.completeness).toBe(76)
  })

  it('uncertainty: very_high when no leagues', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.uncertainty).toBe('very_high')
  })

  it('uncertainty: very_high when completeness < 20', () => {
    const leagues = Array.from({ length: 10 }, () =>
      makeLeagueIntel({ completeness: 15 }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.uncertainty).toBe('very_high')
  })

  it('uncertainty: high when completeness < 40', () => {
    const leagues = Array.from({ length: 4 }, () =>
      makeLeagueIntel({ completeness: 30 }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.uncertainty).toBe('high')
  })

  it('uncertainty: medium when completeness ≥ 40 but < 70', () => {
    const leagues = Array.from({ length: 5 }, () =>
      makeLeagueIntel({ completeness: 55 }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.uncertainty).toBe('medium')
  })

  it('uncertainty: low when completeness ≥ 70 AND ≥ 5 leagues', () => {
    const leagues = Array.from({ length: 5 }, () =>
      makeLeagueIntel({ completeness: 75 }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.uncertainty).toBe('low')
  })

  it('single_league_sample warning when exactly 1 league', () => {
    const intel = derivePlatformBehavioralIntelligence([makeLeagueIntel()], [], [], NOW)
    expect(intel.warnings).toContain('single_league_sample')
  })

  it('low_platform_completeness warning when 0 < completeness < 50', () => {
    const leagues = Array.from({ length: 3 }, () =>
      makeLeagueIntel({ completeness: 30 }),
    )
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.warnings).toContain('low_platform_completeness')
  })

  it('no low_platform_completeness warning when completeness = 0 (no leagues)', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.warnings).not.toContain('low_platform_completeness')
  })
})

// ── Provenance ────────────────────────────────────────────────────────────────

describe('provenance', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('input counts match array lengths', () => {
    const leagues  = [makeLeagueIntel(), makeLeagueIntel()]
    const managers = [makeManagerIntel(), makeManagerIntel(), makeManagerIntel()]
    const events   = [makeEvent(), makeEvent()]
    const intel    = derivePlatformBehavioralIntelligence(leagues, managers, events, NOW)
    expect(intel.provenance.leagueIntelligenceCount).toBe(2)
    expect(intel.provenance.managerIntelligenceCount).toBe(3)
    expect(intel.provenance.eventCount).toBe(2)
  })

  it('derivedAt matches injected clock', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.provenance.derivedAt).toBe(NOW.toISOString())
    expect(intel.derivedAt).toBe(NOW.toISOString())
  })

  it('avgLeagueLookbackDays: consistent → that value', () => {
    const leagues = [
      makeLeagueIntel({ lookbackDays: 90 }),
      makeLeagueIntel({ lookbackDays: 90 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.provenance.avgLeagueLookbackDays).toBe(90)
  })

  it('avgLeagueLookbackDays: mixed → averaged', () => {
    const leagues = [
      makeLeagueIntel({ lookbackDays: 30 }),
      makeLeagueIntel({ lookbackDays: 90 }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    // (30 + 90) / 2 = 60
    expect(intel.provenance.avgLeagueLookbackDays).toBe(60)
  })

  it('avgLeagueLookbackDays: all null → null', () => {
    const leagues = [
      makeLeagueIntel({ lookbackDays: null }),
      makeLeagueIntel({ lookbackDays: null }),
    ]
    const intel = derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(intel.provenance.avgLeagueLookbackDays).toBeNull()
  })

  it('avgLeagueLookbackDays: no leagues → null', () => {
    const intel = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel.provenance.avgLeagueLookbackDays).toBeNull()
  })
})

// ── No mutation invariant ─────────────────────────────────────────────────────

describe('no mutation invariant', () => {
  beforeEach(() => { _leagueSeq = 0; _managerSeq = 0 })

  it('leagueIntelligences array is not mutated', () => {
    const leagues = [makeLeagueIntel({ retentionRisk: 'critical' })]
    const before  = JSON.stringify(leagues)
    derivePlatformBehavioralIntelligence(leagues, [], [], NOW)
    expect(JSON.stringify(leagues)).toBe(before)
  })

  it('managerIntelligences array is not mutated', () => {
    const managers = [makeManagerIntel({ retentionRisk: 'critical' })]
    const before   = JSON.stringify(managers)
    derivePlatformBehavioralIntelligence([], managers, [], NOW)
    expect(JSON.stringify(managers)).toBe(before)
  })

  it('events array is not mutated', () => {
    const events = [makeEvent()]
    const before = JSON.stringify(events)
    derivePlatformBehavioralIntelligence([], [], events, NOW)
    expect(JSON.stringify(events)).toBe(before)
  })

  it('returned warnings array is independent between calls', () => {
    const intel1 = derivePlatformBehavioralIntelligence([], [], [], NOW)
    const intel2 = derivePlatformBehavioralIntelligence([], [], [], NOW)
    expect(intel1.warnings).not.toBe(intel2.warnings)
    expect(intel1.interventionOpportunities).not.toBe(intel2.interventionOpportunities)
  })
})
