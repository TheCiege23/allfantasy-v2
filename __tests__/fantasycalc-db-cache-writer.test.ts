import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsertMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sportsDataCache: {
      upsert: upsertMock,
    },
  },
}))

import { writeFantasyCalcValuesToDb } from '@/lib/fantasycalc-db'

describe('FantasyCalc cache writer', () => {
  beforeEach(() => {
    upsertMock.mockReset()
  })

  it('advances the cache freshness timestamp when refreshing an existing row', async () => {
    const syncedAt = new Date('2026-06-18T18:00:00.000Z')
    upsertMock.mockResolvedValue({})

    await writeFantasyCalcValuesToDb(
      { isDynasty: false, numQbs: 1, numTeams: 12, ppr: 1 },
      [],
      { syncedAt, ttlMs: 60_000 },
    )

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ createdAt: syncedAt }),
        create: expect.objectContaining({ createdAt: syncedAt }),
      }),
    )
  })
})
