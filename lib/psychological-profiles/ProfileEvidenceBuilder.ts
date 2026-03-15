/**
 * ProfileEvidenceBuilder — builds evidence records that support assigned labels.
 */

import type { EvidenceType } from './types'
import type { BehaviorSignalsOutput } from './BehaviorSignalAggregator'
import type { ProfileEvidencePayload } from './types'

export function buildEvidenceFromSignals(
  signals: BehaviorSignalsOutput,
  profileId: string | null
): ProfileEvidencePayload[] {
  const out: ProfileEvidencePayload[] = []

  const add = (evidenceType: EvidenceType, value: number, sourceReference?: string) => {
    out.push({
      managerId: signals.managerId,
      leagueId: signals.leagueId,
      sport: signals.sport,
      evidenceType,
      value,
      sourceReference: sourceReference ?? null,
    })
  }

  if (signals.tradeCount > 0) {
    add('trade_frequency', signals.tradeFrequencyNorm, `trades:${signals.tradeCount}`)
  }
  if (signals.waiverClaimCount > 0) {
    add('waiver_activity', signals.waiverFocusNorm, `waiver_claims:${signals.waiverClaimCount}`)
  }
  if (signals.lineupChangeRate > 0) {
    add('lineup_changes', signals.lineupChangeRate, 'lineup')
  }
  const rookieRate = signals.rookieAcquisitionRate
  const vetRate = signals.vetAcquisitionRate
  if (rookieRate > 0 || vetRate > 0) {
    add('rookie_vs_veteran', rookieRate - vetRate, `rookie:${rookieRate.toFixed(0)} vet:${vetRate.toFixed(0)}`)
  }
  if (signals.picksAcquired > 0 || signals.picksTradedAway > 0) {
    add('rebuild_contention', signals.rebuildScore - signals.contentionScore, `picks_in:${signals.picksAcquired} out:${signals.picksTradedAway}`)
  }
  add('risk_taking', signals.riskNorm, 'inferred')
  add('draft_tendency', 0, 'deferred')

  return out
}
