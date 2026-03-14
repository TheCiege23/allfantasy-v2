/**
 * Computes TrendScore from normalized signal rates.
 * Formula: sum of (weight × signal) for each signal; dropRate and injuryImpact are penalties.
 */
import type { TrendSignals } from './types'
import { DEFAULT_TREND_WEIGHTS } from './types'

export interface TrendScoreWeights extends Partial<TrendSignals> {}

/**
 * Compute trend score from signals using default or custom weights.
 * Result is unbounded; typically clamped for display (e.g. 0–100).
 */
export function calculateTrendScore(
  signals: TrendSignals,
  weights: TrendScoreWeights = {}
): number {
  const w = { ...DEFAULT_TREND_WEIGHTS, ...weights }
  return (
    w.addRate * signals.addRate +
    w.dropRate * signals.dropRate +
    w.tradeInterest * signals.tradeInterest +
    w.draftFrequency * signals.draftFrequency +
    w.lineupStartRate * signals.lineupStartRate +
    w.injuryImpact * signals.injuryImpact
  )
}

/** Clamp score to 0–100 for display. */
export function clampTrendScore(score: number): number {
  return Math.max(0, Math.min(100, score))
}

/** Scale raw weighted sum to 0–100 band for direction and display. */
const SCALE_TO_100 = 5
export function normalizeTrendScoreTo100(rawScore: number): number {
  return clampTrendScore(50 + rawScore * SCALE_TO_100)
}
