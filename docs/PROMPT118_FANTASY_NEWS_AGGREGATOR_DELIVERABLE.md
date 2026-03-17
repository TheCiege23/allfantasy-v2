# Prompt 118 — Fantasy News Aggregator (Deliverable)

## Goal

Collect fantasy-relevant news with **player news feed**, **team news feed**, and **AI summarized headlines**.

---

## Features

- **Player news feed**: Query by player name; returns articles matching playerName, playerNames, or title/description.
- **Team news feed**: Query by team abbreviation (e.g. KC, SF); returns articles for that team.
- **AI summarized headlines**: Optional per-request summarization; each headline is shortened to a fantasy-relevant one-liner (OpenAI when configured).

---

## Core modules

- **NewsAggregationService** (`lib/fantasy-news-aggregator/NewsAggregationService.ts`)
  - `getPlayerNewsFeed(playerQuery, limit?, options?)`: queries `SportsNews` by player name / title / description.
  - `getTeamNewsFeed(teamQuery, limit?, options?)`: queries by team or teams array (team abbrev normalized via `normalizeTeamAbbrev`).
  - `getAggregatedFeed(type, query, limit?, options?)`: dispatches to player or team feed; supports `refresh` to trigger sync before query.
- **NewsSummarizerAI** (`lib/fantasy-news-aggregator/NewsSummarizerAI.ts`)
  - `summarizeHeadlines(items: { id, title }[])`: returns `Record<id, summarizedHeadline>`. Uses OpenAI gpt-4o-mini; falls back to original title if no API key or on error.

---

## API

| Method | Route | Description |
|--------|--------|-------------|
| GET | `/api/fantasy-news/feed?type=player\|team&query=...` | **Required**: `type` (player or team), `query` (player name or team abbrev). **Optional**: `summarize=true`, `refresh=true`, `limit=40`. Returns `{ items, summarizedHeadlines?, count }`. |

---

## UI

- **Route**: `/fantasy-news`
- **Tabs**: Player news | Team news (feed type).
- **Input**: Query (player name or team abbreviation) + “Load feed” submit.
- **Option**: “AI summarized headlines” checkbox (sends `summarize=true`).
- **Feed**: List of **news cards**. Each card shows:
  - Title (or AI summarized headline when available, with “AI summary” label).
  - Source, team, published date.
  - **Source link** (external icon) opening `sourceUrl` in a new tab.
- **News card click**: Opens the article at `sourceUrl` in a new tab (same as source link). Source link has `stopPropagation` so clicking the icon alone also opens the article.

---

## Mandatory UI click audit

| Element | Expected behavior | Verification |
|--------|-------------------|--------------|
| **News card clicks** | Clicking the card opens the article’s source URL in a new tab. | Click a card → new tab with the article URL; back on aggregator tab unchanged. |
| **Source links** | Clicking the external-link icon opens the same article URL in a new tab (no double navigation). | Click source link → new tab with same URL; card click and source link both go to same article. |

Audit attributes: `data-audit="news-card"` on each card, `data-audit="source-link"` on the external link.

---

## QA — Verify article linking

1. **Load feed**: Choose Player (or Team), enter a name (e.g. Patrick Mahomes) or team (e.g. KC), click “Load feed”. Cards appear with titles and source links.
2. **Card click**: Click a news card → new tab opens with the article’s `sourceUrl`. Verify URL matches the expected source (e.g. ESPN, NFL.com).
3. **Source link**: Click the external-link icon on a card → same article opens in a new tab. Verify it is the same URL as in step 2 for that card.
4. **AI summaries**: Enable “AI summarized headlines”, load feed → cards show summarized headline and “AI summary” where applicable; source link and card click still open the same original article URL.
5. **Empty / no URL**: If an item has no `sourceUrl`, card click and source link do nothing (or no link shown). No broken links.

---

## Data source

- **SportsNews** (Prisma): populated by existing sync (`syncNewsToDb` in `app/api/sports/news/sync-helper.ts`) from ESPN and NewsAPI. Aggregator reads from DB only; optional `?refresh=true` triggers sync before query.

---

## Files added

- `lib/fantasy-news-aggregator/types.ts`
- `lib/fantasy-news-aggregator/NewsAggregationService.ts`
- `lib/fantasy-news-aggregator/NewsSummarizerAI.ts`
- `lib/fantasy-news-aggregator/index.ts`
- `app/api/fantasy-news/feed/route.ts`
- `app/fantasy-news/page.tsx`
- `docs/PROMPT118_FANTASY_NEWS_AGGREGATOR_DELIVERABLE.md`
