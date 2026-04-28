// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hm = vi.hoisted(() => ({
  zombieLeagueFindUnique: vi.fn(),
  zombieLeagueTeamFindMany: vi.fn(),
  zombieLeagueTeamFindUnique: vi.fn(),
  zombieChimmyActionFindMany: vi.fn(),
  zombieChimmyActionCreate: vi.fn(),
  zombieChimmyActionFindFirst: vi.fn(),
  zombieChimmyActionUpdate: vi.fn(),
  rosterFindMany: vi.fn(),
  rosterFindFirst: vi.fn(),
  appUserFindMany: vi.fn(),
  zombieAuditEntryCreate: vi.fn(),
  leagueFindUnique: vi.fn(),
  getRosterTeamMap: vi.fn(),
  getRosterWeeklyScore: vi.fn(),
  notifyCommissioner: vi.fn(),
  notifyZombiePlayer: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    zombieLeague: {
      findUnique: hm.zombieLeagueFindUnique,
    },
    zombieLeagueTeam: {
      findMany: hm.zombieLeagueTeamFindMany,
      findUnique: hm.zombieLeagueTeamFindUnique,
    },
    zombieChimmyAction: {
      findMany: hm.zombieChimmyActionFindMany,
      create: hm.zombieChimmyActionCreate,
      findFirst: hm.zombieChimmyActionFindFirst,
      update: hm.zombieChimmyActionUpdate,
    },
    roster: {
      findMany: hm.rosterFindMany,
      findFirst: hm.rosterFindFirst,
    },
    appUser: {
      findMany: hm.appUserFindMany,
    },
    zombieAuditEntry: {
      create: hm.zombieAuditEntryCreate,
    },
    league: {
      findUnique: hm.leagueFindUnique,
    },
  },
}))

vi.mock('@/lib/zombie/rosterTeamMap', () => ({
  getRosterTeamMap: hm.getRosterTeamMap,
  getRosterWeeklyScore: hm.getRosterWeeklyScore,
}))

vi.mock('@/lib/zombie/commissionerNotificationService', () => ({
  notifyCommissioner: hm.notifyCommissioner,
  notifyZombiePlayer: hm.notifyZombiePlayer,
}))

import {
  applyZombieHordeSitOutToChallenges,
  applyZombieHordeSitOutToScoring,
  maybeTriggerZombieHordeShuffleRecommendation,
  nominateZombieHordeSitOut,
  respondToZombieHordeSitOut,
} from '@/lib/zombie/ZombieHordeSitOutEngine'

describe('ZombieHordeSitOutEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hm.notifyCommissioner.mockResolvedValue(undefined)
    hm.notifyZombiePlayer.mockResolvedValue(undefined)
    hm.zombieAuditEntryCreate.mockResolvedValue(undefined)
  })

  it('parses nomination target from command text and persists a pending nomination', async () => {
    hm.zombieLeagueTeamFindMany.mockResolvedValue([
      {
        rosterId: 'r-target',
        status: 'zombie',
        fantasyTeamName: 'Dead Rabbits',
        displayName: 'Dead Rabbits',
      },
    ])
    hm.rosterFindMany
      .mockResolvedValueOnce([{ id: 'r-target', platformUserId: 'u-target' }])
      .mockResolvedValueOnce([{ id: 'r-target', platformUserId: 'u-target' }])
    hm.zombieChimmyActionFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])
    hm.appUserFindMany.mockResolvedValue([{ id: 'u-target', displayName: 'Beta User', username: 'betauser' }])
    hm.rosterFindFirst.mockResolvedValue({ id: 'r-nominator' })
    hm.zombieLeagueTeamFindUnique.mockResolvedValue({ status: 'whisperer' })
    hm.zombieChimmyActionCreate.mockResolvedValue({ id: 'sit-1' })

    const result = await nominateZombieHordeSitOut({
      leagueId: 'league-1',
      week: 7,
      nominatorUserId: 'u-nominator',
      rawCommand: '@chimmy horde sit out betauser',
    })

    expect(result).toEqual({
      ok: true,
      sitOutId: 'sit-1',
      nominatedDisplayName: 'Dead Rabbits',
      nominatedUserId: 'u-target',
    })
    expect(hm.zombieChimmyActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'horde_sit_out_nomination',
          userId: 'u-target',
          week: 7,
        }),
      }),
    )
    expect(hm.notifyZombiePlayer).toHaveBeenCalledWith(
      'u-target',
      'horde_sit_out_nomination',
      expect.any(String),
      expect.any(Object),
    )
  })

  it('rejects sit-out responses from anyone other than the nominated user', async () => {
    hm.zombieChimmyActionFindFirst.mockResolvedValue({
      id: 'sit-1',
      leagueId: 'league-1',
      week: 4,
      userId: 'u-target',
      actionType: 'horde_sit_out_nomination',
      parsedAction: { status: 'pending' },
    })

    const result = await respondToZombieHordeSitOut({
      leagueId: 'league-1',
      sitOutId: 'sit-1',
      responderUserId: 'u-intruder',
      accept: true,
    })

    expect(result).toEqual({
      ok: false,
      error: 'Only the nominated horde manager can respond to this sit-out.',
    })
    expect(hm.zombieChimmyActionUpdate).not.toHaveBeenCalled()
  })

  it('excludes accepted sit-out managers from horde scoring totals', async () => {
    hm.zombieLeagueFindUnique.mockResolvedValue({ id: 'zl-1', season: 2026 })
    hm.zombieChimmyActionFindMany.mockResolvedValue([{ userId: 'u-sat-out' }])
    hm.getRosterTeamMap.mockResolvedValue({
      rosterIdToTeamId: new Map([
        ['r-a', 'team-a'],
        ['r-b', 'team-b'],
      ]),
    })
    hm.zombieLeagueTeamFindMany.mockResolvedValue([
      { rosterId: 'r-a', status: 'zombie' },
      { rosterId: 'r-b', status: 'whisperer' },
      { rosterId: 'r-c', status: 'survivor' },
    ])
    hm.rosterFindMany.mockResolvedValue([
      { id: 'r-a', platformUserId: 'u-active' },
      { id: 'r-b', platformUserId: 'u-sat-out' },
      { id: 'r-c', platformUserId: 'u-survivor' },
    ])
    hm.getRosterWeeklyScore.mockResolvedValueOnce(15).mockResolvedValueOnce(22)

    const result = await applyZombieHordeSitOutToScoring('league-1', 9)

    expect(result).toEqual({
      sitOutExcludedUserIds: ['u-sat-out'],
      hordeScoreBeforeSitOut: 37,
      hordeScoreAfterSitOut: 15,
    })
    expect(hm.zombieAuditEntryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'horde_sit_out',
          action: 'SCORING_EXCLUSION_APPLIED',
        }),
      }),
    )
  })

  it('blocks challenge participation for accepted sit-out managers', async () => {
    hm.zombieChimmyActionFindMany.mockResolvedValue([{ userId: 'u-target' }])

    const result = await applyZombieHordeSitOutToChallenges({
      leagueId: 'league-1',
      week: 3,
      userId: 'u-target',
    })

    expect(result).toEqual({
      blocked: true,
      sitOutExcludedUserIds: ['u-target'],
      reason: 'Sit-out accepted: challenge and horde action commands are disabled for this week.',
    })
  })

  it('does not issue a second shuffle recommendation once one already exists', async () => {
    hm.zombieChimmyActionFindFirst.mockResolvedValue({ id: 'shuffle-1' })

    const result = await maybeTriggerZombieHordeShuffleRecommendation('league-1', 6)

    expect(result).toEqual({
      triggered: false,
      reason: 'Horde shuffle recommendation already used this season.',
    })
    expect(hm.zombieChimmyActionCreate).not.toHaveBeenCalled()
    expect(hm.notifyCommissioner).not.toHaveBeenCalled()
  })
})
