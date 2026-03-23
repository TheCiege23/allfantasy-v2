import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPlayerCardAnalyticsMock = vi.fn()

vi.mock('@/lib/player-card-analytics', () => ({
  getPlayerCardAnalytics: getPlayerCardAnalyticsMock,
}))

describe('Player card analytics route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates required playerName and basic payload constraints', async () => {
    const { POST } = await import('@/app/api/player-card-analytics/route')

    const missingNameRes = await POST(
      new Request('http://localhost/api/player-card-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: 'NFL' }),
      }) as any
    )
    expect(missingNameRes.status).toBe(400)
    await expect(missingNameRes.json()).resolves.toEqual({ error: 'playerName is required' })

    const badSportRes = await POST(
      new Request('http://localhost/api/player-card-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'Patrick Mahomes', sport: 'invalid' }),
      }) as any
    )
    expect(badSportRes.status).toBe(400)
    await expect(badSportRes.json()).resolves.toEqual({ error: 'Invalid sport' })

    const badSeasonRes = await POST(
      new Request('http://localhost/api/player-card-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'Patrick Mahomes', season: '20A5' }),
      }) as any
    )
    expect(badSeasonRes.status).toBe(400)
    await expect(badSeasonRes.json()).resolves.toEqual({ error: 'Invalid season' })
  })

  it('forwards normalized payload to analytics service', async () => {
    const { POST } = await import('@/app/api/player-card-analytics/route')
    getPlayerCardAnalyticsMock.mockResolvedValueOnce({
      playerId: 'p1',
      playerName: 'Jayson Tatum',
      position: 'SF',
      team: 'BOS',
      sport: 'NBA',
      aiInsights: 'Test',
      metaTrends: null,
      matchupPrediction: null,
      careerProjection: null,
    })

    const res = await POST(
      new Request('http://localhost/api/player-card-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: '  Jayson Tatum  ',
          player_id: 'p1',
          position: ' sf ',
          team: ' bos ',
          sport: 'nba',
          season: '2026',
        }),
      }) as any
    )

    expect(res.status).toBe(200)
    expect(getPlayerCardAnalyticsMock).toHaveBeenCalledWith({
      playerId: 'p1',
      playerName: 'Jayson Tatum',
      position: 'sf',
      team: 'bos',
      sport: 'NBA',
      season: '2026',
    })
  })
})
