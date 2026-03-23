/**
 * SeasonPerformanceAnalyzer — gather per-manager metrics for a league/season for award scoring.
 */

import { prisma } from '@/lib/prisma'
import { getMergedHistoricalSeasonResultsForLeague } from '@/lib/season-results/HistoricalSeasonResultService'
import type { SeasonPerformanceInput } from './types'
import { DEFAULT_SPORT, isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

/**
 * Analyze league+season: load rosters, season results, draft grades, waiver claims.
 * Resolve rosterId <-> platformUserId. Return metrics by managerId (platformUserId).
 */
export async function analyzeSeasonPerformance(
  leagueId: string,
  season: string,
  options?: { sport?: string | null }
): Promise<SeasonPerformanceInput> {
  const requestedSport =
    options?.sport && isSupportedSport(options.sport)
      ? normalizeToSupportedSport(options.sport)
      : null
  const seasonYear = Number.parseInt(season, 10)
  const seasonWindow =
    Number.isFinite(seasonYear) && seasonYear >= 1970 && seasonYear <= 2200
      ? {
          gte: new Date(Date.UTC(seasonYear, 0, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(seasonYear + 1, 0, 1, 0, 0, 0, 0)),
        }
      : null

  const [league, rosters, historicalSeasonResults, draftGrades, waiverClaimsByRoster] = await Promise.all([
    prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true },
    }),
    prisma.roster.findMany({
      where: { leagueId },
      select: { id: true, leagueId: true, platformUserId: true, playerData: true },
    }),
    getMergedHistoricalSeasonResultsForLeague({ leagueId }),
    prisma.draftGrade.findMany({
      where: { leagueId, season },
      select: { rosterId: true, score: true },
    }),
    prisma.waiverClaim.groupBy({
      by: ['rosterId'],
      where: {
        leagueId,
        ...(seasonWindow ? { createdAt: seasonWindow } : {}),
      },
      _count: { id: true },
    }),
  ])

  const resolvedSport = normalizeToSupportedSport(
    league?.sport ?? requestedSport ?? DEFAULT_SPORT
  )
  const seasonResults = historicalSeasonResults.filter((row) => row.season === season)
  const seasonResultsByManager = new Map(
    seasonResults.map((row) => [row.managerId, row] as const)
  )
  const managerSeasons = new Map<string, { seasons: number; championships: number; playoffAppearances: number }>()
  for (const s of historicalSeasonResults) {
    const cur = managerSeasons.get(s.managerId) ?? {
      seasons: 0,
      championships: 0,
      playoffAppearances: 0,
    }
    cur.seasons += 1
    if (s.champion) cur.championships += 1
    if (s.madePlayoffs || s.champion) cur.playoffAppearances += 1
    managerSeasons.set(s.managerId, cur)
  }

  const draftScoreByRoster = new Map<string, number>()
  for (const d of draftGrades) {
    const n = Number(d.score ?? 0)
    const cur = draftScoreByRoster.get(d.rosterId) ?? 0
    draftScoreByRoster.set(d.rosterId, Math.max(cur, n))
  }

  const draftScoreByManager = new Map<string, number>()
  const waiverCountByManager = new Map<string, number>()
  const tradeCountByManager = new Map<string, number>()
  const waiverCountByRoster = new Map(waiverClaimsByRoster.map((w) => [w.rosterId, w._count.id]))
  for (const roster of rosters) {
    const managerId = roster.platformUserId ?? roster.id
    draftScoreByManager.set(
      managerId,
      Math.max(
        draftScoreByManager.get(managerId) ?? 0,
        draftScoreByRoster.get(roster.id) ?? draftScoreByRoster.get(managerId) ?? 0
      )
    )
    waiverCountByManager.set(
      managerId,
      (waiverCountByManager.get(managerId) ?? 0) + (waiverCountByRoster.get(roster.id) ?? 0)
    )
    if (!tradeCountByManager.has(managerId)) {
      tradeCountByManager.set(managerId, 0)
    }
  }

  const managerIds = Array.from(
    new Set([
      ...seasonResults.map((row) => row.managerId),
      ...rosters.map((roster) => roster.platformUserId ?? roster.id),
    ])
  )
  if (managerIds.length > 0) {
    const acceptedOffers = await prisma.tradeOfferEvent.findMany({
      where: {
        leagueId,
        senderUserId: { in: managerIds },
        ...(Number.isFinite(seasonYear) ? { season: seasonYear } : {}),
        verdict: { in: ['accepted', 'ACCEPTED', 'Accept', 'accept'] },
      },
      select: { senderUserId: true },
    })
    for (const offer of acceptedOffers) {
      const managerId = offer.senderUserId
      if (!managerId) continue
      tradeCountByManager.set(managerId, (tradeCountByManager.get(managerId) ?? 0) + 1)
    }
  }

  const byManager: SeasonPerformanceInput['byManager'] = {}

  function addToManager(
    managerId: string,
    data: {
      wins: number
      losses: number
      pointsFor: number
      pointsAgainst: number
      champion: boolean
      madePlayoffs: boolean
      playoffSeed: number | null
      playoffFinish: string | null
      playoffWins: number
      playoffLosses: number
      bestFinish: number | null
      draftScore: number
      waiverClaimCount: number
      tradeCount: number
      isRookie: boolean
      seasonsInLeague: number
      championshipCount: number
      playoffAppearanceCount: number
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
    cur.madePlayoffs = cur.madePlayoffs || data.madePlayoffs || cur.champion
    cur.playoffSeed =
      cur.playoffSeed == null
        ? data.playoffSeed
        : data.playoffSeed == null
          ? cur.playoffSeed
          : Math.min(cur.playoffSeed, data.playoffSeed)
    cur.bestFinish =
      cur.bestFinish == null
        ? data.bestFinish
        : data.bestFinish == null
          ? cur.bestFinish
          : Math.min(cur.bestFinish, data.bestFinish)
    cur.playoffFinish = cur.playoffFinish ?? data.playoffFinish
    cur.playoffWins = Math.max(cur.playoffWins, data.playoffWins)
    cur.playoffLosses = Math.max(cur.playoffLosses, data.playoffLosses)
    cur.draftScore = Math.max(cur.draftScore, data.draftScore)
    cur.waiverClaimCount += data.waiverClaimCount
    cur.tradeCount += data.tradeCount
    cur.seasonsInLeague = Math.max(cur.seasonsInLeague, data.seasonsInLeague)
    cur.championshipCount += data.championshipCount
    cur.playoffAppearanceCount = Math.max(cur.playoffAppearanceCount, data.playoffAppearanceCount)
    cur.isRookie = cur.isRookie && data.isRookie
  }

  for (const r of rosters) {
    const managerId = r.platformUserId ?? r.id
    const hist = managerSeasons.get(managerId) ?? {
      seasons: 0,
      championships: 0,
      playoffAppearances: 0,
    }
    const isRookie = hist.seasons === 1
    const seasonRow = seasonResultsByManager.get(managerId)

    addToManager(managerId, {
      wins: seasonRow?.wins ?? 0,
      losses: seasonRow?.losses ?? 0,
      pointsFor: seasonRow?.pointsFor ?? 0,
      pointsAgainst: seasonRow?.pointsAgainst ?? 0,
      champion: seasonRow?.champion ?? false,
      madePlayoffs: seasonRow?.madePlayoffs ?? false,
      playoffSeed: seasonRow?.playoffSeed ?? null,
      playoffFinish: seasonRow?.playoffFinish ?? null,
      playoffWins: seasonRow?.playoffWins ?? 0,
      playoffLosses: seasonRow?.playoffLosses ?? 0,
      bestFinish: seasonRow?.bestFinish ?? null,
      draftScore: draftScoreByManager.get(managerId) ?? 0,
      waiverClaimCount: waiverCountByManager.get(managerId) ?? 0,
      tradeCount: tradeCountByManager.get(managerId) ?? 0,
      isRookie,
      seasonsInLeague: hist.seasons,
      championshipCount: hist.championships,
      playoffAppearanceCount: hist.playoffAppearances,
    })
  }

  for (const seasonRow of seasonResults) {
    const managerId = seasonRow.managerId
    if (byManager[managerId]) continue
    const hist = managerSeasons.get(managerId) ?? {
      seasons: 0,
      championships: 0,
      playoffAppearances: 0,
    }
    addToManager(managerId, {
      wins: seasonRow.wins,
      losses: seasonRow.losses,
      pointsFor: seasonRow.pointsFor,
      pointsAgainst: seasonRow.pointsAgainst,
      champion: seasonRow.champion,
      madePlayoffs: seasonRow.madePlayoffs,
      playoffSeed: seasonRow.playoffSeed,
      playoffFinish: seasonRow.playoffFinish,
      playoffWins: seasonRow.playoffWins,
      playoffLosses: seasonRow.playoffLosses,
      bestFinish: seasonRow.bestFinish,
      draftScore: draftScoreByManager.get(managerId) ?? 0,
      waiverClaimCount: waiverCountByManager.get(managerId) ?? 0,
      tradeCount: tradeCountByManager.get(managerId) ?? 0,
      isRookie: hist.seasons === 1,
      seasonsInLeague: hist.seasons,
      championshipCount: hist.championships,
      playoffAppearanceCount: hist.playoffAppearances,
    })
  }

  return {
    leagueId,
    season,
    sport: resolvedSport,
    byManager,
  }
}
