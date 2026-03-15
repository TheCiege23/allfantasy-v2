/**
 * ReputationScoreCalculator — computes dimension scores and overall from evidence.
 * All scores 0–100. Evidence-based and weightable.
 */

import type { ReputationScores, ReputationEvidenceType } from './types'

export interface DimensionWeights {
  reliability: number
  activity: number
  tradeFairness: number
  sportsmanship: number
  commissionerTrust: number
  toxicityRisk: number
  participationQuality: number
  responsiveness: number
}

const DEFAULT_WEIGHTS: DimensionWeights = {
  reliability: 1.2,
  activity: 1,
  tradeFairness: 1.2,
  sportsmanship: 1,
  commissionerTrust: 1.1,
  toxicityRisk: 1.2, // negative impact
  participationQuality: 1,
  responsiveness: 0.8,
}

export interface AggregatedEvidence {
  reliability: number
  activity: number
  tradeFairness: number
  sportsmanship: number
  commissionerTrust: number
  toxicityRisk: number
  participationQuality: number
  responsiveness: number
}

/**
 * Map evidence type sums/normalized values into dimension inputs (0–100 each).
 * Caller provides pre-aggregated values per dimension from ReputationEvidenceAggregator.
 */
export function computeDimensionScores(aggregated: AggregatedEvidence): ReputationScores {
  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  const reliabilityScore = clamp(aggregated.reliability)
  const activityScore = clamp(aggregated.activity)
  const tradeFairnessScore = clamp(aggregated.tradeFairness)
  const sportsmanshipScore = clamp(aggregated.sportsmanship)
  const commissionerTrustScore = clamp(aggregated.commissionerTrust)
  const toxicityRiskScore = clamp(aggregated.toxicityRisk)
  const participationQualityScore = clamp(aggregated.participationQuality)
  const responsivenessScore = clamp(aggregated.responsiveness)

  const weights = DEFAULT_WEIGHTS
  const weighted =
    reliabilityScore * weights.reliability +
    activityScore * weights.activity +
    tradeFairnessScore * weights.tradeFairness +
    sportsmanshipScore * weights.sportsmanship +
    commissionerTrustScore * weights.commissionerTrust +
    (100 - toxicityRiskScore) * weights.toxicityRisk +
    participationQualityScore * weights.participationQuality +
    responsivenessScore * weights.responsiveness
  const sumWeights =
    weights.reliability +
    weights.activity +
    weights.tradeFairness +
    weights.sportsmanship +
    weights.commissionerTrust +
    weights.toxicityRisk +
    weights.participationQuality +
    weights.responsiveness
  const overallScore = clamp(weighted / sumWeights)

  return {
    overallScore,
    reliabilityScore,
    activityScore,
    tradeFairnessScore,
    sportsmanshipScore,
    commissionerTrustScore,
    toxicityRiskScore,
    participationQualityScore,
    responsivenessScore,
  }
}
