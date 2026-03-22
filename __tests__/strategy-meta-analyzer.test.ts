import { describe, expect, it } from 'vitest'
import { detectStrategies } from '@/lib/strategy-meta/StrategyPatternAnalyzer'
import { computeStrategyMetaReport } from '@/lib/strategy-meta/MetaSuccessEvaluator'
import { getStrategyLabelForSport, resolveSportForStrategy } from '@/lib/strategy-meta/SportStrategyResolver'

describe('Strategy Meta Analyzer', () => {
  it('detects ZeroRB and LateQB from early draft shape', () => {
    const detected = detectStrategies({
      sport: 'NFL',
      leagueFormat: 'dynasty_sf',
      draftPicks: [
        { round: 1, pickNo: 1, rosterId: 1, playerId: 'a', position: 'WR', team: 'MIN' },
        { round: 2, pickNo: 2, rosterId: 1, playerId: 'b', position: 'WR', team: 'PHI' },
        { round: 3, pickNo: 3, rosterId: 1, playerId: 'c', position: 'TE', team: 'KC' },
        { round: 4, pickNo: 4, rosterId: 1, playerId: 'd', position: 'WR', team: 'DET' },
        { round: 5, pickNo: 5, rosterId: 1, playerId: 'e', position: 'WR', team: 'BUF' },
        { round: 6, pickNo: 6, rosterId: 1, playerId: 'f', position: 'QB', team: 'BUF' },
      ],
      rosterPositions: { WR: 6, RB: 2, QB: 2, TE: 2 },
    })

    const types = new Set(detected.map((d) => d.strategyType))
    expect(types.has('ZeroRB')).toBe(true)
    expect(types.has('LateQB')).toBe(true)
  })

  it('detects StackingStrategies and RookieHeavyBuild', () => {
    const detected = detectStrategies({
      sport: 'NFL',
      leagueFormat: 'redraft_1qb',
      draftPicks: [
        { round: 1, pickNo: 1, rosterId: 1, playerId: 'a', position: 'QB', team: 'CIN' },
        { round: 2, pickNo: 2, rosterId: 1, playerId: 'b', position: 'WR', team: 'CIN' },
      ],
      rosterPositions: { QB: 2, RB: 4, WR: 5, TE: 2 },
      stacks: [{ type: 'CIN stack', players: ['a', 'b'] }],
      rookieCount: 8,
      veteranCount: 6,
    })

    const types = new Set(detected.map((d) => d.strategyType))
    expect(types.has('StackingStrategies')).toBe(true)
    expect(types.has('RookieHeavyBuild')).toBe(true)
  })

  it('computes usage/success for strategy reports', () => {
    const reports = computeStrategyMetaReport(
      [
        {
          leagueId: 'l1',
          rosterId: '1',
          season: 2026,
          strategyTypes: ['ZeroRB'],
          leagueFormat: 'dynasty_sf',
          wins: 10,
          losses: 4,
          pointsFor: 1500,
          champion: false,
        },
        {
          leagueId: 'l1',
          rosterId: '2',
          season: 2026,
          strategyTypes: ['ZeroRB'],
          leagueFormat: 'dynasty_sf',
          wins: 6,
          losses: 8,
          pointsFor: 1320,
          champion: false,
        },
      ],
      { sport: 'NFL', leagueFormat: 'dynasty_sf' }
    )

    expect(reports.length).toBe(1)
    expect(reports[0].strategyType).toBe('ZeroRB')
    expect(reports[0].usageRate).toBe(1)
    expect(reports[0].successRate).toBeGreaterThan(0.5)
  })

  it('detects specialist-heavy builds for NHL', () => {
    const detected = detectStrategies({
      sport: 'NHL',
      leagueFormat: 'redraft_1qb',
      draftPicks: [
        { round: 1, pickNo: 1, rosterId: 1, playerId: 'g1', position: 'G', team: 'NYR' },
        { round: 2, pickNo: 2, rosterId: 1, playerId: 'g2', position: 'G', team: 'DAL' },
        { round: 3, pickNo: 3, rosterId: 1, playerId: 'c1', position: 'C', team: 'TOR' },
        { round: 4, pickNo: 4, rosterId: 1, playerId: 'rw1', position: 'RW', team: 'EDM' },
      ],
      rosterPositions: { G: 2, C: 3, LW: 2, RW: 2, D: 3 },
    })
    const types = new Set(detected.map((d) => d.strategyType))
    expect(types.has('GoaliePitcherHeavyBuild')).toBe(true)
  })

  it('detects stars-and-scrubs concentration and balanced fallback', () => {
    const concentrated = detectStrategies({
      sport: 'SOCCER',
      leagueFormat: 'redraft_1qb',
      draftPicks: [
        { round: 1, pickNo: 1, rosterId: 1, playerId: 'a', position: 'FWD', team: 'ARS' },
        { round: 2, pickNo: 2, rosterId: 1, playerId: 'b', position: 'FWD', team: 'MCI' },
        { round: 3, pickNo: 3, rosterId: 1, playerId: 'c', position: 'MID', team: 'CHE' },
        { round: 4, pickNo: 4, rosterId: 1, playerId: 'd', position: 'FWD', team: 'LIV' },
      ],
      rosterPositions: { FWD: 7, MID: 5, DEF: 4, GKP: 1 },
    })
    expect(concentrated.some((d) => d.strategyType === 'StarsAndScrubsBuild')).toBe(true)

    const balanced = detectStrategies({
      sport: 'NBA',
      leagueFormat: 'redraft_1qb',
      draftPicks: [],
      rosterPositions: { PG: 2, SG: 2, SF: 2, PF: 2, C: 2 },
    })
    expect(balanced.some((d) => d.strategyType === 'BalancedBuild')).toBe(true)
  })

  it('resolves sport labels with sport-aware overrides', () => {
    expect(resolveSportForStrategy('soccer')).toBe('SOCCER')
    expect(getStrategyLabelForSport('ZeroRB', 'SOCCER')).toBe('Zero FWD')
  })
})
