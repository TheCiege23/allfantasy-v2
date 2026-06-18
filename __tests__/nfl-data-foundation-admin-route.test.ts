import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdminOrBearer: vi.fn(),
  getCanonicalNflDataCoverage: vi.fn(),
}))

vi.mock('@/lib/adminAuth', () => ({
  requireAdminOrBearer: mocks.requireAdminOrBearer,
}))

vi.mock('@/lib/nfl-data-foundation/nflDataCoverage', () => ({
  getCanonicalNflDataCoverage: mocks.getCanonicalNflDataCoverage,
}))

function req(url: string) {
  return new NextRequest(url)
}

describe('/api/admin/nfl-data-foundation/audit', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.requireAdminOrBearer.mockResolvedValue({ ok: true, user: { id: 'admin-1' } })
    mocks.getCanonicalNflDataCoverage.mockResolvedValue({
      sport: 'NFL',
      season: 2026,
      week: 3,
      hasPlayers: true,
      hasTeams: true,
      hasSchedule: true,
      hasDepthCharts: true,
      hasSeasonStats: true,
      hasInjuries: true,
      hasWeeklyProjections: true,
      hasRosProjections: false,
      hasTradeValues: true,
      missingFields: ['ROS projections'],
      staleFields: [],
      lastFetchedAt: {},
      counts: { players: 500 },
      generatedAt: '2026-09-01T00:00:00.000Z',
    })
  })

  it('rejects unauthenticated/non-admin callers', async () => {
    mocks.requireAdminOrBearer.mockResolvedValueOnce({
      ok: false,
      res: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    })
    const { GET } = await import('@/app/api/admin/nfl-data-foundation/audit/route')

    const response = await GET(req('http://localhost/api/admin/nfl-data-foundation/audit'))

    expect(response.status).toBe(401)
    expect(mocks.getCanonicalNflDataCoverage).not.toHaveBeenCalled()
  })

  it('returns read-only coverage with season and week filters', async () => {
    const { GET } = await import('@/app/api/admin/nfl-data-foundation/audit/route')

    const response = await GET(req('http://localhost/api/admin/nfl-data-foundation/audit?season=2026&week=3'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.getCanonicalNflDataCoverage).toHaveBeenCalledWith({ season: 2026, week: 3 })
    expect(body.ok).toBe(true)
    expect(body.coverage.counts.players).toBe(500)
    expect(JSON.stringify(body)).not.toMatch(/ROLLING_INSIGHTS|API_KEY|SECRET|sk-/i)
  })
})
