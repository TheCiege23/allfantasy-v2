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
    confidenceLabel: response.confidenceLabel ?? null,
    confidenceReason: response.confidenceReason ?? null,
    uncertainty: response.uncertaintyExplanation ?? (response.risksCaveats?.[0] ?? null),
    providerResults,
    usedDeterministicFallback: response.reliability?.usedDeterministicFallback ?? false,
    reliability: response.reliability
      ? {
          usedDeterministicFallback: response.reliability.usedDeterministicFallback,
          message: response.reliability.message,
          fallbackExplanation: response.reliability.fallbackExplanation,
          dataQualityWarnings: response.reliability.dataQualityWarnings,
          hardViolation: response.reliability.hardViolation,
          confidence: response.reliability.confidence,
          confidenceSource: response.reliability.confidenceSource,
          partialProviderFailure: response.reliability.partialProviderFailure,
          disagreement: response.reliability.disagreement,
          aiQa: response.reliability.aiQa,
          providerStatus: response.reliability.providerStatus,
        }
      : null,
    alternateOutputs: response.alternateOutputs ?? [],
    traceId: response.traceId ?? null,
    verdict: response.verdict ?? response.valueVerdict ?? null,
    risksCaveats: response.risksCaveats ?? [],
    suggestedNextAction: response.suggestedNextAction ?? response.actionPlan ?? null,
    deterministicEnvelope: null,
    normalizedOutput: null,
    debugTrace: {
      traceId: response.traceId ?? null,
      providerUsed: response.modelOutputs?.find((output) => !output.skipped && !output.error)?.model,
      confidenceCapped: response.reliability?.confidenceSource === 'capped',
      uncertaintyCount: (response.uncertaintyExplanation?.trim() ? 1 : 0),
      missingDataCount: response.reliability?.dataQualityWarnings?.length ?? 0,
    },
    factGuardWarnings: response.factGuardWarnings ?? [],
  }
}
