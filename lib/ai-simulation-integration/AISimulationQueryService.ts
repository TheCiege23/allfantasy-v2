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
import { getGraphSummaryForAI } from '@/lib/league-intelligence-graph'
import { resolveAIMetaContextWithWindow } from '@/lib/meta-insights'
import { normalizeSportForAI } from './SportAIContextResolver'
import type { SimulationWarehouseContext } from './types'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

type LeagueLite = {
  id: string
  name: string | null
  sport: string
  season: number | null
  scoring: string | null
  leagueSize: number | null
  isDynasty: boolean | null
  settings: unknown
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

async function resolveLeagueByAnyId(leagueId: string): Promise<LeagueLite | null> {
  return prisma.league.findFirst({
    where: {
      OR: [{ id: leagueId }, { platformLeagueId: leagueId }],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      season: true,
      scoring: true,
      leagueSize: true,
      isDynasty: true,
      settings: true,
    },
  })
}

function buildLeagueSettingsSummary(league: LeagueLite, sport: string): string {
  const settings = asObject(league.settings) ?? {}
  const scoring = String(league.scoring ?? 'standard')
  const superflexSignals = [
    settings.isSuperFlex,
    settings.superflex,
    settings.is_superflex,
    settings.sf,
  ]
  const isSuperflex = superflexSignals.some(
    (v) => v === true || String(v).toLowerCase() === 'true' || Number(v) === 1
  )
  const tepSignals = [settings.isTightEndPremium, settings.tightEndPremium, settings.tep]
  const isTep = tepSignals.some(
    (v) => v === true || String(v).toLowerCase() === 'true' || Number(v) > 0
  )
  return [
    `Sport ${sport}`,
    `${league.isDynasty ? 'Dynasty' : 'Redraft'}`,
    `${league.leagueSize ?? '?'} teams`,
    `Scoring ${scoring}`,
    isSuperflex ? 'Superflex' : null,
    isTep ? 'TE premium' : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

/** Resolve league sport for sport-aware routing; returns normalized sport or null. */
export async function getLeagueSport(leagueId: string): Promise<string | null> {
  try {
    const league = await resolveLeagueByAnyId(leagueId)
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
    const league = await resolveLeagueByAnyId(leagueId)
    if (!league) return null

    const sport = normalizeSportForAI(league.sport ?? DEFAULT_SPORT)
    const season = options?.season ?? league.season ?? new Date().getFullYear()
    const week = options?.week ?? 1

    const [warehouseSummary, warehouseAI, seasonForecast, dynastyProjections, simSummary, graphSummary, metaSummary] = await Promise.all([
      getLeagueHistorySummary(league.id, { season }).catch(() => null),
      getLeagueWarehouseSummaryForAI(league.id, season).catch(() => null),
      getSeasonForecast(league.id, season, week).catch(() => null),
      getDynastyProjectionsForLeague(league.id, sport).catch(() => []),
      getSimulationSummaryForAI(league.id, sport, season, week).catch(() => ({ matchupResults: [], seasonResults: [] })),
      getGraphSummaryForAI(league.id, { season }).catch(() => ''),
      resolveAIMetaContextWithWindow(sport, '7d').catch(() => null),
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
      if (warehouseAI) {
        warehouseSummaryText += `, recent matchup rows: ${warehouseAI.recentMatchups.length}, transaction facts: ${warehouseAI.transactionCount}`
      }
    }

    let matchupSummary: string | undefined
    if (simSummary.matchupResults?.length) {
      const lines = simSummary.matchupResults.slice(0, 5).map(
        (m) => `Win prob A ${(m.winProbabilityA * 100).toFixed(0)}% vs B ${(m.winProbabilityB * 100).toFixed(0)}% (expected ${m.expectedScoreA?.toFixed(0)}–${m.expectedScoreB?.toFixed(0)})`
      )
      matchupSummary = lines.join('; ')
    }

    const globalMetaSummary = metaSummary
      ? [
          metaSummary.summary,
          metaSummary.topTrends?.slice(0, 2).join(' | ') || '',
        ]
          .filter(Boolean)
          .join(' ')
      : undefined

    const settingsSummary = buildLeagueSettingsSummary(league, sport)

    return {
      leagueId: league.id,
      leagueName: league.name ?? undefined,
      sport,
      matchupSummary,
      playoffOddsSummary,
      dynastySummary,
      warehouseSummary: warehouseSummaryText,
      leagueGraphSummary: graphSummary || undefined,
      globalMetaSummary,
      leagueSettingsSummary: settingsSummary,
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

    const contextRows = await Promise.all(
      leagues.map((league) =>
        getSimulationAndWarehouseContextForLeague(league.id, {
          season: league.season ?? undefined,
        })
      )
    )

    const parts: string[] = []
    for (const ctx of contextRows) {
      if (!ctx) continue
      const lines: string[] = [`League: ${ctx.leagueName ?? ctx.leagueId} (${ctx.sport})`]
      if (ctx.leagueSettingsSummary) lines.push(`Settings: ${ctx.leagueSettingsSummary}`)
      if (ctx.warehouseSummary) lines.push(`Warehouse: ${ctx.warehouseSummary}`)
      if (ctx.matchupSummary) lines.push(`Matchup sims: ${ctx.matchupSummary}`)
      if (ctx.playoffOddsSummary) lines.push(`Playoff odds: ${ctx.playoffOddsSummary}`)
      if (ctx.dynastySummary) lines.push(`Dynasty: ${ctx.dynastySummary}`)
      if (ctx.leagueGraphSummary) lines.push(`League graph: ${ctx.leagueGraphSummary}`)
      if (ctx.globalMetaSummary) lines.push(`Global meta: ${ctx.globalMetaSummary}`)
      if (lines.length > 1) parts.push(lines.join('\n'))
    }
    if (!parts.length) return ''
    return (
      'SIMULATION + WAREHOUSE + GRAPH + META DATA (use for matchup predictions, playoff odds, dynasty outlook, trade/waiver/draft context):\n' +
      parts.join('\n\n')
    )
  } catch {
    return ''
  }
}
