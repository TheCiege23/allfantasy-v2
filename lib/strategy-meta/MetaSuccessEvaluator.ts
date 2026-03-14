/**
 * Evaluates strategy success: usage rate and win/playoff success rate per strategy.
 * Consumes strategy labels (from StrategyPatternAnalyzer) and results (SeasonResult, RankingsSnapshot).
 */
import type { StrategyType, StrategyMetaReportDto, LeagueFormat } from './types'

export interface TeamStrategyOutcome {
  leagueId: string
  rosterId: string
  season: number
  strategyTypes: StrategyType[]
  leagueFormat: LeagueFormat
  wins: number
  losses: number
  pointsFor: number
  champion: boolean
  /** e.g. made playoffs. */
  playoffTeam?: boolean
}

/**
 * Compute usage rate (pct of teams using strategy) and success rate (e.g. win rate or playoff rate).
 * Chunk 3 will wire to DB (StrategyMetaReport table or in-memory aggregation).
 */
export function computeStrategyMetaReport(
  outcomes: TeamStrategyOutcome[],
  opts: { sport: string; leagueFormat: string }
): StrategyMetaReportDto[] {
  const byStrategy = new Map<StrategyType, { usage: number; wins: number; total: number; champions: number }>()
  const totalTeams = outcomes.length
  if (totalTeams === 0) return []

  for (const o of outcomes) {
    const wins = o.wins ?? 0
    const total = (o.wins ?? 0) + (o.losses ?? 0) || 1
    const champ = o.champion ? 1 : 0
    for (const s of o.strategyTypes) {
      const cur = byStrategy.get(s) ?? { usage: 0, wins: 0, total: 0, champions: 0 }
      cur.usage += 1
      cur.wins += wins
      cur.total += total
      cur.champions += champ
      byStrategy.set(s, cur)
    }
  }

  const reports: StrategyMetaReportDto[] = []
  for (const [strategyType, agg] of byStrategy) {
    reports.push({
      strategyType,
      sport: opts.sport,
      usageRate: totalTeams > 0 ? agg.usage / totalTeams : 0,
      successRate: agg.total > 0 ? agg.wins / agg.total : 0,
      trendingDirection: 'Stable',
      leagueFormat: opts.leagueFormat,
      sampleSize: agg.usage,
      createdAt: new Date().toISOString(),
    })
  }
  return reports
}
