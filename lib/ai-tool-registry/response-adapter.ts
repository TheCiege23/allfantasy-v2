/**
 * Adapt UnifiedAIResponse to PROMPT 124 response contract.
 */

import type { UnifiedAIResponse } from '@/lib/ai-orchestration/types'
import type { AIToolResponseContract, ProviderResultItem } from './contracts'

export function unifiedResponseToContract(response: UnifiedAIResponse): AIToolResponseContract {
  const evidence = response.evidence ?? response.keyEvidence ?? []
  const providerResults: ProviderResultItem[] = (response.modelOutputs ?? []).map((o) => ({
    provider: o.model,
    raw: o.raw ?? '',
    error: o.error ?? null,
    skipped: o.skipped ?? false,
    latencyMs: response.reliability?.providerStatus?.find((p) => p.provider === o.model)?.latencyMs,
  }))
  return {
    evidence: Array.isArray(evidence) ? evidence : [],
    aiExplanation: response.primaryAnswer ?? '',
    actionPlan: response.actionPlan ?? response.suggestedNextAction ?? null,
    confidence: response.confidenceScore ?? response.confidencePct ?? null,
    uncertainty: response.uncertaintyExplanation ?? (response.risksCaveats?.[0] ?? null),
    providerResults,
    usedDeterministicFallback: response.reliability?.usedDeterministicFallback ?? false,
    traceId: response.traceId ?? null,
  }
}
