/**
 * When all AI providers fail, return deterministic-only result + explanation (Prompt 127).
 */

import type { DeterministicFallbackPayload } from './types';
import type { TradeDecisionContextV1 } from '@/lib/trade-engine/trade-decision-context';
import { buildDeterministicIntelligence } from '@/lib/trade-engine/deterministic-intelligence';
import { computeDeterministicVerdict } from '@/lib/trade-engine/trade-response-formatter';
import { computeDataCoverageTier } from '@/lib/trade-engine/trade-decision-context';

const FALLBACK_EXPLANATION =
  'AI analysis is temporarily unavailable. The result below is based only on league data and valuations (no LLM). You can retry for a full analysis.';

/**
 * Build deterministic-only payload for trade analyzer when consensus is null.
 */
export function buildDeterministicFallback(ctx: TradeDecisionContextV1): {
  payload: DeterministicFallbackPayload;
  explanation: string;
} {
  const deterministic = buildDeterministicIntelligence(ctx);
  const verdictResult = computeDeterministicVerdict(ctx);
  const dataCoverage = computeDataCoverageTier(
    ctx.dataQuality,
    ctx.missingData,
    ctx.sourceFreshness
  );

  const payload: DeterministicFallbackPayload = {
    verdict: verdictResult.verdict.winnerLabel ?? 'Even',
    winner: verdictResult.verdict.winner === 'Even' ? undefined : verdictResult.verdict.winner,
    confidence: deterministic.confidence,
    reasons: deterministic.reasons,
    warnings: deterministic.warnings,
    dataQualityTier: dataCoverage.tier,
  };

  return { payload, explanation: FALLBACK_EXPLANATION };
}
