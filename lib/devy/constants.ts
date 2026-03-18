/**
 * Devy Dynasty constants. PROMPT 2/6.
 */

/** Default devy slot count by sport (overridden by commissioner). */
export const DEFAULT_DEVY_SLOTS_NFL = 6
export const DEFAULT_DEVY_SLOTS_NBA = 5

/** Default taxi size by sport. */
export const DEFAULT_TAXI_NFL = 6
export const DEFAULT_TAXI_NBA = 4

/** Default rookie draft rounds by sport. */
export const DEFAULT_ROOKIE_ROUNDS_NFL = 4
export const DEFAULT_ROOKIE_ROUNDS_NBA = 3

/** Default devy draft rounds by sport. */
export const DEFAULT_DEVY_ROUNDS_NFL = 4
export const DEFAULT_DEVY_ROUNDS_NBA = 3

/** NFL devy eligible positions (college pool). K/DST excluded by default; commissioner can toggle. */
export const NFL_DEVY_ELIGIBLE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

/** NBA devy eligible positions (college pool). G, F, C; combo PG/SG/SF/PF map to G/F. */
export const NBA_DEVY_ELIGIBLE_POSITIONS = ['G', 'F', 'C'] as const

/** NBA position to devy slot mapping (PG,SG -> G; SF,PF -> F; C -> C). */
export const NBA_POSITION_TO_DEVY: Record<string, string> = {
  PG: 'G',
  SG: 'G',
  G: 'G',
  SF: 'F',
  PF: 'F',
  F: 'F',
  C: 'C',
}
