# End-to-End QA: Draft, Waiver, Playoff, Schedule, and Import Creation (Prompt 25)

## 1. QA findings

### Native league creation

- **Bootstrap flow**: `POST /api/league/create` (without import) calls `runPostCreateInitialization` → `runLeagueInitialization` → `runLeagueBootstrap`. That runs in parallel: roster attach, `initializeLeagueWithSportDefaults`, scoring bootstrap, player pool, **draft**, **waiver**, **playoff**, **schedule** bootstrap. All read `League.sport` and `League.leagueVariant` from DB, so sport and variant context are correct.
- **Sport coverage**: `SportDefaultsRegistry`, `LeagueDefaultSettingsService`, `DefaultPlayoffConfigResolver`, `DefaultScheduleConfigResolver` define defaults for **NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER**. NFL IDP uses the same waiver/schedule/playoff config as NFL; draft and roster use IDP-specific overlays.
- **Automated checks**: `tests/league-defaults-qa.test.ts` asserts that each sport has league, scoring, draft, waiver, default league settings, playoff config, and schedule config. `toSportType` maps NCAAF/NCAAB and unknown→NFL. NFL IDP has draft and waiver defaults.

### Import creation (Sleeper)

- **Flow**: Create-from-Sleeper path: fetch + normalize → create League (name, sport, season, size, scoring, isDynasty, settings with playoff_team_count, roster_positions, scoring_settings, etc.) → `bootstrapLeagueFromSleeperImport` (LeagueTeam, Roster, TeamPerformance) → **gap-fill**: `bootstrapLeagueDraftConfig`, `bootstrapLeagueWaiverSettings`, `bootstrapLeaguePlayoffConfig`, `bootstrapLeagueScheduleConfig` so AF defaults fill missing keys.
- **Imported settings override**: League.settings is built from normalized data (playoff_team_count, roster_positions, scoring_settings). Gap-fill only adds when missing: draft_rounds (and draft_*), LeagueWaiverSettings row, playoff_team_count/playoff_structure only when each is missing, schedule_* when none present.
- **Playoff bootstrap fix**: `LeaguePlayoffBootstrapService` was updated to set only **missing** keys: if `playoff_team_count` exists (e.g. from import), it is not overwritten; only `playoff_structure` is added when missing. So imported playoff team count is preserved.
- **Source metadata**: League stores `platform`, `platformLeagueId`, `importBatchId`, `importedAt`; LeagueTeam uses `externalId`; Roster uses `platformUserId` and playerData with `source_team_id`/`imported_at`.

### Regression

- Native NFL and NFL IDP creation unchanged: same create route branch, same `runPostCreateInitialization`. Non-import flow is untouched.
- Draft/waiver/playoff/schedule bootstraps are idempotent and key-aware: they do not overwrite existing values (draft: when draft_rounds present skip; waiver: when LeagueWaiverSettings exists skip; playoff: only set missing keys; schedule: when any schedule_* key exists skip). So no wrong-sport defaults are applied over existing data.

---

## 2. Full UI click audit findings (mandatory workflow audit)

**Full audit doc**: See **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`** for the mandatory workflow audit of every button, dropdown, toggle, tab, step transition, preview update, submit action, success redirect, and error path (component, route, handler, state, API, persistence/reload, fixes). Summary below.

League creation and import do not expose separate “draft settings”, “waiver settings”, “playoff settings”, or “schedule settings” steps; those are derived from sport/variant and applied at create time via bootstrap. The league detail page (`/leagues/[leagueId]`) exposes Draft, Waivers, and Standings/Playoffs tabs that consume the bootstrapped data. Audit below covers every clickable element in creation, import, and post-creation league UI.

### League creation (StartupDynastyForm — create path)

| Element | Component / route | Handler | State / API | Persistence / reload |
|--------|--------------------|---------|-------------|----------------------|
| Build New League / Import Existing League | LeagueCreationModeSelector | `onChange` → `setCreationMode`; if create, `setImportPreview(null)` | `creationMode` | Mode switch shows create form; no stale import preview. |
| Sport | LeagueCreationSportSelector | `onValueChange` → `setSport` | `sport` | Preset/useSportPreset updates; variant/leagueSize/scoring/leagueName sync from preset. |
| Preset (variant) | LeagueCreationPresetSelector | `onChange` → `setLeagueVariant` | `leagueVariant` | Variant options from `getVariantsForSport(sport)`; preset drives defaults. |
| League name | Input | `onChange` → `setLeagueName` (+ clear leagueName error) | `leagueName` | Sent in POST body; required (validate()). |
| Platform | Select | `onValueChange` → `setPlatform` | `platform` | Sent as platform; when not manual, platformLeagueId required. |
| Platform League ID | Input | `onChange` → `setPlatformLeagueId` (+ clear error) | `platformLeagueId` | Sent when platform !== 'manual'. |
| League format | Select (Dynasty/Keeper) | `onValueChange` → `setFormat` | `format` | Drives isDynasty in body. |
| QB format (NFL non-IDP) | Select (1QB/Superflex) | `onValueChange` → `setQbFormat` | `qbFormat` | Drives isSuperflex in body. |
| League size | Select | `onValueChange` → `setLeagueSize` | `leagueSize` | From preset; sent as leagueSize. |
| Scoring (NFL non-IDP) | Select | `onValueChange` → `setScoring` | `scoring` | Sent in body; preset can override. |
| Create Dynasty League | Button | `onClick` → `handleSubmit` | validate() then POST `/api/league/create` | League created; runPostCreateInitialization (draft/waiver/playoff/schedule bootstrap); redirect `/leagues/${data.league.id}` or `/af-legacy`. |

### League creation — import path

| Element | Component / route | Handler | State / API | Persistence / reload |
|--------|--------------------|---------|-------------|----------------------|
| Import from (provider) | ImportProviderSelector | `onValueChange` → `setImportProvider`; clears `importPreview` | `importProvider` | Sleeper available; ESPN/Yahoo/Fantrax/MFL disabled “(coming soon)”. |
| Sleeper League ID | ImportSourceInputPanel (Input) | `onChange` → `onSourceInputChange` | `importSourceInput` | Required for Fetch & Create. |
| Fetch & Preview | ImportSourceInputPanel (Button) | `onClick` → `handleFetchImportPreview` | `fetchImportPreview(provider, sourceInput)` → POST `/api/league/import/sleeper/preview` | Sets `importPreview`; toast on error. |
| Preview (display) | ImportedLeaguePreviewPanel | — | Renders `importPreview` (ImportPreviewResponse) | Same data shape as backend normalization; used for create payload. |
| Try different league ID | ImportedLeaguePreviewPanel (Button) | `onClick` → `onBack` → `setImportPreview(null)` | Local state only | Preview cleared; user can change ID and fetch again. |
| Create League from Import | ImportedLeaguePreviewPanel (Button) | `onClick` → `handleCreateFromImport` | `submitImportCreation` → POST `/api/league/create` with createFromSleeperImport, sleeperLeagueId | League + teams/rosters/performances + gap-fill draft/waiver/playoff/schedule; redirect `/leagues/${id}` or `/af-legacy`. |

### Success redirects

| Flow | Location | Behavior |
|------|----------|----------|
| Native create success | StartupDynastyForm | `data.league.id` → `window.location.href = '/leagues/${id}'`; else `/af-legacy`. |
| Import create success | StartupDynastyForm | `result.data?.league?.id` → same redirect. |

### League detail page — draft, waiver, playoff, schedule (`/leagues/[leagueId]`)

| Element | Component / route | Handler | State / API | Persistence / reload |
|--------|--------------------|---------|-------------|----------------------|
| Tab click (Overview, Team, Matchups, …) | Tab buttons | `onClick` → set `activeTab` | `activeTab` (e.g. Waivers, Draft, Standings/Playoffs) | Correct panel shown; no persistence (UI only). |
| Waivers tab | — | Selects Waivers panel | — | Panel shows “Refresh Waiver Signals” button. |
| Refresh Waiver Signals | Button in Waivers panel | `onClick` → `refreshWaiverPanel()` | `postMarketRefresh({ scope: 'waivers', ... })` | Sets `waiverRefresh`; loading state; data displayed. |
| Draft tab | — | Selects Draft panel | — | Panel shows round/pick inputs and “Refresh Draft View”. |
| Draft round / pick inputs | Inputs | `onChange` → `setDraftRound` / `setDraftPick` | `draftRound`, `draftPick` | Feed draft war room query. |
| Refresh Draft View | Button in Draft panel | `onClick` → `draftTab.refresh()` | Legacy draft war room API | Loading/insufficientData/error/data handled. |
| Standings/Playoffs tab | — | Selects Standings/Playoffs panel | — | Standings list + “Season & playoff forecast” card. |

### Verification summary

- **No dead buttons**: All listed buttons have handlers; Fetch disabled when `!sourceInput.trim()` or loading; Create from Import disabled when `createLoading` or `!importPreview`.
- **State and API**: Creation mode, provider, source input, and preview state drive the correct API calls; native create sends sport, leagueVariant, and overrides; import sends sleeperLeagueId and createFromSleeperImport.
- **Persistence**: Native create persists via `getInitialSettingsForCreation` and `runPostCreateInitialization`; import persists League + bootstrapFromSleeperImport + gap-fill; redirect uses returned `league.id`.
- **Preview vs persisted**: Preview is built from same normalized result used for import create; native create uses same orchestrator settings as preview pipeline.
- **Draft/waiver/playoff/schedule**: Not configurable in creation UI; applied from sport/variant at create. League page tabs (Draft, Waivers, Standings/Playoffs) load data from legacy/API and respond to clicks and refresh buttons; no broken navigation or stale views identified.

**Error paths (mandatory audit)**  
- Native create: validation failure → inline errors, no submit; 409 → toast; other API error → toast; network/exception → toast; loading always cleared in `finally` or before return.  
- Import: no provider / empty ID → toast or button disabled; fetch error → toast, loading false, preview null; create 409 / other error → toast, createLoading false. No dead buttons or stuck loading.

**Step transitions and preview vs saved**  
- Mode switch (create ↔ import) clears import preview when switching to create; provider change clears preview. Fetch success sets preview; "Try different league ID" clears preview. Preview data is same pipeline as import create; native create uses orchestrator for both preset and persisted settings. Success redirect to `/leagues/${id}` when `league.id` present; no partial saves or incorrect redirects.

---

## 3. Bugs found

1. **Playoff bootstrap overwrote imported playoff_team_count**  
   When running `bootstrapLeaguePlayoffConfig` after import, the service merged a full `playoffBlock` (playoff_team_count + playoff_structure from defaults), overwriting the imported `playoff_team_count`.  
   **Fix**: Merge only missing keys: set `playoff_team_count` only when undefined/null, and `playoff_structure` only when missing.

2. **Imported leagues missing AF draft/waiver/playoff/schedule defaults**  
   The Sleeper import path only ran `bootstrapLeagueFromSleeperImport` (teams, rosters, performances). It did not run draft, waiver, playoff, or schedule bootstrap, so imported leagues had no LeagueWaiverSettings, no draft_* keys, and no schedule_* keys; playoff_structure was also missing when only playoff_team_count was imported.  
   **Fix**: After `bootstrapLeagueFromSleeperImport`, run `bootstrapLeagueDraftConfig`, `bootstrapLeagueWaiverSettings`, `bootstrapLeaguePlayoffConfig`, and `bootstrapLeagueScheduleConfig` so AF defaults fill gaps without overwriting imported values (with playoff fix above).

---

## 4. Issues fixed

- **LeaguePlayoffBootstrapService**: Only sets `playoff_team_count` and `playoff_structure` when each is missing; existing values (e.g. from import) are preserved.
- **League create (Sleeper import)**: After Sleeper import bootstrap, run the four gap-fill bootstraps (draft, waiver, playoff, schedule) in a try/catch; failures are non-fatal so league creation still succeeds.

---

## 5. Regression risks

- **Native creation**: None intended. Only the import branch and the playoff bootstrap logic were changed.
- **Full runLeagueBootstrap on import**: We did **not** run the full bootstrap (roster attach, initializeLeagueWithSportDefaults, scoring, player pool) for import, to avoid overwriting imported roster/scoring/settings. Only the four “fill when missing” steps run. Risk: if a future change runs full bootstrap for import, it could overwrite imported data unless those steps are also merge-only.
- **Cross-sport**: Bootstraps read sport from `League.sport` after the league is created. Import sets `leagueSport` from normalized data (defaulting to NFL). So no cross-sport leakage if the normalized league sport is correct.
- **Player pool**: Native path runs `bootstrapLeaguePlayerPool(leagueId, leagueSport)`. Import path does not run it. So imported leagues may not have a player pool seeded until a separate sync or manual step. Documented as acceptable; can be added later if needed.

---

## 6. Final QA checklist

- [ ] **Native NFL** — Create league with sport NFL, variant PPR; verify draft, waiver, playoff, schedule in settings and LeagueWaiverSettings row.
- [ ] **Native NFL IDP** — Create with IDP variant; verify roster/scoring/draft/waiver reflect IDP.
- [ ] **Native NBA, MLB, NHL, NCAAF, NCAAB, SOCCER** — Create one league per sport; verify sport-specific draft/waiver/playoff/schedule defaults (no NFL keys applied).
- [ ] **Sleeper import** — Import a Sleeper league; verify League + LeagueTeam + Roster + TeamPerformance; verify League.settings has playoff_team_count from import; verify draft_rounds, LeagueWaiverSettings, playoff_structure, schedule_* present (gap-fill).
- [ ] **Imported playoff count preserved** — Import league with 6 playoff teams; verify settings.playoff_team_count is 6 after create (not overwritten by default).
- [ ] **Source metadata** — After import, League has platform, platformLeagueId, importBatchId, importedAt; LeagueTeam has externalId; Roster has platformUserId and playerData with source_team_id.
- [ ] **Preview vs persisted** — Preview shows league name, sport, managers, settings; created league matches (name, sport, size, teams/rosters).
- [ ] **No non-import regression** — Build New League flow unchanged; existing league creation tests or manual flows pass.
- [ ] **UI click paths** — Every league-creation and import-creation click (mode, sport, preset, provider, source input, Fetch & Preview, Create, Try different league ID, Create Dynasty League) triggers the intended behavior; success redirects to created league; league detail Draft/Waivers/Standings/Playoffs tabs and refresh buttons work with no dead controls or stale views.

---

## 7. Explanation of end-to-end validation for defaults and import creation

**End-to-end validation** here means checking that every supported sport and the import path get the correct draft, waiver, playoff, and schedule behavior, and that imported leagues are filled with AF defaults where source data is missing without overwriting what was imported.

1. **Native creation**  
   For “Build New League”, the backend creates the League then runs `runLeagueBootstrap`, which applies roster, settings, scoring, player pool, **draft**, **waiver**, **playoff**, and **schedule** defaults from the sport (and variant) stored on the league. Validation: create a league per sport (NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and confirm that draft config (e.g. draft_rounds), LeagueWaiverSettings, playoff_team_count/playoff_structure, and schedule_* keys are present and match that sport’s defaults. Automated tests in `tests/league-defaults-qa.test.ts` ensure every sport has draft, waiver, playoff, and schedule defaults defined so no sport is missing config or given another sport’s config.

2. **Import creation**  
   For “Import Existing League” (Sleeper), the backend creates the League from normalized data (including settings such as playoff_team_count, roster_positions, scoring_settings), then runs `bootstrapLeagueFromSleeperImport` (teams, rosters, matchup history). It then runs the same **draft, waiver, playoff, schedule** bootstrap services. They are written to **only add when missing**: draft when `draft_rounds` is absent, waiver when there is no LeagueWaiverSettings row, playoff when playoff_team_count or playoff_structure is missing (each key independently), schedule when no schedule_* key exists. So **imported settings override** where we have source data, and **AF defaults fill gaps** (e.g. draft rounds, waiver type, playoff structure, schedule behavior) without overwriting imported values like playoff_team_count.

3. **Regression and cross-sport**  
   We check that the non-import path is unchanged and that only the import branch and the playoff merge logic were modified. We also ensure bootstraps always use the league’s stored sport (and variant) from the DB, so there is no cross-sport leakage and no schedule/draft/waiver/playoff defaults applied from the wrong sport. The playoff fix (merge-only) ensures that when we run playoff bootstrap after import, we do not overwrite the imported playoff_team_count, which would have been a regression for import quality.

This gives a single, consistent story: native leagues get full sport-specific defaults; imported leagues get imported data first, then AF defaults only where data is missing, with no overwrite of what the user saw in the import preview.
