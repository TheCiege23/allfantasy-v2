/**
 * AIToolInterfaceLayer — single entry for tool AI: build envelope, format result, apply fact guard.
 * Callers (route handlers) run deterministic engines and model APIs; this layer standardizes context and output shape.
 */

import type { AIContextEnvelope } from "@/lib/unified-ai/types"
import { applyFactGuardToAnswer } from "@/lib/unified-ai/AIFactGuard"
import { buildToolOutputSections } from "./AIResultSectionBuilder"
import { formatToolOutputToSections } from "./ToolOutputFormatter"
import type { ToolOutput, ToolKey } from "./types"
import { buildTradeEnvelope, getTradeDeterministicEvidence } from "./TradeAIAdapter"
import { buildWaiverEnvelope, getWaiverDeterministicEvidence } from "./WaiverAIAdapter"
import { buildRankingsEnvelope, getRankingsDeterministicEvidence } from "./RankingsAIAdapter"
import { buildDraftEnvelope, getDraftDeterministicEvidence } from "./DraftAIAdapter"
import { buildPsychologyEnvelope, getPsychologyDeterministicEvidence } from "./PsychologyAIAdapter"
import { buildMatchupEnvelope, getMatchupDeterministicEvidence } from "./MatchupAIAdapter"
import { buildLegacyEnvelope, getLegacyDeterministicEvidence } from "./LegacyAIAdapter"
import { buildRivalryEnvelope, getRivalryDeterministicEvidence } from "./RivalryAIAdapter"
import {
  buildStoryCreatorEnvelope,
  getStoryCreatorDeterministicEvidence,
} from "./StoryCreatorAIAdapter"

export type ToolContextMap = {
  trade_analyzer: Parameters<typeof buildTradeEnvelope>[0]
  waiver_ai: Parameters<typeof buildWaiverEnvelope>[0]
  rankings: Parameters<typeof buildRankingsEnvelope>[0]
  draft_helper: Parameters<typeof buildDraftEnvelope>[0]
  psychological: Parameters<typeof buildPsychologyEnvelope>[0]
  matchup: Parameters<typeof buildMatchupEnvelope>[0]
  legacy_score: Parameters<typeof buildLegacyEnvelope>[0]
  rivalries: Parameters<typeof buildRivalryEnvelope>[0]
  story_creator: Parameters<typeof buildStoryCreatorEnvelope>[0]
}

const ENVELOPE_BUILDERS = {
  trade_analyzer: buildTradeEnvelope,
  waiver_ai: buildWaiverEnvelope,
  rankings: buildRankingsEnvelope,
  draft_helper: buildDraftEnvelope,
  psychological: buildPsychologyEnvelope,
  matchup: buildMatchupEnvelope,
  legacy_score: buildLegacyEnvelope,
  rivalries: buildRivalryEnvelope,
  story_creator: buildStoryCreatorEnvelope,
} as const

const EVIDENCE_GETTERS = {
  trade_analyzer: getTradeDeterministicEvidence,
  waiver_ai: getWaiverDeterministicEvidence,
  rankings: getRankingsDeterministicEvidence,
  draft_helper: getDraftDeterministicEvidence,
  psychological: getPsychologyDeterministicEvidence,
  matchup: getMatchupDeterministicEvidence,
  legacy_score: getLegacyDeterministicEvidence,
  rivalries: getRivalryDeterministicEvidence,
  story_creator: getStoryCreatorDeterministicEvidence,
} as const

const ENVELOPE_BUILDER_ALIASES: Record<string, keyof ToolContextMap> = {
  trade_analyzer: "trade_analyzer",
  waiver_ai: "waiver_ai",
  rankings: "rankings",
  draft_helper: "draft_helper",
  psychological: "psychological",
  psychology: "psychological",
  psychological_profiles: "psychological",
  matchup: "matchup",
  simulation: "matchup",
  legacy_score: "legacy_score",
  legacy: "legacy_score",
  rivalries: "rivalries",
  rivalry: "rivalries",
  drama: "rivalries",
  story_creator: "story_creator",
}

const TOOL_KEY_ALIASES: Record<string, ToolKey> = {
  ...ENVELOPE_BUILDER_ALIASES,
}

export function resolveEnvelopeBuilderToolKey(toolKey: string): keyof ToolContextMap | null {
  const normalized = (toolKey ?? "").trim().toLowerCase()
  return ENVELOPE_BUILDER_ALIASES[normalized] ?? null
}

export function resolveToolKeyAlias(toolKey: string): ToolKey | null {
  const normalized = (toolKey ?? "").trim().toLowerCase()
  return TOOL_KEY_ALIASES[normalized] ?? null
}

/**
 * Build envelope for a tool. Use before calling deterministic engine and model APIs.
 */
export function buildEnvelopeForTool<K extends keyof ToolContextMap>(
  toolKey: K,
  context: ToolContextMap[K]
): AIContextEnvelope {
  const fn = ENVELOPE_BUILDERS[toolKey]
  return (fn as (ctx: any) => AIContextEnvelope)(context)
}

/**
 * Get deterministic evidence strings for a tool (for ToolOutput keyEvidence).
 */
export function getDeterministicEvidenceForTool(
  toolKey: ToolKey,
  deterministicPayload: Record<string, unknown> | null
): string[] {
  const normalized = resolveToolKeyAlias(toolKey) ?? toolKey
  const fn = EVIDENCE_GETTERS[normalized as keyof typeof EVIDENCE_GETTERS]
  return fn ? fn(deterministicPayload) : []
}

/**
 * Format orchestration result into ToolOutput and apply fact guard.
 * Call after runOrchestration in unified-ai; use primaryAnswer and envelope.
 */
export function formatToolResult(options: {
  toolKey: ToolKey
  primaryAnswer: string
  structured?: Record<string, unknown> | null
  envelope: AIContextEnvelope
  factGuardWarnings?: string[]
}): { output: ToolOutput; sections: ReturnType<typeof formatToolOutputToSections>; factGuardWarnings: string[] } {
  const { toolKey, primaryAnswer, structured, envelope, factGuardWarnings: existing } = options
  const deterministicEvidence = getDeterministicEvidenceForTool(toolKey, envelope.deterministicPayload ?? null)
  const { answer, factGuardWarnings } = applyFactGuardToAnswer(envelope, primaryAnswer)
  const output = buildToolOutputSections({
    primaryAnswer: answer,
    structured,
    envelope,
    toolKey,
    deterministicEvidence,
  })
  const sections = formatToolOutputToSections(output)
  return {
    output,
    sections,
    factGuardWarnings: existing?.length ? existing : factGuardWarnings,
  }
}

export { formatToolOutputToSections, formatToolOutputSummary } from "./ToolOutputFormatter"
export type { FormattedSection } from "./ToolOutputFormatter"
export type { ToolOutput, ToolKey } from "./types"
