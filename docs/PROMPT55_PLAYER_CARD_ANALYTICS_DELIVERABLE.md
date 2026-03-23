# Prompt 55 — Player Card Analytics System (Deliverable)

## Overview

Advanced player cards with **AI insights**, **meta trends**, **matchup predictions**, and **career projections**.

---

## Features

- **AI insights** — Short 2–3 sentence analyst take generated from aggregated data (OpenAI).
- **Meta trends** — Platform trend score, add/drop/trade/draft rates, trending direction (from `PlayerMetaTrend` / MetaQueryService).
- **Matchup predictions** — Expected fantasy points and expected PPG from player analytics; optional outlook copy.
- **Career projections** — Stored 5-year point projections, breakout/decline probability, volatility (from `PlayerCareerProjection`).

---

## Implementation

### PlayerCardAnalyticsService (`lib/player-card-analytics/PlayerCardAnalyticsService.ts`)

- **getPlayerCardAnalytics(input):** Aggregates all four sections.
  - **Meta:** `getPlayerMetaTrendsForMeta(sport)` and matches by playerId or normalized name.
  - **Matchup:** Uses `getPlayerAnalytics(name)` → `expectedFantasyPoints`, `expectedFantasyPointsPerGame` and builds short outlook.
  - **Career:** `prisma.playerCareerProjection.findFirst` by sport + playerId (latest season).
  - **AI insights:** Builds a context string from analytics + meta + career, then `openaiChatText` for 2–3 sentence insight.
- **Input:** playerId?, playerName, position?, team?, sport?, season?.
- **Output:** `PlayerCardAnalyticsPayload` (aiInsights, metaTrends, matchupPrediction, careerProjection, plus player identifiers).

### API

- **POST /api/player-card-analytics**  
  Body: `playerId?`, `playerName`, `position?`, `team?`, `sport?`, `season?`.  
  Validation: requires `playerName`, validates `sport` against supported sports, validates `season` as 4-digit year.  
  Returns full payload for use by the card UI.

### Client Hook

- **`usePlayerCardAnalytics`** (`hooks/usePlayerCardAnalytics.ts`) — shared player-card fetcher with:
  - request dedupe key (`playerId|name|sport|position|team|season`)
  - short-lived in-memory cache (default 2 minutes)
  - abort handling for rapid modal/card switches
  - explicit `refetch()` for lazy cards

### UI

- **PlayerCardAnalytics** (`components/player-card/PlayerCardAnalytics.tsx`) — Sections: AI insights, Meta trends, Matchup outlook, Career projection. Fetches via POST when mounted (eager) or on “Load”. Can be embedded anywhere.
- **PlayerDetailModal** — Integrates `PlayerCardAnalytics` below news and above game logs so opening a player shows the advanced card.
- **PlayerProfileCard** — Integrates lazy `PlayerCardAnalytics` in the overview tab to extend advanced cards in profile search flows.
- **RosterBoard player detail modal** — Integrates lazy `PlayerCardAnalytics` so roster-side player cards also include AI/meta/matchup/career sections.

---

## Data Sources

- **AI:** OpenAI (system + user message with context string).
- **Meta:** `getPlayerMetaTrendsForMeta` (global-meta-engine).
- **Matchup:** `getPlayerAnalytics` (player-analytics.ts → PlayerAnalyticsSnapshot).
- **Career:** `PlayerCareerProjection` (player-projection engine / DB).

---

## Multi-Sport

- Service and API accept `sport`; meta and career are filtered by sport. Analytics lookup is name-based (NFL-oriented today); other sports can extend with sport-specific analytics or pass-through.
