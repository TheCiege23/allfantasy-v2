# Prompt 31 Implementation Report
Fantasy Simulation Engine (Matchup & Season Modeling) + Full UI Click Audit  
Date: 2026-03-21

## 1) Simulation engine architecture

The production simulation stack is now organized into a sport-aware, multi-layer flow:

- **Probabilistic core**
  - `lib/monte-carlo.ts` provides Monte Carlo primitives for matchup, season, and playoff outcomes.
  - `lib/simulation-engine/ScoreDistributionModel.ts` provides score sampling + percentile distributions.
- **Engine orchestration**
  - `lib/simulation-engine/MatchupSimulator.ts` runs matchup simulations, computes probabilities/ranges/volatility, and can persist `MatchupSimulationResult`.
  - `lib/simulation-engine/SeasonSimulator.ts` wraps season forecasting and can persist `SeasonSimulationResult`.
  - `lib/simulation-engine/SimulationEngine.ts` is the facade used by APIs and services.
- **Sport resolution**
  - `lib/simulation-engine/SportSimulationResolver.ts` tunes default variance and volatility labels by sport.
  - `lib/simulation-engine/types.ts` now derives supported sports from `lib/sport-scope.ts` (single source of truth).
- **Query layer**
  - `lib/simulation-engine/SimulationQueryService.ts` exposes persisted matchup/season simulations and AI summary query helpers.
- **UI integration**
  - Matchup UX: `components/simulation/MatchupSimulationCard.tsx`, `components/simulation/MatchupSimulationPage.tsx`, `components/app/matchups/MatchupDetailView.tsx`
  - Season/playoff UX: `components/simulation/LeagueForecastSection.tsx`, `components/simulation/LeagueForecastDashboard.tsx`
  - Lab UX: `app/app/simulation-lab/page.tsx`

## 2) Probabilistic modeling logic

- **Matchup simulation**
  - Monte Carlo normal sampling per team (`mean`, `stdDev`), bounded iteration count, win probability and margin stats.
  - Score distribution arrays are generated and transformed into p10/p90 output ranges for probability cards/charts.
  - Upside/downside scenarios (90th/10th percentile) and volatility labels are included.
- **Season simulation**
  - Uses `runSeasonForecast` pipeline with many runs of projected standings outcomes, then computes playoff/championship probabilities.
  - Forecast confidence and finish ranges remain active from existing season forecast engine.
- **Playoff simulation**
  - Bracket-style repeated simulation for advancement/championship odds (in simulation lab + season forecast downstream odds).
- **Score distribution simulation**
  - Histogram-friendly samples + percentile extraction for expected range cards and simulation chart rendering.
- **Sport-aware tuning**
  - Sport-specific default variance is applied (`NFL`, `NHL`, `NBA`, `MLB`, `NCAAB`, `NCAAF`, `SOCCER`) to avoid incompatible blended distributions.

## 3) Schema additions

No new Prompt 31 schema objects were required in this pass because the simulation persistence models already exist:

- `MatchupSimulationResult` (`sim_matchup_results`)
- `SeasonSimulationResult` (`sim_season_results`)

This implementation now actively writes season snapshots into `SeasonSimulationResult` from `POST /api/leagues/[leagueId]/season-forecast` and keeps latest week rows refreshed (delete + create-many for that week).

## 4) Integration with warehouse data and matchup systems

- **Matchup API integration**
  - `POST /api/simulation/matchup` uses `runMatchupSimulation`.
  - Route now returns percentile-based score ranges (from actual distribution output), reducing stale/inconsistent range cards.
  - Route returns `simulationId` and `createdAt` when persisted.
- **Matchup page integration**
  - `MatchupSimulationCard` now forwards `sport`, `leagueId`, `weekOrPeriod`, `teamAId`, `teamBId`, `persist`.
  - `MatchupsTab` passes sport/week/team IDs from API payload to `MatchupDetailView` and simulation card.
- **Season/playoff integration**
  - `LeagueForecastSection` now has explicit period controls (season/week), sim count control, playoff spots control, rerun and AI explanation actions.
  - `GET/POST /api/leagues/[leagueId]/season-forecast` now emits `generatedAt` for UI freshness and stores season simulation rows.
- **Warehouse alignment**
  - Simulation and sport-layer utilities now align with the same multi-sport source (`lib/sport-scope.ts`), preserving Prompt 30 warehouse interoperability.
- **Simulation lab integration**
  - Season/playoff/dynasty lab requests now carry sport and backend applies sport-aware default variance when team stdDev is omitted.

## 5) Full UI click audit findings

Detailed matrix is in:

- `docs/PROMPT31_CLICK_AUDIT_MATRIX.md`

Highlights:

- Verified and fixed matchup simulation CTA behavior (`Sim My Matchup`, rerun, loading/error, AI explanation link).
- Verified expected score chart updates after rerun and after projection changes.
- Added and verified season controls (`season`, `week`, `simulations`, `playoff spots`) with proper request wiring.
- Added and verified team comparison selectors with deterministic delta updates.
- Verified AI explanation button uses current season simulation payload.
- Verified sport filter wiring in simulation lab across season/playoff/dynasty tabs.
- Verified refresh/back interactions on league shells and simulation pages.

## 6) QA findings

Validation completed:

- `npm run typecheck` -> passed.
- `npx playwright test e2e/simulation-click-audit.spec.ts` -> passed (3/3 browsers).
- `ReadLints` on all edited files -> no new lint issues.

Observed non-blocking test noise:

- Next.js warning output around dynamic Sentry import traces in webserver logs; no functional impact on simulation flows.

## 7) Issues fixed

- `lib/simulation-engine/types.ts`
  - Replaced hardcoded sport list with `SUPPORTED_SPORTS` + `normalizeToSupportedSport`.
- `components/simulation/MatchupSimulationCard.tsx`
  - Fixed stale wiring by including sport and persistence context in both initial and rerun requests.
  - Added clearer CTA text (`Sim My Matchup` / `Rerun Simulation`).
- `components/app/tabs/MatchupsTab.tsx` + `components/app/matchups/MatchupDetailView.tsx`
  - Propagated `sport`, `weekOrRound`, `teamAId`, `teamBId` so matchup simulations can persist correctly.
- `app/api/simulation/matchup/route.ts`
  - Score ranges now derive from simulation distribution percentiles instead of static +/- default deviation.
- `components/simulation/LeagueForecastSection.tsx`
  - Added missing season/week/sim/playoff controls, apply behavior, rerun button, AI explanation button, team comparison selectors.
  - Fixed stale AI summary behavior by resetting summary on refresh and rebuilding from current forecast context.
- `app/api/leagues/[leagueId]/season-forecast/route.ts`
  - Added `generatedAt` to API responses.
  - Persisted week-level results into `SeasonSimulationResult`.
- `app/app/simulation-lab/page.tsx` + `lib/simulation-lab/*`
  - Added sport-aware inputs/outputs across season/playoff/dynasty flows.
  - Added explicit sport selectors and run-button labels for click audit reliability.

## 8) Final QA checklist

- [x] Matchup simulations load and rerun correctly by sport.
- [x] Season simulations load and rerun correctly by season/week and control values.
- [x] Playoff probability card data remains consistent after reruns.
- [x] Expected score charts update from current simulation output.
- [x] AI explanation buttons use the latest simulation payload.
- [x] Sport filters isolate simulation behavior in simulation lab.
- [x] Team comparison selectors update deltas correctly.
- [x] Refresh/back controls remain wired on simulation flows.
- [x] Full simulation click-path audit executed end-to-end.

## 9) Explanation of the simulation engine

The Fantasy Simulation Engine is the probabilistic layer that turns projections + context into actionable probability outputs for matchup and season decisions:

- For each matchup, it repeatedly samples plausible score outcomes to produce win probability, expected score ranges, volatility, and upside/downside scenarios.
- For season modeling, it simulates remaining schedule outcomes repeatedly to estimate expected wins, seed ranges, playoff probability, and championship probability.
- It is sport-aware by design: each supported sport uses tuned variance defaults so outputs remain realistic for that sport’s scoring profile.
- Results are produced for both UI and AI consumers, and can be persisted for replay, dashboards, and downstream analytics workflows.

