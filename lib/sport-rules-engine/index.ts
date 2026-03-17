/**
 * Sport-Specific Settings Engine.
 * Controls valid roster slots, scoring settings, player pools, and draft options per sport.
 */

export {
  getRulesForSport,
  getValidRosterSlotNames,
  getValidPositions,
  isSportSupported,
  getSupportedSports,
} from './SportRulesEngine'
export type {
  SportKey,
  SportRules,
  RosterRules,
  RosterSlotRule,
  ScoringRules,
  ScoringFormatOption,
  PlayerPoolRules,
  DraftOptionRules,
} from './types'
