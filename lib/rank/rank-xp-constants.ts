/**
 * XP weight constants for rankings FAQ / UI (no Prisma). Server rank calc imports these too.
 */

/** Imported-career XP weights (Sleeper history on `League` rows). Losses do not subtract XP. */
export const RANK_XP_PER_IMPORT_WIN = 10
export const RANK_XP_PER_PLAYOFF_APPEARANCE = 30
export const RANK_XP_PER_CHAMPIONSHIP = 200
/** Per distinct season represented in imported league rows. */
export const RANK_XP_PER_DISTINCT_SEASON = 10
/** Per league: max(0, leagueSize − 10) × this value. */
export const RANK_XP_LEAGUE_SIZE_MULTIPLIER = 2
