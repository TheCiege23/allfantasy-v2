/**
 * Quality gate / hallucination guard — wraps unified-ai AIFactGuard, optional strict rejection.
 * Deterministic-first; AI must not override hard rules or invent facts.
 */

import type { AIContextEnvelope, ModelOutput } from '@/lib/unified-ai/types'
import { checkFactGuard, applyFactGuardToAnswer } from '@/lib/unified-ai/AIFactGuard'

export interface QualityGateConfig {
  /** If true, reject response entirely when fact guard warnings exceed threshold. Default false = always allow, attach warnings. */
  strictReject?: boolean
  /** Max warnings before rejection in strict mode. Default 2. */
  maxWarningsBeforeReject?: number
}

const DEFAULT_CONFIG: Required<QualityGateConfig> = {
  strictReject: false,
  maxWarningsBeforeReject: 2,
}

/**
 * Run fact guard on a single model output. Returns allowed + warnings.
 */
export function runQualityGate(
  envelope: AIContextEnvelope,
  output: ModelOutput,
  config: QualityGateConfig = {}
): { allowed: boolean; warnings: string[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const result = checkFactGuard(envelope, output)
  const reject = cfg.strictReject && result.warnings.length >= cfg.maxWarningsBeforeReject
  return {
    allowed: !reject && result.allowed,
    warnings: result.warnings,
  }
}

/**
 * Apply fact guard to final composed answer (prepend disclaimer if needed). Same as unified-ai applyFactGuardToAnswer.
 */
export function applyQualityGateToAnswer(
  envelope: AIContextEnvelope,
  answer: string
): { answer: string; factGuardWarnings: string[] } {
  return applyFactGuardToAnswer(envelope, answer)
}
