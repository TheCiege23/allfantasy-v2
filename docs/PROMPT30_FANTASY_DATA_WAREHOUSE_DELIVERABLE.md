# Prompt 30 — Fantasy Data Warehouse Core Architecture + Full UI Click Audit

Production implementation of the centralized analytics data warehouse and mandatory UI/workflow audit for all warehouse-related interactions.

Latest implementation addendum:

- `docs/PROMPT30_IMPLEMENTATION_REPORT.md`
- `docs/PROMPT30_CLICK_AUDIT_MATRIX.md`

---

## 1. Data warehouse architecture

### Overview

The **Fantasy Data Warehouse** is a centralized analytics store for historical fantasy data across all supported sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). It powers:

- Simulation engine inputs
- Playoff probability models
- Dynasty projection engine
- Rankings and historical league insights
- AI analytics and meta engine inputs
- Player and team trend analysis
- Future league storytelling

### Layered data architecture

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Raw data** | Ingested from APIs and feeds | Existing `PlayerGameStat`, `TeamGameStat`, `GameSchedule`, `Roster`, `LeagueTeam`, `WaiverTransaction`, `WaiverClaim`, `MockDraft`; external stats APIs |
| **Normalized data** | Standardizes data across sports | `StatNormalizationService`; warehouse fact tables use `normalizeSportForWarehouse()` so sport-specific data is never mixed |
| **Analytics data** | Precomputed fantasy analytics, historical facts, simulation-ready datasets | `PlayerGameFact`, `TeamGameFact`, `RosterSnapshot`, `MatchupFact`, `DraftFact`, `TransactionFact`, `SeasonStandingFact`; `AnalyticsFactMaterializer` |

### Directory layout

- **Schema**: `prisma/schema.prisma` — models `PlayerGameFact`, `TeamGameFact`, `RosterSnapshot`, `MatchupFact`, `DraftFact`, `TransactionFact`, `SeasonStandingFact` (tables `dw_*`).
- **Lib**: `lib/data-warehouse/`
  - `types.ts` — sport constants, input types
  - `StatNormalizationService.ts` — normalize stat payloads by sport
  - `WarehouseIngestionService.ts` — write facts to DB
  - `HistoricalFactGenerator.ts` — generate facts from existing league/roster/stats
  - `LeagueHistoryAggregator.ts` — reconstruct league history from facts
  - `WarehouseQueryService.ts` — historical queries, simulation inputs, AI summary
  - `SportWarehouseResolver.ts` — sport-safe resolution
  - `AnalyticsFactMaterializer.ts` — precomputed player/league analytics
  - `pipelines/index.ts` — game stats, matchup, roster snapshot, standings, transaction pipelines
  - `index.ts` — central export
- **API**: `app/api/warehouse/league-history/route.ts` — GET `?leagueId=&season=&fromWeek=&toWeek=` returns warehouse summary for a league.

---

## 2. Schema additions

All new models live in `prisma/schema.prisma` under "Fantasy Data Warehouse (Prompt 30)".

| Model | Table | Key fields |
|-------|-------|------------|
| **PlayerGameFact** | `dw_player_game_facts` | factId, playerId, sport, gameId, teamId, opponentTeamId, statPayload, normalizedStats, fantasyPoints, scoringPeriod, season, weekOrRound, createdAt |
| **TeamGameFact** | `dw_team_game_facts` | factId, teamId, sport, gameId, pointsScored, opponentPoints, result, season, weekOrRound, createdAt |
| **RosterSnapshot** | `dw_roster_snapshots` | snapshotId, leagueId, teamId, sport, weekOrPeriod, season, rosterPlayers, lineupPlayers, benchPlayers, createdAt |
| **MatchupFact** | `dw_matchup_facts` | matchupId, leagueId, sport, weekOrPeriod, teamA, teamB, scoreA, scoreB, winnerTeamId, season, createdAt |
| **DraftFact** | `dw_draft_facts` | draftId, leagueId, sport, round, pickNumber, playerId, managerId, season, createdAt |
| **TransactionFact** | `dw_transaction_facts` | transactionId, leagueId, sport, type, playerId, managerId, rosterId, payload, season, weekOrPeriod, createdAt |
| **SeasonStandingFact** | `dw_season_standing_facts` | standingId, leagueId, sport, season, teamId, wins, losses, ties, pointsFor, pointsAgainst, rank, createdAt (unique leagueId+season+teamId) |

Indexes support queries by league, player, team, sport, season, and week.

---

## 3. Ingestion pipeline services

| Service | Location | Responsibility |
|--------|----------|----------------|
| **WarehouseIngestionService** | `lib/data-warehouse/WarehouseIngestionService.ts` | Writes single fact records (player game, team game, roster snapshot, matchup, draft, transaction, standing). Uses `normalizeSportForWarehouse` on every write. |
| **StatNormalizationService** | `lib/data-warehouse/StatNormalizationService.ts` | Normalizes raw stat payloads per sport; exposes `normalizeStatPayload(sport, raw)` and `fantasyPointsFromNormalized()`. |
| **HistoricalFactGenerator** | `lib/data-warehouse/HistoricalFactGenerator.ts` | Generates facts from existing DB: `generateGameFactsFromExistingStats`, `generateMatchupFactsFromLeague`, `generateStandingFactsFromLeague`, `generateRosterSnapshotsFromLeague`, `generateDraftFactsFromMockDraft`, `generateTransactionFactsFromLeague`. |
| **Pipelines** | `lib/data-warehouse/pipelines/index.ts` | `runGameStatsIngestionPipeline(sport, season, weekOrRound)`, `runMatchupScoringPipeline(leagueId, season, week)`, `runRosterSnapshotPipeline(leagueId, weekOrPeriod, season?)`, `runStandingsIngestionPipeline(leagueId, season)`, `runTransactionIngestionPipeline(leagueId, since?)`. |

Data pipelines implemented:

- **Game stats ingestion** — from `PlayerGameStat` / `TeamGameStat` into `PlayerGameFact` / `TeamGameFact`.
- **Matchup scoring updates** — from `TeamPerformance` into `MatchupFact`.
- **Roster snapshot generation** — from `Roster` into `RosterSnapshot`.
- **Draft history** — from `MockDraft` into `DraftFact` (via `generateDraftFactsFromMockDraft`).
- **Transaction ingestion** — from `WaiverTransaction` into `TransactionFact`.
- **Standings history** — from `LeagueTeam` into `SeasonStandingFact`.
- **Historical league backfill** — use `HistoricalFactGenerator` + pipelines for past seasons/weeks where source data exists.

---

## 4. Integration points with scoring, league, and analytics systems

| System | Integration |
|--------|-------------|
| **Scoring engine** | Existing `PlayerGameStat` / `TeamGameStat` are the source for warehouse `PlayerGameFact` / `TeamGameFact`. Scoring runs write to `PlayerGameStat`; pipelines copy into warehouse. No change to scoring calculation. |
| **League engine** | `League`, `LeagueTeam`, `Roster`, `TeamPerformance` are read by `HistoricalFactGenerator` and pipelines. League page "Previous Leagues" tab calls `GET /api/warehouse/league-history?leagueId=` and displays warehouse summary. |
| **Analytics / meta** | `AnalyticsFactMaterializer` builds `MaterializedPlayerTrend` and `MaterializedLeagueSummary` from warehouse facts. `WarehouseQueryService.getLeagueWarehouseSummaryForAI()` provides payload for AI narrative. Meta/trend engines can query `getPlayerGameFactsForPlayer`, `getPlayerFantasyPointsByPeriod`, etc. |
| **Season forecast / playoff probability** | Existing `SeasonForecastSnapshot` and `lib/season-forecast/warehouse-integration.ts` remain; optional future hook can write simulation runs to a warehouse table if added. |
| **Dynasty / rankings** | Warehouse provides historical facts for dynasty projection and rankings; resolvers can call `getLeagueHistorySummary`, `getStandingsHistory`, `getDraftHistoryForLeague`. |

---

## 5. Full UI click audit findings

Audit covers every **data-warehouse-related** interaction: analytics dashboard entry points, historical data views, player/team history drill-downs, matchup history, season filters, sport filters, date range selectors, warehouse-backed chart toggles, export buttons, AI insight buttons tied to warehouse data, refresh, back navigation, loading and error states.

For each element: **Component & route** | **Handler** | **State** | **Backend/API** | **Persistence/reload** | **Status**.

### 5.1 League page — Previous Leagues (warehouse-backed)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Previous Leagues tab | LeagueHomeShellPage, `/leagues/[leagueId]` | Tab click → setActiveTab("Previous Leagues") | activeTab | — | Tab switch | OK |
| Load warehouse summary | Same | useEffect when activeTab === "Previous Leagues" and leagueId | leagueHistorySummary, leagueHistoryLoading, leagueHistoryError | GET /api/warehouse/league-history?leagueId= | Fetched on tab open; no cache | OK |
| Display summary / error / empty | Same | Render from leagueHistorySummary / leagueHistoryError | — | — | Shows matchupCount, standingCount, rosterSnapshotCount, draftFactCount, transactionCount or "No historical snapshots yet" or error | OK |

### 5.2 Trade evaluator — historical (as-of date)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| As Of Date input | trade-evaluator page | onChange → setAsOfDate(e.target.value) | asOfDate | Passed to trade eval API (historical market values) | Client state; submit sends date | OK |
| Clear date button | Same | onClick → setAsOfDate('') | asOfDate | — | Clears date | OK |
| Submit (historical analysis) | Same | Form submit with asOfDate | loading, error | Trade eval API | Response drives result; no warehouse direct (values API may use historical DB) | OK |

### 5.3 Legacy / AF-Legacy — league history and filters

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| League history filter | af-legacy page | historyFilter state; filter leagues by type | historyFilter, leagues | /api/legacy/trade-history, /api/legacy/trade-analytics, etc. | Refetch on user/league change | OK |
| "No league history found" | Same | Rendered when filtered list empty | — | — | OK |
| Year range / import | Same | Import flow; "year range to import" | — | Legacy import APIs | OK |
| Trade history fetch | Same | fetch /api/legacy/trade-history | — | Legacy API (not warehouse yet) | OK — warehouse can backfill from same sources later |

### 5.4 Admin — analytics (product/telemetry, not warehouse facts)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Analytics tab | AdminLayout, /admin | tab=analytics | — | — | OK |
| Retention / stickiness / events | AdminAnalytics | Fetch on load or filter change | retentionWindow, etc. | GET /api/admin/analytics/retention, stickiness, events | Cache: no-store | OK |
| Date/scope filters | AdminAnalytics | onChange → setState; refetch | — | Query params | OK |
| Export (if present) | — | — | — | — | No export button found in audit; N/A |

### 5.5 Dashboard and app home

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Dashboard entry | /dashboard | Redirect if not auth; else DashboardContent | — | Server props (leagues, entries) | OK |
| Product launcher cards | DashboardContent | Links to leagues, mock draft, etc. | — | — | OK |
| No warehouse-specific entry point on dashboard | — | — | — | League history is under /leagues/[id] → Previous Leagues | OK |

### 5.6 Bracket intelligence dashboard

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Dashboard fetch | bracket-intelligence page | fetch /api/bracket/intelligence/dashboard | dashboard, error | GET /api/bracket/intelligence/dashboard | OK |
| Analytics insight events | Same | fetch /api/analytics/insight (track) | — | — | OK |
| Not warehouse-backed | — | Bracket uses its own tournament/entry data | — | — | OK |

### 5.7 Import loading — "Loading leagues & history"

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Step label | import-loading page | "Loading leagues & history" step | activeStep | — | OK |
| No direct warehouse API | — | Import flow writes to League/Roster etc.; pipelines can backfill warehouse later | — | — | OK |

### 5.8 League page — other tabs (context for warehouse)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Standings/Playoffs | LeagueHomeShellPage | Tab + fetch standings | standings from /api/bracket/leagues/[id]/standings | — | OK |
| Matchups, Roster, etc. | Same | Tab switch; data from loadLeagueData | — | — | OK |
| Refresh (implicit) | Same | loadLeagueData on mount | — | — | No explicit "Refresh" on Previous Leagues; tab re-open re-fetches | OK |

### 5.9 Loading and error states (warehouse-related)

| Element | Component & route | Handler / behavior | State | User-visible | Status |
|--------|--------------------|---------------------|-------|--------------|--------|
| Previous Leagues loading | leagues/[leagueId] | leagueHistoryLoading true during fetch | leagueHistoryLoading | "Loading historical data…" | OK |
| Previous Leagues error | Same | leagueHistoryError set on API error | leagueHistoryError | Red error message | OK |
| Previous Leagues empty | Same | leagueHistorySummary with all counts 0 | — | "No historical snapshots yet. Run ingestion pipelines…" | OK |

### Summary (UI audit)

- **Warehouse-backed UI**: League page → Previous Leagues tab → GET /api/warehouse/league-history; handler exists; state updates; API wired; data reloads on tab open. **Fixed**: Replaced placeholder note with real fetch and summary/error/empty states.
- **Historical views (not yet warehouse)**: Trade evaluator "As Of Date" uses existing historical values API; Legacy trade history uses legacy API. Both can be backed by warehouse data in future without UI change.
- **Analytics dashboards**: Admin analytics (retention, stickiness, events) are product telemetry; bracket intelligence is tournament-specific. No dead buttons or wrong redirects found.
- **Sport/date filters**: Trade evaluator has date; league page warehouse summary can be extended with season/fromWeek/toWeek query params (API already supports them).

---

## 6. QA findings

- **Schema**: New warehouse models added; `npx prisma generate` run successfully.
- **Sport normalization**: All ingestion paths use `normalizeSportForWarehouse`; NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER supported; incompatible structures are not mixed.
- **League page Previous Leagues**: Before fix, tab showed only a static note. After fix: fetches warehouse summary, shows counts or "No historical snapshots yet" or error. No dead button; state and API verified.
- **Pipelines**: Not yet invoked by a cron or UI button; they are callable from jobs or admin tools. Backfill can be run manually or scheduled.
- **Existing systems**: No breaking changes to multi-sport league engine, player DB, matchup engine, scoring engine, global meta, AI analytics, league history, rankings, draft engine, waiver system, trade analyzer, or other dashboards.

---

## 7. Issues fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| League page "Previous Leagues" was placeholder only | Medium | Wired tab to GET /api/warehouse/league-history; added state (leagueHistorySummary, leagueHistoryLoading, leagueHistoryError); render summary counts or empty message or error. |
| No warehouse API for frontend | Medium | Added GET /api/warehouse/league-history with leagueId, optional season, fromWeek, toWeek. |
| No centralized warehouse layer | High | Implemented full architecture: schema, StatNormalizationService, WarehouseIngestionService, HistoricalFactGenerator, LeagueHistoryAggregator, WarehouseQueryService, SportWarehouseResolver, AnalyticsFactMaterializer, pipelines. |

---

## 8. Final QA checklist

- [x] Warehouse schema added (PlayerGameFact, TeamGameFact, RosterSnapshot, MatchupFact, DraftFact, TransactionFact, SeasonStandingFact).
- [x] All supported sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) normalized via SportWarehouseResolver / normalizeSportForWarehouse.
- [x] Ingestion services and pipelines implemented and exportable.
- [x] Integration with existing scoring/league/analytics documented; no breaking changes.
- [x] League page "Previous Leagues" tab: handler exists, state updates, API wired, persisted/cached data reloads on tab open.
- [x] Loading and error states for warehouse-backed view implemented.
- [x] Full UI click audit completed and documented above.
- [x] **Backfill trigger and schedule**: Admin POST `/api/admin/warehouse/backfill` and cron POST `/api/cron/warehouse-backfill` added (see below).
- [ ] Optional: Wire trade-evaluator historical values to warehouse-backed query. Not required for deliverable.

---

## 9. Explanation of the fantasy data warehouse

The **Fantasy Data Warehouse** is a dedicated store for historical fantasy facts. It sits alongside the operational database (leagues, rosters, matchups, stats) and is filled by:

1. **Pipelines** that copy or derive data from existing tables (e.g. `PlayerGameStat` → `PlayerGameFact`, `TeamPerformance` → `MatchupFact`, `LeagueTeam` → `SeasonStandingFact`).
2. **Normalization** so every fact is tagged with a canonical sport and, where applicable, normalized stat maps so analytics and AI see a consistent shape across sports.
3. **Query services** that support historical league reconstruction, player/team drill-downs, simulation inputs, trend detection, and AI summary payloads.

The warehouse does **not** replace the primary league or scoring engines; it is a read-optimized, analytics-focused layer. Dashboards (e.g. league "Previous Leagues" tab), simulation engines, playoff probability models, dynasty projections, rankings, and AI can read from it. Write path is through ingestion services and pipelines so that operational systems remain the source of truth and the warehouse is updated in a controlled way.

---

## 10. Triggering and scheduling backfill

**Admin trigger (manual)**  
- **POST** `/api/admin/warehouse/backfill`  
- Requires admin auth (`isAuthorizedRequest`).  
- Body (JSON):  
  - `leagueIds?: string[]` — limit to these leagues; if omitted, all leagues (optionally filtered by sport/season) are used.  
  - `sport?: string` — e.g. `"NFL"`.  
  - `season?: number` — e.g. `2024`.  
  - `weeks?: number[]` — e.g. `[1,2,...,14]`; default 1–18.  
  - `pipelines?: ("gameStats"|"matchups"|"standings"|"rosterSnapshots"|"transactions")[]` — default: all except `gameStats`.  
  - `dryRun?: boolean` — if true, no writes; only returns what would be run.  
- Example: `curl -X POST .../api/admin/warehouse/backfill -H "Content-Type: application/json" -d '{"season":2024,"dryRun":true}'`

**Scheduled (cron)**  
- **POST** `/api/cron/warehouse-backfill`  
- Secured by header `x-cron-secret` or `x-admin-secret` matching `WAREHOUSE_CRON_SECRET` or `CRON_SECRET` or `ADMIN_PASSWORD`.  
- Query params: `season`, `sport`, `dryRun=1` (optional).  
- Runs standings, matchups, roster snapshots, transactions for all leagues (or filtered by sport/season).  
- Example (Vercel Cron): add to `vercel.json` under `crons`:  
  `{ "path": "/api/cron/warehouse-backfill", "schedule": "0 4 * * *" }` (daily at 4 AM UTC), and set `WAREHOUSE_CRON_SECRET` in env.  
- Or call from any scheduler (e.g. GitHub Actions, cron job) with the secret in the header.
