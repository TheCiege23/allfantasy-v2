/**
 * Decision OS core — standardized parity telemetry emitters.
 *
 * Every slice emits the SAME parity event taxonomy so dashboards can query across domains:
 *   - decision.shadow_parity    → Decision OS recommendation vs legacy (wrapper-drift / equivalence)
 *   - decision.validator_parity → composed validators agree on shared scope + retirement-safety
 * These thin wrappers guarantee the event name is consistent; the flag payload stays per-slice.
 */
import { emitDecisionTelemetry, type DecisionTelemetryEvent } from '@/lib/decision-os/core/telemetry'

export function emitShadowParity(
  decisionType: string,
  flags: DecisionTelemetryEvent['flags'],
  decisionId?: string,
): void {
  emitDecisionTelemetry('decision.shadow_parity', decisionType, flags, decisionId)
}

export function emitValidatorParity(
  decisionType: string,
  flags: DecisionTelemetryEvent['flags'],
  decisionId?: string,
): void {
  emitDecisionTelemetry('decision.validator_parity', decisionType, flags, decisionId)
}
