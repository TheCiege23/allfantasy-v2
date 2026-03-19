/**
 * League types, draft types, and valid combinations for the creation wizard.
 * Prevents invalid sport × league type × draft type combinations.
 */

import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type { LeagueTypeId, DraftTypeId } from './types'

export const LEAGUE_TYPE_IDS: LeagueTypeId[] = [
  'redraft',
  'dynasty',
  'keeper',
  'best_ball',
  'guillotine',
  'survivor',
  'tournament',
  'devy',
  'c2c',
  'zombie',
  'salary_cap',
]

export const LEAGUE_TYPE_LABELS: Record<LeagueTypeId, string> = {
  redraft: 'Redraft',
  dynasty: 'Dynasty',
  keeper: 'Keeper',
  best_ball: 'Best Ball',
  guillotine: 'Guillotine',
  survivor: 'Survivor',
  tournament: 'Tournament',
  devy: 'Devy',
  c2c: 'Campus to Canton (C2C)',
  zombie: 'Zombie',
  salary_cap: 'Salary Cap',
}

export const DRAFT_TYPE_IDS: DraftTypeId[] = ['snake', 'linear', 'auction', 'slow_draft', 'mock_draft']

export const DRAFT_TYPE_LABELS: Record<DraftTypeId, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
  slow_draft: 'Slow Draft',
  mock_draft: 'Mock Draft',
}

/** League types that imply dynasty (multi-year roster). */
const DYNASTY_LEAGUE_TYPES: LeagueTypeId[] = ['dynasty', 'devy', 'c2c']

/** League types that support keeper config. */
const KEEPER_LEAGUE_TYPES: LeagueTypeId[] = ['keeper', 'dynasty']

/** League types that support devy. */
const DEVY_LEAGUE_TYPES: LeagueTypeId[] = ['devy', 'dynasty']

/** League types that support C2C. */
const C2C_LEAGUE_TYPES: LeagueTypeId[] = ['c2c']

/** Draft types that are "live" league draft (not mock). */
const LIVE_DRAFT_TYPES: DraftTypeId[] = ['snake', 'linear', 'auction', 'slow_draft']

export function isDynastyLeagueType(leagueType: LeagueTypeId): boolean {
  return DYNASTY_LEAGUE_TYPES.includes(leagueType)
}

/** Standard redraft: seasonal league, no carryover rosters. */
export function isRedraftLeagueType(leagueType: LeagueTypeId): boolean {
  return leagueType === 'redraft'
}

/** Keeper or dynasty: supports keeper retention config (max keepers, round cost, etc.). */
export function isKeeperLeagueType(leagueType: LeagueTypeId): boolean {
  return KEEPER_LEAGUE_TYPES.includes(leagueType)
}

/** True when league type is exactly keeper (hybrid seasonal + retention), not dynasty. */
export function isKeeperOnlyLeagueType(leagueType: LeagueTypeId): boolean {
  return leagueType === 'keeper'
}

export function isDevyLeagueType(leagueType: LeagueTypeId): boolean {
  return DEVY_LEAGUE_TYPES.includes(leagueType)
}

export function isC2CLeagueType(leagueType: LeagueTypeId): boolean {
  return C2C_LEAGUE_TYPES.includes(leagueType)
}

export function isLiveDraftType(draftType: DraftTypeId): boolean {
  return LIVE_DRAFT_TYPES.includes(draftType)
}

/** Sports that support best ball (must match SportFeatureFlagsService.supportsBestBall). */
const SPORTS_SUPPORTING_BEST_BALL = new Set<string>(['NFL', 'NBA', 'NCAAB', 'NCAAF'])

/**
 * League types allowed for a sport.
 * Devy: NFL and NBA only (pro league sport; devy pool is NCAA Football / NCAA Basketball).
 * C2C: NFL and NBA only (pro league sport; college side is NCAA Football / NCAA Basketball).
 * Best ball only for NFL, NBA, NCAAB, NCAAF.
 */
export function getAllowedLeagueTypesForSport(sport: LeagueSport | string): LeagueTypeId[] {
  const s = String(sport).toUpperCase()
  const base: LeagueTypeId[] = ['redraft', 'dynasty', 'keeper', 'guillotine', 'survivor', 'tournament', 'zombie', 'salary_cap']
  const all: LeagueTypeId[] = SPORTS_SUPPORTING_BEST_BALL.has(s) ? [...base, 'best_ball'] : base
  if (s === 'NFL') return [...all, 'c2c', 'devy']
  if (s === 'NCAAF') return all
  if (s === 'NBA') return [...all, 'c2c', 'devy']
  if (s === 'NCAAB') return all
  return all
}

/** Guillotine: snake, linear, auction only (no slow_draft). 3RR applies only to snake (UI). */
const GUILLOTINE_DRAFT_TYPES: DraftTypeId[] = ['snake', 'linear', 'auction']

/**
 * Draft types allowed for a league type. Mock draft is separate product; others available for redraft/dynasty/keeper etc.
 * Guillotine supports only snake, linear, auction.
 */
export function getAllowedDraftTypesForLeagueType(leagueType: LeagueTypeId): DraftTypeId[] {
  if (leagueType === 'guillotine') return [...GUILLOTINE_DRAFT_TYPES]
  return ['snake', 'linear', 'auction', 'slow_draft']
}

/** Roster modes allowed for Guillotine (redraft / best_ball only). */
export const GUILLOTINE_ALLOWED_ROSTER_MODES = ['redraft', 'best_ball'] as const

export function getGuillotineAllowedRosterModes(): readonly string[] {
  return GUILLOTINE_ALLOWED_ROSTER_MODES
}

/**
 * Validate league type for sport.
 */
export function isLeagueTypeAllowedForSport(leagueType: LeagueTypeId, sport: LeagueSport | string): boolean {
  return getAllowedLeagueTypesForSport(sport).includes(leagueType)
}

/**
 * Validate draft type for league type.
 */
export function isDraftTypeAllowedForLeagueType(draftType: DraftTypeId, leagueType: LeagueTypeId): boolean {
  return getAllowedDraftTypesForLeagueType(leagueType).includes(draftType)
}

/**
 * All supported sports (from sport-scope).
 */
export function getSupportedSports(): LeagueSport[] {
  return [...SUPPORTED_SPORTS]
}
