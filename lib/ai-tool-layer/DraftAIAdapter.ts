/**
 * DraftAIAdapter — envelope and evidence for AI Draft Helper.
 * Deterministic board/scarcity/roster-fit first; DeepSeek reviews board; OpenAI recommendation and contingency.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface DraftAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From draft engine: board, scarcity, roster needs, suggested pick. */
  deterministicPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildDraftEnvelope(ctx: DraftAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Recommend only from the provided board or position list.",
    "Do not invent ADP, scarcity, or roster needs not in context.",
    "Respect league format (snake/auction, roster spots).",
  ]
  return buildAIContextEnvelope({
    featureType: "draft_helper",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    promptIntent: "recommend",
    uiSurface: "inline",
    confidenceMetadata: det.suggestedPick ? { score: 72, reason: "From draft board" } : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getDraftDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const out: string[] = []
  const p = payload as any
  if (p.suggestedPick != null) out.push(`Suggested pick: ${p.suggestedPick}`)
  if (p.scarcity != null) out.push(`Scarcity: ${JSON.stringify(p.scarcity).slice(0, 60)}`)
  if (Array.isArray(p.board)) out.push(`Board: ${(p.board as any[]).length} players`)
  return out
}
