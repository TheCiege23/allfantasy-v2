# PROMPT 301 — User Recommendation Engine

## Objective

Recommend **leagues**, **players**, and **strategies** based on **user behavior** and **preferences**.

## Deliverable: Recommendation System

### Recommendation types

| Type | Description | Data sources |
|------|-------------|--------------|
| **Leagues** | Joinable leagues (bracket, creator) that match the user’s sport, size, and league-type history | League profile (sports, team counts, bracket/creator membership), discoverable leagues pool |
| **Players** | Trending players in the user’s primary sport (waiver/trade activity) | `UserRecommendationProfile.primarySport`, `TrendingPlayer` (lib/trending) |
| **Strategies** | Lineup, trade, and waiver advice in the user’s league context | Fantasy Coach `StrategyRecommendationEngine`, optional ordering by tool usage |

### User behavior and preferences

- **Preferences (inferred)**  
  - From **leagues**: preferred sports (desc by count), preferred team counts, whether they use bracket/creator leagues, draft participation.  
  - From **engagement events** (last 30 days): tool usage counts (`trade_analyzer`, `waiver_ai`, `mock_draft`, `chimmy_chat`, `lineup_edit`, `league_view`) used to personalize strategy reasons (e.g. “You use trade tools often”).  
- **Behavior**  
  - Same engagement events feed tool usage.  
  - Optional **league context**: most recently updated user league used for strategy recommendations (league name, sport, optional week).

No separate “preferences” table is required; preferences are inferred from league membership and engagement.

### Implementation

- **Library**: `lib/user-recommendation-engine/`
  - **types.ts** — `UserRecommendationProfile`, `UserToolUsage`, `RecommendedLeague`, `RecommendedPlayer`, `RecommendedStrategy`, `UserRecommendations`.
  - **UserRecommendationEngine.ts** — `getUserRecommendationProfile(userId)`, `getLeagueRecommendations(userId, options)`, `getPlayerRecommendations(userId, options)`, `getStrategyRecommendations(userId, options)`, `getRecommendations(userId, options)`.
  - **index.ts** — Re-exports.
- **API**: **GET /api/recommendations** (auth required)  
  - Query: `leagueLimit`, `playerLimit`, `sport`, `profile=1` (include `_profile` in response).  
  - Response: `{ leagues, players, strategies [, _profile ] }`.

### Data flow

1. **Profile** — `getUserRecommendationProfile(userId)` builds:
   - League profile via `getUserLeagueProfile` (league-recommendations).
   - Tool usage from `EngagementEvent` (last 30 days).
   - Activity summary from `getActivitySummary` (engagement-engine).
   - Optional league context from first user league (by `updatedAt`).
2. **Leagues** — `getPersonalizedRecommendations` (league-recommendations) with discoverable pool; exclude leagues user is already in.
3. **Players** — `getTrendingPlayers` (lib/trending) filtered by `primarySport` (or query `sport`).
4. **Strategies** — `getStrategyRecommendation('lineup'|'trade'|'waiver', context)` (fantasy-coach) with user’s league context; strategy reasons can reflect tool usage.

### Usage

- **Single call**: `GET /api/recommendations` returns all three recommendation types.
- **Optional**: `GET /api/recommendations?leagueLimit=12&playerLimit=20&sport=NFL&profile=1` for limits, sport filter, and debug profile.

### Dependencies

- `lib/league-recommendations` — league profile and personalized league recommendations.
- `lib/trending` — trending players by sport.
- `lib/engagement-engine` — activity summary; raw engagement events for tool usage.
- `lib/fantasy-coach/StrategyRecommendationEngine` — strategy content.
- `lib/sport-scope` — `DEFAULT_SPORT` for users with no leagues.

## Summary

- **Recommendation system** produces leagues, players, and strategies from **user behavior** (engagement, tool usage) and **preferences** (inferred from leagues and activity).
- **APIs**: One authenticated endpoint, `GET /api/recommendations`, returns `{ leagues, players, strategies }` with optional `_profile` and query tuning.
