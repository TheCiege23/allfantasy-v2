import type { LeagueLifecycleState } from '@prisma/client'

export type RenewalKind =
  | 'dynasty_family'
  | 'keeper_carry'
  | 'redraft_reset'
  | 'tournament_feeder'
  | 'specialty_default'

/** Dynasty / C2C / Devy — full roster + managers + history carry (Sleeper-style dynasty continuity). */
const DYNASTY_FAMILY_VARIANTS = new Set([
  'dynasty',
  'devy',
  'merged_devy_c2c',
  'c2c',
  'dynasty_idp',
])

/**
 * Whether the league season is over enough to show commissioner renewal (all sports).
 * Uses status, settings phases, and canonical lifecycle when present.
 * Archived leagues do not show renewal (league is closed / read-only).
 */
export function isSeasonOverForRenewal(args: {
  status?: string | null
  dynastySeasonPhase?: string | null
  seasonPhase?: string | null
  lifecycleState?: LeagueLifecycleState | string | null
}): boolean {
  const lifecycle = String(args.lifecycleState ?? '').toLowerCase()
  if (lifecycle === 'archived') {
    return false
  }

  const status = (args.status ?? '').toLowerCase()
  const phase = String(args.dynastySeasonPhase ?? args.seasonPhase ?? '').toLowerCase()

  if (lifecycle === 'completed') {
    return true
  }

  if (
    status === 'complete' ||
    status === 'completed' ||
    status === 'post_season' ||
    status === 'offseason'
  ) {
    return true
  }
  if (phase === 'offseason' || phase === 'complete' || phase === 'completed') {
    return true
  }

  return false
}

export function resolveLeagueVariantKey(leagueVariant: string | null | undefined, settings?: Record<string, unknown> | null): string {
  const fromSettings = settings && typeof settings.league_type === 'string' ? settings.league_type : ''
  return String(leagueVariant || fromSettings || 'redraft').toLowerCase()
}

export function renewalKindFromSelection(args: {
  leagueVariant: string | null | undefined
  settings?: Record<string, unknown> | null
  /** Selected target type in renew modal (redraft | keeper | dynasty) */
  selectedType: string
  isDynasty: boolean
}): RenewalKind {
  const variant = resolveLeagueVariantKey(args.leagueVariant, args.settings)
  if (variant === 'tournament' || settingsLeagueTypeIsTournament(args.settings)) {
    return 'tournament_feeder'
  }

  const t = normalizeRenewalModalType(args.selectedType)
  /** Commissioner explicitly chose next year format (Sleeper allows switching before the new season). */
  if (t === 'redraft') return 'redraft_reset'
  if (t === 'keeper') return 'keeper_carry'
  if (t === 'dynasty' || DYNASTY_FAMILY_VARIANTS.has(variant) || args.isDynasty) {
    return 'dynasty_family'
  }
  return 'redraft_reset'
}

function settingsLeagueTypeIsTournament(settings?: Record<string, unknown> | null): boolean {
  const lt = settings && typeof settings.league_type === 'string' ? settings.league_type.toLowerCase() : ''
  return lt === 'tournament'
}

/** Map API/modal variants (c2c, devy, …) to the three renewal radio values. */
export function normalizeRenewalModalType(raw: string): 'redraft' | 'keeper' | 'dynasty' {
  const s = raw.toLowerCase()
  if (s === 'redraft') return 'redraft'
  if (s === 'keeper') return 'keeper'
  if (s === 'dynasty' || DYNASTY_FAMILY_VARIANTS.has(s)) return 'dynasty'
  return 'redraft'
}

/**
 * POST /renew: should clear canonical `Roster` player data for a fresh draft year (Sleeper redraft reset).
 */
export function shouldResetRostersForRenewal(kind: RenewalKind): boolean {
  return kind === 'redraft_reset'
}
