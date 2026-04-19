import 'server-only'

import type { LongTermCoachingAnalysis, StrategicCoachingSnapshot } from '@/lib/long-term-coaching/types'

function humanizeClass(c: string): string {
  return c.replace(/_/g, ' ')
}

/**
 * Compact, prompt-safe slice of long-term coaching for other AI tools (trade, waiver, war room, etc.).
 * Always derived from the same deterministic engine as the Long-Term Coach UI.
 */
export function strategicCoachingFromAnalysis(analysis: LongTermCoachingAnalysis): StrategicCoachingSnapshot {
  const { signals, plan, pointsForPercentile, leagueContext, sport, leagueId, computedAt } = analysis
  const dir = plan.recommendedDirection.replace(/_/g, ' ')
  const summaryLine = `${humanizeClass(signals.strategyClass)} · ${dir} · title window ~${signals.titleWindowYears ?? '—'} yr · ST ${signals.shortTermStrengthIndex}/100 · LT ${signals.longTermAssetIndex}/100`

  return {
    schemaVersion: 1,
    modelId: analysis.modelId,
    computedAt,
    leagueId,
    sport,
    horizonYears: analysis.horizonYears,
    strategyMode: analysis.strategyMode,
    formatWarning: analysis.formatWarning,
    strategyClass: signals.strategyClass,
    recommendedDirection: plan.recommendedDirection,
    titleWindowYears: signals.titleWindowYears,
    peakYear: signals.peakYear,
    declineRisk: signals.declineRisk,
    shortTermStrengthIndex: signals.shortTermStrengthIndex,
    longTermAssetIndex: signals.longTermAssetIndex,
    prospectPipelineIndex: signals.prospectPipelineIndex,
    pickCapitalScore: signals.pickCapitalScore,
    ageCurveRisk: signals.ageCurveRisk,
    pointsForPercentile,
    confidence: signals.confidence,
    dynastyValueCoverageRatio: signals.dynastyValueCoverageRatio,
    summaryLine,
    flags: {
      isDynasty: leagueContext.flags.isDynasty,
      isDevy: leagueContext.flags.isDevy,
      isC2C: leagueContext.flags.isC2C,
      isKeeper: leagueContext.flags.isKeeper,
    },
  }
}
