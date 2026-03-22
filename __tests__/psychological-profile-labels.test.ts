import { describe, expect, it } from 'vitest'
import { resolveProfileLabels, resolveScores } from '@/lib/psychological-profiles/ProfileLabelResolver'

describe('psychological profile label resolver', () => {
  it('assigns aggressive trade-focused labels for active high-risk managers', () => {
    const labels = resolveProfileLabels({
      managerId: 'm1',
      leagueId: 'l1',
      sport: 'NFL',
      tradeCount: 10,
      tradeFrequencyNorm: 75,
      tradeTimingLateRate: 65,
      waiverClaimCount: 16,
      waiverFocusNorm: 70,
      lineupChangeRate: 58,
      benchingPatternScore: 52,
      rookieAcquisitionRate: 62,
      vetAcquisitionRate: 22,
      draftPickCount: 8,
      draftEarlyRoundRate: 50,
      positionPriorityConcentration: 40,
      picksTradedAway: 6,
      picksAcquired: 2,
      rebuildScore: 10,
      contentionScore: 70,
      aggressionNorm: 72,
      riskNorm: 74,
    })
    expect(labels).toContain('trade-heavy')
    expect(labels).toContain('aggressive')
    expect(labels).toContain('waiver-focused')
    expect(labels).toContain('rookie-heavy')
    expect(labels).toContain('win-now')
  })

  it('computes bounded profile scores', () => {
    const scores = resolveScores({
      managerId: 'm2',
      leagueId: 'l1',
      sport: 'NBA',
      tradeCount: 1,
      tradeFrequencyNorm: 12,
      tradeTimingLateRate: 0,
      waiverClaimCount: 2,
      waiverFocusNorm: 9,
      lineupChangeRate: 18,
      benchingPatternScore: 15,
      rookieAcquisitionRate: 20,
      vetAcquisitionRate: 45,
      draftPickCount: 4,
      draftEarlyRoundRate: 25,
      positionPriorityConcentration: 33,
      picksTradedAway: 1,
      picksAcquired: 4,
      rebuildScore: 55,
      contentionScore: 20,
      aggressionNorm: 17,
      riskNorm: 28,
    })
    expect(scores.aggressionScore).toBeGreaterThanOrEqual(0)
    expect(scores.riskToleranceScore).toBeLessThanOrEqual(100)
  })
})
