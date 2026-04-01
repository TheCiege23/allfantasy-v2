/**
 * League types, draft types, and valid combinations for the creation wizard.
 * Delegates to the central format engine so create flow, imports, defaults,
 * and validation resolve from one shared source of truth.
 */

import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import {
  getAllowedDraftTypesForFormat,
  getFormatsForSport,
  isDraftTypeAllowedForFormat,
  isLeagueFormatAllowedForSport,
  listLeagueFormats,
} from '@/lib/league/format-engine'
import type { LeagueTypeId, DraftTypeId } from './types'

export const LEAGUE_TYPE_IDS: LeagueTypeId[] = listLeagueFormats().map((format) => format.id) as LeagueTypeId[]

export const LEAGUE_TYPE_LABELS: Record<LeagueTypeId, string> = listLeagueFormats().reduce(
  (acc, format) => {
    acc[format.id as LeagueTypeId] = format.label
    return acc
  },
  {} as Record<LeagueTypeId, string>
)

const ALL_DRAFT_TYPES = new Set<DraftTypeId>()
for (const format of listLeagueFormats()) {
  for (const draftType of format.draftTypes) {
    ALL_DRAFT_TYPES.add(draftType as DraftTypeId)
  }
}

export const DRAFT_TYPE_IDS: DraftTypeId[] = Array.from(ALL_DRAFT_TYPES)

export const DRAFT_TYPE_LABELS: Record<DraftTypeId, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
  slow_draft: 'Slow Draft',
  mock_draft: 'Mock Draft',
  devy_snake: 'Devy Snake',
  devy_auction: 'Devy Auction',
  c2c_snake: 'C2C Snake',
  c2c_auction: 'C2C Auction',
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
const LIVE_DRAFT_TYPES: DraftTypeId[] = [
  'snake',
  'linear',
  'auction',
  'slow_draft',
  'devy_snake',
  'devy_auction',
  'c2c_snake',
  'c2c_auction',
]

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

export function getAllowedLeagueTypesForSport(sport: LeagueSport | string): LeagueTypeId[] {
  return getFormatsForSport(sport).map((format) => format.id) as LeagueTypeId[]
}

/** Guillotine: snake, linear, auction, and mock draft only (no slow_draft). 3RR applies only to snake (UI). */
const GUILLOTINE_DRAFT_TYPES: DraftTypeId[] = ['snake', 'linear', 'auction', 'mock_draft']

/**
 * Draft types allowed for a league type.
 * Mock draft stays available across league types as a practice engine mode.
 * Guillotine supports snake/linear/auction and mock draft only.
 */
export function getAllowedDraftTypesForLeagueType(leagueType: LeagueTypeId): DraftTypeId[] {
  if (leagueType === 'guillotine') return [...GUILLOTINE_DRAFT_TYPES]
  return getAllowedDraftTypesForFormat('NFL', leagueType) as DraftTypeId[]
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
  return isLeagueFormatAllowedForSport(sport, leagueType)
}

/**
 * Validate draft type for league type.
 */
export function isDraftTypeAllowedForLeagueType(draftType: DraftTypeId, leagueType: LeagueTypeId): boolean {
  return isDraftTypeAllowedForFormat('NFL', leagueType, draftType)
}

/**
 * All supported sports (from sport-scope).
 */
export function getSupportedSports(): LeagueSport[] {
  return [...SUPPORTED_SPORTS]
}
