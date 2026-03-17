/**
 * Shared AI response normalizer — OrchestrationResult + provider meta → UnifiedAIResponse.
 */

import type { ModelOutput, OrchestrationResult } from '@/lib/unified-ai/types'
import type { ProviderStatusEntry, UnifiedAIResponse } from './types'
import { resolveProviderFailure } from '@/lib/ai-reliability/ProviderFailureResolver'
import type { ProviderResultMeta } from '@/lib/ai-reliability/types'

export interface NormalizerInput {
  result: OrchestrationResult
  providerResults: ProviderResultMeta[]
  traceId?: string
  cached?: boolean
}

/**
 * Convert provider results to status entries (no secrets).
 */
function toStatusEntries(providerResults: ProviderResultMeta[]): ProviderStatusEntry[] {
  return providerResults.map((r) => ({
    provider: r.provider,
    status: r.status,
    error: r.error,
    latencyMs: r.latencyMs,
  }))
}

/**
 * Extract keyEvidence, risksCaveats, verdict, suggestedNextAction, and PROMPT 123 required fields from modelOutputs.structured.
 */
function extractStructured(result: OrchestrationResult): Pick<
  UnifiedAIResponse,
  'keyEvidence' | 'risksCaveats' | 'verdict' | 'suggestedNextAction' | 'evidence' | 'valueVerdict' | 'viabilityVerdict' | 'actionPlan' | 'confidenceScore' | 'uncertaintyExplanation'
> {
  const out: Pick<
    UnifiedAIResponse,
    'keyEvidence' | 'risksCaveats' | 'verdict' | 'suggestedNextAction' | 'evidence' | 'valueVerdict' | 'viabilityVerdict' | 'actionPlan' | 'confidenceScore' | 'uncertaintyExplanation'
  > = {}
  for (const o of result.modelOutputs) {
    const s = o.structured
    if (!s || typeof s !== 'object') continue
    if (Array.isArray(s.keyEvidence) && s.keyEvidence.length && !out.keyEvidence) {
      out.keyEvidence = s.keyEvidence.slice(0, 10) as string[]
    }
    if (Array.isArray(s.evidence) && s.evidence.length && !out.evidence) {
      out.evidence = (s.evidence as string[]).slice(0, 15)
    }
    if (Array.isArray(s.risksCaveats) && s.risksCaveats.length && !out.risksCaveats) {
      out.risksCaveats = s.risksCaveats.slice(0, 5) as string[]
    }
    if (typeof s.verdict === 'string' && !out.verdict) out.verdict = s.verdict
    if (typeof s.valueVerdict === 'string' && !out.valueVerdict) out.valueVerdict = s.valueVerdict
    if (typeof s.viabilityVerdict === 'string' && !out.viabilityVerdict) out.viabilityVerdict = s.viabilityVerdict
    if (typeof s.suggestedNextAction === 'string' && !out.suggestedNextAction) {
      out.suggestedNextAction = s.suggestedNextAction
    }
    if (typeof s.actionPlan === 'string' && !out.actionPlan) out.actionPlan = s.actionPlan
    if (typeof s.confidenceScore === 'number' && out.confidenceScore == null) out.confidenceScore = s.confidenceScore
    if (typeof s.uncertaintyExplanation === 'string' && !out.uncertaintyExplanation) {
      out.uncertaintyExplanation = s.uncertaintyExplanation
    }
  }
  return out
}

/**
 * Build UnifiedAIResponse from orchestration result and provider metadata.
 */
export function normalizeToUnifiedResponse(input: NormalizerInput): UnifiedAIResponse {
  const { result, providerResults, traceId, cached } = input
  const failure = resolveProviderFailure(providerResults)

  const structured = extractStructured(result)

  const evidence = structured.evidence ?? structured.keyEvidence
  const actionPlan = structured.actionPlan ?? structured.suggestedNextAction
  const confidenceScore = result.confidencePct ?? structured.confidenceScore
  const uncertaintyExplanation = structured.uncertaintyExplanation
    ?? (Array.isArray(result.factGuardWarnings) && result.factGuardWarnings.length
      ? result.factGuardWarnings.join('. ')
      : Array.isArray(structured.risksCaveats) && structured.risksCaveats.length
        ? structured.risksCaveats.join('. ')
        : undefined)

  return {
    primaryAnswer: result.primaryAnswer,
    confidencePct: result.confidencePct,
    confidenceLabel: result.confidenceLabel,
    verdict: structured.verdict,
    keyEvidence: structured.keyEvidence,
    risksCaveats: structured.risksCaveats,
    suggestedNextAction: structured.suggestedNextAction,
    evidence,
    valueVerdict: structured.valueVerdict,
    viabilityVerdict: structured.viabilityVerdict,
    actionPlan,
    confidenceScore,
    uncertaintyExplanation,
    modelOutputs: result.modelOutputs,
    reliability: {
      usedDeterministicFallback: result.usedDeterministic,
      providerStatus: toStatusEntries(providerResults),
      message: failure.message || undefined,
    },
    factGuardWarnings: result.factGuardWarnings,
    traceId,
    cached: !!cached,
    mode: result.mode,
  }
}
