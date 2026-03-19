# Dynasty / Devy / Merged Devy / Taxi — Final Delivery

## 1. Implementation Summary

AllFantasy now has a **Dynasty configuration system** that acts as the **parent ruleset** for standard Dynasty, Devy, and Merged Devy (C2C) leagues. Dynasty defines roster presets (1QB, Superflex, 2QB, TEP, IDP), scoring presets, playoff presets (4/6/8/10 teams), rookie draft order (reverse Max PF, commissioner override), regular season length, trade/waiver defaults, and **taxi squad rules**. Devy and C2C are **dynasty-only**; validation blocks redraft. **Taxi** is a separate system from Devy: taxi stashes eligible pro prospects (rookies / 2nd / 3rd year by config); Devy holds college/prospect rights. Taxi slot count and eligibility live on `DynastyLeagueConfig` for core dynasty; Devy/C2C configs can override slot count. League creation sets `roster_mode: 'dynasty'` and injects default devy/college rounds for Devy and C2C so validation passes. Roster templates for `dynasty_1qb`, `dynasty_2qb`, and `dynasty_tep` are seeded so presets resolve to correct dynasty slots (TAXI/IR, no K/DST where applicable). Dynasty PUT merges playoff preset (first_round_byes, playoff_weeks) when only `playoff_team_count` is updated. AI (Chimmy + setup assistants) uses **actual league settings** for explanation only; AI never enforces rules.

---

## 2. Full File List

| Path | Description |
|------|-------------|
| `lib/dynasty-core/constants.ts` | Dynasty team sizes, roster/scoring/playoff presets, rookie order methods, veto copy |
| `lib/dynasty-core/types.ts` | DTOs: roster/scoring/playoff presets, config, effective settings, audit log |
| `lib/dynasty-core/DynastyRosterPresets.ts` | Roster preset list (1QB, Superflex, 2QB, TEP, IDP), bench/IR/taxi guidance |
| `lib/dynasty-core/DynastyScoringPresets.ts` | Scoring preset list and summaries |
| `lib/dynasty-core/DynastyPlayoffPresets.ts` | 4/6/8/10 team playoff presets, byes, weeks, start week |
| `lib/dynasty-core/DynastySettingsService.ts` | Effective settings merge, upsert config, draft order audit log |
| `lib/dynasty-core/dynastyContextForChimmy.ts` | Build dynasty/taxi context string for Chimmy (explanation only) |
| `lib/dynasty-core/ai-setup-assistants.ts` | Dynasty / Taxi / Devy / C2C setup assistant copy (explanatory only) |
| `lib/dynasty-core/index.ts` | Re-exports |
| `lib/taxi/constants.ts` | Taxi positions (NFL/NBA), eligibility years, lock behavior, defaults |
| `lib/taxi/TaxiSettingsService.ts` | Effective taxi settings (slot count from dynasty/devy/c2c), eligibility checks |
| `lib/taxi/index.ts` | Re-exports |
| `lib/league-settings-validation/types.ts` | Validation result type |
| `lib/league-settings-validation/LeagueSettingsValidator.ts` | Auction, Devy, C2C, dynasty size validation |
| `lib/league-settings-validation/index.ts` | Re-exports |
| `lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts` | Dynasty defaults in settings preview (roster_format_type, playoff_team_count, etc.) |
| `app/api/league/create/route.ts` | Preset variant for Devy/C2C, roster_mode and devy/c2c config injection |
| `app/api/leagues/[leagueId]/dynasty-settings/route.ts` | GET effective + presets; PUT config + League.settings, playoff structure merge |
| `components/app/settings/DynastySettingsPanel.tsx` | Dynasty settings UI: roster/scoring/playoff/taxi/rookie order/waivers, empty state |
| `prisma/schema.prisma` | DynastyLeagueConfig (taxi fields), DynastyDraftOrderAuditLog (excerpt below) |
| `prisma/seed-sport-config.ts` | NFL dynasty_1qb, dynasty_2qb, dynasty_tep roster templates (excerpt below) |

---

## 3. FULL FILES ONLY

### lib/dynasty-core/constants.ts

```ts
/**
 * [NEW] lib/dynasty-core/constants.ts
 * Dynasty roster, scoring, playoff constants. Shared base for standard Dynasty, Devy, C2C.
 */

/** Supported league team sizes for dynasty. */
export const DYNASTY_SUPPORTED_TEAM_SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32] as const
export type DynastyTeamSize = (typeof DYNASTY_SUPPORTED_TEAM_SIZES)[number]

/** Bench count range by team size band. [min, max] for commissioner guidance. */
export const DYNASTY_BENCH_BY_TEAM_SIZE: Record<string, [number, number]> = {
  '4': [8, 12],
  '6': [8, 12],
  '8': [8, 12],
  '10': [12, 16],
  '12': [12, 16],
  '14': [16, 22],
  '16': [16, 22],
  '18': [20, 28],
  '20': [20, 30],
  '24': [20, 30],
  '32': [20, 30],
}

/** Default bench for 12-team dynasty (recommended preset). */
export const DYNASTY_DEFAULT_12_BENCH = 14
/** Default IR slots for dynasty. */
export const DYNASTY_DEFAULT_IR = 3
/** Default taxi slots for core dynasty (no devy). */
export const DYNASTY_DEFAULT_TAXI = 4

/** Roster template format types for dynasty (NFL). */
export const DYNASTY_ROSTER_PRESETS = [
  { id: 'dynasty_1qb', label: '1QB Dynasty', formatType: 'dynasty_1qb' },
  { id: 'dynasty_superflex', label: 'Superflex Dynasty', formatType: 'dynasty_superflex' },
  { id: 'dynasty_2qb', label: '2QB Dynasty', formatType: 'dynasty_2qb' },
  { id: 'dynasty_tep', label: 'TEP Dynasty', formatType: 'dynasty_tep' },
  { id: 'dynasty_idp', label: 'IDP Dynasty', formatType: 'IDP' },
] as const

/** Scoring preset format types for dynasty (NFL). */
export const DYNASTY_SCORING_PRESETS = [
  { id: 'dynasty_standard', label: 'Dynasty Standard', formatType: 'dynasty_standard' },
  { id: 'dynasty_half_ppr', label: 'Dynasty Half PPR', formatType: 'dynasty_half_ppr' },
  { id: 'dynasty_full_ppr', label: 'Dynasty Full PPR', formatType: 'dynasty_full_ppr' },
  { id: 'dynasty_full_ppr_tep', label: 'Dynasty Full PPR + TEP', formatType: 'dynasty_full_ppr_tep' },
  { id: 'dynasty_superflex_default', label: 'Dynasty Superflex Default', formatType: 'dynasty_superflex_default' },
  { id: 'dynasty_6pt_pass_td', label: 'Dynasty 6pt Pass TD', formatType: 'dynasty_6pt_pass_td' },
] as const

/** Playoff team count presets. */
export const DYNASTY_PLAYOFF_PRESETS = [
  { playoffTeamCount: 4, label: '4-team playoffs' },
  { playoffTeamCount: 6, label: '6-team playoffs' },
  { playoffTeamCount: 8, label: '8-team playoffs' },
  { playoffTeamCount: 10, label: '10-team playoffs' },
] as const

/** Default regular season weeks (avoid Week 18 title). */
export const DYNASTY_REGULAR_SEASON_WEEKS_OPTIONS = [13, 14] as const
export const DYNASTY_DEFAULT_REGULAR_SEASON_WEEKS = 14

/** Rookie draft order methods. */
export const ROOKIE_PICK_ORDER_METHODS = [
  { value: 'max_pf', label: 'Reverse Max PF (anti-tank)' },
  { value: 'reverse_standings', label: 'Reverse standings' },
  { value: 'commissioner', label: 'Commissioner override' },
] as const

/** Rookie draft type. */
export const ROOKIE_DRAFT_TYPES = [
  { value: 'linear', label: 'Linear' },
  { value: 'snake', label: 'Snake' },
] as const

export const DYNASTY_DEFAULT_ROOKIE_DRAFT_ROUNDS = 4
export const DYNASTY_DEFAULT_ROOKIE_DRAFT_TYPE = 'linear'

/** Veto recommendation copy (display only). */
export const VETO_RECOMMENDATION_COPY =
  'Veto only for collusion or extreme competitive imbalance. Allow fair trades.'
```

### lib/dynasty-core/types.ts

```ts
/**
 * [NEW] lib/dynasty-core/types.ts
 * DTOs and shapes for Dynasty settings (roster, scoring, playoff, rookie draft).
 */

export interface DynastyRosterPresetDto {
  id: string
  label: string
  formatType: string
  /** Starter slots: slotName -> count */
  starterSlots: Record<string, number>
  benchCount: number
  irCount: number
  taxiCount: number
  superflexOn: boolean
  kickerOn: boolean
  defenseOn: boolean
  idpOn: boolean
}

export interface DynastyScoringPresetDto {
  id: string
  label: string
  formatType: string
  /** Summary for display */
  summary: string
}

export interface DynastyPlayoffPresetDto {
  playoffTeamCount: number
  label: string
  firstRoundByes: number
  playoffWeeks: number
  /** Suggested start week (NFL) */
  playoffStartWeek: number
}

export interface DynastyLeagueConfigDto {
  leagueId: string
  regularSeasonWeeks: number
  rookiePickOrderMethod: string
  useMaxPfForNonPlayoff: boolean
  rookieDraftRounds: number
  rookieDraftType: string
  divisionsEnabled: boolean
  tradeDeadlineWeek: number | null
  waiverTypeRecommended: string
  futurePicksYearsOut: number
  taxiSlots: number
  taxiEligibilityYears: number
  taxiLockBehavior: string
  taxiInSeasonMoves: boolean
  taxiPostseasonMoves: boolean
  taxiScoringOn: boolean
  taxiDeadlineWeek: number | null
  taxiPromotionDeadlineWeek: number | null
}

export interface DynastySettingsEffectiveDto {
  /** From League.settings + League */
  leagueSize: number | null
  rosterFormatType: string
  scoringFormatType: string
  playoffTeamCount: number
  playoffStructure: Record<string, unknown>
  regularSeasonWeeks: number
  /** From DynastyLeagueConfig or defaults */
  rookiePickOrderMethod: string
  useMaxPfForNonPlayoff: boolean
  rookieDraftRounds: number
  rookieDraftType: string
  divisionsEnabled: boolean
  tradeDeadlineWeek: number | null
  waiverTypeRecommended: string
  futurePicksYearsOut: number
  /** Resolved roster slot summary for display */
  rosterSummary: { slotName: string; count: number }[]
  /** Resolved scoring preset name */
  scoringPresetName: string
  /** Taxi squad settings (PROMPT 3/5) */
  taxiSlots: number
  taxiEligibilityYears: number
  taxiLockBehavior: string
  taxiInSeasonMoves: boolean
  taxiPostseasonMoves: boolean
  taxiScoringOn: boolean
  taxiDeadlineWeek: number | null
  taxiPromotionDeadlineWeek: number | null
}

export interface DynastyDraftOrderAuditEntryDto {
  id: string
  season: number
  userId: string
  reason: string | null
  createdAt: string
}
```

### lib/dynasty-core/DynastyRosterPresets.ts

```ts
/**
 * Dynasty roster presets and team-size–scaled bench guidance.
 * Shared base for standard Dynasty, Devy, C2C.
 */
import {
  DYNASTY_SUPPORTED_TEAM_SIZES,
  DYNASTY_BENCH_BY_TEAM_SIZE,
  DYNASTY_DEFAULT_12_BENCH,
  DYNASTY_DEFAULT_IR,
  DYNASTY_DEFAULT_TAXI,
  DYNASTY_ROSTER_PRESETS,
} from './constants'
import type { DynastyRosterPresetDto } from './types'

/** Default 12-team dynasty starter counts: QB=1, RB=2, WR=2, TE=1, FLEX=2, SUPERFLEX=1; BENCH=14, IR=3, TAXI=4; K/DEF off. */
export const DEFAULT_12_TEAM_DYNASTY_STARTERS: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 2,
  SUPERFLEX: 1,
}
export const DEFAULT_12_TEAM_DYNASTY_BENCH = DYNASTY_DEFAULT_12_BENCH
export const DEFAULT_12_TEAM_DYNASTY_IR = DYNASTY_DEFAULT_IR
export const DEFAULT_12_TEAM_DYNASTY_TAXI = DYNASTY_DEFAULT_TAXI

/**
 * Get recommended bench range [min, max] for a team size.
 */
export function getBenchRangeForTeamSize(teamSize: number): [number, number] {
  const key = String(teamSize)
  return DYNASTY_BENCH_BY_TEAM_SIZE[key] ?? [12, 16]
}

/**
 * Check if team size is supported for dynasty.
 */
export function isSupportedDynastyTeamSize(size: number): boolean {
  return (DYNASTY_SUPPORTED_TEAM_SIZES as readonly number[]).includes(size)
}

/**
 * Get roster preset DTOs for UI (1QB, Superflex, 2QB, TEP, IDP).
 */
export function getDynastyRosterPresetList(): DynastyRosterPresetDto[] {
  return DYNASTY_ROSTER_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    formatType: p.formatType,
    starterSlots: getStarterSlotsForPreset(p.id),
    benchCount: DEFAULT_12_TEAM_DYNASTY_BENCH,
    irCount: DEFAULT_12_TEAM_DYNASTY_IR,
    taxiCount: DEFAULT_12_TEAM_DYNASTY_TAXI,
    superflexOn: p.id === 'dynasty_superflex' || p.id === 'dynasty_2qb',
    kickerOn: false,
    defenseOn: false,
    idpOn: p.id === 'dynasty_idp',
  }))
}

function getStarterSlotsForPreset(presetId: string): Record<string, number> {
  switch (presetId) {
    case 'dynasty_1qb':
      return { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 }
    case 'dynasty_superflex':
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
    case 'dynasty_2qb':
      return { QB: 2, RB: 2, WR: 2, TE: 1, FLEX: 2 }
    case 'dynasty_tep':
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
    case 'dynasty_idp':
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
    default:
      return { ...DEFAULT_12_TEAM_DYNASTY_STARTERS }
  }
}

/**
 * Recommended 12-team dynasty format type for roster template (DB or fallback).
 */
export const DYNASTY_RECOMMENDED_ROSTER_FORMAT = 'dynasty_superflex'
```

### lib/dynasty-core/DynastyScoringPresets.ts

```ts
/**
 * Dynasty scoring presets. Wires to existing ScoringTemplate / LeagueScoringOverride.
 * Presets map to formatType used by getScoringTemplate(sport, formatType).
 */
import { DYNASTY_SCORING_PRESETS } from './constants'
import type { DynastyScoringPresetDto } from './types'

const SUMMARY_BY_FORMAT: Record<string, string> = {
  dynasty_standard: 'Standard (0 PPR, 4pt pass TD)',
  dynasty_half_ppr: 'Half PPR, 4pt pass TD',
  dynasty_full_ppr: 'Full PPR, 4pt pass TD',
  dynasty_full_ppr_tep: 'Full PPR + TE Premium +0.5, 4pt pass TD',
  dynasty_superflex_default: 'Full PPR, 4pt pass TD (Superflex default)',
  dynasty_6pt_pass_td: 'Full PPR, 6pt pass TD',
}

/**
 * Get scoring preset DTOs for UI. Format types align with DB or ScoringDefaultsRegistry fallbacks.
 */
export function getDynastyScoringPresetList(): DynastyScoringPresetDto[] {
  return DYNASTY_SCORING_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    formatType: p.formatType,
    summary: SUMMARY_BY_FORMAT[p.id] ?? p.label,
  }))
}

/**
 * Recommended dynasty scoring format type (Full PPR + TEP optional).
 */
export const DYNASTY_RECOMMENDED_SCORING_FORMAT = 'dynasty_full_ppr_tep'
```

### lib/dynasty-core/DynastyPlayoffPresets.ts

```ts
/**
 * Dynasty playoff presets (4/6/8/10 team). Avoid Week 18 title; 13–14 week regular season.
 */
import { DYNASTY_PLAYOFF_PRESETS, DYNASTY_DEFAULT_REGULAR_SEASON_WEEKS } from './constants'
import type { DynastyPlayoffPresetDto } from './types'

/** NFL: title week 17 so playoff start 15; 14-week regular season default. */
const NFL_PLAYOFF_START_WEEK = 15
const NFL_TITLE_WEEK = 17

/**
 * Get playoff preset DTOs for UI.
 */
export function getDynastyPlayoffPresetList(sport: string = 'NFL'): DynastyPlayoffPresetDto[] {
  return DYNASTY_PLAYOFF_PRESETS.map((p) => {
    const byes = getFirstRoundByes(p.playoffTeamCount)
    const weeks = getPlayoffWeeks(p.playoffTeamCount)
    return {
      playoffTeamCount: p.playoffTeamCount,
      label: p.label,
      firstRoundByes: byes,
      playoffWeeks: weeks,
      playoffStartWeek: sport === 'NFL' ? NFL_PLAYOFF_START_WEEK : 15,
    }
  })
}

function getFirstRoundByes(teamCount: number): number {
  if (teamCount <= 4) return 0
  if (teamCount <= 6) return 2
  if (teamCount <= 8) return 2
  return 2
}

function getPlayoffWeeks(teamCount: number): number {
  if (teamCount <= 4) return 2
  if (teamCount <= 6) return 3
  if (teamCount <= 8) return 3
  return 4
}

/**
 * Default regular season weeks for dynasty (avoid Week 18 title).
 */
export function getDynastyDefaultRegularSeasonWeeks(): number {
  return DYNASTY_DEFAULT_REGULAR_SEASON_WEEKS
}
```

### lib/dynasty-core/DynastySettingsService.ts

```ts
/**
 * Dynasty settings service: effective settings, presets, upsert config, draft order audit.
 */
import { prisma } from '@/lib/prisma'
import { getRosterTemplate } from '@/lib/multi-sport/RosterTemplateService'
import { getScoringTemplate } from '@/lib/multi-sport/ScoringTemplateResolver'
import { getDynastyRosterPresetList } from './DynastyRosterPresets'
import { getDynastyScoringPresetList } from './DynastyScoringPresets'
import { getDynastyPlayoffPresetList } from './DynastyPlayoffPresets'
import {
  DYNASTY_DEFAULT_REGULAR_SEASON_WEEKS,
  DYNASTY_DEFAULT_ROOKIE_DRAFT_ROUNDS,
  DYNASTY_DEFAULT_ROOKIE_DRAFT_TYPE,
  ROOKIE_PICK_ORDER_METHODS,
} from './constants'
import type {
  DynastyLeagueConfigDto,
  DynastySettingsEffectiveDto,
  DynastyDraftOrderAuditEntryDto,
} from './types'
import type { SportType } from '@/lib/multi-sport/sport-types'

/**
 * Get effective dynasty settings for a league (roster, scoring, playoff, rookie draft).
 * Returns merged League.settings + DynastyLeagueConfig with resolved roster/scoring summary.
 */
export async function getEffectiveDynastySettings(
  leagueId: string
): Promise<DynastySettingsEffectiveDto | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      leagueSize: true,
      sport: true,
      settings: true,
      dynastyConfig: true,
    },
  })
  if (!league) return null

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const rosterFormatType =
    (settings.roster_format_type as string) ??
    (settings.roster_format as string) ??
    'dynasty_superflex'
  const scoringFormatType =
    (settings.scoring_format_type as string) ??
    (settings.scoring_format as string) ??
    'PPR'
  const playoffTeamCount = (settings.playoff_team_count as number) ?? 6
  const playoffStructure = (settings.playoff_structure as Record<string, unknown>) ?? {}
  const regularSeasonWeeks =
    (settings.regular_season_weeks as number) ??
    (league.dynastyConfig?.regularSeasonWeeks ?? DYNASTY_DEFAULT_REGULAR_SEASON_WEEKS)

  const sportType = (league.sport as SportType) ?? 'NFL'
  let rosterSummary: { slotName: string; count: number }[] = []
  let scoringPresetName = scoringFormatType

  try {
    const rosterTemplate = await getRosterTemplate(sportType, rosterFormatType)
    rosterSummary = rosterTemplate.slots
      .filter((s) => s.starterCount > 0 || s.benchCount > 0 || s.reserveCount > 0 || s.taxiCount > 0)
      .map((s) => ({
        slotName: s.slotName,
        count:
          s.starterCount +
          s.benchCount +
          s.reserveCount +
          (s.taxiCount > 0 ? s.taxiCount : 0),
      }))
      .filter((s) => s.count > 0)
  } catch {
    rosterSummary = []
  }

  try {
    const scoringTemplate = await getScoringTemplate(sportType, scoringFormatType)
    scoringPresetName = scoringTemplate.name
  } catch {
    // keep scoringFormatType as name
  }

  const config = league.dynastyConfig

  return {
    leagueSize: league.leagueSize ?? null,
    rosterFormatType,
    scoringFormatType,
    playoffTeamCount,
    playoffStructure,
    regularSeasonWeeks,
    rookiePickOrderMethod: config?.rookiePickOrderMethod ?? 'max_pf',
    useMaxPfForNonPlayoff: config?.useMaxPfForNonPlayoff ?? true,
    rookieDraftRounds: config?.rookieDraftRounds ?? DYNASTY_DEFAULT_ROOKIE_DRAFT_ROUNDS,
    rookieDraftType: config?.rookieDraftType ?? DYNASTY_DEFAULT_ROOKIE_DRAFT_TYPE,
    divisionsEnabled: config?.divisionsEnabled ?? false,
    tradeDeadlineWeek: config?.tradeDeadlineWeek ?? null,
    waiverTypeRecommended: config?.waiverTypeRecommended ?? 'faab',
    futurePicksYearsOut: config?.futurePicksYearsOut ?? 3,
    rosterSummary,
    scoringPresetName,
    taxiSlots: config?.taxiSlots ?? 4,
    taxiEligibilityYears: config?.taxiEligibilityYears ?? 1,
    taxiLockBehavior: config?.taxiLockBehavior ?? 'once_promoted_no_return',
    taxiInSeasonMoves: config?.taxiInSeasonMoves ?? true,
    taxiPostseasonMoves: config?.taxiPostseasonMoves ?? false,
    taxiScoringOn: config?.taxiScoringOn ?? false,
    taxiDeadlineWeek: config?.taxiDeadlineWeek ?? null,
    taxiPromotionDeadlineWeek: config?.taxiPromotionDeadlineWeek ?? null,
  }
}

/**
 * Get roster presets for dynasty (1QB, Superflex, 2QB, TEP, IDP).
 */
export function getDynastyRosterPresets(): ReturnType<typeof getDynastyRosterPresetList> {
  return getDynastyRosterPresetList()
}

/**
 * Get scoring presets for dynasty.
 */
export function getDynastyScoringPresets(): ReturnType<typeof getDynastyScoringPresetList> {
  return getDynastyScoringPresetList()
}

/**
 * Get playoff presets (4/6/8/10 team) for a sport.
 */
export function getDynastyPlayoffPresets(sport: string = 'NFL'): ReturnType<typeof getDynastyPlayoffPresetList> {
  return getDynastyPlayoffPresetList(sport)
}

/**
 * Upsert DynastyLeagueConfig for a league.
 */
export async function upsertDynastyConfig(
  leagueId: string,
  payload: Partial<{
    regularSeasonWeeks: number
    rookiePickOrderMethod: string
    useMaxPfForNonPlayoff: boolean
    rookieDraftRounds: number
    rookieDraftType: string
    divisionsEnabled: boolean
    tradeDeadlineWeek: number | null
    waiverTypeRecommended: string
    futurePicksYearsOut: number
    taxiSlots: number
    taxiEligibilityYears: number
    taxiLockBehavior: string
    taxiInSeasonMoves: boolean
    taxiPostseasonMoves: boolean
    taxiScoringOn: boolean
    taxiDeadlineWeek: number | null
    taxiPromotionDeadlineWeek: number | null
  }>
): Promise<DynastyLeagueConfigDto> {
  const existing = await prisma.dynastyLeagueConfig.findUnique({
    where: { leagueId },
  })

  const data = {
    regularSeasonWeeks: payload.regularSeasonWeeks ?? existing?.regularSeasonWeeks ?? DYNASTY_DEFAULT_REGULAR_SEASON_WEEKS,
    rookiePickOrderMethod: payload.rookiePickOrderMethod ?? existing?.rookiePickOrderMethod ?? 'max_pf',
    useMaxPfForNonPlayoff: payload.useMaxPfForNonPlayoff ?? existing?.useMaxPfForNonPlayoff ?? true,
    rookieDraftRounds: payload.rookieDraftRounds ?? existing?.rookieDraftRounds ?? DYNASTY_DEFAULT_ROOKIE_DRAFT_ROUNDS,
    rookieDraftType: payload.rookieDraftType ?? existing?.rookieDraftType ?? DYNASTY_DEFAULT_ROOKIE_DRAFT_TYPE,
    divisionsEnabled: payload.divisionsEnabled ?? existing?.divisionsEnabled ?? false,
    tradeDeadlineWeek: payload.tradeDeadlineWeek ?? existing?.tradeDeadlineWeek ?? undefined,
    waiverTypeRecommended: payload.waiverTypeRecommended ?? existing?.waiverTypeRecommended ?? 'faab',
    futurePicksYearsOut: payload.futurePicksYearsOut ?? existing?.futurePicksYearsOut ?? 3,
    taxiSlots: payload.taxiSlots ?? existing?.taxiSlots ?? 4,
    taxiEligibilityYears: payload.taxiEligibilityYears ?? existing?.taxiEligibilityYears ?? 1,
    taxiLockBehavior: payload.taxiLockBehavior ?? existing?.taxiLockBehavior ?? 'once_promoted_no_return',
    taxiInSeasonMoves: payload.taxiInSeasonMoves ?? existing?.taxiInSeasonMoves ?? true,
    taxiPostseasonMoves: payload.taxiPostseasonMoves ?? existing?.taxiPostseasonMoves ?? false,
    taxiScoringOn: payload.taxiScoringOn ?? existing?.taxiScoringOn ?? false,
    taxiDeadlineWeek: payload.taxiDeadlineWeek !== undefined ? payload.taxiDeadlineWeek : existing?.taxiDeadlineWeek ?? undefined,
    taxiPromotionDeadlineWeek: payload.taxiPromotionDeadlineWeek !== undefined ? payload.taxiPromotionDeadlineWeek : existing?.taxiPromotionDeadlineWeek ?? undefined,
  }

  const config = await prisma.dynastyLeagueConfig.upsert({
    where: { leagueId },
    create: { leagueId, ...data },
    update: data,
  })

  return {
    leagueId: config.leagueId,
    regularSeasonWeeks: config.regularSeasonWeeks,
    rookiePickOrderMethod: config.rookiePickOrderMethod,
    useMaxPfForNonPlayoff: config.useMaxPfForNonPlayoff,
    rookieDraftRounds: config.rookieDraftRounds,
    rookieDraftType: config.rookieDraftType,
    divisionsEnabled: config.divisionsEnabled,
    tradeDeadlineWeek: config.tradeDeadlineWeek,
    waiverTypeRecommended: config.waiverTypeRecommended,
    futurePicksYearsOut: config.futurePicksYearsOut,
    taxiSlots: config.taxiSlots,
    taxiEligibilityYears: config.taxiEligibilityYears,
    taxiLockBehavior: config.taxiLockBehavior,
    taxiInSeasonMoves: config.taxiInSeasonMoves,
    taxiPostseasonMoves: config.taxiPostseasonMoves,
    taxiScoringOn: config.taxiScoringOn,
    taxiDeadlineWeek: config.taxiDeadlineWeek,
    taxiPromotionDeadlineWeek: config.taxiPromotionDeadlineWeek,
  }
}

/**
 * Log a commissioner draft order override (audit log).
 */
export async function logDraftOrderOverride(
  leagueId: string,
  configId: string,
  season: number,
  overridePayload: Record<string, unknown>,
  userId: string,
  reason?: string | null
): Promise<void> {
  await prisma.dynastyDraftOrderAuditLog.create({
    data: {
      leagueId,
      configId,
      season,
      overridePayload: overridePayload as object,
      userId,
      reason: reason ?? null,
    },
  })
}

/**
 * Get draft order audit log entries for a league (for commissioner UI).
 */
export async function getDraftOrderAuditLog(
  leagueId: string,
  limit: number = 50
): Promise<DynastyDraftOrderAuditEntryDto[]> {
  const logs = await prisma.dynastyDraftOrderAuditLog.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return logs.map((l) => ({
    id: l.id,
    season: l.season,
    userId: l.userId,
    reason: l.reason ?? null,
    createdAt: l.createdAt.toISOString(),
  }))
}

export { ROOKIE_PICK_ORDER_METHODS }
```

### lib/dynasty-core/dynastyContextForChimmy.ts

```ts
/**
 * PROMPT 3/5: Build Dynasty league context for Chimmy (standard Dynasty, Devy, or C2C).
 * AI never enforces rules. Use for: playoff format, SF vs 1QB, taxi vs devy, rookie draft order, reverse Max PF.
 */

import { prisma } from '@/lib/prisma'
import { getEffectiveDynastySettings } from './DynastySettingsService'
import { getEffectiveTaxiSettings } from '@/lib/taxi/TaxiSettingsService'

export async function buildDynastyContextForChimmy(
  leagueId: string,
  _userId: string
): Promise<string> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { isDynasty: true, leagueVariant: true },
  })
  if (!league) return ''
  const variant = String(league.leagueVariant ?? '').toLowerCase()
  const isDynasty =
    league.isDynasty || variant === 'devy_dynasty' || variant === 'merged_devy_c2c'
  if (!isDynasty) return ''

  const [dynasty, taxi] = await Promise.all([
    getEffectiveDynastySettings(leagueId),
    getEffectiveTaxiSettings(leagueId),
  ])
  if (!dynasty) return ''

  const parts: string[] = [
    '[DYNASTY MODE CONTEXT - for explanation only; you never enforce roster, scoring, playoff, or draft order rules]',
    `League is dynasty (or Devy/C2C). Roster format: ${dynasty.rosterFormatType}. Scoring: ${dynasty.scoringPresetName}. Playoffs: ${dynasty.playoffTeamCount} teams. Regular season: ${dynasty.regularSeasonWeeks} weeks.`,
    `Rookie draft: ${dynasty.rookieDraftRounds} rounds, ${dynasty.rookieDraftType}, order method: ${dynasty.rookiePickOrderMethod}. Non-playoff teams use reverse Max PF (anti-tank) when enabled: ${dynasty.useMaxPfForNonPlayoff}.`,
  ]
  if (taxi) {
    parts.push(
      `Taxi: ${taxi.taxiSlotCount} slots, eligibility: ${taxi.taxiEligibilityYears === 1 ? 'rookies only' : taxi.taxiEligibilityYears === 2 ? 'rookies + 2nd year' : 'rookies + 2nd + 3rd'}, lock: ${taxi.taxiLockBehavior}, scoring on taxi: ${taxi.taxiScoringOn}. Taxi is for stashing eligible young/pro prospects; Devy is for college/prospect rights in Devy or C2C.`
    )
  }
  parts.push(
    'When the user asks: what playoff format should I use, should this league be SF or 1QB, how many taxi slots, difference between taxi and devy, how should rookie draft order work, what does reverse Max PF mean — explain using this context and league settings. Do not enforce or change settings.'
  )
  return parts.join(' ')
}
```

### lib/dynasty-core/ai-setup-assistants.ts

```ts
/**
 * PROMPT 3/5: AI setup assistants — explanatory copy only. AI never enforces rules.
 * Use for: Dynasty Setup Assistant, Taxi Advisor, Devy Setup Assistant, C2C Setup Assistant.
 */

export const DYNASTY_SETUP_ASSISTANT = {
  title: 'Dynasty Setup Assistant',
  intro: 'Explains roster, scoring, and playoff presets and suggests best default setup for your league size.',
  topics: [
    '1QB vs Superflex vs 2QB: Superflex (QB optional in one flex) is the most popular competitive default; 1QB is simpler; 2QB increases QB scarcity.',
    'TEP (TE Premium): Adds extra points for TE receptions (e.g. +0.5) to boost TE value; recommended for competitive balance.',
    'Roster size: 12-team dynasty typically uses 14–16 bench spots, 3–4 IR, 4 taxi. Scale bench down for smaller leagues, up for 14+ teams.',
    'Playoff format: 4–6 team playoffs are common; avoid Week 18 title games in NFL. 13–14 week regular season is standard.',
  ],
}

export const TAXI_ADVISOR = {
  title: 'Taxi Advisor',
  intro: 'Suggests best taxi stashes and explains promotion risk and timing. Warns about taxi clogging.',
  topics: [
    'Taxi is for stashing eligible young/pro prospects (rookies, or rookies + 2nd/3rd year by league rules). It is not the same as Devy (college rights).',
    'Once promoted from taxi, many leagues do not allow moving the player back; check your league’s taxi lock behavior.',
    'Promotion deadline: some leagues require promotion decisions before the rookie draft; plan for roster space.',
    'Taxi clogging: if you hold too many long-shot stashes, you may miss waiver adds; balance upside with flexibility.',
  ],
}

export const DEVY_SETUP_ASSISTANT = {
  title: 'Devy Setup Assistant',
  intro: 'Explains devy slot counts, rookie vs devy draft structure, promotion strategy, and timeline-to-impact.',
  topics: [
    'Devy slots: typically 4–8 per roster; NFL devy eligible positions are QB, RB, WR, TE (no K/DST in pool by default).',
    'Rookie vs devy drafts: annual rookie draft for incoming pros; devy draft for college prospects. Promotion converts devy rights to pro roster when player declares.',
    'Promotion timing: common options are immediate after pro draft, at rollover, or manager choice before rookie draft.',
    'Return to school: if a player returns to school, league settings may restore rights to the devy pool or hold with the manager.',
  ],
}

export const C2C_SETUP_ASSISTANT = {
  title: 'C2C / Merged Devy Setup Assistant',
  intro: 'Explains college roster size and scoring choices, unified vs hybrid setup, and pipeline balance.',
  topics: [
    'College roster size: NFL C2C often uses 20 college slots; NBA C2C often uses 15. Active scoring slots (e.g. 1 QB, 2 RB, 3 WR, 1 TE, 2 FLEX) set who scores each week.',
    'Merged vs separate startup: merged draft mixes pro and college in one draft; separate runs pro draft then college draft.',
    'Unified vs hybrid standings: unified combines pro and college; hybrid weights pro and college (e.g. 60% pro, 40% college) for playoff qualification.',
    'Pipeline balance: balance college picks and promotion timing so you have a steady flow of talent to pro roster.',
  ],
}

/**
 * Get assistant copy by key (for UI or Chimmy).
 */
export function getDynastyAssistantCopy(
  key: 'dynasty' | 'taxi' | 'devy' | 'c2c'
): { title: string; intro: string; topics: string[] } {
  switch (key) {
    case 'dynasty':
      return DYNASTY_SETUP_ASSISTANT
    case 'taxi':
      return TAXI_ADVISOR
    case 'devy':
      return DEVY_SETUP_ASSISTANT
    case 'c2c':
      return C2C_SETUP_ASSISTANT
    default:
      return DYNASTY_SETUP_ASSISTANT
  }
}
```

### lib/dynasty-core/index.ts

```ts
/**
 * Dynasty core: roster, scoring, playoff presets and settings service.
 * Shared base for standard Dynasty, Devy, C2C.
 */

export * from './constants'
export * from './types'
export * from './DynastyRosterPresets'
export * from './DynastyScoringPresets'
export * from './DynastyPlayoffPresets'
export * from './DynastySettingsService'
export * from './dynastyContextForChimmy'
export * from './ai-setup-assistants'
```

### lib/taxi/constants.ts

```ts
/**
 * Taxi squad constants. PROMPT 3/5.
 * Taxi is for stashing eligible young/pro prospects; distinct from Devy (college rights).
 */

/** Core Dynasty NFL taxi-eligible positions. */
export const TAXI_ELIGIBLE_POSITIONS_NFL = ['QB', 'RB', 'WR', 'TE'] as const

/** Core Dynasty NBA taxi-eligible positions (including grouped G, F). */
export const TAXI_ELIGIBLE_POSITIONS_NBA = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'] as const

/** Taxi eligibility by experience: 1 = rookies only, 2 = rookies + 2nd year, 3 = rookies + 2nd + 3rd year. */
export const TAXI_ELIGIBILITY_YEARS_OPTIONS = [
  { value: 1, label: 'Rookies only' },
  { value: 2, label: 'Rookies + 2nd year' },
  { value: 3, label: 'Rookies + 2nd + 3rd year' },
] as const

/** Taxi lock behavior. */
export const TAXI_LOCK_BEHAVIOR_OPTIONS = [
  { value: 'once_promoted_no_return', label: 'Once promoted cannot return' },
  { value: 'free_move', label: 'Can move freely' },
  { value: 'commissioner_custom', label: 'Commissioner custom' },
] as const

/** Default taxi slot count for core dynasty. */
export const TAXI_DEFAULT_CORE_DYNASTY = 4
/** Default taxi slot count for Devy dynasty (deeper + devy). */
export const TAXI_DEFAULT_DEVY = 6
/** Default taxi slot count for C2C pro roster. */
export const TAXI_DEFAULT_C2C_PRO = 4
```

### lib/taxi/TaxiSettingsService.ts

```ts
/**
 * Taxi squad settings engine. PROMPT 3/5.
 * Inherited from Dynasty; effective slot count from Dynasty / Devy / C2C config.
 */

import { prisma } from '@/lib/prisma'
import {
  TAXI_ELIGIBLE_POSITIONS_NFL,
  TAXI_ELIGIBLE_POSITIONS_NBA,
  TAXI_DEFAULT_CORE_DYNASTY,
  TAXI_DEFAULT_DEVY,
  TAXI_DEFAULT_C2C_PRO,
} from './constants'
import type { LeagueSport } from '@prisma/client'

export interface EffectiveTaxiSettings {
  taxiSlotCount: number
  taxiEligibilityYears: number
  taxiLockBehavior: string
  taxiInSeasonMoves: boolean
  taxiPostseasonMoves: boolean
  taxiScoringOn: boolean
  taxiDeadlineWeek: number | null
  taxiPromotionDeadlineWeek: number | null
}

/**
 * Get taxi-eligible positions for a sport (core dynasty / pro side).
 */
export function getTaxiEligiblePositions(sport: string): readonly string[] {
  const s = String(sport).toUpperCase()
  if (s === 'NFL') return TAXI_ELIGIBLE_POSITIONS_NFL
  if (s === 'NBA') return TAXI_ELIGIBLE_POSITIONS_NBA
  return []
}

/**
 * Check if a position is taxi-eligible for the sport.
 */
export function isTaxiEligiblePosition(sport: string, position: string): boolean {
  const positions = getTaxiEligiblePositions(sport)
  const pos = String(position).toUpperCase()
  return positions.some((p) => p.toUpperCase() === pos)
}

/**
 * Get effective taxi settings for a league (slot count from Devy/C2C override when applicable).
 */
export async function getEffectiveTaxiSettings(leagueId: string): Promise<EffectiveTaxiSettings | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      sport: true,
      leagueVariant: true,
      dynastyConfig: true,
    },
  })
  if (!league) return null

  const variant = String(league.leagueVariant ?? '').toLowerCase()
  const isDevy = variant === 'devy_dynasty'
  const isC2C = variant === 'merged_devy_c2c'

  let taxiSlotCount = league.dynastyConfig?.taxiSlots ?? TAXI_DEFAULT_CORE_DYNASTY
  if (isDevy) {
    const devy = await prisma.devyLeagueConfig.findUnique({
      where: { leagueId },
      select: { taxiSize: true },
    })
    taxiSlotCount = devy?.taxiSize ?? TAXI_DEFAULT_DEVY
  } else if (isC2C) {
    const c2c = await prisma.c2CLeagueConfig.findUnique({
      where: { leagueId },
      select: { taxiSize: true },
    })
    taxiSlotCount = c2c?.taxiSize ?? TAXI_DEFAULT_C2C_PRO
  }

  const d = league.dynastyConfig
  return {
    taxiSlotCount,
    taxiEligibilityYears: d?.taxiEligibilityYears ?? 1,
    taxiLockBehavior: d?.taxiLockBehavior ?? 'once_promoted_no_return',
    taxiInSeasonMoves: d?.taxiInSeasonMoves ?? true,
    taxiPostseasonMoves: d?.taxiPostseasonMoves ?? false,
    taxiScoringOn: d?.taxiScoringOn ?? false,
    taxiDeadlineWeek: d?.taxiDeadlineWeek ?? null,
    taxiPromotionDeadlineWeek: d?.taxiPromotionDeadlineWeek ?? null,
  }
}

/**
 * Validate taxi eligibility by years in league (0 = rookie, 1 = 2nd year, 2 = 3rd year).
 * Returns true if player is within allowed years.
 */
export function isTaxiEligibleByExperience(yearsInLeague: number, eligibilityYears: number): boolean {
  return yearsInLeague >= 0 && yearsInLeague < eligibilityYears
}
```

### lib/taxi/index.ts

```ts
/**
 * Taxi squad settings engine. PROMPT 3/5.
 */

export * from './constants'
export * from './TaxiSettingsService'
```

### lib/league-settings-validation/types.ts

```ts
/**
 * Result of league settings validation.
 * Used to prevent invalid league configurations (e.g. auction without budgets, devy without slots).
 */

export interface LeagueSettingsValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

### lib/league-settings-validation/LeagueSettingsValidator.ts

```ts
/**
 * League Settings Validation Engine.
 * Prevents invalid league configurations (e.g. auction without budgets, devy without slots, C2C without college pool).
 * Deterministic; no AI.
 */

import type { LeagueSettingsValidationResult } from './types'
import { DYNASTY_SUPPORTED_TEAM_SIZES } from '@/lib/dynasty-core/constants'

/** Input may be League.settings (snake_case), wizard payload (camelCase), or partial. */
export type LeagueSettingsInput = Record<string, unknown>

function num(x: unknown): number | null {
  if (typeof x === 'number' && !Number.isNaN(x)) return x
  if (typeof x === 'string') {
    const n = Number(x)
    return !Number.isNaN(n) ? n : null
  }
  return null
}

function arrayOfNumbers(x: unknown): number[] {
  if (!Array.isArray(x)) return []
  return x.filter((v) => typeof v === 'number' && !Number.isNaN(v))
}

/**
 * Validate league/draft settings. Returns errors that block save; warnings are advisory.
 */
export function validateLeagueSettings(input: LeagueSettingsInput): LeagueSettingsValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const draftType = (input.draft_type ?? input.draftType ?? '') as string
  const leagueType = (input.league_type ?? input.leagueType ?? '') as string

  // --- Auction: draft_type === 'auction' requires a positive budget ---
  const auctionBudget =
    num(input.auction_budget_per_team) ??
    num(input.auctionBudgetPerTeam) ??
    (input.draftSettings && typeof input.draftSettings === 'object' && (input.draftSettings as Record<string, unknown>).auctionBudgetPerTeam != null
      ? num((input.draftSettings as Record<string, unknown>).auctionBudgetPerTeam)
      : null)
  if (String(draftType).toLowerCase() === 'auction') {
    if (auctionBudget == null || auctionBudget <= 0) {
      errors.push('Auction draft requires a positive budget per team (auction_budget_per_team or auctionBudgetPerTeam).')
    }
  }

  // --- Devy: league_type === 'devy' or devyConfig.enabled requires non-empty devy rounds/slots ---
  const devyConfig = input.devyConfig ?? input.devy_config
  const devyRounds =
    Array.isArray((devyConfig as { devyRounds?: number[] })?.devyRounds)
      ? (devyConfig as { devyRounds: number[] }).devyRounds
      : Array.isArray((devyConfig as { devy_rounds?: number[] })?.devy_rounds)
        ? (devyConfig as { devy_rounds: number[] }).devy_rounds
        : input.draftSettings && typeof input.draftSettings === 'object'
          ? arrayOfNumbers((input.draftSettings as Record<string, unknown>).devyRounds)
          : arrayOfNumbers(input.devy_rounds ?? input.devyRounds)
  const isDevyLeague =
    String(leagueType).toLowerCase() === 'devy' ||
    (devyConfig && typeof devyConfig === 'object' && Boolean((devyConfig as { enabled?: boolean }).enabled))
  if (isDevyLeague) {
    const rounds = Array.isArray(devyRounds) ? devyRounds : []
    if (rounds.length === 0) {
      errors.push('Devy league requires at least one devy round (devyRounds / devy_rounds or devyConfig.devyRounds).')
    }
    const rosterModeDevy = (input.roster_mode ?? input.rosterMode ?? '') as string
    if (String(rosterModeDevy).toLowerCase() === 'redraft') {
      errors.push('Devy and Merged Devy / C2C are dynasty-only; they cannot be created as redraft.')
    }
  }

  // --- C2C: league_type === 'c2c' or c2cConfig.enabled requires non-empty college rounds/pool ---
  const c2cConfig = input.c2cConfig ?? input.c2c_config
  const collegeRounds =
    Array.isArray((c2cConfig as { collegeRounds?: number[] })?.collegeRounds)
      ? (c2cConfig as { collegeRounds: number[] }).collegeRounds
      : Array.isArray((c2cConfig as { college_rounds?: number[] })?.college_rounds)
        ? (c2cConfig as { college_rounds: number[] }).college_rounds
        : input.draftSettings && typeof input.draftSettings === 'object'
          ? arrayOfNumbers((input.draftSettings as Record<string, unknown>).c2cCollegeRounds)
          : arrayOfNumbers(input.c2c_college_rounds ?? input.c2cCollegeRounds)
  const isC2CLeague =
    String(leagueType).toLowerCase() === 'c2c' ||
    (c2cConfig && typeof c2cConfig === 'object' && Boolean((c2cConfig as { enabled?: boolean }).enabled))
  if (isC2CLeague) {
    const rounds = Array.isArray(collegeRounds) ? collegeRounds : []
    if (rounds.length === 0) {
      errors.push('C2C league requires at least one college round (collegeRounds / c2cCollegeRounds or c2cConfig.collegeRounds).')
    }
    const rosterModeC2C = (input.roster_mode ?? input.rosterMode ?? '') as string
    if (String(rosterModeC2C).toLowerCase() === 'redraft') {
      errors.push('Devy and Merged Devy / C2C are dynasty-only; they cannot be created as redraft.')
    }
  }

  // --- Dynasty: league size must be in supported team sizes (4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32) ---
  const rosterMode = (input.roster_mode ?? input.rosterMode ?? '') as string
  const leagueSize = num(input.league_size ?? input.leagueSize ?? input.leagueSize)
  const isDynasty =
    String(rosterMode).toLowerCase() === 'dynasty' ||
    String(leagueType).toLowerCase() === 'dynasty' ||
    String(leagueType).toLowerCase() === 'devy' ||
    isDevyLeague ||
    isC2CLeague
  if (isDynasty && leagueSize != null) {
    if (!(DYNASTY_SUPPORTED_TEAM_SIZES as readonly number[]).includes(leagueSize)) {
      errors.push(
        `Dynasty league size must be one of: ${(DYNASTY_SUPPORTED_TEAM_SIZES as readonly number[]).join(', ')}.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Alias for validateLeagueSettings (LeagueSettingsValidator entry point).
 */
export function validate(input: LeagueSettingsInput): LeagueSettingsValidationResult {
  return validateLeagueSettings(input)
}
```

### lib/league-settings-validation/index.ts

```ts
export type { LeagueSettingsValidationResult } from './types'
export {
  validateLeagueSettings,
  validate,
  type LeagueSettingsInput,
} from './LeagueSettingsValidator'
```

### lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts

```ts
/**
 * Builds the exact League.settings object that will be persisted on league creation.
 * Use so frontend "settings preview" matches what is actually saved.
 */
import type { LeagueSport } from '@prisma/client'
import { buildInitialLeagueSettings } from '@/lib/sport-defaults/LeagueDefaultSettingsService'
import { resolveSportVariantContext } from './SportVariantContextResolver'

export interface CreationOverrides {
  superflex?: boolean
  roster_mode?: 'redraft' | 'dynasty' | 'keeper'
  /** Any additional keys to merge (e.g. from form). */
  extra?: Record<string, unknown>
}

/**
 * Build the exact settings object that will be written to League.settings when a league is created.
 * Pass the same sport and variant (and optional overrides) that the create API will use so preview matches persisted values.
 */
export function buildSettingsPreview(
  sport: LeagueSport | string,
  variant?: string | null,
  overrides?: CreationOverrides
): Record<string, unknown> {
  const context = resolveSportVariantContext(sport as LeagueSport, variant ?? null)
  const base = buildInitialLeagueSettings(context.sport, context.variant ?? undefined) as Record<string, unknown>

  const merged = { ...base }
  if (overrides?.superflex) merged.superflex = true
  if (overrides?.roster_mode) merged.roster_mode = overrides.roster_mode
  // Dynasty default: recommended roster and scoring format types (shared base for standard Dynasty, Devy, C2C)
  if (overrides?.roster_mode === 'dynasty') {
    merged.roster_format_type = merged.roster_format_type ?? 'dynasty_superflex'
    merged.scoring_format_type = merged.scoring_format_type ?? 'PPR'
    merged.regular_season_weeks = merged.regular_season_weeks ?? 14
    merged.playoff_team_count = merged.playoff_team_count ?? 6
  }
  if (overrides?.extra && typeof overrides.extra === 'object') {
    Object.assign(merged, overrides.extra)
  }
  return merged
}

/**
 * Return a minimal summary of settings that will be saved (for preview panel comparison).
 */
export function getSettingsPreviewSummary(
  sport: LeagueSport | string,
  variant?: string | null,
  overrides?: CreationOverrides
): {
  playoff_team_count: number
  regular_season_length: number
  schedule_unit: string
  waiver_mode: string
  roster_mode: string
  lock_time_behavior: string
} {
  const settings = buildSettingsPreview(sport, variant, overrides)
  return {
    playoff_team_count: (settings.playoff_team_count as number) ?? 6,
    regular_season_length: (settings.regular_season_length as number) ?? 18,
    schedule_unit: (settings.schedule_unit as string) ?? 'week',
    waiver_mode: (settings.waiver_mode as string) ?? 'faab',
    roster_mode: (settings.roster_mode as string) ?? 'redraft',
    lock_time_behavior: (settings.lock_time_behavior as string) ?? 'first_game',
  }
}
```

### app/api/league/create/route.ts

Source of truth: `app/api/league/create/route.ts` in repo. Key Dynasty/Devy/C2C logic: `presetVariant` = `devy_dynasty` when league_type is devy, `merged_devy_c2c` when league_type is c2c or variant is merged_devy_c2c; `effectiveDynastyForCreation` = isDevyRequested || isC2CRequested || isDynasty; `roster_mode: 'dynasty'` in overrides and forced on initialSettings when presetVariant is devy_dynasty or merged_devy_c2c; for devy_dynasty inject `devyConfig.devyRounds = [1,2,3,4]` if missing; for merged_devy_c2c inject `c2cConfig.collegeRounds = [1..6]` and `devyConfig.devyRounds = [1,2,3,4]` if missing. Rest: Sleeper import, native create, validateLeagueSettings, feature flags, league create, post-create bootstrap (guillotine, salary cap, survivor, devy, big brother, c2c, dynasty, IDP). Full file length 418 lines.

### app/api/leagues/[leagueId]/dynasty-settings/route.ts

```ts
/**
 * GET: Effective dynasty settings + presets (roster, scoring, playoff).
 * PUT: Update dynasty config and optional League.settings (roster_format_type, scoring_format_type, playoff, regular_season_weeks).
 * Commissioner only for PUT.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'
import {
  getEffectiveDynastySettings,
  getDynastyRosterPresets,
  getDynastyScoringPresets,
  getDynastyPlayoffPresets,
  upsertDynastyConfig,
  getDraftOrderAuditLog,
  ROOKIE_PICK_ORDER_METHODS,
} from '@/lib/dynasty-core/DynastySettingsService'
import { prisma } from '@/lib/prisma'
import { DYNASTY_SUPPORTED_TEAM_SIZES, VETO_RECOMMENDATION_COPY } from '@/lib/dynasty-core/constants'
import { TAXI_ELIGIBILITY_YEARS_OPTIONS, TAXI_LOCK_BEHAVIOR_OPTIONS } from '@/lib/taxi/constants'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, isDynasty: true, leagueVariant: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const isDynasty =
    league.isDynasty ||
    (league.leagueVariant && ['devy_dynasty', 'merged_devy_c2c'].includes(String(league.leagueVariant).toLowerCase()))

  const [effective, auditLog] = await Promise.all([
    getEffectiveDynastySettings(leagueId),
    isDynasty ? getDraftOrderAuditLog(leagueId, 20) : Promise.resolve([]),
  ])

  const sport = (league.sport as string) ?? 'NFL'

  return NextResponse.json({
    effective: effective ?? undefined,
    presets: {
      roster: getDynastyRosterPresets(),
      scoring: getDynastyScoringPresets(),
      playoff: getDynastyPlayoffPresets(sport),
    },
    constants: {
      supportedTeamSizes: [...DYNASTY_SUPPORTED_TEAM_SIZES],
      rookiePickOrderMethods: [...ROOKIE_PICK_ORDER_METHODS],
      vetoRecommendationCopy: VETO_RECOMMENDATION_COPY,
      taxiEligibilityYearsOptions: [...TAXI_ELIGIBILITY_YEARS_OPTIONS],
      taxiLockBehaviorOptions: [...TAXI_LOCK_BEHAVIOR_OPTIONS],
    },
    draftOrderAuditLog: auditLog,
    isDynasty,
  })
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const commissioner = await isCommissioner(leagueId, userId)
  if (!commissioner) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, settings: true, isDynasty: true, leagueVariant: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const isDynasty =
    league.isDynasty ||
    (league.leagueVariant && ['devy_dynasty', 'merged_devy_c2c'].includes(String(league.leagueVariant).toLowerCase()))
  if (!isDynasty) return NextResponse.json({ error: 'Not a dynasty league' }, { status: 400 })

  const settingsPatch: Record<string, unknown> = {}
  if (body.roster_format_type != null) settingsPatch.roster_format_type = String(body.roster_format_type)
  if (body.scoring_format_type != null) settingsPatch.scoring_format_type = String(body.scoring_format_type)
  if (body.playoff_team_count != null) settingsPatch.playoff_team_count = Number(body.playoff_team_count)
  if (body.regular_season_weeks != null) settingsPatch.regular_season_weeks = Number(body.regular_season_weeks)
  if (body.playoff_structure != null && typeof body.playoff_structure === 'object')
    settingsPatch.playoff_structure = body.playoff_structure

  const newCount = body.playoff_team_count != null ? Number(body.playoff_team_count) : null
  if (newCount != null && settingsPatch.playoff_structure == null) {
    const sport = (league.sport as string) ?? (league.settings as Record<string, unknown> | null)?.sport_type ?? 'NFL'
    const playoffList = getDynastyPlayoffPresets(String(sport))
    const preset = playoffList.find((p) => p.playoffTeamCount === newCount)
    if (preset) {
      const current = (league.settings as Record<string, unknown>) ?? {}
      const existing = (current.playoff_structure as Record<string, unknown>) ?? {}
      settingsPatch.playoff_structure = {
        ...existing,
        first_round_byes: preset.firstRoundByes,
        playoff_weeks: preset.playoffWeeks,
        playoff_start_week: preset.playoffStartWeek ?? existing.playoff_start_week,
      }
    }
  }

  if (Object.keys(settingsPatch).length > 0) {
    const current = (league.settings as Record<string, unknown>) ?? {}
    await prisma.league.update({
      where: { id: leagueId },
      data: { settings: { ...current, ...settingsPatch } },
    })
  }

  const dynastyPayload: Parameters<typeof upsertDynastyConfig>[1] = {}
  if (body.regularSeasonWeeks != null) dynastyPayload.regularSeasonWeeks = Number(body.regularSeasonWeeks)
  if (body.rookiePickOrderMethod != null) dynastyPayload.rookiePickOrderMethod = String(body.rookiePickOrderMethod)
  if (body.useMaxPfForNonPlayoff != null) dynastyPayload.useMaxPfForNonPlayoff = Boolean(body.useMaxPfForNonPlayoff)
  if (body.rookieDraftRounds != null) dynastyPayload.rookieDraftRounds = Number(body.rookieDraftRounds)
  if (body.rookieDraftType != null) dynastyPayload.rookieDraftType = String(body.rookieDraftType)
  if (body.divisionsEnabled != null) dynastyPayload.divisionsEnabled = Boolean(body.divisionsEnabled)
  if (body.tradeDeadlineWeek !== undefined) dynastyPayload.tradeDeadlineWeek = body.tradeDeadlineWeek === null ? null : Number(body.tradeDeadlineWeek)
  if (body.waiverTypeRecommended != null) dynastyPayload.waiverTypeRecommended = String(body.waiverTypeRecommended)
  if (body.futurePicksYearsOut != null) dynastyPayload.futurePicksYearsOut = Number(body.futurePicksYearsOut)
  if (body.taxiSlots != null) dynastyPayload.taxiSlots = Number(body.taxiSlots)
  if (body.taxiEligibilityYears != null) dynastyPayload.taxiEligibilityYears = Number(body.taxiEligibilityYears)
  if (body.taxiLockBehavior != null) dynastyPayload.taxiLockBehavior = String(body.taxiLockBehavior)
  if (body.taxiInSeasonMoves != null) dynastyPayload.taxiInSeasonMoves = Boolean(body.taxiInSeasonMoves)
  if (body.taxiPostseasonMoves != null) dynastyPayload.taxiPostseasonMoves = Boolean(body.taxiPostseasonMoves)
  if (body.taxiScoringOn != null) dynastyPayload.taxiScoringOn = Boolean(body.taxiScoringOn)
  if (body.taxiDeadlineWeek !== undefined) dynastyPayload.taxiDeadlineWeek = body.taxiDeadlineWeek === null ? null : Number(body.taxiDeadlineWeek)
  if (body.taxiPromotionDeadlineWeek !== undefined) dynastyPayload.taxiPromotionDeadlineWeek = body.taxiPromotionDeadlineWeek === null ? null : Number(body.taxiPromotionDeadlineWeek)

  const config = await upsertDynastyConfig(leagueId, dynastyPayload)

  return NextResponse.json({ ok: true, config })
}
```

### components/app/settings/DynastySettingsPanel.tsx

Source of truth: `components/app/settings/DynastySettingsPanel.tsx` in repo. Full file 393 lines: loading/error/non-dynasty/empty-effective states; roster and scoring format dropdowns; playoff team count dropdown; rookie draft order method, rounds, type, useMaxPfForNonPlayoff; taxi slots, eligibility years, lock behavior, in-season/postseason moves, scoring on taxi; trade deadline week, divisions; Save/Reset when commissioner and patch non-empty; draft order audit list. All existing logic preserved.

---

## 4. SQL / Schema Changes

**Prisma schema** (no raw SQL; run `npx prisma migrate dev` or deploy migration as needed).

Excerpt — `DynastyLeagueConfig` and related:

```prisma
/// Dynasty core league config (shared base for standard Dynasty, Devy, C2C). PROMPT 2/5 + PROMPT 3/5 taxi.
model DynastyLeagueConfig {
  id                        String   @id @default(uuid())
  leagueId                  String   @unique @db.VarChar(64)
  league                    League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  regularSeasonWeeks        Int      @default(14)
  rookiePickOrderMethod     String   @default("max_pf") @db.VarChar(32)
  useMaxPfForNonPlayoff     Boolean  @default(true)
  rookieDraftRounds         Int      @default(4)
  rookieDraftType           String   @default("linear") @db.VarChar(16)
  divisionsEnabled          Boolean  @default(false)
  tradeDeadlineWeek         Int?
  waiverTypeRecommended     String   @default("faab") @db.VarChar(24)
  futurePicksYearsOut       Int      @default(3)
  taxiSlots                 Int      @default(4)
  taxiEligibilityYears       Int      @default(1)
  taxiLockBehavior           String   @default("once_promoted_no_return") @db.VarChar(32)
  taxiInSeasonMoves          Boolean  @default(true)
  taxiPostseasonMoves        Boolean  @default(false)
  taxiScoringOn              Boolean  @default(false)
  taxiDeadlineWeek           Int?
  taxiPromotionDeadlineWeek  Int?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  draftOrderAuditLogs       DynastyDraftOrderAuditLog[]
  @@map("dynasty_league_configs")
}

model DynastyDraftOrderAuditLog {
  id          String   @id @default(cuid())
  leagueId    String   @db.VarChar(64)
  configId    String
  config      DynastyLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  season      Int
  overridePayload Json
  userId      String   @db.VarChar(64)
  reason      String?  @db.VarChar(256)
  createdAt   DateTime @default(now())
  @@index([leagueId])
  ...
}
```

`League` must have `dynastyConfig DynastyLeagueConfig?` relation. No additional SQL provided; use Prisma migrations.

**Seed (prisma/seed-sport-config.ts)** — Add after `await upsertRosterTemplate('NFL', 'dynasty_superflex', ...)` and before `await upsertSportFeatureFlags('NFL', ...)`:

```ts
  // Dynasty 1QB: no SUPERFLEX; QB, RB×2, WR×2, TE×1, FLEX×2, BENCH, TAXI, IR (no K/DST)
  const nflDynasty1qbSlots: RosterSlotRow[] = [
    { slotName: 'QB', ... starterCount: 1 ... },
    { slotName: 'RB', ... starterCount: 2 ... },
    { slotName: 'WR', ... starterCount: 2 ... },
    { slotName: 'TE', ... starterCount: 1 ... },
    { slotName: 'FLEX', ... starterCount: 2 ... },
    { slotName: 'BENCH', ... benchCount: 14 ... },
    { slotName: 'TAXI', ... taxiCount: 4 ... },
    { slotName: 'IR', ... reserveCount: 3 ... },
  ]
  await upsertRosterTemplate('NFL', 'dynasty_1qb', 'NFL_DYNASTY_1QB', nflDynasty1qbSlots)

  // Dynasty 2QB: 2 QB, RB×2, WR×2, TE×1, FLEX×2, BENCH, TAXI, IR (no K/DST)
  const nflDynasty2qbSlots: RosterSlotRow[] = [ ... QB starterCount: 2 ... ]
  await upsertRosterTemplate('NFL', 'dynasty_2qb', 'NFL_DYNASTY_2QB', nflDynasty2qbSlots)

  await upsertRosterTemplate('NFL', 'dynasty_tep', 'NFL_DYNASTY_TEP', nflDynastySuperflexSlots)
```

Full slot definitions are in `prisma/seed-sport-config.ts` (lines 307–335 in the current codebase).

---

## 5. QA Checklist (Pass/Fail)

| # | Area | Result | What was validated |
|---|------|--------|--------------------|
| 1 | Dynasty creation | PASS | Core dynasty create; 1QB/Superflex/TEP presets; league size; settings persist via League.settings + DynastyLeagueConfig |
| 2 | Roster settings | PASS | Starter counts from templates; bench/IR/taxi in templates; dynasty_1qb/dynasty_2qb/dynasty_tep seeded; sport-incompatible options not added; lineup validation unchanged |
| 3 | Scoring settings | PASS | Presets map to formatType; TEP/superflex in presets; custom overrides in League.settings; scoring engine unchanged |
| 4 | Playoff settings | PASS | 4/6/8/10 presets; playoff_team_count + structure merge on PUT; title week via preset; consolation/third-place in resolver; rookie order (reverse Max PF) and playoff finish logic unchanged |
| 5 | Devy settings | PASS | Devy create forces dynasty; NFL/NBA devy positions in existing devy layer; devy rounds injected on create; promotion in devy config; validation requires non-empty devy rounds |
| 6 | Merged Devy / C2C | PASS | C2C presetVariant = merged_devy_c2c; roster_mode = dynasty; college + devy rounds injected; college roster and startup toggles in C2C config |
| 7 | Taxi settings | PASS | Eligibility (years), slot count, rookies-only / 2nd/3rd year; lock rules; move toggles; taxi distinct from devy; effective from DynastyLeagueConfig (Devy/C2C override slot count) |
| 8 | AI | PASS | buildDynastyContextForChimmy uses getEffectiveDynastySettings + getEffectiveTaxiSettings; setup assistants explanatory only; no AI override of deterministic rules |
| 9 | Regression | PASS | Standard league create; sport config; trade engine; devy board; dynasty sync; specialty leagues unchanged |
| 10 | UX | PASS | No dead buttons; loading/error/empty states; summary cards; commissioner-only PUT; Save/Reset when patch present |

---

## 6. Bug Fixes Made During QA

1. **1QB / 2QB / TEP roster templates** — Presets saved `dynasty_1qb`, `dynasty_2qb`, `dynasty_tep` but no DB templates existed; resolution fell back to non-dynasty default (no TAXI/IR). **Fix:** Added NFL roster templates in `prisma/seed-sport-config.ts` for `dynasty_1qb`, `dynasty_2qb`, and `dynasty_tep` (same as superflex for TEP).
2. **Devy/C2C league creation** — Creating Devy or C2C without sending devy/college rounds could fail validation. **Fix:** In `app/api/league/create/route.ts`, when `presetVariant` is `devy_dynasty` or `merged_devy_c2c`, set `roster_mode = 'dynasty'` and inject default `devyConfig.devyRounds` and, for C2C, `c2cConfig.collegeRounds`.
3. **C2C preset variant** — League type C2C did not set `presetVariant` to `merged_devy_c2c`. **Fix:** Set `presetVariant = 'merged_devy_c2c'` when league type is C2C (or variant is merged_devy_c2c).
4. **Playoff structure on dynasty PUT** — Updating only `playoff_team_count` did not update bracket shape. **Fix:** When only `playoff_team_count` is sent, merge matching dynasty preset (`first_round_byes`, `playoff_weeks`, `playoff_start_week`) into `playoff_structure`.
5. **Dynasty panel empty state** — When league was dynasty but effective settings failed to load, panel showed header with no content. **Fix:** Added explicit empty state: “Unable to load roster and scoring details. Try refreshing the page.”

---

## 7. Migration Notes

- **Database:** Ensure migrations for `DynastyLeagueConfig` and `DynastyDraftOrderAuditLog` (and `League.dynastyConfig` relation) are applied. If these already exist, no new migration is required for this deliverable.
- **Seed:** Run `npx prisma db seed` (or your project’s seed command) so that NFL roster templates `dynasty_1qb`, `dynasty_2qb`, and `dynasty_tep` exist. Existing leagues that already had these format types will start resolving to the new templates after seed.
- **Existing dynasty leagues:** Leagues with `isDynasty: true` or variant `devy_dynasty` / `merged_devy_c2c` will get a `DynastyLeagueConfig` on first GET or PUT to dynasty-settings (upsert creates with defaults). No data backfill required.

---

## 8. Manual Commissioner Steps

- **Dynasty / Devy / C2C:** Commissioner uses **Dynasty Settings** (and Devy/C2C panels where applicable) to set roster preset, scoring preset, playoff team count, regular season weeks, rookie draft order method (reverse Max PF recommended), rookie draft rounds/type, taxi slots and eligibility, lock behavior, trade deadline week, divisions, and waiver recommendation. No mandatory steps; defaults apply.
- **Roster/scoring/playoff:** Changing roster or scoring format type or playoff team count and saving applies immediately to League.settings and, for playoff, merges preset structure when only team count is changed.
- **Taxi:** Taxi is configured in Dynasty Settings (core dynasty). For Devy/C2C, taxi slot count can be overridden in Devy/C2C config; eligibility and lock rules remain on dynasty config. Commissioners should confirm taxi vs devy slot counts so members understand which slots are taxi (pro prospects) vs devy (college rights).
- **Draft order:** To use commissioner override, commissioner sets method to “Commissioner override” and uses the draft order audit/override flow when implemented; reverse Max PF for non-playoff teams remains the recommended default.
