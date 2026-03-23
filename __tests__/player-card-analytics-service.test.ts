import { beforeEach, describe, expect, it, vi } from 'vitest'

const playerFindFirstMock = vi.fn()
const playerCareerProjectionFindFirstMock = vi.fn()
const playerMetaTrendFindUniqueMock = vi.fn()
const openaiChatTextMock = vi.fn()
const getPlayerMetaTrendsForMetaMock = vi.fn()
const getPlayerAnalyticsMock = vi.fn()
const getTrendFeedItemForPlayerMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findFirst: playerFindFirstMock,
    },
    playerCareerProjection: {
      findFirst: playerCareerProjectionFindFirstMock,
    },
    playerMetaTrend: {
      findUnique: playerMetaTrendFindUniqueMock,
    },
  },
}))

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

vi.mock('@/lib/global-meta-engine/MetaQueryService', () => ({
  getPlayerMetaTrendsForMeta: getPlayerMetaTrendsForMetaMock,
}))

vi.mock('@/lib/player-analytics', () => ({
  getPlayerAnalytics: getPlayerAnalyticsMock,
}))

vi.mock('@/lib/player-trend/TrendDetectionService', () => ({
  getTrendFeedItemForPlayer: getTrendFeedItemForPlayerMock,
}))

describe('PlayerCardAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPlayerMetaTrendsForMetaMock.mockResolvedValue([])
    getTrendFeedItemForPlayerMock.mockResolvedValue(null)
    playerFindFirstMock.mockResolvedValue(null)
    playerCareerProjectionFindFirstMock.mockResolvedValue(null)
    playerMetaTrendFindUniqueMock.mockResolvedValue(null)
  })

  it('returns all analytics sections when core data exists', async () => {
    const { getPlayerCardAnalytics } = await import('@/lib/player-card-analytics/PlayerCardAnalyticsService')

    playerFindFirstMock.mockResolvedValueOnce({ id: 'p-1' })
    getPlayerAnalyticsMock.mockResolvedValueOnce({
      position: 'WR',
      currentTeam: 'MIA',
      fantasyPointsPerGame: 16.2,
      expectedFantasyPoints: 275.4,
      expectedFantasyPointsPerGame: 17.8,
      draft: { currentAdp: 14.5 },
      weeklyVolatility: 22,
    })
    playerMetaTrendFindUniqueMock.mockResolvedValueOnce({
      playerId: 'p-1',
      sport: 'NFL',
      trendScore: 88,
      addRate: 0.22,
      dropRate: 0.03,
      tradeInterest: 0.19,
      draftFrequency: 0.71,
      trendingDirection: 'Rising',
      updatedAt: new Date('2026-03-22T12:00:00.000Z'),
    })
    playerCareerProjectionFindFirstMock.mockResolvedValueOnce({
      projectedPointsYear1: 260,
      projectedPointsYear2: 252,
      projectedPointsYear3: 238,
      projectedPointsYear4: 220,
      projectedPointsYear5: 198,
      breakoutProbability: 62,
      declineProbability: 28,
      volatilityScore: 34,
      season: 2026,
    })
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'Target confidently in the mid rounds due to stable volume and rising trend metrics.',
    })

    const payload = await getPlayerCardAnalytics({
      playerName: 'Tyreek Hill',
      sport: 'NFL',
      season: '2026',
    })

    expect(payload.playerId).toBe('p-1')
    expect(payload.playerName).toBe('Tyreek Hill')
    expect(payload.sport).toBe('NFL')
    expect(payload.metaTrends?.tradeRate).toBe(0.19)
    expect(payload.matchupPrediction?.opponentTier).toBe('favorable')
    expect(payload.careerProjection?.projectedPointsYear1).toBe(260)
    expect(payload.aiInsights).toContain('Target confidently')
    expect(getPlayerMetaTrendsForMetaMock).not.toHaveBeenCalled()
  })

  it('falls back to list-based meta matching and deterministic insight copy', async () => {
    const { getPlayerCardAnalytics } = await import('@/lib/player-card-analytics/PlayerCardAnalyticsService')

    getPlayerAnalyticsMock.mockResolvedValueOnce({
      position: 'PG',
      currentTeam: 'BOS',
      fantasyPointsPerGame: null,
      expectedFantasyPoints: null,
      expectedFantasyPointsPerGame: 8.4,
      draft: { currentAdp: null },
      weeklyVolatility: 72,
    })
    getPlayerMetaTrendsForMetaMock.mockResolvedValueOnce([
      {
        playerId: 'jayson tatum',
        sport: 'NBA',
        trendScore: 41,
        addRate: 0.04,
        dropRate: 0.12,
        tradeRate: 0.03,
        draftRate: 0.51,
        trendingDirection: 'Falling',
        updatedAt: new Date('2026-03-22T12:00:00.000Z'),
      },
    ])
    openaiChatTextMock.mockResolvedValueOnce({ ok: false, text: '' })

    const payload = await getPlayerCardAnalytics({
      playerName: 'Jayson Tatum',
      sport: 'NBA',
      season: '2026',
    })

    expect(payload.metaTrends?.trendingDirection).toBe('Falling')
    expect(payload.matchupPrediction?.opponentTier).toBe('tough')
    expect(payload.aiInsights).toContain('Jayson Tatum is currently trending')
  })
})
