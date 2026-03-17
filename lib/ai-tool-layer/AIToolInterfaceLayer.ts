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

export type ToolContextMap = {
  trade_analyzer: Parameters<typeof buildTradeEnvelope>[0]
  waiver_ai: Parameters<typeof buildWaiverEnvelope>[0]
  rankings: Parameters<typeof buildRankingsEnvelope>[0]
  draft_helper: Parameters<typeof buildDraftEnvelope>[0]
  psychology: Parameters<typeof buildPsychologyEnvelope>[0]
}

const ENVELOPE_BUILDERS = {
  trade_analyzer: buildTradeEnvelope,
  waiver_ai: buildWaiverEnvelope,
  rankings: buildRankingsEnvelope,
  draft_helper: buildDraftEnvelope,
  psychology: buildPsychologyEnvelope,
} as const

const EVIDENCE_GETTERS = {
  trade_analyzer: getTradeDeterministicEvidence,
  waiver_ai: getWaiverDeterministicEvidence,
  rankings: getRankingsDeterministicEvidence,
  draft_helper: getDraftDeterministicEvidence,
  psychology: getPsychologyDeterministicEvidence,
} as const

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
  const fn = EVIDENCE_GETTERS[toolKey as keyof typeof EVIDENCE_GETTERS]
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
