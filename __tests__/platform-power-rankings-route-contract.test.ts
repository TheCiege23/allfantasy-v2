import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getPlatformPowerLeaderboardMock = vi.fn()

vi.mock('@/lib/platform-power-rankings', () => ({
  getPlatformPowerLeaderboard: getPlatformPowerLeaderboardMock,
}))

describe('Platform power rankings route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates sport query and rejects unsupported sport', async () => {
    const { GET } = await import('@/app/api/platform/power-rankings/route')
    const res = await GET(
      createMockNextRequest('http://localhost/api/platform/power-rankings?sport=INVALID') as any
    )
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid sport' })
  })

  it('forwards normalized query inputs to leaderboard service', async () => {
    const { GET } = await import('@/app/api/platform/power-rankings/route')
    getPlatformPowerLeaderboardMock.mockResolvedValueOnce({
      rows: [],
      total: 0,
      generatedAt: '2026-03-22T00:00:00.000Z',
    })

    const res = await GET(
      createMockNextRequest('http://localhost/api/platform/power-rankings?sport=nba&limit=25&offset=10') as any
    )

    expect(res.status).toBe(200)
    expect(getPlatformPowerLeaderboardMock).toHaveBeenCalledWith({
      sport: 'nba',
      limit: 25,
      offset: 10,
    })
  })
})
