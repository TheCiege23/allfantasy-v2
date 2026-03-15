/**
 * ScoreDistributionModel — expected score ranges and volatility from mean/stdDev.
 * Used for score distribution simulation and AI-consumable outputs.
 */

import { getVolatilityTag } from './SportSimulationResolver'

function randomNormal(mean: number, stdDev: number): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Sample score distribution for a team (mean, stdDev) over n iterations.
 * Returns array of simulated scores (for percentiles / histogram).
 */
export function sampleScoreDistribution(
  mean: number,
  stdDev: number,
  iterations: number
): number[] {
  const samples: number[] = []
  for (let i = 0; i < iterations; i++) {
    samples.push(Math.max(0, randomNormal(mean, stdDev)))
  }
  return samples
}

/**
 * Percentiles from a sorted array.
 */
export function percentiles(sorted: number[], pcts: number[]): number[] {
  if (sorted.length === 0) return pcts.map(() => 0)
  return pcts.map((p) => {
    const idx = (sorted.length - 1) * (p / 100)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, sorted.length - 1)
    const t = idx - lo
    return Math.round((sorted[lo] * (1 - t) + sorted[hi] * t) * 10) / 10
  })
}

/**
 * Full score distribution output: percentiles and volatility tag.
 */
export interface ScoreDistributionOutput {
  mean: number
  stdDev: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  samples: number[]
  volatilityTag: 'low' | 'medium' | 'high'
}

export function buildScoreDistribution(
  mean: number,
  stdDev: number,
  iterations = 1000
): ScoreDistributionOutput {
  const samples = sampleScoreDistribution(mean, stdDev, iterations)
  samples.sort((a, b) => a - b)
  const [p10, p25, p50, p75, p90] = percentiles(samples, [10, 25, 50, 75, 90])
  const volatilityTag = getVolatilityTag(stdDev)
  return {
    mean,
    stdDev,
    p10,
    p25,
    p50,
    p75,
    p90,
    samples,
    volatilityTag,
  }
}
