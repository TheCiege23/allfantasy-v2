import { beforeEach, describe, expect, it, vi } from 'vitest'

const sportsPlayerFindManyMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sportsPlayer: {
      findMany: sportsPlayerFindManyMock,
    },
  },
}))

describe('GET /api/players/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sportsPlayerFindManyMock.mockResolvedValue([])
  })

  it('filters by sport when sport query is provided', async () => {
    const { GET } = await import('@/app/api/players/search/route')
    const req = new Request('http://localhost/api/players/search?q=LeBron&sport=nba&limit=5')

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(sportsPlayerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sport: 'NBA',
          OR: expect.any(Array),
        }),
        take: 5,
      })
    )
  })

  it('keeps cross-sport search behavior when sport is omitted', async () => {
    const { GET } = await import('@/app/api/players/search/route')
    const req = new Request('http://localhost/api/players/search?q=Mahomes&limit=7')

    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(sportsPlayerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ sport: expect.anything() }),
        take: 7,
      })
    )
  })

  it('rejects too-short search queries', async () => {
    const { GET } = await import('@/app/api/players/search/route')
    const req = new Request('http://localhost/api/players/search?q=a')

    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid query')
  })
})
