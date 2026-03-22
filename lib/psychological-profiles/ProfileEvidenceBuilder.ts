/**
 * ProfileEvidenceBuilder — builds evidence records that support assigned labels.
 */

import type { EvidenceType } from './types'
import type { BehaviorSignalsOutput } from './BehaviorSignalAggregator'
import type { ProfileEvidencePayload } from './types'

export function buildEvidenceFromSignals(
  signals: BehaviorSignalsOutput,
  _profileId: string | null,
  season?: number | null
): ProfileEvidencePayload[] {
  const out: ProfileEvidencePayload[] = []
  const createdAt =
    season != null ? new Date(Date.UTC(season, 0, 1, 0, 0, 0)) : undefined

  const add = (evidenceType: EvidenceType, value: number, sourceReference?: string) => {
    out.push({
      managerId: signals.managerId,
      leagueId: signals.leagueId,
      sport: signals.sport,
      evidenceType,
      value,
      sourceReference: sourceReference ?? null,
      createdAt,
    })
  }

  if (signals.tradeCount > 0) {
    add('trade_frequency', signals.tradeFrequencyNorm, `trades:${signals.tradeCount}`)
  }
  if (signals.tradeTimingLateRate > 0) {
    add('trade_timing', signals.tradeTimingLateRate, `late_trade_rate:${signals.tradeTimingLateRate.toFixed(0)}%`)
  }
  if (signals.waiverClaimCount > 0) {
    add('waiver_activity', signals.waiverFocusNorm, `waiver_claims:${signals.waiverClaimCount}`)
  }
  if (signals.lineupChangeRate > 0) {
    add('lineup_changes', signals.lineupChangeRate, `lineup_volatility:${signals.lineupChangeRate.toFixed(0)}`)
  }
  if (signals.benchingPatternScore > 0) {
    add('benching_pattern', signals.benchingPatternScore, 'lineup_benching_proxy')
  }
  const rookieRate = signals.rookieAcquisitionRate
  const vetRate = signals.vetAcquisitionRate
  if (rookieRate > 0 || vetRate > 0) {
    add('rookie_vs_veteran', rookieRate - vetRate, `rookie:${rookieRate.toFixed(0)} vet:${vetRate.toFixed(0)}`)
  }
  if (signals.positionPriorityConcentration > 0) {
    add(
      'position_priority',
      signals.positionPriorityConcentration,
      `draft_position_concentration:${signals.positionPriorityConcentration.toFixed(0)}`
    )
  }
  if (signals.picksAcquired > 0 || signals.picksTradedAway > 0) {
    add('rebuild_contention', signals.rebuildScore - signals.contentionScore, `picks_in:${signals.picksAcquired} out:${signals.picksTradedAway}`)
  }
  if (signals.draftPickCount > 0) {
    add(
      'draft_tendency',
      signals.draftEarlyRoundRate,
      `draft_picks:${signals.draftPickCount} early_round_rate:${signals.draftEarlyRoundRate.toFixed(0)}`
    )
  }
  add('risk_taking', signals.riskNorm, 'inferred')

  return out
}
