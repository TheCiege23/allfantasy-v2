/**
 * Taxi squad constants. PROMPT 3/5.
 * Taxi is for stashing eligible young/pro prospects; distinct from Devy (college rights).
 */

/** Core Dynasty NFL taxi-eligible positions. */
export const TAXI_ELIGIBLE_POSITIONS_NFL = ['QB', 'RB', 'WR', 'TE'] as const

/** Core Dynasty NBA taxi-eligible positions (including grouped G, F). */
export const TAXI_ELIGIBLE_POSITIONS_NBA = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'] as const

/** Taxi eligibility by experience: 1 = rookies only, 2 = rookies + 2nd year, 3 = rookies + 2nd + 3rd year. */
export const TAXI_ELIGIBILITY_YEARS_OPTIONS = [
  { value: 1, label: 'Rookies only' },
  { value: 2, label: 'Rookies + 2nd year' },
  { value: 3, label: 'Rookies + 2nd + 3rd year' },
] as const

/** Taxi lock behavior. */
export const TAXI_LOCK_BEHAVIOR_OPTIONS = [
  { value: 'once_promoted_no_return', label: 'Once promoted cannot return' },
  { value: 'free_move', label: 'Can move freely' },
  { value: 'commissioner_custom', label: 'Commissioner custom' },
] as const

/** Default taxi slot count for core dynasty. */
export const TAXI_DEFAULT_CORE_DYNASTY = 4
/** Default taxi slot count for Devy dynasty (deeper + devy). */
export const TAXI_DEFAULT_DEVY = 6
/** Default taxi slot count for C2C pro roster. */
export const TAXI_DEFAULT_C2C_PRO = 4
