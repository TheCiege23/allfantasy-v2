/**
 * PROMPT 124 — Request and Response contracts for AI Tool Registry and Routing.
 * Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

export type AIMode = 'single_model' | 'specialist' | 'consensus' | 'unified_brain'
export type AIProvider = 'openai' | 'deepseek' | 'grok'

/** Request contract: tool, sport, leagueSettings, deterministicContext, aiMode, provider. */
export interface AIToolRequestContract {
  /** Registered tool key (e.g. trade_analyzer, waiver_ai, chimmy_chat). */
  tool: string
  /** Sport (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). */
  sport: string
  /** League settings (format, scoring, team count, etc.). */
  leagueSettings?: Record<string, unknown> | null
  /** Deterministic context from engines (required when tool has deterministicRequired). */
  deterministicContext?: Record<string, unknown> | null
  /** Orchestration mode. */
  aiMode?: AIMode | null
  /** Preferred provider (optional; used in single_model). */
  provider?: AIProvider | null
  /** User message or prompt (e.g. for Chimmy, or "explain this trade"). */
  userMessage?: string | null
  /** League id when in league context. */
  leagueId?: string | null
  /** User id when known (can be set server-side from session). */
  userId?: string | null
}

/** Single provider result for compare UI. */
export interface ProviderResultItem {
  provider: string
  raw: string
  error?: string | null
  skipped?: boolean
  latencyMs?: number
}

export interface ProviderStatusItem {
  provider: string
  status: 'ok' | 'failed' | 'timeout' | 'invalid_response'
  error?: string
  latencyMs?: number
}

export interface ReliabilityDisagreement {
  hasDisagreement: boolean
  explanation: string
  primaryVerdict: string
  primaryConfidence: number
  alternateVerdicts: { verdict: string; confidence: number; provider: string }[]
}

export interface ReliabilityResponseMeta {
  usedDeterministicFallback: boolean
  message?: string
  fallbackExplanation?: string
  dataQualityWarnings?: string[]
  hardViolation?: boolean
  confidence?: number
  confidenceSource?: 'deterministic' | 'llm' | 'capped'
  partialProviderFailure?: boolean
  disagreement?: ReliabilityDisagreement
  providerStatus?: ProviderStatusItem[]
}

/** Structured section for deterministic-first AI tool surfaces. */
export interface AIToolResultSection {
  id: string
  title: string
  content: string
  type: 'verdict' | 'evidence' | 'confidence' | 'risks' | 'next_action' | 'alternate' | 'narrative'
}

/** Optional expanded output shape for tool cards and explanation panels. */
export interface AIToolStructuredOutput {
  verdict: string
  keyEvidence: string[]
  confidence: number | { label: 'low' | 'medium' | 'high'; pct?: number }
  risksCaveats: string[]
  suggestedNextAction: string
  alternatePath?: string
}

/** Response contract: evidence, aiExplanation, actionPlan, confidence, uncertainty, providerResults. */
export interface AIToolResponseContract {
  /** Evidence list (from deterministic + model). */
  evidence: string[]
  /** Primary AI explanation. */
  aiExplanation: string
  /** Action plan or suggested next step. */
  actionPlan?: string | null
  /** Confidence 0–100. */
  confidence?: number | null
  /** Confidence label for UI badge rendering. */
  confidenceLabel?: 'low' | 'medium' | 'high' | null
  /** Why confidence was assigned or reduced. */
  confidenceReason?: string | null
  /** Uncertainty or caveats. */
  uncertainty?: string | null
  /** Per-provider results for compare UI. */
  providerResults: ProviderResultItem[]
  /** Used deterministic-only fallback (no LLM). */
  usedDeterministicFallback?: boolean
  /** Reliability metadata for provider failures, data quality, and disagreement handling. */
  reliability?: ReliabilityResponseMeta | null
  /** Optional provider disagreement alternates for UI selection. */
  alternateOutputs?: Array<{ provider: string; text: string }>
  /** Trace id for support. */
  traceId?: string | null
  /** Optional structured verdict section for tool UIs. */
  verdict?: string | null
  /** Optional structured confidence caveat list. */
  risksCaveats?: string[]
  /** Optional structured next step. */
  suggestedNextAction?: string | null
  /** Optional alternate recommendation path. */
  alternatePath?: string | null
  /** Optional structured section blocks for expand/collapse result UI. */
  sections?: AIToolResultSection[]
  /** Optional normalized output object for detail tabs/cards. */
  outputShape?: AIToolStructuredOutput | null
  /** Fact guard warnings surfaced from orchestration/tool validation. */
  factGuardWarnings?: string[]
}
