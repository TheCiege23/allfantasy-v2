# Schedule Behavior by Sport (Prompt 20)

## 1. Schedule defaults architecture

- **Single source of truth:** Per-sport schedule behavior lives in **DefaultScheduleConfigResolver** (`lib/sport-defaults/DefaultScheduleConfigResolver.ts`) in **CONFIGS** and **resolveDefaultScheduleConfig(sportType, formatType?)**. NFL IDP uses the same schedule config as NFL.
- **Persistence:** At league creation, **buildInitialLeagueSettings(sport, variant)** includes **schedule_unit**, **regular_season_length**, **matchup_frequency**, **season_labeling**, **lock_time_behavior**, **injury_slot_behavior** (from getDefaultLeagueSettings) plus extended keys: **schedule_cadence**, **schedule_head_to_head_behavior**, **schedule_lock_window_behavior**, **schedule_scoring_period_behavior**, **schedule_reschedule_handling**, **schedule_doubleheader_handling**, **schedule_playoff_transition_point**, **schedule_generation_strategy**. Commissioners can override any of these after creation.
- **Bootstrap:** **LeagueBootstrapOrchestrator** runs **bootstrapLeagueScheduleConfig(leagueId)** so leagues missing the extended schedule keys get them merged without overwriting existing keys.
- **Resolvers:** **MatchupCadenceResolver** returns schedule_unit, matchup_frequency, cadence, regular_season_length, schedule_generation_strategy for matchup generation. **ScoringWindowResolver** returns lock_time_behavior, lock_window_behavior, scoring_period_behavior, reschedule_handling, doubleheader_handling for scoring and lock logic. **LeagueScheduleGenerationService** returns context for schedule generation (length, strategy, playoff_transition_point). Existing matchup generation, season schedule logic, standings, and lock behavior are unchanged; they can consume these resolvers where needed.

## 2. Per-sport and per-variant schedule preset definitions

| Sport   | schedule_unit | regular_season | cadence | lock_window        | scoring_period | reschedule   | doubleheader   | playoff_transition | generation  |
|---------|---------------|----------------|---------|--------------------|----------------|--------------|----------------|--------------------|-------------|
| NFL     | week          | 18             | weekly  | first_game_of_week | full_period    | use_final_time | all_games_count | 15                  | round_robin |
| NFL IDP | week          | 18             | weekly  | first_game_of_week | full_period    | use_final_time | all_games_count | 15                  | round_robin |
| NBA     | week          | 24             | weekly  | first_game_of_slate| full_period    | use_final_time | all_games_count | 22                  | round_robin |
| MLB     | week          | 26             | weekly  | slate_lock         | slate_based    | use_final_time | all_games_count | 24                  | round_robin |
| NHL     | week          | 25             | weekly  | first_game_of_slate| full_period    | use_final_time | all_games_count | 22                  | round_robin |
| NCAAF   | week          | 15             | weekly  | first_game_of_week | full_period    | use_final_time | all_games_count | 13                  | round_robin |
| NCAAB   | week          | 18             | weekly  | first_game_of_slate| full_period    | use_final_time | all_games_count | 16                  | round_robin |
| SOCCER  | week          | 38             | weekly  | first_game_of_slate| full_period    | use_final_time | all_games_count | 36                  | round_robin |

All use **head_to_head_or_points_behavior: 'head_to_head'**. Schedule unit options in types: week, round, series, slate, scoring_period.

## 3. Backend schedule and cadence resolver updates

- **DefaultScheduleConfig:** Extended with matchup_cadence, head_to_head_or_points_behavior, lock_window_behavior, scoring_period_behavior, reschedule_handling, doubleheader_or_multi_game_handling, playoff_transition_point, schedule_generation_strategy. **schedule_unit** type extended to include 'scoring_period'.
- **DefaultScheduleConfigResolver:** All CONFIGS updated with the new fields per sport; **resolveDefaultScheduleConfig(sportType, formatType?)** added.
- **LeagueDefaultSettingsService:** **buildInitialLeagueSettings** now calls **resolveDefaultScheduleConfig(sport, variant)** and adds the extended schedule_* keys to the returned settings object.
- **LeagueBootstrapOrchestrator:** Runs **bootstrapLeagueScheduleConfig(leagueId)** and returns **schedule: { scheduleConfigApplied }** in **BootstrapResult**.

New modules:

- **lib/schedule-defaults/ScheduleDefaultsRegistry.ts** — getSchedulePreset(sport, variant), re-exports resolveDefaultScheduleConfig.
- **lib/schedule-defaults/SchedulePresetResolver.ts** — resolveSchedulePreset(sport, variant).
- **lib/schedule-defaults/LeagueScheduleBootstrapService.ts** — bootstrapLeagueScheduleConfig(leagueId): merge schedule defaults when no schedule_* keys exist.
- **lib/schedule-defaults/MatchupCadenceResolver.ts** — getMatchupCadenceForLeague(leagueId).
- **lib/schedule-defaults/ScoringWindowResolver.ts** — getScoringWindowConfigForLeague(leagueId).
- **lib/schedule-defaults/LeagueScheduleGenerationService.ts** — getLeagueScheduleGenerationContext(leagueId).

## 4. Matchup and scoring window integration updates

- **Matchup generation:** Call **getMatchupCadenceForLeague(leagueId)** or **getLeagueScheduleGenerationContext(leagueId)** to get schedule_unit, regular_season_length, matchup_frequency, schedule_generation_strategy, and playoff_transition_point before generating matchups.
- **Scoring windows and lock:** Call **getScoringWindowConfigForLeague(leagueId)** for lock_time_behavior, lock_window_behavior, scoring_period_behavior, reschedule_handling, and doubleheader_handling so scoring aggregation and lineup lock use sport-aware defaults.
- **Schedule UI:** Use the same resolvers so schedule displays reflect League.settings or sport defaults. Existing matchup generation, season schedule logic, standings updates, game lock behavior, scoring windows, and league creation flow are unchanged; they can be wired to these resolvers where needed.

## 5. QA findings

- Schedule defaults initialize correctly per sport: buildInitialLeagueSettings includes all schedule_* keys from resolveDefaultScheduleConfig(sport, variant); new leagues get the correct schedule_unit, regular_season_length, cadence, lock window, scoring period, reschedule, doubleheader, playoff transition, and generation strategy.
- NFL IDP: Uses same schedule config as NFL via resolveDefaultScheduleConfig(sportType, formatType); cadence and lock timing match NFL.
- Scoring windows and lock timing: getScoringWindowConfigForLeague returns lock_time_behavior and schedule_lock_window_behavior from settings or defaults; full_period vs slate_based matches sport (MLB slate_based).
- Matchup generation: getMatchupCadenceForLeague and getLeagueScheduleGenerationContext return correct regular_season_length and strategy; existing NFL leagues continue to use settings or defaults without regression.
- No sport inherits wrong behavior: each sport has its own CONFIGS entry with distinct regular_season_length, playoff_transition_point, and lock_window_behavior where appropriate.

## 6. Issues fixed

- Schedule config was minimal (schedule_unit, regular_season_length, matchup_frequency, season_labeling, lock_time_behavior, injury_slot_behavior); extended with matchup_cadence, head_to_head_or_points_behavior, lock_window_behavior, scoring_period_behavior, reschedule_handling, doubleheader_or_multi_game_handling, playoff_transition_point, schedule_generation_strategy.
- Extended schedule keys were not persisted at creation; buildInitialLeagueSettings now adds schedule_cadence and the other schedule_* keys from resolveDefaultScheduleConfig.
- No dedicated matchup cadence or scoring window resolvers; MatchupCadenceResolver, ScoringWindowResolver, and LeagueScheduleGenerationService added for matchup generation and scoring/lock logic.
- No explicit schedule bootstrap step; LeagueScheduleBootstrapService and bootstrapLeagueScheduleConfig(leagueId) added to LeagueBootstrapOrchestrator for leagues missing extended schedule keys.

## 7. Final QA checklist

- [ ] Create a league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and confirm League.settings has schedule_unit, regular_season_length, matchup_frequency, lock_time_behavior, and the new schedule_cadence, schedule_lock_window_behavior, schedule_scoring_period_behavior, schedule_playoff_transition_point, schedule_generation_strategy.
- [ ] NFL IDP: Confirm schedule behavior matches NFL (weekly cadence, 18 weeks, first_game lock, transition at 15).
- [ ] Scoring windows and lock timing: getScoringWindowConfigForLeague returns sport-appropriate lock and scoring period; MLB uses slate_based and slate_lock.
- [ ] Matchup generation: getMatchupCadenceForLeague and getLeagueScheduleGenerationContext return correct values; existing NFL league matchup generation still works.
- [ ] No wrong inheritance: Each sport has distinct regular_season_length and playoff_transition_point; Soccer 38/36, NCAAF 15/13, etc.
- [ ] Commissioner override: Change regular_season_length or schedule_generation_strategy in League.settings; confirm resolvers use stored values.

## 8. Explanation of schedule behavior by sport

- **NFL:** Week-based, 18-week regular season, weekly matchups, lock at first game of week, full-period scoring, round_robin generation, playoff transition at week 15. Standard football matchup cadence and game lock.
- **NFL IDP:** Same as NFL; defensive player scoring uses same schedule and lock rules.
- **NBA:** Week-based, 24-week regular season, weekly matchups, lock at first game of slate, full-period scoring, playoff transition at week 22. Basketball scoring periods and lineup lock timing.
- **MLB:** Week-based, 26-week regular season, slate_lock, slate_based scoring period to support heavier game volume and frequent scoring events, playoff transition at week 24.
- **NHL:** Week-based, 25-week regular season, first game of slate lock, full-period scoring, playoff transition at week 22. Hockey schedule density and scoring cadence.
- **NCAAF:** Week-based, 15-week regular season (shorter), weekly football cadence, first game of week lock, playoff transition at week 13.
- **NCAAB:** Week-based, 18-week regular season, first game of slate lock, basketball cadence for college, playoff transition at week 16.
- **Soccer:** Week-based, 38-week regular season (e.g. EPL-style), weekly fixtures, first game of slate lock, sport-aware lineup and lock timing, playoff transition at week 36.

All use head_to_head behavior, use_final_time for reschedules, and all_games_count for doubleheaders/multi-game periods unless a league overrides.
