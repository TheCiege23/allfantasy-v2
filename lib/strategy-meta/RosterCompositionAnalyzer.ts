/**
 * Analyzes roster composition: position distribution, value concentration, stacks.
 * Feeds StrategyPatternAnalyzer and meta dashboards.
 */
import type { PositionDistribution } from './types'

export interface RosterCompositionResult {
  positionCounts: PositionDistribution
  positionValues: PositionDistribution
  totalValue: number
  /** Top N players' value / total (concentration). */
  assetConcentration: number
  /** Rookie vs veteran count (if ages available). */
  rookieCount?: number
  veteranCount?: number
  /** Same-team stacks (e.g. QB+WR). */
  stacks: Array<{ type: string; description: string; playerIds: string[] }>
}

/**
 * Compute composition from position counts and optional values.
 */
export function analyzeRosterComposition(opts: {
  positionCounts: PositionDistribution
  positionValues?: PositionDistribution
  topPlayerValues?: number[]
  stacks?: Array<{ type: string; players: string[] }>
  rookieCount?: number
  veteranCount?: number
}): RosterCompositionResult {
  const positionValues = opts.positionValues ?? {}
  const totalValue = Object.values(positionValues).reduce((a, b) => a + b, 0)
  const topSum = (opts.topPlayerValues ?? []).slice(0, 5).reduce((a, b) => a + b, 0)
  const assetConcentration = totalValue > 0 ? topSum / totalValue : 0

  const stacks = (opts.stacks ?? []).map((s) => ({
    type: s.type,
    description: `${s.type}: ${s.players.join(', ')}`,
    playerIds: s.players,
  }))

  return {
    positionCounts: { ...opts.positionCounts },
    positionValues,
    totalValue,
    assetConcentration,
    rookieCount: opts.rookieCount,
    veteranCount: opts.veteranCount,
    stacks,
  }
}

/**
 * Extract position counts from roster playerData-like structure (array of { position } or record of ids → position).
 */
export function getPositionCountsFromRoster(players: Array<{ position?: string }>): PositionDistribution {
  const counts: PositionDistribution = {}
  for (const p of players) {
    const pos = (p.position ?? 'UNK').toUpperCase()
    counts[pos] = (counts[pos] ?? 0) + 1
  }
  return counts
}
