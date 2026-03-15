# Default League Settings by Sport — Deliverable (Prompt 6)

League-specific default settings so when a user creates a league for a given sport (or variant), the league is initialized with the correct sport defaults. **Current league creation flow, existing NFL league defaults, league settings tables/APIs, playoff and matchup logic, and all league-settings-related selectors and panels are preserved.**

Supported: **NFL, NFL IDP, NBA, MLB, NHL, NCAA Football, NCAA Basketball, Soccer.**

---

## 1. Default League Settings Architecture

Default league settings are the **sport-specific starting point** for a newly created league. They are resolved on the backend and applied at league creation; commissioners can override any value after initialization.

### Data flow

```
User selects sport (and optionally dynasty/superflex)
    → POST /api/league/create
    → buildInitialLeagueSettings(sport)  [LeagueDefaultSettingsService]
        → getLeagueDefaults(sport)        [SportDefaultsRegistry: default_team_count, default_playoff_team_count]
        → getWaiverDefaults(sport)       [waiver_mode]
        → resolveDefaultPlayoffConfig(sport)  [playoff_team_count, playoff_structure]
        → resolveDefaultScheduleConfig(sport) [regular_season_length, matchup_frequency, schedule_unit, injury_slot_behavior, lock_time_behavior]
        → DEFAULT_TIEBREAKERS[sport], DEFAULT_TRADE_REVIEW[sport], DEFAULT_SCORING_MODE[sport], DEFAULT_ROSTER_MODE[sport]
    → League created with settings: { ...initialSettings, superflex?, roster_mode? }
    → runLeagueBootstrap(leagueId, sport, scoringFormat)
        → initializeLeagueWithSportDefaults({ leagueId, sport, mergeIfExisting: false })  [waiver settings + settings when league had no settings]
```

### Core modules

| Module | Responsibility |
|--------|----------------|
| **LeagueDefaultSettingsService** | Aggregates all 14 default league settings per sport. `getDefaultLeagueSettings(sportType)` returns `DefaultLeagueSettings`; `buildInitialLeagueSettings(sportType)` returns the JSON object written to `League.settings`. Uses SportDefaultsRegistry (team count, playoff count), WaiverDefaults (waiver_mode), DefaultPlayoffConfigResolver (playoff_structure), DefaultScheduleConfigResolver (schedule, lock, injury), and per-sport maps for tiebreakers, trade_review_mode, scoring_mode, roster_mode. |
| **DefaultPlayoffConfigResolver** | Per-sport playoff_team_count, playoff_weeks, first_round_byes, bracket_type, consolation_plays_for. |
| **DefaultScheduleConfigResolver** | Per-sport schedule_unit, regular_season_length, matchup_frequency, season_labeling, lock_time_behavior, injury_slot_behavior. |
| **SportLeaguePresetResolver** | Returns full league preset for a sport: defaults + templates + `defaultLeagueSettings` + `initialSettingsJson` (from buildInitialLeagueSettings). Used when UI/API needs “everything for league creation.” |
| **LeagueCreationInitializer** | Applies sport defaults after league create: writes `League.settings` (when empty or when merging) and creates `LeagueWaiverSettings`. Commissioner overrides are preserved when merging (existing keys take precedence). |
| **LeagueVariantRegistry** | `lib/sport-defaults/LeagueVariantRegistry.ts`. Resolves NFL variant (e.g. IDP); getFormatTypeForVariant(sport, variant). NFL IDP uses same league settings baseline as NFL; roster/scoring are variant-specific. |

---

## 2. Per-Sport Preset Definitions

All 14 settings are defined per sport. Sources: **SportDefaultsRegistry** (league, waiver), **DefaultPlayoffConfigResolver**, **DefaultScheduleConfigResolver**, **LeagueDefaultSettingsService** (tiebreakers, trade_review, scoring_mode, roster_mode).

### NFL

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 18 |
| playoff_team_count | 6 |
| playoff_structure | 4 weeks, 2 byes, single_elimination, consolation_plays_for: pick |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft (or dynasty if user selects at create) |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_or_out |
| lock_time_behavior | first_game |

### NBA

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 24 |
| playoff_team_count | 6 |
| playoff_structure | 3 weeks, 2 byes, single_elimination, consolation_plays_for: pick |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_or_out |
| lock_time_behavior | first_game |

### MLB

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 26 |
| playoff_team_count | 6 |
| playoff_structure | 4 weeks, 2 byes, single_elimination, consolation_plays_for: none |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_only |
| lock_time_behavior | slate_lock |

### NHL

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 25 |
| playoff_team_count | 6 |
| playoff_structure | 4 weeks, 2 byes, single_elimination, consolation_plays_for: pick |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_or_out |
| lock_time_behavior | first_game |

### NCAA Football

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 15 |
| playoff_team_count | 6 |
| playoff_structure | 3 weeks, 2 byes, single_elimination, consolation_plays_for: pick |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_or_out |
| lock_time_behavior | first_game |

### NCAA Basketball

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 18 |
| playoff_team_count | 6 |
| playoff_structure | 3 weeks, 2 byes, single_elimination, consolation_plays_for: pick |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_or_out |
| lock_time_behavior | first_game |

### Soccer

| Setting | Value |
|---------|--------|
| default_team_count | 12 |
| regular_season_length | 38 |
| playoff_team_count | 6 |
| playoff_structure | 3 weeks, 2 byes, single_elimination, consolation_plays_for: pick |
| matchup_frequency | weekly |
| season_labeling | week |
| schedule_unit | week |
| scoring_mode | points |
| roster_mode | redraft |
| waiver_mode | faab |
| trade_review_mode | commissioner |
| standings_tiebreakers | points_for, head_to_head, points_against |
| injury_slot_behavior | ir_or_out |
| lock_time_behavior | first_game |

### NFL IDP

NFL IDP uses the **same league settings baseline as NFL** (team count, playoff, schedule, waiver, trade review, tiebreakers, injury/lock behavior). Variant-specific behavior applies to **roster** (IDP slots) and **scoring** (IDP scoring rules) via LeaguePresetResolver; league settings (playoff, schedule, waiver_mode, etc.) come from getDefaultLeagueSettings(NFL) and buildInitialLeagueSettings(NFL, 'IDP').

---

## 3. Backend Initialization Logic

1. **League creation API**  
   - Builds initial settings with `buildInitialLeagueSettings(sport)`.  
   - Creates the league with `settings: { ...initialSettings, superflex?, roster_mode: isDynasty ? 'dynasty' : initialSettings.roster_mode }`.  
   - Calls `runLeagueBootstrap(leagueId, sport, scoringFormat)`.

2. **runLeagueBootstrap** (LeagueBootstrapOrchestrator)  
   - Runs in parallel: `attachRosterConfigForLeague`, `initializeLeagueWithSportDefaults`, `bootstrapLeagueScoring`, `bootstrapLeaguePlayerPool`.  
   - `initializeLeagueWithSportDefaults({ leagueId, sport, mergeIfExisting: false })`:  
     - If the league has no `settings`, writes `buildInitialLeagueSettings(sport)` to `League.settings`.  
     - If the league already has settings (as from create), does not overwrite (mergeIfExisting: false).  
     - Creates `LeagueWaiverSettings` when missing (waiver_type, faabBudget, processingDayOfWeek from waiver defaults).

3. **Commissioner overrides**  
   - When settings are merged later (e.g. for an imported league), `mergeIfExisting: true` merges existing settings with initial defaults; existing keys win, so commissioner overrides are preserved.

---

## 4. Integration with Existing League Creation Endpoints

| Endpoint / flow | Integration |
|-----------------|-------------|
| **POST /api/league/create** | Accepts `sport` (default NFL). Uses `getLeagueDefaults(sport)` and `getScoringDefaults(sport)` to fill name, leagueSize, scoring, isDynasty when omitted. Calls `buildInitialLeagueSettings(sport)` and stores result in `League.settings` (with optional superflex and roster_mode: 'dynasty' when isDynasty). Then calls `runLeagueBootstrap(leagueId, sport, scoringFormat)`, which includes `initializeLeagueWithSportDefaults`. |
| **GET /api/sport-defaults?sport=X&load=creation** | Returns full league creation payload including `defaultLeagueSettings` (from `getDefaultLeagueSettings`) inside `loadLeagueCreationDefaults`; used by UI to prefill forms. |
| **SportLeaguePresetResolver.resolveSportLeaguePreset(leagueSport)** | Returns preset + defaultLeagueSettings + initialSettingsJson; used when a single call is needed for “everything for league creation.” |

Existing NFL league creation, playoff logic, and matchup behavior are unchanged; new leagues (any sport) get the correct sport-specific default settings at creation, and commissioner overrides remain possible after initialization.

---

## 5. Full UI Click Audit Findings

League-settings-related values are **preset-driven** during creation: the user selects sport and variant, and the preset (from GET `/api/sport-defaults?sport=X&load=creation&variant=Y`) includes `defaultLeagueSettings` and league summary. There is no separate “league settings step” with individual controls for playoff count, season length, scoring mode, etc.—those are applied from the backend at create. For the full league-creation workflow, see **`docs/MANDATORY_WORKFLOW_AUDIT_LEAGUE_CREATION_IMPORT.md`**. Below is the audit for **league-settings-related** elements.

### 5.1 Creation flow — controls that affect league settings

| Element | Component & route | Handler | State / API | Backend / persistence | Status |
|--------|-------------------|---------|-------------|------------------------|--------|
| **Sport selector** | LeagueCreationSportSelector, `/startup-dynasty` | onValueChange → setSport | sport | useSportPreset(sport, variant) → loadLeagueCreationDefaults → getDefaultLeagueSettings(sport); preset includes defaultLeagueSettings | OK |
| **Preset / variant selector** | LeagueCreationPresetSelector | onValueChange → setLeagueVariant | leagueVariant | Same API with variant; NFL IDP gets NFL league settings + IDP roster/scoring | OK |
| **Team count (League Size)** | Select, StartupDynastyForm | onValueChange → setLeagueSize | leagueSize | Preset effect syncs from preset.league.default_team_count; sent in POST body as leagueSize; bootstrap/initialization use sport defaults, create body can override team count | OK |
| **League format (Dynasty/Keeper)** | Select | onValueChange → setFormat | format | Drives isDynasty in body; buildInitialLeagueSettings uses DEFAULT_ROSTER_MODE (redraft) but create flow can set roster_mode: 'dynasty' when isDynasty | OK |
| **Scoring (NFL non-IDP)** | Select | onValueChange → setScoring | scoring | Preset effect syncs from preset.scoring; sent in body; scoring template and scoring_mode (points) from defaults | OK |
| **Preview summary** | LeagueSettingsPreviewPanel | Display only | Renders preset.league: default_team_count, default_playoff_team_count, default_regular_season_length, default_matchup_unit | Same as defaultLeagueSettings in payload; preview matches what is applied at create | OK |
| **Create button** | StartupDynastyForm | handleSubmit → POST /api/league/create | Body: name, sport, leagueVariant, leagueSize, scoring, isDynasty, isSuperflex, etc. | League created; buildInitialLeagueSettings(sport, variant) applied via bootstrap; League.settings and LeagueWaiverSettings written | OK |
| **Back / Continue** | Mode switch, import back, redirect after create | setCreationMode; setImportPreview(null); window.location.href after success | — | No separate “league settings step”; back/continue behave as in mandatory audit | OK |
| **Save** | No explicit “save league settings” in creation | — | Defaults applied at create; commissioner overrides via settings API later | OK |

### 5.2 Settings that have no creation UI (default-only)

These are set from **getDefaultLeagueSettings(sport)** / **buildInitialLeagueSettings(sport, variant)** at create and appear in League.settings. They are not individually selectable in the creation form; commissioner can change them after creation.

| Setting | Source | Applied at create | Commissioner override |
|---------|--------|--------------------|------------------------|
| playoff_team_count, playoff_structure | DefaultPlayoffConfigResolver | Yes (in initialSettings) | Yes (settings API / merge) |
| regular_season_length, matchup_frequency, season_labeling, schedule_unit | DefaultScheduleConfigResolver | Yes | Yes |
| scoring_mode, roster_mode | LeagueDefaultSettingsService maps | Yes (roster_mode overridden by isDynasty when user selects dynasty) | Yes |
| waiver_mode | getWaiverDefaults(sport) | Yes; LeagueWaiverSettings created | Yes |
| trade_review_mode, standings_tiebreakers | LeagueDefaultSettingsService maps | Yes | Yes |
| injury_slot_behavior, lock_time_behavior | DefaultScheduleConfigResolver | Yes | Yes |

### 5.3 Post-creation settings tabs

| Element | Route / surface | Handler / wiring | Backend / persistence | Status |
|--------|-----------------|------------------|------------------------|--------|
| **Settings tabs (commissioner)** | League detail, settings/playoff/waiver/draft panels | Load League.settings; edit and save | GET/PATCH league or settings APIs; merge with existing | Values initialized from buildInitialLeagueSettings; edits persist; no stale preview when reloading | OK |

### 5.4 Verification summary

- **Handlers:** Sport and preset selectors, League Size, League Format, Scoring (NFL), Create button all have handlers. No dead selectors or broken preview.
- **State:** Preset drives leagueSize, scoring, leagueName via useEffect; form state and body align with preset/defaults.
- **Backend:** GET sport-defaults?load=creation returns defaultLeagueSettings; POST league/create uses buildInitialLeagueSettings and runLeagueBootstrap (initializeLeagueWithSportDefaults). Persisted League.settings and LeagueWaiverSettings match sport defaults (or user overrides at create for team count/dynasty).
- **Preview vs saved:** LeagueSettingsPreviewPanel shows preset.league (teams, playoffs, season length, matchup unit); same values are in defaultLeagueSettings and applied at create. No preview mismatch identified.

---

## 6. QA Findings

- **Per-sport defaults:** LeagueDefaultSettingsService, DefaultPlayoffConfigResolver, and DefaultScheduleConfigResolver define all 14 settings (and related structure) for NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER; NFL IDP uses NFL league settings baseline with variant-specific roster/scoring.
- **Initialization:** buildInitialLeagueSettings(sport, variant) is used at create and in LeaguePresetResolutionPipeline; initializeLeagueWithSportDefaults writes League.settings and LeagueWaiverSettings when league has no settings or when merging; commissioner overrides preserved when mergeIfExisting is true.
- **Creation flow:** Sport and variant selection drive preset; preset includes defaultLeagueSettings; team count and format (dynasty) are user-adjustable in the form; other settings (playoff, schedule, waiver_mode, tiebreakers, etc.) come from backend defaults. No separate league settings step; preview panel shows summary from preset.
- **Playoff and matchup logic:** Existing logic that reads League.settings (playoff_structure, schedule_unit, lock_time_behavior, etc.) continues to receive sport-specific values; no regression.

---

## 7. Issues Fixed

- No code changes were required for this deliverable. Default league settings (LeagueDefaultSettingsService, DefaultPlayoffConfigResolver, DefaultScheduleConfigResolver, LeagueCreationInitializer, SportLeaguePresetResolver, LeagueVariantRegistry) and integration with league creation (GET sport-defaults, POST league/create, bootstrap) are already implemented. Documentation was updated: deliverable intro, Soccer and NFL IDP in per-sport definitions, **full UI click audit** (Section 5), QA findings (6), issues fixed (7), final QA checklist (8), explanation (9). No broken selectors, stale previews, partial saves, or preview mismatches found when sport and variant are passed through.

---

## 8. Final QA Checklist

- [ ] **NFL league creation** – Create NFL league; verify League.settings has default_team_count 12, regular_season_length 18, playoff_team_count 6, playoff_structure (4 weeks, 2 byes), matchup_frequency weekly, schedule_unit week, scoring_mode points, roster_mode redraft, waiver_mode faab, trade_review_mode commissioner, injury_slot_behavior ir_or_out, lock_time_behavior first_game.
- [ ] **NFL dynasty** – Create NFL league with isDynasty true; verify settings.roster_mode is 'dynasty' and League.isDynasty is true.
- [ ] **NBA** – Create NBA league; verify regular_season_length 24, playoff_weeks 3, other NBA defaults; roster/scoring from SportDefaultsRegistry and templates.
- [ ] **MLB** – Create MLB league; verify regular_season_length 26, lock_time_behavior slate_lock, injury_slot_behavior ir_only, consolation_plays_for none.
- [ ] **NHL** – Create NHL league; verify regular_season_length 25 and NHL roster/scoring defaults.
- [ ] **NCAAF** – Create NCAA Football league; verify regular_season_length 15, playoff_weeks 3.
- [ ] **NCAAB** – Create NCAA Basketball league; verify regular_season_length 18, playoff_weeks 3.
- [ ] **Waiver settings** – After create, LeagueWaiverSettings exists with waiver type and FAAB from getWaiverDefaults(sport).
- [ ] **Commissioner overrides** – Update League.settings via settings API or DB; re-run initializer with mergeIfExisting true; verify existing overrides are preserved.
- [ ] **Existing playoff and matchup logic** – No regression in playoff or matchup calculations that read from League.settings.
- [ ] **League-settings UI audit (Section 5)** – Sport/preset selectors, team count, format, scoring, preview summary, Create/Back/Continue, and settings tabs that display default-loaded values are wired correctly; no broken selectors, stale previews, partial saves, or preview mismatches.

---

## 9. Explanation of Default League Settings by Sport

Default league settings ensure that when a user creates a league for a given sport, the league is **initialized with the correct sport defaults** without hardcoding sport logic in the frontend.

- **default_team_count, playoff_team_count, regular_season_length** – Come from SportDefaultsRegistry (league) and DefaultScheduleConfigResolver so NFL has 18 weeks, NBA 24, MLB 26, NHL 25, NCAAF 15, NCAAB 18, and playoff counts and season lengths match each sport’s calendar.

- **playoff_structure** – DefaultPlayoffConfigResolver defines playoff_weeks, first_round_byes, bracket_type, and consolation_plays_for per sport (e.g. MLB typically no consolation; others consolation for draft pick).

- **matchup_frequency, season_labeling, schedule_unit** – DefaultScheduleConfigResolver sets weekly matchups and “week” labeling for all supported sports; schedule_unit can be week, round, series, or slate for future use.

- **scoring_mode, roster_mode** – LeagueDefaultSettingsService uses per-sport maps (currently all points and redraft; roster_mode can be overridden to dynasty at create when the user selects dynasty).

- **waiver_mode, trade_review_mode, standings_tiebreakers** – Waiver mode from SportDefaultsRegistry; trade review and tiebreakers from LeagueDefaultSettingsService per sport.

- **injury_slot_behavior, lock_time_behavior** – Sport-specific: e.g. MLB uses slate_lock and ir_only; NFL/NBA/NHL/NCAAF/NCAAB use first_game and ir_or_out so lineups lock at first game of the period and IR can include “Out” designations where appropriate.

The league creation API applies these defaults by calling `buildInitialLeagueSettings(sport)` and storing the result in `League.settings` at create time; `runLeagueBootstrap` then runs `initializeLeagueWithSportDefaults` so waiver settings and any missing settings are applied. Commissioners can change any of these values after initialization; the system preserves the sport-specific starting point while allowing overrides.

---

*Document generated for Prompt 6 — Default League Settings by Sport. All eight sports/variants supported; full UI click audit in Section 5; NFL and existing flows preserved.*
