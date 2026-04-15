/**
 * Survivor league constants and defaults (PROMPT 346).
 * Sport-aware defaults for merge week etc. align with PROMPT 344.
 */

import type { LeagueSport } from '@prisma/client'

export const SURVIVOR_VARIANT = 'survivor'

/** Default first-entry intro — asset in `/public/survivor/` (filename is URL-encoded for spaces). */
export const SURVIVOR_LEAGUE_INTRO_VIDEO = `/survivor/${encodeURIComponent('Survivor League Intro.mp4')}`

/** Default merge week by sport (pre-merge ends; merge starts). */
export const DEFAULT_MERGE_WEEK_BY_SPORT: Partial<Record<LeagueSport, number>> = {
  NFL: 10,
  NBA: 14,
  MLB: 16,
  NHL: 18,
  NCAAF: 8,
  NCAAB: 12,
  SOCCER: 12,
}

export const DEFAULT_TRIBE_COUNT = 4
export const DEFAULT_TRIBE_SIZE = 4
export const MIN_TRIBES = 2
export const MAX_TRIBES = 8
export const MIN_TRIBE_SIZE = 2
export const MAX_TRIBE_SIZE = 6

export const DEFAULT_IDOL_COUNT = 2
export const DEFAULT_EXILE_RETURN_TOKENS = 4

/** Idol power types that can be in the pool (configurable). */
export const IDOL_POWER_TYPES = [
  'protect_self',
  'protect_self_plus_one',
  'steal_player',
  'freeze_waivers',
  'extra_vote',
  'vote_nullifier',
  'score_boost',
  'tribe_immunity_modifier',
  'secret_tribe_power',
  'swap_starter',
  'force_tribe_shuffle',
  'jury_influence',
  'finale_advantage',
] as const

/** Default idol power pool (all except jury/finale unless enabled). */
export const DEFAULT_IDOL_POWER_POOL = IDOL_POWER_TYPES.filter(
  (p) => p !== 'jury_influence' && p !== 'finale_advantage'
)

/** League chat source for tribe-scoped messages (filter by membership). */
export function tribeChatSource(tribeId: string): string {
  return `tribe_${tribeId}`
}

/** Parse tribe id from chat source. */
export function parseTribeIdFromSource(source: string | null): string | null {
  if (!source || !source.startsWith('tribe_')) return null
  return source.slice(6) || null
}

/**
 * Key-position map used to pick the "anchor" player for exile team drafts.
 * Claiming the anchor position grants that player's full real-world team.
 */
export const KEY_POSITION_BY_SPORT: Record<string, { code: string; label: string }> = {
  NFL: { code: 'QB', label: 'Quarterback' },
  MLB: { code: 'SP', label: 'Starting Pitcher' },
  NHL: { code: 'G', label: 'Goaltender' },
  NBA: { code: 'C', label: 'Center' },
  NCAAF: { code: 'QB', label: 'Quarterback' },
  NCAAB: { code: 'C', label: 'Center' },
  SOCCER: { code: 'GK', label: 'Goalkeeper' },
}

/** Per-sport mini-game cadence (games per week + tribal-council day). */
export const SURVIVOR_MINI_GAME_CADENCE: Record<string, { perWeek: number; tribalDay: string }> = {
  NFL: { perWeek: 1, tribalDay: 'tuesday' },
  NBA: { perWeek: 3, tribalDay: 'monday' },
  MLB: { perWeek: 3, tribalDay: 'monday' },
  NHL: { perWeek: 2, tribalDay: 'monday' },
  NCAAF: { perWeek: 1, tribalDay: 'sunday' },
  NCAAB: { perWeek: 2, tribalDay: 'monday' },
  SOCCER: { perWeek: 1, tribalDay: 'monday' },
}

export function keyPositionForSport(sport?: string | null) {
  if (!sport) return KEY_POSITION_BY_SPORT.NFL
  return KEY_POSITION_BY_SPORT[sport.toUpperCase()] ?? KEY_POSITION_BY_SPORT.NFL
}
