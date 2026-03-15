/**
 * AIMetaContextResolver – resolves meta context for AI systems (OpenAI, DeepSeek, Grok).
 * Injects trending players, strategy meta, and optional narrative for:
 * - AI draft suggestions
 * - Waiver recommendations
 * - Trade analysis
 * - Plain-language meta summaries and actionable suggestions (sport context).
 */

import { getMetaInsightsContext, formatMetaContextForPrompt } from '@/lib/ai-meta-context'
import { buildAIMetaSummary } from '@/lib/global-meta-engine/MetaAggregationPipeline'
import { resolveSportForMetaUI } from './SportMetaUIResolver'

export interface AIMetaContextPayload {
  sport: string
  promptBlob: string
  hottestPlayers: Array<{ playerId: string; trendScore: number; direction: string }>
  risingPlayers: Array<{ playerId: string; trendScore: number; direction: string }>
  fallers: Array<{ playerId: string; trendScore: number; direction: string }>
  strategyMeta: Array<{ strategyType: string; usageRate: number; successRate: number; trendingDirection: string }>
  /** Short narrative/summary for user-facing explanations (OpenAI). */
  summary?: string
  /** Top trend bullets for Grok-style narrative. */
  topTrends?: string[]
}

/**
 * Resolve full meta context for AI prompt injection (waiver, draft, trade, chat).
 * Use from API routes that call OpenAI / DeepSeek / Grok so models get platform meta.
 */
export async function resolveAIMetaContext(sport: string): Promise<AIMetaContextPayload> {
  const normalizedSport = resolveSportForMetaUI(sport)
  const [ctx, aiSummary] = await Promise.all([
    getMetaInsightsContext(normalizedSport),
    buildAIMetaSummary(normalizedSport, undefined, '7d'),
  ])
  const promptBlob = formatMetaContextForPrompt(ctx)
  return {
    sport: ctx.sport,
    promptBlob,
    hottestPlayers: ctx.hottestPlayers,
    risingPlayers: ctx.risingPlayers,
    fallers: ctx.fallers,
    strategyMeta: ctx.strategyMeta,
    summary: aiSummary.summary,
    topTrends: aiSummary.topTrends,
  }
}

/**
 * Get only the text blob for prompt injection (minimal payload).
 */
export async function getMetaPromptBlob(sport: string): Promise<string> {
  const ctx = await getMetaInsightsContext(resolveSportForMetaUI(sport))
  return formatMetaContextForPrompt(ctx)
}
