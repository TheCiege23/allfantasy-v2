# Multi-Sport Scoring Engine & Schedule/Stats Pipeline (Prompt 3)

This document describes the **multi-sport scoring**, **schedule**, and **stats** pipeline in AllFantasy. NFL scoring, matchup, and projection behavior is preserved; the system supports NHL, MLB, NBA, NCAA Football, NCAA Basketball, and Soccer.

---

## 1. Multi-Sport Scoring Architecture

### 1.1 Overview

- **ScoringTemplate** (DB) and **ScoringDefaultsRegistry** (in-memory) define **scoring rules** per `(sport_type, format_type)`.
- **LeagueScoringOverride** (DB) stores per-league overrides for specific stat keys (points_value, enabled).
- **ScoringTemplateResolver** returns the effective template (DB or default). **MultiSportScoringResolver** adds league overrides via **getLeagueScoringRules(leagueId, sportType, formatType)**.
- **FantasyPointCalculator** computes fantasy points from a **PlayerStatsRecord** (keyed by canonical stat keys) and a list of **ScoringRuleDto** (statKey, pointsValue, multiplier, enabled).
- **StatNormalizationService** maps provider/feed stat keys to canonical keys (e.g. `pass_yd` → `passing_yards`) so raw stats can be scored with the same templates.

### 1.2 Flow

1. **League setup:** League is tied to a sport (and optional format, e.g. IDP). Scoring template is resolved by `(sport, format)`; league overrides are applied when present.
2. **Stats ingestion:** Raw stats (e.g. from box scores) are normalized by sport via **StatNormalizationService**, then stored in **PlayerGameStat** with `normalizedStatMap` and optionally precomputed `fantasyPoints` (if scoring rules are known at ingest time).
3. **Matchup/live scoring:** **MultiSportMatchupScoringService** uses **getLeagueScoringRules** and **FantasyPointCalculator** to compute roster totals from **PlayerGameStat** for a given week/round.
4. **Projections:** **ProjectionSeedResolver** provides scoring rules and schedule context (week/round, total weeks) by sport so projection and simulation engines use the correct scoring and period semantics.

### 1.3 Preserved NFL Behavior

- Existing **ScoringDefaultsRegistry** NFL PPR / Half PPR / Standard and NFL IDP rules are unchanged.
- **WeeklyMatchup** and **TeamPerformance** (Sleeper sync) continue to store points; **MultiSportMatchupScoringService** is an additional path when **PlayerGameStat** is populated (e.g. future live scoring from our pipeline).
- **lib/engine/scoring.ts** trade scoring adjustments (PPR, TEP, SF, etc.) remain for trade/rankings; fantasy point calculation for matchups uses the same canonical stat keys and **FantasyPointCalculator**.

---

## 2. Schema Additions for Scoring, Schedules, and Stats

### 2.1 Scoring (Existing)

- **ScoringTemplate:** id, sportType, name, formatType. Unique on (sportType, formatType).
- **ScoringRule:** templateId, statKey, pointsValue, multiplier, enabled.
- **LeagueScoringOverride:** leagueId, statKey, pointsValue, enabled. Unique on (leagueId, statKey).

No schema changes were required for scoring; the above already match the requested structure (scoring_template_id ↔ id, format_type ↔ formatType, etc.).

### 2.2 Schedule and Stats (New)

**GameSchedule**

| Field         | Type     | Description                          |
|---------------|----------|--------------------------------------|
| id            | String   | PK                                   |
| sportType     | String   | NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER |
| season        | Int      | Season year                          |
| weekOrRound   | Int      | Week or round number                 |
| externalId    | String   | Provider game ID (required for unique) |
| homeTeamId    | String?  | Home team identifier                 |
| awayTeamId    | String?  | Away team identifier                 |
| homeTeam      | String?  | Home team abbreviation/name        |
| awayTeam      | String?  | Away team abbreviation/name          |
| startTime     | DateTime?| Game start                           |
| status        | String   | e.g. scheduled, in_progress, final   |

Unique on (sportType, season, weekOrRound, externalId). Indexes: (sportType, season, weekOrRound), (sportType, season).

**PlayerGameStat**

| Field             | Type   | Description                                  |
|-------------------|--------|----------------------------------------------|
| id                | String | PK                                           |
| playerId          | String | Player identifier                            |
| sportType         | String | Sport                                        |
| gameId            | String | Game identifier (e.g. GameSchedule.id or external) |
| season            | Int    | Season year                                  |
| weekOrRound       | Int    | Week/round                                   |
| statPayload       | Json   | Raw stats from provider                      |
| normalizedStatMap | Json   | Canonical stat keys → values                 |
| fantasyPoints     | Float  | Precomputed or 0                             |
| updatedAt         | DateTime | Last update                               |

Unique on (playerId, sportType, gameId). Indexes: (sportType, season, weekOrRound), (playerId, sportType, season).

**TeamGameStat**

| Field       | Type   | Description           |
|-------------|--------|-----------------------|
| id          | String | PK                    |
| sportType   | String | Sport                 |
| gameId      | String | Game identifier       |
| teamId      | String | Team identifier       |
| season      | Int    | Season year           |
| weekOrRound | Int    | Week/round            |
| statPayload | Json   | Team-level stats      |
| updatedAt   | DateTime | Last update        |

Unique on (sportType, gameId, teamId). Index: (sportType, season, weekOrRound).

**StatIngestionJob**

| Field         | Type     | Description        |
|---------------|----------|--------------------|
| id            | String   | PK                 |
| sportType     | String   | Sport              |
| season        | Int      | Season             |
| weekOrRound   | Int?     | Optional week/round |
| source        | String   | Provider name      |
| status        | String   | e.g. running, done, failed |
| startedAt     | DateTime | Start time         |
| completedAt   | DateTime?| End time           |
| gameCount     | Int      | Games processed    |
| statCount     | Int      | Stats processed    |
| errorMessage  | String?  | Error if failed    |

Indexes: (sportType, season), (status, startedAt).

---

## 3. Backend Calculation and Normalization Services

### 3.1 ScoringTemplateResolver

**Location:** `lib/multi-sport/ScoringTemplateResolver.ts`

- **getScoringTemplate(sportType, formatType)**  
  Returns **ScoringTemplateDto** (templateId, sportType, name, formatType, rules). Uses DB **ScoringTemplate** + **ScoringRule** if present; otherwise **ScoringDefaultsRegistry.getDefaultScoringTemplate(sport, format)**.
- **getLeagueScoringRules(leagueId, sportType, formatType)**  
  Returns **ScoringRuleDto[]** with league overrides applied (from **LeagueScoringOverride**).

### 3.2 FantasyPointCalculator

**Location:** `lib/scoring-defaults/FantasyPointCalculator.ts`

- **computeFantasyPoints(stats, rules)**  
  Sums `value * pointsValue * multiplier` for each rule whose statKey exists in stats and is enabled. Returns total rounded to 2 decimals.
- **computeFantasyPointsWithBreakdown(stats, rules)**  
  Same plus a per-stat breakdown object.

Stat keys in `stats` must match **ScoringRuleDto.statKey** (canonical keys from **ScoringDefaultsRegistry**).

### 3.3 StatNormalizationService

**Location:** `lib/schedule-stats/StatNormalizationService.ts`

- **normalizeStatPayload(sportType, rawPayload)**  
  Maps provider aliases (e.g. pass_yd, pts, reb) to canonical keys (passing_yards, points, rebounds) per sport. Returns a single object with canonical keys; unknown keys are passed through. Used before storing **PlayerGameStat.normalizedStatMap** or before calling **FantasyPointCalculator**.

### 3.4 ScheduleIngestionService

**Location:** `lib/schedule-stats/ScheduleIngestionService.ts`

- **upsertGameSchedule(input)**  
  Upserts a **GameSchedule** row by (sportType, season, weekOrRound, externalId). Input includes home/away team ids/names, startTime, status.
- **listGameSchedules(sportType, season, weekOrRound?)**  
  Returns games for a sport/season, optionally filtered by week/round.

### 3.5 MultiSportMatchupScoringService

**Location:** `lib/multi-sport/MultiSportMatchupScoringService.ts`

- **computeRosterScoreForWeek(input)**  
  Input: leagueId, leagueSport, season, weekOrRound, rosterPlayerIds, optional starterPlayerIds, optional formatType. Fetches **PlayerGameStat** for those players in that period, gets league scoring rules via **resolveScoringRulesForLeague**, and sums fantasy points (using stored fantasyPoints or recomputing from normalizedStatMap). Returns totalPoints, byPlayerId, usedPlayerIds.
- **computePlayerFantasyPoints(leagueId, leagueSport, stats, formatType?)**  
  Computes fantasy points for a single player’s stats object using league scoring rules.

### 3.6 ProjectionSeedResolver

**Location:** `lib/multi-sport/ProjectionSeedResolver.ts`

- **resolveProjectionSeed(input)**  
  Input: leagueSport, season, weekOrRound, optional leagueId, optional formatType. Returns **ProjectionSeed**: sportType, season, weekOrRound, totalWeeksOrRounds, label (week | round), scoringRules (template rules), templateId. Uses **getScoringTemplateForSport** and **resolveScheduleContext** (MultiSportScheduleResolver). Use when building projection or simulation inputs so they are sport-aware.

### 3.7 MultiSportScheduleResolver

**Location:** `lib/multi-sport/MultiSportScheduleResolver.ts`

- **resolveScheduleContext(leagueSport, season, currentWeekOrRound)**  
  Returns total weeks/rounds and label (week vs round) per sport. **SOCCER** added with 38 rounds; NFL 18, NCAAF 15, NBA 24, NCAAB 18, MLB 26, NHL 25.

---

## 4. Matchup Integration Updates

### 4.1 Existing Matchup Data

- **WeeklyMatchup:** leagueId, seasonYear, week, rosterId, matchupId, pointsFor, pointsAgainst, win. Populated by **sleeper-matchup-cache** and import flows (Sleeper API). Remains the source for historical matchup results when using Sleeper.
- **TeamPerformance:** teamId, season, week, points. Also populated by Sleeper import.

### 4.2 Integration Points

- **Live scoring (future):** When our pipeline ingests stats into **PlayerGameStat**, call **MultiSportMatchupScoringService.computeRosterScoreForWeek** for each roster in a league/week, then update **WeeklyMatchup.pointsFor** (or a live cache) and opponent **pointsAgainst**. League’s sport and format drive the scoring rules.
- **Display:** Matchup UI can continue to read **WeeklyMatchup** and **TeamPerformance**. When **PlayerGameStat** is the source of truth for a league, use **computeRosterScoreForWeek** for the displayed score.
- **Sport awareness:** Any new matchup or live-scoring API should resolve league’s **sport** and **formatType** (e.g. from League or LeagueRosterConfig) and use **resolveScoringRulesForLeague** + **FantasyPointCalculator** or **computeRosterScoreForWeek** so NHL, MLB, NBA, NCAAF, NCAAB use the correct templates.

### 4.3 Waiver / Trades

- No change required to waiver or trade logic for scoring; they use existing league context. Projection and value layers can use **ProjectionSeedResolver** and **getLeagueScoringRules** when they need sport-specific scoring for valuations.

---

## 5. Example Scoring Categories (Reference)

| Sport   | Example stat keys (canonical) |
|---------|-------------------------------|
| NFL     | passing_yards, passing_td, interception, rushing_yards, rushing_td, receptions, receiving_yards, receiving_td, fumble_lost, fg_0_39, fg_40_49, fg_50_plus, pat_made, pat_missed, dst_* |
| NBA     | points, rebounds, assists, steals, blocks, turnovers, three_pointers_made, double_double, triple_double |
| MLB     | single, double, triple, home_run, rbi, run, walk, stolen_base, hit_by_pitch, strikeout, innings_pitched, strikeouts_pitched, earned_runs, save, hold, win, loss, quality_start |
| NHL     | goal, assist, shot_on_goal, power_play_point, blocked_shot, save, goal_allowed, win, loss, shutout |
| NCAA Football | Same baseline as NFL; configurable via league overrides or format. |
| NCAA Basketball | Same as NBA (points, rebounds, etc.); configurable via league overrides. |
| Soccer  | goal, assist, shot_on_target, shot, key_pass, clean_sheet, goal_conceded, save, penalty_save, penalty_miss, yellow_card, red_card, own_goal, minutes_played |

---

## 6. Core Modules Summary

| Module                     | Location / implementation |
|----------------------------|---------------------------|
| **ScoringTemplateResolver** | lib/multi-sport/ScoringTemplateResolver.ts |
| **FantasyPointCalculator**  | lib/scoring-defaults/FantasyPointCalculator.ts |
| **ScheduleIngestionService** | lib/schedule-stats/ScheduleIngestionService.ts |
| **StatNormalizationService** | lib/schedule-stats/StatNormalizationService.ts |
| **MultiSportMatchupScoringService** | lib/multi-sport/MultiSportMatchupScoringService.ts |
| **ProjectionSeedResolver**  | lib/multi-sport/ProjectionSeedResolver.ts |

---

## 7. Scoring and Stats Pipeline Explanation

1. **Templates:** Each sport (and format, e.g. IDP) has a scoring template: a set of rules (stat_key, points_value, multiplier, enabled). Templates live in DB or in-memory defaults. Leagues can override specific stat values via **LeagueScoringOverride**.
2. **Schedule:** **GameSchedule** stores games by sport/season/weekOrRound so the system knows which games belong to which period. **ScheduleIngestionService** upserts games; ingestion jobs can create **StatIngestionJob** records to track runs.
3. **Stats:** Raw stats from providers are normalized to canonical stat keys via **StatNormalizationService**, then stored in **PlayerGameStat** (and optionally **TeamGameStat**). **normalizedStatMap** is what **FantasyPointCalculator** expects; **fantasyPoints** can be precomputed at ingest time if scoring rules are fixed.
4. **Scoring:** For a given league and period, **getLeagueScoringRules** returns the effective rules. **FantasyPointCalculator** turns a player’s stat map into fantasy points. **MultiSportMatchupScoringService** aggregates **PlayerGameStat** by roster and sums points for starters (or full roster).
5. **Matchups:** Existing **WeeklyMatchup** and **TeamPerformance** stay for Sleeper-synced data. When the platform’s own stats pipeline is used, **computeRosterScoreForWeek** feeds live scoring and matchup totals.
6. **Projections:** **ProjectionSeedResolver** gives the projection/simulation engine the right scoring rules and schedule context (weeks/rounds, label) per sport so projections and simulations are consistent with league settings.

---

## 8. QA Checklist

- [ ] **NFL league:** Create league; scoring template is PPR (or chosen format). League overrides (if any) apply. **getLeagueScoringRules(leagueId, NFL, format)** returns expected rules.
- [ ] **FantasyPointCalculator:** For NFL stats `{ passing_yards: 300, passing_td: 2, interception: 0 }` and PPR rules, computed points match expected (e.g. 12 + 8 + 0).
- [ ] **StatNormalizationService:** For NFL, `normalizeStatPayload('NFL', { pass_yd: 250, pass_td: 1 })` returns `{ passing_yards: 250, passing_td: 1 }`.
- [ ] **NBA/MLB/NHL/NCAAF/NCAAB:** **getScoringTemplate(sport, format)** returns sport-specific rules from **ScoringDefaultsRegistry**. **FantasyPointCalculator** with those rules and sport-appropriate stat keys produces sensible totals.
- [ ] **ScheduleIngestionService:** **upsertGameSchedule** creates/updates **GameSchedule**. **listGameSchedules(NFL, 2024, 1)** returns games for that week.
- [ ] **MultiSportMatchupScoringService:** With **PlayerGameStat** rows for a set of playerIds in a league/week, **computeRosterScoreForWeek** returns total and byPlayerId; totals align with **FantasyPointCalculator** for the same stats and league rules.
- [ ] **ProjectionSeedResolver:** **resolveProjectionSeed({ leagueSport: 'NFL', season: 2024, weekOrRound: 5 })** returns scoringRules (NFL template), totalWeeksOrRounds 18, label 'week'.
- [ ] **Matchup:** Existing **WeeklyMatchup** and Sleeper sync unchanged. When **PlayerGameStat** is populated for a league, live scoring or matchup update path uses **computeRosterScoreForWeek** and stores or displays the result.
- [ ] **League override:** Add **LeagueScoringOverride** for a league (e.g. receptions = 1.5); **getLeagueScoringRules** for that league returns the overridden value.

---

*Document generated for Prompt 3 — Multi-Sport Scoring Engine and Schedule/Stats Pipeline. NFL scoring, matchup, and projection behavior is preserved; schema and services support live scoring readiness, matchup engine compatibility, and projection/simulation inputs by sport.*
