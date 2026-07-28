/**
 * Deterministic agreement + confidence. The models may express uncertainty in prose, but the SERVER assigns
 * the displayed `agreementState` and `confidencePct` from observable factors (specialist availability,
 * detected disagreement, evidence completeness/freshness, dropped over-claims). Confidence is bounded and
 * never 100 — thinner evidence or fewer providers always lowers it.
 */
import type { AgreementState, DecisionOSEvidencePacket, SpecialistEvaluation } from './types'

/** Opposing directive pairs → deterministic disagreement detection between the two specialists. */
const OPPOSING_PAIRS: Array<[RegExp, RegExp]> = [
  [/\bstart\b/i, /\b(sit|bench)\b/i],
  [/\baccept\b/i, /\b(decline|reject)\b/i],
  [/\b(add|claim|pick up)\b/i, /\b(drop|cut)\b/i],
  [/\bbuy\b/i, /\bsell\b/i],
  [/\b(hold|keep)\b/i, /\b(trade|move)\b/i],
]

function specialistText(e: SpecialistEvaluation): string {
  return [e.recommendation ?? '', ...e.findings.map((f) => f.claim), ...e.caveats].join(' ')
}

/** A specialist "contributed" if it returned a schema-valid response (completed OR degraded). */
function contributed(e: SpecialistEvaluation): boolean {
  return e.status !== 'failed'
}

export function detectDisagreement(deepseek: SpecialistEvaluation, grok: SpecialistEvaluation): boolean {
  const a = specialistText(deepseek)
  const b = specialistText(grok)
  for (const [x, y] of OPPOSING_PAIRS) {
    if ((x.test(a) && y.test(b)) || (y.test(a) && x.test(b))) return true
  }
  return false
}

export function computeAgreementState(
  deepseek: SpecialistEvaluation,
  grok: SpecialistEvaluation,
  openaiOk: boolean,
): AgreementState {
  const dOk = contributed(deepseek)
  const gOk = contributed(grok)
  if (!dOk && !gOk) return 'deterministic_only' // both specialists failed → no synthesis happened
  if (!openaiOk) return 'degraded' // synthesis failed
  if (dOk !== gOk) return 'degraded' // exactly one specialist down
  if (detectDisagreement(deepseek, grok)) return 'disagreement'
  const bothSubstantive = deepseek.findings.length > 0 && grok.findings.length > 0
  return bothSubstantive ? 'consensus' : 'partial_consensus'
}

const BASE_BY_STATE: Record<AgreementState, number> = {
  consensus: 75,
  partial_consensus: 60,
  disagreement: 45,
  degraded: 42,
  deterministic_only: 0,
}

/** Deterministic, bounded confidence. Returns undefined for deterministic_only (no three-brain confidence). */
export function computeConfidence(input: {
  packet: DecisionOSEvidencePacket
  deepseek: SpecialistEvaluation
  grok: SpecialistEvaluation
  agreementState: AgreementState
  droppedClaims: number
}): number | undefined {
  const { packet, deepseek, grok, agreementState, droppedClaims } = input
  if (agreementState === 'deterministic_only') return undefined

  let c = BASE_BY_STATE[agreementState]

  // Evidence completeness
  const evidenceCount = packet.deterministicSignals.length + packet.relevantFacts.length
  if (evidenceCount === 0) c -= 25
  else if (evidenceCount < 3) c -= 12

  // Missing information (each item lowers, capped)
  c -= Math.min(15, packet.missingInformation.length * 5)

  // Freshness
  if (packet.freshness.state === 'stale') c = Math.min(c, 50)
  else if (packet.freshness.state === 'aging') c -= 8
  else if (packet.freshness.state === 'unknown') c -= 5

  // Specialist availability / quality
  if (deepseek.status === 'failed') c -= 15
  else if (deepseek.status === 'degraded') c -= 6
  if (grok.status === 'failed') c -= 15
  else if (grok.status === 'degraded') c -= 6

  // Over-claimed / removed content
  c -= Math.min(10, droppedClaims * 3)

  // Clamp: never 100 (honest uncertainty), never below 5.
  return Math.max(5, Math.min(92, Math.round(c)))
}
