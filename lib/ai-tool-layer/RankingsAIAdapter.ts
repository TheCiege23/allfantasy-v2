/**
 * RankingsAIAdapter — envelope and evidence for League Rankings explanations.
 * Deterministic ranking engine first; DeepSeek interprets movement; OpenAI plain language.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface RankingsAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From rankings engine: ordering, tiers, scores, movement. */
  deterministicPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildRankingsEnvelope(ctx: RankingsAdapterContext): AIContextEnvelope {
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Do not invent rankings or movement not in the provided data.",
    "Explain using only the given ordering, tiers, and scores.",
    "Respect league format and scoring.",
  ]
  return buildAIContextEnvelope({
    featureType: "rankings",
    sport: ctx.sport ?? undefined,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    promptIntent: "explain",
    uiSurface: "inline",
    confidenceMetadata: det.ordering ? { score: 70, reason: "From rankings engine" } : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getRankingsDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const out: string[] = []
  if (Array.isArray(payload.ordering)) out.push(`Ordering: ${(payload.ordering as any[]).length} teams`)
  if (payload.tiers) out.push(`Tiers: ${JSON.stringify(payload.tiers).slice(0, 60)}`)
  if (payload.scores) out.push(`Scores: ${JSON.stringify(payload.scores).slice(0, 60)}`)
  return out
}
