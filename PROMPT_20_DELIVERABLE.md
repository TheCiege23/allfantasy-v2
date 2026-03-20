# Prompt 20 Deliverable - Schedule Behavior by Sport

Status: COMPLETE
Date: 2026-03-20

## 1. Schedule Defaults Architecture

The schedule behavior system now follows a sport-aware, variant-aware layered architecture while preserving existing matchup generation and standings flows:

1. Source resolver
- File: lib/sport-defaults/DefaultScheduleConfigResolver.ts
- Canonical schedule behavior defaults per sport.

2. Schedule defaults registry facade
- File: lib/schedule-defaults/ScheduleDefaultsRegistry.ts
- Exposes schedule preset resolution and variant discovery helpers.

3. Preset resolver
- File: lib/schedule-defaults/SchedulePresetResolver.ts
- Resolves presets and emits normalized default_* fields and capability context.

4. League bootstrap
- File: lib/schedule-defaults/LeagueScheduleBootstrapService.ts
- Idempotently backfills missing schedule keys and preserves commissioner overrides.

5. Cadence resolver
- File: lib/schedule-defaults/MatchupCadenceResolver.ts
- Resolves unit/frequency/cadence/strategy with per-key fallback.

6. Scoring window resolver
- File: lib/schedule-defaults/ScoringWindowResolver.ts
- Resolves lock/scoring/reschedule/doubleheader behavior with per-key fallback.

7. Schedule generation context
- File: lib/schedule-defaults/LeagueScheduleGenerationService.ts
- Provides generation bounds/strategy/transition point with per-key fallback.

8. Aggregate config resolver
- File: lib/schedule-defaults/ScheduleConfigResolver.ts
- Combines cadence + scoring window + generation context for API/UI use.

## 2. Per-Sport and Per-Variant Schedule Preset Definitions

All presets support:
- default_schedule_unit
- default_regular_season_length
- default_matchup_cadence
- default_head_to_head_or_points_behavior
- default_lock_window_behavior
- default_scoring_period_behavior
- default_reschedule_handling
- default_doubleheader_or_multi-game handling
- default_playoff_transition_point
- default_schedule_generation_strategy

Per-sport defaults:
- NFL: weekly cadence, week unit, first_game_of_week lock window, full_period scoring window.
- NFL IDP/DYNASTY_IDP: follows NFL cadence/timing/lock expectations.
- NBA: weekly cadence with first_game_of_slate lock window.
- MLB: weekly cadence with slate_lock and slate_based scoring behavior for dense game volume.
- NHL: weekly cadence with first_game_of_slate lock window.
- NCAAF: weekly cadence with shorter season length.
- NCAAB: basketball cadence adapted for college season length.
- Soccer: weekly cadence and sport-aware lock timing.

Variant support helpers added:
- getSchedulePresetDefinitions
- getSupportedScheduleVariantsForSport

## 3. Backend Schedule and Cadence Resolver Updates

Implemented updates:

1. ScheduleDefaultsRegistry
- Added variant discoverability and preset enumeration helpers.

2. SchedulePresetResolver
- Added normalized default_* output fields:
  - default_schedule_unit
  - default_regular_season_length
  - default_matchup_cadence
  - default_head_to_head_or_points_behavior
  - default_lock_window_behavior
  - default_scoring_period_behavior
  - default_reschedule_handling
  - default_doubleheader_or_multi_game_handling
  - default_playoff_transition_point
  - default_schedule_generation_strategy

3. LeagueScheduleBootstrapService
- Previous behavior: no-op if any schedule key existed.
- New behavior: key-level backfill for missing/null keys (including schedule_unit, matchup_frequency, regular_season_length and schedule behavior keys).

4. MatchupCadenceResolver
- Added per-key fallback helper for partial settings.
- Added head_to_head_behavior in resolver output.

5. ScoringWindowResolver
- Added per-key fallback helper for partial settings.

6. LeagueScheduleGenerationService
- Added per-key fallback helper.
- Added schedule_cadence to generation context output.

7. ScheduleConfigResolver
- Added schedule_cadence in aggregate response.
- Uses cadence resolver head_to_head behavior fallback.

## 4. Matchup and Scoring Window Integration Updates

Integration remains non-breaking:

- Existing matchup generation service interfaces are preserved.
- Existing schedule API wiring remains unchanged and now receives richer fallback-safe values.
- Existing league creation/bootstrap flow continues to call schedule bootstrap.
- Existing standings and season timeline behavior are preserved; only missing config completion behavior changed.

No destructive changes were made to existing matchup records, generation pipelines, or standings persistence.

## 5. QA Findings

New Prompt 20 suite added:
- File: __tests__/schedule-defaults-by-sport.test.ts
- Coverage includes:
  - all sports schedule default fields
  - NFL variant discovery and IDP cadence parity
  - sport-specific lock/scoring window differences
  - normalized default_* mapping in preset resolver
  - bootstrap key-level backfill and idempotency
  - per-key fallback in cadence/scoring/generation resolvers
  - aggregate schedule config behavior

Regression suites run:
- __tests__/schedule-defaults-by-sport.test.ts
- __tests__/league-creation-sport-initialization-e2e.test.ts
- __tests__/multi-sport-schedule-resolver.test.ts
- __tests__/sport-default-league-settings.test.ts

Full-suite validation result:
- Test Files: 47 passed
- Tests: 364 passed

## 6. Issues Fixed

1. Bootstrap partial-settings gap
- Existing schedule bootstrap skipped all updates when any schedule key existed.
- Fixed with key-level backfill behavior.

2. Resolver partial-fallback gaps
- Cadence/scoring/generation resolvers could emit incomplete behavior when settings were partially configured.
- Fixed with per-key fallback in each resolver.

3. Missing schedule variant discoverability
- Added schedule preset definition and supported variant helpers.

4. Missing normalized output contract
- Added default_* mapped fields in SchedulePresetResolver.
- Added schedule_cadence in aggregate schedule config.

## 7. Final QA Checklist

- [x] Schedule defaults initialize correctly for NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, Soccer.
- [x] NFL IDP follows NFL cadence and schedule timing.
- [x] Scoring windows and lock timing match sport defaults.
- [x] Matchup generation context remains stable for existing NFL leagues.
- [x] No sport inherits the wrong schedule behavior in tested resolver outputs.
- [x] League bootstrap preserves commissioner overrides and only fills missing schedule keys.
- [x] Full repository regression suite passes.

## 8. Explanation of Schedule Behavior by Sport

Schedule behavior now follows deterministic precedence:

1. Existing commissioner-configured league settings (non-null values)
2. Sport + variant defaults for missing keys

This gives each league correct sport-aware cadence, lock windows, scoring periods, and generation strategy at initialization while preserving existing override behavior and preventing cross-sport schedule leakage.
