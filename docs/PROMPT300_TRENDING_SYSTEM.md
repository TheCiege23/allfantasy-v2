# PROMPT 300 — Trending System

## Objective

Surface popular content: trending leagues, trending players, and trending matchups using activity, engagement, and joins.

## Show

- **Trending leagues** — Leagues ranked by a score derived from API usage (activity), engagement events (e.g. league_view, trade_analyzer with leagueId), and recent joins (creator league members).
- **Trending players** — Players ranked by waiver/trade activity: add/drop counts, net trend, and crowd signal from the existing `TrendingPlayer` table (sport-specific).
- **Trending matchups** — Matchups derived from trending leagues (e.g. “League name — active”) so high-activity leagues surface their matchups.

## Use (signals)

- **Activity** — API usage events per league (`ApiUsageEvent.leagueId`), tool/endpoint usage.
- **Engagement** — Engagement events with `meta.leagueId` (e.g. league_view, trade_analyzer) counted per league.
- **Joins** — Recent joins into creator leagues (`CreatorLeagueMember.joinedAt`) attributed to the linked league (or creator league id) to boost that league’s score.

## Scoring (trending leagues)

- `score = activityCount * 1 + engagementCount * 2 + joinCount * 3`
- Counts are over a configurable lookback window (default 7 days).
- Results are sorted by score descending and optionally limited (default 20).

Trending players use the existing `TrendingPlayer` model (crowdScore, netTrend, addCount, dropCount). Trending matchups currently use the same score as the parent league (top leagues’ matchups surface as “trending”).

## Deliverable: Trending algorithm

### Library (lib/trending/)

- **types.ts** — `TrendingLeague`, `TrendingPlayer`, `TrendingMatchup`, `TrendingOptions` (lookbackDays, limit, sport).
- **TrendingAlgorithm.ts** — `getTrendingLeagues(options)`, `getTrendingPlayers(options)`, `getTrendingMatchups(options)`.
- **index.ts** — Re-exports.

### API

- **GET /api/trending/leagues** — Query: `days`, `limit`. Returns `{ items: TrendingLeague[], period: '7d' }`.
- **GET /api/trending/players** — Query: `limit`, `sport`. Returns `{ items: TrendingPlayer[], sport }`.
- **GET /api/trending/matchups** — Query: `days`, `limit`. Returns `{ items: TrendingMatchup[], period: '7d' }`.

### Data sources

- **Leagues**: `ApiUsageEvent` (group by leagueId, count), `EngagementEvent` (meta.leagueId count), `CreatorLeagueMember` (recent joins → creator league → leagueId), `League` (name, sport).
- **Players**: `TrendingPlayer` (sport, crowdScore, netTrend, addCount, dropCount, expiresAt).
- **Matchups**: Derived from `getTrendingLeagues`; each item is a placeholder matchup per top league (leagueId, leagueName, matchupLabel, score).

## Files

- **Engine**: `lib/trending/types.ts`, `lib/trending/TrendingAlgorithm.ts`, `lib/trending/index.ts`
- **API**: `app/api/trending/leagues/route.ts`, `app/api/trending/players/route.ts`, `app/api/trending/matchups/route.ts`

## Summary

- **Trending algorithm**: Scores leagues by activity + engagement + joins; players by existing TrendingPlayer data; matchups by parent league score.
- **Signals**: Activity (API usage), engagement (engagement events with leagueId), joins (creator league member count).
- **APIs**: Three GET endpoints return trending leagues, players, and matchups for use in discovery or feeds.
