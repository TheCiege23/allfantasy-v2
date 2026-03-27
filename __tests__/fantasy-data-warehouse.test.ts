import { describe, expect, it } from 'vitest'
import {
  buildWarehouseActivityFeed,
  buildWarehouseOverview,
  buildWarehouseSimulationAnalytics,
  buildWarehouseStoreBundleResult,
} from '@/lib/data-warehouse'

describe('fantasy data warehouse', () => {
  it('summarizes centralized bundle writes across every warehouse dataset', () => {
    const result = buildWarehouseStoreBundleResult({
      playerStats: ['pgf-1', 'pgf-2'],
      teamGameStats: ['tgf-1'],
      rosterSnapshots: ['rs-1'],
      matchupResults: ['mf-1', 'mf-2', 'mf-3'],
      standings: ['ssf-1'],
      draftLogs: ['df-1', 'df-2'],
      tradeLogs: ['tx-1'],
      matchupSimulations: ['ms-1'],
      seasonSimulations: ['ss-1', 'ss-2'],
    })

    expect(result.counts.playerStats).toBe(2)
    expect(result.counts.teamStats).toBe(1)
    expect(result.counts.leagueMatchups).toBe(3)
    expect(result.counts.seasonSimulations).toBe(2)
    expect(result.totalRecords).toBe(14)
  })

  it('builds a warehouse overview with coverage and latest activity timestamps', () => {
    const overview = buildWarehouseOverview({
      leagueId: 'league-1',
      sport: 'nfl',
      season: 2026,
      counts: {
        playerStats: 120,
        teamStats: 24,
        rosterSnapshots: 18,
        leagueMatchups: 42,
        seasonStandings: 12,
        draftLogs: 180,
        tradeLogs: 27,
        matchupSimulations: 9,
        seasonSimulations: 12,
      },
      latestByDataset: {
        playerStats: '2026-03-25T16:00:00.000Z',
        teamStats: '2026-03-24T16:00:00.000Z',
        rosterSnapshots: '2026-03-20T16:00:00.000Z',
        leagueMatchups: '2026-03-23T16:00:00.000Z',
        seasonStandings: '2026-03-22T16:00:00.000Z',
        draftLogs: '2026-03-18T16:00:00.000Z',
        tradeLogs: '2026-03-26T12:00:00.000Z',
        matchupSimulations: '2026-03-26T18:30:00.000Z',
        seasonSimulations: '2026-03-26T18:15:00.000Z',
      },
    })

    expect(overview.sport).toBe('NFL')
    expect(overview.totalRecords).toBe(444)
    expect(overview.coveragePct).toBe(100)
    expect(overview.latestActivityAt).toBe('2026-03-26T18:30:00.000Z')
  })

  it('sorts mixed warehouse activity into a single descending feed', () => {
    const feed = buildWarehouseActivityFeed(
      [
        {
          dataset: 'trade_logs',
          recordId: 'tx-1',
          occurredAt: '2026-03-20T15:00:00.000Z',
          title: 'Trade transaction',
          detail: 'Player move',
        },
        {
          dataset: 'draft_logs',
          recordId: 'df-1',
          occurredAt: '2026-03-22T13:00:00.000Z',
          title: 'Draft pick 1.01',
          detail: 'Player drafted',
        },
        {
          dataset: 'matchup_simulations',
          recordId: 'ms-1',
          occurredAt: '2026-03-21T18:00:00.000Z',
          title: 'Simulation run',
          detail: 'Week 4 sim',
        },
      ],
      2
    )

    expect(feed).toHaveLength(2)
    expect(feed[0]?.dataset).toBe('draft_logs')
    expect(feed[1]?.dataset).toBe('matchup_simulations')
  })

  it('aggregates simulation outputs into warehouse analytics', () => {
    const analytics = buildWarehouseSimulationAnalytics({
      matchupSimulations: [
        { expectedScoreA: 118.4, expectedScoreB: 110.1, winProbabilityA: 0.64 },
        { expectedScoreA: 102.2, expectedScoreB: 104.8, winProbabilityA: 0.47 },
      ],
      seasonSimulations: [
        { teamId: 'team-a', playoffProbability: 0.82, championshipProbability: 0.24 },
        { teamId: 'team-b', playoffProbability: 0.66, championshipProbability: 0.17 },
        { teamId: 'team-c', playoffProbability: 0.41, championshipProbability: 0.09 },
      ],
    })

    expect(analytics.matchupSimulationCount).toBe(2)
    expect(analytics.seasonSimulationCount).toBe(3)
    expect(analytics.averageExpectedScoreA).toBe(110.3)
    expect(analytics.averageExpectedScoreB).toBe(107.45)
    expect(analytics.averageWinProbabilityA).toBe(0.555)
    expect(analytics.averagePlayoffProbability).toBe(0.63)
    expect(analytics.bestPlayoffOddsTeamId).toBe('team-a')
  })
})
