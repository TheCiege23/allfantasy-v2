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

/**
 * Per-sport max team count caps. These mirror the number of real-world clubs
 * in each league so a fantasy manager can (at most) claim one unique team.
 *
 * Sources (2025–2026 seasons):
 * - NFL: 32 clubs
 * - NBA: 30 clubs
 * - MLB: 30 clubs
 * - NHL: 32 clubs
 * - NCAAB: 80 (per product spec — caps the Power 5 + high-major pool)
 * - NCAAF: 86 (per product spec — caps the Power 4 + non-conference pool)
 * - SOCCER (MLS): 30 clubs in 2026
 * - SOCCER (Big 5 European): 96 clubs combined (EPL 20 + La Liga 20 + Serie A 20 + Bundesliga 18 + Ligue 1 18)
 */
const SPORT_MAX_TEAMS_STANDARD: Record<string, number> = {
  NFL: 32,
  NBA: 30,
  MLB: 30,
  NHL: 32,
  NCAAF: 86,
  NCAAB: 80,
  SOCCER: 30, // default — refined below for MLS vs Euro
}
const SOCCER_EURO_MAX = 96
const SOCCER_MLS_MAX = 30

/** Resolve the per-sport max for team count. Accepts a soccer pipeline hint. */
export function getMaxTeamsForSport(
  sport: SupportedSport,
  soccerPipeline?: 'mls' | 'euro' | null
): number {
  if (sport === 'SOCCER') {
    return soccerPipeline === 'euro' ? SOCCER_EURO_MAX : SOCCER_MLS_MAX
  }
  return SPORT_MAX_TEAMS_STANDARD[sport] ?? 32
}

/** Even team counts from 4 up to `max`, inclusive. */
function evenTeamCountsUpTo(max: number): number[] {
  const out: number[] = []
  for (let n = 4; n <= max; n += 2) out.push(n)
  return out
}

/**
 * Guillotine: one team eliminated per regular-season week, so the max team
 * count equals the sport's regular-season week count (no playoffs in guillotine).
 */
const GUILLOTINE_MAX_TEAMS_BY_SPORT: Record<string, number> = {
  NFL: 18, // 18-week regular season
  NBA: 24, // 24 weeks of regular season
  MLB: 26, // ~26 weeks of regular season
  NHL: 26, // ~26 weeks of regular season
  NCAAF: 14, // 14-week regular season
  NCAAB: 19, // ~19 weeks of regular season
  SOCCER: 38, // Premier League / Big 5 average — 38 matchweeks
}

/** Fixed tournament pool sizes — user-facing tiers. */
const TOURNAMENT_POOL_SIZES = [32, 64, 96, 128, 160, 192, 224] as const

/** Big Brother: fixed house sizes (12 / 14 / 16 / 18). */
const BIG_BROTHER_SIZES = [12, 14, 16, 18] as const

/**
 * Team count options for the pill row.
 * - tournament → fixed tiers [32, 64, 96, 128, 160, 192, 224]
 * - guillotine → even counts 4 up to the sport's regular-season week max
 * - big_brother → fixed [12, 14, 16, 18]
 * - survivor → 16 / 20 / 24 (fixed cast sizes)
 * - all others → even numbers 4 up to the sport's real-world club cap
 */
export function getTeamCountOptions(
  sport: SupportedSport,
  leagueType: LeagueTypeId,
  soccerPipeline?: 'mls' | 'euro' | null
): number[] {
  if (leagueType === 'tournament') {
    return [...TOURNAMENT_POOL_SIZES]
  }
  if (leagueType === 'big_brother') {
    return [...BIG_BROTHER_SIZES]
  }
  if (leagueType === 'guillotine') {
    const max = GUILLOTINE_MAX_TEAMS_BY_SPORT[sport] ?? 18
    return evenTeamCountsUpTo(max)
  }
  if (leagueType === 'survivor') {
    return [16, 20, 24]
  }
  const max = getMaxTeamsForSport(sport, soccerPipeline)
  return evenTeamCountsUpTo(max)
}

/** Pick a sensible default from the options list. */
export function getDefaultTeamCount(
  sport: SupportedSport,
  leagueType: LeagueTypeId,
  soccerPipeline?: 'mls' | 'euro' | null
): number {
  const opts = getTeamCountOptions(sport, leagueType, soccerPipeline)
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
