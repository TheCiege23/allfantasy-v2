/**
 * TeamComparisonResolver — team A/B labels and comparison summary (strengths/weaknesses).
 * Used for headers, tooltips, and AI context.
 */

import type { MatchupSimulationResult } from '@/components/simulation/MatchupSimulationCard'

export type ComparisonSummary = {
  favoredName: string
  underdogName: string
  favoredProb: number
  underdogProb: number
  strengthSummary: string
  weaknessSummary: string
}

/**
 * Resolve which team is favored and underdog from result; build short strength/weakness copy.
 */
export function resolveComparisonSummary(
  teamAName: string,
  teamBName: string,
  result: MatchupSimulationResult
): ComparisonSummary {
  const probA = result.winProbabilityA * 100
  const probB = result.winProbabilityB * 100
  const favoredA = probA >= probB
  const favoredName = favoredA ? teamAName : teamBName
  const underdogName = favoredA ? teamBName : teamAName
  const favoredProb = favoredA ? probA : probB
  const underdogProb = favoredA ? probB : probA

  const projA = result.projectedScoreA
  const projB = result.projectedScoreB
  const higherProj = projA >= projB ? teamAName : teamBName
  const lowerProj = projA >= projB ? teamBName : teamAName

  const strengthSummary = `${favoredName} is favored (${favoredProb.toFixed(0)}% win probability). Projected score: ${favoredName} ${Math.max(projA, projB).toFixed(1)} – ${Math.min(projA, projB).toFixed(1)} ${underdogName}.`
  const weaknessSummary =
    result.upsetChance > 5
      ? `Underdog ${underdogName} has ${result.upsetChance}% upset chance; volatility: ${result.volatilityTag}.`
      : `Score variance is ${result.volatilityTag}.`

  return {
    favoredName,
    underdogName,
    favoredProb,
    underdogProb,
    strengthSummary,
    weaknessSummary,
  }
}
