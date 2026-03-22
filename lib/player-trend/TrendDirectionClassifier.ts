/**
 * Classifies trend direction (Rising, Hot, Stable, Falling, Cold) by comparing
 * current trend score to historical (e.g. previous period or baseline).
 */
import type { TrendDirection } from './types'
import { MIN_EVENTS_FOR_DIRECTION } from './types'

export interface DirectionInput {
  currentScore: number
  previousScore: number | null
  baselineScore?: number | null
  eventCount: number
}

/** Thresholds: score delta and absolute score bands for Hot/Cold. */
const DELTA_RISING = 5
const DELTA_FALLING = -5
const SCORE_HOT = 70
const SCORE_COLD = 30

/**
 * Classify trend direction from current vs previous score and activity.
 */
export function classifyTrendDirection(input: DirectionInput): TrendDirection {
  const { currentScore, previousScore, baselineScore = null, eventCount } = input
  if (eventCount < MIN_EVENTS_FOR_DIRECTION) return 'Stable'

  const referenceScore =
    previousScore != null && Number.isFinite(previousScore)
      ? previousScore
      : baselineScore != null && Number.isFinite(baselineScore)
        ? baselineScore
        : currentScore
  const delta = currentScore - referenceScore

  if (delta >= DELTA_RISING && currentScore >= SCORE_HOT) return 'Hot'
  if (delta >= DELTA_RISING) return 'Rising'
  if (delta <= DELTA_FALLING && currentScore <= SCORE_COLD) return 'Cold'
  if (delta <= DELTA_FALLING) return 'Falling'

  return 'Stable'
}
