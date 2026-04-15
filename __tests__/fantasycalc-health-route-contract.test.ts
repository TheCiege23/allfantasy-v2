import { beforeEach, describe, expect, it, vi } from 'vitest'

const getFantasyCalcCacheHealthMock = vi.hoisted(() => vi.fn())
const readFantasyCalcValuesFromDbMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/fantasycalc-db', () => ({
  getFantasyCalcCacheHealth: getFantasyCalcCacheHealthMock,
  readFantasyCalcValuesFromDb: readFantasyCalcValuesFromDbMock,
}))

describe('GET /api/health/fantasycalc contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns healthy when fresh cache exists', async () => {
    getFantasyCalcCacheHealthMock.mockResolvedValueOnce({
      totalKeys: 3,
      freshKeys: 2,
      latestSyncedAt: '2026-04-08T00:00:00.000Z',
    })
    readFantasyCalcValuesFromDbMock.mockResolvedValueOnce({
      players: [{ player: { name: 'A' } }],
      stale: false,
      syncedAt: '2026-04-08T00:00:00.000Z',
      expiresAt: '2026-04-08T06:00:00.000Z',
    })

    const { GET } = await import('@/app/api/health/fantasycalc/route')
    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.source).toBe('db-cache')
    expect(body.cache.freshKeys).toBe(2)
  })

  it('returns ok false on read failure', async () => {
    getFantasyCalcCacheHealthMock.mockRejectedValueOnce(new Error('db failure'))

    const { GET } = await import('@/app/api/health/fantasycalc/route')
    const res = await GET()

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })
})
