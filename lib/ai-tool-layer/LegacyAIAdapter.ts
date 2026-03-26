/**
 * LegacyAIAdapter — envelope and evidence for legacy / dynasty / historical score explanations.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface LegacyAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From legacy engine: score, component deltas, evidence list, trend windows. */
  deterministicPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildLegacyEnvelope(ctx: LegacyAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Do not invent legacy points, score components, or historical events not in context.",
    "Do not override deterministic legacy or dynasty score outputs.",
    "If historical evidence is sparse, explicitly state low confidence.",
  ]
  return buildAIContextEnvelope({
    featureType: "legacy_score",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    promptIntent: "explain",
    uiSurface: "inline",
    confidenceMetadata:
      typeof (det as any).score === "number"
        ? { score: Math.max(40, Math.min(80, Math.round(Number((det as any).score)))), reason: "From deterministic legacy scoring engine" }
        : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getLegacyDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const p = payload as any
  const out: string[] = []
  if (p.score != null) out.push(`Legacy score: ${p.score}`)
  if (p.rank != null) out.push(`Legacy rank: ${p.rank}`)
  if (p.evidenceCount != null) out.push(`Evidence count: ${p.evidenceCount}`)
  if (Array.isArray(p.factors)) out.push(`Top factors: ${(p.factors as any[]).slice(0, 3).join(", ")}`)
  return out
}
