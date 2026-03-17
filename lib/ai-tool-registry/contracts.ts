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
  /** Uncertainty or caveats. */
  uncertainty?: string | null
  /** Per-provider results for compare UI. */
  providerResults: ProviderResultItem[]
  /** Used deterministic-only fallback (no LLM). */
  usedDeterministicFallback?: boolean
  /** Trace id for support. */
  traceId?: string | null
}
