/**
 * AnalyticsFactMaterializer — precomputes analytics-ready datasets from warehouse facts.
 * Feeds dashboard analytics, trend detection, and AI narrative.
 */

import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { normalizeSportForWarehouse } from './types'

export interface MaterializedPlayerTrend {
  playerId: string
  sport: string
  season: number
  totalFantasyPoints: number
  gameCount: number
  avgPointsPerGame: number
  lastWeekPoints: number | null
}

/**
 * Materialize player fantasy trend (season totals + last week) for analytics layer.
 */
export async function materializePlayerSeasonTrends(
  sport: string,
  season: number,
  limit = 500
): Promise<MaterializedPlayerTrend[]> {
  const sportNorm = normalizeSportForWarehouse(sport)
  const rows = await prisma.playerGameFact.groupBy({
    by: ['playerId'],
    where: { sport: sportNorm, season },
    _sum: { fantasyPoints: true },
    _count: { factId: true },
  })
  const lastWeek = await prisma.playerGameFact.findMany({
    where: { sport: sportNorm, season },
    distinct: ['playerId'],
    orderBy: { weekOrRound: 'desc' },
    select: { playerId: true, fantasyPoints: true },
  })
  const lastWeekByPlayer = new Map(lastWeek.map((r) => [r.playerId, r.fantasyPoints]))
  const result: MaterializedPlayerTrend[] = rows
    .map((r) => ({
      playerId: r.playerId,
      sport: sportNorm,
      season,
      totalFantasyPoints: r._sum.fantasyPoints ?? 0,
      gameCount: r._count.factId,
      avgPointsPerGame: r._count.factId > 0 ? (r._sum.fantasyPoints ?? 0) / r._count.factId : 0,
      lastWeekPoints: lastWeekByPlayer.get(r.playerId) ?? null,
    }))
    .sort((a, b) => b.totalFantasyPoints - a.totalFantasyPoints)
    .slice(0, limit)
  return result
}

export interface MaterializedLeagueSummary {
  leagueId: string
  sport: string
  season: number
  matchupCount: number
  teamCount: number
  totalPointsScored: number
}

/**
 * Materialize league summary for dashboard cards.
 */
export async function materializeLeagueSummaries(
  leagueIds: string[],
  season: number
): Promise<MaterializedLeagueSummary[]> {
  const matchups = await prisma.matchupFact.findMany({
    where: { leagueId: { in: leagueIds }, season },
    select: { leagueId: true, scoreA: true, scoreB: true },
  })
  const byLeague = new Map<string, { count: number; totalPoints: number }>()
  for (const m of matchups) {
    const cur = byLeague.get(m.leagueId) ?? { count: 0, totalPoints: 0 }
    cur.count += 1
    cur.totalPoints += m.scoreA + m.scoreB
    byLeague.set(m.leagueId, cur)
  }
  const standings = await prisma.seasonStandingFact.findMany({
    where: { leagueId: { in: leagueIds }, season },
    select: { leagueId: true },
  })
  const teamCountByLeague = new Map<string, number>()
  for (const s of standings) {
    teamCountByLeague.set(s.leagueId, (teamCountByLeague.get(s.leagueId) ?? 0) + 1)
  }
  const leagueList = await prisma.league.findMany({
    where: { id: { in: leagueIds } },
    select: { id: true, sport: true },
  })
  const sportByLeague = new Map(leagueList.map((l) => [l.id, normalizeSportForWarehouse(l.sport)]))
  return leagueIds.map((leagueId) => {
    const m = byLeague.get(leagueId) ?? { count: 0, totalPoints: 0 }
    return {
      leagueId,
      sport: sportByLeague.get(leagueId) ?? DEFAULT_SPORT,
      season,
      matchupCount: m.count,
      teamCount: teamCountByLeague.get(leagueId) ?? 0,
      totalPointsScored: m.totalPoints,
    }
  })
}
