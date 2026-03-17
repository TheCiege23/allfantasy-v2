/**
 * ModelRoutingResolver — decides which model(s) to use from envelope and mode.
 * Aligns with 3-AI responsibility model: OpenAI (explanation/UX), DeepSeek (analytical), Grok (narrative/trends).
 */

import type { AIContextEnvelope, AIModelRole, OrchestrationMode } from "./types"

/** Which role each model fulfills. */
export const MODEL_RESPONSIBILITIES: Record<
  AIModelRole,
  { primary: string; bestFor: string[] }
> = {
  openai: {
    primary: "Final user-facing explanation, natural language, action plans, Chimmy voice.",
    bestFor: ["explanation", "chat", "guidance", "synthesis", "voice"],
  },
  deepseek: {
    primary: "Structured analytical reasoning, stats interpretation, numeric review, deterministic context.",
    bestFor: ["analysis", "numbers", "projections", "matrix_review", "decision_support"],
  },
  grok: {
    primary: "Trend interpretation, narrative framing, social/summary, league story, engagement.",
    bestFor: ["trends", "narrative", "social", "story", "engagement"],
  },
}

/**
 * Resolve orchestration mode from envelope or default.
 */
export function resolveOrchestrationMode(
  envelope: AIContextEnvelope,
  defaultMode: OrchestrationMode = "unified_brain"
): OrchestrationMode {
  const intent = envelope.promptIntent ?? ""
  const feature = envelope.featureType ?? ""

  if (envelope.modelRoutingHints?.length === 1) return "single_model"
  if (intent === "explain" && envelope.deterministicPayload) return "specialist"
  if (feature === "chimmy_chat") return "unified_brain"
  if (feature === "graph_insight" || feature === "bracket_intelligence") return "unified_brain"

  return defaultMode
}

/**
 * For single-model mode: which model to use from envelope hints or feature.
 */
export function resolveSingleModel(
  envelope: AIContextEnvelope
): AIModelRole {
  const hint = envelope.modelRoutingHints?.[0]
  if (hint) return hint

  const feature = envelope.featureType ?? ""
  const intent = envelope.promptIntent ?? ""

  if (intent === "explain" || feature.includes("explain")) return "openai"
  if (feature.includes("rankings") || feature.includes("simulation")) return "deepseek"
  if (feature.includes("story") || feature.includes("rivalry") || feature.includes("narrative")) return "grok"

  return "openai"
}

/**
 * For specialist mode: which model for "computation/analysis" and which for "explanation".
 */
export function resolveSpecialistPair(
  envelope: AIContextEnvelope
): { analysis: AIModelRole; explanation: AIModelRole } {
  const hints = envelope.modelRoutingHints ?? []
  if (hints.length >= 2) return { analysis: hints[0], explanation: hints[1] }
  return { analysis: "deepseek", explanation: "openai" }
}

/**
 * For consensus or unified_brain: which models to run (all three by default).
 */
export function resolveModelsForConsensus(
  envelope: AIContextEnvelope
): AIModelRole[] {
  const hints = envelope.modelRoutingHints
  if (hints?.length) return [...new Set(hints)]
  return ["deepseek", "grok", "openai"]
}
