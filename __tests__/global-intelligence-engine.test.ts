import { beforeEach, describe, expect, it, vi } from 'vitest'

const leagueFindUniqueMock = vi.fn()
const getAIMetaSummaryMock = vi.fn()
const getSimulationAndWarehouseContextForLeagueMock = vi.fn()
const getLeagueAdvisorAdviceMock = vi.fn()
const listArticlesMock = vi.fn()
const getInsightContextMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
    },
  },
}))

vi.mock('@/lib/global-meta-engine', () => ({
  GlobalMetaEngine: {
    getAIMetaSummary: getAIMetaSummaryMock,
  },
}))

vi.mock('@/lib/ai-simulation-integration/AISimulationQueryService', () => ({
  getSimulationAndWarehouseContextForLeague: getSimulationAndWarehouseContextForLeagueMock,
}))

vi.mock('@/lib/league-advisor', () => ({
  getLeagueAdvisorAdvice: getLeagueAdvisorAdviceMock,
}))

vi.mock('@/lib/sports-media-engine/LeagueMediaEngine', () => ({
  listArticles: listArticlesMock,
}))

vi.mock('@/lib/ai-simulation-integration/AIInsightRouter', () => ({
  getInsightContext: getInsightContextMock,
}))

describe('GlobalIntelligenceEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    leagueFindUniqueMock.mockResolvedValue({ sport: 'nba', season: 2027 })
    getAIMetaSummaryMock.mockResolvedValue({
      summary: 'Meta summary',
      topTrends: ['Trend A', 'Trend B'],
    })
    getSimulationAndWarehouseContextForLeagueMock.mockResolvedValue({
      playoffOddsSummary: 'Playoff odds',
      matchupSummary: 'Matchup summary',
      dynastySummary: 'Dynasty summary',
      warehouseSummary: 'Warehouse summary',
    })
    getLeagueAdvisorAdviceMock.mockResolvedValue({
      lineup: [{ summary: 'Start X', priority: 'high' }],
      trade: [{ summary: 'Trade Y', priority: 'medium' }],
      waiver: [{ summary: 'Add Z', priority: 'low' }],
      injury: [{ summary: 'Monitor A', priority: 'high', playerName: 'A' }],
    })
    listArticlesMock.mockResolvedValue({
      articles: [
        {
          id: 'article-1',
          headline: 'Top Story',
          tags: ['recap'],
          createdAt: new Date('2026-03-22T00:00:00.000Z'),
        },
      ],
    })
    getInsightContextMock.mockResolvedValue('Draft context')
  })

  it('orchestrates all engines into one global response', async () => {
    const { getGlobalIntelligence } = await import(
      '@/lib/global-intelligence/GlobalIntelligenceEngine'
    )
    const result = await getGlobalIntelligence({
      leagueId: 'lg-1',
      userId: 'u-1',
    })

    expect(result.leagueId).toBe('lg-1')
    expect(result.sport).toBe('NBA')
    expect(result.meta).toEqual({
      summary: 'Meta summary',
      topTrends: ['Trend A', 'Trend B'],
    })
    expect(result.simulation).toEqual({
      playoffOddsSummary: 'Playoff odds',
      matchupSummary: 'Matchup summary',
      dynastySummary: 'Dynasty summary',
      warehouseSummary: 'Warehouse summary',
    })
    expect(result.advisor).toEqual({
      lineup: [{ summary: 'Start X', priority: 'high' }],
      trade: [{ summary: 'Trade Y', priority: 'medium' }],
      waiver: [{ summary: 'Add Z', priority: 'low' }],
      injury: [{ summary: 'Monitor A', priority: 'high', playerName: 'A' }],
    })
    expect(result.media).toEqual({
      articles: [
        {
          id: 'article-1',
          headline: 'Top Story',
          tags: ['recap'],
          createdAt: '2026-03-22T00:00:00.000Z',
        },
      ],
    })
    expect(result.draft).toEqual({ context: 'Draft context' })

    expect(getSimulationAndWarehouseContextForLeagueMock).toHaveBeenCalledWith(
      'lg-1',
      { season: 2027, week: 1 }
    )
    expect(getInsightContextMock).toHaveBeenCalledWith('lg-1', 'draft', {
      sport: 'NBA',
      season: 2027,
      week: 1,
    })
  })

  it('respects include filters and only runs requested modules', async () => {
    const { getGlobalIntelligence } = await import(
      '@/lib/global-intelligence/GlobalIntelligenceEngine'
    )
    const result = await getGlobalIntelligence({
      leagueId: 'lg-2',
      include: ['meta', 'draft'],
    })

    expect(result.meta).toEqual({
      summary: 'Meta summary',
      topTrends: ['Trend A', 'Trend B'],
    })
    expect(result.draft).toEqual({ context: 'Draft context' })
    expect(result.simulation).toBeNull()
    expect(result.advisor).toBeNull()
    expect(result.media).toBeNull()

    expect(getAIMetaSummaryMock).toHaveBeenCalledTimes(1)
    expect(getInsightContextMock).toHaveBeenCalledTimes(1)
    expect(getSimulationAndWarehouseContextForLeagueMock).not.toHaveBeenCalled()
    expect(getLeagueAdvisorAdviceMock).not.toHaveBeenCalled()
    expect(listArticlesMock).not.toHaveBeenCalled()
  })

  it('uses explicit season and week overrides for simulation and draft', async () => {
    const { getGlobalIntelligence } = await import(
      '@/lib/global-intelligence/GlobalIntelligenceEngine'
    )
    await getGlobalIntelligence({
      leagueId: 'lg-3',
      include: ['simulation', 'draft'],
      season: 2030,
      week: 4,
    })

    expect(getSimulationAndWarehouseContextForLeagueMock).toHaveBeenCalledWith(
      'lg-3',
      { season: 2030, week: 4 }
    )
    expect(getInsightContextMock).toHaveBeenCalledWith('lg-3', 'draft', {
      sport: 'NBA',
      season: 2030,
      week: 4,
    })
  })

  it('isolates module failures and returns section-level errors', async () => {
    const { getGlobalIntelligence } = await import(
      '@/lib/global-intelligence/GlobalIntelligenceEngine'
    )
    getSimulationAndWarehouseContextForLeagueMock.mockRejectedValueOnce(
      new Error('sim failed')
    )

    const result = await getGlobalIntelligence({
      leagueId: 'lg-4',
      include: ['simulation'],
    })

    expect(result.meta).toBeNull()
    expect(result.advisor).toBeNull()
    expect(result.media).toBeNull()
    expect(result.draft).toBeNull()
    expect(result.simulation).toEqual({
      playoffOddsSummary: null,
      matchupSummary: null,
      dynastySummary: null,
      warehouseSummary: null,
      error: 'sim failed',
    })
  })
})
