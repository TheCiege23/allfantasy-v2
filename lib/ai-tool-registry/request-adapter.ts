/**
 * Adapt PROMPT 124 request contract to UnifiedAIRequest (envelope + mode).
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import type { UnifiedAIRequest } from '@/lib/ai-orchestration/types'
import type { AIToolRequestContract } from './contracts'
import { getToolRegistration, resolveModeForTool } from './registry'

export function requestContractToUnified(
  contract: AIToolRequestContract,
  userId?: string | null
): UnifiedAIRequest {
  const sport = normalizeToSupportedSport(contract.sport ?? undefined)
  const reg = getToolRegistration(contract.tool)
  const useSingleProvider =
    contract.provider && reg?.allowedProviders.includes(contract.provider)
  const mode = useSingleProvider ? 'single_model' : resolveModeForTool(contract.tool, contract.aiMode ?? undefined)
  const envelope: AIContextEnvelope = {
    featureType: contract.tool,
    sport,
    leagueId: contract.leagueId ?? null,
    userId: contract.userId ?? userId ?? null,
    deterministicPayload: contract.deterministicContext ?? null,
    statisticsPayload: contract.leagueSettings ?? null,
    userMessage: contract.userMessage ?? undefined,
    modelRoutingHints: useSingleProvider && contract.provider ? [contract.provider] : undefined,
    hardConstraints: [
      'Do not invent player values or override deterministic scores.',
      'Use only the provided deterministic context.',
    ],
  }
  return {
    envelope,
    mode,
    options: {
      traceId: undefined,
      timeoutMs: 25_000,
      maxRetries: 1,
    },
  }
}
