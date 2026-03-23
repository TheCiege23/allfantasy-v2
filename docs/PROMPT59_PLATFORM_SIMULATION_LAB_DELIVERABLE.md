# Prompt 59 — Platform Simulation Lab (Deliverable)

## Overview

A **sandbox** where users can simulate:

- **Seasons** — one team vs a list of opponents; get expected wins, playoff probability, bye probability (Monte Carlo).
- **Playoffs** — bracket of teams (mean/stdDev); get championship and finalist probability for a target team.
- **Dynasty outcomes** — run N seasons (round-robin + single-elimination bracket each season); aggregate championships, total wins, average finish, playoff appearance rate per team.

No league or auth required: inputs are team projections (mean PPG, optional stdDev). Uses existing `lib/monte-carlo` (simulateSeason, simulatePlayoffs) and a new dynasty loop in `lib/simulation-lab`.

## Data flow

- **Season**: `team` (mean, stdDev) + `opponents[]` + `playoffSpots`, `byeSpots`, `iterations` → Monte Carlo season sim → expectedWins, playoffProbability, byeWeekProbability.
- **Playoffs**: `teams[]` (mean, stdDev) + `targetTeamIndex` + `iterations` → Monte Carlo bracket sim → championshipProbability, finalistProbability.
- **Dynasty**: `teams[]` + `seasons` + `playoffSpots` → for each season: round-robin wins, rank, top N to playoffs, one bracket run → champion; aggregate per-team championships, wins, avg finish, playoff appearances.

## API

- **POST** `/api/simulation-lab/season`  
  Body: `SeasonSimLabInput` (team, opponents, playoffSpots, byeSpots?, iterations?).  
  Returns: `SeasonSimLabResult` (sport, expectedWins, playoffProbability, byeWeekProbability, iterations).

- **POST** `/api/simulation-lab/playoffs`  
  Body: `PlayoffSimLabInput` (teams[], targetTeamIndex, iterations?).  
  Returns: `PlayoffSimLabResult` (sport, championshipProbability, finalistProbability, iterations).

- **POST** `/api/simulation-lab/dynasty`  
  Body: `DynastySimLabInput` (teams[], seasons, playoffSpots, iterationsPerSeason?).  
  Returns: `DynastySimLabResult` (sport, seasonsRun, outcomes[], iterationsPerSeason). Each outcome: teamIndex, name?, championships, totalWins, avgFinish, playoffAppearances.

## UI

- **Simulation Lab** page: `/app/simulation-lab`.
  - Tabs: **Season** | **Playoffs** | **Dynasty**.
  - **Season**: inputs for your team mean/stdDev, opponent means (comma-separated), playoff spots, iterations; Run → expected wins, playoff %, bye %.
  - **Playoffs**: team means (seed order), target team index, iterations; Run → championship %, finalist %.
  - **Dynasty**: team means, number of seasons, playoff spots; Run → table of team, championships, avg wins, avg finish, playoff %.
  - Includes **iterations per season** to run multiple Monte Carlo passes for each season.
- **App home** (`/app`): “Simulation Lab” link to `/app/simulation-lab`.

## Files

| Area    | Path |
|---------|------|
| Types   | `lib/simulation-lab/types.ts` |
| Service | `lib/simulation-lab/SimulationLabService.ts` |
| Index   | `lib/simulation-lab/index.ts` |
| API     | `app/api/simulation-lab/season/route.ts`, `playoffs/route.ts`, `dynasty/route.ts` |
| Page    | `app/app/simulation-lab/page.tsx` |
| Home    | `app/app/home/page.tsx` (link) |

## Dependencies

- `lib/monte-carlo`: `simulateSeason`, `simulatePlayoffs`, `TeamProjection`.

## Validation and reliability notes

- All three routes now forward `sport` into `SimulationLabService` so simulation variance defaults are sport-aware.
- Dynasty simulation supports `iterationsPerSeason` (clamped to a safe cap) and aggregates outcomes across `seasons x iterationsPerSeason` runs.
- Added route contract tests and service tests for Prompt 59 in `__tests__/simulation-lab-routes-contract.test.ts` and `__tests__/simulation-lab-service.test.ts`.
