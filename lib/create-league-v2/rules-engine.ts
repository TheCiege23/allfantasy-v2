/**
 * Create League v2 — rules engine.
 *
 * Pure functions that delegate to existing format-engine, league-type-registry,
 * and sport-team-limits. The UI imports only from this file so filtering logic
 * stays testable and DRY.
 */

import type { LeagueTypeId, DraftTypeId } from '@/lib/league-creation-wizard/types'
import type { SupportedSport } from '@/lib/create-league-v2/state'
import { getAllowedSportsForLeagueType, getAllowedDraftTypesForLeagueType } from '@/lib/league-creation-wizard/league-type-registry'
import { getTeamCountOptionsForSport } from '@/lib/league-creation-wizard/sport-team-limits'
import { TOURNAMENT_POOL_TIERS } from '@/lib/tournament-mode/tournament-sport-cutoffs'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

// ── Sport filtering ─────────────────────────────────────────────────

/** Which sports are allowed for a given league type? */
export function getAllowedSportsForType(leagueType: LeagueTypeId): SupportedSport[] {
  // IDP is NFL-only (handled externally via idpSelected flag)
  const allowed = getAllowedSportsForLeagueType(leagueType)
  return allowed.filter((s) => (SUPPORTED_SPORTS as readonly string[]).includes(s)) as SupportedSport[]
}

export function isSportAllowedForType(sport: SupportedSport, leagueType: LeagueTypeId): boolean {
  return getAllowedSportsForType(leagueType).includes(sport)
}

// ── Team count ──────────────────────────────────────────────────────

/** Team count options for the dropdown. Tournament returns pool tiers instead. */
export function getTeamCountOptions(sport: SupportedSport, leagueType: LeagueTypeId): number[] {
  if (leagueType === 'tournament') {
    return [...TOURNAMENT_POOL_TIERS]
  }
  return getTeamCountOptionsForSport(sport, leagueType)
}

/** Pick a sensible default from the options list. */
export function getDefaultTeamCount(sport: SupportedSport, leagueType: LeagueTypeId): number {
  const opts = getTeamCountOptions(sport, leagueType)
  if (opts.length === 0) return 12
  // Prefer 12 if available, otherwise middle of the list
  if (opts.includes(12)) return 12
  return opts[Math.floor(opts.length / 2)] ?? opts[0]!
}

// ── Draft types ─────────────────────────────────────────────────────

/** Wizard-visible draft types (snake/linear/auction). We filter out slow_draft, mock_draft, devy_*, c2c_*. */
const WIZARD_DISPLAY_DRAFT_IDS = new Set<string>(['snake', 'linear', 'auction'])

export interface DraftTypeOption {
  id: DraftTypeId
  label: string
  hint: string
}

/** Draft types to show in the UI for a given league type. */
export function getDraftTypeOptions(leagueType: LeagueTypeId, _sport?: SupportedSport): DraftTypeOption[] {
  const allowed = getAllowedDraftTypesForLeagueType(leagueType)

  // For devy/c2c the registry returns devy_snake/c2c_snake etc. — map to base types
  const baseTypes = allowed.map((dt) => {
    if (dt === 'devy_snake' || dt === 'c2c_snake') return 'snake'
    if (dt === 'devy_auction' || dt === 'c2c_auction') return 'auction'
    return dt
  })

  // Deduplicate and filter to wizard-visible types
  const seen = new Set<string>()
  const result: DraftTypeOption[] = []
  for (const dt of baseTypes) {
    if (!WIZARD_DISPLAY_DRAFT_IDS.has(dt) || seen.has(dt)) continue
    seen.add(dt)
    result.push({
      id: dt as DraftTypeId,
      label: leagueType === 'salary_cap' && dt === 'auction' ? 'Salary Cap Auction' : DRAFT_LABELS[dt] ?? dt,
      hint: DRAFT_HINTS[dt] ?? '',
    })
  }
  return result
}

const DRAFT_LABELS: Record<string, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
}

const DRAFT_HINTS: Record<string, string> = {
  snake: 'Reverse each round',
  linear: 'Same order each round',
  auction: 'Bid on every player',
}

/** Is a specific draft type allowed for this league type? */
export function isDraftTypeAllowedForType(draftType: DraftTypeId, leagueType: LeagueTypeId): boolean {
  const options = getDraftTypeOptions(leagueType)
  return options.some((o) => o.id === draftType)
}

// ── Effective draft type mapping ────────────────────────────────────

/**
 * Map the user-facing base draft type (snake/auction) to the actual
 * backend draft type ID for devy/c2c league types.
 */
export function resolveEffectiveDraftType(leagueType: LeagueTypeId, baseDraftType: DraftTypeId): DraftTypeId {
  if (leagueType === 'devy') {
    if (baseDraftType === 'auction') return 'devy_auction'
    return 'devy_snake'
  }
  if (leagueType === 'c2c') {
    if (baseDraftType === 'auction') return 'c2c_auction'
    return 'c2c_snake'
  }
  return baseDraftType
}

// ── Survivor tribe helpers ──────────────────────────────────────────

/** Valid tribe counts for a given team count (must divide evenly). */
export function getSurvivorTribeOptions(teamCount: number): number[] {
  return [2, 3, 4].filter((t) => teamCount % t === 0)
}

// ── 3RR availability ────────────────────────────────────────────────

export function isThirdRoundReversalAvailable(draftType: DraftTypeId): boolean {
  return draftType === 'snake'
}

// ── IDP helpers ─────────────────────────────────────────────────────

/** IDP is only available for NFL. */
export function isIdpAvailableForSport(sport: SupportedSport): boolean {
  return sport === 'NFL'
}
