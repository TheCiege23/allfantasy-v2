/**
 * IDP scoring category mapping and preset labels. NFL only.
 * Stat keys align with ScoringDefaultsRegistry and PlayerGameStat.normalizedStatMap.
 * PROMPT 2/6.
 */

/** Supported IDP stat keys (minimum). */
export const IDP_STAT_KEYS = [
  'idp_solo_tackle',
  'idp_assist_tackle',
  'idp_sack',
  'idp_interception',
  'idp_forced_fumble',
  'idp_fumble_recovery',
  'idp_pass_defended',
  'idp_safety',
  'idp_blocked_kick',
  'idp_defensive_touchdown',
  'idp_td',
] as const

/** Optional IDP stat keys when data model supports them. */
export const IDP_OPTIONAL_STAT_KEYS = [
  'idp_tackle_for_loss',
  'idp_qb_hit',
  'idp_return_yards',
  'idp_sack_yardage',
  'idp_multi_sack_bonus',
  'idp_high_tackle_bonus',
] as const

export const IDP_SCORING_PRESET_LABELS: Record<string, string> = {
  balanced: 'Balanced',
  tackle_heavy: 'Tackle-Heavy',
  big_play_heavy: 'Big-Play-Heavy',
}

export const IDP_POSITION_MODE_LABELS: Record<string, string> = {
  standard: 'Standard (DL, LB, DB)',
  advanced: 'Advanced (DE, DT, LB, CB, S)',
  hybrid: 'Hybrid (grouped + split)',
}

export const IDP_ROSTER_PRESET_LABELS: Record<string, string> = {
  beginner: 'Beginner IDP',
  standard: 'Standard IDP',
  advanced: 'Advanced IDP',
  custom: 'Custom',
}

export const IDP_DRAFT_TYPE_LABELS: Record<string, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
}
