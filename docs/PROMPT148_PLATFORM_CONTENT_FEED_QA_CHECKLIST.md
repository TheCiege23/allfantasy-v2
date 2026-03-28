# PROMPT 148 — Platform Content Feed: QA Checklist

## Route map

| Route / API | Purpose |
|-------------|---------|
| `/feed` | Content feed page (requires auth). Renders ContentFeedPage with FeedTabs, FeedFilters, FeedList. |
| `/api/content-feed` | GET feed items. Query: `tab`, `sport`, `contentType`, `limit`, `track` (event name). Returns `{ items, tab?, sport?, contentType? }`. |
| `/e2e/content-feed` | Click-audit harness for deterministic feed UI testing. |
| `/creators/[handle]` | Creator profile destination for creator card and follow CTA. |
| `/blog/[slug]` | Blog preview destination from feed cards. |
| `/app/trend-feed` | Trend alert destination from feed cards. |

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Football (NCAAF), NCAA Basketball (NCAAB), Soccer (SOCCER).  
**Feed modes (tabs):** Following | For You | Trending.

---

## Mandatory click audit

- [x] **Tabs switch correctly** — Click "Following", "For You", "Trending"; feed list refetches with correct `tab` and title updates ("Following" / "For you" / "Trending").
- [x] **Card links open correct destination** — Each card type: `href` opens the expected page (e.g. creator profile for `creator_post`, `/app/trend-feed` for `trend_alert`, `/blog/:slug` for `blog_preview`, league news for `league_recap_card`, bracket links for `bracket_highlight_card`).
- [x] **Filter chips work** — Sport chips (All + per sport) and content type chips (All + per type) update the feed; request includes `sport` and `contentType` and results are filtered.
- [x] **Refresh works** — "Refresh" button refetches feed (and sends `track=feed_refresh` when implemented); loading state shows; list updates.
- [x] **Follow creator CTA works** — On creator_post cards, "View creator" link goes to `/creators/[handle]`; "Follow" button navigates to creator profile (and can be extended to record follow event).
- [x] **Save / bookmark CTA works** — "Save" toggles saved state; persisted in localStorage (`content-feed-saved`); "Saved" state and icon (e.g. filled bookmark) reflect correctly.
- [x] **No dead feed actions** — No buttons or links that do nothing or 404; all card `href`s and CTAs have valid targets.

---

## Backend requirements

- [x] **Feed aggregation layer** — ContentFeedService + FeedAggregationService: creator posts (public CreatorLeague + CreatorProfile), blog previews (published BlogArticle), trend alerts (player-trend getTrendFeed), bracket highlights (BracketFeedEvent), league recaps (MediaArticle), AI/placeholder cards (ai_story_card, power_rankings_card, matchup_card).
- [x] **Ranking logic** — FeedRankingResolver: mode-aware (following: creator leagues + creator posts boosted; for_you: sport/league/creator interest; trending: recency + trend/blog boost).
- [x] **Safe public/private filtering** — Only public creator leagues and public creator profiles; only published blog articles; no private league data exposed to non-members.
- [x] **Event tracking** — GET `/api/content-feed?track=feed_view|feed_refresh` records analytics events; non-fatal if tracking fails.
- [x] **Creator + AI content blending** — Feed combines creator_post, blog_preview, trend_alert, league_recap_card, bracket_highlight_card, ai_story_card, power_rankings_card, matchup_card, plus legacy player_news, league_update, ai_insight, community_highlight.

---

## Frontend requirements

- [x] **ContentFeedPage** — Renders FeedTabs, FeedFilters, FeedList; state for tab, sport, contentType, savedIds; follow and save handlers.
- [x] **FeedTabs** — Following | For You | Trending; switches active tab and triggers refetch.
- [x] **FeedFilters** — Sport and content type chips; updates filters and refetches.
- [x] **FeedCardRenderer** — Renders by item.type with correct href; creator CTA (link + Follow); save/bookmark CTA; no dead actions.
- [x] **FollowingFeed / ForYouFeed / TrendingFeed** — Implemented as FeedList with fixed `tab` prop for each mode.

---

## Optional / future

- **FeedComposer** — Not implemented; applicable when adding in-feed create-post (e.g. creator posts) from the feed UI.
- **Server-side saved items** — Save/bookmark currently uses localStorage; can be extended to API (e.g. saved_feed_items table).
- **Follow API** — Follow creator can be wired to CreatorAnalyticsEvent or a dedicated follow table for "Following" tab filtering.
