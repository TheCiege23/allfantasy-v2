# Prompt 113 — Fantasy Content Feed (Deliverable)

## Primary goal

Provide users with a daily fantasy sports feed including:

- **Player news** — From SportsNews (sport-filtered when user has preferred sports).
- **League updates** — From MediaArticle (league news for user’s leagues).
- **AI recommendations** — AI-generated insight cards (e.g. Trade Analyzer, Waiver AI) with deep links.
- **Community highlights** — From BracketFeedEvent (bracket busts, leaderboard swings).

## Features

- **Personalized feed** — Ranked by UserInterestModel (preferred sports, league memberships) and FeedRankingResolver (sport match, league match, recency, AI boost).
- **League activity highlights** — League-scoped MediaArticle and BracketFeedEvent included when user is in those leagues.
- **AI-generated insights** — Placeholder AI cards linking to /af-legacy (trade), /waiver-ai; can be extended with real AI-generated items.

## Core modules

### ContentFeedService (`lib/content-feed/ContentFeedService.ts`)

- **getContentFeed(userId, limit)** — Aggregates:
  - **MediaArticle** → type `league_update`, href `/app/league/{leagueId}/news/{id}`.
  - **SportsNews** → type `player_news`, href `sourceUrl` or `/dashboard`.
  - **BracketFeedEvent** → type `community_highlight`, href `/brackets/leagues/{id}` or tournament.
  - **AI placeholders** → type `ai_insight`, href to Trade Analyzer and Waiver AI.
- Then runs **rankFeedItems(items, interests)** and returns top `limit` items.

### FeedRankingResolver (`lib/content-feed/FeedRankingResolver.ts`)

- **rankFeedItems(items, interests)** — Scores each item:
  - +20 if item sport in user sports.
  - +30 if item leagueId in user leagueIds.
  - +15 / +10 / +5 by recency (<1h / <24h / <7d).
  - +5 for type `ai_insight`.
- Sorts by score descending.

### UserInterestModel (`lib/content-feed/UserInterestModel.ts`)

- **getUserInterests(userId)** — Returns `{ sports, leagueIds }`:
  - **sports** from UserProfile.preferredSports (via getSettingsProfile).
  - **leagueIds** from BracketLeagueMember and League (app leagues) for that user.

## API

- **GET /api/content-feed** — Query: `limit` (default 30). Auth optional; when authenticated, feed is personalized. Response: `{ items: ContentFeedItem[] }`. Headers: `Cache-Control: no-store`.

## UI

- **Route:** `/feed` — Requires auth; redirects to login with `callbackUrl=/feed`.
- **ContentFeedClient** — Fetches from `/api/content-feed?limit=30&t={timestamp}` on mount and on **Refresh** click. Renders:
  - **Refresh button** — `onClick` calls `fetchFeed(true)`; disables while `refreshing`; shows “Refreshing...” and spinning icon. After response, `setItems(data.items)` so feed updates correctly.
  - **Article links** — Each item is a `<Link href={item.href}>` (player news, league update, community highlight open in new context).
  - **AI insight cards** — Same card shape; type `ai_insight` with icon Sparkles; link to `/af-legacy?tab=trade-center` or `/waiver-ai`.
- **Dashboard** — Link to “Fantasy feed” (Newspaper icon) to `/feed`.

## Mandatory UI click audit

| Element | Location | Behavior |
|--------|----------|----------|
| **Refresh button** | Feed page header | `type="button"`, `onClick={() => fetchFeed(true)}`, `disabled={refreshing}`. Fetches `/api/content-feed?limit=30&t=Date.now()`; on success `setItems(data.items)` so feed list updates. |
| **Article links** | Each feed card | `<Link href={item.href}>` — league_update → `/app/league/{id}/news/{id}`; player_news → sourceUrl or dashboard; community_highlight → bracket league/tournament; ai_insight → /af-legacy or /waiver-ai. |
| **AI insight cards** | Cards with type `ai_insight` | Same Link wrapper; href and label from ContentFeedService (Trade tip, Waiver AI). |
| **Back to dashboard** | Empty state | `<Link href="/dashboard">` when no items. |

**Verify feed updates correctly:** Refresh triggers fetch with cache-bust query `t`; response replaces `items` state; list re-renders with new data. No duplicate submissions (single fetch per refresh; button disabled while refreshing).

## QA — Feed ranking and refresh logic

1. **Ranking** — With user having preferredSports and league memberships, call GET /api/content-feed; items should have league_update / community_highlight for user leagues first when present; ai_insight and recent items appear; order differs from raw creation order.
2. **Refresh** — On /feed, click Refresh; button shows “Refreshing...” and spinner; after response, list updates (or stays same if no server change); no double-fetch from double-click (button disabled).
3. **Unauthenticated** — Without session, API still returns feed (with empty interests); ranking is by recency only.
4. **Links** — Click each card type; league news goes to app league news page; AI cards to af-legacy/waiver-ai; bracket to brackets/leagues or tournament.

## Files touched

- `lib/content-feed/types.ts` — FeedItemType, ContentFeedItem, UserInterests.
- `lib/content-feed/UserInterestModel.ts` — getUserInterests.
- `lib/content-feed/FeedRankingResolver.ts` — rankFeedItems.
- `lib/content-feed/ContentFeedService.ts` — getContentFeed.
- `lib/content-feed/index.ts` — Exports.
- `app/api/content-feed/route.ts` — GET handler.
- `app/feed/page.tsx` — Feed page (auth + layout).
- `app/feed/ContentFeedClient.tsx` — Client feed list, refresh, links, AI cards.
- `app/dashboard/DashboardContent.tsx` — Link to /feed.
- `docs/PROMPT113_FANTASY_CONTENT_FEED_DELIVERABLE.md` — This deliverable.
