/**
 * GUILLOTINE FAAB ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Survival-first FAAB strategy: CONSERVE budget when safe; spend AGGRESSIVELY only when
 * survival is at risk. Aggressiveness scales with the user's danger tier and remaining FAAB.
 * Never invents a FAAB budget — when unknown, the plan is qualitative and flagged.
 */

import { evaluateSurvivalRisk } from './guillotineSurvivalRiskEngine'
import type { GuillotineWarRoomContext } from './types'

export interface GuillotineFaabPlanResult {
  rosterId: string
  faabRemaining: number | null
  posture: 'aggressive' | 'selective' | 'conserve' | 'limited'
  /** Suggested max bid as a % of remaining FAAB for a survival-relevant add (null when unknown). */
  suggestedMaxBidPct: number
  suggestedMaxBid: number | null
  riskLevel: string
  explanationFacts: string[]
  missingDataFlags: string[]
}

export function buildFaabPlan(context: GuillotineWarRoomContext, rosterId: string): GuillotineFaabPlanResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  if (!team) {
    return { rosterId, faabRemaining: null, posture: 'limited', suggestedMaxBidPct: 0, suggestedMaxBid: null, riskLevel: 'unknown', explanationFacts: ['Roster not found in this league.'], missingDataFlags }
  }

  const survival = evaluateSurvivalRisk(context, rosterId)
  const faab = team.faabRemaining
  const facts: string[] = []

  let posture: GuillotineFaabPlanResult['posture']
  let pct: number
  switch (survival.riskLevel) {
    case 'critical':
      posture = 'aggressive'
      pct = 0.6
      facts.push('In the chop zone — spend aggressively on any add that raises this period\'s output; surviving is worth the FAAB.')
      break
    case 'high':
      posture = 'aggressive'
      pct = 0.4
      facts.push('High elimination risk — be willing to spend a large share of FAAB on a survival-relevant upgrade.')
      break
    case 'moderate':
      posture = 'selective'
      pct = 0.2
      facts.push('Some risk — make selective bids on clear floor/upside upgrades; do not overspend.')
      break
    case 'safe':
      posture = 'conserve'
      pct = 0.1
      facts.push('Comfortably safe — conserve FAAB for later weeks when the field tightens; only bid on bargains.')
      break
    default:
      posture = 'limited'
      pct = 0.15
      facts.push('Survival risk is limited (no elimination line) — bid conservatively until scoring data exists.')
      missingDataFlags.push('FAAB aggressiveness is a fallback — survival risk could not be computed.')
  }

  if (faab == null) {
    missingDataFlags.push('FAAB budget unavailable — plan is qualitative (no bid amounts).')
  }
  const suggestedMaxBid = faab != null ? Math.max(1, Math.round(faab * pct)) : null
  if (faab != null) facts.push(`FAAB remaining ${faab}; suggested max bid ~${suggestedMaxBid} (${Math.round(pct * 100)}%).`)

  return {
    rosterId,
    faabRemaining: faab,
    posture,
    suggestedMaxBidPct: pct,
    suggestedMaxBid,
    riskLevel: survival.riskLevel,
    explanationFacts: facts,
    missingDataFlags: [...new Set(missingDataFlags)],
  }
}
