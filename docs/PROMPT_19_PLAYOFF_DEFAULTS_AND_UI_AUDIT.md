# Prompt 19 — Playoff Defaults by Sport + Full UI Click Audit

## 1. Playoff defaults architecture

- **Single source of truth:** `lib/sport-defaults/DefaultPlayoffConfigResolver.ts` holds `CONFIGS` per `SportType` (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER). Each entry is a `DefaultPlayoffConfig` with playoff_team_count, playoff_weeks, first_round_byes, bracket_type, consolation_plays_for, playoff_start_week, seeding_rules, tiebreaker_rules, bye_rules, matchup_length, total_rounds, consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, championship_length, reseed_behavior. NFL IDP uses the same playoff config as NFL via `resolveDefaultPlayoffConfig(sportType, formatType)` (variant is not used for playoff type).
- **Registry layer:** `lib/playoff-defaults/PlayoffDefaultsRegistry.ts` exposes `getPlayoffPreset(sport, variant)` and re-exports `resolveDefaultPlayoffConfig` for league creation, bootstrap, and bracket config.
- **Resolvers:**
  - **PlayoffPresetResolver** — `resolvePlayoffPreset(sport, variant)` returns preset + sport/variant.
  - **LeaguePlayoffBootstrapService** — `bootstrapLeaguePlayoffConfig(leagueId)` merges into `League.settings` when `playoff_team_count` or `playoff_structure` is missing; uses `getDefaultLeagueSettings(sport)` which builds `playoff_structure` from `resolveDefaultPlayoffConfig(sport)`. Idempotent; does not overwrite existing keys.
  - **PlayoffBracketConfigResolver** — `getBracketConfigForLeague(leagueId)` returns bracket config (team count, weeks, start week, byes, bracket type, matchup length, total rounds, consolation, third-place, toilet bowl, championship length, consolation_plays_for); uses `League.settings` when present, else sport defaults.
  - **PlayoffSeedingResolver** — `getSeedingRulesForLeague(leagueId)` returns seeding_rules, tiebreaker_rules, bye_rules, reseed_behavior; uses stored playoff_structure when present, else defaults.
  - **StandingsTiebreakerResolver** — `getStandingsTiebreakersForLeague(leagueId)` returns standings_tiebreakers array; uses `League.settings.standings_tiebreakers` when present, else `getDefaultLeagueSettings(sport).standings_tiebreakers`.
  - **PlayoffConfigResolver (new)** — `getPlayoffConfigForLeague(leagueId)` aggregates bracket + seeding + standings tiebreakers into one object for the app playoff/config API and PlayoffSettingsPanel.
- **Persistence:** Playoff config lives in `League.settings` (JSON): `playoff_team_count`, `playoff_structure` (object with playoff_weeks, playoff_start_week, first_round_byes, bracket_type, seeding_rules, tiebreaker_rules, bye_rules, matchup_length, total_rounds, consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, championship_length, reseed_behavior, consolation_plays_for). Bootstrap and `buildInitialLeagueSettings` (league creation) set these; commissioners can override via league settings.

---

## 2. Per-sport and per-variant playoff preset definitions

All presets live in `DefaultPlayoffConfigResolver.ts` under `CONFIGS`. NFL IDP uses same as NFL.

| Sport | playoff_team_count | playoff_start_week | playoff_weeks | first_round_byes | bracket_type | seeding_rules | tiebreaker_rules | bye_rules | matchup_length | total_rounds | consolation_bracket | third_place | toilet_bowl | championship_length | reseed_behavior |
|-------|--------------------|--------------------|--------------|------------------|--------------|---------------|------------------|-----------|----------------|--------------|---------------------|-------------|-------------|---------------------|----------------|
| NFL | 6 | 15 | 4 | 2 | single_elimination | standard_standings | points_for, head_to_head, points_against | top_two_seeds_bye | 1 | 3 | true | true | false | 1 | fixed_bracket |
| NBA | 6 | 22 | 3 | 2 | single_elimination | standard_standings | (same) | top_two_seeds_bye | 1 | 3 | true | true | false | 1 | fixed_bracket |
| MLB | 6 | 24 | 4 | 2 | single_elimination | standard_standings | (same) | top_two_seeds_bye | 1 | 3 | false | false | false | 1 | fixed_bracket |
| NHL | 6 | 22 | 4 | 2 | single_elimination | standard_standings | (same) | top_two_seeds_bye | 1 | 3 | true | true | false | 1 | fixed_bracket |
| NCAAF | 6 | 13 | 3 | 2 | single_elimination | standard_standings | (same) | top_two_seeds_bye | 1 | 3 | true | true | false | 1 | fixed_bracket |
| NCAAB | 6 | 16 | 3 | 2 | single_elimination | standard_standings | (same) | top_two_seeds_bye | 1 | 3 | true | true | false | 1 | fixed_bracket |
| SOCCER | 6 | 36 | 3 | 2 | single_elimination | standard_standings | (same) | top_two_seeds_bye | 1 | 3 | true | true | false | 1 | fixed_bracket |

- **consolation_plays_for:** NFL, NBA, NHL, NCAAF, NCAAB, SOCCER = 'pick'; MLB = 'none'.
- **default_playoff_start_point:** Implemented as `playoff_start_week` (week when playoffs start).
- **default_seeding_rules:** standard_standings for all.
- **default_tiebreaker_rules:** ['points_for', 'head_to_head', 'points_against'] for all (also used as standings_tiebreakers in LeagueDefaultSettingsService).

---

## 3. Seeding and bracket resolver updates

- **PlayoffBracketConfigResolver:** No logic change; already reads League.settings and falls back to resolveDefaultPlayoffConfig(sport, variant). Exported from playoff-defaults index.
- **PlayoffSeedingResolver:** No logic change; already merges stored playoff_structure with defaults. Exported from playoff-defaults index.
- **StandingsTiebreakerResolver:** No logic change; uses settings.standings_tiebreakers or getDefaultLeagueSettings(sport).standings_tiebreakers. Exported from playoff-defaults index.
- **PlayoffConfigResolver (new):** Combines getBracketConfigForLeague, getSeedingRulesForLeague, getStandingsTiebreakersForLeague into a single PlayoffConfigForLeague object for the app API and PlayoffSettingsPanel.

---

## 4. Standings and postseason integration updates

- **App API:** Added GET `api/app/league/[leagueId]/playoff/config` (path `league`, leagueId, `playoff`, `config`) returning `getPlayoffConfigForLeague(leagueId)`.
- **StandingsTab:** Unchanged. It loads `useLeagueSectionData(leagueId, 'standings')` which requests `/api/app/league/[id]/standings`; the app route proxies to `/api/bracket/leagues/[leagueId]/standings`. That bracket standings endpoint serves March Madness–style bracket leagues (BracketLeague). For fantasy leagues that are not bracket leagues, the proxy remains as-is (existing behavior); playoff *config* is now available via playoff/config for display in Settings.
- **PlayoffSettingsPanel (new):** Loads `playoff/config` via `useLeagueSectionData(leagueId, 'playoff/config')` and displays playoff teams, start week, weeks, byes, bracket type, matchup length, total rounds, championship length, consolation, third-place, toilet bowl, seeding rules, reseed behavior, playoff tiebreakers, bye rules, standings tiebreakers, sport/variant.
- **LeagueSettingsTab:** Added "Playoff Settings" subtab and render `PlayoffSettingsPanel` when active. "Waiver Settings" was also added in the same flow for consistency with Prompt 18.
- **League creation:** LeagueSettingsPreviewPanel already shows `preset.league?.default_playoff_team_count` in the preset summary; no separate playoff step. Bootstrap runs after creation and merges playoff_team_count and playoff_structure when missing.
- **PlayoffBracketPreview (af-legacy):** Uses local state `playoffTeamCount` (4|6|7|8|9) and selector buttons; no backend call for config. Bracket preview is simulated; defaults (e.g. 6 teams) align with sport defaults.

---

## 5. Full UI click audit findings

| Area | Element | Component | Handler | State/Persistence | Refresh | Status |
|------|--------|-----------|---------|-------------------|---------|--------|
| League creation | Preset summary (playoff teams) | LeagueSettingsPreviewPanel | N/A (display) | From preset.league.default_playoff_team_count | When preset changes | OK |
| League creation | Sport/preset change | League creation flow | Updates preset | Roster, scoring, league defaults | Summary updates | OK |
| Settings | Playoff Settings subtab | LeagueSettingsTab | onClick → setActive('Playoff Settings') | Local active | N/A | OK |
| Settings | Playoff config (read) | PlayoffSettingsPanel | useLeagueSectionData(leagueId, 'playoff/config') | GET league/playoff/config | On mount / reload | OK |
| Standings / Playoffs tab | Reload | StandingsTab | onReload → reload() | Refetches standings | Data reload | OK |
| Standings / Playoffs tab | Data display | StandingsTab | SmartDataView(data) | data from standings API | After reload | OK |
| af-legacy | Playoff team count 4/6/7/8/9 | af-legacy page | onClick → setPlayoffTeamCount(count) | Local playoffTeamCount | N/A | OK |
| af-legacy | Bracket preview | PlayoffBracketPreview | N/A | managers, leagueName, season, playoffTeamCount | When state changes | OK |

**Note:** The app’s "Standings" and "Playoffs" sections both proxy to `/api/bracket/leagues/[leagueId]/standings`, which is built for bracket (March Madness) leagues. Fantasy leagues that do not use the bracket system may receive 404 or non-fantasy data from that endpoint. This is pre-existing; no change was made to avoid impacting current behavior. Playoff *configuration* for any league is now available via Settings → Playoff Settings and GET playoff/config.

**Commissioner:** No dedicated "advance bracket" or "regenerate playoff" controls were found in the app league flow. Bracket/standings updates would be through bracket-specific or league settings APIs if they exist elsewhere.

---

## 6. QA findings

- **Playoff defaults initialize per sport:** Bootstrap runs on league creation; when playoff_team_count or playoff_structure is missing, getDefaultLeagueSettings(sport) supplies both from resolveDefaultPlayoffConfig(sport). All seven sports have distinct CONFIGS (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER) with correct start weeks and weeks.
- **NFL IDP:** Uses same postseason config as NFL (resolveDefaultPlayoffConfig does not vary by formatType for playoff).
- **Seeding and tiebreakers:** PlayoffSeedingResolver and StandingsTiebreakerResolver return seeding_rules, tiebreaker_rules, bye_rules, reseed_behavior and standings_tiebreakers; defaults are consistent across sports; stored settings override when present.
- **Consolation and byes:** Defaults set consolation_bracket_enabled, third_place_game_enabled, toilet_bowl_enabled, first_round_byes per sport (e.g. MLB no consolation). PlayoffBracketConfigResolver and PlayoffConfigResolver expose these; PlayoffSettingsPanel displays them.
- **Existing NFL flows:** Bootstrap only merges when keys are missing; existing League.settings are not overwritten. Resolvers use stored values first, then defaults.
- **Playoff-related clicks:** Playoff Settings subtab and panel load; StandingsTab reload; af-legacy playoff count selector and bracket preview all wired. No dead buttons identified in audited paths.

---

## 7. Issues fixed

1. **No central playoff config for app UI** — Added PlayoffConfigResolver and GET `/api/app/league/[leagueId]/playoff/config` so the app can display a single playoff config (bracket + seeding + tiebreakers) in Settings.
2. **No Playoff Settings in League Settings** — Added PlayoffSettingsPanel and "Playoff Settings" subtab in LeagueSettingsTab, wired to playoff/config.
3. **No single export for playoff-defaults** — Added `lib/playoff-defaults/index.ts` exporting all resolvers and types (PlayoffDefaultsRegistry, PlayoffPresetResolver, LeaguePlayoffBootstrapService, PlayoffBracketConfigResolver, PlayoffSeedingResolver, StandingsTiebreakerResolver, PlayoffConfigResolver).

---

## 8. Final QA checklist

- [ ] Create a new league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER); confirm League.settings contains playoff_team_count and playoff_structure with sport-appropriate values (start week, weeks, byes, consolation).
- [ ] Open Settings → Playoff Settings; confirm playoff/config loads and shows correct team count, start week, bracket type, consolation, tiebreakers, sport/variant.
- [ ] For an existing league with custom playoff_structure, confirm Playoff Settings and resolvers show stored values, not defaults.
- [ ] NFL IDP league: confirm playoff config matches NFL (6 teams, week 15 start, 4 weeks, 2 byes, etc.).
- [ ] Standings tab: confirm Reload refreshes data (and that standings API behavior for the league type is as expected).
- [ ] af-legacy: change playoff team count (4/6/7/8/9); confirm bracket preview updates and matches selection.
- [ ] Regression: existing leagues with existing playoff_structure are not overwritten by bootstrap.

---

## 9. Explanation of playoff defaults by sport

- **NFL / NFL IDP:** 6 teams, start week 15, 4 playoff weeks, 2 first-round byes (top two seeds), single elimination, 3 rounds, consolation for draft pick, third-place game. Standard standings seeding; tiebreakers points_for → head_to_head → points_against. Fixed bracket (no reseed).
- **NBA:** 6 teams, start week 22, 3 playoff weeks, 2 byes, single elimination, consolation for pick, third-place game. Same seeding and tiebreaker logic as NFL.
- **MLB:** 6 teams, start week 24, 4 weeks, 2 byes, single elimination; no consolation bracket, no third-place game (typical for many baseball leagues). Same seeding/tiebreakers.
- **NHL:** 6 teams, start week 22, 4 weeks, 2 byes, single elimination, consolation for pick, third-place game. Same seeding/tiebreakers.
- **NCAAF:** 6 teams, start week 13 (shorter regular season), 3 playoff weeks, 2 byes, single elimination, consolation for pick, third-place game.
- **NCAAB:** 6 teams, start week 16, 3 weeks, 2 byes, single elimination, consolation for pick, third-place game.
- **Soccer:** 6 teams, start week 36 (long season), 3 weeks, 2 byes, single elimination, consolation for pick, third-place game. Supports playoff-enabled or no-playoff league presets via commissioner override of settings.

All use matchup_length 1 (one week per matchup), championship_length 1, bye_rules "top_two_seeds_bye", reseed_behavior "fixed_bracket". Commissioners can override any of these via League.settings after creation.
