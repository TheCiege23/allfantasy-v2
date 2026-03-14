# Meta Insights UI + AI — QA and Production Readiness

## Implemented

### Prompt 3 (Strategy Meta Analyzer)
- **Chunk 2:** Pattern detection rules in `lib/strategy-meta/StrategyPatternAnalyzer.ts` and `detection-config.ts`: ZeroRB, HeroRB, EarlyQB, LateQB, EliteTE, BalancedBuild, RookieHeavyBuild, VeteranHeavyBuild, StackingStrategies. Configurable per sport (NFL/NCAAF use RB/QB/TE; others use generic).
- **Chunk 3:** `StrategyMetaReport` Prisma model; `StrategyReportService.generateStrategyMetaReports()` and `getStrategyMetaReports()`; GET/POST `/api/strategy-meta`.

### Prompt 4 (Meta Insights UI + AI)
- **Chunk 1:** `components/meta-insights/`: `MetaInsightsDashboard`, `PlayerTrendPanel`, `StrategyMetaPanel`, `WarRoomMetaWidget`. Page: `/app/meta-insights`.
- **Chunk 2:** `lib/ai-meta-context.ts`: `getMetaInsightsContext(sport)` (server-side, uses player-trend and strategy-meta libs), `formatMetaContextForPrompt(ctx)` for AI prompt injection.
- **Chunk 3:** QA checklist and performance notes below.

---

## QA Checklist

- [ ] **Meta data loads** — `/app/meta-insights` loads; sport selector works; Player trend panels show data or "No trend data yet"; Strategy meta panel shows data or "No strategy reports yet".
- [ ] **Player trend API** — GET `/api/player-trend?list=hottest&sport=NFL` returns 200 and `data` array; rising/fallers work; sport filter works.
- [ ] **Strategy meta API** — GET `/api/strategy-meta?sport=NFL` returns 200 and `data` array. POST with `{ sport: "NFL" }` runs report generation (may take a while); response has `reports` and `errors`.
- [ ] **Trend calculations** — Waiver processing records trend events; after processing claims, player trend scores update (or run `updatePlayerTrend` for a player).
- [ ] **Strategy reports** — After POST `/api/strategy-meta`, reports exist in DB; GET returns them; usage/success rates are in 0–1 range.
- [ ] **UI components** — Panels render without errors; War Room widget shows hottest + top strategies; layout is responsive.
- [ ] **AI context** — In an API route, `getMetaInsightsContext("NFL")` returns hottest/rising/fallers and strategyMeta; `formatMetaContextForPrompt(ctx)` produces a short string for system/user prompt.
- [ ] **Caching** — Meta queries (player-trend, strategy-meta) can be cached (e.g. 5–15 min) in callers or via Next.js cache; heavy report generation (POST) should run async/cron, not blocking request.

---

## Performance

- **Meta queries:** Consider `revalidate = 60` or SWR with 5–15 min stale for GET `/api/player-trend` and `/api/strategy-meta` on the dashboard.
- **Report generation:** `generateStrategyMetaReports()` fetches leagues, then for each league: SeasonResult, drafts, draft picks. Run as cron or admin-only POST; limit `leagueIds` or `take` leagues to avoid timeouts.
- **Dashboard load:** Meta insights page only fetches trend + strategy when mounted; no heavy work on first paint.

---

## Integration Points for AI

- **Waiver AI:** In waiver-ai route, call `getMetaInsightsContext(league.sport)` and append `formatMetaContextForPrompt(ctx)` to system or user prompt so the model sees "fastest rising" and strategy meta.
- **Draft assistant:** Same; inject meta context so the model can say e.g. "ZeroRB builds are trending in dynasty leagues."
- **Trade analyzer:** Inject strategy meta for narrative e.g. "This trade aligns with a rising WR-heavy strategy."

---

## Issues Fixed in This Pass

- Strategy report generation: use draft picks only for roster positions (from pick position), not a single league roster fetch.
- AI meta context: use libs directly (getHottestPlayers, getStrategyMetaReports) instead of self-fetch to avoid base URL and double fetch.
- League format segmentation: reports grouped by `leagueFormat` and upserted per (strategyType, sport, leagueFormat).
