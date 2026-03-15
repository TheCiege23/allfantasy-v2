/**
 * Waiver defaults and resolvers — sport- and variant-aware waiver presets and league config.
 */
export { getWaiverPreset, getWaiverDefaults } from './WaiverDefaultsRegistry'
export type { WaiverDefaults } from '@/lib/sport-defaults/types'
export { resolveWaiverPreset } from './WaiverPresetResolver'
export type { WaiverPresetResult } from './WaiverPresetResolver'
export { bootstrapLeagueWaiverSettings } from './LeagueWaiverBootstrapService'
export type { LeagueWaiverBootstrapResult } from './LeagueWaiverBootstrapService'
export { getWaiverProcessingConfigForLeague } from './WaiverProcessingConfigResolver'
export type { WaiverProcessingConfig } from './WaiverProcessingConfigResolver'
export { getClaimPriorityRule, isFaabPriority } from './ClaimPriorityResolver'
export type { ClaimPriorityDescription } from './ClaimPriorityResolver'
export { getFAABConfigForLeague } from './FAABConfigResolver'
export type { FAABConfig } from './FAABConfigResolver'
export { getWaiverConfigForLeague } from './WaiverConfigResolver'
export type { WaiverConfigForLeague } from './WaiverConfigResolver'
