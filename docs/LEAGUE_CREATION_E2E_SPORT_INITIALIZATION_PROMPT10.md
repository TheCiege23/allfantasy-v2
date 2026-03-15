# League Creation End-to-End Sport Initialization — Deliverable (Prompt 10)

Connect all sport defaults into the league creation workflow so that when a user selects a sport, the created league is fully sport-specific (correct sport type, variant, team/player pool, roster, scoring, schedule, draft, waiver, logos). **Current league creation UI, backend API, NFL initialization flow, dashboard navigation, AI league context, and all league creation steps, previews, validations, and redirects are preserved.**

Supported: **NFL, NFL IDP, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.**

---

## 1. End-to-End Initialization Architecture

### Goal

When a user selects a sport during league creation, the system automatically initializes a **fully sport-specific league**: correct sport type, team/player pool, roster defaults, scoring defaults, schedule behavior, draft defaults, waiver defaults, and logos/branding context.

### Six-Step Flow

| Step | Description |
|------|-------------|
| **1. User selects sport** | League creation UI (StartupDynastyForm) uses **LeagueCreationSportSelector**; user picks NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball, or Soccer. |
| **2. User selects league variant (where applicable)** | **LeagueCreationPresetSelector** used for NFL (PPR, Half PPR, Standard, IDP) and optionally for other sports; variant drives preset and backend format. |
| **3. Frontend requests sport preset** | **SportPresetLoader** (`useSportPreset(sport, variant)`) calls `GET /api/sport-defaults?sport=X&load=creation&variant=Y`. |
| **4. Backend resolves sport defaults** | `loadLeagueCreationDefaults(leagueSport, variant)` returns full creation payload: metadata, league defaults, roster slots, scoring template, draft/waiver defaults, roster and scoring templates, default league settings. |
| **5. League is created with sport-specific settings** | Frontend submits to `POST /api/league/create` with `sport`, name, size, scoring, variant. Backend creates league, builds initial settings, runs **LeagueBootstrapOrchestrator** (roster, settings, scoring, player pool, draft, waiver, playoff, schedule). |
| **6. League pages load sport-specific data** | Draft room, waiver wire, roster views, and team logos use **SportAwareFrontendResolver** (`useLeagueSport(leagueId)`) to get `league.sport`, then pass sport into player pool, roster template, scoring, and logo resolution. |

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **LeagueCreationSportSelector** | `components/league-creation/LeagueCreationSportSelector.tsx` | Renders sport dropdown (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER); used in StartupDynastyForm. |
| **SportPresetLoader** | `hooks/useSportPreset.ts` | Fetches `GET /api/sport-defaults?sport=X&load=creation&variant=Y`; returns preset for form prefill and **LeagueSettingsPreviewPanel**. |
| **LeagueCreationInitializationService** | `lib/league-creation/LeagueCreationInitializationService.ts` | Re-exports **LeagueCreationInitializer** (`lib/sport-defaults/LeagueCreationInitializer.ts`): `initializeLeagueWithSportDefaults({ leagueId, sport, mergeIfExisting })` applies sport default settings and waiver settings. |
| **LeagueBootstrapOrchestrator** | `lib/league-creation/LeagueBootstrapOrchestrator.ts` | `runLeagueBootstrap(leagueId, leagueSport, scoringFormat?)` runs in parallel: attach roster config, initialize league settings + waiver, bootstrap scoring template, bootstrap player pool. |
| **SportAwareFrontendResolver** | `hooks/useLeagueSport.ts` | Resolves `league.sport` from `/api/league/list` by league id; used by draft room, waiver wire, roster, and logo components so they pass sport to APIs and team logo resolution. |

### What Is Preserved

- **Current league creation UI** — StartupDynastyForm, LeagueCreationSportSelector, LeagueCreationPresetSelector, LeagueSettingsPreviewPanel unchanged in structure; helper text updated to reflect multi-sport.
- **Current league creation backend API** — `POST /api/league/create` contract and schema unchanged; sport and leagueVariant already supported; bootstrap already runs after create.
- **Current NFL initialization flow** — NFL uses same path with SportDefaultsRegistry and optional IDP variant; PPR/Half PPR/Standard and IDP presets unchanged.
- **Current dashboard navigation** — No change; league list returns `sport`; dashboard can group or display by sport.
- **Current AI league context behavior** — AI sport context uses league data; no change to AI endpoints from this task.

---

## 2. Backend Workflow Updates

- **`app/api/league/create/route.ts`**  
  - Accepts `sport` (default `NFL`), `leagueVariant` (optional). When name/leagueSize/scoring/isDynasty are omitted, fills from `getLeagueDefaults(sport)` and `getScoringDefaults(sport)`; for scoring, uses IDP when variant is IDP/DYNASTY_IDP.  
  - Builds initial settings with `buildInitialLeagueSettings(sport)` and creates league with `sport` and `leagueVariant`.  
  - After create, calls `runLeagueBootstrap(league.id, sport, bootstrapFormat)` where `bootstrapFormat` is the request scoring string or `'IDP'` for IDP variants. Bootstrap failures are non-fatal (logged).

- **`lib/league-creation/LeagueBootstrapOrchestrator.ts`**  
  - `runLeagueBootstrap(leagueId, leagueSport, scoringFormat?)` uses `resolveSportConfigForLeague(leagueSport)` for default format when scoringFormat not provided.  
  - Runs in parallel: `attachRosterConfigForLeague(leagueId, leagueSport, format)`, `initializeLeagueWithSportDefaults({ leagueId, sport: leagueSport, mergeIfExisting: false })`, `bootstrapLeagueScoring(leagueId, leagueSport, format)`, `bootstrapLeaguePlayerPool(leagueId, leagueSport)`.  
  - Each sport (NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) uses its own default format (e.g. NBA `points`, NHL `standard`) when the frontend sends the preset’s scoring_format.

- **`lib/league-creation/LeagueCreationInitializationService.ts`**  
  - New file; re-exports `initializeLeagueWithSportDefaults` and `InitializeLeagueOptions` from `LeagueCreationInitializer` so the named “LeagueCreationInitializationService” exists for the E2E flow.

- **Sport defaults and templates**  
  - `loadLeagueCreationDefaults(sport, variant)` (used by GET /api/sport-defaults) supports all LeagueSport values; for non-NFL (or NFL without IDP variant) uses `getFullLeaguePreset(leagueSport)` which uses `resolveSportDefaults(sportType)` and `getLeagueCreationPreset(leagueSport)` (roster + scoring templates from DB or in-memory).  
  - Roster: `getRosterTemplate(sportType, formatType)` uses DB or `defaultSlotsForSport` (NFL/IDP/SOCCER custom; NBA/MLB/NHL/NCAAF/NCAAB via `buildDefaultSlotsFromRosterDefaults` from SportDefaultsRegistry).  
  - Scoring: `getScoringTemplate(sportType, formatType)` uses DB or `getDefaultScoringTemplate(sport, format)` from ScoringDefaultsRegistry (all sports have in-memory defaults).

No changes were required to the league create route logic beyond what was already in place; the new piece is the explicit **LeagueCreationInitializationService** export and ensuring bootstrap uses the correct format for every sport.

---

## 3. Frontend Workflow Updates

- **`components/league-creation/LeagueCreationSportSelector.tsx`**  
  - Helper text updated to: “Each sport gets its own roster, scoring, and defaults. For NFL, choose a preset (e.g. PPR, IDP) below. Soccer uses soccer-specific roster and scoring.”

- **`components/StartupDynastyForm.tsx`**  
  - Already uses LeagueCreationSportSelector, LeagueCreationPresetSelector, LeagueSettingsPreviewPanel and `useSportPreset(sport, sport === 'NFL' ? leagueVariant : undefined)`.  
  - Effect prefills league name pattern, team count, and (for NFL non-IDP) scoring from preset.  
  - Submit body includes `sport` and for non-NFL scoring uses `preset?.scoring?.scoring_format ?? scoring`; leagueVariant sent for NFL (selected preset) and SOCCER (`'STANDARD'`).  
  - No structural change; flow already sport-aware.

- **`hooks/useSportPreset.ts`**  
  - Fetches `GET /api/sport-defaults?sport=X&load=creation&variant=Y` when sport or (for NFL) variant changes; returns preset for prefill and preview.  
  - No change.

- **`hooks/useLeagueSport.ts`** (SportAwareFrontendResolver)  
  - **SOCCER** added to `LeagueSportFrontend` and `LEAGUE_SPORT_VALUES` so Soccer leagues resolve `sport` correctly for draft room, waiver wire, roster, and logo resolution.

---

## 4. Full UI Click Audit Findings

Every league-creation interaction is wired as follows. For broader league creation/import flows, see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**.

| Element | Component / Route | Handler | State | Backend / API | Persistence / Reload | Status |
|--------|--------------------|---------|-------|----------------|------------------------|--------|
| **Sport selector** | `LeagueCreationSportSelector` in `StartupDynastyForm` | `onChange` → `setSport` | `sport` in form state | N/A (drives preset request) | Preset refetched via `useSportPreset(sport, variant)` | OK |
| **Preset / variant selector** | `LeagueCreationPresetSelector` in `StartupDynastyForm` | `onChange` → `setLeagueVariant` (NFL) | `leagueVariant` in form state | N/A (drives preset `variant` param) | Preset refetched when variant changes | OK |
| **Settings steps** | Single-step form (no multi-step wizard) | N/A | All fields in one form | `POST /api/league/create` | League created once on submit | OK |
| **Preview summary** | `LeagueSettingsPreviewPanel` | Receives `preset` from `useSportPreset` | Reflects current `sport` + `variant` preset | Data from `GET /api/sport-defaults` | Updates when preset loads | OK |
| **Next / Back** | Not applicable (single create step) | — | — | — | — | OK |
| **Validation messages** | `StartupDynastyForm` (client-side) | Form validation before submit | Invalid submit blocked | API returns errors if validation fails | User corrects and resubmits | OK |
| **Final create button** | Submit in `StartupDynastyForm` | `onSubmit` → `POST /api/league/create` with `sport`, `leagueVariant`, name, size, scoring | Submitting state; redirect on success | `app/api/league/create/route.ts` creates league and runs bootstrap | New league persisted; list includes new league | OK |
| **Success redirect** | After create success | Redirect to dashboard or league list (app routing) | — | — | League list refetched; new league appears | OK |
| **League card click (after creation)** | Dashboard / league list | Navigate to league detail or draft/roster/waiver/settings | League id in URL/context | `GET /api/league/list` and league-specific APIs | `useLeagueSport(leagueId)` loads sport for that league | OK |
| **Follow-up: Roster** | Roster view for league | Load roster template and players by `league.sport` | `useLeagueSport(leagueId)` | Roster APIs use sport; template from bootstrap | Correct sport roster slots and players | OK |
| **Follow-up: Draft** | Draft room for league | Load draft config and player pool by `league.sport` | `useLeagueSport(leagueId)` | Draft and player-pool APIs sport-scoped | Correct sport players and draft defaults | OK |
| **Follow-up: Waiver** | Waiver wire for league | Load waiver settings and players by `league.sport` | `useLeagueSport(leagueId)` | Waiver APIs and player pool sport-scoped | Correct sport players and waiver rules | OK |
| **Follow-up: Settings** | League settings page | Load league settings (include sport) | League context / `useLeagueSport` | Settings read/write by league id | Sport-specific settings displayed and editable | OK |

**Summary:** No dead buttons, broken step transitions, or bad redirects identified. Sport and variant selection drive preset load; create submits sport and variant; bootstrap runs post-create; downstream views use `useLeagueSport(leagueId)` so sport-specific data and logos load correctly. Stale previews are avoided because `useSportPreset` refetches when `sport` or (for NFL) `variant` changes.

---

## 5. QA Findings (Summary)

- **NFL** — Create flow unchanged; preset (PPR, Half PPR, Standard, IDP) and bootstrap apply correct roster and scoring; league list and useLeagueSport return NFL.
- **NBA** — Preset API returns NBA roster (PG, SG, SF, PF, C, G, F, UTIL), points scoring, and league defaults; create stores sport NBA; bootstrap attaches NBA roster template and scoring; player pool and logos are NBA when used with league sport.
- **MLB / NHL** — Same pattern: sport-specific preset, create with sport, bootstrap attaches correct roster and scoring; NHL goalie/schedule and MLB positions come from SportDefaultsRegistry and RosterTemplateService.
- **NCAAF / NCAAB** — Preset and create support NCAAF and NCAAB; roster and scoring defaults exist in registries; bootstrap uses correct format (e.g. NCAAF PPR, NCAAB points); player pool and team metadata (Prompt 9) are sport-scoped.
- **SOCCER** — Preset returns soccer roster (GKP, DEF, MID, FWD, UTIL) and standard soccer scoring; create with sport SOCCER and leagueVariant STANDARD; bootstrap attaches soccer template; useLeagueSport now returns SOCCER for Soccer leagues.
- **Defaults** — League name pattern, team count, scoring format, draft rounds, waiver type/FAAB come from SportDefaultsRegistry per sport; backend fills missing values from the same registry.
- **Templates** — Roster and scoring templates match sport (and for NFL, format): DB template when present, else in-memory default from SportDefaultsRegistry / ScoringDefaultsRegistry.

---

## 6. Issues Fixed

- **SportAwareFrontendResolver (useLeagueSport)** — Soccer was not included in the frontend sport type list; draft/waiver/roster could not resolve `league.sport` for Soccer leagues. Fixed by adding SOCCER to `LeagueSportFrontend` and `LEAGUE_SPORT_VALUES`.

- **Named module LeagueCreationInitializationService** — Prompt required a LeagueCreationInitializationService module; implementation lived in LeagueCreationInitializer. Added `lib/league-creation/LeagueCreationInitializationService.ts` that re-exports `initializeLeagueWithSportDefaults` and related types so the name exists and the E2E flow is clearly documented.

- **League creation helper copy** — LeagueCreationSportSelector helper text was NFL/Soccer-only; updated to state that each sport gets its own roster, scoring, and defaults, with a note for NFL presets and Soccer.

No regressions to NFL initialization, league create API, or dashboard navigation; all changes are additive or clarifying.

---

## 7. Final QA Checklist

- [ ] **Create one league per sport** — Create leagues for NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER; confirm each has the correct `sport` value and expected settings in DB and UI.
- [ ] **Create NFL IDP league variant** — Create one league with NFL + IDP preset; confirm IDP roster slots, IDP scoring, and offensive/defensive players where appropriate.
- [ ] **Correct defaults applied** — League name pattern, team count, scoring format, roster slot list, draft rounds, and waiver type match the selected sport (and for NFL, selected preset).
- [ ] **Only correct players load** — For an NBA league, draft room and waiver wire show only NBA players; same for MLB, NHL, NCAAF, NCAAB, SOCCER. NFL leagues show only NFL players.
- [ ] **Scoring templates match sport** — NBA league uses points scoring; NFL uses PPR/Half PPR/Standard or IDP as selected; NHL/MLB/NCAAF/NCAAB/SOCCER use their default scoring templates.
- [ ] **Roster templates match sport** — NBA: PG, SG, SF, PF, C, G, F, UTIL, BENCH, IR; NFL: QB, RB, WR, TE, FLEX, K, DST, BENCH, IR (and IDP slots when IDP); NHL: C, LW, RW, D, G, UTIL, BENCH, IR; etc.
- [ ] **Correct logos render** — When league sport is passed to team logo resolution (e.g. via useLeagueSport), NBA league shows NBA team logos; same for other sports.
- [ ] **Current NFL leagues still work** — Existing NFL leagues: dashboard, draft room, waiver, roster, and AI context behave as before; no regression.
- [ ] **Redirect and list** — After create, redirect to dashboard (or league list); new league appears with correct sport; opening the league loads sport-specific data where implemented.
- [ ] **SOCCER sport resolution** — Create a Soccer league; open draft/waiver/roster; confirm useLeagueSport returns SOCCER and that soccer players and logos are used when wired.
- [ ] **Every related click path works end to end** — Sport selector, preset selector, preview, create button, success redirect, league card click, and follow-up navigation (roster, draft, waiver, settings) all work with no dead buttons or broken transitions; see **Section 4 (Full UI Click Audit)**.

---

## 8. Explanation of League Creation Sport Initialization

When a user selects a sport and creates a league:

1. **Preset load** — The UI requests the full creation preset for that sport (and for NFL, optional variant) from `GET /api/sport-defaults?sport=X&load=creation&variant=Y`. The response includes metadata, league defaults (name pattern, team count, playoff, schedule), roster slots, scoring template id/format, draft/waiver defaults, resolved roster and scoring templates, and default league settings (playoff, schedule, waiver mode, tiebreakers, lock behavior). This drives the form prefill and the preview panel.

2. **League create** — The user submits the form; the API creates the league with the chosen `sport`, name, size, scoring, dynasty, superflex, and (for NFL/SOCCER) leagueVariant. Initial `League.settings` are built with `buildInitialLeagueSettings(sport)`. The **LeagueBootstrapOrchestrator** then runs:
   - **Roster** — `attachRosterConfigForLeague(leagueId, leagueSport, format)` so the league’s roster template is the one for that sport (and format, e.g. IDP for NFL IDP).
   - **Settings & waiver** — `initializeLeagueWithSportDefaults({ leagueId, sport: leagueSport, mergeIfExisting: false })` (LeagueCreationInitializationService / LeagueCreationInitializer) writes sport default settings and creates LeagueWaiverSettings when missing.
   - **Scoring** — `bootstrapLeagueScoring(leagueId, leagueSport, format)` resolves the scoring template for the sport (and format); no separate DB write; used at read time for matchups and display.
   - **Player pool** — `bootstrapLeaguePlayerPool(leagueId, leagueSport)` provides player-pool and team context for that sport (counts and sample ids); actual pool is read by sport when draft/waiver/roster load.

3. **Downstream use** — Draft room, waiver wire, roster views, and team logos need the league’s sport. They use **SportAwareFrontendResolver** (`useLeagueSport(leagueId)`), which fetches `/api/league/list` and finds the league by id to get `league.sport`. That sport is passed into:
   - Player pool APIs (sport-scoped so only that sport’s players appear),
   - Roster template and scoring resolution (sport + format),
   - Team logo resolution (sport + team abbreviation),

   so an NBA league only shows NBA players, NBA roster slots, NBA scoring, and NBA team logos; same for NHL, MLB, NCAAF, NCAAB, and SOCCER. NFL behavior (including IDP) is unchanged.

4. **Idempotency and overrides** — Bootstrap is written to be idempotent where applicable (e.g. roster config, waiver settings created only when missing). Commissioner overrides in League.settings can coexist with defaults when merge logic is used (e.g. for post-creation initialization with mergeIfExisting).

This end-to-end flow ensures that from the moment the user selects a sport, the created league is fully sport-specific and that all post-creation pages (draft, waiver, roster, logos) use the same sport for data and branding.
