/**
 * Draft defaults — sport- and variant-aware draft presets and resolvers.
 * Use for league creation, bootstrap, draft room config, and AI draft context.
 */
export { getDraftPreset, getDraftDefaults } from './DraftDefaultsRegistry'
export type { DraftDefaults } from '@/lib/sport-defaults/types'
export { resolveDraftPreset } from './DraftPresetResolver'
export type { DraftPresetResult } from './DraftPresetResolver'
export { getDraftConfigForLeague } from './DraftRoomConfigResolver'
export type { DraftRoomConfig } from './DraftRoomConfigResolver'
export { getDraftOrderRule, isSnakeDraft } from './DraftOrderRuleResolver'
export type { DraftOrderRule, DraftOrderRuleDescription } from './DraftOrderRuleResolver'
export { getDraftPlayerPoolContext } from './DraftPlayerPoolResolver'
export type { DraftPlayerPoolContext } from './DraftPlayerPoolResolver'
export { getDraftRankingContext } from './DraftRankingContextResolver'
export type { DraftRankingContext } from './DraftRankingContextResolver'
export { bootstrapLeagueDraftConfig } from './LeagueDraftBootstrapService'
export type { LeagueDraftBootstrapResult } from './LeagueDraftBootstrapService'
