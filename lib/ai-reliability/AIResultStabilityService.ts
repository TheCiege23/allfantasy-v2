/**
 * Orchestrates stable AI result: run analysis, on full failure return deterministic + explanation (Prompt 127).
 */

import type { ReliabilityMetadata, DeterministicFallbackPayload, ProviderResultMeta } from './types';
import { resolveProviderFailure, providerStatusFromError } from './ProviderFailureResolver';
import { buildDeterministicFallback } from './DeterministicFallbackService';
import type { TradeDecisionContextV1 } from '@/lib/trade-engine/trade-decision-context';

export interface StableTradeAnalysisResult {
  success: boolean;
  /** When false, only deterministic result is included */
  hasAiConsensus: boolean;
  sections?: unknown;
  deterministicVerdict?: unknown;
  deterministicFallback?: DeterministicFallbackPayload;
  fallbackExplanation?: string;
  reliability: ReliabilityMetadata;
}

/**
 * Build reliability metadata from provider results and optional consensus/gate.
 */
export function buildReliabilityMetadata(params: {
  providerResults: ProviderResultMeta[];
  confidence: number;
  usedDeterministicFallback: boolean;
  fallbackExplanation?: string;
  dataQualityWarnings?: string[];
  hardViolation?: boolean;
}): ReliabilityMetadata {
  const failureState = resolveProviderFailure(params.providerResults);
  return {
    confidence: params.confidence,
    usedDeterministicFallback: params.usedDeterministicFallback,
    providerResults: params.providerResults,
    fallbackExplanation: params.fallbackExplanation ?? (failureState.allFailed ? failureState.message : undefined),
    dataQualityWarnings: params.dataQualityWarnings ?? [],
    hardViolation: params.hardViolation ?? false,
  };
}

/**
 * When consensus is null, build stable response with deterministic fallback so UI does not break.
 */
export function buildStableFallbackResponse(ctx: TradeDecisionContextV1): {
  deterministicFallback: DeterministicFallbackPayload;
  fallbackExplanation: string;
  reliability: ReliabilityMetadata;
} {
  const { payload, explanation } = buildDeterministicFallback(ctx);
  const reliability = buildReliabilityMetadata({
    providerResults: [{ provider: 'openai', status: 'failed' }, { provider: 'grok', status: 'failed' }],
    confidence: payload.confidence,
    usedDeterministicFallback: true,
    fallbackExplanation: explanation,
    dataQualityWarnings: payload.warnings,
    hardViolation: false,
  });

  return {
    deterministicFallback: payload,
    fallbackExplanation: explanation,
    reliability,
  };
}

export function providerResultMeta(provider: string, error: unknown): ProviderResultMeta {
  return {
    provider,
    status: providerStatusFromError(error),
    error: error instanceof Error ? error.message : String(error),
  };
}
