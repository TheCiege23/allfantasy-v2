# Default Scoring Settings by Sport

## Architecture

- **ScoringDefaultsRegistry** (`lib/scoring-defaults/ScoringDefaultsRegistry.ts`) — In-memory default scoring rules per sport and format. Exposes `getDefaultScoringTemplate(sport, format)` and `getDefaultScoringRules(sport, format)`. Keys are `{sport}-{format}` (e.g. `NFL-PPR`, `NBA-points`, `MLB-standard`).
- **ScoringTemplateResolver** (`lib/multi-sport/ScoringTemplateResolver.ts`) — Resolves template by sport/format: DB first, then **ScoringDefaultsRegistry** for all sports (no more empty rules for non-NFL). `getLeagueScoringRules(leagueId, sport, format)` returns template rules merged with **LeagueScoringOverride**.
- **FantasyPointCalculator** (`lib/scoring-defaults/FantasyPointCalculator.ts`) — `computeFantasyPoints(stats, rules)` and `computeFantasyPointsWithBreakdown(stats, rules)`. Stats are `Record<statKey, number>`; rules are from template or merged with overrides. Used by live scoring, matchup engine, and projections.
- **LeagueScoringBootstrapService** (`lib/scoring-defaults/LeagueScoringBootstrapService.ts`) — `getLeagueScoringTemplate(leagueSport, format?)` and `bootstrapLeagueScoring(leagueId, leagueSport, format?)`. Returns the template DTO for that sport; no DB writes. League creation does not persist scoring templates; defaults are applied at resolution time.
- **ScoringOverrideService** (`lib/scoring-defaults/ScoringOverrideService.ts`) — `getLeagueScoringOverrides(leagueId)`, `upsertLeagueScoringOverrides(leagueId, overrides)`, `mergeRulesWithOverrides(templateRules, overrides)`. Commissioners can override point values and enabled flags per stat.

Existing behavior preserved: NFL scoring engine (lib/engine/scoring.ts) and trade/position multipliers unchanged; matchup scoring and projections use the same rule resolution (template + overrides) and can call `computeFantasyPoints` with normalized stats.

## Per-sport scoring template definitions

| Sport | Format | Notable stat keys |
|-------|--------|-------------------|
| **NFL** | PPR, Half PPR, Standard | passing_yards, passing_td, interception, rushing_yards, rushing_td, receptions, receiving_yards, receiving_td, fumble_lost, two_pt_*, fg_*, pat_*, dst_* |
| **NBA** | points | points, rebounds, assists, steals, blocks, turnovers, three_pointers_made, double_double, triple_double |
| **MLB** | standard | single, double, triple, home_run, rbi, run, walk, stolen_base, hit_by_pitch, strikeout, innings_pitched, earned_runs, strikeouts_pitched, save, hold, win, loss, quality_start |
| **NHL** | standard | goal, assist, shot_on_goal, blocked_shot, power_play_point, short_handed_point, save, goal_allowed, win, loss, shutout |
| **NCAAF** | PPR, standard | Same as NFL (passing/rushing/receiving, K, DST) |
| **NCAAB** | points, standard | Same as NBA |

Templates are identified by `template_id` (e.g. `default-NFL-PPR`, `default-NBA-points`). Each rule has `statKey`, `pointsValue`, `multiplier`, `enabled`.

## Backend scoring resolution logic

1. **Template:** `getScoringTemplate(sportType, formatType)` → DB `ScoringTemplate` by (sportType, formatType) if present; else `getDefaultScoringTemplate(sport, format)` from ScoringDefaultsRegistry.
2. **Effective rules for a league:** `getLeagueScoringRules(leagueId, sportType, formatType)` → template rules, then overlay `LeagueScoringOverride` by statKey (pointsValue, enabled). Multiplier comes from template when not overridden.
3. **Points calculation:** `computeFantasyPoints(stats, rules)` where `stats` keys match rule `statKey`. Normalize external stat keys (e.g. from Sleeper/ESPN) to these keys in the stats pipeline before calling.

## Matchup and projection integration

- **Matchup engine:** Resolve rules with `getLeagueScoringRules(leagueId, sport, format)` (or `resolveScoringRulesForLeague(leagueId, leagueSport, format)`). For each player, build a `PlayerStatsRecord` from the box score using the same stat keys; call `computeFantasyPoints(stats, rules)`.
- **Projections pipeline:** Same: resolve rules once per league/sport, then apply `computeFantasyPoints(projectedStats, rules)` per player. Player stat normalization (e.g. mapping API field names to our statKey) should live in the stats ingestion layer so one canonical set of keys is used for both live and projected scoring.
- **AI / recommendations:** Use `getScoringTemplateForSport(leagueSport)` or `getLeagueScoringRules(leagueId, ...)` to expose scoring context (e.g. “PPR”, “6pt pass TD”) so AI can reason about scoring.

## QA checklist

- [ ] **New league loads correct default scoring by sport** — Create league for each sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB); confirm `getScoringTemplate(sport, format)` returns non-empty rules and template id matches `default-{sport}-{format}` when no DB template exists.
- [ ] **League overrides** — Save overrides via `upsertLeagueScoringOverrides`; confirm `getLeagueScoringRules` returns merged values and live/display use overridden points.
- [ ] **Scoring engine resolves correct template during live scoring** — When computing points for a matchup, rules come from `getLeagueScoringRules`; `computeFantasyPoints(stats, rules)` matches expected totals for known stat lines.
- [ ] **Matchup engine compatibility** — No regression: existing NFL matchup and trade engine (position multipliers, PPR/TEP/SF) still behave as before.
- [ ] **AI recommendations** — Scoring context (template name or key rules) is available for AI endpoints that need league scoring.

## Explanation of default scoring settings by sport

- **NFL:** PPR default (1 pt per reception); Half PPR (0.5); Standard (0). Passing 0.04 per yard, 4 pt TD, -2 INT; rushing/receiving 0.1 per yard, 6 pt TD; K and DST tiers (FG distance, PAT, points allowed, sacks, turnovers, etc.).
- **NBA:** Points-style: 1 pt per point, 1.2 reb, 1.5 ast, 3 stl/blk, -1 TO, 0.5 for 3PM; double-double/triple-double bonuses.
- **MLB:** Standard batter (1B/2B/3B/HR, RBI, R, BB, SB, HBP, -0.5 K) and pitcher (IP, ER, K, SV, HLD, W, L, QS).
- **NHL:** Goals 3, assists 2, SOG/blocked 0.5, PPP 1, SHP 2; goalies: saves 0.6, GA -3, W 5, L -3, shutout 3.
- **NCAA Football:** Same structure as NFL (college differences can be added via format variants or league overrides).
- **NCAA Basketball:** Same structure as NBA (college differences configurable via overrides).
