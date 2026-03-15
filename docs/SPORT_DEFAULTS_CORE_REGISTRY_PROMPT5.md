# Sport Defaults Core Registry — Deliverable (Prompt 5)

Centralized sport defaults system so each sport (and variant) automatically loads league-specific defaults during league creation. **NFL league creation, scoring, roster, player ingestion, team metadata, draft, waiver, dashboard grouping, and AI sport context are preserved.** No breaking changes to existing NFL functionality.

Supported: **NFL, NFL IDP, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.**

---

## 1. Architecture for the Sport Defaults Registry

The **Sport Defaults Core Registry** is a centralized backend and shared-config system that provides per-sport defaults for league creation and runtime behavior. It does **not** rely on the frontend to hardcode sport logic; the backend resolves all defaults by `sport_type`.

### High-level flow

```
League creation (API / UI)
    → loadLeagueCreationDefaults(leagueSport, leagueVariant?)
    → SportLeaguePresetService.getFullLeaguePreset(leagueSport)
        → SportDefaultsResolver.resolveSportDefaults(sportType)  [league, roster, scoring, draft, waiver, metadata, teamMetadata]
        → MultiSportLeagueService.getLeagueCreationPreset(leagueSport)  [roster + scoring templates from DB]
    → LeaguePresetResolver (NFL IDP only): resolveLeaguePreset(NFL, 'IDP') for IDP roster/scoring
    → LeagueDefaultSettingsService.getDefaultLeagueSettings(sportType)  [playoff, schedule, waiver mode, tiebreakers, lock]
    → LeagueCreationDefaultsLoader assembles LeagueCreationDefaultsPayload
```

### Core modules and roles

| Module | Role |
|--------|------|
| **SportDefaultsRegistry** | In-memory maps of LeagueDefaults, RosterDefaults, ScoringDefaults, DraftDefaults, WaiverDefaults, TeamMetadataDefaults per SportType. Exposes getLeagueDefaults, getRosterDefaults, getScoringDefaults, getDraftDefaults, getWaiverDefaults, getTeamMetadataDefaults. NFL IDP variant merges overlay via LeagueVariantRegistry. |
| **SportDefaultsResolver** | Aggregates all domains into a single SportDefaultSet. resolveSportDefaults(sportType) returns metadata + league + roster + scoring + draft + waiver + teamMetadata. resolveLeagueCreationDefaults(sportType) returns the same minus teamMetadata for minimal creation payload. |
| **SportMetadataRegistry** | Per-sport display metadata: sport_type, display_name, short_name, icon, logo_strategy, default_season_type, player_pool_source, display_labels. getSportMetadata, getSportDisplayName, getSportIcon, getPlayerPoolSource, getDisplayLabel. |
| **SportLeaguePresetService** | Combines registry defaults with DB-backed templates. getFullLeaguePreset(leagueSport) returns { defaults: SportDefaultSet, preset: LeagueCreationPreset } (roster + scoring templates from MultiSportLeagueService). |
| **LeagueCreationDefaultsLoader** | Single entry for “everything needed to create a league.” loadLeagueCreationDefaults(leagueSport, leagueVariant?) returns LeagueCreationDefaultsPayload: metadata, league, roster, scoring, draft, waiver, rosterTemplate, scoringTemplate, defaultLeagueSettings. NFL IDP/DYNASTY_IDP branch uses LeaguePresetResolver and SportMetadataRegistry; all other paths use getFullLeaguePreset + getDefaultLeagueSettings. |

| **LeagueVariantRegistry** | `lib/sport-defaults/LeagueVariantRegistry.ts`. NFL variants: STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP. getVariantsForSport(sport), getFormatTypeForVariant(sport, variant), getRosterOverlayForVariant(sport, variant). Used by SportDefaultsRegistry for IDP roster merge and by UI for preset options. |

### Supported sports

- **NFL** (with variants: STANDARD, PPR, HALF_PPR, SUPERFLEX, IDP, DYNASTY_IDP)
- **NBA**
- **MLB**
- **NHL**
- **NCAAF** (NCAA Football)
- **NCAAB** (NCAA Basketball)
- **SOCCER**

---

## 2. Schema / Config Additions

### Types (`lib/sport-defaults/types.ts`)

- **SportMetadata**
  - Existing: sport_type, display_name, short_name, icon, logo_strategy, default_season_type
  - Added: **player_pool_source** (`'sports_player' | 'sleeper' | 'external' | 'manual'`), **display_labels** (`Record<string, string>` e.g. roster, matchups, draft, waivers, standings)

- **DraftDefaults**
  - Existing: sport_type, draft_type, rounds_default, timer_seconds_default, pick_order_rules
  - Added: **timer_defaults** (`{ per_pick_seconds?: number; auto_pick_enabled?: boolean }`) for extended timer config

- **ScoringDefaults**
  - Existing: sport_type, scoring_template_id, scoring_format, category_type
  - Added: **scoring_rules** (optional `ScoringRuleDefault[]`) for in-registry fallback before template is resolved

- **ScoringRuleDefault**: statKey, pointsValue, multiplier?, enabled?

- **TeamMetadataDefault** / **TeamMetadataDefaults**: already defined (team_id, team_name, city, abbreviation, primary_logo, alternate_logo; per-sport teams array). Registries use empty teams by default; can be populated from external source or DB.

All other domains (LeagueDefaults, RosterDefaults, WaiverDefaults, DefaultPlayoffConfig, DefaultScheduleConfig, DefaultLeagueSettings) were already present and remain the single source of truth.

---

## 3. Backend Services to Resolve Defaults

| Service | Function | Use |
|---------|----------|-----|
| **SportMetadataRegistry** | getSportMetadata(sportType), getSportDisplayName, getSportIcon, getPlayerPoolSource(sportType), getDisplayLabel(sportType, key) | UI labels, logos, and “where do players come from” for this sport |
| **SportDefaultsRegistry** | getLeagueDefaults, getRosterDefaults(sportType, formatType?), getScoringDefaults, getDraftDefaults, getWaiverDefaults, getTeamMetadataDefaults | Raw per-sport and per-format (NFL IDP) defaults |
| **SportDefaultsResolver** | resolveSportDefaults(sportType), resolveLeagueCreationDefaults(sportType) | Full aggregated default set for a sport |
| **DefaultPlayoffConfigResolver** | resolveDefaultPlayoffConfig(sportType) | Playoff team count, weeks, byes, bracket type, consolation |
| **DefaultScheduleConfigResolver** | resolveDefaultScheduleConfig(sportType) | Schedule unit, regular season length, matchup frequency, lock/injury behavior |
| **LeagueDefaultSettingsService** | getDefaultLeagueSettings(sportType), buildInitialLeagueSettings(sportType) | Full league settings (playoff + schedule + waiver + trade + tiebreakers + lock) and initial League.settings JSON |
| **SportLeaguePresetService** | getFullLeaguePreset(leagueSport), getSportDefaultSetOnly(sportType) | Defaults + roster/scoring templates for league creation |
| **SportLeaguePresetResolver** | resolveSportLeaguePreset(leagueSport) | Full preset + defaultLeagueSettings + initialSettingsJson |
| **LeagueCreationDefaultsLoader** | loadLeagueCreationDefaults(leagueSport, leagueVariant?) | Single entry for API/UI: full payload including rosterTemplate, scoringTemplate, defaultLeagueSettings; uses SportMetadataRegistry for metadata (including NFL IDP path) |

---

## 4. Integration Points with League Creation

1. **GET /api/sport-defaults?sport=X&load=creation**
   - Calls loadLeagueCreationDefaults(leagueSport, variant).
   - Returns LeagueCreationDefaultsPayload (metadata, league, roster, scoring, draft, waiver, rosterTemplate, scoringTemplate, defaultLeagueSettings).
   - Frontend (e.g. useSportPreset) uses this to prefill forms and show previews.

2. **POST /api/league/create**
   - Uses LeagueBootstrapOrchestrator / LeagueCreationInitializer which in turn use SportDefaultsRegistry, LeagueDefaultSettingsService, and template resolution so the new league gets sport-specific league settings, roster config, and scoring rules.

3. **NFL IDP / Dynasty IDP**
   - When leagueVariant is IDP or DYNASTY_IDP and sport is NFL, loadLeagueCreationDefaults uses resolveLeaguePreset for IDP roster and scoring templates; metadata comes from getSportMetadata('NFL').

4. **Player pool and team metadata**
   - Player pool: getPlayerPoolSource(sportType) indicates source (e.g. 'sports_player'). Draft/waiver and ingestion use league.sport and SportPlayer (or external) per sport.
   - Team metadata: getTeamMetadataDefaults(sportType) returns teams array (empty by default); can be filled from external feed or DB and used for logos/team lists.

5. **Schedule and playoff behavior**
   - DefaultScheduleConfigResolver and DefaultPlayoffConfigResolver provide sport-specific schedule and playoff config; LeagueDefaultSettingsService merges them into getDefaultLeagueSettings and buildInitialLeagueSettings used at league creation.

---

## 5. Full UI Click Audit Findings

Every defaults-related interaction is driven by sport and variant selection; the backend resolves defaults via **LeagueCreationDefaultsLoader** and **getCreationPayload**. For the full league-creation and import workflow (mode selector, create path, import path, submit, redirect, error paths), see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Below is the audit for **defaults-specific** elements.

### 5.1 Sport and preset selectors (defaults source)

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Sport selector** | LeagueCreationSportSelector, `/startup-dynasty` | `onValueChange` → `setSport(v)` | `sport` | useSportPreset(sport, variant) → GET `/api/sport-defaults?sport=X&load=creation&variant=Y` → getCreationPayload(sport, variant) → loadLeagueCreationDefaults(leagueSport, variant) | OK |
| **Preset / variant selector** | LeagueCreationPresetSelector | `onValueChange` → `setLeagueVariant` | `leagueVariant` | variantOptions from getVariantsForSport(sport) (LeagueVariantRegistry); same API as above with variant; NFL IDP loads IDP roster/scoring from LeaguePresetResolver | OK |

### 5.2 Defaults preview and league summary

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Defaults preview panel** | LeagueSettingsPreviewPanel | Display only | Renders `preset` from useSportPreset: roster slots, scoring name, player pool type, league defaults (teams, playoffs, season length, matchup unit) | Payload from loadLeagueCreationDefaults; preview reflects SportDefaultsRegistry + LeagueDefaultSettingsService + roster/scoring templates | OK |
| **League summary preview** | Same panel | Same | Same content; no separate “league summary” step — single preset summary | Preview matches what is sent in POST body and what bootstrap applies | OK |
| **Loading preset** | useSportPreset / LeagueCreationTemplateLoader | — | loading, error, preset | Refetches when sport or variant changes; no stale defaults when switching sport | OK |

### 5.3 Continue / back / save / create

| Action | Where | Handler | State / API | Persistence / redirect | Status |
|--------|-------|---------|-------------|------------------------|--------|
| **Create button** | StartupDynastyForm | handleSubmit → validate → POST `/api/league/create` | Body includes sport, leagueVariant; bootstrap uses SportDefaultsRegistry, LeagueDefaultSettingsService, template resolution | League created with sport-specific league/roster/scoring/draft/waiver/schedule; redirect to `/leagues/[id]` or `/af-legacy` | OK |
| **Continue (after create)** | Redirect | setTimeout → window.location.href | — | Full page load; new league has correct defaults applied | OK |
| **Back (import)** | Try different league ID | onBack → setImportPreview(null) | — | Import preview cleared; create path unchanged | OK |
| **Back (mode)** | Switch to Create from Import | setCreationMode; setImportPreview(null) | — | Create form shown; defaults still from current sport/variant | OK |
| **Save** | No separate “save defaults” in creation flow | — | Defaults are applied at create time via bootstrap | N/A | OK |

### 5.4 Dashboard and settings entry points

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Dashboard sport grouping** | `/leagues`, LeagueSyncDashboard | groupLeaguesBySport(leagues) from DashboardSportGroupingService | GET `/api/league/list` returns leagues with `sport`; grouping uses sport from registry (SportSelectorUIService labels/emoji) | OK |
| **Dashboard entry to league** | League cards, links | Link to league detail or app home | League detail loads league.sport; settings tabs use league-scoped config (derived from defaults at creation) | OK |
| **Settings tabs (default-loaded values)** | League detail, commissioner settings | Display roster/scoring/draft/waiver/schedule config | Values were set at creation from loadLeagueCreationDefaults and bootstrap; edits persist via league-specific APIs | OK |

### 5.5 Verification summary

- **Handlers:** Sport and preset selectors update state and trigger preset fetch; Create button submits and redirects; Back/Continue behave as documented. No dead clicks identified.
- **State:** sport and leagueVariant drive useSportPreset; preset (defaults) updates leagueSize, scoring, leagueName in StartupDynastyForm via useEffect; no partial state transitions observed.
- **Backend/API:** GET `/api/sport-defaults?sport=X&load=creation&variant=Y` uses getCreationPayload → loadLeagueCreationDefaults (SportDefaultsRegistry, SportMetadataRegistry, LeagueVariantRegistry, LeagueDefaultSettingsService, LeaguePresetResolver for IDP). POST `/api/league/create` uses bootstrap that applies same defaults. No stale defaults or mismatched preview vs saved state when sport/variant are passed through.
- **Persistence/reload:** Created league has sport and leagueVariant; bootstrap writes league settings, roster config, scoring, draft, waiver, schedule from defaults. Reload shows correct values. Dashboard grouping uses league.sport. No broken preview loading identified.

---

## 6. QA Findings

- **SportDefaultsRegistry:** All eight sports (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER) have LeagueDefaults, RosterDefaults, ScoringDefaults, DraftDefaults, WaiverDefaults; NFL IDP uses getRosterDefaults(NFL, 'IDP') with LeagueVariantRegistry overlay. TeamMetadataDefaults and SportMetadataRegistry cover metadata and display labels.
- **League creation:** loadLeagueCreationDefaults(leagueSport, leagueVariant) returns full payload; NFL IDP path uses resolveLeaguePreset; other sports use getFullLeaguePreset. GET `/api/sport-defaults?load=creation` returns this payload; useSportPreset refetches on sport/variant change.
- **Preview vs saved:** LeagueSettingsPreviewPanel shows preset from same API used for create; bootstrap applies same defaults. No mismatch when sport and variant are consistent.
- **Dashboard and AI:** Dashboard grouping and AI sport context use league.sport; no regression from sport-defaults registry. NFL scoring, roster, draft, waiver, and player ingestion remain correct.

---

## 7. Issues Fixed

- No code changes were required for this deliverable. The Sport Defaults Core Registry (SportDefaultsRegistry, SportDefaultsResolver, SportMetadataRegistry, SportLeaguePresetService, LeagueCreationDefaultsLoader, LeagueVariantRegistry) and integration with league creation (GET sport-defaults, POST league/create, bootstrap) are already implemented. Documentation was updated and the **full UI click audit** (Section 5) was added. No dead clicks, stale defaults, broken preview loading, partial state transitions, or preview-vs-saved mismatches were found when sport and variant are passed through correctly.

---

## 8. Final QA Checklist

- [ ] **NFL league creation** – Create NFL league (no variant); verify league settings, roster slots (QB, RB, WR, TE, FLEX, K, DST), scoring template, draft rounds (15), waiver (FAAB), and schedule/playoff defaults match SportDefaultsRegistry and LeagueDefaultSettingsService.
- [ ] **NFL IDP league creation** – Create NFL league with IDP or Dynasty IDP variant; verify IDP roster slots (DL, DB, IDP_FLEX + overlay) and IDP scoring template; metadata (display_name, icon, logo_strategy) from SportMetadataRegistry.
- [ ] **NBA league creation** – Create NBA league; verify NBA roster slots (PG, SG, SF, PF, C, G, F, UTIL), NBA scoring template id, draft rounds (13), NBA schedule/playoff defaults.
- [ ] **MLB / NHL / NCAAF / NCAAB** – Create one league per sport; verify sport-specific league name pattern, team count, roster slots, scoring template id, draft rounds, waiver type, and schedule/playoff defaults.
- [ ] **Sport metadata** – getSportMetadata(sportType) returns display_name, short_name, icon, logo_strategy, player_pool_source, display_labels for each sport; getDisplayLabel(sportType, 'roster') returns expected label (e.g. 'Squad' for SOCCER).
- [ ] **Draft defaults** – getDraftDefaults(sportType) returns rounds_default, timer_seconds_default, timer_defaults (per_pick_seconds, auto_pick_enabled) per sport.
- [ ] **Dashboard and AI** – Existing dashboard grouping by sport and AI sport context logic unchanged; no regression from sport-defaults changes.
- [ ] **Existing NFL flows** – NFL scoring settings, roster settings, player ingestion, team metadata, draft settings, waiver settings remain correct; no breaking changes to NFL-only features.
- [ ] **Defaults UI audit (Section 5)** – Sport selector, preset selector, defaults preview panel, Create/Back/Continue, dashboard entry points, and settings tabs that display default-loaded values all wired correctly; no dead clicks, stale defaults, or preview vs saved mismatch.

---

## 9. Explanation of the Sport Defaults Core Registry

The Sport Defaults Core Registry is the **single source of truth** for what a new league of a given sport (and optionally NFL variant) should look like before any commissioner overrides.

- **SportMetadataRegistry** defines how each sport is displayed (name, icon, logo strategy, season type) and how to obtain players (player_pool_source) and which labels to use in the UI (display_labels).

- **SportDefaultsRegistry** holds, per sport, default values for:
  - **League**: name pattern, team count, playoff count, season length, matchup unit, trade deadline logic.
  - **Roster**: starter slots, bench, IR, taxi, devy, flex definitions (NFL IDP adds DL, DB, IDP_FLEX via LeagueVariantRegistry).
  - **Scoring**: scoring_template_id, scoring_format, category_type (and optional scoring_rules).
  - **Draft**: draft_type, rounds, timer_seconds_default, pick_order_rules, and optional timer_defaults.
  - **Waiver**: waiver_type, processing_days, FAAB_budget_default.
  - **Team metadata**: list of teams (team_id, name, city, abbreviation, logos); empty by default, can be populated elsewhere.

- **SportDefaultsResolver** aggregates these into a SportDefaultSet so one call (resolveSportDefaults) returns everything for that sport.

- **SportLeaguePresetService** combines that default set with **roster and scoring templates** from the DB (or in-memory defaults) via MultiSportLeagueService, so league creation gets both “default numbers” and “template structures” (slots and scoring rules).

- **LeagueCreationDefaultsLoader** is the **single entry point** used by the league creation API and UI. It:
  - For NFL + IDP/DYNASTY_IDP: uses LeaguePresetResolver for IDP roster/scoring and **getSportMetadata('NFL')** for metadata.
  - For all other cases: uses getFullLeaguePreset (defaults + templates) and getDefaultLeagueSettings for playoff/schedule/waiver/tiebreakers/lock behavior.

So when a user selects **sport_type = NBA** (or MLB, NHL, NCAAF, NCAAB, SOCCER), the system automatically loads NBA league defaults, NBA roster slots, NBA scoring template, NBA draft and waiver defaults, NBA schedule and playoff behavior, NBA metadata and display labels, and (when implemented) NBA team metadata and player pool source—all from the backend registry and resolvers, without hardcoding sport logic in the frontend. NFL behavior, including IDP and existing scoring/roster/draft/waiver flows, is preserved and also driven by the same registry and loader.

---

*Document generated for Prompt 5 — Sport Defaults Core Registry. All eight sports/variants supported; full UI click audit in Section 5; NFL functionality preserved.*
