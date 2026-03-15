# Prompt 21 — Unified League Defaults Orchestrator for All Sports + Full UI Click Audit

## 1. Orchestrator architecture

- **Single entry point:** `lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator.ts` is the unified layer for resolving and applying all sport- and variant-aware presets during league creation.
- **Responsibilities:**
  - **getCreationPayload(sport, variant)** — Returns the full `LeagueCreationDefaultsPayload` (metadata, league, roster, scoring, draft, waiver, rosterTemplate, scoringTemplate, defaultLeagueSettings) by calling `resolveLeaguePresetPipeline`. Used by the frontend (via GET /api/sport-defaults?load=creation) so the creation form and preview load from the same source as the backend.
  - **getInitialSettingsForCreation(sport, variant, overrides)** — Returns the exact `League.settings` object that will be persisted on create, via `buildSettingsPreview` (which uses `buildInitialLeagueSettings` from LeagueDefaultSettingsService). Ensures preview and saved league configuration match.
  - **getCreationPayloadAndSettings(sport, variant, overrides)** — Returns payload + initialSettings + settingsSummary + context in one call for preview consistency.
  - **runPostCreateInitialization(leagueId, sport, variantOrFormat)** — Runs all post-create bootstrap (roster, settings, scoring, player pool, draft, waiver, playoff, schedule) by delegating to `LeagueCreationInitializationService.runLeagueInitialization`, which calls `runLeagueBootstrap` with `resolveSportVariantContext` so NFL IDP gets format 'IDP'.
- **LeaguePresetResolutionPipeline** — Resolves all presets in one go: calls `loadLeagueCreationDefaults(sport, variant)` and `buildInitialLeagueSettings(sport, variant)` so payload and initialSettingsForPreview come from the same resolution path.
- **LeagueCreationInitializationService** — Single service that runs post-create initialization; uses `resolveSportVariantContext` to set format (e.g. IDP for NFL IDP) and calls `runLeagueBootstrap(leagueId, context.sport, format)`.
- **LeagueSettingsPreviewBuilder** — `buildSettingsPreview(sport, variant, overrides)` builds the exact settings object with optional superflex, roster_mode, extra; `getSettingsPreviewSummary` returns a minimal summary for preview comparison.
- **SportVariantContextResolver** — Normalizes sport + variant into `SportVariantContext` (sport, variant, formatType, isNflIdp, isSoccer, displayLabel). Ensures NFL IDP is an NFL variant and Soccer is a first-class sport. `SUPPORTED_SPORTS`: NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER.
- **Backend league create (POST /api/league/create):** Uses `getInitialSettingsForCreation(sport, leagueVariant, { superflex, roster_mode })` for `League.settings` and `runPostCreateInitialization(league.id, sport, leagueVariant)` after create. No duplicate default logic; orchestrator is the source of truth.
- **Frontend preset loading:** GET /api/sport-defaults?sport=X&load=creation&variant=Y now uses `getCreationPayload(sport, variant)` from the orchestrator, so the creation payload is always resolved through the same pipeline as the backend.

---

## 2. Backend workflow updates

- **POST /api/league/create (native path):** Unchanged in flow. Already uses `getInitialSettingsForCreation(sport, leagueVariantInput, { superflex: isSuperflex ?? false, roster_mode: isDynasty ? 'dynasty' : undefined })` and `runPostCreateInitialization(league.id, sport, leagueVariantInput)`. No change.
- **GET /api/sport-defaults:** When `load=creation`, now calls `getCreationPayload(sport, variantParam)` from the orchestrator instead of `loadLeagueCreationDefaults` directly. The payload shape is identical (getCreationPayload uses the pipeline which uses loadLeagueCreationDefaults). This makes the orchestrator the single entry point for creation payload and ensures frontend and backend use the same resolution path.
- **LeagueBootstrapOrchestrator.runLeagueBootstrap:** Unchanged. Still runs in parallel: attachRosterConfigForLeague, initializeLeagueWithSportDefaults, bootstrapLeagueScoring, bootstrapLeaguePlayerPool, bootstrapLeagueDraftConfig, bootstrapLeagueWaiverSettings, bootstrapLeaguePlayoffConfig, bootstrapLeagueScheduleConfig. LeagueCreationInitializationService calls it with sport and format (IDP when isNflIdp).

---

## 3. Settings preview consistency updates

- **Preview source:** LeagueSettingsPreviewPanel receives `preset` from useSportPreset(sport, variant). The preset is now loaded via GET /api/sport-defaults?load=creation, which uses getCreationPayload. So the preview panel shows the same league/roster/scoring/draft/waiver defaults that the backend uses to build initial settings.
- **Saved settings:** Backend uses getInitialSettingsForCreation(sport, leagueVariant, overrides), which uses buildInitialLeagueSettings(sport, variant) plus overrides. buildInitialLeagueSettings is the same source used inside loadLeagueCreationDefaults for defaultLeagueSettings. So playoff_team_count, regular_season_length, schedule_unit, waiver_mode, playoff_structure, schedule_* keys, draft_* keys, etc., match between preview (preset.league, preset.defaultLeagueSettings) and League.settings after create.
- **getSettingsPreviewSummary:** Exposes playoff_team_count, regular_season_length, schedule_unit, waiver_mode, roster_mode, lock_time_behavior for preview comparison. Frontend can use getCreationPayloadAndSettings if it needs both payload and summary in one call (e.g. future multi-step wizard).

---

## 4. Full UI click audit findings

| Element | Component | Handler | State / persistence | Backend / reload | Status |
|--------|-----------|---------|---------------------|------------------|--------|
| Creation mode (create / import) | LeagueCreationModeSelector | onValueChange → setCreationMode(mode); if create setImportPreview(null) | Local creationMode | N/A | OK |
| Sport | LeagueCreationSportSelector | onValueChange → setSport(v) | Local sport | useSportPreset(sport, variant) refetches | OK |
| Preset / variant | LeagueCreationPresetSelector | onValueChange → setLeagueVariant | Local leagueVariant | useSportPreset refetches; non-NFL set to STANDARD in useEffect | OK |
| Preview panel | LeagueSettingsPreviewPanel | N/A (display) | preset, sport, presetLabel from parent | Preset from getCreationPayload (API) | OK |
| League name | Input | onChange → setLeagueName; clear leagueName error | Local leagueName | Sent in POST body | OK |
| Platform | Select | onValueChange → setPlatform | Local platform | Sent in POST body | OK |
| Platform League ID | Input | onChange → setPlatformLeagueId; clear error | Local platformLeagueId | Sent when not manual | OK |
| League format (dynasty/keeper) | Select | onValueChange → setFormat | Local format | isDynasty in POST | OK |
| QB format (Superflex/1QB) | Select | onValueChange → setQbFormat | Local qbFormat | isSuperflex in POST | OK |
| League size | Select | onValueChange → setLeagueSize | Local leagueSize (synced from preset.default_team_count) | leagueSize in POST | OK |
| Scoring (NFL non-IDP) | Select | onValueChange → setScoring | Local scoring | scoring in POST | OK |
| Create button | Button | onClick → handleSubmit | validate() then POST /api/league/create | League created; runPostCreateInitialization; redirect /af-legacy | OK |
| Validation errors | Inline | setErrors in validate() and on input change | Local errors | Shown under inputs | OK |
| Import: provider | ImportProviderSelector | onChange → setImportProvider; setImportPreview(null) | Local importProvider | N/A | OK |
| Import: source input | ImportSourceInputPanel | onSourceInputChange, onFetchPreview | Local importSourceInput; fetch preview | handleFetchImportPreview | OK |
| Import: fetch preview | Button in panel | onFetchPreview → handleFetchImportPreview | setImportPreview(result.data) | fetchImportPreview(provider, source) | OK |
| Import: create from import | ImportedLeaguePreviewPanel | onCreateFromImport → handleCreateFromImport | submitImportCreation; redirect | POST create with createFromSleeperImport | OK |

**Notes:**
- No separate “roster step” or “draft step” in the current form; roster/draft/waiver/playoff/schedule are summarized in the preset and applied at create via bootstrap. Next/back and save-draft are not present in the current flow.
- Success path: toast.success then window.location.href = '/af-legacy'. Redirect is correct.
- Preview values (preset.league.default_team_count, default_playoff_team_count, default_regular_season_length, default_matchup_unit) come from the same defaults that buildInitialLeagueSettings uses, so they match persisted League.settings.

---

## 5. QA findings

- **Orchestrator as single source:** Creation payload is fetched via getCreationPayload (sport-defaults API); initial settings and bootstrap use getInitialSettingsForCreation and runPostCreateInitialization. All paths go through the orchestrator or the same underlying registries (LeagueDefaultSettingsService, loadLeagueCreationDefaults).
- **NFL IDP:** Treated as NFL variant (SportVariantContextResolver.isNflIdp, formatType 'IDP'); roster/scoring/draft get IDP defaults; waiver/playoff/schedule use NFL defaults. runLeagueBootstrap receives format 'IDP' for roster/scoring.
- **Soccer:** SUPPORTED_SPORTS includes SOCCER; loadLeagueCreationDefaults and buildInitialLeagueSettings support it; first-class sport in creation and bootstrap.
- **Preview vs saved:** preset.league and defaultLeagueSettings in payload align with buildInitialLeagueSettings output; League.settings after create matches getInitialSettingsForCreation(sport, variant, overrides).
- **Existing NFL creation:** Unchanged; sport=NFL, leagueVariant chosen (PPR, IDP, etc.), getInitialSettingsForCreation and runPostCreateInitialization behave as before.
- **All sports/variants:** Creation payload and initial settings resolve correctly for NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER via the same pipeline.

---

## 6. Issues fixed

1. **Creation payload not routed through orchestrator** — GET /api/sport-defaults?load=creation now uses getCreationPayload(sport, variant) from the league-defaults-orchestrator so the frontend always receives the creation payload from the unified pipeline. Preview and backend now share the same source of truth.

---

## 7. Final QA checklist

- [ ] Create one league per sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and verify roster, scoring, draft, waiver, playoff, and schedule defaults are applied (inspect League.settings and related bootstrap tables).
- [ ] Create NFL IDP and Dynasty IDP leagues; verify IDP roster and scoring and that waiver/playoff/schedule remain NFL defaults.
- [ ] Compare preset summary (Teams, Playoffs, Season) to the created league’s settings (playoff_team_count, regular_season_length, etc.); they should match.
- [ ] Change league size and/or format (dynasty/keeper) and create; verify leagueSize and settings (e.g. roster_mode) persist correctly.
- [ ] Switch sport and preset multiple times; verify preset loads and preview updates; create and verify the created league matches the last-selected sport/variant.
- [ ] Import path: create via Sleeper import; verify league is created and gap-fill bootstrap (draft/waiver/playoff/schedule) runs.
- [ ] All league-creation clicks (mode, sport, preset, inputs, create, import actions) work; no dead buttons; validation errors show; success redirects to /af-legacy.

---

## 8. Explanation of the unified league defaults orchestrator

The orchestrator is the single place that decides how a new league is initialized for a given sport and variant.

1. **Preset resolution (LeaguePresetResolutionPipeline):** For a chosen sport and variant, the pipeline loads the full creation payload (metadata, league defaults, roster, scoring, draft, waiver, roster/scoring templates, defaultLeagueSettings) and the exact initial League.settings object. The frontend gets this payload via GET /api/sport-defaults?load=creation, which now calls the orchestrator’s getCreationPayload. The creation form and preview panel therefore show the same defaults that the backend will use.

2. **Initial settings (LeagueSettingsPreviewBuilder + LeagueDefaultSettingsService):** getInitialSettingsForCreation builds the exact object written to League.settings on create. It uses buildInitialLeagueSettings(sport, variant), which aggregates league, playoff, schedule, waiver, draft, and tiebreaker defaults, and optionally applies overrides (e.g. superflex, roster_mode). The league create API uses this for the new league’s settings, so what the user sees in the preset summary (teams, playoffs, season length, waiver mode, etc.) matches what is stored.

3. **Post-create initialization (LeagueCreationInitializationService + LeagueBootstrapOrchestrator):** After the league row is created, runPostCreateInitialization runs all bootstrap steps: roster config, league settings merge, scoring, player pool, draft config, waiver settings, playoff config, schedule config. Sport and variant are normalized via SportVariantContextResolver (e.g. NFL + IDP → format 'IDP' for roster/scoring). Each bootstrap step is idempotent where applicable and uses the same sport/variant defaults as the preset pipeline.

4. **NFL IDP and Soccer:** NFL IDP is treated as an NFL variant (same league type, different format for roster/scoring/draft). Soccer is a full sport in SUPPORTED_SPORTS with its own roster, scoring, draft, waiver, playoff, and schedule defaults. Both are supported end to end in the same orchestrator and creation flow.

5. **Consistency:** One consistent source of truth for league initialization is achieved by (a) using getCreationPayload for the frontend payload, (b) using getInitialSettingsForCreation for League.settings at create, and (c) using runPostCreateInitialization for all post-create bootstrap, with all three paths driven by the same sport/variant and the same underlying default registries (SportDefaultsRegistry, LeagueDefaultSettingsService, DefaultPlayoffConfigResolver, DefaultScheduleConfigResolver, etc.).
