import { describe, expect, it, vi } from 'vitest'

// ── Prisma mock ────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findMany: vi.fn(async () => []),
    },
    leagueTeam: {
      findMany: vi.fn(async () => []),
      groupBy: vi.fn(async () => []),
    },
    draftRoomStateRow: {
      findFirst: vi.fn(async () => null),
    },
    leagueStoryline: {
      findFirst: vi.fn(async () => null),
    },
    tradeOfferEvent: {
      count: vi.fn(async () => 0),
    },
    platformNotification: {
      findMany: vi.fn(async () => []),
    },
    engagementEvent: {
      create: vi.fn(async () => ({})),
    },
  },
}))

vi.mock('@/lib/platform/notification-service', () => ({
  createPlatformNotification: vi.fn(async () => true),
}))

vi.mock('@/lib/notifications/NotificationDispatcher', () => ({
  dispatchNotification: vi.fn(async () => undefined),
}))

import { prisma } from '@/lib/prisma'
import {
  hydrateSignalBundle,
  loadActiveLeagueMembers,
} from '../lib/chimmy-alerts/ChimmyAlertSignalHydrator'

// ─────────────────────────────────────────────────────────────────────────────
// hydrateSignalBundle
// ─────────────────────────────────────────────────────────────────────────────

describe('hydrateSignalBundle', () => {
  const NOW = new Date('2026-04-12T18:00:00Z')

  const baseInput = {
    leagueId: 'league-1',
    teamId: 'team-1',
    claimedByUserId: 'user-1',
    isCommissioner: false,
    isCoCommissioner: false,
    orphanCount: 0,
    now: NOW,
  }

  it('returns empty bundle when no draft activity or storyline', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle(baseInput)

    expect(signals.onTheClock).toBeUndefined()
    expect(signals.draftStartingSoon).toBeUndefined()
    expect(signals.engagementStoryReady).toBeUndefined()
    expect(signals.tradeOfferPendingCount).toBeUndefined()
  })

  it('sets onTheClock when draft is active and pick order matches team', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce({
      status: 'active',
      timerEndsAt: null,
      currentTeamIndex: 1,
      pickOrder: ['team-0', 'team-1', 'team-2'],
    } as never)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle(baseInput)
    expect(signals.onTheClock).toBe(true)
  })

  it('does NOT set onTheClock when pick order slot does not match team', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce({
      status: 'active',
      timerEndsAt: null,
      currentTeamIndex: 0,
      pickOrder: ['team-other', 'team-1'],
    } as never)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle(baseInput)
    expect(signals.onTheClock).toBeUndefined()
  })

  it('sets draftStartingSoon when draft waiting with timer ending within 30min', async () => {
    const timerEndsAt = new Date(NOW.getTime() + 15 * 60 * 1000)
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce({
      status: 'waiting',
      timerEndsAt,
      currentTeamIndex: 0,
      pickOrder: null,
    } as never)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle(baseInput)
    expect(signals.draftStartingSoon).toBe(true)
  })

  it('sets engagementStoryReady when recent storyline exists', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce({ id: 'story-1' } as never)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle(baseInput)
    expect(signals.engagementStoryReady).toBe(true)
  })

  it('sets inactiveTeamCount for commissioners when orphans > 0', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle({
      ...baseInput,
      isCommissioner: true,
      orphanCount: 2,
    })
    expect(signals.inactiveTeamCount).toBe(2)
  })

  it('does NOT set inactiveTeamCount for non-commissioner even if orphans exist', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const signals = await hydrateSignalBundle({
      ...baseInput,
      isCommissioner: false,
      orphanCount: 3,
    })
    expect(signals.inactiveTeamCount).toBeUndefined()
  })

  it('sets tradeOfferPendingCount when trade events exist for user', async () => {
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(3)

    const signals = await hydrateSignalBundle(baseInput)
    expect(signals.tradeOfferPendingCount).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loadActiveLeagueMembers
// ─────────────────────────────────────────────────────────────────────────────

describe('loadActiveLeagueMembers', () => {
  const NOW = new Date('2026-04-12T18:00:00Z')

  it('returns empty members when no leagues found', async () => {
    vi.mocked(prisma.league.findMany).mockResolvedValueOnce([])

    const { members, nextCursor } = await loadActiveLeagueMembers({
      limit: 40,
      now: NOW,
    })
    expect(members).toHaveLength(0)
    expect(nextCursor).toBeNull()
  })

  it('assigns commissioner role when team isCommissioner=true', async () => {
    vi.mocked(prisma.league.findMany).mockResolvedValueOnce([
      {
        id: 'league-1',
        sport: 'NFL',
        leagueType: 'redraft',
        isCommissioner: false,
        aiChimmyEnabled: true,
        userId: 'owner-1',
        settings: null,
      },
    ] as never)

    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValueOnce([
      {
        id: 'team-1',
        leagueId: 'league-1',
        claimedByUserId: 'user-commish',
        isCommissioner: true,
        isCoCommissioner: false,
      },
    ] as never)

    vi.mocked(prisma.leagueTeam.groupBy).mockResolvedValueOnce([])
    vi.mocked(prisma.draftRoomStateRow.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.leagueStoryline.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.tradeOfferEvent.count).mockResolvedValueOnce(0)

    const { members, nextCursor } = await loadActiveLeagueMembers({
      limit: 40,
      now: NOW,
    })

    expect(members).toHaveLength(1)
    expect(members[0].role).toBe('commissioner')
    expect(members[0].userId).toBe('user-commish')
    expect(nextCursor).toBeNull()
  })

  it('returns nextCursor when result equals limit', async () => {
    const leagueRows = Array.from({ length: 2 }, (_, i) => ({
      id: `league-${i}`,
      sport: 'NFL',
      leagueType: 'redraft',
      isCommissioner: false,
      aiChimmyEnabled: true,
      userId: `owner-${i}`,
      settings: null,
    }))

    vi.mocked(prisma.league.findMany).mockResolvedValueOnce(leagueRows as never)
    vi.mocked(prisma.leagueTeam.findMany).mockResolvedValueOnce([])
    vi.mocked(prisma.leagueTeam.groupBy).mockResolvedValueOnce([])

    const { members, nextCursor } = await loadActiveLeagueMembers({
      limit: 2,
      now: NOW,
    })

    expect(members).toHaveLength(0)
    expect(nextCursor).toBe('league-1')
  })
})
