import { beforeEach, describe, expect, it, vi } from 'vitest'

const hm = vi.hoisted(() => ({
  draftSessionFindFirst: vi.fn(),
  draftPickFindMany: vi.fn(),
  leagueSettingsFindUnique: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    draftSession: { findFirst: hm.draftSessionFindFirst },
    draftPick: { findMany: hm.draftPickFindMany },
    leagueSettings: { findUnique: hm.leagueSettingsFindUnique },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  hm.leagueSettingsFindUnique.mockResolvedValue({ timezone: 'UTC' })
})

function buildSlotOrder(teamCount: number) {
  return Array.from({ length: teamCount }, (_, i) => ({
    slot: i + 1,
    rosterId: `roster-${i + 1}`,
  }))
}

describe('getCanonicalDraftState current-pick parity', () => {
  it('derives currentPickNumber from persisted picks when nextOverallPick is stale', async () => {
    hm.draftSessionFindFirst.mockResolvedValue({
      id: 'session-1',
      leagueId: 'league-1',
      status: 'in_progress',
      draftType: 'snake',
      rounds: 15,
      teamCount: 12,
      thirdRoundReversal: false,
      timerSeconds: 60,
      timerEndAt: new Date('2026-04-27T12:01:00.000Z'),
      pausedRemainingSeconds: null,
      currentRoundNum: 1,
      slotOrder: buildSlotOrder(12),
      startedAt: new Date('2026-04-27T12:00:00.000Z'),
      updatedAt: new Date('2026-04-27T12:00:00.000Z'),
    })

    hm.draftPickFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({
        overall: i + 1,
        playerName: `Player ${i + 1}`,
        position: 'RB',
        pickMetadata: null,
        round: 1,
        slot: i + 1,
        rosterId: `roster-${i + 1}`,
      })),
    )

    const { getCanonicalDraftState } = await import('@/lib/draft/getCanonicalDraftState')
    const state = await getCanonicalDraftState({ leagueId: 'league-1' })

    expect(state).not.toBeNull()
    expect(state?.picksMade).toBe(6)
    expect(state?.currentPickNumber).toBe(7)
    expect(state?.nextPick.overall).toBe(7)
    expect(state?.nextPick.round).toBe(1)
    expect(state?.nextPick.slot).toBe(7)
    expect(state?.currentTeamId).toBe('roster-7')
  })

  it('treats cleared/empty pick rows as open slots for currentPickNumber', async () => {
    hm.draftSessionFindFirst.mockResolvedValue({
      id: 'session-2',
      leagueId: 'league-2',
      status: 'in_progress',
      draftType: 'snake',
      rounds: 3,
      teamCount: 4,
      thirdRoundReversal: false,
      timerSeconds: 60,
      timerEndAt: null,
      pausedRemainingSeconds: null,
      currentRoundNum: 2,
      slotOrder: buildSlotOrder(4),
      startedAt: new Date('2026-04-27T12:00:00.000Z'),
      updatedAt: new Date('2026-04-27T12:00:00.000Z'),
    })

    hm.draftPickFindMany.mockResolvedValue([
      {
        overall: 1,
        playerName: 'Player 1',
        position: 'QB',
        pickMetadata: null,
        round: 1,
        slot: 1,
        rosterId: 'roster-1',
      },
      {
        overall: 2,
        playerName: 'Player 2',
        position: 'RB',
        pickMetadata: null,
        round: 1,
        slot: 2,
        rosterId: 'roster-2',
      },
      {
        overall: 3,
        playerName: '',
        position: 'EMPTY',
        pickMetadata: { pickEditorEmpty: true },
        round: 1,
        slot: 3,
        rosterId: 'roster-3',
      },
      {
        overall: 4,
        playerName: 'Player 4',
        position: 'WR',
        pickMetadata: null,
        round: 1,
        slot: 4,
        rosterId: 'roster-4',
      },
    ])

    const { getCanonicalDraftState } = await import('@/lib/draft/getCanonicalDraftState')
    const state = await getCanonicalDraftState({ leagueId: 'league-2' })

    expect(state).not.toBeNull()
    expect(state?.currentPickNumber).toBe(3)
    expect(state?.nextPick.overall).toBe(3)
    expect(state?.nextPick.round).toBe(1)
    expect(state?.nextPick.slot).toBe(3)
    expect(state?.currentTeamId).toBe('roster-3')
  })
})
