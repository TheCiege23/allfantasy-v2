/**
 * Chimmy Brain — 15 Core AI Modules + Registry
 * Central exports for all AI modules and orchestration
 */

// Core Module Classes (Tier 1-5)
export { DraftAssistantModule } from './DraftAssistantModule'
export { TradeAnalyzerModule } from './TradeAnalyzerModule'
export {
  WaiverAssistantModule,
  StartSitAssistantModule,
  LineupOptimizerModule,
} from './CoreModulesBundle1'
export {
  MatchupSimulatorModule,
  LeagueRankingsModule,
  CommissionerAssistantModule,
  LeagueStoryCreatorModule,
} from './CoreModulesBundle2'
export {
  PsychologicalEngineModule,
  ChatAssistantModule,
  RiskAlertEngineModule,
  C2CDevyAdvisorModule,
  SpecialtyLeagueLogicModule,
  AdminToolsModule,
} from './CoreModulesBundle3'

// Module Registry & Management
export { moduleRegistry, initializeChimmyBrain } from './ModuleRegistry'

// Re-export core types and interfaces
export * from '../chimmy-deterministic-analysis'
export type { StandardizedModuleOutput, ModuleInput, ModuleConfig, IChimmyModule } from '../chimmy-deterministic-analysis'

/**
 * Convenience constants for module names
 */
export const ALL_MODULE_NAMES = {
  DRAFT: 'draft-assistant',
  TRADE: 'trade-analyzer',
  WAIVER: 'waiver-assistant',
  START_SIT: 'start-sit-assistant',
  LINEUP: 'lineup-optimizer',
  MATCHUP: 'matchup-simulator',
  RANKINGS: 'league-rankings',
  COMMISSIONER: 'commissioner-assistant',
  STORY: 'league-story-creator',
  PSYCHOLOGY: 'psychological-engine',
  CHAT: 'chat-assistant',
  RISK: 'risk-alert-engine',
  DYNASTY: 'c2c-devy-advisor',
  SPECIALTY: 'specialty-league-logic',
  ADMIN: 'admin-tools',
} as const
