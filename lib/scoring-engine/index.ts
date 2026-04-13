/**
 * lib/scoring-engine/index.ts
 * Barrel export for the AllFantasy Unified Scoring Engine.
 *
 * Import everything you need from '@/lib/scoring-engine'.
 *
 * Examples:
 *   import { calculateFantasyPoints } from '@/lib/scoring-engine'
 *   import { getLeagueScoringConfigAutoDetect } from '@/lib/scoring-engine'
 *   import type { UnifiedScoringConfig, SupportedSport } from '@/lib/scoring-engine'
 */

// Types & interfaces
export type {
  SupportedSport,
  ScoringSource,
  ScoringAuditEntry,
  UnifiedScoringConfig,
  IScoringPreset,
  ISportScoringService,
  IScoringCalculator,
  RecalcStatus,
  RecalcResult,
  PermissionCheckResult,
  ScoringConfigDiff,
} from './ScoringEngineTypes'
export { ALL_SUPPORTED_SPORTS } from './ScoringEngineTypes'

// Registry & sport adapters
export {
  getScoringEngineRegistry,
  createDefaultScoringConfig,
  getLeagueScoringConfig,
  updateLeagueScoringConfig,
  getScoringPresetsForSport,
  getScoringPreset,
} from './ScoringEngineRegistry'

// Calculator
export {
  calculateFantasyPoints,
  calculateRosterTotal,
  calculateMatchupPoints,
  normalizeSleeperNflStats,
  normalizeEspnNflStats,
} from './ScoringCalculator'

// Permissions
export {
  checkCommissionerPermission,
  checkPremiumScoringAccess,
  checkScoringEditPermissions,
} from './ScoringPermissionsService'

// Audit
export {
  getScoringAuditLog,
  appendScoringAuditEntry,
  diffScoringConfigs,
  configMatchesPreset,
  getScoringConfigVersion,
} from './ScoringAuditService'

// Unified config service — high-level facade
export {
  detectLeagueSport,
  getLeagueScoringConfigAutoDetect,
  validateScoringConfig,
  updateLeagueScoringConfigWithAudit,
  resetLeagueScoringConfig,
  recalculateLeagueScoringIfChanged,
  getScoringCompatibilityWarnings,
  getPresetsForLeagueSport,
} from './UnifiedScoringConfigService'
export type { UpdateScoringConfigOpts, ScoringValidationResult } from './UnifiedScoringConfigService'
