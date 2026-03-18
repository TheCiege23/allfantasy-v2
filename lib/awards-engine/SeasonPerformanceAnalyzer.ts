/**
 * SeasonPerformanceAnalyzer — gather per-manager metrics for a league/season for award scoring.
 */

import { prisma } from '@/lib/prisma'
import {
  buildSeasonResultManagerMap,
  getSeasonResultKeysForRoster,
} from '@/lib/season-results/SeasonResultRosterIdentity'
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
      select: { id: true, leagueId: true, platformUserId: true, playerData: true },
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
  const rosterIdToManager = buildSeasonResultManagerMap(rosters)

  // Season results: rosterId might be Roster.id, platformUserId, or imported source_team_id.
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
  const managerSeasonHistory = new Map<string, { managerId: string; champion: boolean }>()
  for (const s of allSeasonResultsInLeague) {
    const managerId = rosterIdToManager.get(s.rosterId) ?? s.rosterId
    const key = `${managerId}:${s.season}`
    const existing = managerSeasonHistory.get(key)
    if (!existing) {
      managerSeasonHistory.set(key, {
        managerId,
        champion: s.champion ?? false,
      })
      continue
    }

    existing.champion = existing.champion || (s.champion ?? false)
  }

  const managerSeasons = new Map<string, { seasons: number; championships: number }>()
  for (const { managerId, champion } of managerSeasonHistory.values()) {
    const cur = managerSeasons.get(managerId) ?? { seasons: 0, championships: 0 }
    cur.seasons += 1
    if (champion) cur.championships += 1
    managerSeasons.set(managerId, cur)
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
    const managerId = r.platformUserId
    const hist = managerSeasons.get(managerId) ?? { seasons: 0, championships: 0 }
    const isRookie = hist.seasons === 1

    const seasonRowsForRoster = getSeasonResultKeysForRoster({
        id: r.id,
        leagueId,
        playerData: r.playerData,
      })
        .map((key) => srByKey.get(key))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))

    const fallbackSeasonRow = srByKey.get(managerId)
    if (seasonRowsForRoster.length === 0 && fallbackSeasonRow) {
      seasonRowsForRoster.push(fallbackSeasonRow)
    }

    const wins = seasonRowsForRoster.reduce(
      (best, row) => Math.max(best, row.wins),
      0
    )
    const losses = seasonRowsForRoster.reduce(
      (best, row) => Math.max(best, row.losses),
      0
    )
    const pointsFor = seasonRowsForRoster.reduce(
      (best, row) => Math.max(best, row.pointsFor),
      0
    )
    const pointsAgainst = seasonRowsForRoster.reduce(
      (best, row) => Math.max(best, row.pointsAgainst),
      0
    )
    const champion = seasonRowsForRoster.some((row) => row.champion)

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
    const hist = managerSeasons.get(managerId) ?? { seasons: 0, championships: 0 }
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
