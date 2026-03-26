/**
 * TradeAIAdapter — envelope and evidence for Trade Analyzer.
 * Deterministic engine decides fairness, value, acceptance, risk; DeepSeek reviews; Grok narrative; OpenAI final verdict.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface TradeAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From trade engine: fairnessScore, acceptProbability, lineupDelta, vorpDelta, etc. */
  deterministicPayload?: Record<string, unknown> | null
  leagueFormat?: string
  scoringSummary?: string
  userMessage?: string
}

export function buildTradeEnvelope(ctx: TradeAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Do not override or contradict the fairness score, accept probability, or VORP/lineup deltas.",
    "Explain using the provided lineup impact and scoring drivers only.",
    "Do not invent player values or trade terms not in context.",
  ]
  return buildAIContextEnvelope({
    featureType: "trade_analyzer",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    promptIntent: "explain",
    uiSurface: "inline",
    confidenceMetadata:
      typeof det.fairnessScore === "number" || typeof det.acceptProbability === "number"
        ? { score: Math.round((Number(det.fairnessScore ?? det.acceptProbability ?? 50) + Number(det.acceptProbability ?? 50)) / 2), reason: "From trade engine" }
        : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

/** Extract evidence strings from trade deterministic payload for ToolOutput. */
export function getTradeDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const out: string[] = []
  if (payload.fairnessScore != null) out.push(`Fairness score: ${payload.fairnessScore}`)
  if (payload.acceptProbability != null) out.push(`Accept probability: ${payload.acceptProbability}`)
  if (payload.lineupDelta != null) out.push(`Lineup impact: ${JSON.stringify(payload.lineupDelta).slice(0, 80)}`)
  if (payload.vorpDelta != null) out.push(`VORP delta: ${JSON.stringify(payload.vorpDelta).slice(0, 80)}`)
  return out
}
