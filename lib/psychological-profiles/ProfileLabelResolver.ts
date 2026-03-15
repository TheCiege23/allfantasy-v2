/**
 * ProfileLabelResolver — maps behavior signals to evidence-based profile labels.
 * Labels are configurable and derived from thresholds.
 */

import type { ProfileLabel } from './types'
import type { BehaviorSignalsOutput } from './BehaviorSignalAggregator'

export interface LabelThresholds {
  tradeHeavyMinTrades: number
  waiverFocusedMinClaims: number
  aggressiveMinScore: number
  conservativeMaxTrade: number
  rookieHeavyMinRate: number
  winNowMinContention: number
  rebuildMinScore: number
  chaosMinActivity: number
}

const DEFAULT_THRESHOLDS: LabelThresholds = {
  tradeHeavyMinTrades: 6,
  waiverFocusedMinClaims: 12,
  aggressiveMinScore: 55,
  conservativeMaxTrade: 2,
  rookieHeavyMinRate: 55,
  winNowMinContention: 50,
  rebuildMinScore: 50,
  chaosMinActivity: 60,
}

/**
 * Resolve profile labels from aggregated behavior signals.
 */
export function resolveProfileLabels(
  signals: BehaviorSignalsOutput,
  thresholds: Partial<LabelThresholds> = {}
): ProfileLabel[] {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }
  const labels: ProfileLabel[] = []

  if (signals.tradeCount >= t.tradeHeavyMinTrades) labels.push('trade-heavy')
  if (signals.waiverClaimCount >= t.waiverFocusedMinClaims) labels.push('waiver-focused')
  if (signals.aggressionNorm >= t.aggressiveMinScore) labels.push('aggressive')
  if (signals.tradeCount <= t.conservativeMaxTrade && signals.waiverFocusNorm < 30) labels.push('conservative')
  if (signals.tradeCount <= 3 && signals.aggressionNorm < 40) labels.push('quiet strategist')
  const activity = (signals.tradeFrequencyNorm + signals.waiverFocusNorm) / 2
  if (activity >= t.chaosMinActivity && signals.riskNorm >= 60) labels.push('chaos agent')
  if (signals.rebuildScore < 30 && signals.contentionScore >= 30) labels.push('value-first')
  if (signals.rookieAcquisitionRate >= t.rookieHeavyMinRate) labels.push('rookie-heavy')
  if (signals.contentionScore >= t.winNowMinContention) labels.push('win-now')
  if (signals.rebuildScore >= t.rebuildMinScore) labels.push('patient rebuilder')

  return [...new Set(labels)]
}

/**
 * Compute numeric scores 0–100 for profile dimensions from signals.
 */
export function resolveScores(signals: BehaviorSignalsOutput): {
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
} {
  return {
    aggressionScore: Math.min(100, Math.round(signals.aggressionNorm)),
    activityScore: Math.min(100, Math.round((signals.tradeFrequencyNorm + signals.waiverFocusNorm) / 2)),
    tradeFrequencyScore: Math.min(100, Math.round(signals.tradeFrequencyNorm)),
    waiverFocusScore: Math.min(100, Math.round(signals.waiverFocusNorm)),
    riskToleranceScore: Math.min(100, Math.round(signals.riskNorm)),
  }
}

export { DEFAULT_THRESHOLDS }
