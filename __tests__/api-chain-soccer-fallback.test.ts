import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const findFirstMock = vi.fn()
const findUniqueMock = vi.fn()
const upsertMock = vi.fn()

const rollingInsightsProviderMock = vi.fn()
const apiSportsSupportsMock = vi.fn()
const apiSportsFetchMock = vi.fn()
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

vi.mock('@/lib/workers/providers/api-sports', () => ({
  apiSportsProvider: {
    name: 'api_sports',
    supports: apiSportsSupportsMock,
    fetch: apiSportsFetchMock,
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
})
