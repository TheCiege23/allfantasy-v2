/**
 * LegacyScoreCalculator — computes overall and dimension legacy scores (0–100) from aggregated evidence.
 */

import type { LegacyScores } from './types'
import type { AggregatedLegacyEvidence } from './LegacyEvidenceAggregator'

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))

/**
 * Weights for overall legacy score (dimensions 0–100).
 * championship + playoff + consistency + rivalry + awards + dynasty; explainable.
 */
const DIMENSION_WEIGHTS = {
  championship: 0.28,
  playoff: 0.20,
  consistency: 0.18,
  rivalry: 0.12,
  awards: 0.10,
  dynasty: 0.12,
} as const

export function computeLegacyScores(aggregated: AggregatedLegacyEvidence): LegacyScores {
  const championshipScore = clamp(
    aggregated.championships * 0.5 +
      aggregated.finalsAppearances * 0.3 +
      aggregated.playoffAppearances * 0.2
  )
  const playoffScore = clamp(
    aggregated.playoffAppearances * 0.6 + aggregated.finalsAppearances * 0.4
  )
  const consistencyScore = clamp(
    aggregated.consistency * 0.5 + aggregated.winPct * 0.5
  )
  const rivalryScore = clamp(aggregated.rivalryDominance)
  const awardsScore = clamp(aggregated.awards)
  const dynastyScore = clamp(
    aggregated.dynastyRun * 0.6 + aggregated.stayingPower * 0.3 + aggregated.highDifficultySuccess * 0.1
  )

  const overallLegacyScore = clamp(
    championshipScore * DIMENSION_WEIGHTS.championship +
      playoffScore * DIMENSION_WEIGHTS.playoff +
      consistencyScore * DIMENSION_WEIGHTS.consistency +
      rivalryScore * DIMENSION_WEIGHTS.rivalry +
      awardsScore * DIMENSION_WEIGHTS.awards +
      dynastyScore * DIMENSION_WEIGHTS.dynasty
  )

  return {
    overallLegacyScore,
    championshipScore,
    playoffScore,
    consistencyScore,
    rivalryScore,
    awardsScore,
    dynastyScore,
  }
}
