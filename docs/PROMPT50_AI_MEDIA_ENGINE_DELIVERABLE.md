# Prompt 50 — AI Sports Media Engine (Deliverable)

## 1. Media Engine Architecture

- **Purpose:** Generate automated league news and narratives: weekly recaps, trade breakdowns, power rankings, upset alerts, playoff previews, and championship recap stories.
- **Core modules:**
  - **LeagueMediaEngine** (`lib/sports-media-engine/LeagueMediaEngine.ts`): Orchestrates generation and persistence. `generateArticle(input)` builds context by type, optionally gets statistical insights (DeepSeek), builds narrative (OpenAI), and persists `MediaArticle`. Exposes `listArticles`, `getArticleById`.
  - **RecapGenerator** (`lib/sports-media-engine/RecapGenerator.ts`): Builds recap context from league data. `buildRecapContext(options)` loads `LeagueTeam`, optional `SeasonResult`, and league name; returns `GenerationContext` (teams, standings, highlights).
  - **PowerRankingGenerator** (`lib/sports-media-engine/PowerRankingGenerator.ts`): Builds power-ranking context. `buildPowerRankingContext(options)` loads teams ordered by rank/points; returns `GenerationContext` with top-team highlights.
  - **NarrativeBuilder** (`lib/sports-media-engine/NarrativeBuilder.ts`): Turns context into human-readable articles. `getStatisticalInsights(ctx)` optionally calls DeepSeek for stat bullets. `buildArticle(type, ctx, options)` calls OpenAI to produce headline + body; supports all article types with type-specific system/user prompts.
- **Data flow:** League ID + type → context (Recap or PowerRanking) → optional DeepSeek stats → OpenAI article (headline + body) → persist `MediaArticle` (leagueId, sport, headline, body, tags).
- **Sport scope:** All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) via `lib/sport-scope.ts`; league sport and filters are sport-aware.

---

## 2. Schema Additions

- **MediaArticle** (`media_articles`):
  - `id` (TEXT, cuid, PK)
  - `leagueId` (VARCHAR 64)
  - `sport` (VARCHAR 16)
  - `headline` (VARCHAR 256)
  - `body` (TEXT)
  - `tags` (JSONB, default `[]`) — e.g. `["weekly_recap"]`, `["power_rankings"]`
  - `createdAt` (TIMESTAMP)
  - Indexes: `leagueId`, `(leagueId, sport)`, `createdAt`

Migration: `20260324000000_add_media_articles`. Apply with `npx prisma migrate deploy` (or `prisma migrate dev` in an interactive environment).

---

## 3. AI Workflow Logic

- **Model roles (as specified):**
  - **DeepSeek:** Statistical insights. `NarrativeBuilder.getStatisticalInsights(ctx)` sends league standings/teams to DeepSeek with a “quantitative analyst” system prompt; returns 3–5 bullet points. Optional; can be skipped via `skipStatsInsights` for speed or when DeepSeek is unavailable.
  - **Grok:** Narrative tone. Not implemented as a separate provider; the OpenAI system prompt instructs “clear, engaging tone suitable for league members,” encoding narrative style in the final step.
  - **OpenAI:** Human-readable articles. `NarrativeBuilder.buildArticle(type, ctx, options)` sends context + optional stats to OpenAI; response is parsed as “first line = headline, rest = body.” Type-specific prompts for weekly_recap, power_rankings, trade_breakdown, upset_alert, playoff_preview, championship_recap.
- **Flow per generation:** (1) Build context (RecapGenerator or PowerRankingGenerator). (2) Optionally call DeepSeek for stats. (3) Call OpenAI with context + stats + sport/league meta; receive headline + body. (4) Persist `MediaArticle` with tags = `[type]`.
- **Error handling:** If OpenAI fails, a fallback article (headline + error message body) is returned and still persisted so the UI can show something. DeepSeek failure is non-fatal (stats omitted).

---

## 4. UI Integration

- **News tab:** New “News” tab in the league shell (`LeagueTabNav`, `LEAGUE_SHELL_TABS`). Renders `NewsTab` (`components/app/tabs/NewsTab.tsx`): list of articles (headline, snippet, date, sport, tags), filters (sport, type/tag), “Generate article” dropdown + button, “Refresh,” and per-article links to detail and “How was this written?”
- **Article detail page:** `/app/league/[leagueId]/news/[articleId]` shows full headline, body, date, sport, tags, “Share” button, and “How was this written?” section (id `ai-explanation`) describing the AI Sports Media Engine.
- **Share:** Article page “Share” uses `navigator.share` when available, else copies URL to clipboard.
- **Filters:** Sport (All + SUPPORTED_SPORTS) and type (All + weekly_recap, power_rankings, trade_breakdown, upset_alert, playoff_preview, championship_recap). Filters drive `useMediaArticles(leagueId, sport, tags)` and GET `/api/leagues/[leagueId]/media?sport=&tags=`.
- **AI explanation links:** List view “How was this written?” links to article page `#ai-explanation`; article page has an in-page section explaining that content is AI-generated and how to generate more.

---

## 5. UI Audit Findings

| Location | Element | Handler | State / API | Navigation / Data | Status |
|----------|--------|---------|-------------|-------------------|--------|
| League shell | News tab | onChange('News') | Renders NewsTab | — | OK |
| NewsTab | Sport filter | setSportFilter | useMediaArticles(leagueId, sport, tags) | Refetch on change | OK |
| NewsTab | Type filter | setTagFilter | useMediaArticles(leagueId, sport, tags) | Refetch on change | OK |
| NewsTab | Refresh | refresh() | GET media list | Hook refresh() | OK |
| NewsTab | Generate type + button | setGenerateType, handleGenerate() | POST media (type); then refresh() | List updates after generate | OK |
| NewsTab | Article link | Link to /app/league/.../news/[articleId] | Client navigation to article page | — | OK |
| NewsTab | “Open in new tab” | target=_blank same URL | New tab to article | — | OK |
| NewsTab | “How was this written?” | Link to article#ai-explanation | Navigate to article + hash | — | OK |
| Article page | Back to News | Link to /app/league/[id]?tab=News | Back to league with News tab | — | OK |
| Article page | Share | handleShare() | navigator.share or clipboard | — | OK |
| Article page | #ai-explanation | In-page section | Static copy | — | OK |
| GET /media | List | useMediaArticles, refresh | Query sport, tags, limit, cursor | Yes | OK |
| GET /media/[articleId] | Article page | Page load | Fetch by articleId scoped to leagueId | Yes | OK |
| POST /media | Generate | handleGenerate | Body type, optional season, week, tradeSummary, skipStatsInsights | refresh() after | OK |

**Notes:** All article links, share, and filters are wired. Data loading uses GET media and GET media/[articleId]; navigation to article detail and back to News tab verified. No dead buttons identified.

---

## 6. QA Results

- **Generation:** POST with type weekly_recap or power_rankings produces an article using league teams and optional season data; headline and body are stored; tags = [type].
- **List:** GET media returns articles for league; sport and tags query params filter correctly (tags filtered client-side when multiple; Prisma JSON filter not used for array-contains).
- **Article page:** Loads by articleId; shows headline, body, date, sport, tags; Share copies or opens native share; “How was this written?” section visible.
- **Filters:** Changing sport or type in News tab triggers useMediaArticles with new params and list updates.
- **Navigation:** News tab → article link → article page → Back to News → league with tab=News. Open in new tab works.
- **Sports:** All seven sports supported in filters and in stored articles; sport comes from league or request.

---

## 7. Fixes

- **Schema:** Added `MediaArticle` with id, leagueId, sport, headline, body, tags (JSON), createdAt and indexes. Migration `20260324000000_add_media_articles` created.
- **Engine:** Implemented RecapGenerator, PowerRankingGenerator, NarrativeBuilder, LeagueMediaEngine; export from `lib/sports-media-engine/index.ts`.
- **APIs:** GET `/api/leagues/[leagueId]/media` (list with sport, tags, limit, cursor); GET `/api/leagues/[leagueId]/media/[articleId]` (single, scoped to league); POST `/api/leagues/[leagueId]/media` (body: type, sport?, leagueName?, season?, week?, tradeSummary?, skipStatsInsights?).
- **UI:** News tab with list, sport/type filters, Generate dropdown + button, Refresh; article links to detail page; article page with Share and AI explanation section; “News” added to LeagueTabNav and league page renderTab and VALID_TABS.
- **List by tags:** When tags are provided, listArticles fetches more rows and filters in memory (Prisma JSON array-contains not used) so tag filter works across all article types.

---

## 8. Checklist

- [ ] Open app league page → News tab; confirm filters, Refresh, Generate article, and list (or empty state).
- [ ] Select “Weekly recap” and click “Generate article”; confirm loading then new article appears in list (or error if OpenAI not configured).
- [ ] Change sport or type filter and confirm list updates (or empty if no match).
- [ ] Click an article headline; confirm article page loads with headline, body, Share, and “How was this written?” section.
- [ ] Click Share; confirm URL copied or native share dialog.
- [ ] Click “Back to News”; confirm league page with News tab active.
- [ ] Click “How was this written?” in list; confirm navigates to article page and #ai-explanation is visible.
- [ ] Verify GET /api/leagues/[leagueId]/media returns { articles, nextCursor }; with sport/tags filters.
- [ ] Verify GET /api/leagues/[leagueId]/media/[articleId] returns { article } for existing id.
- [ ] Verify POST /api/leagues/[leagueId]/media with type returns { articleId, headline, tags }.
- [ ] Confirm no regression to other league tabs (Overview, Standings, Hall of Fame, etc.).

---

## 9. Explanation

The AI Sports Media Engine provides automated league coverage:

1. **Context** is built from your league: standings and teams from `LeagueTeam`, optional season results and champion from `SeasonResult`. RecapGenerator is used for recaps and narrative pieces; PowerRankingGenerator for power rankings (and trade breakdown when trade summary is provided).

2. **Statistical insights** (optional) come from DeepSeek: a short bullet list of key numbers and trends is generated and passed into the article step so the final text can cite specific stats.

3. **Narrative** is produced by OpenAI: one prompt per article type (weekly recap, power rankings, trade breakdown, upset alert, playoff preview, championship recap) so tone and structure fit the format. The system prompt asks for a headline on the first line and body after, with an engaging, league-member-friendly tone (Grok’s role is encoded here when a separate Grok client is not available).

4. **Persistence** stores each generated piece as a `MediaArticle` with leagueId, sport, headline, body, and tags (e.g. `["weekly_recap"]`), so the News tab can list and filter by sport and type and users can share a stable URL to the article page.

5. **UI** gives one place to read and generate: the News tab for list and filters and the article page for full read, share, and a short “How was this written?” explanation so users understand the AI media pipeline.
