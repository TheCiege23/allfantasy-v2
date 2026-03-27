import { beforeEach, describe, expect, it, vi } from 'vitest'

const getTrendFeedMock = vi.fn()
const runMetaAnalysisMock = vi.fn()
const getDynastyProjectionsForLeagueMock = vi.fn()
const getSimulationSummaryForAIMock = vi.fn()

vi.mock('@/lib/player-trend/TrendDetectionService', () => ({
  getTrendFeed: getTrendFeedMock,
}))

vi.mock('@/lib/strategy-meta-engine', () => ({
  runMetaAnalysis: runMetaAnalysisMock,
}))

vi.mock('@/lib/dynasty-engine/DynastyQueryService', () => ({
  getDynastyProjectionsForLeague: getDynastyProjectionsForLeagueMock,
}))

vi.mock('@/lib/simulation-engine/SimulationQueryService', () => ({
  getSimulationSummaryForAI: getSimulationSummaryForAIMock,
}))

function buildTrendItem(overrides: Record<string, unknown> = {}) {
  return {
    trendType: 'breakout_candidate',
    playerId: 'player-1',
    sport: 'NFL',
    displayName: 'Sky Moore',
    position: 'WR',
    team: 'KC',
    signals: {
      performanceDelta: 9.4,
      usageChange: 0.16,
      minutesOrSnapShare: 0.82,
      efficiencyScore: 78,
      volumeChange: 0.11,
      efficiencyDelta: 5.3,
      confidence: 0.84,
      signalStrength: 86,
    },
    snapshot: {
      dataSource: 'game_stats',
      recentGamesSample: 4,
      priorGamesSample: 4,
      recentFantasyPointsAvg: 19.4,
      priorFantasyPointsAvg: 12.1,
      recentUsageValue: 0.29,
      priorUsageValue: 0.18,
      recentMinutesOrShare: 0.82,
      priorMinutesOrShare: 0.64,
      recentEfficiency: 78,
      priorEfficiency: 66,
      expectedFantasyPointsPerGame: 15.2,
      seasonFantasyPointsPerGame: 14.4,
      expectedGap: 4.2,
      weeklyVolatility: 2.7,
      breakoutRating: 0.71,
      currentAdpTrend: -1.8,
    },
    summary: {
      headline: 'Usage is spiking',
      rationale: 'Recent volume and efficiency gains are both clearing baseline.',
      recommendation: 'Buy before the breakout price fully resets.',
    },
    trendScore: 81,
    direction: 'Rising',
    updatedAt: '2026-03-26T12:00:00.000Z',
    ...overrides,
  }
}

describe('GlobalFantasyIntelligenceEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getTrendFeedMock.mockResolvedValue([
      buildTrendItem(),
      buildTrendItem({
        trendType: 'hot_streak',
        playerId: 'player-2',
        displayName: 'Jaxon Smith-Njigba',
        team: 'SEA',
        signals: {
          performanceDelta: 11.2,
          usageChange: 0.18,
          minutesOrSnapShare: 0.88,
          efficiencyScore: 81,
          volumeChange: 0.13,
          efficiencyDelta: 7.1,
          confidence: 0.86,
          signalStrength: 79,
        },
        summary: {
          headline: 'Production is running hot',
          rationale: 'The player is stacking high-end outcomes on consistent volume.',
          recommendation: 'Start confidently while the heater holds.',
        },
      }),
    ])

    runMetaAnalysisMock.mockResolvedValue({
      draftStrategyShifts: [
        {
          strategyType: 'ZeroRB',
          strategyLabel: 'Zero RB / Defer primary',
          sport: 'NFL',
          leagueFormat: 'dynasty_sf',
          usageRate: 0.31,
          successRate: 0.58,
          trendingDirection: 'Rising',
          sampleSize: 112,
          shiftLabel: 'Zero RB priority rising',
          recentUsageRate: 0.34,
          baselineUsageRate: 0.28,
          usageDelta: 0.06,
          recentSuccessRate: 0.59,
          baselineSuccessRate: 0.55,
          successDelta: 0.04,
          earlyRoundFocus: ['WR'],
          supportingSignals: ['Managers are pushing RBs down'],
          signalStrength: 78,
          confidence: 0.81,
          summary: 'WR-heavy openings are outperforming baseline.',
        },
      ],
      positionValueChanges: [
        {
          position: 'WR',
          sport: 'NFL',
          avgValueGiven: 6.1,
          avgValueReceived: 7.5,
          sampleSize: 55,
          marketTrend: 'Rising',
          direction: 'Rising',
          draftShare: 0.26,
          priorDraftShare: 0.18,
          draftShareDelta: 0.08,
          rosterPressure: 0.31,
          tradeDemandScore: 12.4,
          valueScore: 74,
          confidence: 0.77,
          summary: 'WR is gaining value across active leagues.',
        },
      ],
      waiverStrategyTrends: [
        {
          sport: 'NFL',
          addCount: 18,
          dropCount: 11,
          windowDays: 7,
          netAdds: 7,
          addRatePerDay: 2.57,
          dropRatePerDay: 1.57,
          primaryPosition: 'RB',
          topAddPositions: ['RB', 'WR'],
          faabAggression: 11.2,
          churnRate: 0.61,
          streamingScore: 71,
          trendDirection: 'Rising',
          confidence: 0.83,
          summary: 'Managers are streaming RB depth aggressively.',
        },
      ],
      overviewCards: [
        {
          id: 'meta-card',
          label: 'Draft Shift',
          value: 'Zero RB',
          detail: 'Usage climbing',
          tone: 'positive',
        },
      ],
      headlines: [
        {
          id: 'headline-1',
          category: 'draft',
          title: 'WR starts are winning',
          summary: 'WR-heavy openings are beating the field.',
          confidence: 0.82,
        },
      ],
      sourceCoverage: {
        analysisMode: 'time_window',
        windowDays: 14,
        leaguesAnalyzed: 18,
        seasonsAnalyzed: [2026],
        strategyReportCount: 8,
        draftFactCount: 320,
        rosterSnapshotCount: 180,
        standingFactCount: 120,
        tradeCount: 42,
        tradeInsightCount: 11,
        waiverTransactionCount: 55,
        waiverClaimCount: 61,
        transactionFactCount: 140,
      },
      sport: 'NFL',
      generatedAt: '2026-03-26T10:00:00.000Z',
    })

    getDynastyProjectionsForLeagueMock.mockResolvedValue([
      {
        projectionId: 'dyn-1',
        teamId: 'team-a',
        leagueId: 'lg-1',
        sport: 'NFL',
        championshipWindowScore: 82,
        rebuildProbability: 18,
        rosterStrength3Year: 86,
        rosterStrength5Year: 79,
        agingRiskScore: 38,
        futureAssetScore: 74,
        season: 2026,
        createdAt: '2026-03-26T09:00:00.000Z',
      },
      {
        projectionId: 'dyn-2',
        teamId: 'team-b',
        leagueId: 'lg-1',
        sport: 'NFL',
        championshipWindowScore: 58,
        rebuildProbability: 61,
        rosterStrength3Year: 63,
        rosterStrength5Year: 71,
        agingRiskScore: 66,
        futureAssetScore: 82,
        season: 2026,
        createdAt: '2026-03-26T09:00:00.000Z',
      },
    ])

    getSimulationSummaryForAIMock.mockResolvedValue({
      matchupResults: [
        {
          simulationId: 'sim-1',
          leagueId: 'lg-1',
          weekOrPeriod: 5,
          teamAId: 'team-a',
          teamBId: 'team-c',
          expectedScoreA: 128.4,
          expectedScoreB: 117.1,
          winProbabilityA: 0.71,
          winProbabilityB: 0.29,
          iterations: 2000,
          createdAt: new Date('2026-03-26T08:00:00.000Z'),
        },
      ],
      seasonResults: [
        {
          resultId: 'season-1',
          leagueId: 'lg-1',
          teamId: 'team-a',
          season: 2026,
          weekOrPeriod: 5,
          playoffProbability: 0.84,
          championshipProbability: 0.25,
          expectedWins: 10.8,
          expectedRank: 1.4,
          simulationsRun: 5000,
        },
      ],
    })
  })

  it('combines all systems into one synthesized global fantasy response', async () => {
    const { getGlobalFantasyInsights } = await import('@/lib/global-fantasy-intelligence')

    const result = await getGlobalFantasyInsights({
      sport: 'NFL',
      leagueId: 'lg-1',
      season: 2026,
      weekOrPeriod: 5,
      trendLimit: 10,
      metaWindowDays: 14,
      leagueFormat: 'dynasty_sf',
    })

    expect(getTrendFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({ sport: 'NFL', limit: 10 })
    )
    expect(getDynastyProjectionsForLeagueMock).toHaveBeenCalledWith('lg-1', 'NFL')
    expect(getSimulationSummaryForAIMock).toHaveBeenCalledWith('lg-1', 'NFL', 2026, 5)

    expect(result.sport).toBe('NFL')
    expect(result.summary).toContain('Sky Moore')
    expect(result.overviewCards).toHaveLength(4)
    expect(result.headlines.some((headline) => headline.category === 'cross_system')).toBe(true)
    expect(result.actionItems.some((item) => item.category === 'meta' && item.relatedEntity === 'WR')).toBe(true)
    expect(result.systemScores.opportunityIndex).toBeGreaterThan(0)
    expect(result.sourceStatus.trend).toBe('ready')
    expect(result.sourceStatus.meta).toBe('ready')
    expect(result.sourceStatus.dynasty).toBe('ready')
    expect(result.sourceStatus.simulation).toBe('ready')
    expect(result.dynasty.topWindowTeamId).toBe('team-a')
    expect(result.simulation.topPlayoffOddsTeamId).toBe('team-a')
  })

  it('marks dynasty and simulation as unavailable when league context is missing', async () => {
    const { getGlobalFantasyInsights } = await import('@/lib/global-fantasy-intelligence')

    const result = await getGlobalFantasyInsights({
      sport: 'NFL',
      trendLimit: 8,
    })

    expect(getDynastyProjectionsForLeagueMock).not.toHaveBeenCalled()
    expect(getSimulationSummaryForAIMock).not.toHaveBeenCalled()
    expect(result.sourceStatus.dynasty).toBe('unavailable')
    expect(result.sourceStatus.simulation).toBe('unavailable')
    expect(result.summary).toContain('Add league context')
  })

  it('isolates source failures while preserving the remaining global insight output', async () => {
    getTrendFeedMock.mockRejectedValueOnce(new Error('trend offline'))
    getSimulationSummaryForAIMock.mockRejectedValueOnce(new Error('simulation offline'))

    const { getGlobalFantasyInsights } = await import('@/lib/global-fantasy-intelligence')
    const result = await getGlobalFantasyInsights({
      sport: 'NFL',
      leagueId: 'lg-1',
      season: 2026,
      weekOrPeriod: 5,
    })

    expect(result.sourceStatus.trend).toBe('error')
    expect(result.sourceStatus.simulation).toBe('error')
    expect(result.sourceStatus.meta).toBe('ready')
    expect(result.sourceStatus.dynasty).toBe('ready')
    expect(result.meta.topHeadline?.title).toBe('WR starts are winning')
    expect(result.dynasty.topWindowTeamId).toBe('team-a')
  })
})
