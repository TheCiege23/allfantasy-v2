# Prompt 20 — Schedule Behavior by Sport + Full UI Click Audit

## 1. Schedule defaults architecture

- **Single source of truth:** `lib/sport-defaults/DefaultScheduleConfigResolver.ts` holds `CONFIGS` per `SportType` (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER). Each entry is a `DefaultScheduleConfig`: schedule_unit, regular_season_length, matchup_frequency, season_labeling, lock_time_behavior, injury_slot_behavior, matchup_cadence, head_to_head_or_points_behavior, lock_window_behavior, scoring_period_behavior, reschedule_handling, doubleheader_or_multi_game_handling, playoff_transition_point, schedule_generation_strategy. NFL IDP uses the same schedule config as NFL via `resolveDefaultScheduleConfig(sportType, formatType)`.
- **Registry layer:** `lib/schedule-defaults/ScheduleDefaultsRegistry.ts` exposes `getSchedulePreset(sport, variant)` and re-exports `resolveDefaultScheduleConfig` for league creation, bootstrap, and resolvers.
- **Resolvers:**
  - **SchedulePresetResolver** — `resolveSchedulePreset(sport, variant)` returns preset + sport/variant.
  - **LeagueScheduleBootstrapService** — `bootstrapLeagueScheduleConfig(leagueId)` merges into `League.settings` when no schedule keys exist (schedule_cadence, schedule_head_to_head_behavior, schedule_lock_window_behavior, schedule_scoring_period_behavior, schedule_reschedule_handling, schedule_doubleheader_handling, schedule_playoff_transition_point, schedule_generation_strategy). Idempotent; does not overwrite existing keys.
  - **MatchupCadenceResolver** — `getMatchupCadenceForLeague(leagueId)` returns schedule_unit, matchup_frequency, matchup_cadence, regular_season_length, schedule_generation_strategy; uses settings when present, else sport defaults.
  - **ScoringWindowResolver** — `getScoringWindowConfigForLeague(leagueId)` returns lock_time_behavior, lock_window_behavior, scoring_period_behavior, schedule_unit, reschedule_handling, doubleheader_handling; uses settings (schedule_* keys) when present, else defaults.
  - **LeagueScheduleGenerationService** — `getLeagueScheduleGenerationContext(leagueId)` returns regular_season_length, schedule_unit, matchup_frequency, schedule_generation_strategy, playoff_transition_point for matchup generation and schedule display.
  - **ScheduleConfigResolver (new)** — `getScheduleConfigForLeague(leagueId)` aggregates cadence + scoring window + generation context + head_to_head from settings into one object for the app schedule/config API and ScheduleSettingsPanel.
- **Persistence:** Schedule behavior lives in `League.settings`: schedule_cadence, schedule_head_to_head_behavior, schedule_lock_window_behavior, schedule_scoring_period_behavior, schedule_reschedule_handling, schedule_doubleheader_handling, schedule_playoff_transition_point, schedule_generation_strategy. Bootstrap and `buildInitialLeagueSettings` (league creation) set these; commissioners can override.

---

## 2. Per-sport and per-variant schedule preset definitions

All presets live in `DefaultScheduleConfigResolver.ts` under `CONFIGS`. NFL IDP uses same as NFL.

| Sport | schedule_unit | regular_season_length | matchup_frequency | matchup_cadence | head_to_head | lock_time | lock_window | scoring_period | reschedule | doubleheader | playoff_transition | schedule_generation |
|-------|---------------|------------------------|-------------------|-----------------|--------------|-----------|-------------|----------------|------------|--------------|-------------------|---------------------|
| NFL | week | 18 | weekly | weekly | head_to_head | first_game | first_game_of_week | full_period | use_final_time | all_games_count | 15 | round_robin |
| NBA | week | 24 | weekly | weekly | head_to_head | first_game | first_game_of_slate | full_period | use_final_time | all_games_count | 22 | round_robin |
| MLB | week | 26 | weekly | weekly | head_to_head | slate_lock | slate_lock | slate_based | use_final_time | all_games_count | 24 | round_robin |
| NHL | week | 25 | weekly | weekly | head_to_head | first_game | first_game_of_slate | full_period | use_final_time | all_games_count | 22 | round_robin |
| NCAAF | week | 15 | weekly | weekly | head_to_head | first_game | first_game_of_week | full_period | use_final_time | all_games_count | 13 | round_robin |
| NCAAB | week | 18 | weekly | weekly | head_to_head | first_game | first_game_of_slate | full_period | use_final_time | all_games_count | 16 | round_robin |
| SOCCER | week | 38 | weekly | weekly | head_to_head | first_game | first_game_of_slate | full_period | use_final_time | all_games_count | 36 | round_robin |

- **default_schedule_unit:** week for all (current product model).
- **default_regular_season_length:** 18 (NFL), 24 (NBA), 26 (MLB), 25 (NHL), 15 (NCAAF), 18 (NCAAB), 38 (SOCCER).
- **default_matchup_cadence:** weekly for all.
- **default_head_to_head_or_points_behavior:** head_to_head for all.
- **default_lock_window_behavior:** first_game_of_week (NFL, NCAAF), first_game_of_slate (NBA, NHL, NCAAB, SOCCER), slate_lock (MLB).
- **default_scoring_period_behavior:** full_period for most; slate_based for MLB.
- **default_reschedule_handling:** use_final_time for all.
- **default_doubleheader_or_multi_game_handling:** all_games_count for all.
- **default_playoff_transition_point:** 15 (NFL), 22 (NBA), 24 (MLB), 22 (NHL), 13 (NCAAF), 16 (NCAAB), 36 (SOCCER).
- **default_schedule_generation_strategy:** round_robin for all.

---

## 3. Backend schedule and cadence resolver updates

- **MatchupCadenceResolver:** No logic change; already reads League.settings and falls back to resolveDefaultScheduleConfig. Exported from schedule-defaults index.
- **ScoringWindowResolver:** No logic change; already uses settings.schedule_lock_window_behavior, schedule_scoring_period_behavior, schedule_reschedule_handling, schedule_doubleheader_handling with defaults fallback. Exported from schedule-defaults index.
- **LeagueScheduleGenerationService:** No logic change; already returns regular_season_length, schedule_unit, matchup_frequency, schedule_generation_strategy, playoff_transition_point from settings or defaults. Exported from schedule-defaults index.
- **ScheduleConfigResolver (new):** Combines getMatchupCadenceForLeague, getScoringWindowConfigForLeague, getLeagueScheduleGenerationContext, and league.settings.schedule_head_to_head_behavior into a single ScheduleConfigForLeague for the app API and ScheduleSettingsPanel.
- **schedule-defaults/index.ts (new):** Barrel exporting ScheduleDefaultsRegistry, SchedulePresetResolver, LeagueScheduleBootstrapService, MatchupCadenceResolver, ScoringWindowResolver, LeagueScheduleGenerationService, ScheduleConfigResolver and their types.

---

## 4. Matchup and scoring window integration updates

- **Matchup generation:** LeagueScheduleGenerationService and MatchupCadenceResolver are the intended consumers for matchup generation and schedule display; callers can use getLeagueScheduleGenerationContext(leagueId) or getMatchupCadenceForLeague(leagueId) to get sport-aware length, unit, cadence, and strategy. No changes to existing matchup generation code; existing behavior preserved.
- **Scoring windows / lock timing:** ScoringWindowResolver is the source for lock_time_behavior, lock_window_behavior, scoring_period_behavior, reschedule_handling, doubleheader_handling. Downstream scoring aggregation and lineup lock logic can use getScoringWindowConfigForLeague(leagueId). No changes to existing scoring or lock code.
- **App API:** Added GET `api/app/league/[leagueId]/schedule/config` (path `league`, leagueId, `schedule`, `config`) returning getScheduleConfigForLeague(leagueId).
- **ScheduleSettingsPanel (new):** Loads `schedule/config` via useLeagueSectionData(leagueId, 'schedule/config') and displays schedule unit, regular season length, matchup frequency/cadence, generation strategy, playoff transition, head-to-head behavior, lock time/window, scoring period, reschedule handling, doubleheader handling, sport/variant.
- **LeagueSettingsTab:** Added "Schedule Settings" subtab and render ScheduleSettingsPanel when active.
- **League creation:** LeagueSettingsPreviewPanel already shows preset.league.default_regular_season_length and default_matchup_unit in the preset summary; buildInitialLeagueSettings includes schedule_cadence, schedule_playoff_transition_point, etc. Bootstrap runs after creation and merges schedule keys when none exist.

---

## 5. Full UI click audit findings

| Area | Element | Component | Handler | State/Persistence | Refresh | Status |
|------|--------|-----------|---------|-------------------|---------|--------|
| League creation | Preset summary (season length, unit) | LeagueSettingsPreviewPanel | N/A (display) | From preset.league | When preset changes | OK |
| League creation | Sport/preset change | League creation flow | Updates preset | Roster, scoring, league defaults | Summary updates | OK |
| Settings | Schedule Settings subtab | LeagueSettingsTab | onClick → setActive('Schedule Settings') | Local active | N/A | OK |
| Settings | Schedule config (read) | ScheduleSettingsPanel | useLeagueSectionData(leagueId, 'schedule/config') | GET league/schedule/config | On mount / reload | OK |
| Matchups tab | Reload | MatchupsTab | onReload → reload() | Refetches matchups | Data reload | OK |
| Matchups tab | Matchup card click | MatchupCard | onClick → setSelected(m) | Local selected | N/A | OK |
| Matchups tab | Matchup detail | MatchupDetailView | N/A (display) | selected matchup | When selected changes | OK |

**Note:** MatchupsTab currently uses useLeagueSectionData(leagueId, 'matchups'), which proxies to `/api/bracket/live`; the tab also uses MOCK_MATCHUPS for the card list. Week/round/period navigation and commissioner “regenerate schedule” were not found in the audited app league flow; any such controls would live in commissioner or bracket-specific flows. Schedule *configuration* is now visible in Settings → Schedule Settings and via GET schedule/config.

---

## 6. QA findings

- **Schedule defaults initialize per sport:** Bootstrap runs on league creation; when no schedule keys exist, resolveDefaultScheduleConfig(sport) supplies all schedule_* keys. All seven sports have distinct CONFIGS with correct regular_season_length, playoff_transition_point, lock_window, and scoring_period (e.g. MLB slate_based).
- **NFL IDP:** Uses same schedule config as NFL (resolveDefaultScheduleConfig does not vary by formatType).
- **Scoring windows and lock timing:** ScoringWindowResolver returns lock_time_behavior, lock_window_behavior, scoring_period_behavior; defaults match sport (e.g. first_game_of_week for NFL/NCAAF, first_game_of_slate for NBA/NHL/NCAAB/SOCCER, slate_lock for MLB).
- **Matchup generation:** LeagueScheduleGenerationService and MatchupCadenceResolver use settings then defaults; existing NFL leagues with stored settings keep their behavior; new leagues get sport defaults from bootstrap or buildInitialLeagueSettings.
- **No wrong inheritance:** Each sport has its own CONFIGS entry; fallback is CONFIGS.NFL only when sport is unknown.
- **Schedule-related clicks:** Schedule Settings subtab and panel load; MatchupsTab Reload and MatchupCard click work. No dead buttons identified in audited paths.

---

## 7. Issues fixed

1. **No central schedule config for app UI** — Added ScheduleConfigResolver and GET `/api/app/league/[leagueId]/schedule/config` so the app can show a single schedule config (cadence, scoring window, generation, head-to-head) in Settings.
2. **No Schedule Settings in League Settings** — Added ScheduleSettingsPanel and "Schedule Settings" subtab in LeagueSettingsTab, wired to schedule/config.
3. **No single export for schedule-defaults** — Added `lib/schedule-defaults/index.ts` exporting all resolvers and types.

---

## 8. Final QA checklist

- [ ] Create a new league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER); confirm League.settings receives schedule_* keys (either from buildInitialLeagueSettings or bootstrap) with sport-appropriate values.
- [ ] Open Settings → Schedule Settings; confirm schedule/config loads and shows correct unit, length, cadence, lock window, scoring period, playoff transition, sport/variant.
- [ ] For an existing league with custom schedule keys, confirm Schedule Settings and resolvers show stored values.
- [ ] NFL IDP league: confirm schedule config matches NFL (18 weeks, week unit, weekly cadence, playoff transition 15, etc.).
- [ ] Matchups tab: confirm Reload runs and MatchupCard click updates detail view (mock or live data as implemented).
- [ ] Regression: existing leagues with existing schedule keys are not overwritten by bootstrap.

---

## 9. Explanation of schedule behavior by sport

- **NFL / NFL IDP:** Schedule unit week; 18-week regular season; weekly matchups; lock at first game of week; full_period scoring; playoff transition week 15. Standard game lock expectations; round_robin generation.
- **NBA:** 24-week regular season; weekly matchups; first game of slate lock; full_period scoring; playoff transition week 22. Basketball scoring periods and lineup lock aligned with slate.
- **MLB:** 26-week regular season; slate_lock lock time and lock window; scoring_period_behavior slate_based to support heavier game volume and frequent scoring events; playoff transition 24. Doubleheader handling all_games_count.
- **NHL:** 25-week regular season; first game / first game of slate lock; full_period scoring; playoff transition 22. Hockey schedule density and scoring cadence supported by same defaults.
- **NCAA Football:** 15-week regular season (shorter than NFL); weekly cadence; first game of week lock; playoff transition 13.
- **NCAA Basketball:** 18-week regular season; first game of slate lock; full_period; playoff transition 16. Basketball cadence adapted for college.
- **Soccer:** 38-week regular season (full fixture list); weekly cadence; first game of slate lock; playoff transition 36. Sport-aware lineup and lock timing.

All use reschedule_handling use_final_time and doubleheader_or_multi_game_handling all_games_count. Commissioners can override any schedule_* key in League.settings after creation.
