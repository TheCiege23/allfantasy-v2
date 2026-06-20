import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma } = vi.hoisted(() => ({
  prisma: {
    waiverWatchlist: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma }))

import { addToWatchlist, getWatchlistPlayerIds, removeFromWatchlist, mergeWatchlist } from '@/lib/waiver-wire/watchlist-service'

describe('waiver watchlist service (Step 3C)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.waiverWatchlist.upsert.mockResolvedValue({ id: 'w1' })
    prisma.waiverWatchlist.deleteMany.mockResolvedValue({ count: 1 })
  })

  it('getWatchlistPlayerIds returns ordered playerIds for the league+user', async () => {
    prisma.waiverWatchlist.findMany.mockResolvedValue([{ playerId: 'p1' }, { playerId: 'p2' }])
    const ids = await getWatchlistPlayerIds('L', 'U')
    expect(ids).toEqual(['p1', 'p2'])
    expect(prisma.waiverWatchlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { leagueId: 'L', userId: 'U' }, orderBy: { createdAt: 'asc' } }),
    )
  })

  it('addToWatchlist upserts by the composite key and ignores blanks', async () => {
    await addToWatchlist('L', 'U', 'p1', 'NFL')
    expect(prisma.waiverWatchlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { leagueId_userId_playerId: { leagueId: 'L', userId: 'U', playerId: 'p1' } } }),
    )
    await addToWatchlist('L', 'U', '   ')
    expect(prisma.waiverWatchlist.upsert).toHaveBeenCalledTimes(1) // blank skipped
  })

  it('removeFromWatchlist deletes the matching row', async () => {
    await removeFromWatchlist('L', 'U', 'p1')
    expect(prisma.waiverWatchlist.deleteMany).toHaveBeenCalledWith({ where: { leagueId: 'L', userId: 'U', playerId: 'p1' } })
  })

  it('mergeWatchlist de-dupes and upserts each unique id', async () => {
    const n = await mergeWatchlist('L', 'U', ['p1', 'p1', 'p2', '  '], 'NFL')
    expect(n).toBe(2)
    expect(prisma.waiverWatchlist.upsert).toHaveBeenCalledTimes(2)
  })
})
