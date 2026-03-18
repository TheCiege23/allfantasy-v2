/**
 * [NEW] lib/big-brother/constants.ts
 * Big Brother League — sport-aware defaults and constants.
 * PROMPT 2/6.
 */

import type { LeagueSport } from '@prisma/client'

export const BIG_BROTHER_VARIANT = 'big_brother'

/** Default eviction end week by sport (approximate season length). */
export const DEFAULT_EVICTION_END_WEEK_BY_SPORT: Partial<Record<LeagueSport, number>> = {
  NFL: 17,
  NBA: 22,
  MLB: 24,
  NHL: 24,
  NCAAF: 14,
  NCAAB: 18,
  SOCCER: 22,
}

/** Default jury start: first N eliminations that become jury. */
export const DEFAULT_JURY_START_AFTER_ELIMINATIONS = 7

/** Default veto competitor count (HOH + 2 noms + 3 random = 6). */
export const DEFAULT_VETO_COMPETITOR_COUNT = 6

/** Final nominee count on ballot (classic = 2). */
export const FINAL_NOMINEE_COUNT = 2

/** Jury start modes. */
export const JURY_START_MODES = ['after_eliminations', 'when_remaining', 'fixed_week'] as const

/** Finale formats. */
export const FINALE_FORMATS = ['final_2', 'final_3'] as const

/** Waiver release timing options. */
export const WAIVER_RELEASE_TIMING_OPTIONS = ['immediate', 'next_waiver_run', 'faab_window'] as const

/** Public vote visibility options. */
export const PUBLIC_VOTE_TOTALS_OPTIONS = ['exact', 'evicted_only'] as const

/** Challenge modes. */
export const CHALLENGE_MODES = ['ai_theme', 'deterministic_score', 'hybrid'] as const

/** Inactive player handling options. */
export const INACTIVE_PLAYER_HANDLING_OPTIONS = ['none', 'replacement_after_n_weeks', 'commissioner_only'] as const

/** Auto-nomination fallback options. */
export const AUTO_NOMINATION_FALLBACK_OPTIONS = ['lowest_season_points', 'random', 'commissioner'] as const
