import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const readPlayerValuationsFromDbMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/player-valuation-features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/player-valuation-features')>()
  return {
    ...actual,
    readPlayerValuationsFromDb: readPlayerValuationsFromDbMock,
  }
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleNflPlayers = [
  {
    playerId: 'ri-001',
    name: 'Justin Jefferson',
    sport: 'nfl',
    position: 'WR',
    team: 'MIN',
    value: 9200,
    tier: 'S',
    trend: 'up',
    opportunityScore: 90,
    healthScore: 100,
    recentFormScore: 75,
    adp: 3,
    rawStats: { receiving_yards: 1400, receiving_tds: 10, receptions: 102 },
    valuationVersion: '1.0',
    syncedAt: '2026-04-08T00:00:00.000Z',
  },
  {
    playerId: 'ri-002',
    name: 'CeeDee Lamb',
    sport: 'nfl',
    position: 'WR',
    team: 'DAL',
    value: 8900,
    tier: 'S',
    trend: 'flat',
    opportunityScore: 88,
    healthScore: 100,
    recentFormScore: 50,
    adp: 5,
    rawStats: { receiving_yards: 1350, receiving_tds: 12, receptions: 135 },
    valuationVersion: '1.0',
    syncedAt: '2026-04-08T00:00:00.000Z',
  },
]

const freshCacheResult = {
  players: sampleNflPlayers,
  stale: false,
  syncedAt: '2026-04-08T00:00:00.000Z',
  expiresAt: '2026-04-08T06:00:00.000Z',
}

const staleCacheResult = {
  players: sampleNflPlayers,
  stale: true,
  syncedAt: '2026-04-07T00:00:00.000Z',
  expiresAt: '2026-04-07T06:00:00.000Z',
}

const emptyCacheResult = {
  players: [],
  stale: false,
  syncedAt: null,
  expiresAt: null,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/player-valuations contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns player valuations for a valid sport', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(freshCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nfl&limit=10')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sport).toBe('nfl')
    expect(body.source).toBe('player-valuations-db')
    expect(body.stale).toBe(false)
    expect(body.players).toHaveLength(2)
    expect(body.players[0].name).toBe('Justin Jefferson')
    expect(body.syncedAt).toBe('2026-04-08T00:00:00.000Z')
  })

  it('returns stale source label when cache is stale', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(staleCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nfl')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('player-valuations-db-stale')
    expect(body.stale).toBe(true)
    expect(body.players.length).toBeGreaterThan(0)
  })

  it('returns 503 when cache is empty', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(emptyCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nba')
    const res = await GET(req)

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/cache is empty/i)
    expect(body.sport).toBe('nba')
  })

  it('returns 400 for missing sport param', async () => {
    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations')
    const res = await GET(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid or missing sport/i)
  })

  it('returns 400 for unsupported sport', async () => {
    const { GET } = await import('@/app/api/player-valuations/route')
    // Use a string that cannot possibly map to any ApiChainSport
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=xyz_not_a_real_sport_12345')
    const res = await GET(req)

    expect(res.status).toBe(400)
  })

  it('passes position filter to readPlayerValuationsFromDb', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce({
      ...freshCacheResult,
      players: [sampleNflPlayers[0]],
    })

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nfl&position=WR&limit=25')
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(readPlayerValuationsFromDbMock).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({ position: 'WR', limit: 25, sortBy: 'value' })
    )
  })

  it('passes sortBy=adp to readPlayerValuationsFromDb', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(freshCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nfl&sortBy=adp')
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(readPlayerValuationsFromDbMock).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({ sortBy: 'adp' })
    )
  })

  it('filters by tier when tier param is set', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(freshCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nfl&tier=S')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    // Both fixture players are tier S — should pass through
    expect(body.players.every((p: { tier: string }) => p.tier === 'S')).toBe(true)
  })

  it('returns 500 on unexpected error', async () => {
    readPlayerValuationsFromDbMock.mockRejectedValueOnce(new Error('db timeout'))

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations?sport=nfl')
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed to read/i)
  })

  it('action=health returns health-focused view', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(freshCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest(
      'http://localhost/api/player-valuations?sport=nfl&action=health'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    const first = body.players[0]
    expect(first).toHaveProperty('healthScore')
    expect(first).toHaveProperty('injuryTier')
    expect(first).not.toHaveProperty('rawStats')
  })

  it('action=compact returns token-efficient payload without rawStats', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(freshCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest(
      'http://localhost/api/player-valuations?sport=nfl&action=compact&limit=1'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('compact')
    expect(body.players).toHaveLength(1)
    expect(body.players[0]).toHaveProperty('id')
    expect(body.players[0]).toHaveProperty('v')
    expect(body.players[0]).not.toHaveProperty('rawStats')
  })

  it('compact=true toggle returns compact payload', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce(freshCacheResult)

    const { GET } = await import('@/app/api/player-valuations/route')
    const req = createMockNextRequest(
      'http://localhost/api/player-valuations?sport=nfl&compact=true&limit=1'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('compact')
    expect(body.players[0]).toHaveProperty('id')
    expect(body.players[0]).toHaveProperty('tr')
  })
})

// ─── computePlayerValuation unit tests ───────────────────────────────────────

describe('computePlayerValuation', () => {
  it('scores a healthy NFL WR correctly', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const val = computePlayerValuation({
      playerId: 'p1',
      name: 'Test WR',
      sport: 'nfl',
      position: 'WR',
      team: 'SF',
      stats: { receiving_yards: 1200, receiving_tds: 10, receptions: 100 },
      injuryStatus: 'active',
      adp: 10,
      syncedAt: new Date().toISOString(),
    })

    expect(val.value).toBeGreaterThan(0)
    expect(val.healthScore).toBe(100)
    expect(val.tier).toMatch(/^[SABCD]$/)
    expect(val.valuationVersion).toBe('1.0')
  })

  it('applies injury discount for doubtful player', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const healthy = computePlayerValuation({
      playerId: 'p2',
      name: 'Healthy RB',
      sport: 'nfl',
      position: 'RB',
      team: 'KC',
      stats: { rushing_yards: 1000, rushing_tds: 10 },
      injuryStatus: 'active',
      adp: 5,
      syncedAt: new Date().toISOString(),
    })
    const doubtful = computePlayerValuation({
      playerId: 'p2',
      name: 'Injured RB',
      sport: 'nfl',
      position: 'RB',
      team: 'KC',
      stats: { rushing_yards: 1000, rushing_tds: 10 },
      injuryStatus: 'doubtful',
      adp: 5,
      syncedAt: new Date().toISOString(),
    })
    expect(doubtful.value).toBeLessThan(healthy.value)
    expect(doubtful.healthScore).toBe(25)
  })

  it('assigns tier D to a zero-stats player', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const val = computePlayerValuation({
      playerId: 'p3',
      name: 'Unknown',
      sport: 'nba',
      position: 'SF',
      team: 'BOS',
      stats: {},
      syncedAt: new Date().toISOString(),
    })
    expect(val.tier).toBe('D')
    expect(val.value).toBe(0)
  })

  it('computes NHL goalie value from save_percentage', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const val = computePlayerValuation({
      playerId: 'p4',
      name: 'Goalie Joe',
      sport: 'nhl',
      position: 'G',
      team: 'VGK',
      stats: { wins: 30, saves: 900, save_percentage: 0.915, shutouts: 4 },
      syncedAt: new Date().toISOString(),
    })
    expect(val.value).toBeGreaterThan(0)
    expect(val.healthScore).toBe(100)
  })

  it('scores NFL IDP linebacker from defensive stats', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const val = computePlayerValuation({
      playerId: 'idp1',
      name: 'IDP LB',
      sport: 'nfl',
      position: 'LB',
      team: 'PIT',
      stats: {
        solo_tackles: 90,
        assisted_tackles: 35,
        tackles_for_loss: 14,
        sacks: 8,
        forced_fumbles: 3,
        interceptions: 2,
      },
      injuryStatus: 'active',
      adp: 75,
      syncedAt: new Date().toISOString(),
    })

    expect(val.value).toBeGreaterThan(0)
    expect(val.opportunityScore).toBeGreaterThan(0)
    expect(val.tier).toMatch(/^[SABCD]$/)
  })

  it('gives better opportunity score for lower ADP', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const lowAdp = computePlayerValuation({
      playerId: 'adp-low',
      name: 'Low ADP',
      sport: 'nfl',
      position: 'WR',
      team: 'LAR',
      stats: { receiving_yards: 800, receiving_tds: 6, receptions: 70 },
      injuryStatus: 'active',
      adp: 12,
      syncedAt: new Date().toISOString(),
    })

    const highAdp = computePlayerValuation({
      playerId: 'adp-high',
      name: 'High ADP',
      sport: 'nfl',
      position: 'WR',
      team: 'LAR',
      stats: { receiving_yards: 800, receiving_tds: 6, receptions: 70 },
      injuryStatus: 'active',
      adp: 180,
      syncedAt: new Date().toISOString(),
    })

    expect(lowAdp.opportunityScore).toBeGreaterThan(highAdp.opportunityScore)
    expect(lowAdp.value).toBeGreaterThan(highAdp.value)
  })

  it('uses IDP production fallback when ADP is missing', async () => {
    const { computePlayerValuation } = await import('@/lib/player-valuation-features')
    const val = computePlayerValuation({
      playerId: 'idp-no-adp',
      name: 'No ADP LB',
      sport: 'nfl',
      position: 'LB',
      team: 'BAL',
      stats: {
        solo_tackles: 100,
        assisted_tackles: 30,
        tackles_for_loss: 16,
        sacks: 9,
      },
      injuryStatus: 'active',
      adp: null,
      syncedAt: new Date().toISOString(),
    })

    expect(val.opportunityScore).toBeGreaterThan(50)
    expect(val.value).toBeGreaterThan(0)
  })
})
