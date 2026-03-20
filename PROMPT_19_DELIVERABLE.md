# Prompt 19 Deliverable - Playoff Defaults by Sport

Status: COMPLETE
Date: 2026-03-20

## 1. Playoff Defaults Architecture

The playoff defaults system now uses a sport-aware and variant-aware layered model that preserves existing standings, seeding, and bracket flows:

1. Source of truth resolver
- File: lib/sport-defaults/DefaultPlayoffConfigResolver.ts
- Defines playoff defaults by sport and variant overlays (including NFL IDP and Soccer NO_PLAYOFF).

2. Playoff defaults registry facade
- File: lib/playoff-defaults/PlayoffDefaultsRegistry.ts
- Exposes preset resolution and variant discovery helpers for UI/API/QA.

3. Playoff preset resolver
- File: lib/playoff-defaults/PlayoffPresetResolver.ts
- Resolves presets and derives capability metadata and normalized default_* outputs.

4. League bootstrap
- File: lib/playoff-defaults/LeaguePlayoffBootstrapService.ts
- Idempotently backfills missing playoff keys in league settings without overwriting commissioner overrides.

5. Seeding rules resolver
- File: lib/playoff-defaults/PlayoffSeedingResolver.ts
- Resolves seeding/tiebreak/bye/reseed with per-key fallback from stored settings to sport defaults.

6. Bracket config resolver
- File: lib/playoff-defaults/PlayoffBracketConfigResolver.ts
- Resolves teams, rounds, byes, consolation/toilet/third-place/championship length with per-key fallback.

7. Standings tiebreak resolver
- File: lib/playoff-defaults/StandingsTiebreakerResolver.ts
- Resolves standings tie-break order from settings, then playoff structure rules, then sport defaults.

8. Aggregate playoff config resolver
- File: lib/playoff-defaults/PlayoffConfigResolver.ts
- Combines bracket + seeding + standings tiebreak context for downstream API consumers.

## 2. Per-Sport and Per-Variant Playoff Preset Definitions

All presets now provide:
- default_playoff_team_count
- default_playoff_start_point (mapped from playoff_start_week)
- default_seeding_rules
- default_tiebreaker_rules
- default_bye_rules
- default_matchup_length
- default_total_rounds
- default_consolation_bracket_enabled
- default_third_place_game_enabled
- default_toilet_bowl_enabled
- default_championship_length
- default_reseed_behavior

### Core per-sport defaults

NFL
- 6 playoff teams, start week 15, 2 byes, single elimination
- seeding: standard_standings
- tiebreakers: points_for, head_to_head, points_against
- consolation: enabled, third place: enabled

NFL IDP / DYNASTY_IDP
- Uses NFL structure/timing and weekly rounds
- IDP overlay adds division_record to tiebreaker order

NBA
- 6 teams, start week 22, 2 byes, 3-week playoff flow
- consolation + third-place enabled

MLB
- 6 teams, start week 24, 2 byes
- longer flow defaults and no consolation by default

NHL
- 6 teams, start week 22, 2 byes
- consolation + third-place enabled

NCAA Football
- 6 teams, start week 13, shorter regular season alignment
- weekly playoff rounds, consolation enabled

NCAA Basketball
- 6 teams, start week 16
- basketball-style compact postseason defaults

Soccer (STANDARD)
- 6 teams, start week 36, 2 byes
- playoff-enabled default preset

Soccer (NO_PLAYOFF)
- 0 playoff teams, 0 playoff weeks, no byes/consolation/toilet/third-place
- supports no-playoff league presets where applicable

## 3. Seeding and Bracket Resolver Updates

Implemented:

1. PlayoffSeedingResolver
- File: lib/playoff-defaults/PlayoffSeedingResolver.ts
- Switched from all-or-nothing structure use to per-key fallback for:
  - seeding_rules
  - tiebreaker_rules
  - bye_rules
  - reseed_behavior

2. PlayoffBracketConfigResolver
- File: lib/playoff-defaults/PlayoffBracketConfigResolver.ts
- Switched to per-key fallback for all bracket controls.
- Added playoff_start_point alias in response for compatibility with requested naming.

3. PlayoffPresetResolver
- File: lib/playoff-defaults/PlayoffPresetResolver.ts
- Added derived booleans:
  - supportsByes
  - supportsReseed
  - supportsConsolation
- Added normalized default_* output fields.

## 4. Standings and Postseason Integration Updates

Implemented:

1. LeaguePlayoffBootstrapService
- File: lib/playoff-defaults/LeaguePlayoffBootstrapService.ts
- Previously considered playoff settings complete if playoff_team_count and playoff_structure existed.
- Now backfills missing/null keys inside playoff_structure and standings_tiebreakers while preserving existing overrides.

2. StandingsTiebreakerResolver
- File: lib/playoff-defaults/StandingsTiebreakerResolver.ts
- New fallback order:
  1) settings.standings_tiebreakers
  2) settings.playoff_structure.tiebreaker_rules
  3) sport default standings tiebreakers

3. PlayoffDefaultsRegistry
- File: lib/playoff-defaults/PlayoffDefaultsRegistry.ts
- Added:
  - getPlayoffPresetDefinitions
  - getSupportedPlayoffVariantsForSport
- Helps UI/QA consume variant-aware playoff defaults.

No existing standings logic, matchup generation, elimination handling, or league settings flows were removed or rewritten.

## 5. QA Findings

New Prompt 19 test suite added:
- File: __tests__/playoff-defaults-by-sport.test.ts
- Coverage includes:
  - all supported sports have required playoff fields
  - NFL variant discovery includes IDP and DYNASTY_IDP
  - NFL IDP defaults follow NFL postseason behavior
  - Soccer NO_PLAYOFF preset behavior
  - preset resolver default_* mapping
  - bootstrap key-level backfill and idempotency
  - seeding/tiebreaker per-key fallback
  - bracket resolver behavior and playoff_start_point alias

Regression suites executed:
- __tests__/playoff-defaults-by-sport.test.ts
- __tests__/league-creation-sport-initialization-e2e.test.ts
- __tests__/sport-default-league-settings.test.ts
- __tests__/league-create-defaults-api.test.ts

Full-suite validation:
- Test Files: 46 passed
- Tests: 355 passed

## 6. Issues Fixed

1. Playoff bootstrap partial-settings gap
- Existing behavior skipped nested playoff key population once playoff_structure existed.
- Fixed with key-level nested backfill.

2. Resolver all-or-nothing fallback behavior
- Seeding/bracket resolvers could return incomplete config when partial structure existed.
- Fixed with per-key fallback.

3. Standings tie-break source inconsistency
- Standings resolver ignored playoff_structure tiebreakers when standings_tiebreakers missing.
- Fixed with structured fallback order.

4. Missing variant discoverability for playoff presets
- Added variant discovery and preset definition helpers.

5. Missing normalized requested naming
- Added default_* mapped fields in PlayoffPresetResolver and playoff_start_point alias in bracket config.

## 7. Final QA Checklist

- [x] Playoff defaults initialize for NFL, NFL IDP, NBA, MLB, NHL, NCAAF, NCAAB, Soccer.
- [x] NFL IDP uses NFL postseason defaults with IDP-aware tiebreak overlay.
- [x] Seeding/tiebreakers resolve correctly with per-key fallback.
- [x] Byes resolve correctly where enabled.
- [x] Consolation behavior resolves correctly where enabled.
- [x] Soccer supports playoff-enabled and no-playoff preset behavior.
- [x] League bootstrap preserves commissioner overrides while filling missing playoff keys.
- [x] Existing NFL standard postseason flow remains passing in regression.
- [x] Full repository test suite passes after changes.

## 8. Explanation of Playoff Defaults by Sport

Playoff defaults now follow deterministic precedence:

1. Commissioner-set league settings (existing non-null values)
2. Sport + variant playoff defaults for missing/null keys

This preserves league-level customization while ensuring every new or partially configured league gets complete postseason settings (teams, start point, seeding, tiebreakers, byes, rounds, championship length, consolation, and reseed behavior). The result is consistent postseason initialization across all supported sports and variants without breaking existing standings and playoff pipelines.
