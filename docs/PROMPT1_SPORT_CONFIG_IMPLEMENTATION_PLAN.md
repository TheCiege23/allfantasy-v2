# CURSOR PROMPT 1 OF 4 — Master Instructions + Sport Config Foundation

## Implementation Plan (No Code — Discovery & Architecture Only)

---

## 1. Current State (Inspection Summary)

### 1.1 Sports config
- **No `sports` table.** Sport is represented by:
  - Prisma enum `LeagueSport`: NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER (all 7 target sports already present).
  - `lib/sport-scope.ts`: `SUPPORTED_SPORTS`, `DEFAULT_SPORT`, `isSupportedSport()`, `normalizeToSupportedSport()`.
  - `lib/sport-defaults/types.ts`: `SportType` (same seven), `SPORT_TYPES`, `LeagueDefaults`, `RosterDefaults`, `SportMetadata`, etc.
  - `lib/multi-sport/SportRegistry.ts`: `getSportConfig(sportType)` → positions, displayName, emoji, defaultFormat; `getPositionsForSport(sportType, formatType)` (e.g. IDP for NFL).
  - `lib/sport-defaults/SportMetadataRegistry.ts`: `SportMetadata` per sport (display_name, icon, logo_strategy, default_season_type, player_pool_source, display_labels).
- **Conclusion:** Sport identity is enum + in-memory registries. No normalized DB row per sport; no `sport_id` FK from League (League uses `sport LeagueSport`).

### 1.2 Roster templates & slots
- **DB:** `RosterTemplate` (id, sportType, name, formatType) with unique (sportType, formatType). `RosterTemplateSlot` (templateId, slotName, allowedPositions Json, starterCount, benchCount, reserveCount, taxiCount, devyCount, isFlexibleSlot, slotOrder). `LeagueRosterConfig` (leagueId unique, templateId, overrides Json).
- **In-memory:** `SportDefaultsRegistry.getRosterDefaults(sportType, formatType)` returns `RosterDefaults` (starter_slots, bench_slots, IR_slots, flex_definitions). `RosterDefaultsRegistry.getRosterTemplateDefinition(sport, formatType)` builds slot definitions from that. `RosterTemplateService.getRosterTemplate(sportType, formatType, leagueId?)` prefers DB template; falls back to in-memory default (including IDP when leagueId provided and league is IDP).
- **League linkage:** League does not have a direct FK to `RosterTemplate`. Resolution path: League.sport + League.leagueVariant → formatType (e.g. IDP) → `getRosterTemplateForLeague(league.sport, formatType, leagueId)` → either `LeagueRosterConfig.templateId` (if row exists) or default template id (e.g. `default-NFL-IDP-{leagueId}` or `default-NFL-PPR`).
- **Conclusion:** Roster is template-based with optional league override; league references template indirectly via `LeagueRosterConfig.templateId`. No `roster_template_id` on League itself.

### 1.3 Scoring config
- **DB:** `ScoringTemplate` (id, sportType, name, formatType) unique (sportType, formatType). `ScoringRule` (templateId, statKey, pointsValue, multiplier, enabled). `LeagueScoringOverride` (leagueId, statKey, pointsValue, enabled) for per-league overrides.
- **In-memory:** `ScoringDefaultsRegistry.getDefaultScoringTemplate(sportType, formatType)` returns template with rules for all sports/formats (NFL PPR, Half PPR, IDP, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER).
- **League linkage:** League has `scoring String?` (display/import). No FK to `ScoringTemplate`. Resolution: League.sport + League.leagueVariant → formatType → `getScoringTemplateForSport(leagueSport, formatType)` / `getLeagueScoringRules(leagueId, sportType, formatType)` (template + LeagueScoringOverride).
- **Conclusion:** Scoring is template + overrides; league does not store `scoring_profile_id`; format is derived at runtime.

### 1.4 Schedule / calendar
- **No `schedule_templates` or `season_calendars` table.** Schedule behavior is in-memory:
  - `DefaultScheduleConfigResolver`: per-sport `DefaultScheduleConfig` (schedule_unit, regular_season_length, matchup_frequency, lock_time_behavior, injury_slot_behavior, playoff_transition_point, schedule_generation_strategy, etc.).
  - `ScheduleDefaultsRegistry.getSchedulePreset(sport, variant)` returns that config.
  - `LeagueScheduleBootstrapService`: merges schedule-related keys into `League.settings` (schedule_cadence, schedule_playoff_transition_point, etc.) when missing.
- **GameSchedule:** Table exists for scheduled games (sportType, season, weekOrRound, home/away, etc.) — used for schedule/stats pipeline, not as a “template” for league config.
- **Conclusion:** Schedule “template” is per-sport in-memory config; no DB schedule_template_id or season_calendar_id on League. Calendar (weeks/rounds, playoff start) is embedded in default config and League.settings.

### 1.5 League settings / sport settings
- **League:** `League.sport`, `League.leagueVariant`, `League.scoring`, `League.starters` (Json), `League.settings` (Json). No `league_sport_settings` or `sport_feature_flags` table.
- **Variant/config:** Specialty configs exist per variant: `IdpLeagueConfig`, `GuillotineLeagueConfig`, `DevyLeagueConfig`, etc. Feature support (e.g. IDP, superflex) is implied by variant or by roster/scoring content (e.g. SUPERFLEX in roster, IDP in leagueVariant).
- **Conclusion:** No centralized “league_sport_settings” or “sport_feature_flags” table; feature support is spread across variant resolvers, registries, and League.settings.

### 1.6 Lineup validators & sport adapters
- **Lineup:** `RosterValidationEngine.validateRoster(sportType, assignments, formatType)` and `canAddPlayerToSlot(...)` use `getRosterTemplateDefinition(sport, formatType)` and `PositionEligibilityResolver.isPositionEligibleForSlot(sport, slotName, position, formatType)`. Draft: `RosterFitValidation.validateRosterFitForDraftPick` uses `getRosterTemplateForLeague(league.sport, formatType, leagueId)`.
- **Sport adapters:** `SportConfigResolver`, `leagueSportToSportType`, `getFormatTypeForVariant` (LeagueVariantRegistry), `resolveSportVariantContext` (SportVariantContextResolver), multi-sport services (`MultiSportRosterService`, `MultiSportScoringResolver`, `MultiSportMatchupScoringService`), and sport-specific modules (e.g. IDP, devy) all resolve by sport + variant/format.
- **Conclusion:** Validation and adapters are already sport- and format-aware; they rely on in-memory defaults and optional DB templates, not on League FK columns.

---

## 2. Architecture Map (Current vs Target)

### 2.1 Current flow (simplified)
- League creation: `League.sport` + `League.leagueVariant` (and optional League.settings) → `runLeagueBootstrap` → `attachRosterConfigForLeague(leagueId, sport, format)`, `bootstrapLeagueScoring(leagueId, sport, format)`, `bootstrapLeagueScheduleConfig(leagueId)`.
- Format resolution: `getFormatTypeForVariant(sport, leagueVariant)` (e.g. IDP → "IDP", PPR → "PPR").
- Roster: `LeagueRosterConfig` by leagueId → templateId (or default); template from DB or built from `getRosterDefaults(sport, format)`.
- Scoring: No league→scoring FK; template resolved by (sport, format); overrides from `LeagueScoringOverride`.
- Schedule: No league→schedule FK; config from `resolveDefaultScheduleConfig(sport, variant)` merged into League.settings.
- Leagues do not reference: `scoring_profile_id`, `roster_template_id`, `schedule_template_id`, `season_calendar_id`.

### 2.2 Target (per prompt)
- Each league references: `sport_id`, `scoring_profile_id`, `roster_template_id`, `schedule_template_id`, `season_calendar_id`.
- Each sport supports: default + alternate scoring profiles, default + alternate roster templates, fantasy schedule format, real-world season metadata, and a set of **sport_feature_flags** (supports_best_ball, supports_superflex, supports_te_premium, supports_kickers, supports_team_defense, supports_idp, supports_daily_lineups, supports_weekly_lineups, supports_bracket_mode, supports_devy, supports_taxi, supports_ir).
- Backend-driven league configuration powering: league creation, league settings, scoring engines, lineup validation, schedule generation, calendar display, AI context, draft/waiver/trade/rankings.

### 2.3 Gap summary
| Concept | Current | Target |
|--------|---------|--------|
| Sport identity | Enum + in-memory | Optional `sports` table with `sport_id`; League can stay enum or add sport_id FK |
| Scoring profile | In-memory template by (sport, format); no League FK | `scoring_profiles` (or reuse ScoringTemplate) + League.scoring_profile_id |
| Roster template | LeagueRosterConfig.templateId; no League FK | Keep LeagueRosterConfig or add League.roster_template_id |
| Schedule template | In-memory per sport; League.settings | `schedule_templates` + League.schedule_template_id |
| Season calendar | In-memory (regular_season_length, playoff_transition_point) | `season_calendars` + League.season_calendar_id |
| Feature flags | Implicit (variant, roster, scoring) | `sport_feature_flags` (or sport-level config) |

---

## 3. Reusable Files / Modules to Extend

- **`lib/sport-scope.ts`** — Keep as single source of truth for supported sports; extend only if new sports added.
- **`lib/sport-defaults/types.ts`** — Add types for scoring_profile, schedule_template, season_calendar, sport_feature_flags if introducing new entities.
- **`lib/sport-defaults/SportDefaultsRegistry.ts`** — Continue to provide in-memory roster/scoring/draft/waiver defaults; optionally seed DB from here or map from new tables.
- **`lib/sport-defaults/DefaultScheduleConfigResolver.ts`** — Source for schedule defaults; can become reader of `schedule_templates` / `season_calendars` if those tables exist.
- **`lib/sport-defaults/LeagueVariantRegistry.ts`** — Keep format/variant resolution; align with any new scoring_profile / roster_template naming.
- **`lib/sport-defaults/SportMetadataRegistry.ts`** — Could hold or reference sport feature flags (supports_*).
- **`lib/multi-sport/SportRegistry.ts`** — Positions and default format; extend with feature flags or point to new config.
- **`lib/multi-sport/RosterTemplateService.ts`** — Already uses DB + in-memory; extend to resolve by roster_template_id when League has it.
- **`lib/multi-sport/ScoringTemplateResolver.ts`** — Already uses DB + in-memory; extend to resolve by scoring_profile_id when League has it.
- **`lib/multi-sport/MultiSportLeagueService.ts`** — `attachRosterConfigForLeague`; adapt to new League.roster_template_id / scoring_profile_id if added.
- **`lib/scoring-defaults/ScoringDefaultsRegistry.ts`** — Keep in-memory templates; optionally sync to ScoringTemplate / scoring_profiles.
- **`lib/scoring-defaults/LeagueScoringBootstrapService.ts`** — Bootstrap scoring for new leagues; use scoring_profile_id if present.
- **`lib/roster-defaults/RosterDefaultsRegistry.ts`** — Build from getRosterDefaults or from DB roster_templates; support lookup by roster_template_id.
- **`lib/roster-defaults/RosterValidationEngine.ts`** — No change to signature; keep using template definition (from registry or DB by template id).
- **`lib/schedule-defaults/ScheduleDefaultsRegistry.ts`** — Add resolution by schedule_template_id / season_calendar_id when League has them.
- **`lib/schedule-defaults/LeagueScheduleBootstrapService.ts`** — When merging into League.settings, consider schedule_template_id and season_calendar_id if added.
- **`lib/league-creation/LeagueBootstrapOrchestrator.ts`** — Wire new League FKs (scoring_profile_id, roster_template_id, schedule_template_id, season_calendar_id) when creating leagues; keep idempotent.
- **`lib/draft-defaults/*`**, **`lib/waiver-defaults/*`**, **`lib/playoff-defaults/*`** — Stay sport-aware; consume sport/format or new IDs as needed.
- **Lineup validators (RosterValidationEngine, RosterFitValidation, PositionEligibilityResolver)** — Continue to receive (sport, formatType) or template definition; no breaking change if template is resolved by id.

---

## 4. Likely New Files / Schema Additions

- **Schema (Prisma):**
  - Optional: **`Sport`** table (id, code, displayName, defaultScoringProfileId?, defaultRosterTemplateId?, defaultScheduleTemplateId?, defaultSeasonCalendarId?, featureFlags Json?) — if moving from enum-only to row per sport.
  - Optional: **`ScoringProfile`** — if distinct from ScoringTemplate (e.g. named profiles with optional link to ScoringTemplate); or reuse **ScoringTemplate** as “scoring profile” and add League.scoring_profile_id → ScoringTemplate.id.
  - **ScheduleTemplate** (if not in-memory only): id, sportType, name, schedule_unit, regular_season_length, matchup_frequency, lock_time_behavior, etc.
  - **SeasonCalendar** (if needed): id, sportType, season year or label, start_date, end_date, playoff_start_week, weeks[], or similar.
  - **League**: optional new columns — scoring_profile_id (FK), roster_template_id (FK), schedule_template_id (FK), season_calendar_id (FK). Alternatively keep current resolution and add these only where “selectable” profiles/templates are required.
  - **SportFeatureFlags** (or Json on Sport / in-memory): supports_best_ball, supports_superflex, supports_te_premium, supports_kickers, supports_team_defense, supports_idp, supports_daily_lineups, supports_weekly_lineups, supports_bracket_mode, supports_devy, supports_taxi, supports_ir — per sport.
- **Backend:**
  - **Sport config service** (if DB Sport table): CRUD or read-only resolver for sport + default profiles/templates and feature flags.
  - **Scoring profile resolver** (if new entity): Resolve by id; fallback to (sport, format) for backward compatibility.
  - **Schedule template resolver** (if DB): Resolve by id; fallback to DefaultScheduleConfigResolver.
  - **Season calendar resolver** (if DB): Resolve by id for calendar display and schedule generation.
  - **Feature flags resolver** (in-memory or DB): Given sport (and optionally league variant), return supports_* for UI and engine logic.
- **API / Frontend:**
  - Endpoints or extensions for: list scoring profiles by sport, list roster templates by sport, list schedule templates by sport, list season calendars by sport, and feature flags by sport (if not already embedded in league creation payload).
  - League creation/settings UI: when “backend-driven” is required, these endpoints feed dropdowns/templates instead of hardcoded frontend lists.

---

## 5. Migration Strategy

- **Phase 1 — Non-breaking:**
  - Add new tables (e.g. ScheduleTemplate, SeasonCalendar, Sport [if used], SportFeatureFlags or Json) and optional League FKs (scoring_profile_id, roster_template_id, schedule_template_id, season_calendar_id) as nullable. No change to existing resolution paths: continue to derive format from League.sport + League.leagueVariant and resolve templates from existing registries/DB by (sport, format).
- **Phase 2 — Backfill / seed:**
  - Seed ScheduleTemplate and SeasonCalendar (and Sport if applicable) from existing in-memory defaults (DefaultScheduleConfigResolver, SportDefaultsRegistry, etc.). Optionally set League.scoring_profile_id / roster_template_id / schedule_template_id / season_calendar_id for new leagues or via backfill where a clear mapping exists.
- **Phase 3 — Use new IDs:**
  - In league creation and settings, when a league is created or updated with an explicit scoring_profile_id / roster_template_id / schedule_template_id / season_calendar_id, resolution uses these IDs first and falls back to (sport, format) when null. All existing call sites that pass (sport, formatType) continue to work.
- **Phase 4 — Feature flags:**
  - Introduce sport_feature_flags (table or in-memory) and have league creation, lineup validation, and AI context respect them (e.g. hide unsupported options, or gate features). No removal of existing behavior; only additive gating or UI.
- **Rollback:** New columns and tables can remain unused; removal of new columns/tables is a separate migration if the design is reverted.

---

## 6. Risks / Edge Cases

- **Data consistency:** Leagues that have no FKs set (null) must behave identically to today (sport + variant → format → in-memory or existing template). Any new resolver must fall back to current behavior when id is null.
- **Template identity:** If ScoringTemplate and “scoring profile” are the same, avoid duplicate concepts. If they differ (e.g. profile = named preset, template = internal), define clear ownership (e.g. profile points to template).
- **IDP / variant-specific templates:** Today IDP uses formatType "IDP" and sometimes leagueId for roster. New roster_template_id must support “IDP” templates and, if needed, league-specific overrides (LeagueRosterConfig.overrides) without breaking IDP leagues.
- **Schedule vs calendar:** “Schedule template” (matchup cadence, lock behavior) vs “season calendar” (weeks/dates, playoff start) may be one table or two; clarify so schedule generation and calendar display both have a single source of truth.
- **Feature flags and variants:** Some flags (e.g. supports_idp) are sport-level; others (e.g. superflex) are roster-format. Define whether flags are sport-only or (sport, format) and how leagueVariant interacts.
- **Existing leagues:** No bulk update of League rows to set new FKs unless a deterministic mapping exists (e.g. sport + scoring string → one scoring_profile_id). Prefer “new leagues only” or “on next settings save” for setting FKs.
- **Mobile / performance:** New resolvers and optional joins (League → scoring_profile, roster_template, etc.) must not add N+1 or heavy queries; use batch or cached lookups where needed.

---

## 7. QA Plan

- **Regression:**
  - League creation for each sport (NFL, MLB, NHL, NBA, SOCCER, NCAAB, NCAAF) with no new FKs set: roster, scoring, schedule, and lineup validation behave as today.
  - Existing leagues: lineup validation, draft roster fit, waiver eligibility, trade engine, and matchup scoring unchanged when new columns are null.
- **New behavior (once FKs/resolvers exist):**
  - League created with explicit scoring_profile_id / roster_template_id / schedule_template_id / season_calendar_id: resolution uses these; league settings, scoring engine, lineup validation, and schedule generation reflect the selected templates/calendar.
  - League creation and settings UIs: can list and select scoring profiles, roster templates, schedule types, and calendars by sport; selection persists and is used by backend.
- **Feature flags:**
  - For each sport, feature flags (supports_* ) are correct; UI and engine do not offer or rely on unsupported features (e.g. no IDP options for MLB).
- **Backend-driven:**
  - League creation, league settings, scoring engine, lineup validation, schedule generation, calendar display, AI context, and draft/waiver/trade/rankings all consume the same backend-driven config (sport + profiles/templates/calendar + feature flags); no hardcoded sport-specific lists in frontend for these dimensions.
- **Multi-sport:**
  - At least one league per sport (NFL, MLB, NHL, NBA, SOCCER, NCAAB, NCAAF) created and validated end-to-end (roster, scoring, schedule, lineup, draft/waiver/trade compatibility).

---

## 8. Summary

- **Existing:** Sport is enum + in-memory registries. Roster and scoring use DB templates (RosterTemplate, ScoringTemplate) plus in-memory defaults; League links to roster via LeagueRosterConfig.templateId; League has no scoring_profile_id, schedule_template_id, or season_calendar_id. Schedule and “calendar” are in-memory per sport and merged into League.settings. No centralized sport_feature_flags.
- **Reuse:** All current sport-defaults, multi-sport, scoring-defaults, roster-defaults, and schedule-defaults modules and resolvers; extend them to accept optional template/calendar IDs and to expose feature flags.
- **Add (cautiously):** Optional Sport table and/or sport_feature_flags; optional League FKs (scoring_profile_id, roster_template_id, schedule_template_id, season_calendar_id); optional ScheduleTemplate and SeasonCalendar tables; resolvers that prefer IDs and fall back to (sport, format).
- **Do not:** Replace or duplicate working resolution logic; hardcode only in frontend; change League.sport enum or remove existing LeagueRosterConfig / LeagueScoringOverride flows without a clear migration path.

No implementation code in this chunk; implementation in subsequent prompts.
