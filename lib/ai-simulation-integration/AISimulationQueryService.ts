/**
 * AISimulationQueryService — fetches simulation and warehouse data for AI context.
 * Used by Chimmy and other AI surfaces to inject matchup, playoff, dynasty, and warehouse context.
 */

import { prisma } from '@/lib/prisma'
import { getLeagueHistorySummary } from '@/lib/data-warehouse'
import { getLeagueWarehouseSummaryForAI } from '@/lib/data-warehouse/WarehouseQueryService'
import { getSeasonForecast } from '@/lib/season-forecast/SeasonForecastEngine'
import { getDynastyProjectionsForLeague } from '@/lib/dynasty-engine/DynastyQueryService'
import { getSimulationSummaryForAI } from '@/lib/simulation-engine/SimulationQueryService'
import { normalizeSportForAI } from './SportAIContextResolver'
import type { SimulationWarehouseContext } from './types'

/** Resolve league sport for sport-aware routing; returns normalized sport or null. */
export async function getLeagueSport(leagueId: string): Promise<string | null> {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true },
    })
    const raw = league?.sport ?? null
    return raw ? normalizeSportForAI(raw) : null
  } catch {
    return null
  }
}

/**
 * Build simulation + warehouse context for a single league (for AI prompt).
 */
export async function getSimulationAndWarehouseContextForLeague(
  leagueId: string,
  options?: { teamId?: string; season?: number; week?: number }
): Promise<SimulationWarehouseContext | null> {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, sport: true, season: true },
    })
    if (!league) return null

    const sport = normalizeSportForAI(league.sport)
    const season = options?.season ?? league.season ?? new Date().getFullYear()
    const week = options?.week ?? 1

    const [warehouseSummary, seasonForecast, dynastyProjections, simSummary] = await Promise.all([
      getLeagueHistorySummary(leagueId, { season }).catch(() => null),
      getSeasonForecast(leagueId, season, week).catch(() => null),
      getDynastyProjectionsForLeague(leagueId, sport).catch(() => []),
      getSimulationSummaryForAI(leagueId, sport, season, week).catch(() => ({ matchupResults: [], seasonResults: [] })),
    ])

    let playoffOddsSummary: string | undefined
    if (seasonForecast?.length) {
      const top = seasonForecast.slice(0, 5).map(
        (t) => `${t.teamId}: playoff ${t.playoffProbability?.toFixed(0) ?? 0}%, champ ${t.championshipProbability?.toFixed(0) ?? 0}%, expected wins ${t.expectedWins?.toFixed(1) ?? 0}`
      )
      playoffOddsSummary = top.join('; ')
    }

    let dynastySummary: string | undefined
    if (dynastyProjections.length) {
      const lines = dynastyProjections.slice(0, 6).map(
        (p) => `Team ${p.teamId}: 3yr strength ${p.rosterStrength3Year?.toFixed(0) ?? 0}, 5yr ${p.rosterStrength5Year?.toFixed(0) ?? 0}, rebuild prob ${p.rebuildProbability?.toFixed(0) ?? 0}%, window score ${p.championshipWindowScore?.toFixed(0) ?? 0}`
      )
      dynastySummary = lines.join('; ')
    }

    let warehouseSummaryText: string | undefined
    if (warehouseSummary) {
      warehouseSummaryText = `Matchups: ${warehouseSummary.matchupCount}, standings: ${warehouseSummary.standingCount}, roster snapshots: ${warehouseSummary.rosterSnapshotCount}, draft picks: ${warehouseSummary.draftFactCount}, transactions: ${warehouseSummary.transactionCount}`
    }

    let matchupSummary: string | undefined
    if (simSummary.matchupResults?.length) {
      const lines = simSummary.matchupResults.slice(0, 5).map(
        (m) => `Win prob A ${(m.winProbabilityA * 100).toFixed(0)}% vs B ${(m.winProbabilityB * 100).toFixed(0)}% (expected ${m.expectedScoreA?.toFixed(0)}–${m.expectedScoreB?.toFixed(0)})`
      )
      matchupSummary = lines.join('; ')
    }

    return {
      leagueId,
      leagueName: league.name ?? undefined,
      sport,
      matchupSummary,
      playoffOddsSummary,
      dynastySummary,
      warehouseSummary: warehouseSummaryText,
    }
  } catch {
    return null
  }
}

/**
 * Build simulation + warehouse context for the current user's leagues (for Chimmy).
 * Returns a single string suitable for appending to USER FANTASY CONTEXT.
 */
export async function getSimulationAndWarehouseContextForUser(
  userId: string
): Promise<string> {
  try {
    const leagues = await prisma.league.findMany({
      where: { userId },
      select: { id: true, name: true, sport: true, season: true },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    })
    if (!leagues.length) return ''

    const parts: string[] = []
    for (const league of leagues) {
      const ctx = await getSimulationAndWarehouseContextForLeague(league.id, {
        season: league.season ?? undefined,
      })
      if (!ctx) continue
      const lines: string[] = [`League: ${ctx.leagueName ?? ctx.leagueId} (${ctx.sport})`]
      if (ctx.warehouseSummary) lines.push(`Warehouse: ${ctx.warehouseSummary}`)
      if (ctx.playoffOddsSummary) lines.push(`Playoff odds: ${ctx.playoffOddsSummary}`)
      if (ctx.dynastySummary) lines.push(`Dynasty: ${ctx.dynastySummary}`)
      if (ctx.matchupSummary) lines.push(`Matchup sims: ${ctx.matchupSummary}`)
      if (lines.length > 1) parts.push(lines.join('\n'))
    }
    if (!parts.length) return ''
    return 'SIMULATION & WAREHOUSE DATA (use for matchup predictions, playoff odds, dynasty outlook):\n' + parts.join('\n\n')
  } catch {
    return ''
  }
}
