/**
 * Phase 5.3 — League Behavioral Intelligence tests.
 *
 * Covers:
 *   - League engagement score and tier (all 5 tiers)
 *   - Manager participation distribution (active/inactive counts and percents)
 *   - Activity tiers (trade / waiver / draft) and per-manager rates
 *   - Inactive league (all managers inactive) → dormant / critical
 *   - Sparse data (few active managers) → low score / heavy workload
 *   - High-engagement league (all active, elite) → elite tier / light workload
 *   - League retention risk (all 4 levels)
 *   - Commissioner workload (all 4 levels)
 *   - Commissioner recommendations (triggered correctly, priority correct)
 *   - Health narrative inputs (deterministic strings, no AI terminology)
 *   - Data quality (completeness inherited, warnings propagated + new)
 *   - No mutation invariant (facts and managerIntelligences never modified)
 *   - derivedAt reflects injected clock
 */

import { describe, expect, it } from 'vitest'
import type { LeagueBehavioralFacts } from '../../lib/decision-os/behavioral/facts'
import type { ManagerBehavioralIntelligence } from '../../lib/decision-os/behavioral/manager-intelligence'
import {
  deriveLeagueBehavioralIntelligence,
} from '../../lib/decision-os/behavioral/league-intelligence'

// ── Fixture helpers ───────────────────────────────────────────────────────────

const LEAGUE_ID = 'league-xyz'
const NOW       = new Date('2026-06-30T12:00:00.000Z')

function makeLeagueFacts(
  overrides: Partial<LeagueBehavioralFacts> = {},
): LeagueBehavioralFacts {
  return {
    leagueId:                    LEAGUE_ID,
    totalTradeCount:             0,
    totalWaiverClaimCount:       0,
    totalWaiverSuccessCount:     0,
    totalCommissionerActionCount: 0,
    totalRulesChangeCount:       0,
    activeManagerIds:            [],
    lastActivity:                null,
    draftCount:                  0,
    totalDraftPickCount:         0,
    completeness:                0,
    eventCount:                  0,
    managerCount:                0,
    lookbackDays:                null,
    warnings:                    [],
    ...overrides,
  }
}

function makeManagerIntel(
  overrides: Partial<ManagerBehavioralIntelligence> = {},
): ManagerBehavioralIntelligence {
  return {
    managerId:             'manager-1',
    leagueId:              LEAGUE_ID,
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
    derivedAt:              '2026-06-30T12:00:00.000Z',
    ...overrides,
  }
}

function makeInactiveManagerIntel(id: string = 'manager-inactive'): ManagerBehavioralIntelligence {
  return makeManagerIntel({
    managerId:             id,
    participationTier:     'inactive',
    retentionRisk:         'critical',
    retentionRiskReasons:  ['Manager has never taken any recorded action in the league'],
    lineupEngagement:      { score: 0, level: 'none', eventCount: 0, lastEventAt: null, warnings: [] },
    waiverEngagement:      { score: 0, level: 'none', eventCount: 0, lastEventAt: null, warnings: [] },
    tradeEngagement:       { score: 0, level: 'none', eventCount: 0, lastEventAt: null, warnings: [] },
    draftEngagement:       { score: 0, level: 'none', eventCount: 0, lastEventAt: null, warnings: [] },
    overallEngagementScore: 0,
    daysSinceLastActivity:  null,
    isInactive:             true,
    inactivityWarning:      'No recorded manager activity — they may have never engaged with the league',
    nudges:                 [{ nudgeId: 'nudge_never_engaged', priority: 'critical', category: 'retention', signal: 'no_events', message: 'Never engaged.', supportingEventIds: [] }],
    completeness:           0,
    derivedFrom:            0,
    warnings:               ['no_draft_pick_events'],
  })
}

function makeEliteManagerIntel(id: string = 'manager-elite'): ManagerBehavioralIntelligence {
  return makeManagerIntel({
    managerId:             id,
    participationTier:     'elite',
    retentionRisk:         'low',
    retentionRiskReasons:  [],
    lineupEngagement:      { score: 95, level: 'high', eventCount: 12, lastEventAt: '2026-06-29T10:00:00Z', warnings: [] },
    waiverEngagement:      { score: 80, level: 'high', eventCount: 8,  lastEventAt: '2026-06-28T09:00:00Z', warnings: [] },
    tradeEngagement:       { score: 85, level: 'high', eventCount: 4,  lastEventAt: '2026-06-27T14:00:00Z', warnings: [] },
    draftEngagement:       { score: 90, level: 'high', eventCount: 14, lastEventAt: '2026-05-01T10:00:00Z', warnings: [] },
    overallEngagementScore: 88,
    daysSinceLastActivity:  1,
    isInactive:             false,
    inactivityWarning:      null,
    nudges:                 [],
    completeness:           90,
    derivedFrom:            38,
    warnings:               [],
  })
}

// ── Empty league (no managers) ────────────────────────────────────────────────

describe('empty league — no manager intelligences', () => {
  const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), [], NOW)

  it('leagueId matches facts', () => {
    expect(intel.leagueId).toBe(LEAGUE_ID)
  })

  it('engagement score is 0', () => {
    expect(intel.leagueEngagementScore).toBe(0)
  })

  it('tier is dormant', () => {
    expect(intel.leagueEngagementTier).toBe('dormant')
  })

  it('participationDistribution is all zeros', () => {
    expect(intel.participationDistribution.totalManagers).toBe(0)
    expect(intel.participationDistribution.activeManagers).toBe(0)
    expect(intel.participationDistribution.inactiveManagers).toBe(0)
    expect(intel.participationDistribution.activePercent).toBe(0)
    expect(intel.participationDistribution.inactivePercent).toBe(0)
  })

  it('inactiveManagerCount is 0', () => {
    expect(intel.inactiveManagerCount).toBe(0)
  })

  it('retentionRisk is critical', () => {
    expect(intel.retentionRisk).toBe('critical')
    expect(intel.retentionRiskReasons.length).toBeGreaterThan(0)
  })

  it('warnings include no_manager_intelligences_provided', () => {
    expect(intel.warnings).toContain('no_manager_intelligences_provided')
  })

  it('healthNarrativeInputs.engagementSummary handles empty case', () => {
    expect(intel.healthNarrativeInputs.engagementSummary).toBe('No manager data available')
  })
})

// ── All-inactive league ───────────────────────────────────────────────────────

describe('all-inactive league', () => {
  const managers = Array.from({ length: 12 }, (_, i) => makeInactiveManagerIntel(`manager-${i}`))
  const facts = makeLeagueFacts({ eventCount: 0, completeness: 0 })
  const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)

  it('engagement score is 0', () => {
    expect(intel.leagueEngagementScore).toBe(0)
  })

  it('tier is dormant', () => {
    expect(intel.leagueEngagementTier).toBe('dormant')
  })

  it('all 12 managers are inactive', () => {
    expect(intel.participationDistribution.inactiveManagers).toBe(12)
    expect(intel.participationDistribution.activeManagers).toBe(0)
    expect(intel.participationDistribution.activePercent).toBe(0)
    expect(intel.participationDistribution.inactivePercent).toBe(100)
    expect(intel.inactiveManagerCount).toBe(12)
  })

  it('retentionRisk is critical', () => {
    expect(intel.retentionRisk).toBe('critical')
  })

  it('commissionerWorkload is critical (> 50% inactive)', () => {
    expect(intel.commissionerWorkload).toBe('critical')
  })

  it('health narrative topConcern mentions all inactive', () => {
    expect(intel.healthNarrativeInputs.topConcern).toContain('No managers have recorded any activity')
  })

  it('standoutSignal is null when no positive signals', () => {
    expect(intel.healthNarrativeInputs.standoutSignal).toBeNull()
  })

  it('all activity dimensions are none', () => {
    expect(intel.tradeActivity.tier).toBe('none')
    expect(intel.waiverActivity.tier).toBe('none')
    expect(intel.draftActivity.tier).toBe('none')
  })
})

// ── Sparse data (2 of 12 active) ─────────────────────────────────────────────

describe('sparse data — few active managers', () => {
  // 2 active managers with moderate engagement (score ~30 each), 10 inactive
  const activeManagers = [
    makeManagerIntel({ managerId: 'a1', overallEngagementScore: 30, isInactive: false }),
    makeManagerIntel({ managerId: 'a2', overallEngagementScore: 30, isInactive: false }),
  ]
  const inactiveManagers = Array.from({ length: 10 }, (_, i) =>
    makeInactiveManagerIntel(`inactive-${i}`),
  )
  const managers = [...activeManagers, ...inactiveManagers]
  const facts = makeLeagueFacts({
    totalTradeCount:       1,
    totalWaiverClaimCount: 2,
    activeManagerIds:      ['a1', 'a2'],
    eventCount:            10,
    completeness:          40,
  })
  const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)

  it('activePercent is 17% (2 of 12)', () => {
    expect(intel.participationDistribution.activePercent).toBe(17)
    expect(intel.participationDistribution.activeManagers).toBe(2)
    expect(intel.participationDistribution.inactiveManagers).toBe(10)
  })

  it('engagement score reflects low participation', () => {
    // activePercent=17, avgManagerEngagement=round((2*30+10*0)/12)=round(5)=5
    // score = round(17*0.5 + 5*0.5) = round(8.5+2.5) = 11
    expect(intel.leagueEngagementScore).toBe(11)
  })

  it('tier is passive', () => {
    expect(intel.leagueEngagementTier).toBe('passive')
  })

  it('retentionRisk is critical (inactivePercent > 50)', () => {
    expect(intel.retentionRisk).toBe('critical')
  })

  it('commissionerWorkload is heavy or critical', () => {
    expect(['heavy', 'critical']).toContain(intel.commissionerWorkload)
  })

  it('inactive_managers_present warning is present', () => {
    expect(intel.warnings).toContain('inactive_managers_present')
  })

  it('trade perManagerRate is computed from totalManagers', () => {
    // 1 trade / 12 managers = 0.08
    expect(intel.tradeActivity.perManagerRate).toBeCloseTo(0.08, 2)
    expect(intel.tradeActivity.tier).toBe('low')
  })

  it('waiver perManagerRate computed correctly', () => {
    // 2 waiver claims / 12 managers = 0.17
    expect(intel.waiverActivity.perManagerRate).toBeCloseTo(0.17, 2)
    expect(intel.waiverActivity.tier).toBe('low')
  })
})

// ── High-engagement league (all elite) ───────────────────────────────────────

describe('high-engagement league — all elite managers', () => {
  const managers = Array.from({ length: 12 }, (_, i) =>
    makeEliteManagerIntel(`elite-${i}`),
  )
  const facts = makeLeagueFacts({
    totalTradeCount:       48,   // 4/manager → high
    totalWaiverClaimCount: 60,   // 5/manager → high
    totalDraftPickCount:   168,  // 14/manager → high
    draftCount:            1,
    activeManagerIds:      managers.map((m) => m.managerId),
    eventCount:            300,
    completeness:          88,
  })
  const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)

  it('all 12 managers are active', () => {
    expect(intel.participationDistribution.activeManagers).toBe(12)
    expect(intel.participationDistribution.inactiveManagers).toBe(0)
    expect(intel.participationDistribution.activePercent).toBe(100)
  })

  it('engagement score is very high', () => {
    // activePercent=100, avgManagerEngagement=88
    // score = round(100*0.5 + 88*0.5) = round(50+44) = 94
    expect(intel.leagueEngagementScore).toBe(94)
  })

  it('tier is elite (score ≥ 70 AND activePercent ≥ 80)', () => {
    expect(intel.leagueEngagementTier).toBe('elite')
  })

  it('retentionRisk is low', () => {
    expect(intel.retentionRisk).toBe('low')
    expect(intel.retentionRiskReasons).toHaveLength(0)
  })

  it('commissionerWorkload is light', () => {
    expect(intel.commissionerWorkload).toBe('light')
    expect(intel.commissionerWorkloadItems).toHaveLength(0)
  })

  it('all activity dimensions are high', () => {
    // 4 trades/manager → high; 5 waivers/manager → high; 14 picks/manager → high
    expect(intel.tradeActivity.tier).toBe('high')
    expect(intel.waiverActivity.tier).toBe('high')
    expect(intel.draftActivity.tier).toBe('high')
  })

  it('activity perManagerRates are correct', () => {
    expect(intel.tradeActivity.perManagerRate).toBe(4)
    expect(intel.waiverActivity.perManagerRate).toBe(5)
    expect(intel.draftActivity.perManagerRate).toBe(14)
  })

  it('standoutSignal is set for elite league', () => {
    expect(intel.healthNarrativeInputs.standoutSignal).toContain('highly engaged')
  })

  it('topConcern is null when no concerns', () => {
    expect(intel.healthNarrativeInputs.topConcern).toBeNull()
  })

  it('only rec_post_weekly_recap fires (no concerns)', () => {
    expect(intel.recommendations).toHaveLength(1)
    expect(intel.recommendations[0].recommendationId).toBe('rec_post_weekly_recap')
  })
})

// ── Activity tier tests ───────────────────────────────────────────────────────

describe('activity tiers — trade', () => {
  const managers = [makeManagerIntel({ isInactive: false }), makeManagerIntel({ managerId: 'm2', isInactive: false })]

  it('0 trades → none', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalTradeCount: 0 }), managers, NOW)
    expect(intel.tradeActivity.tier).toBe('none')
  })

  it('1 trade across 2 managers (0.5/manager) → moderate', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalTradeCount: 1 }), managers, NOW)
    // rate = 0.5 → moderate
    expect(intel.tradeActivity.tier).toBe('moderate')
    expect(intel.tradeActivity.perManagerRate).toBe(0.5)
  })

  it('1 trade across 4 managers (0.25/manager) → low', () => {
    const four = Array.from({ length: 4 }, (_, i) => makeManagerIntel({ managerId: `m${i}`, isInactive: false }))
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalTradeCount: 1 }), four, NOW)
    expect(intel.tradeActivity.tier).toBe('low')
    expect(intel.tradeActivity.perManagerRate).toBe(0.25)
  })

  it('4 trades across 2 managers (2/manager) → high', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalTradeCount: 4 }), managers, NOW)
    expect(intel.tradeActivity.tier).toBe('high')
    expect(intel.tradeActivity.perManagerRate).toBe(2)
  })
})

describe('activity tiers — waiver', () => {
  const managers = Array.from({ length: 4 }, (_, i) => makeManagerIntel({ managerId: `m${i}`, isInactive: false }))

  it('0 claims → none', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.waiverActivity.tier).toBe('none')
  })

  it('2 claims across 4 managers (0.5/manager) → low', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalWaiverClaimCount: 2 }), managers, NOW)
    expect(intel.waiverActivity.tier).toBe('low')
    expect(intel.waiverActivity.perManagerRate).toBe(0.5)
  })

  it('4 claims across 4 managers (1/manager) → moderate', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalWaiverClaimCount: 4 }), managers, NOW)
    expect(intel.waiverActivity.tier).toBe('moderate')
  })

  it('12 claims across 4 managers (3/manager) → high', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalWaiverClaimCount: 12 }), managers, NOW)
    expect(intel.waiverActivity.tier).toBe('high')
    expect(intel.waiverActivity.perManagerRate).toBe(3)
  })
})

describe('activity tiers — draft', () => {
  const managers = Array.from({ length: 4 }, (_, i) => makeManagerIntel({ managerId: `m${i}`, isInactive: false }))

  it('0 picks → none', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.draftActivity.tier).toBe('none')
    expect(intel.draftActivity.warnings).toContain('no_draft_recorded')
  })

  it('2 picks across 4 managers (0.5/manager) → low', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ totalDraftPickCount: 2, draftCount: 1 }), managers, NOW,
    )
    expect(intel.draftActivity.tier).toBe('low')
    expect(intel.draftActivity.perManagerRate).toBe(0.5)
  })

  it('4 picks across 4 managers (1/manager) → moderate', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ totalDraftPickCount: 4, draftCount: 1 }), managers, NOW,
    )
    expect(intel.draftActivity.tier).toBe('moderate')
  })

  it('20 picks across 4 managers (5/manager) → high', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ totalDraftPickCount: 20, draftCount: 1 }), managers, NOW,
    )
    expect(intel.draftActivity.tier).toBe('high')
    expect(intel.draftActivity.perManagerRate).toBe(5)
  })
})

// ── League engagement tiers ───────────────────────────────────────────────────

describe('league engagement tiers', () => {
  it('no managers → dormant', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), [], NOW)
    expect(intel.leagueEngagementTier).toBe('dormant')
  })

  it('all inactive → dormant (score 0)', () => {
    const managers = [makeInactiveManagerIntel('a'), makeInactiveManagerIntel('b')]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.leagueEngagementScore).toBe(0)
    expect(intel.leagueEngagementTier).toBe('dormant')
  })

  it('very low engagement → passive', () => {
    // 1 active (score 20) out of 10 → activePercent=10, avg=2, score=6 → passive
    const managers = [
      makeManagerIntel({ managerId: 'a1', overallEngagementScore: 20, isInactive: false }),
      ...Array.from({ length: 9 }, (_, i) => makeInactiveManagerIntel(`i${i}`)),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.leagueEngagementScore).toBeGreaterThan(0)
    expect(intel.leagueEngagementScore).toBeLessThan(30)
    expect(intel.leagueEngagementTier).toBe('passive')
  })

  it('moderate engagement (score ≥30, activePercent ≥40) → moderate', () => {
    // 5 active (score 30) out of 10 → activePercent=50, avg=15, score=round(25+7.5)=33
    const managers = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, overallEngagementScore: 30, isInactive: false }),
      ),
      ...Array.from({ length: 5 }, (_, i) => makeInactiveManagerIntel(`i${i}`)),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.leagueEngagementScore).toBeGreaterThanOrEqual(30)
    expect(intel.participationDistribution.activePercent).toBeGreaterThanOrEqual(40)
    expect(intel.leagueEngagementTier).toBe('moderate')
  })

  it('active engagement (score ≥50, activePercent ≥60) → active', () => {
    // 8 of 12 active (score 50) → activePercent=67, avg=round(8*50/12)=33, score=round(33.5+16.5)=50
    const managers = [
      ...Array.from({ length: 8 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, overallEngagementScore: 50, isInactive: false }),
      ),
      ...Array.from({ length: 4 }, (_, i) => makeInactiveManagerIntel(`i${i}`)),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.leagueEngagementScore).toBeGreaterThanOrEqual(50)
    expect(intel.participationDistribution.activePercent).toBeGreaterThanOrEqual(60)
    expect(intel.leagueEngagementTier).toBe('active')
  })
})

// ── League retention risk ─────────────────────────────────────────────────────

describe('league retention risk', () => {
  it('no managers → critical', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), [], NOW)
    expect(intel.retentionRisk).toBe('critical')
  })

  it('all managers inactive → critical', () => {
    const managers = Array.from({ length: 4 }, (_, i) => makeInactiveManagerIntel(`m${i}`))
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.retentionRisk).toBe('critical')
  })

  it('inactivePercent > 50 → critical with reason', () => {
    // 8 inactive of 12 = 67%
    const managers = [
      ...Array.from({ length: 4 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
      ),
      ...Array.from({ length: 8 }, (_, i) => makeInactiveManagerIntel(`i${i}`)),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.retentionRisk).toBe('critical')
    expect(intel.retentionRiskReasons.some((r) => r.includes('inactive'))).toBe(true)
  })

  it('criticalRiskManagers > 0 with < 50% inactive → high', () => {
    // 3 critical-risk managers + 9 low-risk active
    const managers = [
      ...Array.from({ length: 9 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        makeManagerIntel({
          managerId:    `c${i}`,
          retentionRisk: 'critical',
          isInactive:    true,
          overallEngagementScore: 0,
        }),
      ),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    // inactivePercent = 3/12 = 25% (≤ 50), criticalRiskManagers = 3 → high
    expect(intel.retentionRisk).toBe('high')
    expect(intel.retentionRiskReasons.some((r) => r.includes('critical retention risk'))).toBe(true)
  })

  it('only highRiskManagers (no critical) → medium', () => {
    const managers = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
      ),
      makeManagerIntel({ managerId: 'h1', retentionRisk: 'high', isInactive: false }),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    // inactivePercent = 0, no critical, 1 high → medium
    expect(intel.retentionRisk).toBe('medium')
    expect(intel.retentionRiskReasons.some((r) => r.includes('need engagement attention'))).toBe(true)
  })

  it('all low-risk active managers → low', () => {
    const managers = Array.from({ length: 12 }, (_, i) =>
      makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
    )
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.retentionRisk).toBe('low')
    expect(intel.retentionRiskReasons).toHaveLength(0)
  })
})

// ── Commissioner workload ─────────────────────────────────────────────────────

describe('commissioner workload', () => {
  it('no workload items → light', () => {
    const managers = Array.from({ length: 12 }, (_, i) =>
      makeEliteManagerIntel(`m${i}`),
    )
    const facts = makeLeagueFacts({ totalTradeCount: 10, totalWaiverClaimCount: 10 })
    const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)
    expect(intel.commissionerWorkload).toBe('light')
    expect(intel.commissionerWorkloadItems).toHaveLength(0)
  })

  it('1 workload item → moderate', () => {
    // Use an inactive manager with LOW retention risk so only the inactive-outreach
    // item fires (makeInactiveManagerIntel sets retentionRisk:'critical' which would
    // add a second workload item and push to 'heavy')
    const inactiveLowRisk = makeManagerIntel({
      managerId:              'i1',
      retentionRisk:          'low',
      isInactive:             true,
      overallEngagementScore: 0,
    })
    const managers = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
      ),
      inactiveLowRisk,
    ]
    const facts = makeLeagueFacts({
      totalTradeCount:       5,
      totalWaiverClaimCount: 5,
    })
    const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)
    // exactly 1 workload item (inactive outreach) → moderate
    expect(intel.commissionerWorkload).toBe('moderate')
    expect(intel.commissionerWorkloadItems).toHaveLength(1)
  })

  it('2+ workload items → heavy', () => {
    // Some inactive + critical risk managers (but < 50% inactive)
    const managers = [
      ...Array.from({ length: 6 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        makeManagerIntel({ managerId: `i${i}`, retentionRisk: 'critical', isInactive: true, overallEngagementScore: 0 }),
      ),
    ]
    const facts = makeLeagueFacts({
      totalTradeCount:       5,
      totalWaiverClaimCount: 5,
    })
    const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)
    // inactive managers + critical risk managers = 2 items
    expect(intel.commissionerWorkloadItems.length).toBeGreaterThanOrEqual(2)
    expect(['heavy', 'critical']).toContain(intel.commissionerWorkload)
  })

  it('inactivePercent > 50 → critical workload', () => {
    const managers = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
      ),
      ...Array.from({ length: 9 }, (_, i) => makeInactiveManagerIntel(`i${i}`)),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    // 9 inactive of 12 = 75% > 50%
    expect(intel.commissionerWorkload).toBe('critical')
  })
})

// ── Commissioner recommendations ──────────────────────────────────────────────

describe('commissioner recommendations', () => {
  it('critical risk managers → rec_follow_up_critical_risk fires first (critical priority)', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', retentionRisk: 'low', isInactive: false }),
      makeManagerIntel({ managerId: 'c1', retentionRisk: 'critical', isInactive: true, overallEngagementScore: 0 }),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_follow_up_critical_risk')
    expect(rec).toBeDefined()
    expect(rec!.priority).toBe('critical')
    // Verify it comes before lower-priority recs
    const critIdx = intel.recommendations.indexOf(rec!)
    const highRecs = intel.recommendations.filter((r) => r.priority === 'high')
    for (const highRec of highRecs) {
      expect(critIdx).toBeLessThan(intel.recommendations.indexOf(highRec))
    }
  })

  it('inactive managers → rec_contact_inactive_managers fires', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', isInactive: false }),
      makeInactiveManagerIntel('i1'),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_contact_inactive_managers')
    expect(rec).toBeDefined()
    expect(rec!.category).toBe('retention')
  })

  it('inactive > 30% → rec_contact_inactive_managers has critical priority', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', isInactive: false }),
      makeManagerIntel({ managerId: 'a2', isInactive: false }),
      makeInactiveManagerIntel('i1'),
      makeInactiveManagerIntel('i2'),
      makeInactiveManagerIntel('i3'),
      makeInactiveManagerIntel('i4'),
      makeInactiveManagerIntel('i5'),
    ]
    // 5/7 inactive = 71% → critical priority
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_contact_inactive_managers')
    expect(rec!.priority).toBe('critical')
  })

  it('no trades + >= 4 active managers → rec_spark_trade_activity fires', () => {
    const managers = Array.from({ length: 6 }, (_, i) =>
      makeManagerIntel({ managerId: `a${i}`, isInactive: false }),
    )
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ totalTradeCount: 0 }),
      managers,
      NOW,
    )
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_spark_trade_activity')
    expect(rec).toBeDefined()
    expect(rec!.priority).toBe('medium')
    expect(rec!.category).toBe('activity')
  })

  it('no trades but < 4 active managers → rec_spark_trade_activity does NOT fire', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', isInactive: false }),
      makeManagerIntel({ managerId: 'a2', isInactive: false }),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_spark_trade_activity')
    expect(rec).toBeUndefined()
  })

  it('no waivers + >= 4 active managers → rec_announce_waiver_wire fires', () => {
    const managers = Array.from({ length: 6 }, (_, i) =>
      makeManagerIntel({ managerId: `a${i}`, isInactive: false }),
    )
    const facts = makeLeagueFacts({ totalWaiverClaimCount: 0 })
    const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_announce_waiver_wire')
    expect(rec).toBeDefined()
    expect(rec!.priority).toBe('medium')
  })

  it('active managers present → rec_post_weekly_recap always fires', () => {
    const managers = [makeManagerIntel({ managerId: 'a1', isInactive: false })]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_post_weekly_recap')
    expect(rec).toBeDefined()
    expect(rec!.priority).toBe('low')
  })

  it('no active managers → rec_post_weekly_recap does NOT fire', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), [], NOW)
    const rec = intel.recommendations.find((r) => r.recommendationId === 'rec_post_weekly_recap')
    expect(rec).toBeUndefined()
  })

  it('recommendation messages are customer-facing (no internal terminology)', () => {
    const managers = [
      makeInactiveManagerIntel('i1'),
      makeManagerIntel({ managerId: 'a1', retentionRisk: 'critical', isInactive: true, overallEngagementScore: 0 }),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    for (const rec of intel.recommendations) {
      expect(rec.message).not.toContain('Decision OS')
      expect(rec.message).not.toContain('Canonical World')
      expect(rec.message).not.toContain('shadow')
      expect(rec.message).not.toContain('BehavioralEvent')
      expect(rec.message).not.toContain('managerId')
    }
  })
})

// ── Health narrative inputs ───────────────────────────────────────────────────

describe('health narrative inputs', () => {
  it('engagementSummary is a structured string with counts', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', isInactive: false }),
      makeManagerIntel({ managerId: 'a2', isInactive: false }),
      makeInactiveManagerIntel('i1'),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.healthNarrativeInputs.engagementSummary).toBe('2 of 3 managers are active')
  })

  it('topConcern reflects most urgent signal', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', retentionRisk: 'critical', isInactive: true, overallEngagementScore: 0 }),
      makeManagerIntel({ managerId: 'a2', isInactive: false }),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.healthNarrativeInputs.topConcern).not.toBeNull()
  })

  it('topConcern is null for healthy all-active league', () => {
    const managers = Array.from({ length: 6 }, (_, i) =>
      makeManagerIntel({ managerId: `a${i}`, retentionRisk: 'low', isInactive: false }),
    )
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalTradeCount: 5 }), managers, NOW)
    expect(intel.healthNarrativeInputs.topConcern).toBeNull()
  })

  it('standoutSignal reflects positive signal', () => {
    const managers = Array.from({ length: 12 }, (_, i) =>
      makeEliteManagerIntel(`elite-${i}`),
    )
    const facts = makeLeagueFacts({ totalTradeCount: 48, totalWaiverClaimCount: 60, draftCount: 1, totalDraftPickCount: 168 })
    const intel = deriveLeagueBehavioralIntelligence(facts, managers, NOW)
    expect(intel.healthNarrativeInputs.standoutSignal).not.toBeNull()
  })

  it('health narrative inputs contain no internal terminology', () => {
    const managers = [makeInactiveManagerIntel('i1')]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const { engagementSummary, topConcern, standoutSignal } = intel.healthNarrativeInputs
    const all = [engagementSummary, topConcern ?? '', standoutSignal ?? ''].join(' ')
    expect(all).not.toContain('Decision OS')
    expect(all).not.toContain('Canonical World')
    expect(all).not.toContain('BehavioralEvent')
    expect(all).not.toContain('managerId')
  })
})

// ── Data quality — completeness and warnings ──────────────────────────────────

describe('data quality — completeness and warnings', () => {
  it('completeness is inherited from facts', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ completeness: 78 }), [], NOW,
    )
    expect(intel.completeness).toBe(78)
  })

  it('derivedFrom reflects facts.eventCount', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ eventCount: 250 }), [], NOW,
    )
    expect(intel.derivedFrom).toBe(250)
  })

  it('managerCount reflects managerIntelligences.length', () => {
    const managers = Array.from({ length: 8 }, (_, i) =>
      makeManagerIntel({ managerId: `m${i}` }),
    )
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.managerCount).toBe(8)
  })

  it('lookbackDays inherited from facts', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ lookbackDays: 90 }), [], NOW,
    )
    expect(intel.lookbackDays).toBe(90)
  })

  it('warnings from facts are propagated', () => {
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ warnings: ['upstream_gap'] }),
      [makeManagerIntel({ isInactive: false })],
      NOW,
    )
    expect(intel.warnings).toContain('upstream_gap')
  })

  it('no_trade_activity warning added when active managers present but 0 trades', () => {
    const managers = [makeManagerIntel({ managerId: 'a1', isInactive: false })]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts({ totalTradeCount: 0 }), managers, NOW)
    expect(intel.warnings).toContain('no_trade_activity')
  })

  it('no_waiver_activity warning added when active managers present but 0 waiver claims', () => {
    const managers = [makeManagerIntel({ managerId: 'a1', isInactive: false })]
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ totalWaiverClaimCount: 0 }), managers, NOW,
    )
    expect(intel.warnings).toContain('no_waiver_activity')
  })

  it('no_draft_activity warning added when 0 draft picks', () => {
    const managers = [makeManagerIntel({ managerId: 'a1', isInactive: false })]
    const intel = deriveLeagueBehavioralIntelligence(
      makeLeagueFacts({ totalDraftPickCount: 0, draftCount: 0 }), managers, NOW,
    )
    expect(intel.warnings).toContain('no_draft_activity')
  })

  it('inactive_managers_present warning added when any inactive', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1', isInactive: false }),
      makeInactiveManagerIntel('i1'),
    ]
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel.warnings).toContain('inactive_managers_present')
  })

  it('derivedAt matches injected clock', () => {
    const intel = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), [], NOW)
    expect(intel.derivedAt).toBe(NOW.toISOString())
  })
})

// ── No mutation invariant ─────────────────────────────────────────────────────

describe('no mutation invariant', () => {
  it('facts object is not mutated', () => {
    const facts = makeLeagueFacts({
      totalTradeCount: 10,
      warnings: ['upstream_warning'],
    })
    const factsBefore = JSON.stringify(facts)
    deriveLeagueBehavioralIntelligence(facts, [], NOW)
    expect(JSON.stringify(facts)).toBe(factsBefore)
  })

  it('managerIntelligences array is not mutated', () => {
    const managers = [
      makeManagerIntel({ managerId: 'a1' }),
      makeInactiveManagerIntel('i1'),
    ]
    const managersBefore = JSON.stringify(managers)
    deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(JSON.stringify(managers)).toBe(managersBefore)
  })

  it('returned intelligence is a new object', () => {
    const facts = makeLeagueFacts()
    const intel = deriveLeagueBehavioralIntelligence(facts, [], NOW)
    expect(intel).not.toBe(facts)
    expect(intel.warnings).not.toBe(facts.warnings)
  })

  it('warnings and recommendations arrays are independent between calls', () => {
    const managers = [makeInactiveManagerIntel('i1')]
    const intel1 = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    const intel2 = deriveLeagueBehavioralIntelligence(makeLeagueFacts(), managers, NOW)
    expect(intel1.warnings).not.toBe(intel2.warnings)
    expect(intel1.recommendations).not.toBe(intel2.recommendations)
  })
})
