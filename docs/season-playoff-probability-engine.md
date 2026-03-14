# Season + Playoff Probability Engine

## 1. Season-forecast audit

- **Existing systems preserved**
  - **Standings**: `RankingsSnapshot` (leagueId, season, week, rosterId, rank, composite, expectedWins, luckDelta) and `LeagueTeam` / `LegacyRoster` (wins, losses, pointsFor) remain the source of current standings.
  - **Matchups**: `WeeklyMatchup` is used only to infer past schedule pattern; remaining weeks use round-robin.
  - **Rankings / legacy**: `getV2Rankings` and legacy playoff-forecast API are unchanged. The new engine adds a persisted, simulation-based forecast that can be used alongside or instead of inline `ForwardOdds`.
- **Gaps addressed**
  - No single persisted snapshot of playoff/championship odds with expected wins, finish range, elimination risk, or bye probability.
  - No shared simulation that uses actual remaining schedule (round-robin when future schedule is missing) and tie-breakers (wins, then pointsFor).
  - New engine fills that with `SeasonForecastSnapshot` and a modular pipeline (schedule → simulate → aggregate → persist).

## 2. Forecasting architecture

- **Flow**: Load context (standings + projections from `RankingsSnapshot` + `LeagueTeam`/`LegacyRoster`) → build remaining schedule (round-robin) → run N season simulations → aggregate playoff/first-place/bye/championship → score confidence → upsert `SeasonForecastSnapshot`.
- **Modules**
  - **RemainingScheduleSimulator**: Builds remaining weeks of matchups (round-robin; optional future: use platform schedule when available).
  - **StandingsProjectionCalculator**: Runs one Monte Carlo season (sample scores from team mean/stdDev, apply wins/losses/pointsFor, sort by wins then pointsFor).
  - **PlayoffOddsCalculator**: From many simulated standings, computes playoff %, first-place %, expected wins, expected seed, finish range, elimination risk, bye %.
  - **ChampionshipOddsCalculator**: For each simulated season, takes top `playoffSpots` teams, runs single-elimination bracket by seed (1v8, 4v5, 2v7, 3v6 for 8-team), counts championship wins per team.
  - **ForecastConfidenceScorer**: Global confidence 0–100 from simulation count and data-weeks ratio; optional per-team penalty from seed variance.
  - **SeasonForecastEngine**: Orchestrates load → simulate → aggregate → persist; exposes `runSeasonForecast` and `getSeasonForecast`.

## 3. Backend forecasting engine files

All under `lib/season-forecast/`:

- `types.ts` – `TeamSeasonForecast`, `LeagueForecastContext`, `SimulatedStanding`, etc.
- `RemainingScheduleSimulator.ts` – `getRemainingSchedule(input)` → remaining weeks of `[teamA, teamB][]`.
- `StandingsProjectionCalculator.ts` – `runOneSimulation(input)` → `SimulatedStanding[]`.
- `PlayoffOddsCalculator.ts` – `calculatePlayoffOdds(input)` → `TeamPlayoffOdds[]`.
- `ChampionshipOddsCalculator.ts` – `calculateChampionshipOdds(input)` → `Map<teamId, championshipWinCount>`.
- `ForecastConfidenceScorer.ts` – `scoreForecastConfidence(input)`, `scoreTeamConfidence(base, seedVariance?)`.
- `SeasonForecastEngine.ts` – `runSeasonForecast(input)`, `getSeasonForecast(leagueId, season, week)`; loads from DB, runs simulations, persists snapshot.
- `warehouse-integration.ts` – `persistForecastSnapshot(payload)` for warehouse-style writes.
- `index.ts` – Public API exports.

## 4. Standings / playoff integration updates

- **API**: `GET|POST /api/leagues/[leagueId]/season-forecast?season=&week=` (GET returns cached forecast; POST triggers run and returns new snapshot).
- **Consumers**: League standings page, team page, or homepage widgets can call GET to show playoff odds, first-place %, championship %, expected wins, finish range, elimination risk, bye %. Optional: after saving rankings snapshot, call POST to refresh forecast (e.g. cron or on-demand).
- **Compatibility**: Existing `ForwardOdds` in v2 rankings and legacy playoff-forecast remain; this engine is an additional, persisted source with richer fields.

## 5. Warehouse snapshot integration files

- **Primary**: `SeasonForecastSnapshot` (Prisma) stores `teamForecasts` JSON per league/season/week; `SeasonForecastEngine` upserts it.
- **Optional**: `lib/season-forecast/warehouse-integration.ts` exposes `persistForecastSnapshot`. If you add a generic `SimulationSnapshot` (e.g. `dw_simulation_snapshots`) to the schema, uncomment and use the optional write in that file so warehouse/analytics can query forecast runs.

## 6. QA checklist

- [ ] **Schema**: `npx prisma generate` succeeds; migration for `SeasonForecastSnapshot` applied.
- [ ] **Context load**: For a league that has `RankingsSnapshot` rows for the given season/week, `loadContext` returns standings and projections; with no snapshots it returns null and POST returns 404.
- [ ] **Schedule**: Remaining weeks use round-robin; team count even; each team appears once per week.
- [ ] **Simulation**: One run produces standings sorted by wins then pointsFor; seeds 1..N assigned.
- [ ] **Playoff odds**: Sum of first-place probabilities across teams ≈ 100%; playoff probabilities respect playoff spots.
- [ ] **Championship**: Bracket order correct for 4/6/8 teams; championship probabilities sum to ~100%.
- [ ] **Persistence**: POST creates/updates `SeasonForecastSnapshot`; GET returns same data.
- [ ] **API**: GET with missing/invalid params returns 400; POST with valid body returns snapshotId and teamForecasts.
- [ ] **League types**: Works when standings come from `League`+`LeagueTeam` (platformLeagueId) or `LegacyLeague`+`LegacyRoster` (sleeperLeagueId + season).
- [ ] **Edge cases**: 0 remaining weeks → no schedule; 1 team → no pairs; playoffSpots/byeSpots overridable via POST body.

## 7. Summary: how season and playoff probabilities work

1. **Inputs**: League id, season, week. Standings and roster identifiers come from `RankingsSnapshot`; wins/losses/pointsFor from `LeagueTeam` or `LegacyRoster`. Team strength is derived from composite/expectedWins (mean PPG, fixed stdDev) for sampling.
2. **Schedule**: Remaining weeks (currentWeek+1 through totalWeeks) are filled with round-robin pairings so every team plays once per week.
3. **Simulation**: For each of N runs (default 2000), every remaining matchup is simulated by drawing scores from normal(mean, stdDev); wins/losses and pointsFor are updated; final standings are sorted by wins then pointsFor and seeded.
4. **Playoff odds**: Over all runs, we count how often each team finished in the top `playoffSpots` (playoff %), in 1st (first-place %), and in the top `byeSpots` (bye %). We also average wins and seed, and record min/max seed for finish range. Elimination risk = 100 − playoff %.
5. **Championship**: For each run, the top `playoffSpots` teams are placed in a bracket (e.g. 1v8, 4v5, 2v7, 3v6); each round is simulated with the same team strength; we count how often each team won the final.
6. **Confidence**: A 0–100 score reflects simulation count and share of season weeks with data; optionally reduced per team by high variance in simulated seed.
7. **Output**: A `SeasonForecastSnapshot` per league/season/week with `teamForecasts[]` (playoffProbability, firstPlaceProbability, championshipProbability, expectedWins, expectedFinalSeed, finishRange, eliminationRisk, byeProbability, confidenceScore). These support standings page, playoff race cards, rivalry/drama engines, AI summaries, commissioner insights, and legacy/dynasty projections.
