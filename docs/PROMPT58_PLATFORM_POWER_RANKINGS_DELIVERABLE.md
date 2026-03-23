# Prompt 58 — Platform Power Rankings (Deliverable)

## Overview

**Cross-league power rankings** that rank managers (or users) across the platform using:

- **Legacy score** — from `LegacyScoreRecord` (per-league legacy engine); aggregated by manager (average across leagues).
- **XP** — from `ManagerXPProfile.totalXP` (career XP).
- **Championship history** — from `ManagerFranchiseProfile.championshipCount`.
- **Win percentage** — from `ManagerFranchiseProfile.careerWinPercentage`.

A composite **power score** (0–1) is computed as a weighted sum of normalized components, then managers are sorted by that score.

## Data sources

- **LegacyScoreRecord** — `entityType = 'MANAGER'`, grouped by `entityId`; average `overallLegacyScore` per manager. Optional filter by `sport`.
- **ManagerXPProfile** — `managerId`, `totalXP`.
- **ManagerFranchiseProfile** — `managerId`, `championshipCount`, `careerWinPercentage`, `totalLeaguesPlayed`.

The union of `managerId` / `entityId` from these sources defines the set of managers ranked. Legacy is only included when records use `entityId` equal to the same identifier as `managerId` (e.g. platform user id).

## Composite formula

- **Legacy** (30%): normalized 0–100 → 0–1.
- **XP** (25%): normalized with cap 5000 XP = 1.
- **Championships** (25%): normalized with cap 10 = 1.
- **Win %** (20%): already 0–100, normalized to 0–1.

Power score = weighted sum; ranking is descending by power score.

## API

- **GET** `/api/platform/power-rankings`
  - Query: `sport` (optional), `limit` (default 50, max 200), `offset` (default 0).
  - Validation: rejects unsupported `sport` values with 400.
  - Returns: `{ rows: PlatformPowerRow[], total: number, generatedAt: string }`.
  - Each row: `managerId`, `rank`, `powerScore`, `legacyScore`, `totalXP`, `championshipCount`, `winPercentage`, `totalLeaguesPlayed`, optional `displayName`.

## UI

- **Power Rankings** page: `/app/power-rankings`.
  - Fetches `/api/platform/power-rankings` with optional sport filter and limit 100.
  - Table: Rank, Manager, Power, Legacy, XP, Championships, Win %, Leagues.
  - Refresh and sport dropdown.
- **App home dashboard** (`FinalDashboardClient`): “Power rankings” link to `/app/power-rankings`.

## Files

| Area   | Path |
|--------|------|
| Types  | `lib/platform-power-rankings/types.ts` |
| Service| `lib/platform-power-rankings/PlatformPowerRankingsService.ts` |
| Index  | `lib/platform-power-rankings/index.ts` |
| API    | `app/api/platform/power-rankings/route.ts` |
| Page   | `app/app/power-rankings/page.tsx` |
| Home   | `components/dashboard/FinalDashboardClient.tsx` (link) |
| Tests  | `__tests__/platform-power-rankings-route-contract.test.ts`, `__tests__/platform-power-rankings-service.test.ts` |

## Sport scope

- Optional `sport` filter uses `normalizeToSupportedSport` and filters `LegacyScoreRecord` by sport. GM and XP data are platform-wide (no sport filter in schema); only legacy is sport-filtered when provided.
