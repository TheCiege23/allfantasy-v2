/**
 * RivalryAIAdapter — envelope and evidence for rivalry / drama / graph-intensity explanations.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface RivalryAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From rivalry engine: intensity/composite score, history, matchup cadence. */
  deterministicPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildRivalryEnvelope(ctx: RivalryAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Do not invent rivalry history, scores, or matchup records that are not in context.",
    "Keep narrative framing tied to deterministic rivalry metrics and documented events.",
    "Do not overstate certainty when rivalry evidence is limited.",
  ]
  return buildAIContextEnvelope({
    featureType: "rivalries",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    promptIntent: "narrative",
    uiSurface: "inline",
    confidenceMetadata:
      typeof (det as any).intensityScore === "number" || typeof (det as any).compositeScore === "number"
        ? { score: Math.max(35, Math.min(82, Math.round(Number((det as any).intensityScore ?? (det as any).compositeScore)))), reason: "From rivalry/graph deterministic outputs" }
        : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getRivalryDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const p = payload as any
  const out: string[] = []
  if (p.intensityScore != null) out.push(`Rivalry intensity: ${p.intensityScore}`)
  if (p.compositeScore != null) out.push(`Composite rivalry score: ${p.compositeScore}`)
  if (p.seriesRecord != null) out.push(`Series record: ${p.seriesRecord}`)
  if (Array.isArray(p.recentMeetings)) out.push(`Recent meetings tracked: ${p.recentMeetings.length}`)
  return out
}
