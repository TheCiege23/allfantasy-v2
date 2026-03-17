# Prompt 117 — Advanced Player Comparison Lab (Deliverable)

## Goal

Allow users to compare players using **historical performance**, **projections**, and **AI insights**, with side-by-side charts and an AI recommendation summary.

---

## Features

- **Side-by-side charts**: Bar chart of comparable metrics (dynasty value, rank, 30-day trend, FP/Game, total FP, avg historical FP/Game).
- **Chart toggles**: Historical | Projections | Both — filter which series appear in the chart.
- **AI recommendation summary**: "Get AI insight" calls the insight API and displays a short analyst-style recommendation.

---

## Core modules

- **PlayerStatsResolver** (`lib/player-comparison-lab/PlayerStatsResolver.ts`)
  - `resolvePlayerStats(playerName)`: returns historical seasons (from `PlayerSeasonStats`, NFL, rolling_insights) and projection (from FantasyCalc `getPlayerValuesForNames`).
- **PlayerComparisonService** (`lib/player-comparison-lab/PlayerComparisonService.ts`)
  - `comparePlayers(playerAName, playerBName)`: resolves both players, builds `chartSeries` (label, playerA, playerB) and `summaryLines` for display.

---

## API

| Method | Route | Description |
|--------|--------|-------------|
| GET | `/api/player-comparison?playerA=&playerB=` | Returns `PlayerComparisonResult`: playerA, playerB (each with historical + projection), chartSeries, summaryLines. |
| POST | `/api/player-comparison/insight` | Body: `{ playerA, playerB, summaryLines }`. Returns `{ recommendation }` (AI-generated short recommendation). Uses OpenAI when configured; otherwise returns fallback text. |

---

## UI

- **Route**: `/player-comparison-lab`
- **Player inputs**: Two search fields that call `/api/instant/player-search?q=...`; user can type or pick from results.
- **Compare player button**: Runs GET comparison API and shows result (charts + summary).
- **Chart toggles**: Three buttons (Historical, Projections, Both) that filter the bar chart series.
- **AI insight button**: POST to insight API and show recommendation in a panel below.

---

## Mandatory UI click audit

| Element | Expected behavior | Verification |
|--------|-------------------|--------------|
| **Compare player button** | Runs comparison for the two selected/typed players and displays side-by-side chart and summary. | Click with two players entered → chart and summary appear; with missing player → error message. |
| **Chart toggles** | Switch between Historical, Projections, and Both; chart updates to show only the corresponding series. | Click each toggle → chart bars change (historical-only, projection-only, or all). |
| **AI insight button** | Requests AI recommendation and displays it in the panel below. | Click → loading state → recommendation text appears (or fallback if no API key). |

Audit attributes (for QA): `data-audit="compare-player-button"`, `data-audit="chart-toggles"`, `data-audit="side-by-side-chart"`, `data-audit="ai-insight-button"`.

---

## QA — Verify comparison accuracy

1. **Data resolution**: Pick two players that exist in FantasyCalc and (optionally) in `PlayerSeasonStats`. Run compare → both appear with non-empty projection and/or historical data.
2. **Chart correctness**: For "Both", bars for Player A (purple) and Player B (green) match the returned numbers (dynasty value, rank, FP/Game, etc.).
3. **Summary**: Summary bullets match the comparison logic (value diff, rank diff, trend, last-season FP/Game).
4. **Historical toggle**: With "Historical" only, chart shows only FP/Game, Total FP, Avg FP/Game (historical) series.
5. **Projections toggle**: With "Projections" only, chart shows only Dynasty value, Overall rank, 30-day trend.
6. **AI insight**: With OpenAI configured, recommendation is 2–4 sentences and references the two players and the comparison. Without API key, fallback message appears.

---

## Files added

- `lib/player-comparison-lab/types.ts`
- `lib/player-comparison-lab/PlayerStatsResolver.ts`
- `lib/player-comparison-lab/PlayerComparisonService.ts`
- `lib/player-comparison-lab/index.ts`
- `app/api/player-comparison/route.ts`
- `app/api/player-comparison/insight/route.ts`
- `app/player-comparison-lab/page.tsx`
- `docs/PROMPT117_PLAYER_COMPARISON_LAB_DELIVERABLE.md`

---

## Data sources

- **Historical**: `PlayerSeasonStats` (sport: NFL, source: rolling_insights), by `playerName` (case-insensitive), last 5 seasons.
- **Projections**: FantasyCalc via `getPlayerValuesForNames` (dynasty value, rank, position rank, 30-day trend, redraft value).

Sport scope: Comparison lab is built for NFL (data sources above). Structure supports adding other sports later via resolver/config.
