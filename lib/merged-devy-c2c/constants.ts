/**
 * Merged Devy / C2C constants. PROMPT 2/6.
 * NFL C2C and NBA C2C default roster and draft settings.
 */

import type { C2CLineupSlots } from './types'

/** Default team count. */
export const DEFAULT_C2C_TEAMS = 12

/** NFL C2C: college eligible positions (QB, RB, WR, TE). K/DST excluded by commissioner toggle. */
export const NFL_C2C_COLLEGE_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

/** NBA C2C: college eligible positions (G, F, C). */
export const NBA_C2C_COLLEGE_POSITIONS = ['G', 'F', 'C'] as const

/** NFL C2C default pro active lineup: 1 QB, 2 RB, 2 WR, 1 TE, 2 FLEX, 1 SUPER_FLEX. */
export const NFL_C2C_PRO_LINEUP_DEFAULT: C2CLineupSlots = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 2,
  SUPER_FLEX: 1,
}

/** NFL C2C default college active scoring slots: 1 QB, 2 RB, 3 WR, 1 TE, 2 FLEX. */
export const NFL_C2C_COLLEGE_LINEUP_DEFAULT: C2CLineupSlots = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 1,
  FLEX: 2,
}

/** NFL C2C default pro bench, IR, taxi, college roster size. */
export const NFL_C2C_PRO_BENCH = 12
export const NFL_C2C_PRO_IR = 3
export const NFL_C2C_TAXI = 6
export const NFL_C2C_COLLEGE_ROSTER_SIZE = 20
export const NFL_C2C_ROOKIE_DRAFT_ROUNDS = 4
export const NFL_C2C_COLLEGE_DRAFT_ROUNDS = 6

/** NBA C2C default pro active lineup: 2 G, 2 F, 1 C, 2 FLEX. */
export const NBA_C2C_PRO_LINEUP_DEFAULT: C2CLineupSlots = {
  G: 2,
  F: 2,
  C: 1,
  FLEX: 2,
}

/** NBA C2C default college active scoring slots: 2 G, 2 F, 1 C, 2 FLEX. */
export const NBA_C2C_COLLEGE_LINEUP_DEFAULT: C2CLineupSlots = {
  G: 2,
  F: 2,
  C: 1,
  FLEX: 2,
}

/** NBA C2C default pro bench, IR, taxi, college roster size. */
export const NBA_C2C_PRO_BENCH = 10
export const NBA_C2C_PRO_IR = 3
export const NBA_C2C_TAXI = 4
export const NBA_C2C_COLLEGE_ROSTER_SIZE = 15
export const NBA_C2C_ROOKIE_DRAFT_ROUNDS = 3
export const NBA_C2C_COLLEGE_DRAFT_ROUNDS = 5

/** NBA position to C2C slot (PG/SG -> G; SF/PF -> F; C -> C). */
export const NBA_POSITION_TO_C2C: Record<string, string> = {
  PG: 'G',
  SG: 'G',
  G: 'G',
  SF: 'F',
  PF: 'F',
  F: 'F',
  C: 'C',
}
