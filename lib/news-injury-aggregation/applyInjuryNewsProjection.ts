import type { NormalizedFantasyProjection } from '@/lib/sports-data-normalization/types'
import type { NormalizedPlayerInjuryNewsLayer } from '@/lib/news-injury-aggregation/types'

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * Attaches real injury/news-derived adjustment to normalized projections.
 * Baseline `projectedFantasyPoints` stays the provider value; adjusted points are explicit.
 */
export function applyInjuryNewsToNormalizedProjection(
  projection: NormalizedFantasyProjection,
  layer: NormalizedPlayerInjuryNewsLayer | null,
): NormalizedFantasyProjection {
  if (!layer) {
    return {
      ...projection,
      injuryNews: null,
    }
  }

  const baseline = projection.projectedFantasyPoints
  const mult = layer.projectionMultiplier
  const adjusted =
    baseline != null && Number.isFinite(baseline) ? round3(Math.max(0, baseline * mult)) : null

  const scoringAdj = projection.scoringRuleAdjustedProjection
  const scoringNewsAdj =
    scoringAdj != null && Number.isFinite(scoringAdj) ? round3(Math.max(0, scoringAdj * mult)) : null

  return {
    ...projection,
    injuryNews: {
      adjustedPoints: adjusted,
      baselinePoints: baseline,
      multiplier: mult,
      material: layer.materialProjectionImpact,
      canonicalStatus: layer.canonicalStatus,
      conflict: layer.conflict,
      freshnessHours: layer.freshnessHours,
      confidence: layer.confidence,
      summary: layer.playerNewsSummary,
      sourcesTried: layer.sources.map((s) => s.kind),
      scoringRuleAdjustedWithInjuryNews: scoringNewsAdj,
    },
  }
}
