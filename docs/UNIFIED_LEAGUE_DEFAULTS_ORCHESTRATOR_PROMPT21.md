# Unified League Defaults Orchestrator (Prompt 21)

## 1. Orchestrator architecture

- **Single entry point:** **LeagueDefaultsOrchestrator** (`lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator.ts`) exposes:
  - **getCreationPayload(sport, variant)** — full creation payload (same as GET /api/sport-defaults?load=creation).
  - **getInitialSettingsForCreation(sport, variant, overrides?)** — exact League.settings object that will be persisted (so preview matches saved values).
  - **getCreationPayloadAndSettings(sport, variant, overrides?)** — payload + initial settings + summary + context in one call.
  - **runPostCreateInitialization(leagueId, sport, variantOrFormat)** — runs all bootstrap steps (roster, settings, scoring, waiver, draft, playoff, schedule, player pool).

- **Supporting modules:**
  - **SportVariantContextResolver** — normalizes sport + variant into `{ sport, variant, formatType, isNflIdp, isSoccer, displayLabel }`. NFL IDP is treated as an NFL variant; Soccer as first-class sport.
  - **LeaguePresetResolutionPipeline** — `resolveLeaguePresetPipeline(sport, variant)` returns the full creation payload and the exact `initialSettingsForPreview` (from buildInitialLeagueSettings) so one consistent source of truth.
  - **LeagueSettingsPreviewBuilder** — `buildSettingsPreview(sport, variant, overrides?)` builds the exact settings object that will be written to League.settings; `getSettingsPreviewSummary(...)` returns a minimal summary for comparison.
  - **LeagueCreationInitializationService** — `runLeagueInitialization(leagueId, sport, variantOrFormat)` delegates to existing **runLeagueBootstrap** so all post-create steps (roster, scoring, waiver, draft, playoff, schedule, player pool) run in one place.

- **Data flow:** League create API calls **getInitialSettingsForCreation(sport, leagueVariant, { superflex, roster_mode })** and persists the result to League.settings; then calls **runPostCreateInitialization(leagueId, sport, leagueVariant)**. Frontend preset comes from **loadLeagueCreationDefaults** (sport-defaults API); preview consistency is ensured because **getInitialSettingsForCreation** uses the same **buildInitialLeagueSettings(sport, variant)** that the pipeline uses for **initialSettingsForPreview**.

## 2. Backend workflow updates

- **app/api/league/create/route.ts:** Uses **getInitialSettingsForCreation** from LeagueDefaultsOrchestrator instead of calling buildInitialLeagueSettings directly; uses **runPostCreateInitialization** instead of runLeagueBootstrap. Overrides (superflex, roster_mode) are passed so the persisted settings match the orchestrator’s preview.
- **app/api/league/preview-settings/route.ts:** New GET endpoint. Query params: sport, variant, superflex, dynasty. Returns **initialSettings** (exact object that would be saved) and **summary** (playoff_team_count, regular_season_length, schedule_unit, waiver_mode, roster_mode, lock_time_behavior). Frontend can call this to compare with the preset summary.
- **lib/league-creation/LeagueBootstrapOrchestrator:** Unchanged; still runs attachRosterConfigForLeague, initializeLeagueWithSportDefaults, bootstrapLeagueScoring, bootstrapLeaguePlayerPool, bootstrapLeagueDraftConfig, bootstrapLeagueWaiverSettings, bootstrapLeaguePlayoffConfig, bootstrapLeagueScheduleConfig. **LeagueCreationInitializationService** (and thus **runPostCreateInitialization**) calls **runLeagueBootstrap**, so all initialization remains in one place.

## 3. Settings preview consistency updates

- **LeagueSettingsPreviewBuilder.buildSettingsPreview** returns the same shape as League.settings, built from **buildInitialLeagueSettings(sport, variant)** plus overrides (superflex, roster_mode, extra). The league create route uses **getInitialSettingsForCreation** with the same overrides, so values persisted at creation match what the preview builder would return for the same sport, variant, and options.
- **LeaguePresetResolutionPipeline** returns both **payload** (for form and preset summary) and **initialSettingsForPreview** (from buildInitialLeagueSettings). So any consumer that uses the pipeline sees the exact settings that will be saved when no overrides are applied.
- **GET /api/league/preview-settings?sport=X&variant=Y&superflex=true&dynasty=false** allows the frontend to fetch the exact initialSettings and summary for the current form state; the preset summary (from GET /api/sport-defaults?load=creation) and the preview-settings response can be compared to ensure consistency.
- **LeagueSettingsPreviewPanel** continues to use the preset from useSportPreset (sport-defaults?load=creation). The preset’s **defaultLeagueSettings** (playoff_team_count, regular_season_length, etc.) come from **getDefaultLeagueSettings(sport)**, which is the same source used by **buildInitialLeagueSettings**. So preview panel values and saved league configuration already align; the orchestrator and preview-settings API make the contract explicit and testable.

## 4. QA findings

- One consistent source: getCreationPayload and getInitialSettingsForCreation both derive from the same sport/defaults stack (loadLeagueCreationDefaults and buildInitialLeagueSettings).
- Frontend preview vs persisted: getInitialSettingsForCreation is used when creating the league; buildSettingsPreview(sport, variant, overrides) produces the same object for the same inputs, so preview matches saved values.
- NFL IDP: SportVariantContextResolver marks isNflIdp true for variant IDP/DYNASTY_IDP; formatType 'IDP' is passed to runLeagueBootstrap; roster/scoring/draft/waiver/playoff/schedule defaults use the same variant so NFL IDP is an NFL variant, not a separate league type.
- Soccer: Treated as first-class sport (SUPPORTED_SPORTS, displayLabel 'Soccer'); all default domains (roster, scoring, draft, waiver, playoff, schedule) have SOCCER entries in their registries.
- Each created league boots with correct settings: runPostCreateInitialization runs the full bootstrap (roster, settings, scoring, player pool, draft, waiver, playoff, schedule); existing leagues are untouched because bootstrap only runs after create and only for the new league id.

## 5. Issues fixed

- League create route previously called buildInitialLeagueSettings and runLeagueBootstrap directly; it now uses the orchestrator’s getInitialSettingsForCreation and runPostCreateInitialization so there is a single documented entry point and overrides (superflex, dynasty) are applied in one place.
- No single place for “creation payload + settings that will be saved”; LeaguePresetResolutionPipeline and getCreationPayloadAndSettings now provide both so preview consistency can be enforced and tested.
- Sport/variant context was implied in multiple places; SportVariantContextResolver centralizes isNflIdp, isSoccer, formatType, and displayLabel.
- No API to return “exact settings that will be saved”; GET /api/league/preview-settings added for frontend comparison and QA.

## 6. Final QA checklist

- [ ] Create one league for every supported sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and verify all default domains (roster, scoring, draft, waiver, playoff, schedule, metadata) were applied correctly (League.settings, LeagueWaiverSettings, roster template, scoring template, player pool context).
- [ ] Create NFL and NFL IDP leagues; verify NFL IDP uses NFL variant (IDP roster/scoring) and same schedule/playoff/waiver/draft defaults as NFL where applicable; verify defensive players in pool for IDP.
- [ ] Compare preview panel (preset summary) vs saved league: after creation, fetch league and compare playoff_team_count, regular_season_length, schedule_unit, waiver_mode, roster_mode, lock_time_behavior with GET /api/league/preview-settings for the same sport/variant/options; they should match.
- [ ] Verify downstream systems read initialized settings: draft room uses draft config (rounds, timer); waiver uses LeagueWaiverSettings; standings/playoff use playoff_structure and standings_tiebreakers; schedule uses regular_season_length and schedule_* keys.
- [ ] Verify current NFL standard and non-IDP workflows: create NFL league without variant; verify roster (no IDP slots), scoring, draft (15 rounds), waiver (FAAB, Wed), playoff (6 teams, 4 weeks), schedule (18 weeks); no regressions.

## 7. Explanation of the unified league defaults orchestrator

The orchestrator is the single layer that resolves and applies all sport-aware and variant-aware presets during league creation. It does not replace the existing sport defaults registry, roster/scoring/draft/waiver/playoff/schedule resolvers, or bootstrap steps; it wraps them so that:

1. **One consistent source of truth:** getCreationPayload and getInitialSettingsForCreation both use the same underlying resolvers (loadLeagueCreationDefaults, buildInitialLeagueSettings). So the payload shown in the creation form and the settings written to the new league come from the same defaults.

2. **Preview matches persisted values:** getInitialSettingsForCreation(sport, variant, overrides) returns the exact object that the create API writes to League.settings. The frontend can call GET /api/league/preview-settings with the same sport, variant, and options to get that object (and a summary) and confirm the preset summary aligns with what will be saved.

3. **NFL IDP as NFL variant:** SportVariantContextResolver sets formatType to 'IDP' and isNflIdp to true when sport is NFL and variant is IDP or DYNASTY_IDP. Roster, scoring, draft, waiver, playoff, and schedule defaults all accept variant (or formatType) and apply IDP-specific values (e.g. IDP roster slots, 18 draft rounds) while remaining “NFL” for display and league type.

4. **Soccer as first-class sport:** Soccer is in SUPPORTED_SPORTS and has full defaults in every registry (roster, scoring, draft, waiver, playoff, schedule); the orchestrator does not special-case it beyond using the same pipeline as for other sports.

5. **Post-create initialization:** runPostCreateInitialization (and thus runLeagueInitialization) runs the existing runLeagueBootstrap, which applies roster config, league settings merge, scoring bootstrap, player pool bootstrap, draft config bootstrap, waiver settings bootstrap, playoff config bootstrap, and schedule config bootstrap. So each created league boots with the correct settings everywhere; commissioners can override after creation.

Existing league creation backend, sport defaults registry, roster/scoring/draft/waiver/playoff/schedule defaults, current NFL creation behavior, and preset/settings preview flows are preserved; the orchestrator unifies entry points and ensures consistency without replacing or duplicating the underlying logic.
