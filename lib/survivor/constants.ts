/**
 * Survivor league constants and defaults (PROMPT 346).
 * Sport-aware defaults for merge week etc. align with PROMPT 344.
 */

import type { LeagueSport } from '@prisma/client'

export const SURVIVOR_VARIANT = 'survivor'

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
