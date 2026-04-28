// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hm = vi.hoisted(() => ({
  leagueFindUnique: vi.fn(),
  survivorCommissionerActionFindMany: vi.fn(),
  survivorCommissionerActionCreate: vi.fn(),
  survivorCommissionerActionFindFirst: vi.fn(),
  survivorCommissionerActionUpdate: vi.fn(),
  survivorTribeMemberFindMany: vi.fn(),
  rosterFindMany: vi.fn(),
  rosterFindFirst: vi.fn(),
  survivorPlayerFindMany: vi.fn(),
  survivorPlayerFindFirst: vi.fn(),
  survivorWeeklyScoreFindMany: vi.fn(),
  survivorWeeklyScoreUpdateMany: vi.fn(),
  survivorChatChannelFindFirst: vi.fn(),
  survivorChatMessageCreate: vi.fn(),
  getSurvivorConfig: vi.fn(),
  getTribesWithMembers: vi.fn(),
  logSurvivorAuditEntry: vi.fn(),
  enqueueNotification: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: hm.leagueFindUnique,
    },
    survivorCommissionerAction: {
      findMany: hm.survivorCommissionerActionFindMany,
      create: hm.survivorCommissionerActionCreate,
      findFirst: hm.survivorCommissionerActionFindFirst,
      update: hm.survivorCommissionerActionUpdate,
    },
    survivorTribeMember: {
      findMany: hm.survivorTribeMemberFindMany,
    },
    roster: {
      findMany: hm.rosterFindMany,
      findFirst: hm.rosterFindFirst,
    },
    survivorPlayer: {
      findMany: hm.survivorPlayerFindMany,
      findFirst: hm.survivorPlayerFindFirst,
    },
    survivorWeeklyScore: {
      findMany: hm.survivorWeeklyScoreFindMany,
      updateMany: hm.survivorWeeklyScoreUpdateMany,
    },
    survivorChatChannel: {
      findFirst: hm.survivorChatChannelFindFirst,
    },
    survivorChatMessage: {
      create: hm.survivorChatMessageCreate,
    },
  },
}))

vi.mock('@/lib/survivor/notificationEngine', () => ({
  enqueueNotification: hm.enqueueNotification,
}))

vi.mock('@/lib/survivor/SurvivorLeagueConfig', () => ({
  getSurvivorConfig: hm.getSurvivorConfig,
}))

vi.mock('@/lib/survivor/SurvivorTribeService', () => ({
  getTribesWithMembers: hm.getTribesWithMembers,
}))

vi.mock('@/lib/survivor/auditEntry', () => ({
  logSurvivorAuditEntry: hm.logSurvivorAuditEntry,
}))

import {
  applySurvivorSitOutToMiniGames,
  applySurvivorSitOutToScoring,
  maybeTriggerSurvivorTribeShuffleRecommendation,
  nominateSurvivorSitOut,
  respondToSurvivorSitOut,
} from '@/lib/survivor/SurvivorSitOutEngine'

describe('SurvivorSitOutEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hm.enqueueNotification.mockResolvedValue(undefined)
    hm.logSurvivorAuditEntry.mockResolvedValue(undefined)
    hm.survivorChatMessageCreate.mockResolvedValue(undefined)
    hm.survivorChatChannelFindFirst.mockResolvedValue({ id: 'tribe-chat-1' })
  })

  it('persists a pending sit-out nomination for an eligible active tribe member', async () => {
    hm.leagueFindUnique.mockResolvedValue({ survivorPhase: 'tribe' })
    hm.rosterFindFirst.mockResolvedValue({ id: 'r-target', platformUserId: 'u-target' })
    hm.survivorPlayerFindFirst
      .mockResolvedValueOnce({ userId: 'u-target', displayName: 'Target User', playerState: 'active' })
      .mockResolvedValueOnce({ userId: 'u-nominator', tribeId: 'tribe-a', playerState: 'active' })
    hm.survivorCommissionerActionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    hm.survivorTribeMemberFindMany.mockResolvedValue([{ rosterId: 'r-target' }])
    hm.rosterFindMany.mockResolvedValue([{ id: 'r-target', platformUserId: 'u-target' }])
    hm.survivorPlayerFindMany.mockResolvedValue([
      {
        redraftRosterId: 'r-target',
        userId: 'u-target',
        displayName: 'Target User',
        hasImmunityThisWeek: false,
      },
    ])
    hm.survivorCommissionerActionCreate.mockResolvedValue({ id: 'sit-1' })

    const result = await nominateSurvivorSitOut({
      leagueId: 'league-1',
      week: 4,
      nominatorUserId: 'u-nominator',
      nominatorRosterId: 'r-nominator',
      tribeId: 'tribe-a',
      nominatedRosterId: 'r-target',
      command: '@chimmy nominate Target User to sit out',
    })

    expect(result).toEqual({
      ok: true,
      sitOutId: 'sit-1',
      nominatedUserId: 'u-target',
      nominatedDisplayName: 'Target User',
    })
    expect(hm.survivorCommissionerActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'sit_out_nominated',
          targetUserId: 'u-target',
          targetTribeId: 'tribe-a',
        }),
      }),
    )
    expect(hm.enqueueNotification).toHaveBeenCalled()
  })

  it('rejects sit-out responses from anyone other than the nominated manager', async () => {
    hm.survivorCommissionerActionFindFirst.mockResolvedValue({
      id: 'sit-1',
      leagueId: 'league-1',
      week: 5,
      actionType: 'sit_out_nominated',
      targetUserId: 'u-target',
      targetTribeId: 'tribe-a',
      newState: { status: 'pending' },
    })

    const result = await respondToSurvivorSitOut({
      leagueId: 'league-1',
      sitOutId: 'sit-1',
      responderUserId: 'u-other',
      accept: true,
    })

    expect(result).toEqual({
      ok: false,
      error: 'Only the nominated manager can respond to this sit-out.',
    })
    expect(hm.survivorCommissionerActionUpdate).not.toHaveBeenCalled()
  })

  it('removes accepted sit-out managers from tribe scoring totals', async () => {
    hm.survivorCommissionerActionFindMany.mockResolvedValueOnce([
      {
        id: 'sit-1',
        targetUserId: 'u-sat-out',
        actionType: 'sit_out_accepted',
      },
    ])
    hm.survivorWeeklyScoreFindMany
      .mockResolvedValueOnce([
        {
          id: 'score-1',
          userId: 'u-sat-out',
          tribeId: 'tribe-a',
          finalScore: 14,
          countedTowardTribeTotal: true,
        },
        {
          id: 'score-2',
          userId: 'u-active',
          tribeId: 'tribe-a',
          finalScore: 20,
          countedTowardTribeTotal: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          tribeId: 'tribe-a',
          finalScore: 14,
          countedTowardTribeTotal: false,
        },
        {
          tribeId: 'tribe-a',
          finalScore: 20,
          countedTowardTribeTotal: true,
        },
      ])
    hm.survivorWeeklyScoreUpdateMany.mockResolvedValue({ count: 1 })

    const result = await applySurvivorSitOutToScoring('league-1', 7)

    expect(result).toEqual({
      sitOutExcludedUserIds: ['u-sat-out'],
      tribeScoreBeforeSitOut: { 'tribe-a': 34 },
      tribeScoreAfterSitOut: { 'tribe-a': 20 },
    })
    expect(hm.survivorWeeklyScoreUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['score-1'] } },
        data: { countedTowardTribeTotal: false },
      }),
    )
  })

  it('blocks mini-game participation for accepted sit-out managers', async () => {
    hm.rosterFindFirst.mockResolvedValue({ platformUserId: 'u-target' })
    hm.survivorCommissionerActionFindMany.mockResolvedValueOnce([
      {
        id: 'sit-1',
        targetUserId: 'u-target',
        actionType: 'sit_out_accepted',
      },
    ])

    const result = await applySurvivorSitOutToMiniGames({
      leagueId: 'league-1',
      week: 8,
      rosterId: 'r-target',
    })

    expect(result).toEqual({
      blocked: true,
      sitOutExcludedUserIds: ['u-target'],
      reason: 'You are marked as sit-out this week and cannot participate in mini-games.',
    })
  })

  it('does not issue a second shuffle recommendation once one already exists', async () => {
    hm.getTribesWithMembers.mockResolvedValue([
      { id: 'tribe-a', name: 'Alpha', members: [{ rosterId: 'r1' }] },
      { id: 'tribe-b', name: 'Beta', members: [{ rosterId: 'r2' }] },
    ])
    hm.leagueFindUnique.mockResolvedValue({ survivorPhase: 'tribe' })
    hm.survivorPlayerFindMany.mockResolvedValue([
      { redraftRosterId: 'r1' },
      { redraftRosterId: 'r2' },
    ])
    hm.getSurvivorConfig.mockResolvedValue(null)
    hm.survivorCommissionerActionFindFirst.mockResolvedValue({ id: 'shuffle-1' })

    const result = await maybeTriggerSurvivorTribeShuffleRecommendation('league-1', 9)

    expect(result).toEqual({
      triggered: false,
      reason: 'Shuffle recommendation has already been used this season.',
    })
    expect(hm.survivorCommissionerActionCreate).not.toHaveBeenCalled()
  })
})