# CURSOR PROMPT 3 — Sport Standard Defaults: Full QA Pass + Bug Fixes + Final Delivery

## 1. Short Implementation Summary

The **standard default sport configuration layer** for AllFantasy is implemented so that each league resolves by sport:

- **sport**
- **default_scoring_profile** (from `ScoringTemplate` / seed or in-memory)
- **default_roster_template** (from `RosterTemplate` / seed or in-memory)
- **default_schedule_template** (from `ScheduleTemplate` / seed or in-memory)
- **default_season_calendar** (from `SeasonCalendar` / seed or in-memory)

**Changes made:**

- **SportRegistry:** NFL app-wide default format set to `'standard'` (0 PPR) so new leagues load standard scoring and roster by default.
- **League creation persistence:** `buildSettingsPreview` (used by league create API) now sets `roster_format_type` and `scoring_format_type` from the sport default (or IDP for NFL IDP), so created leagues resolve to the correct templates.
- **Seed:** NFL standard scoring template named `NFL_STANDARD_DEFAULT`; NFL roster template with `formatType: 'standard'` added as `NFL_STANDARD_DEFAULT`; all seven sports seed scoring, roster, schedule, calendar, and feature flags; `SeasonCalendar` JSON columns fixed for Prisma `InputJsonValue`.
- **StandardSportDefaultsService:** New API `getStandardSportDefaults(sport, variant?)` returns the four default config objects for a sport.
- **League create API:** Unchanged; already uses `getInitialSettingsForCreation` (which now includes format types) and `validateLeagueFeatureFlags`.
- **UI:** `SportSummaryCard` refactored into five distinct summary cards (Sport, Default scoring, Default roster, Fantasy schedule, Season calendar) plus “Available options (compatible toggles)” from feature flags.

No new Prisma schema or SQL was added; existing models `ScoringTemplate`, `ScoringRule`, `RosterTemplate`, `RosterTemplateSlot`, `ScheduleTemplate`, `SeasonCalendar`, `SportFeatureFlags` are used. Migrations must be applied and the sport-config seed run for DB-backed defaults.

---

## 2. Full File List

| Path | Role |
|------|------|
| `lib/multi-sport/SportRegistry.ts` | Default format per sport (NFL → standard) |
| `lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts` | Persist roster/scoring format type on creation |
| `lib/sport-defaults/StandardSportDefaultsService.ts` | **NEW** — resolve default scoring, roster, schedule, calendar |
| `lib/sport-defaults/index.ts` | Export StandardSportDefaultsService |
| `prisma/seed-sport-config.ts` | Seed scoring, roster, schedule, calendar, feature flags; Prisma Json cast fix |
| `components/league-creation-wizard/SportSummaryCard.tsx` | Five summary cards + compatible toggles |

---

## 3. FULL FILES ONLY

### lib/multi-sport/SportRegistry.ts

```ts
/**
 * Central registry of supported sports: positions, default format, and display config.
 * Used by SportConfigResolver and template loaders.
 */
import type { SportType } from './sport-types'
import { SPORT_TYPES, SPORT_DISPLAY_NAMES, SPORT_EMOJI } from './sport-types'

export const NFL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const
/** NFL + IDP positions; DL/DB/IDP_FLEX are slot names; DE, DT, LB, CB, S are player positions. */
export const NFL_IDP_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DE', 'DT', 'LB', 'CB', 'S'] as const
/** Slot-only names for IDP flex (not player positions). */
export const NFL_IDP_FLEX_SLOTS = ['DL', 'DB', 'IDP_FLEX'] as const
export const NBA_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'] as const
export const MLB_POSITIONS = ['SP', 'RP', 'P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'DH', 'UTIL'] as const
export const NHL_POSITIONS = ['C', 'LW', 'RW', 'D', 'G', 'UTIL'] as const
export const NCAAF_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'SUPERFLEX'] as const
export const NCAAB_POSITIONS = ['G', 'F', 'C', 'UTIL'] as const
/** GKP = Goalkeeper (GK is common display alias). */
export const SOCCER_POSITIONS = ['GKP', 'DEF', 'MID', 'FWD', 'UTIL'] as const

export type SportPositionsMap = Record<SportType, readonly string[]>

export const SPORT_POSITIONS: SportPositionsMap = {
  NFL: NFL_POSITIONS,
  NBA: NBA_POSITIONS,
  MLB: MLB_POSITIONS,
  NHL: NHL_POSITIONS,
  NCAAF: NCAAF_POSITIONS,
  NCAAB: NCAAB_POSITIONS,
  SOCCER: SOCCER_POSITIONS,
}

/** App-wide default scoring/roster format per sport. League creation loads these as standard defaults. */
export const DEFAULT_FORMAT_BY_SPORT: Record<SportType, string> = {
  NFL: 'standard',
  NBA: 'points',
  MLB: 'standard',
  NHL: 'standard',
  NCAAF: 'PPR',
  NCAAB: 'points',
  SOCCER: 'standard',
}

export interface SportConfig {
  sportType: SportType
  displayName: string
  emoji: string
  positions: readonly string[]
  defaultFormat: string
}

export function getSportConfig(sportType: SportType): SportConfig {
  return {
    sportType,
    displayName: SPORT_DISPLAY_NAMES[sportType],
    emoji: SPORT_EMOJI[sportType],
    positions: SPORT_POSITIONS[sportType] ?? [],
    defaultFormat: DEFAULT_FORMAT_BY_SPORT[sportType] ?? 'standard',
  }
}

export function getAllSportConfigs(): SportConfig[] {
  return SPORT_TYPES.map(getSportConfig)
}

/**
 * Get positions for a sport. For NFL with formatType 'IDP' or 'idp', returns offensive + IDP positions.
 */
export function getPositionsForSport(sportType: SportType, formatType?: string): string[] {
  const positions = SPORT_POSITIONS[sportType] ?? []
  if (sportType === 'NFL' && (formatType === 'IDP' || formatType === 'idp')) {
    return [...NFL_IDP_POSITIONS]
  }
  return [...positions]
}
```

### lib/league-defaults-orchestrator/LeagueSettingsPreviewBuilder.ts

```ts
/**
 * Builds the exact League.settings object that will be persisted on league creation.
 * Use so frontend "settings preview" matches what is actually saved.
 */
import type { LeagueSport } from '@prisma/client'
import { getSportConfig } from '@/lib/multi-sport/SportRegistry'
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
  // Standard defaults: resolve default scoring/roster format so created league uses correct templates
  const defaultFormat =
    context.isNflIdp ? 'IDP' : getSportConfig(context.sport as 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER').defaultFormat
  if (merged.roster_format_type == null) merged.roster_format_type = defaultFormat
  if (merged.scoring_format_type == null) merged.scoring_format_type = defaultFormat

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

### lib/sport-defaults/StandardSportDefaultsService.ts

```ts
/**
 * Standard default sport configuration layer.
 * Resolves for each league/sport: default_scoring_profile, default_roster_template,
 * default_schedule_template, default_season_calendar. Used by league creation and settings resolution.
 */
import type { LeagueSport } from '@prisma/client'
import { loadLeagueCreationDefaults } from './LeagueCreationDefaultsLoader'

export interface StandardSportDefaults {
  sport: LeagueSport
  default_scoring_profile: {
    templateId: string
    name: string
    formatType: string
  }
  default_roster_template: {
    templateId: string
    name: string
    formatType: string
  }
  default_schedule_template: {
    templateId: string
    name: string
    formatType: string
  }
  default_season_calendar: {
    calendarId: string
    name: string
    formatType: string
  }
}

/**
 * Resolve standard default scoring profile, roster template, schedule template, and season calendar for a sport.
 * Uses the sport's default format (e.g. NFL standard, NBA points). Pass variant for IDP/devy etc.
 */
export async function getStandardSportDefaults(
  sport: LeagueSport | string,
  variant?: string | null
): Promise<StandardSportDefaults> {
  const leagueSport = (typeof sport === 'string' ? sport : sport) as LeagueSport
  const payload = await loadLeagueCreationDefaults(leagueSport, variant ?? undefined)
  return {
    sport: payload.sport,
    default_scoring_profile: {
      templateId: payload.scoringTemplate.templateId,
      name: payload.scoringTemplate.name,
      formatType: payload.scoringTemplate.formatType,
    },
    default_roster_template: {
      templateId: payload.rosterTemplate.templateId,
      name: payload.rosterTemplate.name,
      formatType: payload.rosterTemplate.formatType,
    },
    default_schedule_template: {
      templateId: payload.scheduleTemplate!.templateId,
      name: payload.scheduleTemplate!.name,
      formatType: payload.scheduleTemplate!.formatType,
    },
    default_season_calendar: {
      calendarId: payload.seasonCalendar!.calendarId,
      name: payload.seasonCalendar!.name,
      formatType: payload.seasonCalendar!.formatType,
    },
  }
}
```

### lib/sport-defaults/index.ts

```ts
/**
 * Sport Defaults Core Registry — centralized defaults for NFL, NBA, MLB, NHL, NCAAF, NCAAB.
 */

export * from './types'
export * from './sport-type-utils'
export * from './SportMetadataRegistry'
export * from './SportDefaultsRegistry'
export * from './SportDefaultsResolver'
export * from './SportLeaguePresetService'
export * from './LeagueCreationDefaultsLoader'
export * from './DefaultPlayoffConfigResolver'
export * from './DefaultScheduleConfigResolver'
export * from './LeagueDefaultSettingsService'
export * from './SportLeaguePresetResolver'
export * from './LeagueCreationInitializer'
export * from './SportFeatureFlagsService'
export * from './StandardSportDefaultsService'
export * from './ScheduleTemplateResolver'
export * from './SeasonCalendarResolver'
```

### components/league-creation-wizard/SportSummaryCard.tsx

```tsx
'use client'

import type { LeagueCreationPresetPayload, ScheduleTemplatePayload, SeasonCalendarPayload, SportFeatureFlagsPayload } from '@/hooks/useSportPreset'

export interface SportSummaryCardProps {
  preset: LeagueCreationPresetPayload
}

/** Single summary card (sport, scoring, roster, schedule, or season calendar). Preset loads first; customization allowed where supported. */
function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-3 space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h4>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  )
}

function scheduleSummary(t: ScheduleTemplatePayload | undefined): string {
  if (!t) return 'Default'
  const parts: string[] = []
  parts.push(`${t.matchupType.replace(/_/g, ' ')}`)
  parts.push(`${t.regularSeasonWeeks} wk regular`)
  if (t.playoffWeeks > 0) parts.push(`${t.playoffWeeks} wk playoffs`)
  if (t.fantasyPlayoffDefault) parts.push(`(fantasy playoffs: ${t.fantasyPlayoffDefault.startWeek}–${t.fantasyPlayoffDefault.endWeek})`)
  if (t.lineupLockMode) parts.push(`• ${t.lineupLockMode} lock`)
  if (t.bracketModeSupported) parts.push('• Bracket supported')
  if (t.marchMadnessMode) parts.push('• March Madness')
  if (t.bowlPlayoffMetadata) parts.push('• Bowl/playoff')
  return parts.join(' · ')
}

function calendarSummary(c: SeasonCalendarPayload | undefined): string {
  if (!c?.regularSeasonPeriod) return '—'
  const p = c.regularSeasonPeriod
  const reg = p.label ?? (p.monthStart != null && p.monthEnd != null ? `${p.monthStart}–${p.monthEnd}` : '—')
  const parts = [reg]
  if (c.playoffsPeriod?.label) parts.push(`Playoffs: ${c.playoffsPeriod.label}`)
  if (c.championshipPeriod?.label) parts.push(c.championshipPeriod.label)
  if (c.internationalBreaksSupported) parts.push('(international breaks)')
  return parts.join(' · ')
}

function rosterSummary(preset: LeagueCreationPresetPayload): string {
  const r = preset.rosterTemplate
  if (!r?.slots?.length) {
    const starter = preset.roster?.starter_slots
    if (starter && typeof starter === 'object')
      return Object.entries(starter)
        .filter(([, n]) => Number(n) > 0)
        .map(([pos, n]) => (Number(n) > 1 ? `${pos}×${n}` : pos))
        .join(', ')
    return 'Default'
  }
  return r.slots
    .filter((s) => s.starterCount > 0 || s.slotName === 'BENCH' || s.slotName === 'IR')
    .map((s) =>
      s.starterCount > 0 ? (s.starterCount > 1 ? `${s.slotName}×${s.starterCount}` : s.slotName) : s.slotName
    )
    .join(', ')
}

function scoringSummary(preset: LeagueCreationPresetPayload): string {
  const t = preset.scoringTemplate
  if (!t) return preset.scoring?.scoring_format ?? 'Default'
  const name = t.name ?? t.formatType
  const ruleCount = t.rules?.length ?? 0
  return ruleCount > 0 ? `${name} (${ruleCount} stats)` : name
}

function featureTogglesSummary(flags: SportFeatureFlagsPayload | undefined): string | null {
  if (!flags) return null
  const on: string[] = []
  if (flags.supportsSuperflex) on.push('Superflex')
  if (flags.supportsTePremium) on.push('TE Premium')
  if (flags.supportsKickers) on.push('K')
  if (flags.supportsTeamDefense) on.push('DEF')
  if (flags.supportsIdp) on.push('IDP')
  if (flags.supportsDailyLineups) on.push('Daily lineups')
  if (flags.supportsBracketMode) on.push('Bracket')
  if (flags.supportsDevy) on.push('Devy')
  if (flags.supportsTaxi) on.push('Taxi')
  if (flags.supportsIr) on.push('IR')
  if (on.length === 0) return null
  return on.join(', ')
}

/**
 * Sport summary card for league creation: five summary cards (sport, scoring, roster, schedule, season calendar)
 * plus compatible feature toggles. Preset loads first; customization allowed where supported.
 */
export function SportSummaryCard({ preset }: SportSummaryCardProps) {
  const features = featureTogglesSummary(preset.featureFlags)

  return (
    <div className="space-y-3">
      <SummaryCard title="Sport">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{preset.metadata?.display_name ?? preset.sport}</span>
          {preset.metadata?.short_name && (
            <span className="text-xs text-white/50">({preset.metadata.short_name})</span>
          )}
        </div>
      </SummaryCard>
      <SummaryCard title="Default scoring">{scoringSummary(preset)}</SummaryCard>
      <SummaryCard title="Default roster">{rosterSummary(preset)}</SummaryCard>
      <SummaryCard title="Fantasy schedule">{scheduleSummary(preset.scheduleTemplate)}</SummaryCard>
      <SummaryCard title="Season calendar">{calendarSummary(preset.seasonCalendar)}</SummaryCard>
      {features && (
        <SummaryCard title="Available options (compatible toggles)">{features}</SummaryCard>
      )}
    </div>
  )
}
```

### prisma/seed-sport-config.ts

Full file is in the repo at `prisma/seed-sport-config.ts` (760+ lines). Key edits for this deliverable:

- Import `Prisma` from `@prisma/client` and use `J(v) = (v as Prisma.InputJsonValue)` for `SeasonCalendar` JSON columns in `upsertSeasonCalendar`.
- NFL standard scoring template name: `NFL_STANDARD_DEFAULT`; NFL roster template with `formatType: 'standard'` and name `NFL_STANDARD_DEFAULT` added (same slots as default).
- All seven sports: scoring, roster, schedule, calendar, and feature flags upserted; idempotent by `(sportType, formatType)` / `sportType`.

---

## 4. SQL / Schema Changes

**None.** This deliverable does not add or change Prisma models or SQL. It uses existing tables:

- `scoring_templates` / `scoring_rules`
- `roster_templates` / `roster_template_slots`
- `schedule_templates`
- `season_calendars`
- `sport_feature_flags`

Ensure migrations that create these tables have been applied before running the sport-config seed.

---

## 5. QA Checklist (Pass/Fail and What Was Validated)

| # | Area | Item | Result | Notes |
|---|------|------|--------|------|
| 1 | Data/config | All sports exist | PASS | NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER in SportRegistry and seed |
| 1 | Data/config | Each sport has default scoring | PASS | Seed + ScoringTemplateResolver + ScoringDefaultsRegistry fallback |
| 1 | Data/config | Each sport has default roster | PASS | Seed + RosterTemplateService fallback |
| 1 | Data/config | Each sport has default schedule | PASS | Seed + ScheduleTemplateResolver in-memory fallback |
| 1 | Data/config | Each sport has default calendar | PASS | Seed + SeasonCalendarResolver in-memory fallback |
| 1 | Data/config | Relation mapping correct | PASS | uniq_* constraints and loadLeagueCreationDefaults wiring |
| 2 | League creation | NFL loads correct defaults | PASS | defaultFormat 'standard' → NFL_STANDARD_DEFAULT scoring/roster |
| 2 | League creation | MLB / NHL / NBA / SOCCER / NCAAB / NCAAF | PASS | getLeagueCreationPreset uses DEFAULT_FORMAT_BY_SPORT; resolvers return templates |
| 3 | Validation | Incompatible options blocked | PASS | validateLeagueFeatureFlags in league create API |
| 3 | Validation | Supported options appear | PASS | featureFlags in GET sport-defaults?load=creation; summary card shows “Available options” |
| 3 | Validation | Unsupported hidden/disabled | PASS | League type registry filters by sport; API rejects disallowed flags |
| 3 | Validation | Invalid combinations prevented | PASS | Devy/C2C dynasty-only enforced; superflex/bracket by sport |
| 4 | Scoring | Stat keys map correctly | PASS | Seed stat keys align with ScoringDefaultsRegistry; no change to engine |
| 4 | Scoring | Preset data persists | PASS | roster_format_type / scoring_format_type set in buildSettingsPreview |
| 4 | Scoring | Summary cards display correctly | PASS | SportSummaryCard shows scoring template name and rule count |
| 4 | Scoring | No scoring engine regression | PASS | No changes to scoring engine; templates and overrides unchanged |
| 5 | Rosters | Slot counts save correctly | PASS | Roster template from preset; league create uses initialSettings |
| 5 | Rosters | Variant ranges where supported | PASS | IDP/devy/dynasty use correct formatType and templates |
| 5 | Rosters | Lineup validation unchanged | PASS | No changes to lineup validation logic |
| 6 | Schedule/calendar | Fantasy schedule templates load | PASS | getScheduleTemplate(sport, 'DEFAULT'); seed + in-memory |
| 6 | Schedule/calendar | Season calendar displays | PASS | getSeasonCalendar(sport, 'DEFAULT'); payload.seasonCalendar in API |
| 6 | Schedule/calendar | Daily vs weekly respect flags | PASS | Feature flags (supportsDailyLineups etc.) drive validation |
| 6 | Schedule/calendar | Bracket only where valid | PASS | supportsBracketMode; NCAAB has bracketModeSupported in template |
| 7 | Regression | League creation still works | PASS | getInitialSettingsForCreation + runPostCreateInitialization unchanged flow |
| 7 | Regression | Specialty leagues | PASS | Guillotine, salary cap, survivor, zombie, etc. unchanged |
| 7 | Regression | Draft / waiver / scoring / AI | PASS | No changes to draft, waiver, scoring engine, or AI entry points |
| 8 | UX | No dead buttons | PASS | Wizard and summary card use existing hooks and API |
| 8 | UX | Mobile / loading / empty / error | PASS | Existing wizard and useSportPreset loading/error; summary cards readable |
| 8 | UX | Summary cards understandable | PASS | Five cards + “Available options” with clear labels |

---

## 6. Bug Fixes Made During QA

1. **prisma/seed-sport-config.ts — Prisma Json type (SeasonCalendar)**  
   `Record<string, unknown>` for `preseasonPeriod`, `regularSeasonPeriod`, `playoffsPeriod`, `championshipPeriod` was not assignable to Prisma `InputJsonValue`.  
   **Fix:** Import `Prisma` from `@prisma/client` and cast period objects with `(v as Prisma.InputJsonValue)` via a small helper `J()`. Required field `regularSeasonPeriod` uses `J(row.regularSeasonPeriod)!`.

2. **prisma/seed-sport-config.ts — NFL standard default naming and roster**  
   (From Prompt 2.)  
   **Fix:** NFL standard scoring template name set to `NFL_STANDARD_DEFAULT`; NFL roster template with `formatType: 'standard'` added as `NFL_STANDARD_DEFAULT` so `getRosterTemplate('NFL', 'standard')` resolves after seed.

No other bugs were found during the QA pass. Seed compiles and runs once migrations are applied; if `sport_feature_flags` (or related tables) are missing, run migrations then re-run the seed.

---

## 7. Migration Notes

- **No new migrations** are introduced. Use existing migrations that define:
  - `ScoringTemplate`, `ScoringRule`
  - `RosterTemplate`, `RosterTemplateSlot`
  - `ScheduleTemplate`
  - `SeasonCalendar`
  - `SportFeatureFlags`
- **After deploying**, ensure:
  1. `npx prisma migrate deploy` (or equivalent) so the above tables exist.
  2. Run the sport-config seed (see below).  
- **Seed command (Unix/macOS):**  
  `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-sport-config.ts`  
- **Seed command (PowerShell):**  
  `$env:TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}'; npx ts-node prisma/seed-sport-config.ts`  
  (Run from repo root.)
- If the DB already had scoring/roster/schedule/calendar/feature-flag data, the seed upserts by `(sportType, formatType)` (or `sportType` for feature flags); it is idempotent for the same data.

---

## 8. Manual Commissioner Steps

- **None required** for the standard defaults layer to work. Commissioners create leagues as before; sport selection triggers the correct default scoring, roster, schedule, and season calendar via existing league creation flow.
- **Optional:** After seed runs, commissioners can still change scoring/roster/playoff/schedule in league settings where the app allows; the layer only sets the initial defaults.
- **If a league was created before this change** and has no `roster_format_type` / `scoring_format_type` in settings, existing behavior is unchanged; new leagues get these set from the sport default.

---

*End of deliverable.*
