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

/** Standard even team counts 4–32 shown on the Setup page. */
const EVEN_TEAM_COUNTS_4_32: number[] = (() => {
  const out: number[] = []
  for (let n = 4; n <= 32; n += 2) out.push(n)
  return out
})()

/**
 * Team count options for the pill row.
 * - tournament → pool tiers (72, 144, 216)
 * - survivor → 16 / 20 / 24 (fixed cast sizes)
 * - all others → even numbers 4–32
 */
export function getTeamCountOptions(sport: SupportedSport, leagueType: LeagueTypeId): number[] {
  if (leagueType === 'tournament') {
    return [...TOURNAMENT_POOL_TIERS]
  }
  if (leagueType === 'survivor') {
    return [16, 20, 24]
  }
  return [...EVEN_TEAM_COUNTS_4_32]
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

/**
 * Wizard-visible draft types. Beyond the sport-registry filters (snake/linear/auction),
 * we always offer `team`, `auto`, and `offline` as universal execution modes because
 * they describe *how* the draft runs, not who's eligible.
 */
const CORE_DRAFT_IDS = ['snake', 'linear', 'auction'] as const
const EXECUTION_DRAFT_IDS = ['team', 'auto', 'offline'] as const

/** Widened string type so the UI can accept the execution modes that aren't in Prisma's DraftTypeId. */
export type WizardDraftTypeId = DraftTypeId | 'team' | 'auto' | 'offline'

export interface DraftTypeOption {
  id: WizardDraftTypeId
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

  const seen = new Set<string>()
  const result: DraftTypeOption[] = []

  // Core draft types (filtered by what the registry allows for this league type)
  for (const dt of baseTypes) {
    if (!(CORE_DRAFT_IDS as readonly string[]).includes(dt) || seen.has(dt)) continue
    seen.add(dt)
    result.push({
      id: dt as WizardDraftTypeId,
      label: leagueType === 'salary_cap' && dt === 'auction' ? 'Salary Cap Auction' : DRAFT_LABELS[dt] ?? dt,
      hint: DRAFT_HINTS[dt] ?? '',
    })
  }

  // Universal execution modes (apply to every league type)
  for (const dt of EXECUTION_DRAFT_IDS) {
    if (seen.has(dt)) continue
    seen.add(dt)
    result.push({
      id: dt,
      label: DRAFT_LABELS[dt] ?? dt,
      hint: DRAFT_HINTS[dt] ?? '',
    })
  }

  return result
}

const DRAFT_LABELS: Record<string, string> = {
  snake: 'Snake',
  linear: 'Linear',
  auction: 'Auction',
  team: 'Team',
  auto: 'Auto',
  offline: 'Offline',
}

const DRAFT_HINTS: Record<string, string> = {
  snake: 'Reverse each round',
  linear: 'Same order each round',
  auction: 'Bid on every player',
  team: 'Co-managed by multiple users',
  auto: 'CPU drafts for everyone',
  offline: 'Track an in-person draft',
}

/** Is a specific draft type allowed for this league type? */
export function isDraftTypeAllowedForType(draftType: WizardDraftTypeId | string, leagueType: LeagueTypeId): boolean {
  const options = getDraftTypeOptions(leagueType)
  return options.some((o) => o.id === draftType)
}

// ── Effective draft type mapping ────────────────────────────────────

/**
 * Map the user-facing base draft type (snake/auction) to the actual
 * backend draft type ID for devy/c2c league types.
 */
export function resolveEffectiveDraftType(leagueType: LeagueTypeId, baseDraftType: WizardDraftTypeId | string): string {
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

export function isThirdRoundReversalAvailable(draftType: WizardDraftTypeId | string): boolean {
  return draftType === 'snake'
}

// ── IDP helpers ─────────────────────────────────────────────────────

/** IDP is only available for NFL. */
export function isIdpAvailableForSport(sport: SupportedSport): boolean {
  return sport === 'NFL'
}
