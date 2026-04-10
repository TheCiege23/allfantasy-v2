import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockNextRequest } from '@/__tests__/helpers/createMockNextRequest'

const readPlayerValuationsFromDbMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/player-valuation-features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/player-valuation-features')>()
  return {
    ...actual,
    readPlayerValuationsFromDb: readPlayerValuationsFromDbMock,
  }
})

const samplePlayers = [
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
    rawStats: { receiving_yards: 1400 },
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
    rawStats: { receiving_yards: 1350 },
    valuationVersion: '1.0',
    syncedAt: '2026-04-08T00:00:00.000Z',
  },
]

describe('GET /api/player-valuations/compact contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns compact payload with default field set', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce({
      players: samplePlayers,
      stale: false,
      syncedAt: '2026-04-08T00:00:00.000Z',
      expiresAt: '2026-04-08T06:00:00.000Z',
    })

    const { GET } = await import('@/app/api/player-valuations/compact/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations/compact?sport=nfl&limit=1')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.format).toBe('compact')
    expect(body.players).toHaveLength(1)
    expect(body.players[0]).toHaveProperty('id')
    expect(body.players[0]).toHaveProperty('v')
    expect(body.players[0]).not.toHaveProperty('rawStats')
  })

  it('supports field mask via fields query param', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce({
      players: samplePlayers,
      stale: false,
      syncedAt: '2026-04-08T00:00:00.000Z',
      expiresAt: '2026-04-08T06:00:00.000Z',
    })

    const { GET } = await import('@/app/api/player-valuations/compact/route')
    const req = createMockNextRequest(
      'http://localhost/api/player-valuations/compact?sport=nfl&fields=id,n,v,t,adp'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fields).toEqual(['id', 'n', 'v', 't', 'adp'])
    expect(Object.keys(body.players[0])).toEqual(['id', 'n', 'v', 't', 'adp'])
  })

  it('still includes id when invalid/empty field mask is provided', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce({
      players: samplePlayers,
      stale: false,
      syncedAt: '2026-04-08T00:00:00.000Z',
      expiresAt: '2026-04-08T06:00:00.000Z',
    })

    const { GET } = await import('@/app/api/player-valuations/compact/route')
    const req = createMockNextRequest(
      'http://localhost/api/player-valuations/compact?sport=nfl&fields=foo,bar,baz'
    )
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fields).toContain('id')
    expect(body.players[0]).toHaveProperty('id')
  })

  it('returns 400 for unsupported sport', async () => {
    const { GET } = await import('@/app/api/player-valuations/compact/route')
    const req = createMockNextRequest(
      'http://localhost/api/player-valuations/compact?sport=xyz_not_a_real_sport_12345'
    )
    const res = await GET(req)

    expect(res.status).toBe(400)
  })

  it('returns 503 when valuation cache is empty', async () => {
    readPlayerValuationsFromDbMock.mockResolvedValueOnce({
      players: [],
      stale: false,
      syncedAt: null,
      expiresAt: null,
    })

    const { GET } = await import('@/app/api/player-valuations/compact/route')
    const req = createMockNextRequest('http://localhost/api/player-valuations/compact?sport=nfl')
    const res = await GET(req)

    expect(res.status).toBe(503)
  })
})
