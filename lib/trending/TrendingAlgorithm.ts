/**
 * Trending algorithm — score leagues, players, matchups using activity, engagement, joins.
 */

import { prisma } from '@/lib/prisma'
import type { TrendingLeague, TrendingPlayer, TrendingMatchup, TrendingOptions } from './types'

const DEFAULT_LOOKBACK_DAYS = 7
const DEFAULT_LIMIT = 20

export async function getTrendingLeagues(options: TrendingOptions = {}): Promise<TrendingLeague[]> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const limit = options.limit ?? DEFAULT_LIMIT
  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)

  const [usageByLeague, engagementByLeague, creatorJoins, leagueRows] = await Promise.all([
    prisma.apiUsageEvent.groupBy({
      by: ['leagueId'],
      where: {
        leagueId: { not: null },
        ts: { gte: since },
      },
      _count: { id: true },
    }),
    prisma.engagementEvent
      .findMany({
        where: { createdAt: { gte: since } },
        select: { meta: true },
      })
      .then((rows: { meta: unknown }[]) => {
        const map = new Map<string, number>()
        for (const r of rows) {
          const leagueId = (r.meta as { leagueId?: string } | null)?.leagueId
          if (leagueId) map.set(leagueId, (map.get(leagueId) ?? 0) + 1)
        }
        return map
      })
      .catch(() => new Map<string, number>()),
    prisma.creatorLeagueMember
      .groupBy({
        by: ['creatorLeagueId'],
        where: { joinedAt: { gte: since } },
        _count: { id: true },
      })
      .then((rows) => {
        return prisma.creatorLeague.findMany({
          where: { id: { in: rows.map((r) => r.creatorLeagueId) } },
          select: { id: true, leagueId: true },
        }).then((leagues) => {
          const byLeagueId = new Map<string, number>()
          for (const r of rows) {
            const cl = leagues.find((l) => l.id === r.creatorLeagueId)
            const lid = cl?.leagueId ?? cl?.id ?? null
            if (lid) byLeagueId.set(lid, (byLeagueId.get(lid) ?? 0) + (r._count?.id ?? 0))
          }
          return byLeagueId
        })
      })
      .catch(() => new Map<string, number>()),
    prisma.league.findMany({
      where: {},
      select: { id: true, name: true, sport: true },
    }),
  ])

  const leagueMap = new Map(leagueRows.map((l) => [l.id, l]))
  const activityMap = new Map<string, number>()
  const engagementMap = new Map<string, number>()
  const joinMap = new Map<string, number>()

  for (const u of usageByLeague) {
    if (u.leagueId) activityMap.set(u.leagueId, (activityMap.get(u.leagueId) ?? 0) + (u._count?.id ?? 0))
  }
  for (const [leagueId, count] of engagementByLeague) {
    engagementMap.set(leagueId, (engagementMap.get(leagueId) ?? 0) + count)
  }
  for (const [leagueId, count] of creatorJoins) {
    joinMap.set(leagueId, (joinMap.get(leagueId) ?? 0) + count)
  }

  const leagueIds = new Set([...activityMap.keys(), ...engagementMap.keys(), ...joinMap.keys()])
  const scored = Array.from(leagueIds)
    .map((leagueId) => {
      const activity = activityMap.get(leagueId) ?? 0
      const engagement = engagementMap.get(leagueId) ?? 0
      const joins = joinMap.get(leagueId) ?? 0
      const score = activity * 1 + engagement * 2 + joins * 3
      const league = leagueMap.get(leagueId)
      return {
        leagueId,
        name: league?.name ?? leagueId,
        sport: league?.sport ?? undefined,
        score,
        activityCount: activity,
        engagementCount: engagement,
        joinCount: joins,
      }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map((x, i) => ({
    ...x,
    rank: i + 1,
  }))
}

export async function getTrendingPlayers(options: TrendingOptions = {}): Promise<TrendingPlayer[]> {
  const limit = options.limit ?? DEFAULT_LIMIT
  const sport = options.sport?.toLowerCase() ?? 'nfl'

  const rows = await prisma.trendingPlayer.findMany({
    where: {
      sport: sport === 'nfl' ? 'nfl' : sport,
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ crowdScore: 'desc' }, { netTrend: 'desc' }],
    take: limit,
  })

  return rows.map((r, i) => ({
    sleeperId: r.sleeperId,
    playerName: r.playerName,
    position: r.position,
    team: r.team,
    sport: r.sport,
    score: r.crowdScore,
    addCount: r.addCount,
    dropCount: r.dropCount,
    netTrend: r.netTrend,
    crowdSignal: r.crowdSignal,
    rank: i + 1,
  }))
}

export async function getTrendingMatchups(options: TrendingOptions = {}): Promise<TrendingMatchup[]> {
  const limit = options.limit ?? DEFAULT_LIMIT
  const leagues = await getTrendingLeagues({ ...options, limit: Math.min(limit * 2, 50) })
  if (leagues.length === 0) return []

  const matchups: TrendingMatchup[] = leagues.slice(0, limit).map((l, i) => ({
    leagueId: l.leagueId,
    leagueName: l.name,
    matchupLabel: `${l.name} — active`,
    sport: l.sport,
    score: l.score,
    rank: i + 1,
  }))

  return matchups
}
