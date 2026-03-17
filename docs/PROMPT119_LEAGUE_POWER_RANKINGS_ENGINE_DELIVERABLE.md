# Prompt 119 — League Power Rankings Engine (Deliverable)

## Goal

Rank teams within leagues with **weekly rankings** and **ranking movement indicators**.

---

## Features

- **Weekly rankings**: Current week power rankings per league (composite score, wins/losses, points for).
- **Ranking movement indicators**: Up (↑ +N), down (↓ N), or same (—) vs previous week, using stored snapshots.

---

## Core modules

- **PowerRankingEngine** (`lib/league-power-rankings/PowerRankingEngine.ts`)
  - `computePowerRankings(leagueId, week?)`: Calls `computeLeagueRankingsV2(leagueId, week)` and maps to `PowerRankingsOutput` (teams with rank, prevRank, rankDelta, record, pointsFor, composite, powerScore).
- **RankingHistoryService** (`lib/league-power-rankings/RankingHistoryService.ts`)
  - `getWeeklyRankHistory(leagueId, rosterId, limit?)`: Returns rank history entries (season, week, rank, composite) for a roster.
  - `getPreviousWeekRanks(leagueId, season, currentWeek)`: Returns map of rosterId → { rank, composite } for the previous week (used by v2 for movement).

History and previous-week data come from existing `RankingsSnapshot` and `getPreviousWeekSnapshots` / `getRankHistory` in `lib/rankings-engine/snapshots.ts`.

---

## API

| Method | Route | Description |
|--------|--------|-------------|
| GET | `/api/leagues/[leagueId]/power-rankings?week=` | Returns `PowerRankingsOutput`: leagueId, leagueName, season, week, teams (rank, prevRank, rankDelta, displayName, record, pointsFor, composite, powerScore), computedAt. Optional `week` for a specific week. |

---

## UI

- **Rankings tab** in the league shell: `LeagueTabNav` includes "Rankings"; selecting it shows `PowerRankingsTab`.
- **PowerRankingsTab** (`components/app/tabs/PowerRankingsTab.tsx`):
  - Fetches `GET /api/leagues/[leagueId]/power-rankings`.
  - Shows "Week N Power Rankings" and a list of **team cards**.
  - Each **team card** shows: rank (#1, #2, …), display name, record (W-L-T), points for, **movement** (↑ +N / ↓ N / —), and power score.
- **Audit**: `data-audit="rankings-tab-content"` on the rankings section, `data-audit="team-card"` on each team card.

---

## Mandatory UI click audit

| Element | Expected behavior | Verification |
|--------|-------------------|--------------|
| **Rankings tab** | Clicking "Rankings" in the league tab bar switches to the power rankings view and loads weekly rankings. | Open a league → click "Rankings" → rankings content loads; team cards appear with rank and movement. |
| **Team card clicks** | Team cards are present and display correct rank, name, record, and movement; no navigation required (cards are informational). | Click a team card → no broken behavior; card shows rank, name, W-L-T, PF, movement indicator, power score. |

---

## QA — Verify ranking calculations

1. **Data source**: Rankings come from `computeLeagueRankingsV2` (composite, wins, points, etc.). Ensure league has rosters and (optionally) snapshots for previous week so movement is populated.
2. **Order**: Teams are ordered by rank (1, 2, 3, …). Rank 1 = highest composite / best power score.
3. **Movement**: For each team, `rankDelta = prevRank - currentRank` (positive = moved up). UI shows ↑ +N when rankDelta > 0, ↓ N when rankDelta < 0, — when rankDelta === 0 or prevRank null.
4. **Consistency**: Same leagueId and week in API and in league-rankings-v2 produce consistent ranks and movement when snapshots exist.
5. **Snapshot persistence**: Saving snapshots (e.g. via `POST /api/leagues/[leagueId]/snapshots`) ensures next week’s rankings show correct prevRank and movement.

---

## Files added/updated

- `lib/league-power-rankings/types.ts`
- `lib/league-power-rankings/PowerRankingEngine.ts`
- `lib/league-power-rankings/RankingHistoryService.ts`
- `lib/league-power-rankings/index.ts`
- `app/api/leagues/[leagueId]/power-rankings/route.ts`
- `components/app/tabs/PowerRankingsTab.tsx`
- `components/app/LeagueTabNav.tsx` — added "Rankings" tab.
- `app/app/league/[leagueId]/page.tsx` — render `PowerRankingsTab` when tab is "Rankings".
- `docs/PROMPT119_LEAGUE_POWER_RANKINGS_ENGINE_DELIVERABLE.md`
