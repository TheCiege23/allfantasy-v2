import type { FutureStrengthSnapshot } from './types'
import type { DynastyProjectionSnapshot } from '@prisma/client'

export function fromDynastyProjection(
  snap: DynastyProjectionSnapshot,
): FutureStrengthSnapshot {
  return {
    season: snap.season,
    projectedStrengthNextYear: snap.projectedStrengthNextYear,
    projectedStrength3Years: snap.projectedStrength3Years,
    projectedStrength5Years: snap.projectedStrength5Years,
    rebuildProbability: snap.rebuildProbability,
    contenderProbability: snap.contenderProbability,
    windowStartYear: snap.windowStartYear,
    windowEndYear: snap.windowEndYear,
    volatilityScore: snap.volatilityScore,
  }
}

export function computeDynastyStrengthScore(future: FutureStrengthSnapshot): number {
  const { projectedStrengthNextYear, projectedStrength3Years, projectedStrength5Years } = future
  const weighted =
    projectedStrengthNextYear * 0.45 +
    projectedStrength3Years * 0.35 +
    projectedStrength5Years * 0.2
  return Math.round(Math.min(100, Math.max(0, weighted)))
}

