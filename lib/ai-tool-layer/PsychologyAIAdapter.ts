/**
 * PsychologyAIAdapter — envelope and evidence for Psychological profile explanations.
 * Evidence and profile engine first; DeepSeek reviews consistency; Grok framing; OpenAI clear explanation.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface PsychologyAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  /** From profile engine: scores, labels, evidence count. */
  deterministicPayload?: Record<string, unknown> | null
  behaviorPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildPsychologyEnvelope(ctx: PsychologyAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Explain only using the provided profile scores and evidence.",
    "Do not invent behavioral traits or evidence not in context.",
    "If evidence is limited, say so.",
  ]
  return buildAIContextEnvelope({
    featureType: "psychological",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: det,
    behaviorPayload: ctx.behaviorPayload ?? null,
    promptIntent: "explain",
    uiSurface: "inline",
    confidenceMetadata:
      (det as any).evidenceCount != null
        ? { score: Math.min(75, 50 + Number((det as any).evidenceCount) * 2), reason: "From profile evidence" }
        : null,
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getPsychologyDeterministicEvidence(payload: Record<string, unknown> | null): string[] {
  if (!payload || typeof payload !== "object") return []
  const out: string[] = []
  const p = payload as any
  if (p.aggressionScore != null) out.push(`Aggression: ${p.aggressionScore}`)
  if (p.activityScore != null) out.push(`Activity: ${p.activityScore}`)
  if (p.tradeFrequencyScore != null) out.push(`Trade frequency: ${p.tradeFrequencyScore}`)
  if (p.waiverFocusScore != null) out.push(`Waiver focus: ${p.waiverFocusScore}`)
  if (p.riskToleranceScore != null) out.push(`Risk tolerance: ${p.riskToleranceScore}`)
  if (Array.isArray(p.profileLabels)) out.push(`Labels: ${(p.profileLabels as string[]).join(", ")}`)
  if (p.evidenceCount != null) out.push(`Evidence: ${p.evidenceCount} signals`)
  return out
}
