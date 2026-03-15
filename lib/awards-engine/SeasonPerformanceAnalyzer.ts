/**
 * SeasonPerformanceAnalyzer — gather per-manager metrics for a league/season for award scoring.
 */

import { prisma } from '@/lib/prisma'
import type { SeasonPerformanceInput } from './types'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

/**
 * Analyze league+season: load rosters, season results, draft grades, waiver claims.
 * Resolve rosterId <-> platformUserId. Return metrics by managerId (platformUserId).
 */
export async function analyzeSeasonPerformance(
  leagueId: string,
  season: string,
  options?: { sport?: string | null }
): Promise<SeasonPerformanceInput> {
  const sport = options?.sport ?? DEFAULT_SPORT

  const [league, rosters, seasonResults, draftGrades, waiverClaimsByRoster] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true },
    }),
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, platformUserId: true },
    }),
    prisma.seasonResult.findMany({
      where: { leagueId, season },
      select: { rosterId: true, wins: true, losses: true, pointsFor: true, pointsAgainst: true, champion: true },
    }),
    prisma.draftGrade.findMany({
      where: { leagueId, season },
      select: { rosterId: true, score: true },
    }),
    prisma.waiverClaim.groupBy({
      by: ['rosterId'],
      where: { leagueId },
      _count: { id: true },
    }),
  ])

  const resolvedSport = (league?.sport ?? sport) as string
  const rosterIdToManager = new Map(rosters.map((r) => [r.id, r.platformUserId]))
  const managerToRosterIds = new Map<string, string[]>()
  for (const r of rosters) {
    const list = managerToRosterIds.get(r.platformUserId) ?? []
    list.push(r.id)
    managerToRosterIds.set(r.platformUserId, list)
  }

  // Season results: rosterId might be Roster.id or platformUserId
  const srByKey = new Map<string, { wins: number; losses: number; pointsFor: number; pointsAgainst: number; champion: boolean }>()
  for (const sr of seasonResults) {
    const key = sr.rosterId
    const existing = srByKey.get(key)
    const wins = sr.wins ?? 0
    const losses = sr.losses ?? 0
    const pointsFor = Number(sr.pointsFor ?? 0)
    const pointsAgainst = Number(sr.pointsAgainst ?? 0)
    const champion = sr.champion ?? false
    if (!existing) {
      srByKey.set(key, { wins, losses, pointsFor, pointsAgainst, champion })
    } else {
      existing.wins += wins
      existing.losses += losses
      existing.pointsFor += pointsFor
      existing.pointsAgainst += pointsAgainst
      existing.champion = existing.champion || champion
    }
  }

  // All season results in this league (for rookie + dynasty)
  const allSeasonResultsInLeague = await prisma.seasonResult.findMany({
    where: { leagueId },
    select: { rosterId: true, season: true, champion: true },
  })
  const rosterSeasons = new Map<string, { seasons: number; championships: number }>()
  for (const s of allSeasonResultsInLeague) {
    const cur = rosterSeasons.get(s.rosterId) ?? { seasons: 0, championships: 0 }
    cur.seasons += 1
    if (s.champion) cur.championships += 1
    rosterSeasons.set(s.rosterId, cur)
  }

  const draftScoreByRoster = new Map<string, number>()
  for (const d of draftGrades) {
    const n = Number(d.score ?? 0)
    const cur = draftScoreByRoster.get(d.rosterId) ?? 0
    draftScoreByRoster.set(d.rosterId, Math.max(cur, n))
  }

  const waiverCountByRoster = new Map(waiverClaimsByRoster.map((w) => [w.rosterId, w._count.id]))

  const byManager: SeasonPerformanceInput['byManager'] = {}

  function addToManager(
    managerId: string,
    data: {
      wins: number
      losses: number
      pointsFor: number
      pointsAgainst: number
      champion: boolean
      draftScore: number
      waiverClaimCount: number
      tradeCount: number
      isRookie: boolean
      seasonsInLeague: number
      championshipCount: number
    }
  ) {
    const cur = byManager[managerId]
    if (!cur) {
      byManager[managerId] = { ...data }
      return
    }
    cur.wins += data.wins
    cur.losses += data.losses
    cur.pointsFor += data.pointsFor
    cur.pointsAgainst += data.pointsAgainst
    cur.champion = cur.champion || data.champion
    cur.draftScore = Math.max(cur.draftScore, data.draftScore)
    cur.waiverClaimCount += data.waiverClaimCount
    cur.tradeCount += data.tradeCount
    cur.seasonsInLeague = Math.max(cur.seasonsInLeague, data.seasonsInLeague)
    cur.championshipCount += data.championshipCount
    cur.isRookie = cur.isRookie && data.isRookie
  }

  for (const r of rosters) {
    const rosterIds = [r.id]
    const managerId = r.platformUserId
    const hist = rosterSeasons.get(r.id) ?? { seasons: 0, championships: 0 }
    const isRookie = hist.seasons === 1

    const sr = srByKey.get(r.id) ?? srByKey.get(managerId)
    const wins = sr?.wins ?? 0
    const losses = sr?.losses ?? 0
    const pointsFor = sr?.pointsFor ?? 0
    const pointsAgainst = sr?.pointsAgainst ?? 0
    const champion = sr?.champion ?? false

    addToManager(managerId, {
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      champion,
      draftScore: draftScoreByRoster.get(r.id) ?? draftScoreByRoster.get(managerId) ?? 0,
      waiverClaimCount: waiverCountByRoster.get(r.id) ?? 0,
      tradeCount: 0,
      isRookie,
      seasonsInLeague: hist.seasons,
      championshipCount: hist.championships,
    })
  }

  for (const [rosterIdKey, sr] of srByKey) {
    const managerId = rosterIdToManager.get(rosterIdKey) ?? rosterIdKey
    if (byManager[managerId]) continue
    const hist = rosterSeasons.get(rosterIdKey) ?? { seasons: 0, championships: 0 }
    addToManager(managerId, {
      wins: sr.wins,
      losses: sr.losses,
      pointsFor: sr.pointsFor,
      pointsAgainst: sr.pointsAgainst,
      champion: sr.champion,
      draftScore: draftScoreByRoster.get(rosterIdKey) ?? 0,
      waiverClaimCount: waiverCountByRoster.get(rosterIdKey) ?? 0,
      tradeCount: 0,
      isRookie: hist.seasons === 1,
      seasonsInLeague: hist.seasons,
      championshipCount: hist.championships,
    })
  }

  return {
    leagueId,
    season,
    sport: resolvedSport,
    byManager,
  }
}
