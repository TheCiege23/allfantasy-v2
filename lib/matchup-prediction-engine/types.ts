import type { SupportedSport } from '@/lib/sport-scope'

export type MatchupPredictionScoringPreset = 'standard' | 'aggressive' | 'conservative'

export interface MatchupPredictionScoringRulesInput {
  /**
   * Global scoring multiplier applied to both team projections.
   * Example: 1.1 means a higher-scoring format.
   */
  pointMultiplier?: number
  /**
   * Team-specific deterministic adjustments (home edge, bonus rules, etc).
   */
  teamABonus?: number
  teamBBonus?: number
  /**
   * Scales volatility used for win-probability spread.
   */
  varianceMultiplier?: number
  /**
   * Optional preset can provide baseline tuning before explicit overrides.
   */
  preset?: MatchupPredictionScoringPreset
}

export interface MatchupPredictionEngineInput {
  sport: SupportedSport | string
  projectedScoreA: number
  projectedScoreB: number
  stdDevA?: number
  stdDevB?: number
  scoringRules?: MatchupPredictionScoringRulesInput
}

export interface MatchupPredictionEngineOutput {
  projectedScoreA: number
  projectedScoreB: number
  winProbabilityA: number
  winProbabilityB: number
  confidenceBand: 'tight' | 'normal' | 'wide'
  appliedRules: Required<MatchupPredictionScoringRulesInput>
}
