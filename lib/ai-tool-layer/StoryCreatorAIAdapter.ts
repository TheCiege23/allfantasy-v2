/**
 * StoryCreatorAIAdapter — envelope and evidence for League Story Creator narratives.
 * Deterministic context first, then DeepSeek significance, Grok framing, OpenAI final story output.
 */

import { buildAIContextEnvelope } from "@/lib/unified-ai"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { AIContextEnvelope } from "@/lib/unified-ai/types"

export interface StoryCreatorAdapterContext {
  sport?: string | null
  leagueId?: string | null
  userId?: string | null
  storyType?: string | null
  deterministicPayload?: Record<string, unknown> | null
  userMessage?: string
}

export function buildStoryCreatorEnvelope(ctx: StoryCreatorAdapterContext): AIContextEnvelope {
  const sport = normalizeToSupportedSport(ctx.sport ?? undefined)
  const det = ctx.deterministicPayload ?? {}
  const hardConstraints = [
    "Use only provided deterministic and structured context for story generation.",
    "Do not invent players, matchups, standings, trade outcomes, rivalries, or scores.",
    "If context is sparse, state uncertainty and keep narrative compact.",
  ]

  return buildAIContextEnvelope({
    featureType: "story_creator",
    sport,
    leagueId: ctx.leagueId ?? null,
    userId: ctx.userId ?? null,
    deterministicPayload: {
      ...det,
      storyType: ctx.storyType ?? (det as { storyType?: string }).storyType ?? "weekly_recap",
    },
    promptIntent: "narrative",
    uiSurface: "inline",
    hardConstraints,
    modelRoutingHints: ["deepseek", "grok", "openai"],
    userMessage: ctx.userMessage,
  })
}

export function getStoryCreatorDeterministicEvidence(
  payload: Record<string, unknown> | null
): string[] {
  if (!payload || typeof payload !== "object") return []
  const p = payload as Record<string, unknown>
  const evidence: string[] = []
  if (typeof p.storyType === "string") evidence.push(`Story type: ${p.storyType}`)
  if (typeof p.graphSummary === "string" && p.graphSummary.trim()) {
    evidence.push(`Graph summary: ${p.graphSummary}`)
  }
  if (Array.isArray(p.dramaEvents)) evidence.push(`Drama events: ${p.dramaEvents.length}`)
  if (Array.isArray(p.rivalries)) evidence.push(`Rivalries: ${p.rivalries.length}`)
  if (typeof p.rankingsSnapshot === "string" && p.rankingsSnapshot.trim()) {
    evidence.push(`Rankings snapshot: ${p.rankingsSnapshot}`)
  }
  if (typeof p.legacyHint === "string" && p.legacyHint.trim()) {
    evidence.push(`Legacy hint: ${p.legacyHint}`)
  }
  if (typeof p.simulationHint === "string" && p.simulationHint.trim()) {
    evidence.push(`Simulation hint: ${p.simulationHint}`)
  }
  return evidence.slice(0, 10)
}
