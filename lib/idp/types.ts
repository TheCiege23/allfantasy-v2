/**
 * IDP League — types and constants. NFL only.
 * PROMPT 2/6: League factory + settings + rosters + scoring presets.
 */

/** Position mode: grouped (DL/LB/DB), split (DE/DT/LB/CB/S), or both. */
export type IdpPositionMode = 'standard' | 'advanced' | 'hybrid'

/** Named roster presets: beginner, standard, advanced, or custom (uses slotOverrides). */
export type IdpRosterPreset = 'beginner' | 'standard' | 'advanced' | 'custom'

/** Scoring style: balanced, tackle-heavy, big-play-heavy. */
export type IdpScoringPreset = 'balanced' | 'tackle_heavy' | 'big_play_heavy'

/** Draft type for IDP leagues. */
export type IdpDraftType = 'snake' | 'linear' | 'auction'

/** Custom slot counts when rosterPreset = custom. All IDP and bench/IR. */
export interface IdpSlotOverrides {
  DL?: number
  LB?: number
  DB?: number
  IDP_FLEX?: number
  DE?: number
  DT?: number
  CB?: number
  S?: number
  bench?: number
  ir?: number
}

/** Loaded IDP league config (from DB or defaults). */
export interface IdpLeagueConfigLoaded {
  leagueId: string
  configId: string
  positionMode: IdpPositionMode
  rosterPreset: IdpRosterPreset
  slotOverrides: IdpSlotOverrides | null
  scoringPreset: IdpScoringPreset
  bestBallEnabled: boolean
  draftType: IdpDraftType
  benchSlots: number
  irSlots: number
}

/** Grouped IDP positions (family). */
export const IDP_GROUPED_POSITIONS = ['DL', 'LB', 'DB'] as const

/** Split IDP positions (granular). */
export const IDP_SPLIT_POSITIONS = ['DE', 'DT', 'LB', 'CB', 'S'] as const

/** All IDP-eligible positions (for IDP FLEX and pool). */
export const IDP_POSITIONS = ['DE', 'DT', 'LB', 'CB', 'S', 'DL', 'DB'] as const

/** Map grouped slot name to allowed split positions. */
export const IDP_GROUP_TO_SPLIT: Record<string, string[]> = {
  DL: ['DE', 'DT'],
  DB: ['CB', 'S'],
  LB: ['LB'],
}

/** Map split position to grouped family. */
export const IDP_SPLIT_TO_GROUP: Record<string, string> = {
  DE: 'DL',
  DT: 'DL',
  LB: 'LB',
  CB: 'DB',
  S: 'DB',
}
