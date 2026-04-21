import { beforeEach, describe, expect, it, vi } from 'vitest'

const { c2CLeagueFindUniqueMock } = vi.hoisted(() => ({
  c2CLeagueFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    c2CLeague: {
      findUnique: c2CLeagueFindUniqueMock,
    },
  },
}))

describe('C2C year-2 draft room and draft pools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses future draft format for year-2 draft room', async () => {
    c2CLeagueFindUniqueMock.mockResolvedValue({
      leagueId: 'league-c2c-1',
      sportPair: 'NFL_CFB',
      startupDraftFormat: 'combined',
      futureDraftFormat: 'split_campus_canton',
    })

    const { buildC2CDraftRoom } = await import('@/lib/c2c/draftFormatEngine')

    const room = await buildC2CDraftRoom('league-c2c-1', 'c2c_snake', 2027)

    expect(room.format).toBe('split_campus_canton')
    expect(room.pools).toHaveLength(2)
    expect(room.pools.map((p) => p.side)).toEqual(expect.arrayContaining(['campus', 'canton']))
  })

  it('separate future format exposes campus+pro pools and combined keeps single board', async () => {
    const { getDraftPoolConfig } = await import('@/lib/c2c/draftFormatEngine')

    const split = getDraftPoolConfig('split_campus_canton', 'NBA_CBB')
    expect(split).toHaveLength(2)
    expect(split[0]?.description.toLowerCase()).toContain('college')

    const combined = getDraftPoolConfig('combined', 'NFL_CFB')
    expect(combined).toHaveLength(1)
    expect(combined[0]?.side).toBe('combined')
  })

  it('year-2 pools account for already-rostered players for draft-page visibility', async () => {
    const { getAnnualDraftPool } = await import('@/lib/c2c/draftFormatEngine')

    const pool = getAnnualDraftPool('combined', 'NFL_CFB', [
      {
        id: 'st-1',
        leagueId: 'league-c2c-1',
        rosterId: 'roster-1',
        playerId: 'player-1',
        playerName: 'Existing Player',
        position: 'RB',
        sport: 'NCAAF',
        playerType: 'campus_devy',
        playerSide: 'campus',
        bucketState: 'devy',
        scoringEligibility: 'display_only',
        classYear: null,
        school: null,
        conference: null,
        nflTeam: null,
        nflPosition: null,
        hasEnteredPro: false,
        proEntryYear: null,
        proEntryMethod: null,
        transitionedFrom: null,
        transitionedAt: null,
        transitionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    expect(pool.notes).toContain('excluded as already rostered')
    expect(pool.combinedPoolSize).toBeGreaterThan(0)
  })
})
