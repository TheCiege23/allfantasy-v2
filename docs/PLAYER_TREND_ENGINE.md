# Player Trend Detection Engine

## Overview

The Player Trend Detection Engine computes **platform-wide** player trends across all leagues, sports, and formats. It aggregates:

- **Waiver pickups / drops**
- **Trade interest** (players involved in trades)
- **Draft frequency** (draft picks)
- **Lineup start rate**
- **AI recommendation frequency**
- **Injury impact**

and produces a **TrendScore** (0–100) and **TrendDirection** (Rising, Hot, Stable, Falling, Cold) per player per sport.

## Supported sports

NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball.

## Database structures

### PlayerMetaTrend

| Field | Type | Description |
|-------|------|-------------|
| playerId | string | Platform player id (e.g. Sleeper) |
| sport | string | NFL, NHL, MLB, NBA, NCAAF, NCAAB |
| trendScore | float | 0–100 |
| addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact | float | Normalized rates |
| trendingDirection | string | Rising, Hot, Stable, Falling, Cold |
| previousTrendScore | float? | For delta-based direction |
| updatedAt | DateTime | |

### TrendSignalEvent

| Field | Type | Description |
|-------|------|-------------|
| playerId | string | |
| sport | string | |
| signalType | string | waiver_add, waiver_drop, trade_request, draft_pick, lineup_start, ai_recommendation, injury |
| value | float | Default 1 |
| leagueId | string? | Optional |
| timestamp | DateTime | |

## Core modules

| Module | Role |
|--------|------|
| **TrendScoreCalculator** | Weighted sum of signal rates → raw score; normalize to 0–100. |
| **TrendDirectionClassifier** | Compare current vs previous score + event count → Rising/Hot/Stable/Falling/Cold. |
| **TrendSignalAggregator** | Query TrendSignalEvent for a player/sport in last 7 days → normalized rates. |
| **PlayerTrendUpdater** | recordTrendSignal; recordTrendSignalsAndUpdate; updatePlayerTrend (recompute + upsert). |
| **PlayerTrendAnalyzer** | getHottestPlayers; getRisingPlayers; getFallers; getTrendingByDirection; getPlayerTrend. |

## Trend score formula

```
TrendScore (0–100) = normalize( 
  AddRateWeight × addRate 
  + DropRateWeight × dropRate 
  + TradeInterestWeight × tradeInterest 
  + DraftRateWeight × draftFrequency 
  + StartRateWeight × lineupStartRate 
  + InjuryImpactWeight × injuryImpact 
)
```

Default weights (see `lib/player-trend/types.ts`): addRate 0.25, dropRate -0.2, tradeInterest 0.2, draftFrequency 0.2, lineupStartRate 0.15, injuryImpact -0.15.

## Integration points

### Waiver system (implemented)

- **lib/waiver-wire/run-hooks.ts**: After `onWaiverRunComplete`, for each processed claim we record `waiver_add` for the added player and `waiver_drop` for the dropped player, then call `recordTrendSignalsAndUpdate` so PlayerMetaTrend is updated for those players.

### Draft engine

- When a league draft or mock draft is completed with known **player IDs**, call `recordDraftPick(playerId, sport, leagueId)` for each picked player (or use `recordTrendSignal(..., 'draft_pick', ...)`). Mock draft results may only have player names; resolve to playerId if possible or add a name→id resolution step.

### Trade analyzer

- When a trade is completed or analyzed and `playersReceived` is available, call `recordTradeRequest(playerId, sport, leagueId)` for each player received (demand signal). Optionally do the same for `playersGiven` with a lower value or a separate signal if desired.

### Lineup start

- When lineup/start data is available (e.g. from matchup or roster sync), emit `lineup_start` for each player started that week via `recordLineupStart(playerId, sport, leagueId)`.

### AI assistant

- When the AI recommends a player for add/waiver/draft, call `recordAiRecommendation(playerId, sport)`.

### Global Meta Engine

- Use **GET /api/player-trend?list=hottest|rising|fallers&sport=NFL&limit=50** to feed trending lists into meta analytics, dashboards, or AI context.

## API

**GET /api/player-trend**

- `list`: `hottest` | `rising` | `fallers` (default `hottest`)
- `sport`: optional filter (NFL, NBA, MLB, NHL, NCAAF, NCAAB)
- `direction`: optional (Rising, Hot, Stable, Falling, Cold) for direct filter
- `limit`: 1–100 (default 50)
- `minScore`: optional minimum trend score (for hottest)

Response: `{ list, sport, data: TrendingPlayerRow[] }`.

## QA checklist

- [ ] **Waiver claims** – Process a waiver claim (add + drop); verify TrendSignalEvent rows for waiver_add and waiver_drop; verify PlayerMetaTrend updated for that player/sport (trendScore, trendingDirection).
- [ ] **Trades** – After wiring trade integration, complete or analyze a trade; verify trade_request events and trend score reflects trade interest.
- [ ] **Draft picks** – After wiring draft integration, record draft_pick events; verify draftFrequency and trend score update.
- [ ] **Lineup starts** – After wiring lineup integration, record lineup_start; verify lineupStartRate and trend score.
- [ ] **Trend scores** – Manually insert a few events; call updatePlayerTrend; verify trend score and direction (Rising/Stable/Falling) match expectations.
- [ ] **Direction** – With enough events and score delta, verify Hot (high score + rising), Cold (low score + falling), Rising, Falling, Stable.
- [ ] **API** – GET /api/player-trend?list=hottest&sport=NFL returns 200 and array; GET ?list=rising and ?list=fallers work; sport filter works.
- [ ] **Multi-sport** – Record events for NFL and NBA; verify both appear in sport-filtered API and no cross-sport leakage.

## Migration

Run:

```bash
npx prisma migrate dev --name player_trend_engine
```

Then ensure cron or post-transaction hooks call `recordTrendSignalsAndUpdate` or `updatePlayerTrend` where needed so trends stay up to date.
