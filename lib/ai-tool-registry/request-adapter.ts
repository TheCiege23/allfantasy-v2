/**
 * Adapt PROMPT 124 request contract to UnifiedAIRequest (envelope + mode).
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import type { UnifiedAIRequest } from '@/lib/ai-orchestration/types'
import type { AIToolRequestContract } from './contracts'
import { getToolRegistration, resolveModeForTool } from './registry'
import {
  buildEnvelopeForTool as buildToolLayerEnvelope,
  resolveEnvelopeBuilderToolKey,
} from '@/lib/ai-tool-layer'

function buildToolLayerEnvelopeIfSupported(
  contract: AIToolRequestContract,
  sport: string,
  userId?: string | null
): AIContextEnvelope | null {
  const layerTool = resolveEnvelopeBuilderToolKey(contract.tool)
  if (!layerTool) return null

  const base = {
    sport,
    leagueId: contract.leagueId ?? null,
    userId: contract.userId ?? userId ?? null,
    deterministicPayload: contract.deterministicContext ?? null,
    userMessage: contract.userMessage ?? undefined,
  }

  switch (layerTool) {
    case 'trade_analyzer':
      return buildToolLayerEnvelope('trade_analyzer', base)
    case 'waiver_ai':
      return buildToolLayerEnvelope('waiver_ai', base)
    case 'rankings':
      return buildToolLayerEnvelope('rankings', base)
    case 'draft_helper':
      return buildToolLayerEnvelope('draft_helper', base)
    case 'matchup':
      return buildToolLayerEnvelope('matchup', base)
    case 'legacy_score':
      return buildToolLayerEnvelope('legacy_score', base)
    case 'rivalries':
      return buildToolLayerEnvelope('rivalries', base)
    case 'psychological':
      return buildToolLayerEnvelope(layerTool, {
        ...base,
        behaviorPayload: contract.leagueSettings ?? null,
      })
    default:
      return null
  }
}

export function requestContractToUnified(
  contract: AIToolRequestContract,
  userId?: string | null
): UnifiedAIRequest {
  const sport = normalizeToSupportedSport(contract.sport ?? undefined)
  const reg = getToolRegistration(contract.tool)
  const featureType = reg?.toolKey ?? contract.tool
  const useSingleProvider =
    contract.provider && reg?.allowedProviders.includes(contract.provider)
  const mode = useSingleProvider ? 'single_model' : resolveModeForTool(featureType, contract.aiMode ?? undefined)

  const toolLayerEnvelope = buildToolLayerEnvelopeIfSupported(contract, sport, userId)
  const baseHardConstraints = [
    'Deterministic-first: never override hard engine outputs.',
    'Use only provided deterministic, league, scoring, roster, and sport context.',
    'Never invent player values, rankings, injuries, roster needs, or team context.',
    'If confidence is limited, say so explicitly and explain uncertainty.',
  ]
  const envelope: AIContextEnvelope = {
    ...(toolLayerEnvelope ?? {
      featureType,
      sport,
      leagueId: contract.leagueId ?? null,
      userId: contract.userId ?? userId ?? null,
      deterministicPayload: contract.deterministicContext ?? null,
      statisticsPayload: contract.leagueSettings ?? null,
      userMessage: contract.userMessage ?? undefined,
    }),
    featureType,
    sport,
    statisticsPayload: contract.leagueSettings ?? (toolLayerEnvelope?.statisticsPayload ?? null),
    modelRoutingHints: useSingleProvider && contract.provider ? [contract.provider] : toolLayerEnvelope?.modelRoutingHints,
    hardConstraints: Array.from(
      new Set([...(toolLayerEnvelope?.hardConstraints ?? []), ...baseHardConstraints])
    ),
    assistantRoutingHints:
      featureType === 'chimmy_chat'
        ? ['chimmy']
        : featureType === 'openclaw_dev_assistant'
          ? ['openclaw_dev_assistant']
          : featureType === 'openclaw_growth_marketing_assistant'
            ? ['openclaw_growth_marketing_assistant']
            : undefined,
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
