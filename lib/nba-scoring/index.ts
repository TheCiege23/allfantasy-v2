/**
 * [NEW] lib/nba-scoring/index.ts
 * NBA scoring system — barrel exports.
 */

export {
  getNbaScoringPresets,
  getNbaScoringPreset,
  getAfDefaultNbaScoring,
  detectPresetMatch,
  buildFullScoringConfig,
  NBA_STAT_KEYS,
  NBA_STAT_LABELS,
  type NbaScoringPresetKey,
  type NbaScoringSource,
  type NbaScoringPreset,
} from './NbaScoringPresets'

export {
  getLeagueNbaScoringConfig,
  saveLeagueNbaScoringConfig,
  applyDefaultNbaScoringOnCreate,
  type LeagueNbaScoringConfig,
} from './NbaScoringConfigService'

export {
  NBA_SCORING_CATEGORIES,
  NBA_PREMIUM_SCORING,
  buildFullNbaDefaultConfig,
  getAllNbaScoringKeys,
  type NbaScoringRow,
  type NbaScoringCategory,
} from './NbaScoringCategories'
