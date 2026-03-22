/**
 * AIInsightRouter — route AI insight requests to the right data source (simulation, warehouse, dynasty).
 * Sport-aware: uses options.sport or resolves league sport; fallback from shared sport-scope when unknown/missing.
 */

import { DEFAULT_SPORT } from '@/lib/sport-scope'
import {
  AI_MODEL_RESPONSIBILITIES,
  type AIInsightBundle,
  type InsightType,
} from './types'
import { getSimulationAndWarehouseContextForLeague, getLeagueSport } from './AISimulationQueryService'
import { getMatchupPredictionSummary } from './MatchupPredictionService'
import { getDynastyAdviceSummaryForLeague, getDynastyAdviceForTeam } from './DynastyAdviceService'
import { normalizeSportForAI } from './SportAIContextResolver'

export async function getInsightBundle(
  leagueId: string,
  insightType: InsightType,
  options?: { teamId?: string; season?: number; week?: number; sport?: string }
): Promise<AIInsightBundle> {
  const season = options?.season ?? new Date().getFullYear()
  const week = options?.week ?? 1
  const sport = normalizeSportForAI(
    options?.sport ?? (await getLeagueSport(leagueId)) ?? DEFAULT_SPORT
  )
  const sources: string[] = []

  switch (insightType) {
    case 'matchup': {
      const text = await getMatchupPredictionSummary(leagueId, week, sport).catch(() => '')
      if (text) sources.push('simulation')
      return {
        sport,
        insightType,
        contextText: text,
        sources,
        modelResponsibilities: AI_MODEL_RESPONSIBILITIES,
      }
    }
    case 'playoff': {
      const ctx = await getSimulationAndWarehouseContextForLeague(leagueId, { season, week })
      const parts: string[] = []
      if (ctx?.playoffOddsSummary) {
        parts.push(`Playoff odds: ${ctx.playoffOddsSummary}`)
        sources.push('simulation')
      }
      if (ctx?.warehouseSummary) {
        parts.push(`Warehouse: ${ctx.warehouseSummary}`)
        sources.push('warehouse')
      }
      if (ctx?.leagueSettingsSummary) {
        parts.push(`League settings: ${ctx.leagueSettingsSummary}`)
        sources.push('league_settings')
      }
      return {
        sport,
        insightType,
        contextText: parts.join('\n'),
        sources,
        modelResponsibilities: AI_MODEL_RESPONSIBILITIES,
      }
    }
    case 'dynasty': {
      const dynastyText = options?.teamId
        ? getDynastyAdviceForTeam(leagueId, options.teamId)
        : getDynastyAdviceSummaryForLeague(leagueId, sport)
      const [text, ctx] = await Promise.all([
        dynastyText.catch(() => ''),
        getSimulationAndWarehouseContextForLeague(leagueId, { season, week }).catch(() => null),
      ])
      const parts: string[] = []
      if (text) {
        parts.push(text)
        sources.push('dynasty')
      }
      if (ctx?.playoffOddsSummary) {
        parts.push(`Playoff context: ${ctx.playoffOddsSummary}`)
        sources.push('simulation')
      }
      if (ctx?.leagueSettingsSummary) {
        parts.push(`League settings: ${ctx.leagueSettingsSummary}`)
        sources.push('league_settings')
      }
      return {
        sport,
        insightType,
        contextText: parts.join('\n'),
        sources,
        modelResponsibilities: AI_MODEL_RESPONSIBILITIES,
      }
    }
    case 'trade':
    case 'waiver':
    case 'draft': {
      const ctx = await getSimulationAndWarehouseContextForLeague(leagueId, { season, week })
      const parts: string[] = []
      if (ctx?.matchupSummary) {
        parts.push(`Matchup sims: ${ctx.matchupSummary}`)
        sources.push('simulation')
      }
      if (ctx?.playoffOddsSummary) {
        parts.push(`Playoff odds: ${ctx.playoffOddsSummary}`)
        sources.push('simulation')
      }
      if (ctx?.dynastySummary) {
        parts.push(`Dynasty: ${ctx.dynastySummary}`)
        sources.push('dynasty')
      }
      if (ctx?.warehouseSummary) {
        parts.push(`Warehouse: ${ctx.warehouseSummary}`)
        sources.push('warehouse')
      }
      if (ctx?.leagueGraphSummary) {
        parts.push(`League intelligence graph: ${ctx.leagueGraphSummary}`)
        sources.push('league_graph')
      }
      if (ctx?.globalMetaSummary) {
        parts.push(`Global meta: ${ctx.globalMetaSummary}`)
        sources.push('global_meta')
      }
      if (ctx?.leagueSettingsSummary) {
        parts.push(`League settings: ${ctx.leagueSettingsSummary}`)
        sources.push('league_settings')
      }
      return {
        sport,
        insightType,
        contextText: parts.join('\n'),
        sources,
        modelResponsibilities: AI_MODEL_RESPONSIBILITIES,
      }
    }
    default: {
      const c = await getSimulationAndWarehouseContextForLeague(leagueId, options)
      const parts: string[] = []
      if (c?.matchupSummary) {
        parts.push(c.matchupSummary)
        sources.push('simulation')
      }
      if (c?.playoffOddsSummary) {
        parts.push(c.playoffOddsSummary)
        sources.push('simulation')
      }
      if (c?.dynastySummary) {
        parts.push(c.dynastySummary)
        sources.push('dynasty')
      }
      if (c?.warehouseSummary) {
        parts.push(c.warehouseSummary)
        sources.push('warehouse')
      }
      if (c?.leagueGraphSummary) {
        parts.push(c.leagueGraphSummary)
        sources.push('league_graph')
      }
      if (c?.globalMetaSummary) {
        parts.push(c.globalMetaSummary)
        sources.push('global_meta')
      }
      return {
        sport,
        insightType,
        contextText: parts.join('\n'),
        sources,
        modelResponsibilities: AI_MODEL_RESPONSIBILITIES,
      }
    }
  }
}

export async function getInsightContext(
  leagueId: string,
  insightType: InsightType,
  options?: { teamId?: string; season?: number; week?: number; sport?: string }
): Promise<string> {
  const bundle = await getInsightBundle(leagueId, insightType, options)
  return bundle.contextText
}
