/**
 * [NEW] lib/mlb-scoring/index.ts — MLB scoring system barrel exports.
 */
export * from './MlbScoringPresets'
export * from './MlbScoringCategories'
export { getLeagueMlbScoringConfig, saveLeagueMlbScoringConfig, applyDefaultMlbScoringOnCreate, type LeagueMlbScoringConfig } from './MlbScoringConfigService'
