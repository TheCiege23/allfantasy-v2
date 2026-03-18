/**
 * [NEW] lib/big-brother/extensibility.ts
 * Clean extension hooks for future twists. Do NOT fully build; leave extensibility points only. PROMPT 5.
 */

import type { BigBrotherConfig } from './types'

/** Hook: Is this week a double eviction week? (Two evictions in one week.) Default: false. */
export async function isDoubleEvictionWeek(
  _leagueId: string,
  _config: BigBrotherConfig,
  _week: number
): Promise<boolean> {
  return false
}

/** Hook: Is America's vote (or public vote) twist active this week? Default: false. */
export async function isAmericasVoteActive(
  _leagueId: string,
  _config: BigBrotherConfig,
  _week: number
): Promise<boolean> {
  return false
}

/** Hook: Does this league have secret powers (e.g. secret veto, coup)? Default: false. */
export async function hasSecretPowers(_leagueId: string, _config: BigBrotherConfig): Promise<boolean> {
  return false
}

/** Hook: Is HOH anonymous this week? (Hidden from houseguests.) Default: false. */
export async function isAnonymousHOH(
  _leagueId: string,
  _config: BigBrotherConfig,
  _week: number
): Promise<boolean> {
  return false
}

/** Hook: Is battle back (evicted player can compete to return) available? Default: false. */
export async function isBattleBackAvailable(
  _leagueId: string,
  _config: BigBrotherConfig,
  _week: number
): Promise<boolean> {
  return false
}

/** Hook: Are have-not punishments active? (Affects only narrative/UI; no gameplay impact by default.) Default: false. */
export async function haveNotPunishmentsActive(
  _leagueId: string,
  _config: BigBrotherConfig
): Promise<boolean> {
  return false
}
