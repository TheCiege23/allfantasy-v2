/**
 * [NEW] lib/nhl-scoring/index.ts — NHL scoring system barrel exports.
 */
export * from './NhlScoringPresets'
export * from './NhlScoringCategories'
export { getLeagueNhlScoringConfig, saveLeagueNhlScoringConfig, applyDefaultNhlScoringOnCreate, type LeagueNhlScoringConfig } from './NhlScoringConfigService'
