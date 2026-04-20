/**
 * Canonical draft type contract — single source of truth for:
 * - create-league wizard / v2 UI options
 * - POST /api/leagues + legacy POST /api/league/create validation
 * - preset engine (via format-engine resolution)
 * - persistence → live draft session core type mapping
 *
 * Downstream-only phases (rookie, supplemental, dispersal, etc.) are registered for
 * documentation and commissioner flows — they are not create-league selections.
 */

import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { ZOMBIE_ELIGIBLE_LEAGUE_SPORTS } from '@/lib/zombie/zombie-sport-eligibility'
import type { LeagueTypeId, DraftTypeId } from '@/lib/league-creation-wizard/types'

/** League format ids that participate in the draft-type matrix (matches `LeagueFormatId` in format-engine). */
export type DraftMatrixLeagueFormatId = LeagueTypeId

export type DraftTypeCategory =
  | 'core_pick_order'
  | 'async_timing'
  | 'practice'
  | 'specialty_variant'
  | 'execution_mode'
  | 'league_settings_modifier'
  | 'lifecycle_phase'

export type EngineCoreDraftType = 'snake' | 'linear' | 'auction'

/** Lifecycle drafts are commissioner / seasonal — not offered in create-league. */
export type DraftLifecycleScope = 'create_league' | 'post_create' | 'commissioner' | 'seasonal' | 'settings_modifier'

export type DraftTypeDefinition = {
  id: string
  label: string
  /** Shorter label when the league format already implies devy/c2c. */
  shortLabel?: string
  category: DraftTypeCategory
  description: string
  /** If true, the create-league UIs may offer this id when concept+sport allow it. */
  createLeagueSelectable: boolean
  /** Live draft engine supports picks (or auction) for this mode after mapping to engine core. */
  downstreamEngineSupported: boolean
  /**
   * Core engine mode used for Prisma draft session + pick order math.
   * Null for execution modes and lifecycle-only types.
   */
  engineCore: EngineCoreDraftType | null
  lifecycle: DraftLifecycleScope
  /** Requires conceptSetup / league settings beyond default draft settings. */
  requiresConceptSetup: boolean
}

// ── Per-format draft type lists (must stay aligned with `lib/league/format-engine` FORMAT_REGISTRY) ──

const ALL_SPORTS = [...SUPPORTED_SPORTS]
const SURVIVOR_ELIGIBLE_SPORTS = ALL_SPORTS.filter((s) => s !== 'SOCCER') as LeagueSport[]
const BEST_BALL_SPORTS: LeagueSport[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']
const DRAFT_TYPES_STANDARD: DraftTypeId[] = ['snake', 'linear', 'auction', 'slow_draft', 'mock_draft']
const DRAFT_TYPES_SURVIVOR: DraftTypeId[] = ['snake', 'auction']

/** Exported for format-engine — authoritative draft-type lists per league format concept. */
export const DRAFT_TYPES_BY_LEAGUE_FORMAT: Record<DraftMatrixLeagueFormatId, readonly DraftTypeId[]> = {
  redraft: DRAFT_TYPES_STANDARD,
  dynasty: DRAFT_TYPES_STANDARD,
  keeper: DRAFT_TYPES_STANDARD,
  best_ball: DRAFT_TYPES_STANDARD,
  guillotine: ['snake', 'linear', 'auction', 'mock_draft'],
  survivor: DRAFT_TYPES_SURVIVOR,
  tournament: DRAFT_TYPES_STANDARD,
  devy: ['devy_snake', 'devy_auction'],
  c2c: ['c2c_snake', 'c2c_auction'],
  zombie: ['snake', 'auction'],
  salary_cap: ['auction', 'slow_draft', 'mock_draft'],
  big_brother: DRAFT_TYPES_STANDARD,
}

/** Sports that support each league format concept (mirrors format-engine). */
export const SUPPORTED_SPORTS_BY_LEAGUE_FORMAT: Record<DraftMatrixLeagueFormatId, readonly LeagueSport[]> = {
  redraft: ALL_SPORTS,
  dynasty: ALL_SPORTS,
  keeper: ALL_SPORTS,
  best_ball: BEST_BALL_SPORTS,
  guillotine: ALL_SPORTS,
  survivor: SURVIVOR_ELIGIBLE_SPORTS,
  tournament: ALL_SPORTS,
  devy: ['NFL', 'NCAAF', 'NBA', 'NCAAB'],
  c2c: ['NFL', 'NCAAF', 'NBA', 'NCAAB'],
  zombie: ZOMBIE_ELIGIBLE_LEAGUE_SPORTS,
  salary_cap: ALL_SPORTS,
  big_brother: ALL_SPORTS,
}

/**
 * Sport-wide draft mechanics for GET /api/sport-rules (`draft.allowedDraftTypes`).
 * Same ids as the `redraft` concept row — base families only (no devy_/c2c_ variants).
 */
export const PLATFORM_SPORT_RULES_DRAFT_TYPES = [...DRAFT_TYPES_BY_LEAGUE_FORMAT.redraft] as const
export type PlatformSportRulesDraftTypeId = (typeof PLATFORM_SPORT_RULES_DRAFT_TYPES)[number]

/**
 * Map canonical, specialty, or execution draft ids to sport-rules base ids for coarse
 * validation against {@link PLATFORM_SPORT_RULES_DRAFT_TYPES}. Returns null if unknown.
 */
export function mapDraftTypeToSportRulesBase(draftType: string): PlatformSportRulesDraftTypeId | null {
  const x = String(draftType ?? '').trim().toLowerCase()
  if (x === 'offline' || x === 'auto' || x === 'team') return 'snake'
  if (x === 'devy_snake' || x === 'c2c_snake') return 'snake'
  if (x === 'devy_auction' || x === 'c2c_auction') return 'auction'
  if ((PLATFORM_SPORT_RULES_DRAFT_TYPES as readonly string[]).includes(x)) {
    return x as PlatformSportRulesDraftTypeId
  }
  return null
}

/** Execution modes: how the draft is run; stored separately from pick-order algorithm. */
export const EXECUTION_MODE_DRAFT_IDS = ['offline', 'auto', 'team'] as const
export type ExecutionModeDraftId = (typeof EXECUTION_MODE_DRAFT_IDS)[number]

/** Third-round reversal is persisted as snake + `thirdRoundReversal` / league draftType `3rd_reversal` — not a separate draft type id on create. */
export const THIRD_ROUND_REVERSAL_MODIFIER = 'third_round_reversal' as const

/**
 * Registered lifecycle / commissioner draft phases — not create-league choices.
 * Engines may schedule these later; they map to core engine modes when executed.
 */
export const POST_CREATE_LIFECYCLE_DRAFT_IDS = [
  'rookie_draft',
  'startup_draft',
  'supplemental_draft',
  'dispersal_draft',
] as const

const DEF = (
  partial: Omit<DraftTypeDefinition, 'id' | 'requiresConceptSetup'> & {
    id?: string
    requiresConceptSetup?: boolean
  },
): DraftTypeDefinition =>
  ({
    ...partial,
    id: partial.id ?? '',
    requiresConceptSetup: partial.requiresConceptSetup ?? false,
  }) as DraftTypeDefinition

/** Rich metadata keyed by id (create-time + execution + modifiers + lifecycle). */
export const DRAFT_TYPE_DEFINITIONS: Record<string, DraftTypeDefinition> = {
  snake: DEF({
    id: 'snake',
    label: 'Snake',
    category: 'core_pick_order',
    description: 'Pick order reverses each round.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
  }),
  linear: DEF({
    id: 'linear',
    label: 'Linear',
    category: 'core_pick_order',
    description: 'Same pick order every round.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'linear',
    lifecycle: 'create_league',
  }),
  auction: DEF({
    id: 'auction',
    label: 'Auction',
    category: 'core_pick_order',
    description: 'Budget-based bidding for each player.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'auction',
    lifecycle: 'create_league',
  }),
  slow_draft: DEF({
    id: 'slow_draft',
    label: 'Slow Draft',
    category: 'async_timing',
    description: 'Longer pick windows; async-friendly.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
    requiresConceptSetup: true,
  }),
  mock_draft: DEF({
    id: 'mock_draft',
    label: 'Mock Draft',
    category: 'practice',
    description: 'Practice draft flow; may map to snake for live session bootstrap.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
  }),
  devy_snake: DEF({
    id: 'devy_snake',
    label: 'Devy Snake',
    shortLabel: 'Snake',
    category: 'specialty_variant',
    description: 'Snake draft with devy college asset pool.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
    requiresConceptSetup: true,
  }),
  devy_auction: DEF({
    id: 'devy_auction',
    label: 'Devy Auction',
    shortLabel: 'Auction',
    category: 'specialty_variant',
    description: 'Auction draft for devy assets.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'auction',
    lifecycle: 'create_league',
    requiresConceptSetup: true,
  }),
  c2c_snake: DEF({
    id: 'c2c_snake',
    label: 'C2C Snake',
    shortLabel: 'Snake',
    category: 'specialty_variant',
    description: 'Campus-to-Canton snake draft.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
    requiresConceptSetup: true,
  }),
  c2c_auction: DEF({
    id: 'c2c_auction',
    label: 'C2C Auction',
    shortLabel: 'Auction',
    category: 'specialty_variant',
    description: 'Campus-to-Canton auction draft.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'auction',
    lifecycle: 'create_league',
    requiresConceptSetup: true,
  }),
  offline: DEF({
    id: 'offline',
    label: 'Offline',
    category: 'execution_mode',
    description: 'Track an in-person draft; session flags offline.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
  }),
  auto: DEF({
    id: 'auto',
    label: 'Auto',
    category: 'execution_mode',
    description: 'CPU/autopick execution for all teams.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
  }),
  team: DEF({
    id: 'team',
    label: 'Team',
    category: 'execution_mode',
    description: 'Co-managed draft controls.',
    createLeagueSelectable: true,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'create_league',
  }),
  third_round_reversal: DEF({
    id: THIRD_ROUND_REVERSAL_MODIFIER,
    label: 'Third-round reversal',
    category: 'league_settings_modifier',
    description: 'Modifier applied to snake drafts — stored as 3RR flag or draftType 3rd_reversal in settings.',
    createLeagueSelectable: false,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'settings_modifier',
  }),
  '3rd_reversal': DEF({
    id: '3rd_reversal',
    label: 'Third-round reversal (settings)',
    category: 'league_settings_modifier',
    description: 'Legacy league settings value for snake + 3RR.',
    createLeagueSelectable: false,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'settings_modifier',
  }),
  rookie_draft: DEF({
    id: 'rookie_draft',
    label: 'Rookie draft',
    category: 'lifecycle_phase',
    description: 'Seasonal rookie draft — scheduled post-create.',
    createLeagueSelectable: false,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'seasonal',
  }),
  startup_draft: DEF({
    id: 'startup_draft',
    label: 'Startup draft',
    category: 'lifecycle_phase',
    description: 'Initial dynasty/devy startup — may be create-time or first-season.',
    createLeagueSelectable: false,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'post_create',
  }),
  supplemental_draft: DEF({
    id: 'supplemental_draft',
    label: 'Supplemental draft',
    category: 'lifecycle_phase',
    description: 'Mid-season or special supplemental — commissioner-triggered.',
    createLeagueSelectable: false,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'commissioner',
  }),
  dispersal_draft: DEF({
    id: 'dispersal_draft',
    label: 'Dispersal draft',
    category: 'lifecycle_phase',
    description: 'Distributed assets draft — commissioner-triggered.',
    createLeagueSelectable: false,
    downstreamEngineSupported: true,
    engineCore: 'snake',
    lifecycle: 'commissioner',
  }),
}

/** Labels for UI — prefer `DRAFT_TYPE_DEFINITIONS`; fallback to Title Case id. */
export const DRAFT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(DRAFT_TYPE_DEFINITIONS).map((d) => [d.id, d.label])
)

export function getDraftTypeDefinition(id: string): DraftTypeDefinition | undefined {
  return DRAFT_TYPE_DEFINITIONS[String(id).trim().toLowerCase()]
}

export function getDraftTypeUiLabel(id: string, leagueType?: LeagueTypeId | null): string {
  const d = getDraftTypeDefinition(id)
  if (!d) return String(id).replace(/_/g, ' ')
  if (leagueType === 'devy' && d.shortLabel) return d.shortLabel
  if (leagueType === 'c2c' && d.shortLabel) return d.shortLabel
  if (leagueType === 'salary_cap' && id === 'auction') return 'Salary Cap Auction'
  return d.label
}

export function getDraftTypeUiHint(id: string): string {
  const d = getDraftTypeDefinition(id)
  return d?.description ?? ''
}

/**
 * Union of all draft type ids that appear in any league format’s draft list
 * (used for legacy API allowlists).
 */
export function listAllFormatDraftTypeIds(): DraftTypeId[] {
  const set = new Set<string>()
  for (const ids of Object.values(DRAFT_TYPES_BY_LEAGUE_FORMAT)) {
    for (const id of ids) set.add(id)
  }
  return Array.from(set) as DraftTypeId[]
}

/** Full wire allowlist: format draft ids + execution modes (create flows). */
export function listCreateLeagueWireDraftTypeIds(): string[] {
  return [...new Set([...listAllFormatDraftTypeIds(), ...EXECUTION_MODE_DRAFT_IDS])]
}

export function isExecutionModeDraftType(id: string): boolean {
  return (EXECUTION_MODE_DRAFT_IDS as readonly string[]).includes(String(id).trim().toLowerCase())
}

/**
 * Map persisted / API canonical draft type to engine core type for draft session + pick order.
 */
export function mapCanonicalDraftTypeToEngineCore(draftType: string): EngineCoreDraftType {
  const x = String(draftType ?? '').trim().toLowerCase()
  if (x === 'offline' || x === 'auto' || x === 'team') return 'snake'
  if (x.includes('auction')) return 'auction'
  if (x === 'linear') return 'linear'
  if (x === 'mock_draft' || x === 'slow_draft') return 'snake'
  const d = getDraftTypeDefinition(x)
  if (d?.engineCore) return d.engineCore
  return 'snake'
}

/**
 * Normalize wizard/API draft type for format-engine allowlist checks.
 * Execution modes map to a base shape for devy/c2c resolution.
 */
export function normalizeDraftTypeForEngineValidation(draftType: string): string {
  const x = String(draftType).trim().toLowerCase()
  if (x === 'offline' || x === 'auto' || x === 'team') return 'snake'
  return x
}

/**
 * Map user-facing base type (snake/auction/…) to canonical ids for devy/c2c concepts.
 * Non-auction bases collapse to *_snake (only snake + auction are valid devy/c2c draft types).
 */
export function resolveEffectiveDraftTypeForConcept(leagueType: LeagueTypeId | string, draftType: string): string {
  const lt = String(leagueType).trim().toLowerCase()
  const raw = String(draftType).trim().toLowerCase()
  if (isExecutionModeDraftType(raw)) return raw
  if (lt === 'devy') {
    if (raw === 'auction' || raw === 'devy_auction') return 'devy_auction'
    return 'devy_snake'
  }
  if (lt === 'c2c') {
    if (raw === 'auction' || raw === 'c2c_auction') return 'c2c_auction'
    return 'c2c_snake'
  }
  return raw
}

/** Which draft types are valid for a league format + sport (concept + sport matrix). */
export function getDraftTypesForConceptAndSport(
  sport: LeagueSport | string,
  leagueFormat: string | null | undefined
): DraftTypeId[] {
  const formatKey = String(leagueFormat ?? 'redraft').trim().toLowerCase() as DraftMatrixLeagueFormatId
  const normalizedSport = normalizeToSupportedSport(sport)
  const ids = DRAFT_TYPES_BY_LEAGUE_FORMAT[formatKey]
  const sports = SUPPORTED_SPORTS_BY_LEAGUE_FORMAT[formatKey]
  if (!ids || !sports) {
    return [...DRAFT_TYPES_BY_LEAGUE_FORMAT.redraft]
  }
  if (!sports.includes(normalizedSport)) {
    return [...DRAFT_TYPES_BY_LEAGUE_FORMAT.redraft]
  }
  return [...ids]
}

export function isDraftTypeAllowedForConceptAndSport(
  sport: LeagueSport | string,
  leagueFormat: string | null | undefined,
  draftType: string | null | undefined
): boolean {
  const allowed = getDraftTypesForConceptAndSport(sport, leagueFormat)
  const x = String(draftType ?? '').trim().toLowerCase()
  return allowed.includes(x as DraftTypeId)
}
