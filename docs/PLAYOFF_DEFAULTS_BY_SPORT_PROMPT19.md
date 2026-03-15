# Playoff Defaults by Sport (Prompt 19)

## 1. Playoff defaults architecture

- **Single source of truth:** Per-sport playoff defaults live in **DefaultPlayoffConfigResolver** (`lib/sport-defaults/DefaultPlayoffConfigResolver.ts`) in **CONFIGS** and **resolveDefaultPlayoffConfig(sportType, formatType?)**. NFL IDP uses the same playoff config as NFL (variant passed for consistency).
- **Persistence:** At league creation, **buildInitialLeagueSettings(sport, variant)** (via **getDefaultLeagueSettings**) includes **playoff_team_count** and **playoff_structure** in `League.settings`. The structure now includes: playoff_team_count, playoff_weeks, first_round_byes, bracket_type, consolation_plays_for, playoff_start_week, seeding_rules, tiebreaker_rules, bye_rules, matchup_length, total_rounds, consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, championship_length, reseed_behavior. Commissioners can override any of these after creation.
- **Bootstrap:** **LeagueBootstrapOrchestrator** runs **bootstrapLeaguePlayoffConfig(leagueId)** so leagues missing playoff_team_count or playoff_structure get defaults merged without overwriting existing keys.
- **Resolvers:** **PlayoffSeedingResolver** returns seeding and tiebreaker rules for a league. **PlayoffBracketConfigResolver** returns full bracket config (teams, rounds, byes, consolation, championship). **StandingsTiebreakerResolver** returns standings tiebreaker order for seeding and display. Existing standings logic, matchup generation, and elimination handling are unchanged; they can consume these resolvers where needed.

## 2. Per-sport and per-variant playoff preset definitions

| Sport   | playoff_teams | playoff_weeks | start_week | byes | bracket      | consolation | third_place | toilet_bowl | championship_length | reseed   |
|---------|---------------|----------------|------------|------|--------------|-------------|-------------|-------------|----------------------|----------|
| NFL     | 6             | 4              | 15         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |
| NFL IDP | 6             | 4              | 15         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |
| NBA     | 6             | 3              | 22         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |
| MLB     | 6             | 4              | 24         | 2    | single_elim  | none        | false       | false       | 1                    | fixed    |
| NHL     | 6             | 4              | 22         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |
| NCAAF   | 6             | 3              | 13         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |
| NCAAB   | 6             | 3              | 16         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |
| SOCCER  | 6             | 3              | 36         | 2    | single_elim  | pick        | true        | false       | 1                    | fixed    |

All use **seeding_rules: 'standard_standings'**, **tiebreaker_rules: ['points_for', 'head_to_head', 'points_against']**, **bye_rules: 'top_two_seeds_bye'**, **matchup_length: 1**. consolation_bracket_enabled is true when consolation_plays_for !== 'none'.

## 3. Seeding and bracket resolver updates

- **DefaultPlayoffConfigResolver:** Extended **CONFIGS** with playoff_start_week, seeding_rules, tiebreaker_rules, bye_rules, matchup_length, total_rounds, consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, championship_length, reseed_behavior per sport. **resolveDefaultPlayoffConfig(sportType, formatType?)** added.
- **LeagueDefaultSettingsService:** **playoff_structure** in **getDefaultLeagueSettings** now includes all of the above so they are written into **League.settings** at creation.
- **PlayoffSeedingResolver:** **getSeedingRulesForLeague(leagueId)** returns seeding_rules, tiebreaker_rules, bye_rules, reseed_behavior from League.settings or sport defaults.
- **PlayoffBracketConfigResolver:** **getBracketConfigForLeague(leagueId)** returns playoff_team_count, playoff_weeks, playoff_start_week, first_round_byes, bracket_type, matchup_length, total_rounds, consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, championship_length, consolation_plays_for.
- **StandingsTiebreakerResolver:** **getStandingsTiebreakersForLeague(leagueId)** returns standings tiebreaker order from League.settings.standings_tiebreakers or sport defaults (points_for, head_to_head, points_against).

New modules:

- **lib/playoff-defaults/PlayoffDefaultsRegistry.ts** — getPlayoffPreset(sport, variant), re-exports resolveDefaultPlayoffConfig.
- **lib/playoff-defaults/PlayoffPresetResolver.ts** — resolvePlayoffPreset(sport, variant).
- **lib/playoff-defaults/LeaguePlayoffBootstrapService.ts** — bootstrapLeaguePlayoffConfig(leagueId): merge playoff defaults when missing.
- **lib/playoff-defaults/PlayoffSeedingResolver.ts** — getSeedingRulesForLeague(leagueId).
- **lib/playoff-defaults/PlayoffBracketConfigResolver.ts** — getBracketConfigForLeague(leagueId).
- **lib/playoff-defaults/StandingsTiebreakerResolver.ts** — getStandingsTiebreakersForLeague(leagueId).

## 4. Standings and postseason integration updates

- **Config:** Standings and bracket UIs can call **getStandingsTiebreakersForLeague(leagueId)** for tiebreaker order, **getSeedingRulesForLeague(leagueId)** for playoff seeding rules, and **getBracketConfigForLeague(leagueId)** for bracket and consolation settings.
- **Creation payload:** **defaultLeagueSettings** (from getDefaultLeagueSettings) already includes **playoff_team_count** and **playoff_structure** with the extended fields, so the league creation preset API returns full playoff defaults for the selected sport.
- **Commissioner overrides:** League.settings (playoff_team_count, playoff_structure, standings_tiebreakers) are the source of truth; resolvers use stored values when present and fall back to sport defaults.
- Existing standings logic, playoff seeding logic, matchup generation, elimination handling, league settings, and postseason displays are unchanged; they can be wired to these resolvers where needed.

## 5. QA findings

- Playoff defaults initialize correctly per sport: League.settings gets playoff_team_count and playoff_structure (including start_week, seeding, tiebreakers, byes, matchup_length, total_rounds, consolation, third_place, toilet_bowl, championship_length, reseed) from getDefaultLeagueSettings at creation.
- NFL IDP: Uses same postseason defaults as NFL via resolveDefaultPlayoffConfig(sportType, formatType); no separate IDP playoff preset.
- Seeding and tiebreakers: getSeedingRulesForLeague and getStandingsTiebreakersForLeague return correct values from settings or defaults; tiebreaker order is points_for, head_to_head, points_against for all sports.
- Consolation and byes: consolation_bracket_enabled and third_place_game_enabled are set per sport (MLB has consolation disabled); first_round_byes 2 and bye_rules 'top_two_seeds_bye' for all; toilet_bowl_enabled false by default.
- Current NFL standard postseason: buildInitialLeagueSettings and getDefaultLeagueSettings unchanged in flow; only playoff_structure content extended; existing flows still work.

## 6. Issues fixed

- Playoff config was minimal (team_count, weeks, byes, bracket_type, consolation_plays_for); extended with playoff_start_week, seeding_rules, tiebreaker_rules, bye_rules, matchup_length, total_rounds, consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, championship_length, reseed_behavior.
- No variant-aware playoff resolver; resolveDefaultPlayoffConfig(sportType, formatType?) added (NFL IDP same as NFL).
- No dedicated playoff seeding or bracket config resolvers; PlayoffSeedingResolver, PlayoffBracketConfigResolver, and StandingsTiebreakerResolver added for standings and bracket UIs.
- No explicit playoff bootstrap step; LeaguePlayoffBootstrapService and bootstrapLeaguePlayoffConfig(leagueId) added to LeagueBootstrapOrchestrator for leagues missing playoff config.

## 7. Final QA checklist

- [ ] Create a league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) and confirm League.settings has playoff_team_count and playoff_structure with start_week, seeding_rules, tiebreaker_rules, consolation_bracket_enabled, third_place_game_enabled, etc.
- [ ] NFL IDP league: Confirm playoff config matches NFL (6 teams, 4 weeks, start 15, 2 byes, consolation for pick).
- [ ] Seeding and tiebreakers: getSeedingRulesForLeague and getStandingsTiebreakersForLeague return expected values; standings tiebreaker order matches sport defaults when not overridden.
- [ ] Consolation and byes: Consolation bracket and third-place game enabled/disabled per sport; byes and bracket type correct; toilet bowl off by default.
- [ ] Current NFL standard postseason: Verify existing NFL league creation and playoff/standings flows still work; bracket and matchup generation unchanged.
- [ ] Commissioner override: Change playoff_team_count or playoff_structure in League.settings; confirm resolvers use stored values.

## 8. Explanation of playoff defaults by sport

- **NFL:** 6 teams, 4 weeks (weekly rounds), start week 15, 2 byes (top two seeds), single elimination, consolation for draft pick, third-place game, fixed bracket. Aligns with typical fantasy football postseason.
- **NFL IDP:** Same as NFL; standard seeding and tiebreakers.
- **NBA:** 6 teams, 3 weeks, start week 22, 2 byes, single elimination, consolation for pick, third-place game. Shorter playoff to match basketball season flow.
- **MLB:** 6 teams, 4 weeks, start week 24, 2 byes, single elimination, no consolation (typical for baseball), no third-place game. Longer season structure.
- **NHL:** 6 teams, 4 weeks, start week 22, 2 byes, single elimination, consolation for pick, third-place game. Hockey season and playoff timing defaults.
- **NCAAF:** 6 teams, 3 weeks, start week 13, 2 byes, single elimination, consolation for pick, third-place game. Shorter regular season and playoff alignment.
- **NCAAB:** 6 teams, 3 weeks, start week 16, 2 byes, single elimination, consolation for pick, third-place game. College basketball season defaults.
- **Soccer:** 6 teams, 3 weeks, start week 36, 2 byes, single elimination, consolation for pick, third-place game. Supports playoff-enabled league presets; no-playoff leagues can override (e.g. playoff_team_count 0 or bracket disabled) via commissioner settings.

All use standard_standings seeding and points_for → head_to_head → points_against for both standings and playoff tiebreakers unless overridden.
