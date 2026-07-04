/**
 * Phase 5.6 — Intelligence API Resolver tests.
 *
 * Verifies that each resolver:
 *   1. Maps every V1 contract field correctly from the internal type
 *   2. Strips every internal field per the privacy rules in the ADR
 *   3. Builds the correct envelope metadata (version, tier, completeness, requestId)
 *   4. Handles edge cases (empty arrays, null values, zero scores)
 *   5. Does not mutate its input
 */

import { describe, expect, it } from 'vitest'
import type { ManagerBehavioralIntelligence } from '../../lib/decision-os/behavioral/manager-intelligence'
import type { LeagueBehavioralIntelligence } from '../../lib/decision-os/behavioral/league-intelligence'
import type { PlatformBehavioralIntelligence } from '../../lib/decision-os/behavioral/platform-intelligence'
import {
  resolveManagerIntelligence,
  resolveLeagueIntelligence,
  resolvePlatformIntelligenceBasic,
  resolvePlatformIntelligenceFull,
} from '../../lib/decision-os/behavioral/api/resolvers'

// ── Fixed timestamps ───────────────────────────────────────────────────────────

const NOW_ISO = '2026-06-30T12:00:00.000Z'
const REQUEST_ID = 'req-test-001'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeManagerIntel(
  overrides: Partial<ManagerBehavioralIntelligence> = {},
): ManagerBehavioralIntelligence {
  return {
    managerId: 'mgr-001',
    leagueId:  'lgr-001',
    participationTier:     'active',
    retentionRisk:         'low',
    retentionRiskReasons:  ['Manager has set lineups consistently'],
    lineupEngagement: { score: 80, level: 'high',     eventCount: 8,  lastEventAt: NOW_ISO, warnings: ['dim_warn'] },
    waiverEngagement: { score: 55, level: 'moderate', eventCount: 3,  lastEventAt: NOW_ISO, warnings: [] },
    tradeEngagement:  { score: 40, level: 'low',      eventCount: 1,  lastEventAt: null,    warnings: [] },
    draftEngagement:  { score: 75, level: 'high',     eventCount: 12, lastEventAt: NOW_ISO, warnings: [] },
    overallEngagementScore: 67,
    daysSinceLastActivity:  1,
    isInactive:            false,
    inactivityWarning:     null,
    nudges: [
      {
        nudgeId:           'nudge_low_trade',
        priority:          'low',
        category:          'transaction',
        signal:            'trade_engagement_none',
        message:           'This manager has not made any trades this season.',
        supportingEventIds: ['evt-123', 'evt-456'],
      },
    ],
    completeness: 85,
    derivedFrom:  12,
    lookbackDays: 90,
    warnings:     ['low_trade_activity'],
    derivedAt:    NOW_ISO,
    ...overrides,
  }
}

function makeLeagueIntel(
  overrides: Partial<LeagueBehavioralIntelligence> = {},
): LeagueBehavioralIntelligence {
  return {
    leagueId:              'lgr-001',
    leagueEngagementScore: 72,
    leagueEngagementTier:  'active',
    participationDistribution: {
      totalManagers:    10,
      activeManagers:    8,
      inactiveManagers:  2,
      activePercent:    80,
      inactivePercent:  20,
    },
    inactiveManagerCount: 2,
    tradeActivity:  { tier: 'moderate', count: 8,  perManagerRate: 0.8,  warnings: ['trade_warn'] },
    waiverActivity: { tier: 'high',     count: 25, perManagerRate: 2.5,  warnings: [] },
    draftActivity:  { tier: 'high',     count: 90, perManagerRate: 9.0,  warnings: [] },
    retentionRisk:         'low',
    retentionRiskReasons:  ['2 managers are inactive'],
    commissionerWorkload:  'light',
    commissionerWorkloadItems: ['inactive_managers'],
    recommendations: [
      {
        recommendationId: 'rec_contact_inactive',
        priority:         'high',
        category:         'retention',
        signal:           'inactive_managers_detected',
        message:          'Reach out to managers who may be at risk of dropping out.',
      },
    ],
    healthNarrativeInputs: {
      engagementSummary: '8 of 10 managers are active',
      topConcern:        null,
      standoutSignal:    'High waiver wire activity',
    },
    completeness:  80,
    derivedFrom:   100,
    managerCount:  10,
    lookbackDays:  90,
    warnings:      ['league_internal_warn'],
    derivedAt:     NOW_ISO,
    ...overrides,
  }
}

function makePlatformIntel(
  overrides: Partial<PlatformBehavioralIntelligence> = {},
): PlatformBehavioralIntelligence {
  return {
    platformEngagementScore: 65,
    platformEngagementTier:  'healthy',
    leagueHealthDistribution: {
      elite:          2,
      active:         5,
      moderate:       2,
      passive:        1,
      dormant:        0,
      totalLeagues:   10,
      healthyPercent: 70,
      atRiskPercent:  10,
    },
    retentionDistribution: {
      managersByCriticalRisk:     3,
      managersByHighRisk:         7,
      managersByMediumRisk:      15,
      managersByLowRisk:         75,
      totalManagers:            100,
      managerCriticalRiskPercent:  3,
      managerAtRiskPercent:       10,
      leaguesByCriticalRisk:       1,
      leaguesByHighRisk:           2,
      leaguesByMediumRisk:         3,
      leaguesByLowRisk:            4,
      totalLeagues:               10,
      leagueCriticalRiskPercent:  10,
      leagueAtRiskPercent:        30,
    },
    commissionerQualityDistribution: {
      light:             5,
      moderate:          3,
      heavy:             1,
      critical:          1,
      totalLeagues:     10,
      managedPercent:   80,
      overloadedPercent: 20,
    },
    tradeEcosystem: {
      tier:                'moderate',
      totalEvents:          80,
      activeLeagues:         7,
      totalLeagues:         10,
      activeLeaguePercent:  70,
      perLeagueRate:        8.0,
      perManagerRate:       0.8,
      warnings:            ['internal_trade_warn'],
    },
    waiverEcosystem: {
      tier:                'high',
      totalEvents:         250,
      activeLeagues:        10,
      totalLeagues:         10,
      activeLeaguePercent: 100,
      perLeagueRate:        25.0,
      perManagerRate:        2.5,
      warnings:            [],
    },
    draftParticipation: {
      tier:                'high',
      totalEvents:         900,
      activeLeagues:        10,
      totalLeagues:         10,
      activeLeaguePercent: 100,
      perLeagueRate:        90.0,
      perManagerRate:        9.0,
      warnings:            [],
    },
    engagementTrends: {
      sevenDayEventCount:           40,
      thirtyDayEventCount:         150,
      recentActivityRatio:          0.27,
      recentlyActiveManagerPercent: 60,
      momentumSignal:               'steady',
      trendConfidence:              'medium',
      warnings:                    ['trends_internal_warn'],
    },
    activityHeatmap: {
      cells:               [{ dayOfWeek: 1, hour: 20, count: 12 }],
      peakCellKey:         '1-20',
      peakDayOfWeek:        1,
      peakHour:            20,
      peakCount:           12,
      totalEventsAnalyzed: 230,
      warnings:           ['heatmap_internal_warn'],
    },
    interventionOpportunities: [
      {
        opportunityId: 'opp-league-1',
        scope:         'league',
        priority:      'critical',
        leagueId:      'lgr-critical',
        signal:        'critical_retention_and_workload',
        message:       'This league has critical retention risk and commissioner workload.',
      },
      {
        opportunityId: 'opp-manager-1',
        scope:         'manager',
        priority:      'critical',
        leagueId:      'lgr-001',
        managerId:     'mgr-inactive',
        signal:        'critical_retention',
        message:       'This manager has not participated in any recorded activities.',
      },
    ],
    completeness:  75,
    uncertainty:   'medium',
    warnings:     ['platform_internal_warn', 'no_events_provided'],
    provenance: {
      leagueIntelligenceCount:  10,
      managerIntelligenceCount: 100,
      eventCount:               230,
      avgLeagueLookbackDays:     90,
      derivedAt:                 NOW_ISO,
    },
    derivedAt: NOW_ISO,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveManagerIntelligence
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveManagerIntelligence — field mapping', () => {
  const intel  = makeManagerIntel()
  const result = resolveManagerIntelligence(intel, REQUEST_ID, 'manager')

  it('echoes managerId and leagueId', () => {
    expect(result.data.managerId).toBe('mgr-001')
    expect(result.data.leagueId).toBe('lgr-001')
  })

  it('maps participationTier and retentionRisk', () => {
    expect(result.data.participationTier).toBe('active')
    expect(result.data.retentionRisk).toBe('low')
  })

  it('includes retentionRiskReasons (customer-facing)', () => {
    expect(result.data.retentionRiskReasons).toEqual(['Manager has set lineups consistently'])
  })

  it('maps overallEngagementScore', () => {
    expect(result.data.overallEngagementScore).toBe(67)
  })

  it('maps all four engagement dimension scores and levels', () => {
    const d = result.data.engagementDimensions
    expect(d.lineup).toEqual({ score: 80, level: 'high' })
    expect(d.waiver).toEqual({ score: 55, level: 'moderate' })
    expect(d.trade).toEqual({  score: 40, level: 'low' })
    expect(d.draft).toEqual({  score: 75, level: 'high' })
  })

  it('maps daysSinceLastActivity and isInactive', () => {
    expect(result.data.daysSinceLastActivity).toBe(1)
    expect(result.data.isInactive).toBe(false)
  })

  it('maps completeness and derivedAt', () => {
    expect(result.data.completeness).toBe(85)
    expect(result.data.derivedAt).toBe(NOW_ISO)
  })

  it('maps nudge nudgeId, priority, category, message', () => {
    const nudge = result.data.nudges[0]
    expect(nudge.nudgeId).toBe('nudge_low_trade')
    expect(nudge.priority).toBe('low')
    expect(nudge.category).toBe('transaction')
    expect(nudge.message).toBe('This manager has not made any trades this season.')
  })
})

describe('resolveManagerIntelligence — privacy stripping', () => {
  const intel  = makeManagerIntel()
  const result = resolveManagerIntelligence(intel, REQUEST_ID, 'manager')

  it('strips nudge.signal', () => {
    expect('signal' in result.data.nudges[0]).toBe(false)
  })

  it('strips nudge.supportingEventIds', () => {
    expect('supportingEventIds' in result.data.nudges[0]).toBe(false)
  })

  it('strips engagement dimension eventCount', () => {
    expect('eventCount' in result.data.engagementDimensions.lineup).toBe(false)
  })

  it('strips engagement dimension lastEventAt', () => {
    expect('lastEventAt' in result.data.engagementDimensions.lineup).toBe(false)
  })

  it('strips engagement dimension warnings', () => {
    expect('warnings' in result.data.engagementDimensions.lineup).toBe(false)
  })

  it('strips inactivityWarning', () => {
    expect('inactivityWarning' in result.data).toBe(false)
  })

  it('strips derivedFrom', () => {
    expect('derivedFrom' in result.data).toBe(false)
  })

  it('strips lookbackDays', () => {
    expect('lookbackDays' in result.data).toBe(false)
  })

  it('strips top-level warnings', () => {
    expect('warnings' in result.data).toBe(false)
  })
})

describe('resolveManagerIntelligence — envelope metadata', () => {
  const result = resolveManagerIntelligence(makeManagerIntel(), REQUEST_ID, 'manager')

  it('sets version to v1', () => {
    expect(result.meta.version).toBe('v1')
  })

  it('sets tier to manager', () => {
    expect(result.meta.tier).toBe('manager')
  })

  it('sets completeness from intelligence', () => {
    expect(result.meta.completeness).toBe(85)
  })

  it('sets derivedAt from intelligence', () => {
    expect(result.meta.derivedAt).toBe(NOW_ISO)
  })

  it('echoes requestId', () => {
    expect(result.meta.requestId).toBe(REQUEST_ID)
  })
})

describe('resolveManagerIntelligence — edge cases', () => {
  it('handles empty nudges array', () => {
    const result = resolveManagerIntelligence(makeManagerIntel({ nudges: [] }), REQUEST_ID, 'manager')
    expect(result.data.nudges).toHaveLength(0)
  })

  it('handles null daysSinceLastActivity', () => {
    const result = resolveManagerIntelligence(
      makeManagerIntel({ daysSinceLastActivity: null }), REQUEST_ID, 'manager',
    )
    expect(result.data.daysSinceLastActivity).toBeNull()
  })

  it('handles zero completeness (degraded response)', () => {
    const result = resolveManagerIntelligence(
      makeManagerIntel({ completeness: 0 }), REQUEST_ID, 'manager',
    )
    expect(result.data.completeness).toBe(0)
    expect(result.meta.completeness).toBe(0)
  })

  it('handles zero overallEngagementScore', () => {
    const result = resolveManagerIntelligence(
      makeManagerIntel({ overallEngagementScore: 0 }), REQUEST_ID, 'manager',
    )
    expect(result.data.overallEngagementScore).toBe(0)
  })

  it('does not mutate the input intel', () => {
    const intel  = makeManagerIntel()
    const before = JSON.stringify(intel)
    resolveManagerIntelligence(intel, REQUEST_ID, 'manager')
    expect(JSON.stringify(intel)).toBe(before)
  })

  it('retentionRiskReasons is a new array (not same reference)', () => {
    const intel  = makeManagerIntel()
    const result = resolveManagerIntelligence(intel, REQUEST_ID, 'manager')
    expect(result.data.retentionRiskReasons).not.toBe(intel.retentionRiskReasons)
    expect(result.data.retentionRiskReasons).toEqual(intel.retentionRiskReasons)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveLeagueIntelligence
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveLeagueIntelligence — field mapping', () => {
  const intel  = makeLeagueIntel()
  const result = resolveLeagueIntelligence(intel, REQUEST_ID, 'commissioner')

  it('echoes leagueId', () => {
    expect(result.data.leagueId).toBe('lgr-001')
  })

  it('maps leagueEngagementScore and tier', () => {
    expect(result.data.leagueEngagementScore).toBe(72)
    expect(result.data.leagueEngagementTier).toBe('active')
  })

  it('maps participationDistribution fully', () => {
    expect(result.data.participationDistribution).toEqual({
      totalManagers: 10, activeManagers: 8, inactiveManagers: 2,
      activePercent: 80, inactivePercent: 20,
    })
  })

  it('maps activity dimension tier and perManagerRate', () => {
    expect(result.data.tradeActivity).toEqual({ tier: 'moderate', perManagerRate: 0.8 })
    expect(result.data.waiverActivity).toEqual({ tier: 'high',    perManagerRate: 2.5 })
    expect(result.data.draftActivity).toEqual({  tier: 'high',    perManagerRate: 9.0 })
  })

  it('maps retentionRisk and commissionerWorkload', () => {
    expect(result.data.retentionRisk).toBe('low')
    expect(result.data.commissionerWorkload).toBe('light')
  })

  it('maps recommendation nudgeId, priority, category, message', () => {
    const rec = result.data.recommendations[0]
    expect(rec.recommendationId).toBe('rec_contact_inactive')
    expect(rec.priority).toBe('high')
    expect(rec.category).toBe('retention')
    expect(rec.message).toBe('Reach out to managers who may be at risk of dropping out.')
  })

  it('maps completeness and derivedAt', () => {
    expect(result.data.completeness).toBe(80)
    expect(result.data.derivedAt).toBe(NOW_ISO)
  })
})

describe('resolveLeagueIntelligence — privacy stripping', () => {
  const intel  = makeLeagueIntel()
  const result = resolveLeagueIntelligence(intel, REQUEST_ID, 'commissioner')

  it('strips recommendation.signal', () => {
    expect('signal' in result.data.recommendations[0]).toBe(false)
  })

  it('strips activity dimension count', () => {
    expect('count' in result.data.tradeActivity).toBe(false)
  })

  it('strips activity dimension warnings', () => {
    expect('warnings' in result.data.tradeActivity).toBe(false)
  })

  it('strips retentionRiskReasons (internal league field)', () => {
    expect('retentionRiskReasons' in result.data).toBe(false)
  })

  it('strips commissionerWorkloadItems', () => {
    expect('commissionerWorkloadItems' in result.data).toBe(false)
  })

  it('strips healthNarrativeInputs', () => {
    expect('healthNarrativeInputs' in result.data).toBe(false)
  })

  it('strips inactiveManagerCount', () => {
    expect('inactiveManagerCount' in result.data).toBe(false)
  })

  it('strips derivedFrom', () => {
    expect('derivedFrom' in result.data).toBe(false)
  })

  it('strips managerCount', () => {
    expect('managerCount' in result.data).toBe(false)
  })

  it('strips lookbackDays', () => {
    expect('lookbackDays' in result.data).toBe(false)
  })

  it('strips top-level warnings', () => {
    expect('warnings' in result.data).toBe(false)
  })
})

describe('resolveLeagueIntelligence — envelope metadata', () => {
  const result = resolveLeagueIntelligence(makeLeagueIntel(), REQUEST_ID, 'commissioner')

  it('sets version to v1', () => { expect(result.meta.version).toBe('v1') })
  it('sets tier to commissioner', () => { expect(result.meta.tier).toBe('commissioner') })
  it('sets completeness from intelligence', () => { expect(result.meta.completeness).toBe(80) })
  it('echoes requestId', () => { expect(result.meta.requestId).toBe(REQUEST_ID) })
})

describe('resolveLeagueIntelligence — edge cases', () => {
  it('handles empty recommendations array', () => {
    const result = resolveLeagueIntelligence(
      makeLeagueIntel({ recommendations: [] }), REQUEST_ID, 'commissioner',
    )
    expect(result.data.recommendations).toHaveLength(0)
  })

  it('participationDistribution is a new object (not same reference)', () => {
    const intel  = makeLeagueIntel()
    const result = resolveLeagueIntelligence(intel, REQUEST_ID, 'commissioner')
    expect(result.data.participationDistribution).not.toBe(intel.participationDistribution)
    expect(result.data.participationDistribution).toEqual(intel.participationDistribution)
  })

  it('does not mutate the input intel', () => {
    const intel  = makeLeagueIntel()
    const before = JSON.stringify(intel)
    resolveLeagueIntelligence(intel, REQUEST_ID, 'commissioner')
    expect(JSON.stringify(intel)).toBe(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolvePlatformIntelligenceBasic
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePlatformIntelligenceBasic — field mapping', () => {
  const intel  = makePlatformIntel()
  const result = resolvePlatformIntelligenceBasic(intel, REQUEST_ID)

  it('maps platformEngagementScore and tier', () => {
    expect(result.data.platformEngagementScore).toBe(65)
    expect(result.data.platformEngagementTier).toBe('healthy')
  })

  it('maps leagueHealthSummary from distribution percents only', () => {
    expect(result.data.leagueHealthSummary.healthyPercent).toBe(70)
    expect(result.data.leagueHealthSummary.atRiskPercent).toBe(10)
  })

  it('maps momentumSignal from engagementTrends', () => {
    expect(result.data.momentumSignal).toBe('steady')
  })

  it('maps trendConfidence from engagementTrends', () => {
    expect(result.data.trendConfidence).toBe('medium')
  })

  it('maps completeness and derivedAt', () => {
    expect(result.data.completeness).toBe(75)
    expect(result.data.derivedAt).toBe(NOW_ISO)
  })
})

describe('resolvePlatformIntelligenceBasic — aggregate-only privacy', () => {
  const intel  = makePlatformIntel()
  const result = resolvePlatformIntelligenceBasic(intel, REQUEST_ID)

  it('has no leagueHealthDistribution (absolute counts excluded)', () => {
    expect('leagueHealthDistribution' in result.data).toBe(false)
  })

  it('leagueHealthSummary has no totalLeagues or tier counts', () => {
    const summary = result.data.leagueHealthSummary
    expect('totalLeagues' in summary).toBe(false)
    expect('elite' in summary).toBe(false)
    expect('active' in summary).toBe(false)
  })

  it('has no commissionerQualityDistribution', () => {
    expect('commissionerQualityDistribution' in result.data).toBe(false)
  })

  it('has no retentionDistribution', () => {
    expect('retentionDistribution' in result.data).toBe(false)
  })

  it('has no ecosystem dimensions (no rates)', () => {
    expect('tradeEcosystem' in result.data).toBe(false)
    expect('waiverEcosystem' in result.data).toBe(false)
    expect('draftParticipation' in result.data).toBe(false)
  })

  it('has no activityHeatmap', () => {
    expect('activityHeatmap' in result.data).toBe(false)
  })

  it('has no interventionOpportunities', () => {
    expect('interventionOpportunities' in result.data).toBe(false)
  })

  it('has no uncertainty', () => {
    expect('uncertainty' in result.data).toBe(false)
  })

  it('has no warnings', () => {
    expect('warnings' in result.data).toBe(false)
  })

  it('has no provenance', () => {
    expect('provenance' in result.data).toBe(false)
  })

  it('JSON output contains no "leagueId" key', () => {
    expect(JSON.stringify(result.data)).not.toContain('"leagueId"')
  })

  it('JSON output contains no "managerId" key', () => {
    expect(JSON.stringify(result.data)).not.toContain('"managerId"')
  })
})

describe('resolvePlatformIntelligenceBasic — envelope metadata', () => {
  const result = resolvePlatformIntelligenceBasic(makePlatformIntel(), REQUEST_ID)

  it('sets version to v1', () => { expect(result.meta.version).toBe('v1') })
  it('sets tier to basic', () => { expect(result.meta.tier).toBe('basic') })
  it('sets completeness from intelligence', () => { expect(result.meta.completeness).toBe(75) })
  it('echoes requestId', () => { expect(result.meta.requestId).toBe(REQUEST_ID) })
})

describe('resolvePlatformIntelligenceBasic — no mutation', () => {
  it('does not mutate the input intel', () => {
    const intel  = makePlatformIntel()
    const before = JSON.stringify(intel)
    resolvePlatformIntelligenceBasic(intel, REQUEST_ID)
    expect(JSON.stringify(intel)).toBe(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolvePlatformIntelligenceFull
// ─────────────────────────────────────────────────────────────────────────────

describe('resolvePlatformIntelligenceFull — field mapping', () => {
  const intel  = makePlatformIntel()
  const result = resolvePlatformIntelligenceFull(intel, REQUEST_ID)

  it('maps platformEngagementScore, tier, and uncertainty', () => {
    expect(result.data.platformEngagementScore).toBe(65)
    expect(result.data.platformEngagementTier).toBe('healthy')
    expect(result.data.uncertainty).toBe('medium')
  })

  it('maps leagueHealthDistribution fully', () => {
    expect(result.data.leagueHealthDistribution).toEqual({
      elite: 2, active: 5, moderate: 2, passive: 1, dormant: 0,
      totalLeagues: 10, healthyPercent: 70, atRiskPercent: 10,
    })
  })

  it('maps commissionerQualityDistribution fully', () => {
    const d = result.data.commissionerQualityDistribution
    expect(d.light).toBe(5)
    expect(d.critical).toBe(1)
    expect(d.managedPercent).toBe(80)
    expect(d.overloadedPercent).toBe(20)
  })

  it('maps retentionDistribution fully', () => {
    const d = result.data.retentionDistribution
    expect(d.managersByCriticalRisk).toBe(3)
    expect(d.totalManagers).toBe(100)
    expect(d.managerAtRiskPercent).toBe(10)
    expect(d.leaguesByCriticalRisk).toBe(1)
    expect(d.leagueAtRiskPercent).toBe(30)
  })

  it('maps ecosystem tiers, activeLeaguePercent, and rates', () => {
    expect(result.data.tradeEcosystem).toEqual({
      tier: 'moderate', activeLeaguePercent: 70, perLeagueRate: 8.0, perManagerRate: 0.8,
    })
    expect(result.data.waiverEcosystem).toEqual({
      tier: 'high', activeLeaguePercent: 100, perLeagueRate: 25.0, perManagerRate: 2.5,
    })
    expect(result.data.draftParticipation).toEqual({
      tier: 'high', activeLeaguePercent: 100, perLeagueRate: 90.0, perManagerRate: 9.0,
    })
  })

  it('maps engagementTrends counts, ratio, and signals', () => {
    const t = result.data.engagementTrends
    expect(t.sevenDayEventCount).toBe(40)
    expect(t.thirtyDayEventCount).toBe(150)
    expect(t.recentActivityRatio).toBe(0.27)
    expect(t.recentlyActiveManagerPercent).toBe(60)
    expect(t.momentumSignal).toBe('steady')
    expect(t.trendConfidence).toBe('medium')
  })

  it('maps activityHeatmap cells, peak fields, and totalEventsAnalyzed', () => {
    const h = result.data.activityHeatmap
    expect(h.cells).toHaveLength(1)
    expect(h.cells[0]).toEqual({ dayOfWeek: 1, hour: 20, count: 12 })
    expect(h.peakCellKey).toBe('1-20')
    expect(h.peakDayOfWeek).toBe(1)
    expect(h.peakHour).toBe(20)
    expect(h.peakCount).toBe(12)
    expect(h.totalEventsAnalyzed).toBe(230)
  })

  it('maps league-scoped intervention opportunity', () => {
    const opp = result.data.interventionOpportunities[0]
    expect(opp.opportunityId).toBe('opp-league-1')
    expect(opp.scope).toBe('league')
    expect(opp.priority).toBe('critical')
    expect(opp.leagueId).toBe('lgr-critical')
    expect(opp.signal).toBe('critical_retention_and_workload')
    expect(opp.message).toBe('This league has critical retention risk and commissioner workload.')
  })

  it('maps manager-scoped intervention with managerId', () => {
    const opp = result.data.interventionOpportunities[1]
    expect(opp.scope).toBe('manager')
    expect(opp.managerId).toBe('mgr-inactive')
    expect(opp.leagueId).toBe('lgr-001')
  })

  it('maps completeness and derivedAt', () => {
    expect(result.data.completeness).toBe(75)
    expect(result.data.derivedAt).toBe(NOW_ISO)
  })
})

describe('resolvePlatformIntelligenceFull — privacy stripping', () => {
  const intel  = makePlatformIntel()
  const result = resolvePlatformIntelligenceFull(intel, REQUEST_ID)

  it('strips ecosystem totalEvents', () => {
    expect('totalEvents' in result.data.tradeEcosystem).toBe(false)
  })

  it('strips ecosystem activeLeagues (absolute count)', () => {
    expect('activeLeagues' in result.data.tradeEcosystem).toBe(false)
  })

  it('strips ecosystem totalLeagues', () => {
    expect('totalLeagues' in result.data.tradeEcosystem).toBe(false)
  })

  it('strips ecosystem warnings', () => {
    expect('warnings' in result.data.tradeEcosystem).toBe(false)
  })

  it('strips engagementTrends warnings', () => {
    expect('warnings' in result.data.engagementTrends).toBe(false)
  })

  it('strips activityHeatmap warnings', () => {
    expect('warnings' in result.data.activityHeatmap).toBe(false)
  })

  it('strips top-level warnings', () => {
    expect('warnings' in result.data).toBe(false)
  })

  it('strips provenance', () => {
    expect('provenance' in result.data).toBe(false)
  })

  it('league-scoped intervention has no managerId when absent in source', () => {
    const opp = result.data.interventionOpportunities[0]
    expect(opp.scope).toBe('league')
    expect('managerId' in opp).toBe(false)
  })
})

describe('resolvePlatformIntelligenceFull — envelope metadata', () => {
  const result = resolvePlatformIntelligenceFull(makePlatformIntel(), REQUEST_ID)

  it('sets version to v1', () => { expect(result.meta.version).toBe('v1') })
  it('sets tier to platform', () => { expect(result.meta.tier).toBe('platform') })
  it('sets completeness from intelligence', () => { expect(result.meta.completeness).toBe(75) })
  it('echoes requestId', () => { expect(result.meta.requestId).toBe(REQUEST_ID) })
})

describe('resolvePlatformIntelligenceFull — edge cases', () => {
  it('handles empty interventionOpportunities', () => {
    const result = resolvePlatformIntelligenceFull(
      makePlatformIntel({ interventionOpportunities: [] }), REQUEST_ID,
    )
    expect(result.data.interventionOpportunities).toHaveLength(0)
  })

  it('handles empty heatmap cells', () => {
    const result = resolvePlatformIntelligenceFull(
      makePlatformIntel({
        activityHeatmap: {
          cells: [], peakCellKey: null, peakDayOfWeek: null,
          peakHour: null, peakCount: 0, totalEventsAnalyzed: 0, warnings: [],
        },
      }),
      REQUEST_ID,
    )
    expect(result.data.activityHeatmap.cells).toHaveLength(0)
    expect(result.data.activityHeatmap.peakCellKey).toBeNull()
  })

  it('handles null trend ratios (no events)', () => {
    const result = resolvePlatformIntelligenceFull(
      makePlatformIntel({
        engagementTrends: {
          sevenDayEventCount: 0, thirtyDayEventCount: 0,
          recentActivityRatio: null, recentlyActiveManagerPercent: null,
          momentumSignal: 'insufficient_data', trendConfidence: 'insufficient',
          warnings: [],
        },
      }),
      REQUEST_ID,
    )
    expect(result.data.engagementTrends.recentActivityRatio).toBeNull()
    expect(result.data.engagementTrends.momentumSignal).toBe('insufficient_data')
  })

  it('does not mutate the input intel', () => {
    const intel  = makePlatformIntel()
    const before = JSON.stringify(intel)
    resolvePlatformIntelligenceFull(intel, REQUEST_ID)
    expect(JSON.stringify(intel)).toBe(before)
  })

  it('heatmap cells are new objects (not same references)', () => {
    const intel  = makePlatformIntel()
    const result = resolvePlatformIntelligenceFull(intel, REQUEST_ID)
    expect(result.data.activityHeatmap.cells[0]).not.toBe(intel.activityHeatmap.cells[0])
    expect(result.data.activityHeatmap.cells[0]).toEqual(intel.activityHeatmap.cells[0])
  })
})
