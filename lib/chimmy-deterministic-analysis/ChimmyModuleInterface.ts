/**
 * Unified Module Service Interface — Chimmy Brain Module Contracts
 *
 * All 15 AI modules implement this interface to ensure consistency:
 * - Input validation (AIContextEnvelope)
 * - Deterministic grounding check
 * - Multi-provider orchestration
 * - Output with confidence and explanation
 * - Audit logging
 * - Memory integration
 */

import type { AIContextEnvelope, ModelOutput, OrchestrationResult } from '@/lib/unified-ai/types'
import type { DeterministicAnalysisOutput } from './DeterministicAnalysisEngine'

/**
 * StandardizedModuleOutput
 * Every AI module returns this structure to ensure consistent handling
 */
export interface StandardizedModuleOutput {
  // Core response
  recommendation: string | Record<string, any> // Primary output (string or structured)
  explanation: string // Why? What's the reasoning?
  confidence: {
    score: number // 0-100
    label: 'low' | 'medium' | 'high'
    reason: string // Why this confidence level
  }

  // Grounding
  groundedInDeterministic: boolean // Did we verify against deterministic layer?
  deterministicReferences: Array<{
    source: string // e.g., "projections", "rosterStrengths", "scheduledifficulty"
    value: any // The specific value(s) we referenced
    usedForJustification: boolean
  }>

  // Model tracing
  modelUsed: 'openai' | 'deepseek' | 'grok' | 'consensus' // Which model(s)?
  tokensUsed: number
  latency: number // ms

  // Actionability
  actions: Array<{
    label: string // e.g., "Accept Trade", "Add Player", "Propose Counter"
    actionType: string // e.g., "execute_trade", "add_waiver_claim", "propose_trade"
    payload: Record<string, any> // Button click data
  }>

  // Metadata
  moduleName: string // e.g., "DraftAssistant", "TradeAnalyzer"
  timestamp: Date
  auditId: string // Unique ID for logging/audit trail
}

/**
 * Module Input Contract
 * What each module receives
 */
export interface ModuleInput {
  envelope: AIContextEnvelope
  deterministic: DeterministicAnalysisOutput
  userPreferences?: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
    detailLevel: 'summary' | 'detailed' | 'comprehensive'
    toneMode: 'analytical' | 'coaching' | 'casual'
  }
  context?: Record<string, any> // Module-specific context
}

/**
 * Module Configuration
 * Settings for how each module behaves
 */
export interface ModuleConfig {
  name: string
  version: string
  enabled: boolean

  // Provider preferences for this module
  preferredModel?: 'openai' | 'deepseek' | 'grok' | 'auto'
  fallbackModels?: string[]

  // Quality gates
  minimumConfidenceThreshold: number // Don't recommend if below this
  requireDeterministicGrounding: boolean // Must verify against deterministic layer?

  // Audit logging
  auditLoggingEnabled: boolean
  memoryIntegrationEnabled: boolean

  // Timeouts
  maxExecutionTimeMs: number
}

/**
 * Module Lifecycle Interface
 * Every module must implement these methods
 */
export interface IChimmyModule {
  config: ModuleConfig

  /**
   * Input validation
   * Verify envelope has required data for this module
   */
  validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }>

  /**
   * Main execution
   * Run deterministic + AI layer and return standardized output
   */
  execute(input: ModuleInput): Promise<StandardizedModuleOutput>

  /**
   * Explain module decisions
   * What assumptions was this based on? What could change it?
   */
  explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string>

  /**
   * Generate confidence score
   * How confident is this recommendation?
   */
  scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: string; reason: string }>

  /**
   * Ground check against deterministic
   * Verify we haven't contradicted the deterministic layer
   */
  checkDeterministicGrounding(
    output: StandardizedModuleOutput,
    deterministic: DeterministicAnalysisOutput
  ): Promise<{ grounded: boolean; warnings: string[] }>

  /**
   * Audit logging
   * Log this decision for compliance and debugging
   */
  auditLog(input: ModuleInput, output: StandardizedModuleOutput): Promise<void>

  /**
   * Memory integration
   * Remember user preferences, league context, past decisions
   */
  integrateMemory(input: ModuleInput, output: StandardizedModuleOutput): Promise<void>

  /**
   * Health check
   * Is this module working correctly?
   */
  healthCheck(): Promise<{ healthy: boolean; issues: string[] }>
}

/**
 * Module Registry
 * Central catalog of all 15 modules
 */
export interface ModuleRegistry {
  modules: Map<string, IChimmyModule>
  register(name: string, module: IChimmyModule): void
  getModule(name: string): IChimmyModule | null
  listModules(): Array<{ name: string; version: string; enabled: boolean }>
  getAllModules(): IChimmyModule[]
}

/**
 * Base Module Implementation
 * Abstract base class that all modules extend
 */
export abstract class BaseChimmyModule implements IChimmyModule {
  abstract config: ModuleConfig

  protected auditLogger: (log: any) => Promise<void> = async (log) => {
    if (this.config.auditLoggingEnabled) {
      // Default: log to console
      // Production: send to audit service
      console.log(`[${this.config.name}] Audit:`, log)
    }
  }

  protected async recordMemory(userId: string | null, leagueId: string | null, data: any): Promise<void> {
    if (this.config.memoryIntegrationEnabled && (userId || leagueId)) {
      // Integration point with AIMemoryContext
      // Record user preferences, league patterns, decision history
    }
  }

  abstract validate(input: ModuleInput): Promise<{ valid: boolean; errors: string[] }>

  abstract execute(input: ModuleInput): Promise<StandardizedModuleOutput>

  abstract explainDecision(output: StandardizedModuleOutput, context?: Record<string, any>): Promise<string>

  abstract scoreConfidence(output: StandardizedModuleOutput): Promise<{ score: number; label: string; reason: string }>

  async checkDeterministicGrounding(
    output: StandardizedModuleOutput,
    deterministic: DeterministicAnalysisOutput
  ): Promise<{ grounded: boolean; warnings: string[] }> {
    const warnings: string[] = []

    // Verify we're not contradicting deterministic layer
    if (output.deterministicReferences.length === 0 && this.config.requireDeterministicGrounding) {
      warnings.push(`Module ${this.config.name} made recommendation without deterministic grounding`)
    }

    // Check completeness thresholds
    const avgCompleteness = Object.values(deterministic.completeness).reduce((a, b) => a + b) / 9
    if (avgCompleteness < 50) {
      warnings.push(`Deterministic layer only ${avgCompleteness.toFixed(0)}% complete—confidence may be artificially high`)
    }

    return {
      grounded: warnings.length === 0,
      warnings,
    }
  }

  async auditLog(input: ModuleInput, output: StandardizedModuleOutput): Promise<void> {
    const log = {
      timestamp: output.timestamp,
      auditId: output.auditId,
      module: this.config.name,
      userId: input.envelope.userId,
      leagueId: input.envelope.leagueId,
      intent: input.envelope.promptIntent,
      recommendation: output.recommendation,
      confidence: output.confidence.score,
      modelUsed: output.modelUsed,
      groundedInDeterministic: output.groundedInDeterministic,
      tokensUsed: output.tokensUsed,
    }

    await this.auditLogger(log)
  }

  async integrateMemory(input: ModuleInput, output: StandardizedModuleOutput): Promise<void> {
    if (!this.config.memoryIntegrationEnabled) return

    // Record for next time
    await this.recordMemory(input.envelope.userId ?? null, input.envelope.leagueId ?? null, {
      module: this.config.name,
      intent: input.envelope.promptIntent,
      recommendedAction: output.recommendation,
      confidence: output.confidence.score,
      userApprovedAction: input.envelope.userFeedback?.liked || false,
    })
  }

  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    // Override in subclasses for module-specific checks
    return { healthy: true, issues: [] }
  }
}

/**
 * 15 Module Names (Constants)
 */
export const MODULE_NAMES = {
  DRAFT_ASSISTANT: 'draft-assistant',
  TRADE_ANALYZER: 'trade-analyzer',
  WAIVER_ASSISTANT: 'waiver-assistant',
  START_SIT_ASSISTANT: 'start-sit-assistant',
  LINEUP_OPTIMIZER: 'lineup-optimizer',
  MATCHUP_SIMULATOR: 'matchup-simulator',
  LEAGUE_RANKINGS: 'league-rankings',
  COMMISSIONER_ASSISTANT: 'commissioner-assistant',
  LEAGUE_STORY_CREATOR: 'league-story-creator',
  PSYCHOLOGICAL_ENGINE: 'psychological-engine',
  CHAT_ASSISTANT: 'chat-assistant',
  RISK_ALERT_ENGINE: 'risk-alert-engine',
  C2C_DEVY_ADVISOR: 'c2c-devy-advisor',
  SPECIALTY_LEAGUE_LOGIC: 'specialty-league-logic',
  ADMIN_TOOLS: 'admin-tools',
  PLAYER_OUTLOOK: 'player-outlook',
  FRANCHISE_ROADMAP: 'franchise-roadmap',
  TRADE_BUILDER: 'trade-builder',
  MARKET_VALUE: 'market-value',
  OPPONENT_SCOUTING: 'opponent-scouting',
  LEAGUE_META: 'league-meta',
  COMMISSIONER_ASSISTANT_V2: 'commissioner-assistant-v2',
  GOAL_TRACKER: 'goal-tracker',
  GM_PROFILE: 'gm-profile',
  GAME_THEORY: 'game-theory',
  LEAGUE_HEALTH: 'league-health',
  DRAFT_WAR_ROOM: 'draft-war-room',
  RIVALRY_ENGINE: 'rivalry-engine',
  DFS_STRATEGY: 'dfs-strategy',
  TRADE_NEGOTIATION: 'trade-negotiation',
  CHAOS_DETECTOR: 'chaos-detector',
  PORTFOLIO_MANAGER: 'portfolio-manager',
} as const

export type ModuleName = (typeof MODULE_NAMES)[keyof typeof MODULE_NAMES]
