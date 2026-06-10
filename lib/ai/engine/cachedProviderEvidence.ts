import "server-only"

import { prisma } from "@/lib/prisma"
import type { DataFreshnessTier } from "./types"

type Delegate = {
  count?: (args?: Record<string, unknown>) => Promise<number>
  findFirst?: (args?: Record<string, unknown>) => Promise<Record<string, unknown> | null>
}

export type CachedProviderCounts = {
  players: number
  teams: number
  injuries: number
  news: number
  playerStats: number
  playerGameLogs: number
  genericCacheRows: number
  syncStates: number
}

export type CachedSportProviderEvidence = {
  sport: string
  freshness: DataFreshnessTier
  fetchedAt: Date
  counts: CachedProviderCounts
  approvedTables: string[]
  missingTables: string[]
  adminBackfillActions: string[]
}

function getDelegate(model: string): Delegate | null {
  const delegate = (prisma as unknown as Record<string, unknown>)[model]
  return delegate && typeof delegate === "object" ? (delegate as Delegate) : null
}

async function safeCount(model: string, args?: Record<string, unknown>): Promise<number> {
  try {
    const delegate = getDelegate(model)
    if (!delegate?.count) return 0
    return await delegate.count(args)
  } catch {
    return 0
  }
}

async function latestDate(
  model: string,
  dateField: string,
  where?: Record<string, unknown>,
): Promise<Date | null> {
  try {
    const delegate = getDelegate(model)
    if (!delegate?.findFirst) return null
    const row = await delegate.findFirst({
      where,
      select: { [dateField]: true },
      orderBy: { [dateField]: "desc" },
    })
    const value = row?.[dateField]
    if (value instanceof Date) return value
    if (typeof value === "string") {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    return null
  } catch {
    return null
  }
}

function maxDate(values: Array<Date | null>): Date | null {
  const valid = values.filter((value): value is Date => value instanceof Date)
  if (!valid.length) return null
  return valid.sort((a, b) => b.getTime() - a.getTime())[0] ?? null
}

function normalizeSportCode(sport: string): string {
  const value = sport.trim().toUpperCase()
  if (value === "WORLD_CUP" || value === "WORLDCUP" || value === "WC") return "WC_SOCCER"
  if (value === "EPL" || value === "SOCCER") return "SOCCER"
  return value
}

function genericCacheWhere(sport: string): Record<string, unknown> {
  const key = sport.toLowerCase().replace(/[^a-z0-9]+/g, "_")
  return {
    OR: [
      { cacheKey: { contains: key } },
      { cacheKey: { contains: sport.toLowerCase() } },
    ],
  }
}

function actionsFor(counts: CachedProviderCounts, sport: string): string[] {
  const actions: string[] = []
  if (counts.players <= 0) actions.push(`Run admin sports sync type=players for ${sport}.`)
  if (counts.teams <= 0) actions.push(`Run schedule/team importer or provider-team reconciliation for ${sport}.`)
  if (counts.playerStats <= 0) actions.push(`Run player_stats or player_game_logs import before player-stat AI grounding for ${sport}.`)
  if (counts.injuries <= 0) actions.push(`Run injuries importer before injury-impact AI grounding for ${sport}.`)
  if (counts.news <= 0) actions.push(`Run news importer before squad/news AI grounding for ${sport}.`)
  return actions
}

export async function fetchCachedSportProviderEvidence(
  sportInput: string,
): Promise<CachedSportProviderEvidence | null> {
  const sport = normalizeSportCode(sportInput)
  const where = { sport }
  const sportsDataWhere = genericCacheWhere(sport)

  const [
    sportsPlayerCount,
    playerRecordCount,
    sportsTeamCount,
    teamAssetCount,
    injuryReportCount,
    sportsInjuryCount,
    sportsNewsCount,
    playerNewsCount,
    seasonStatsCount,
    gameLogCount,
    cacheRowsCount,
    syncStateCount,
    latestSportsPlayer,
    latestPlayerRecord,
    latestSportsTeam,
    latestTeamAsset,
    latestInjuryReport,
    latestSportsInjury,
    latestSportsNews,
    latestPlayerNews,
    latestSeasonStats,
    latestGameLog,
    latestSyncState,
  ] = await Promise.all([
    safeCount("sportsPlayer", { where }),
    safeCount("sportsPlayerRecord", { where }),
    safeCount("sportsTeam", { where }),
    safeCount("teamAsset", { where }),
    safeCount("injuryReportRecord", { where }),
    safeCount("sportsInjury", { where }),
    safeCount("sportsNews", { where }),
    safeCount("playerNewsRecord", { where }),
    safeCount("playerSeasonStats", { where }),
    safeCount("playerGameLogCache", { where }),
    safeCount("sportsDataCache", { where: sportsDataWhere }),
    safeCount("providerSyncState", { where: { sport } }),
    latestDate("sportsPlayer", "fetchedAt", where),
    latestDate("sportsPlayerRecord", "lastUpdated", where),
    latestDate("sportsTeam", "fetchedAt", where),
    latestDate("teamAsset", "lastUpdated", where),
    latestDate("injuryReportRecord", "reportDate", where),
    latestDate("sportsInjury", "fetchedAt", where),
    latestDate("sportsNews", "publishedAt", where),
    latestDate("playerNewsRecord", "publishedAt", where),
    latestDate("playerSeasonStats", "fetchedAt", where),
    latestDate("playerGameLogCache", "syncedAt", where),
    latestDate("providerSyncState", "lastSuccessAt", { sport }),
  ])

  const counts: CachedProviderCounts = {
    players: sportsPlayerCount + playerRecordCount,
    teams: sportsTeamCount + teamAssetCount,
    injuries: injuryReportCount + sportsInjuryCount,
    news: sportsNewsCount + playerNewsCount,
    playerStats: seasonStatsCount,
    playerGameLogs: gameLogCount,
    genericCacheRows: cacheRowsCount,
    syncStates: syncStateCount,
  }

  const totalEvidence = Object.values(counts).reduce((sum, count) => sum + count, 0)
  if (totalEvidence <= 0) return null

  const fetchedAt =
    maxDate([
      latestSportsPlayer,
      latestPlayerRecord,
      latestSportsTeam,
      latestTeamAsset,
      latestInjuryReport,
      latestSportsInjury,
      latestSportsNews,
      latestPlayerNews,
      latestSeasonStats,
      latestGameLog,
      latestSyncState,
    ]) ?? new Date(0)

  const approvedTables = [
    counts.players > 0 ? "SportsPlayer/SportsPlayerRecord" : null,
    counts.teams > 0 ? "SportsTeam/TeamAsset" : null,
    counts.injuries > 0 ? "InjuryReportRecord/SportsInjury" : null,
    counts.news > 0 ? "SportsNews/PlayerNewsRecord" : null,
    counts.playerStats > 0 ? "PlayerSeasonStats" : null,
    counts.playerGameLogs > 0 ? "PlayerGameLogCache" : null,
    counts.genericCacheRows > 0 ? "SportsDataCache" : null,
  ].filter((value): value is string => Boolean(value))

  const missingTables = [
    counts.players <= 0 ? "SportsPlayer/SportsPlayerRecord" : null,
    counts.teams <= 0 ? "SportsTeam/TeamAsset" : null,
    counts.injuries <= 0 ? "InjuryReportRecord/SportsInjury" : null,
    counts.news <= 0 ? "SportsNews/PlayerNewsRecord" : null,
    counts.playerStats <= 0 ? "PlayerSeasonStats" : null,
    counts.playerGameLogs <= 0 ? "PlayerGameLogCache" : null,
  ].filter((value): value is string => Boolean(value))

  return {
    sport,
    freshness: "cached",
    fetchedAt,
    counts,
    approvedTables,
    missingTables,
    adminBackfillActions: actionsFor(counts, sport),
  }
}
