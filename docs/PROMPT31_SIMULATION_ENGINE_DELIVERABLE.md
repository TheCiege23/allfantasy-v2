# Prompt 31 — Simulation Engine (Matchup & Season Modeling) + Full UI Click Audit

Production implementation of the probabilistic simulation system and mandatory UI/workflow audit for all simulation-related interactions.

Latest implementation addendum:

- `docs/PROMPT31_IMPLEMENTATION_REPORT.md`
- `docs/PROMPT31_CLICK_AUDIT_MATRIX.md`

---

## 1. Simulation engine architecture

### Overview

The **Simulation Engine** models fantasy outcomes across all supported sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) with:

- **Weekly matchup simulations** — head-to-head win probability, margin, upset chance, score ranges, volatility
- **Season outcome simulations** — full season standings, playoff and championship odds, expected wins/rank
- **Playoff probability** — via existing `calculatePlayoffOdds` and `calculateChampionshipOdds` in season-forecast
- **Score distribution modeling** — percentiles and volatility from mean/stdDev (sport-aware defaults)
- **AI-consumable outputs** — `SimulationQueryService.getSimulationSummaryForAI` for matchup + season results

### Layered structure

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Probabilistic core** | Monte Carlo (normal distribution), sport-aware stdDev | `lib/monte-carlo.ts` (simulateMatchup, simulateSeason, simulatePlayoffs), `lib/simulation-engine/ScoreDistributionModel.ts` |
| **Orchestration** | Matchup + season + score distribution + persist | `MatchupSimulator`, `SeasonSimulator`, `SimulationEngine` |
| **Sport awareness** | Default stdDev and volatility by sport | `SportSimulationResolver` |
| **Persistence** | MatchupSimulationResult, SeasonSimulationResult | Prisma models `sim_matchup_results`, `sim_season_results` |
| **Query** | Dashboard, AI, replay | `SimulationQueryService` |

### Directory layout

- **Schema**: `prisma/schema.prisma` — `MatchupSimulationResult`, `SeasonSimulationResult`
- **Lib**: `lib/simulation-engine/`
  - `types.ts` — sport constants, MatchupSimulationInput/Output, SeasonSimulationInput/Output
  - `SportSimulationResolver.ts` — getDefaultScoreStdDev(sport), getVolatilityTag
  - `ScoreDistributionModel.ts` — sampleScoreDistribution, percentiles, buildScoreDistribution
  - `MatchupSimulator.ts` — runMatchupSimulation (uses monte-carlo + optional persist)
  - `SeasonSimulator.ts` — runSeasonSimulation (delegates to season-forecast, optional persist)
  - `SimulationEngine.ts` — runMatchup, runSeason, getScoreDistribution, re-exports calculatePlayoffOdds
  - `SimulationQueryService.ts` — getMatchupSimulation, getSeasonSimulationForLeague, getSimulationSummaryForAI
  - `index.ts` — central export
- **APIs**: 
  - `POST /api/simulation/matchup` — uses `MatchupSimulator`; accepts sport, leagueId, weekOrPeriod, persist
  - `GET/POST /api/leagues/[leagueId]/season-forecast` — unchanged; used by LeagueForecastSection

---

## 2. Probabilistic modeling logic

- **Matchup**: Normal distribution per team (mean = projected score, stdDev = sport default or provided). Monte Carlo iterations (capped 100–5000); win probability = fraction of runs where scoreA > scoreB; margin mean/stdDev from sample; upset chance = min(winProbA, winProbB); volatility tag from (stdDevA+stdDevB)/2 (low/medium/high).
- **Season**: Existing season-forecast pipeline — remaining schedule, team projections from RankingsSnapshot/LeagueTeam, many runs of `runOneSimulation` (StandingsProjectionCalculator), then `calculatePlayoffOdds` and `calculateChampionshipOdds`. No change to probability logic.
- **Score distribution**: `sampleScoreDistribution(mean, stdDev, n)` for histogram/percentiles; `buildScoreDistribution` returns p10/p25/p50/p75/p90 and volatilityTag.
- **Sport-aware**: Default stdDev by sport (e.g. NHL 18, NBA 12, Soccer 10) in `SportSimulationResolver`; simulation outputs remain keyed by sport so distributions are not blended across sports.

---

## 3. Schema additions

All in `prisma/schema.prisma` under "Simulation Engine (Prompt 31)".

| Model | Table | Purpose |
|-------|-------|---------|
| **MatchupSimulationResult** | `sim_matchup_results` | simulationId, sport, leagueId?, weekOrPeriod, teamAId?, teamBId?, expectedScoreA/B, winProbabilityA/B, scoreDistributionA/B (Json), iterations, createdAt |
| **SeasonSimulationResult** | `sim_season_results` | resultId, sport, leagueId, teamId, season, weekOrPeriod, playoffProbability, championshipProbability, expectedWins, expectedRank, simulationsRun, createdAt |

Indexes support queries by leagueId, weekOrPeriod, sport, teamId.

---

## 4. Integration with warehouse data and matchup systems

- **Warehouse**: Simulation engine does not read from warehouse in this deliverable; warehouse powers historical context. Optional future: use warehouse matchup/standing facts to seed projections or validate sims.
- **Matchup systems**: `POST /api/simulation/matchup` is the single matchup API; callers (e.g. MatchupSimulationCard, War Room) send teamA/teamB mean and optional stdDev/sport/leagueId/weekOrPeriod. Persist writes to `MatchupSimulationResult`.
- **Season/playoff**: Season forecast and playoff odds remain in `lib/season-forecast` (SeasonForecastEngine, PlayoffOddsCalculator, ChampionshipOddsCalculator). `SeasonSimulator` wraps `runSeasonForecast` and can persist to `SeasonSimulationResult`; league page and LeagueForecastSection use existing `GET/POST /api/leagues/[leagueId]/season-forecast`.
- **Scoring engine**: No direct coupling; projections (mean/stdDev) are supplied by callers (e.g. from rankings or roster strength).

---

## 5. Full UI click audit findings

For every simulation-related element: **Component & route** | **Handler** | **State** | **Backend/API** | **Cached/persisted reload** | **Status**.

### 5.1 Matchup simulation card ("Sim my matchup" / Rerun)

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Initial sim (when teamA/teamB set) | MatchupSimulationCard | useEffect → POST /api/simulation/matchup | result, loading, error | POST /api/simulation/matchup | On mount/deps (teamA/teamB mean, stdDev) | OK |
| Rerun simulation | MatchupSimulationCard | onClick → runSimulation() | setResult, setLoading, setError | Same POST | Refetches; result replaced | OK (added) |
| Error state + "Rerun simulation" | MatchupSimulationCard | runSimulation on button click | error | — | Clears error on success | OK (added) |
| Loading state | MatchupSimulationCard | — | loading | — | "Simulating matchup…" / "Running…" on Rerun | OK |
| Display (win prob bar, ranges, upset chance, volatility) | MatchupSimulationCard | — | result → display | — | From result | OK |

### 5.2 Matchup detail view (where card is used)

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Matchup selection | MatchupDetailView | Parent passes matchup | matchup | — | — | OK |
| MatchupSimulationCard props | MatchupDetailView | teamA: { mean: projA, stdDev: 15 }, teamB: { mean: projB, stdDev: 15 } | — | — | Card fetches when projections set | OK |

### 5.3 Season & playoff forecast section

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Load forecast | LeagueForecastSection | load() → GET /api/leagues/[id]/season-forecast?season=&week= | forecasts, generatedAt, loading, error | GET season-forecast | On mount and after generate | OK |
| Generate forecast | LeagueForecastSection | generate() → POST /api/leagues/[id]/season-forecast | refreshing | POST season-forecast | Then load() | OK |
| Refresh button | LeagueForecastSection | onClick → generate() | refreshing | POST then GET | Same | OK |
| "Generate forecast" (when no data / error) | LeagueForecastSection | onClick → generate() | — | POST | Same | OK |
| AI summary | LeagueForecastSection | useEffect → POST /api/leagues/[id]/forecast-summary | aiSummary | POST forecast-summary | When forecasts change | OK |
| LeagueForecastDashboard | LeagueForecastSection | Renders teamForecasts, playoffSpots, teamNames, teamRanks, aiSummary | — | — | OK |
| PlayoffOddsPanel (inside dashboard) | LeagueForecastDashboard | Receives teamForecasts | — | — | OK |

### 5.4 Playoff odds panel

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Display team cards | PlayoffOddsPanel | Maps teamForecasts to TeamForecastCard | — | — | Parent passes teamForecasts | OK |
| Empty state | PlayoffOddsPanel | "No forecast data yet. Run a season forecast…" | — | — | OK |

### 5.5 League page (Standings/Playoffs tab)

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| LeagueForecastSection | leagues/[leagueId] page | Rendered when activeTab === "Standings/Playoffs" | leagueId, season, week, teamNames, teamRanks, playoffSpots | — | load() on mount | OK |

### 5.6 Sport filters / timeframe / week selectors

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Season/week in LeagueForecastSection | LeagueForecastSection | Props season, week from parent | — | GET season-forecast?season=&week= | load() depends on leagueId, season, week | OK |
| Matchup API sport | POST /api/simulation/matchup | body.sport (default NFL) | — | Used for getDefaultScoreStdDev | OK |

### 5.7 Simulation confidence indicator

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| SimulationConfidenceIndicator | components/simulation | Props-based display | — | — | OK |

### 5.8 Loading and error states

| Element | Component & route | Behavior | Status |
|--------|--------------------|----------|--------|
| MatchupSimulationCard loading | MatchupSimulationCard | loading true → "Simulating matchup…" or Rerun "Running…" | OK |
| MatchupSimulationCard error | MatchupSimulationCard | error set → red message + "Rerun simulation" button | OK (added) |
| LeagueForecastSection loading | LeagueForecastSection | loading && !forecasts → "Loading season forecast…" | OK |
| LeagueForecastSection error | LeagueForecastSection | error → message + "Generate forecast" button | OK |

### Summary (UI audit)

- **MatchupSimulationCard**: Handler exists for initial fetch and for **Rerun**; state (result, loading, error) updates correctly; API is POST /api/simulation/matchup; error path now shows message and Rerun button. **Fixed**: added error state and Rerun button; API switched to simulation engine with sport-aware stdDev.
- **LeagueForecastSection**: Load, Generate, Refresh all wired; season/week drive refetch; AI summary fetches when forecasts change. No dead buttons.
- **PlayoffOddsPanel**: Display-only; receives teamForecasts from parent. OK.
- **Filters**: Season/week in URL or props; simulation data isolated by leagueId, season, week. OK.

---

## 6. QA findings

- **Matchup simulations**: Load correctly by sport; API uses `getDefaultScoreStdDev(sport)` when stdDev not provided; response shape unchanged for MatchupSimulationCard.
- **Season simulations**: Unchanged; load via GET season-forecast; generate via POST; playoff odds and championship odds from existing engine.
- **Probability cards**: MatchupSimulationCard updates after Rerun (runSimulation clears and refetches); LeagueForecastSection updates after Refresh (generate then load).
- **AI explanation**: LeagueForecastSection requests AI summary from forecast-summary when teamForecasts exist; uses current simulation data.
- **Sport/timeframe**: Matchup API accepts sport (default NFL); season-forecast uses season and week from props/query.
- **Click paths**: All simulation-related buttons (Rerun, Generate forecast, Refresh) work; no dead buttons after fixes.

---

## 7. Issues fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| MatchupSimulationCard had no error state | Medium | Set error on API failure; render red message and "Rerun simulation" button. |
| MatchupSimulationCard had no Rerun | Medium | Added runSimulation callback and "Rerun" button in header; Rerun refetches and updates result. |
| Matchup API not sport-aware | Low | Switched to simulation engine; sport used for default stdDev; optional persist when leagueId + weekOrPeriod provided. |
| No persisted simulation results | Low | Added MatchupSimulationResult and SeasonSimulationResult schema; MatchupSimulator and SeasonSimulator support options.persist. |

---

## 8. Final QA checklist

- [x] Simulation engine architecture in place (MatchupSimulator, SeasonSimulator, ScoreDistributionModel, SportSimulationResolver, SimulationQueryService).
- [x] Probabilistic modeling: Monte Carlo for matchup; season/playoff from season-forecast; sport-aware stdDev and volatility.
- [x] Schema: MatchupSimulationResult, SeasonSimulationResult added and migrated.
- [x] Integration: Matchup API uses engine; season-forecast unchanged; warehouse not required for current sim flow.
- [x] Matchup simulation: Loads by sport; Rerun and error state wired; probability card updates after rerun.
- [x] Season/playoff: Load and generate wired; playoff odds panels use current forecast data.
- [x] Full UI click audit completed; all simulation-related click paths verified.
- [x] Sport and timeframe filters isolate simulation data.

---

## 9. Explanation of the simulation engine

The **Simulation Engine** is the single place for probabilistic fantasy matchup and season modeling. It:

1. **Matchup**: For a single head-to-head, it runs many (e.g. 2000) normal-distribution samples per team (mean = projection, stdDev = sport default or input), counts how often team A wins, and returns win probability, margin distribution, upset chance, and volatility. Results can be stored in `MatchupSimulationResult` for dashboards and AI.
2. **Season**: It reuses the existing season-forecast pipeline (remaining schedule, team strength from rankings/standings, many full-season runs, then playoff and championship odds). Optionally writes per-team outcomes to `SeasonSimulationResult`.
3. **Score distribution**: It exposes a small model (sample distribution, percentiles, volatility tag) for expected score ranges and volatility for charts and narratives.
4. **Sport awareness**: Default score variance (stdDev) and volatility tags differ by sport so that NFL, NHL, NBA, MLB, NCAAB, NCAAF, and Soccer outputs stay appropriate and are not mixed.

The engine powers **AI matchup predictions**, **playoff odds**, **War Room projections**, **draft simulations** (existing logic), and **dashboard probability cards**. All simulation-related UI (matchup card, season forecast section, playoff odds panel, refresh/rerun, loading/error) has been audited and wired; the only code changes were adding error state and Rerun to the matchup card and routing the matchup API through the new engine.
