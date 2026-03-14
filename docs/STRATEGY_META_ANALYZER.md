# Strategy Meta Analyzer — Architecture (Chunk 1)

## Overview

The Strategy Meta Analyzer detects **platform-wide** roster-building and drafting strategy patterns across all leagues. Insights power:

- AI Draft Assistant
- Draft War Room
- Mock Draft simulations
- League analytics dashboards
- Dynasty projections

**Supported sports:** NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball. Strategy detection adapts by sport (position sets, round thresholds).

---

## Data Sources (Existing Codebase)

There is no separate "Fantasy Data Warehouse"; the analyzer uses **existing** data:

| Conceptual source | Actual source in codebase |
|-------------------|---------------------------|
| **DraftFact** | Sleeper: `getLeagueDrafts(leagueId)`, `getDraftPicks(draftId)`; `MockDraft.results` (JSON); rankings engine already loads `draftWithPicks` |
| **RosterSnapshot** | `Roster.playerData` (JSON); `StrategySnapshot.roster` (JSON); `buildRoster()` / roster composition in rankings and trade-engine |
| **MatchupFact** | `TeamPerformance` (teamId, week, season, points, result); `SeasonResult` (wins, losses, pointsFor, champion); `RankingsSnapshot` |
| **LeagueSettings** | `League` (sport, scoring, isDynasty, rosterSize, starters JSON, settings JSON); `LeagueWaiverSettings`; multi-sport `RosterTemplate` / `LeagueRosterConfig` |

Draft pick shape (Sleeper): `{ round, pick_no, roster_id, player_id, picked_by, ... }`.  
Roster playerData: structure varies; typically starters/bench/IR/taxi keyed by position or slot.

---

## Service Architecture

Four services work together:

```
StrategyPatternAnalyzer   → detects strategy per team/roster (ZeroRB, HeroRB, etc.)
DraftMetaAnalyzer         → aggregates draft pick order / position by round across leagues
RosterCompositionAnalyzer → positional distribution, rookie/veteran mix, stack detection
MetaSuccessEvaluator      → win rate / playoff success by strategy
```

- **StrategyPatternAnalyzer**: Inputs = draft pick sequence + roster composition + league format. Outputs = list of detected strategy types per team.
- **DraftMetaAnalyzer**: Inputs = many leagues’ draft picks (from Sleeper + optional MockDraft). Outputs = ADP by position, round-by-round position mix, league-format breakdown.
- **RosterCompositionAnalyzer**: Inputs = roster playerData or StrategySnapshot.roster + player metadata. Outputs = position counts, value concentration, stack flags (e.g. QB+WR same team).
- **MetaSuccessEvaluator**: Inputs = strategy labels per team + SeasonResult / RankingsSnapshot / TeamPerformance. Outputs = usage rate and success rate per strategy (and optionally trending direction).

Data flow: **Draft + Roster** → StrategyPatternAnalyzer (per team) → strategy labels. **Strategy labels + Results** → MetaSuccessEvaluator → StrategyMetaReport (usageRate, successRate, trendingDirection). **DraftMetaAnalyzer** and **RosterCompositionAnalyzer** feed into StrategyPatternAnalyzer and can also expose meta views for War Room / dashboards.

---

## Integration Points (No Breaking Changes)

- **Draft engine**: Read-only. Use `getLeagueDrafts` / `getDraftPicks` and `MockDraft.results`; do not change draft creation or processing.
- **Rankings engine**: Read-only. Rankings already fetch drafts and rosters; strategy analyzer can run as a separate pass (e.g. after rankings or in a cron).
- **League settings**: Read-only. Use `League` and multi-sport config for sport and format.
- **Roster management**: Read-only. Use `Roster.playerData` and any existing roster parsing (e.g. `getRosterPlayerIds`, position extraction).
- **Global Meta Engine**: Strategy meta reports (and optionally draft/roster meta) can be consumed by a meta layer or API for AI and dashboards.

---

## Potential Risks / Conflicts

1. **Player ID and sport**: Draft/roster data today are mostly NFL (Sleeper). Multi-sport leagues (NBA, etc.) may have different roster shapes or draft sources; strategy rules (e.g. “no RB in first X rounds”) must be parameterized by sport (position set, round thresholds).
2. **Performance**: Scanning many leagues and drafts can be heavy. Prefer batch/cron jobs; cache StrategyMetaReport by sport/format/season; avoid running in the critical path of draft or rankings.
3. **StrategySnapshot**: Already stores `classification` and `roster`; avoid duplicating logic. Strategy Meta Analyzer can either (a) consume StrategySnapshot as one input for MetaSuccessEvaluator, or (b) run its own detection and optionally backfill/write a separate strategy_meta table.
4. **Naming**: “StrategyMetaReport” (Chunk 3) will live in a new table or in-memory; ensure it does not conflict with existing “StrategySnapshot” (per-league, per-roster, per-season).

---

## Backend Service Structure

- **lib/strategy-meta/types.ts** — Strategy type enum, league format, report DTOs.
- **lib/strategy-meta/StrategyPatternAnalyzer.ts** — Detect strategy from draft + roster (stub in Chunk 1; rules in Chunk 2).
- **lib/strategy-meta/DraftMetaAnalyzer.ts** — Aggregate draft data across leagues (stub in Chunk 1).
- **lib/strategy-meta/RosterCompositionAnalyzer.ts** — Position distribution, stacks (stub in Chunk 1).
- **lib/strategy-meta/MetaSuccessEvaluator.ts** — Usage/success rates per strategy (stub in Chunk 1).
- **lib/strategy-meta/index.ts** — Re-exports.

Chunk 2 will implement pattern detection logic and configurable rules. Chunk 3 will add StrategyMetaReport generation and persistence/schema if needed.

---

## Chunk 1 QA Checklist

- [ ] **No breaking changes** — Draft engine, rankings, roster, league settings are read-only; no existing gameplay logic modified.
- [ ] **Types and stubs** — `lib/strategy-meta` exports types, StrategyPatternAnalyzer (detectStrategies stub), DraftMetaAnalyzer (summarizeDraft, aggregateDraftMeta), RosterCompositionAnalyzer (analyzeRosterComposition, getPositionCountsFromRoster), MetaSuccessEvaluator (computeStrategyMetaReport).
- [ ] **League format** — `toLeagueFormat({ isDynasty, isSuperFlex })` returns dynasty_sf | dynasty_1qb | redraft_sf | redraft_1qb | unknown.
- [ ] **Integration points** — Documented: Sleeper drafts, Roster.playerData, StrategySnapshot, SeasonResult, League; no new dependencies on unimplemented "Fantasy Data Warehouse."
- [ ] **Risks** — Documented: multi-sport position sets, performance (batch/cache), StrategySnapshot vs StrategyMetaReport naming.
