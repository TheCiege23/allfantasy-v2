/**
 * MatchupAIAdapter — envelope and evidence for Matchup explanations.
 * Simulation/projection engine goes first; DeepSeek interprets structure; OpenAI explains recommendation.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface MatchupAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From simulation engine: win probability, spread outcomes, projections, injury adjustments. */
  deterministicPayload?: Record<string, unknown> | null
  simulationPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildMatchupEnvelope(ctx: MatchupAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Do not invent projections, win probabilities, or injury adjustments not present in context.",
    "Do not override simulation outputs, spread outcomes, or deterministic matchup scores.",
    "Respect league scoring format and roster constraints when explaining matchup recommendations.",
  ]
  return buildAIContextEnvelope({
    featureType: "matchup",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    simulationPayload: ctx.simulationPayload ?? null,
    promptIntent: "explain",
    uiSurface: "inline",
    confidenceMetadata:
      typeof (det as any).winProbability === "number"
        ? { score: Math.max(45, Math.min(85, Math.round(Number((det as any).winProbability)))), reason: "From matchup simulation output" }
        : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getMatchupDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const p = payload as any
  const out: string[] = []
  if (p.winProbability != null) out.push(`Win probability: ${p.winProbability}`)
  if (p.projectedPointsFor != null) out.push(`Projected points for: ${p.projectedPointsFor}`)
  if (p.projectedPointsAgainst != null) out.push(`Projected points against: ${p.projectedPointsAgainst}`)
  if (Array.isArray(p.outcomes)) out.push(`Simulated outcomes: ${p.outcomes.length}`)
  if (p.spread != null) out.push(`Spread: ${p.spread}`)
  return out
}
