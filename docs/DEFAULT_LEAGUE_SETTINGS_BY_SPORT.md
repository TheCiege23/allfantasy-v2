# Default League Settings by Sport

## Overview

Default league settings ensure that when a user creates a league for a given sport (NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball), the league is initialized with the correct sport-specific defaults. Commissioners can override any setting after initialization; the system preserves the sport-specific starting point.

## What Is Defined per Sport

For each sport the system defines defaults for:

| Domain | Fields |
|--------|--------|
| **League** | default_team_count, regular_season_length, playoff_team_count, default_league_name_pattern, default_matchup_unit, default_trade_deadline_logic |
| **Playoff** | playoff_team_count, playoff_weeks, first_round_byes, bracket_type, consolation_plays_for |
| **Schedule** | schedule_unit (week, round, series, slate), regular_season_length, matchup_frequency, season_labeling, lock_time_behavior, injury_slot_behavior |
| **Scoring** | scoring_mode (points/category/roto), scoring_format, category_type |
| **Roster** | roster_mode (redraft/dynasty/keeper), starter_slots, bench_slots, IR/taxi/devy, flex_definitions |
| **Waiver** | waiver_mode, processing_days, FAAB_budget_default |
| **Trade** | trade_review_mode (none, commissioner, league_vote, instant) |
| **Standings** | standings_tiebreakers (e.g. points_for, head_to_head, points_against) |

## Architecture

- **DefaultPlayoffConfigResolver** — Returns `DefaultPlayoffConfig` per sport (playoff_team_count, playoff_weeks, first_round_byes, bracket_type, consolation_plays_for).
- **DefaultScheduleConfigResolver** — Returns `DefaultScheduleConfig` per sport (schedule_unit, regular_season_length, matchup_frequency, season_labeling, lock_time_behavior, injury_slot_behavior).
- **LeagueDefaultSettingsService** — `getDefaultLeagueSettings(sport)` aggregates league, playoff, schedule, waiver, tiebreakers, trade_review into `DefaultLeagueSettings`; `buildInitialLeagueSettings(sport)` returns the JSON object to store in `League.settings`.
- **SportLeaguePresetResolver** — `resolveSportLeaguePreset(leagueSport)` returns full preset (templates) + default league settings + `initialSettingsJson` for UI/API.
- **LeagueCreationInitializer** — `initializeLeagueWithSportDefaults({ leagueId, sport, mergeIfExisting })` applies sport defaults: writes to `League.settings` when empty or when merging, and creates `LeagueWaiverSettings` when missing.

Existing league creation flow is preserved: NFL (and all sports) still use the same create endpoint; new leagues get `League.settings` populated from `buildInitialLeagueSettings(sport)` at create time, and optionally `LeagueCreationInitializer` for waiver settings and for leagues that were created without settings (e.g. imported).

## Per-Sport Preset Summary

| Sport | Regular season | Playoff teams | Schedule unit | Matchup | Lock | Waiver default |
|-------|----------------|---------------|---------------|---------|------|-----------------|
| NFL | 18 weeks | 6 | week | weekly | first_game | FAAB 100 |
| NBA | 24 weeks | 6 | week | weekly | first_game | FAAB 100 |
| MLB | 26 weeks | 6 | week | weekly | slate_lock | FAAB 100 |
| NHL | 25 weeks | 6 | week | weekly | first_game | FAAB 100 |
| NCAAF | 15 weeks | 6 | week | weekly | first_game | FAAB 100 |
| NCAAB | 18 weeks | 6 | week | weekly | first_game | FAAB 100 |

Roster and scoring defaults remain in `SportDefaultsRegistry`; playoff and schedule come from the new resolvers.

## Integration with League Creation

1. **POST /api/league/create** — Accepts optional `sport`. When creating the league, it calls `buildInitialLeagueSettings(sport)` and sets `League.settings` to `{ ...initialSettings, superflex? }`. It then calls `attachRosterConfigForLeague(leagueId, sport, scoring)` and `initializeLeagueWithSportDefaults({ leagueId, sport, mergeIfExisting: false })`. The initializer only writes `League.settings` when the league has no settings (so it does not overwrite the payload we just set); it creates `LeagueWaiverSettings` if missing.
2. **GET /api/sport-defaults?sport=X&load=creation** — Returns `LeagueCreationDefaultsPayload`, which now includes `defaultLeagueSettings` (playoff_team_count, playoff_structure, regular_season_length, matchup_frequency, season_labeling, schedule_unit, waiver_mode, trade_review_mode, standings_tiebreakers, injury_slot_behavior, lock_time_behavior).

Commissioner overrides: any field in `League.settings` can be updated later by commissioner or settings API; the initial values are the sport-specific starting point.

## QA Checklist

- [ ] **NFL league creation** — Create league with sport=NFL (or omit for NFL). League has `settings` with playoff_team_count 6, regular_season_length 18, schedule_unit week, matchup_frequency weekly, lock_time_behavior first_game, injury_slot_behavior ir_or_out, waiver_mode faab, trade_review_mode commissioner, standings_tiebreakers [points_for, head_to_head, points_against].
- [ ] **NBA/MLB/NHL/NCAAF/NCAAB** — Create league for each sport; verify `League.settings` and (when applicable) `LeagueWaiverSettings` reflect that sport’s defaults (e.g. MLB regular_season_length 26, lock_time_behavior slate_lock).
- [ ] **Commissioner override** — After creation, update `League.settings` (e.g. playoff_team_count to 8). Verify override is persisted and not overwritten by any re-run of initializer (merge behavior: initializer only sets settings when empty or when explicitly merging).
- [ ] **Waiver settings** — New league has `LeagueWaiverSettings` with waiverType and faabBudget from waiver defaults when created via initializer.
- [ ] **Preset API** — GET /api/sport-defaults?sport=NBA&load=creation returns `defaultLeagueSettings` in the payload with all fields above.
- [ ] **Existing playoff/matchup logic** — No changes to existing playoff or matchup calculation code; defaults only feed into `League.settings` and waiver settings for new leagues.

## Explanation

Default league settings by sport give every new league a consistent, sport-appropriate starting configuration (team count, season length, playoff structure, schedule unit, matchup and lock behavior, waiver mode, trade review, tiebreakers). The backend owns these defaults; the league creation API applies them automatically when a user selects a sport, and commissioners can override any value after initialization while keeping the rest of the sport-specific baseline intact.
