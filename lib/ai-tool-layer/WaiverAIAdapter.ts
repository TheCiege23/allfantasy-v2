/**
 * WaiverAIAdapter — envelope and evidence for Waiver Wire Advisor.
 * Deterministic/rules engine scores and prioritizes; DeepSeek interprets; OpenAI explains who to add and why.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface WaiverAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From waiver engine: priority score, rank, targets, scoring context. */
  deterministicPayload?: Record<string, unknown> | null
  waiverType?: string
  userMessage?: string
}

export function buildWaiverEnvelope(ctx: WaiverAdapterContext): AIContextEnvelope {
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Recommend only players or claims present in the provided context.",
    "Do not invent waiver priority, FAAB amounts, or roster needs not given.",
    "Respect league format and scoring when explaining.",
  ]
  return buildAIContextEnvelope({
    featureType: "waiver_ai",
    sport: ctx.sport ?? undefined,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    promptIntent: "recommend",
    uiSurface: "inline",
    confidenceMetadata:
      typeof (det as any).priorityScore === "number" || typeof (det as any).rank === "number"
        ? { score: Math.min(85, 50 + ((det as any).priorityScore ?? (det as any).rank ?? 50) / 2), reason: "From waiver engine" }
        : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getWaiverDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const out: string[] = []
  const p = payload as any
  if (p.priorityScore != null) out.push(`Priority score: ${p.priorityScore}`)
  if (p.rank != null) out.push(`Rank: ${p.rank}`)
  if (Array.isArray(p.targets)) out.push(`Top targets: ${(p.targets as any[]).slice(0, 5).map((t: any) => t?.name ?? t).join(", ")}`)
  return out
}
