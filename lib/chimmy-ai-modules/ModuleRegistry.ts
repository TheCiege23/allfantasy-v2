/**
 * Chimmy Brain Module Registry — Central management of all 15 AI modules
 *
 * Responsible for:
 * - Registering and initializing all modules
 * - Providing module lookups
 * - Health checking modules
 * - Coordinating multi-module workflows
 */

import type { IChimmyModule, ModuleRegistry } from './ChimmyModuleInterface'
import { MODULE_NAMES } from './ChimmyModuleInterface'

// Import all 15 modules
import { DraftAssistantModule } from './DraftAssistantModule'
import { TradeAnalyzerModule } from './TradeAnalyzerModule'
import { WaiverAssistantModule, StartSitAssistantModule, LineupOptimizerModule } from './CoreModulesBundle1'
import {
  MatchupSimulatorModule,
  LeagueRankingsModule,
  CommissionerAssistantModule,
  LeagueStoryCreatorModule,
} from './CoreModulesBundle2'
import {
  PsychologicalEngineModule,
  ChatAssistantModule,
  RiskAlertEngineModule,
  C2CDevyAdvisorModule,
  SpecialtyLeagueLogicModule,
  AdminToolsModule,
} from './CoreModulesBundle3'

/**
 * ModuleRegistryImpl — Singleton registry for all Chimmy modules
 */
class ModuleRegistryImpl implements ModuleRegistry {
  private static instance: ModuleRegistryImpl | null = null
  modules: Map<string, IChimmyModule> = new Map()
  private initialized = false

  private constructor() {}

  static getInstance(): ModuleRegistryImpl {
    if (!ModuleRegistryImpl.instance) {
      ModuleRegistryImpl.instance = new ModuleRegistryImpl()
    }
    return ModuleRegistryImpl.instance
  }

  /**
   * Initialize all 15 modules
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    // Initialize all 15 modules
    const modulesToInit = [
      // Tier 1: Core (Draft, Trade, Waiver)
      new DraftAssistantModule(),
      new TradeAnalyzerModule(),
      new WaiverAssistantModule(),

      // Tier 2: Lineup & Execution
      new StartSitAssistantModule(),
      new LineupOptimizerModule(),

      // Tier 3: Analysis & Insights
      new MatchupSimulatorModule(),
      new LeagueRankingsModule(),

      // Tier 4: Governance & Narrative
      new CommissionerAssistantModule(),
      new LeagueStoryCreatorModule(),

      // Tier 5: Advanced Intelligence
      new PsychologicalEngineModule(),
      new ChatAssistantModule(),
      new RiskAlertEngineModule(),
      new C2CDevyAdvisorModule(),

      // Tier 6: Specialty & Admin
      new SpecialtyLeagueLogicModule(),
      new AdminToolsModule(),
    ]

    for (const module of modulesToInit) {
      if (module.config.enabled) {
        this.register(module.config.name, module)
        const health = await module.healthCheck()
        if (!health.healthy) {
          console.warn(`[ModuleRegistry] Module ${module.config.name} unhealthy: ${health.issues.join(', ')}`)
        }
      }
    }

    console.log(
      `[ModuleRegistry] Initialized ${this.modules.size}/15 Chimmy Brain modules`,
      Array.from(this.modules.keys())
    )

    this.initialized = true
  }

  register(name: string, module: IChimmyModule): void {
    this.modules.set(name, module)
    console.log(`[ModuleRegistry] Registered: ${name} v${module.config.version}`)
  }

  getModule(name: string): IChimmyModule | null {
    return this.modules.get(name) || null
  }

  listModules(): Array<{ name: string; version: string; enabled: boolean }> {
    return Array.from(this.modules.values()).map((m) => ({
      name: m.config.name,
      version: m.config.version,
      enabled: m.config.enabled,
    }))
  }

  getAllModules(): IChimmyModule[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get module by intent (convenience routing)
   */
  getModuleForIntent(intent: string): IChimmyModule | null {
    const intentMap: Record<string, string> = {
      // Draft intent
      'draft:pick_recommendation': MODULE_NAMES.DRAFT_ASSISTANT,
      'draft:auto_pick': MODULE_NAMES.DRAFT_ASSISTANT,

      // Trade intents
      'trade:fairness_check': MODULE_NAMES.TRADE_ANALYZER,
      'trade:counter_analysis': MODULE_NAMES.TRADE_ANALYZER,

      // Waiver intents
      'waiver:add_recommendation': MODULE_NAMES.WAIVER_ASSISTANT,
      'waiver:bid_strategy': MODULE_NAMES.WAIVER_ASSISTANT,

      // Lineup intents
      'lineup:start_sit': MODULE_NAMES.START_SIT_ASSISTANT,
      'lineup:auto_optimize': MODULE_NAMES.LINEUP_OPTIMIZER,

      // Analysis intents
      'analysis:matchup_sim': MODULE_NAMES.MATCHUP_SIMULATOR,
      'analysis:power_ranks': MODULE_NAMES.LEAGUE_RANKINGS,
      'analysis:week_preview': MODULE_NAMES.LEAGUE_STORY_CREATOR,

      // Commission intents
      'governance:commissioner_alerts': MODULE_NAMES.COMMISSIONER_ASSISTANT,
      'governance:risk_alerts': MODULE_NAMES.RISK_ALERT_ENGINE,

      // Dynasty/specialty
      'dynasty:advisor': MODULE_NAMES.C2C_DEVY_ADVISOR,
      'specialty:format_guide': MODULE_NAMES.SPECIALTY_LEAGUE_LOGIC,

      // Chat
      'chat:general': MODULE_NAMES.CHAT_ASSISTANT,
      'psychology:behavioral_coaching': MODULE_NAMES.PSYCHOLOGICAL_ENGINE,

      // Admin
      'admin:integrity_audit': MODULE_NAMES.ADMIN_TOOLS,
    }

    const moduleName = intentMap[intent]
    return moduleName ? this.getModule(moduleName) : null
  }

  /**
   * Health check all modules
   */
  async healthCheckAll(): Promise<{ module: string; healthy: boolean; issues: string[] }[]> {
    const results = []

    for (const module of this.getAllModules()) {
      const health = await module.healthCheck()
      results.push({
        module: module.config.name,
        healthy: health.healthy,
        issues: health.issues,
      })
    }

    return results
  }

  /**
   * Pre-warm modules (initialize heavy dependencies)
   */
  async preWarm(): Promise<void> {
    console.log('[ModuleRegistry] Pre-warming modules...')

    // Run health checks in parallel
    const results = await this.healthCheckAll()

    const unhealthy = results.filter((r) => !r.healthy)
    if (unhealthy.length > 0) {
      console.error('[ModuleRegistry] Unhealthy modules:', unhealthy)
    } else {
      console.log('[ModuleRegistry] All modules healthy ✓')
    }
  }

  /**
   * Get modules by priority tier (for cascading failures)
   */
  getModulesByPriority(): IChimmyModule[][] {
    const tiers: IChimmyModule[][] = [
      // Tier 0: Critical (must work)
      [
        this.getModule(MODULE_NAMES.DRAFT_ASSISTANT),
        this.getModule(MODULE_NAMES.TRADE_ANALYZER),
        this.getModule(MODULE_NAMES.WAIVER_ASSISTANT),
      ].filter((m) => m !== null) as IChimmyModule[],

      // Tier 1: High Priority
      [
        this.getModule(MODULE_NAMES.LINEUP_OPTIMIZER),
        this.getModule(MODULE_NAMES.START_SIT_ASSISTANT),
        this.getModule(MODULE_NAMES.RISK_ALERT_ENGINE),
      ].filter((m) => m !== null) as IChimmyModule[],

      // Tier 2: Standard
      [
        this.getModule(MODULE_NAMES.LEAGUE_RANKINGS),
        this.getModule(MODULE_NAMES.MATCHUP_SIMULATOR),
        this.getModule(MODULE_NAMES.COMMISSIONER_ASSISTANT),
      ].filter((m) => m !== null) as IChimmyModule[],

      // Tier 3: Entertainment/Nice-to-have
      [
        this.getModule(MODULE_NAMES.LEAGUE_STORY_CREATOR),
        this.getModule(MODULE_NAMES.PSYCHOLOGICAL_ENGINE),
        this.getModule(MODULE_NAMES.CHAT_ASSISTANT),
        this.getModule(MODULE_NAMES.C2C_DEVY_ADVISOR),
        this.getModule(MODULE_NAMES.SPECIALTY_LEAGUE_LOGIC),
        this.getModule(MODULE_NAMES.ADMIN_TOOLS),
      ].filter((m) => m !== null) as IChimmyModule[],
    ]

    return tiers
  }

  reset(): void {
    this.modules.clear()
    this.initialized = false
  }
}

// Export singleton instance
export const moduleRegistry = ModuleRegistryImpl.getInstance()

/**
 * Helper to initialize Chimmy Brain on app startup
 */
export async function initializeChimmyBrain(): Promise<void> {
  try {
    await moduleRegistry.initialize()
    await moduleRegistry.preWarm()
    console.log('[ChimmyBrain] ✓ Fully initialized and ready for use')
  } catch (error) {
    console.error('[ChimmyBrain] Initialization failed:', error)
    throw error
  }
}
