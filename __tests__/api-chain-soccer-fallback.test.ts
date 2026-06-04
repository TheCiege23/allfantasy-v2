import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const findFirstMock = vi.fn()
const findUniqueMock = vi.fn()
const upsertMock = vi.fn()

const rollingInsightsProviderMock = vi.fn()
const theSportsDbSupportsMock = vi.fn()
const theSportsDbFetchMock = vi.fn()
const apiSportsSupportsMock = vi.fn()
const apiSportsFetchMock = vi.fn()
const clearSportsSupportsMock = vi.fn()
const clearSportsFetchMock = vi.fn()
const cfbdSupportsMock = vi.fn()
const cfbdFetchMock = vi.fn()
const persistNormalizedSportsRowsMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sportsDataCache: {
      findFirst: findFirstMock,
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}))

vi.mock('@/lib/workers/providers/rolling-insights', () => ({
  rollingInsightsProvider: rollingInsightsProviderMock,
}))

vi.mock('@/lib/workers/providers/thesportsdb', () => ({
  theSportsDbProvider: {
    name: 'thesportsdb',
    supports: theSportsDbSupportsMock,
    fetch: theSportsDbFetchMock,
  },
}))

vi.mock('@/lib/workers/providers/api-sports', () => ({
  apiSportsProvider: {
    name: 'api_sports',
    supports: apiSportsSupportsMock,
    fetch: apiSportsFetchMock,
  },
}))

vi.mock('@/lib/workers/providers/clearsports', () => ({
  clearSportsProvider: {
    name: 'clearsports',
    supports: clearSportsSupportsMock,
    fetch: clearSportsFetchMock,
  },
}))

vi.mock('@/lib/workers/providers/cfbd', () => ({
  cfbdProvider: {
    name: 'cfbd',
    supports: cfbdSupportsMock,
    fetch: cfbdFetchMock,
  },
}))

vi.mock('@/lib/workers/sports-cache-persist', () => ({
  persistNormalizedSportsRows: persistNormalizedSportsRowsMock,
}))

describe('api-chain soccer fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findFirstMock.mockResolvedValue(null)
    findUniqueMock.mockResolvedValue(null)
    upsertMock.mockResolvedValue({})
    persistNormalizedSportsRowsMock.mockResolvedValue(undefined)
    theSportsDbSupportsMock.mockReturnValue(false)
    theSportsDbFetchMock.mockResolvedValue(null)
    apiSportsSupportsMock.mockReturnValue(false)
    apiSportsFetchMock.mockResolvedValue(null)
    clearSportsSupportsMock.mockReturnValue(false)
    clearSportsFetchMock.mockResolvedValue(null)
    cfbdSupportsMock.mockReturnValue(false)
    cfbdFetchMock.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('falls back to api-sports for soccer players when RI is unavailable', async () => {
    rollingInsightsProviderMock.mockResolvedValue({
      data: null,
      error: 'RI soccer players unavailable',
      fromCache: false,
      source: 'rolling_insights',
      latency: 0,
    })

    apiSportsSupportsMock.mockReturnValue(true)
    apiSportsFetchMock.mockResolvedValue([
      { id: 'soc-1', name: 'Player One' },
      { id: 'soc-2', name: 'Player Two' },
    ])

    const { fetchWithChain } = await import('@/lib/workers/api-chain')

    const result = await fetchWithChain({
      sport: 'soccer_euro',
      dataType: 'players',
    })

    expect(rollingInsightsProviderMock).toHaveBeenCalledTimes(1)
    expect(theSportsDbSupportsMock).toHaveBeenCalledTimes(1)
    expect(apiSportsSupportsMock).toHaveBeenCalledTimes(1)
    expect(apiSportsFetchMock).toHaveBeenCalledTimes(1)

    expect(result.fromCache).toBe(false)
    expect(result.source).toBe('api_sports')
    expect(Array.isArray(result.data)).toBe(true)
    expect((result.data as unknown[]).length).toBe(2)
  })

  it('keeps NFL players on RI when RI returns data', async () => {
    rollingInsightsProviderMock.mockResolvedValue({
      data: [{ id: 'nfl-1', name: 'NFL Player' }],
      error: undefined,
      fromCache: false,
      source: 'rolling_insights',
      latency: 12,
    })

    apiSportsSupportsMock.mockReturnValue(true)

    const { fetchWithChain } = await import('@/lib/workers/api-chain')

    const result = await fetchWithChain({
      sport: 'nfl',
      dataType: 'players',
    })

    expect(rollingInsightsProviderMock).toHaveBeenCalledTimes(1)
    expect(apiSportsSupportsMock).not.toHaveBeenCalled()
    expect(apiSportsFetchMock).not.toHaveBeenCalled()

    expect(result.fromCache).toBe(false)
    expect(result.source).toBe('rolling_insights')
    expect(Array.isArray(result.data)).toBe(true)
    expect((result.data as unknown[]).length).toBe(1)
  })

  it('falls back to api-sports for live score data types when RI fails', async () => {
    rollingInsightsProviderMock.mockResolvedValue({
      data: null,
      error: 'temporary upstream issue',
      fromCache: false,
      source: 'rolling_insights',
      latency: 25,
    })

    apiSportsSupportsMock.mockReturnValue(true)
    apiSportsFetchMock.mockResolvedValue([{ id: 'game-1' }])

    const { fetchWithChain } = await import('@/lib/workers/api-chain')

    const result = await fetchWithChain({
      sport: 'nfl',
      dataType: 'scores',
    })

    expect(rollingInsightsProviderMock).toHaveBeenCalledTimes(1)
    expect(apiSportsSupportsMock).toHaveBeenCalledTimes(1)
    expect(apiSportsFetchMock).toHaveBeenCalledTimes(1)

    expect(result.fromCache).toBe(false)
    expect(result.source).toBe('api_sports')
    expect(result.data).toEqual([{ id: 'game-1' }])
  })

  it('builds deterministic cache keys that include query and options', async () => {
    const { buildApiChainCacheKey } = await import('@/lib/workers/api-chain')

    const a = buildApiChainCacheKey({
      sport: 'nba',
      dataType: 'players',
      query: { playerName: 'Jalen Brunson', filters: { team: 'NYK', active: true } },
      options: { limit: 10 },
    })
    const b = buildApiChainCacheKey({
      sport: 'nba',
      dataType: 'players',
      query: { filters: { active: true, team: 'NYK' }, playerName: 'Jalen Brunson' },
      options: { limit: 10 },
    })
    const c = buildApiChainCacheKey({
      sport: 'nba',
      dataType: 'players',
      query: { playerName: 'Jayson Tatum', filters: { team: 'BOS', active: true } },
      options: { limit: 10 },
    })
    const d = buildApiChainCacheKey({
      sport: 'mlb',
      dataType: 'players',
      query: { playerName: 'Jalen Brunson', filters: { team: 'NYK', active: true } },
      options: { limit: 10 },
    })

    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toBe(d)
  })

  it('does not collide cache rows between team, player, and news searches', async () => {
    const { buildApiChainCacheKey } = await import('@/lib/workers/api-chain')

    const keys = new Set([
      buildApiChainCacheKey({ sport: 'mlb', dataType: 'players', query: { search: 'Judge' } }),
      buildApiChainCacheKey({ sport: 'mlb', dataType: 'teams', query: { search: 'Yankees' } }),
      buildApiChainCacheKey({ sport: 'mlb', dataType: 'news', query: { search: 'Yankees' } }),
      buildApiChainCacheKey({ sport: 'mlb', dataType: 'news', query: { search: 'Mets' } }),
    ])

    expect(keys.size).toBe(4)
  })

  it('falls back to CFBD for lowercase ncaaf schedules when earlier providers are empty', async () => {
    rollingInsightsProviderMock.mockResolvedValue({
      data: null,
      error: 'RI unavailable',
      fromCache: false,
      source: 'rolling_insights',
      latency: 0,
    })
    theSportsDbSupportsMock.mockReturnValue(false)
    apiSportsSupportsMock.mockReturnValue(false)
    clearSportsSupportsMock.mockReturnValue(false)
    cfbdSupportsMock.mockReturnValue(true)
    cfbdFetchMock.mockResolvedValue([{ id: 'cfbd-1', homeTeam: 'Michigan', awayTeam: 'Ohio State' }])

    const { fetchWithChain } = await import('@/lib/workers/api-chain')

    const result = await fetchWithChain({
      sport: 'ncaaf',
      dataType: 'schedule',
      query: { season: '2026' },
    })

    expect(cfbdSupportsMock).toHaveBeenCalledWith(expect.objectContaining({ sport: 'ncaaf' }))
    expect(cfbdFetchMock).toHaveBeenCalledTimes(1)
    expect(result.source).toBe('cfbd')
    expect(result.data).toEqual([{ id: 'cfbd-1', homeTeam: 'Michigan', awayTeam: 'Ohio State' }])
  })
})
