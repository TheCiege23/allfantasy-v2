/**
 * AI Orchestration — shared types for provider abstraction, request/response, errors, and tool registry.
 * AllFantasy unified AI backend foundation. Keys and secrets server-side only.
 */

import type { AIContextEnvelope, AIModelRole, ModelOutput, OrchestrationMode, OrchestrationResult } from '@/lib/unified-ai/types'

/** Supported tool types for orchestration (canonical featureType values). */
export const ORCHESTRATION_TOOL_TYPES = [
  'trade_analyzer',
  'waiver_ai',
  'draft_helper',
  'matchup',
  'rankings',
  'story_creator',
  'content',
  'chimmy_chat',
] as const

export type OrchestrationToolType = (typeof ORCHESTRATION_TOOL_TYPES)[number]

/** User-facing request for unified AI run. */
export interface UnifiedAIRequest {
  envelope: AIContextEnvelope
  mode?: OrchestrationMode
  options?: {
    timeoutMs?: number
    skipCache?: boolean
    traceId?: string
    maxRetries?: number
  }
}

/** Required output structure (PROMPT 123): Evidence, Value Verdict, Viability Verdict, Action Plan, Confidence, Uncertainty. */
export interface RequiredOutputStructure {
  evidence?: string[]
  valueVerdict?: string
  viabilityVerdict?: string
  actionPlan?: string
  confidenceScore?: number
  uncertaintyExplanation?: string
}

/** Normalized response shape for all AI tools. */
export interface UnifiedAIResponse {
  primaryAnswer: string
  confidencePct?: number
  confidenceLabel?: 'low' | 'medium' | 'high'
  verdict?: string
  keyEvidence?: string[]
  risksCaveats?: string[]
  suggestedNextAction?: string
  /** PROMPT 123 required output: value verdict (e.g. fairness, edge). */
  valueVerdict?: string
  /** PROMPT 123 required output: viability (e.g. acceptance likelihood, fit). */
  viabilityVerdict?: string
  /** PROMPT 123 required output: action plan. */
  actionPlan?: string
  /** PROMPT 123 required output: confidence 0–100. */
  confidenceScore?: number
  /** PROMPT 123 required output: uncertainty / caveats. */
  uncertaintyExplanation?: string
  /** PROMPT 123 required output: evidence list. */
  evidence?: string[]
  modelOutputs: ModelOutput[]
  reliability: {
    usedDeterministicFallback: boolean
    providerStatus: ProviderStatusEntry[]
    message?: string
  }
  factGuardWarnings?: string[]
  traceId?: string
  cached?: boolean
  mode: OrchestrationMode
}

export interface ProviderStatusEntry {
  provider: string
  status: 'ok' | 'failed' | 'timeout' | 'invalid_response'
  error?: string
  latencyMs?: number
}

/** Shared error code for AI layer. */
export type AIErrorCode =
  | 'provider_unavailable'
  | 'timeout'
  | 'invalid_response'
  | 'rate_limited'
  | 'fact_guard_rejected'
  | 'quality_gate_failed'
  | 'envelope_validation_failed'
  | 'unauthorized'
  | 'unknown'

/** Unified error shape returned to clients. */
export interface UnifiedAIError {
  code: AIErrorCode
  message: string
  userMessage: string
  provider?: AIModelRole
  traceId?: string
  details?: Record<string, unknown>
}

/** Provider chat request (internal). */
export interface ProviderChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  model?: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  responseFormat?: 'text' | 'json_object'
}

/** Provider chat result (internal). */
export interface ProviderChatResult {
  text: string
  json?: unknown
  model: string
  provider: AIModelRole
  tokensPrompt?: number
  tokensCompletion?: number
  error?: string
  timedOut?: boolean
  status: 'ok' | 'failed' | 'timeout' | 'invalid_response'
}

/** Tool registry entry: default mode, allowed modes, optional quality gate. */
export interface ToolRegistryEntry {
  key: OrchestrationToolType
  featureType: string
  defaultMode: OrchestrationMode
  allowedModes: OrchestrationMode[]
  minConfidenceForRecommendation?: number
}

/** Trace record for logging/observability (server-side). */
export interface AITraceRecord {
  traceId: string
  featureType: string
  mode: OrchestrationMode
  envelopeSummary: { sport: string; leagueId?: string | null }
  modelOutputsCount: number
  usedDeterministic: boolean
  durationMs: number
  cached?: boolean
  errorCode?: AIErrorCode
}

/** Re-export for convenience. */
export type { AIContextEnvelope, AIModelRole, ModelOutput, OrchestrationMode, OrchestrationResult }
