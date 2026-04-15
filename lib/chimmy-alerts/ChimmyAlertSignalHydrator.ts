import { prisma } from '@/lib/prisma'
import type { ChimmyAlertSignalBundle } from './types'

interface LeagueSignalInput {
  leagueId: string
  teamId: string
  claimedByUserId: string
  isCommissioner: boolean
  isCoCommissioner: boolean
  orphanCount: number
  now: Date
}

/**
 * Loads per-league per-user signal data from the DB in a background
 * (non-page-load) context. Only populates signals that can be derived
 * from stored data — client-only signals (e.g. lineup lock minutes)
 * require page context and are left undefined.
 */
export async function hydrateSignalBundle(
  input: LeagueSignalInput,
): Promise<ChimmyAlertSignalBundle> {
  const { leagueId, claimedByUserId, isCommissioner, isCoCommissioner, orphanCount, now } = input

  const signals: ChimmyAlertSignalBundle = {}

  // ── Draft room ────────────────────────────────────────────────────────────
  const draftState = await prisma.draftRoomStateRow.findFirst({
    where: { leagueId },
    select: { status: true, timerEndsAt: true, currentTeamIndex: true, pickOrder: true },
  })

  if (draftState) {
    if (draftState.status === 'active') {
      const pickOrder = Array.isArray(draftState.pickOrder) ? draftState.pickOrder : []
      const currentSlot = pickOrder[draftState.currentTeamIndex]
      if (currentSlot && String(currentSlot) === input.teamId) {
        signals.onTheClock = true
      }
    }
    if (draftState.status === 'waiting') {
      const timerMs = draftState.timerEndsAt
        ? draftState.timerEndsAt.getTime() - now.getTime()
        : null
      if (timerMs != null && timerMs > 0 && timerMs < 1000 * 60 * 30) {
        signals.draftStartingSoon = true
      }
    }
  }

  // ── Weekly recap / story ready ────────────────────────────────────────────
  const recentStory = await prisma.leagueStoryline.findFirst({
    where: {
      leagueId,
      storyType: 'weekly_storyline',
      createdAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 72) },
    },
    select: { id: true },
  })
  if (recentStory) {
    signals.engagementStoryReady = true
  }

  // ── Commissioner signals (inactive / orphan teams) ────────────────────────
  if ((isCommissioner || isCoCommissioner) && orphanCount > 0) {
    signals.inactiveTeamCount = orphanCount
  }

  // ── Trade offer events directed at this user ──────────────────────────────
  const pendingTrades = await prisma.tradeOfferEvent.count({
    where: {
      opponentUserId: claimedByUserId,
      leagueId,
      createdAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 72) },
    },
  })
  if (pendingTrades > 0) {
    signals.tradeOfferPendingCount = pendingTrades
  }

  return signals
}

interface LeagueBatch {
  leagueId: string
  sport: string
  leagueType: string
  isCommissioner: boolean
  aiChimmyEnabled: boolean
  userId: string
  settings: Record<string, unknown> | null
}

interface TeamMember {
  teamId: string
  claimedByUserId: string
  isCommissioner: boolean
  isCoCommissioner: boolean
}

export interface HydratedLeagueMember {
  userId: string
  leagueId: string
  teamId: string
  sport: string
  leagueType: string
  role: 'member' | 'commissioner' | 'admin'
  signals: ChimmyAlertSignalBundle
  leagueState: Record<string, unknown>
  orphanCount: number
}

/**
 * Loads all active chimmy-enabled league memberships with their signal state.
 * Returns one row per user-league pair, bounded by `limit`.
 */
export async function loadActiveLeagueMembers(opts: {
  limit: number
  cursor?: string
  leagueId?: string
  sport?: string
  now: Date
}): Promise<{ members: HydratedLeagueMember[]; nextCursor: string | null }> {
  const { limit, cursor, leagueId, sport, now } = opts

  const leagues = await prisma.league.findMany({
    where: {
      aiChimmyEnabled: true,
      lastSyncedAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 45) },
      ...(leagueId ? { id: leagueId } : {}),
      ...(sport ? { sport: sport as never } : {}),
    },
    select: {
      id: true,
      sport: true,
      leagueType: true,
      isCommissioner: true,
      aiChimmyEnabled: true,
      userId: true,
      settings: true,
    },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { id: 'asc' },
  })

  if (leagues.length === 0) {
    return { members: [], nextCursor: null }
  }

  const leagueIds = leagues.map((l) => l.id)

  const [teams, orphanCounts] = await Promise.all([
    prisma.leagueTeam.findMany({
      where: {
        leagueId: { in: leagueIds },
        claimedByUserId: { not: null },
      },
      select: {
        id: true,
        leagueId: true,
        claimedByUserId: true,
        isCommissioner: true,
        isCoCommissioner: true,
      },
    }),
    prisma.leagueTeam.groupBy({
      by: ['leagueId'],
      where: { leagueId: { in: leagueIds }, isOrphan: true },
      _count: { id: true },
    }),
  ])

  const orphanByLeague = new Map<string, number>()
  for (const row of orphanCounts) {
    orphanByLeague.set(row.leagueId, row._count.id)
  }

  const leagueById = new Map<string, (typeof leagues)[number]>()
  for (const l of leagues) leagueById.set(l.id, l)

  const members: HydratedLeagueMember[] = []

  for (const team of teams) {
    const league = leagueById.get(team.leagueId)
    if (!league || !team.claimedByUserId) continue

    const isCommissioner =
      team.isCommissioner || team.isCoCommissioner || league.isCommissioner
    const role: 'member' | 'commissioner' =
      isCommissioner ? 'commissioner' : 'member'

    const orphanCount = orphanByLeague.get(team.leagueId) ?? 0

    const signals = await hydrateSignalBundle({
      leagueId: team.leagueId,
      teamId: team.id,
      claimedByUserId: team.claimedByUserId,
      isCommissioner,
      isCoCommissioner: team.isCoCommissioner,
      orphanCount,
      now,
    })

    members.push({
      userId: team.claimedByUserId,
      leagueId: team.leagueId,
      teamId: team.id,
      sport: league.sport,
      leagueType: league.leagueType ?? 'redraft',
      role,
      signals,
      leagueState: {
        orphanCount,
        isCommissioner,
      },
      orphanCount,
    })
  }

  const nextCursor = leagues.length === limit ? leagues[leagues.length - 1].id : null
  return { members, nextCursor }
}
