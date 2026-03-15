/**
 * AIInsightRouter — route AI insight requests to the right data source (simulation, warehouse, dynasty).
 * Sport-aware: uses options.sport or resolves league sport; fallback from shared sport-scope when unknown/missing.
 */

import { DEFAULT_SPORT } from '@/lib/sport-scope'
import type { InsightType } from './types'
import { getSimulationAndWarehouseContextForLeague, getLeagueSport } from './AISimulationQueryService'
import { getMatchupPredictionSummary } from './MatchupPredictionService'
import { getDynastyAdviceSummaryForLeague, getDynastyAdviceForTeam } from './DynastyAdviceService'
import { normalizeSportForAI } from './SportAIContextResolver'

export async function getInsightContext(
  leagueId: string,
  insightType: InsightType,
  options?: { teamId?: string; season?: number; week?: number; sport?: string }
): Promise<string> {
  const season = options?.season ?? new Date().getFullYear()
  const week = options?.week ?? 1
  const sport = normalizeSportForAI(
    options?.sport ?? (await getLeagueSport(leagueId)) ?? DEFAULT_SPORT
  )

  switch (insightType) {
    case 'matchup':
      return getMatchupPredictionSummary(leagueId, week, sport).catch(() => '')
    case 'playoff': {
      const ctx = await getSimulationAndWarehouseContextForLeague(leagueId, { season, week })
      return ctx?.playoffOddsSummary ?? ''
    }
    case 'dynasty':
      return options?.teamId
        ? getDynastyAdviceForTeam(leagueId, options.teamId)
        : getDynastyAdviceSummaryForLeague(leagueId, sport)
    case 'trade':
    case 'waiver':
    case 'draft': {
      const ctx = await getSimulationAndWarehouseContextForLeague(leagueId, { season, week })
      const parts: string[] = []
      if (ctx?.playoffOddsSummary) parts.push(`Playoff: ${ctx.playoffOddsSummary}`)
      if (ctx?.dynastySummary) parts.push(`Dynasty: ${ctx.dynastySummary}`)
      if (ctx?.warehouseSummary) parts.push(`Warehouse: ${ctx.warehouseSummary}`)
      return parts.join('\n')
    }
    default:
      return getSimulationAndWarehouseContextForLeague(leagueId, options).then((c) => {
        if (!c) return ''
        const parts: string[] = []
        if (c.matchupSummary) parts.push(c.matchupSummary)
        if (c.playoffOddsSummary) parts.push(c.playoffOddsSummary)
        if (c.dynastySummary) parts.push(c.dynastySummary)
        if (c.warehouseSummary) parts.push(c.warehouseSummary)
        return parts.join('\n')
      })
  }
}
