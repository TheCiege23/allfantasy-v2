/**
 * Computes fantasy points from a player stats record and scoring rules.
 * Used by live scoring, matchup engine, and projections pipeline.
 * Stat keys in stats must match rule statKey; unknown stats are ignored.
 */
import type { PlayerStatsRecord, ScoringRuleDefinition } from './types'

/** Rule shape compatible with ScoringRuleDto and ScoringRuleDefinition. */
export type ScoringRuleLike = Pick<ScoringRuleDefinition, 'statKey' | 'pointsValue' | 'multiplier' | 'enabled'>

/**
 * Compute fantasy points for one player given their stats and the league's scoring rules.
 */
export function computeFantasyPoints(
  stats: PlayerStatsRecord,
  rules: ScoringRuleLike[]
): number {
  let total = 0
  for (const r of rules) {
    if (!r.enabled) continue
    const value = stats[r.statKey]
    if (value == null || typeof value !== 'number') continue
    total += value * r.pointsValue * (r.multiplier ?? 1)
  }
  return Math.round(total * 100) / 100
}

/**
 * Compute points and per-stat breakdown (for display or debugging).
 */
export function computeFantasyPointsWithBreakdown(
  stats: PlayerStatsRecord,
  rules: ScoringRuleLike[]
): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {}
  let total = 0
  for (const r of rules) {
    if (!r.enabled) continue
    const value = stats[r.statKey]
    if (value == null || typeof value !== 'number') continue
    const pts = value * r.pointsValue * (r.multiplier ?? 1)
    breakdown[r.statKey] = Math.round(pts * 100) / 100
    total += pts
  }
  return { total: Math.round(total * 100) / 100, breakdown }
}
