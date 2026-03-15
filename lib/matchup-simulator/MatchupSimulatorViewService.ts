/**
 * MatchupSimulatorViewService — view state and display derivation for matchup simulator UX.
 * Drives empty / loading / error / display states and display payload for the result card.
 */

import type { MatchupSimulationResult } from '@/components/simulation/MatchupSimulationCard'

export type ViewState = 'empty' | 'loading' | 'error' | 'display'

export type MatchupDisplayPayload = {
  projA: number
  projB: number
  rangeA: [number, number]
  rangeB: [number, number]
  probA: number
  probB: number
  vol: 'low' | 'medium' | 'high'
  upsetChance: number
  iterations: number | null
}

export function getViewState(
  hasProjections: boolean,
  loading: boolean,
  error: string | null,
  result: MatchupSimulationResult | null
): ViewState {
  if (loading) return 'loading'
  if (error) return 'error'
  if (!hasProjections || !result) return 'empty'
  return 'display'
}

/**
 * Derive display payload from API result for the simulator card.
 */
export function getDisplayPayload(result: MatchupSimulationResult): MatchupDisplayPayload {
  return {
    projA: result.projectedScoreA,
    projB: result.projectedScoreB,
    rangeA: result.scoreRangeA,
    rangeB: result.scoreRangeB,
    probA: result.winProbabilityA * 100,
    probB: result.winProbabilityB * 100,
    vol: result.volatilityTag,
    upsetChance: result.upsetChance,
    iterations: result.iterations ?? null,
  }
}
