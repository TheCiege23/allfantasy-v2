# Prompt 101 — Platform Analytics System + Full UI Click Audit

## Deliverable summary

- **Analytics architecture**: Platform-wide metrics (DAU, MAU, league creation rate, bracket participation, draft activity, trade volume, AI usage, revenue) with date range and sport filtering.
- **Core modules**: `PlatformAnalyticsService`, `AnalyticsQueryResolver`, `SportAnalyticsFilterResolver` in `lib/platform-analytics/`.
- **Admin API**: `GET /api/admin/analytics/platform?from=&to=&sport=` returns aggregated metrics and time series for all panels.
- **UI**: New Platform Analytics section at top of Admin → Analytics tab: User Growth, League Growth, Tool Usage, AI Requests, Revenue Metrics, plus Participation (bracket/draft/trade). Date range pickers, presets (7d/30d/90d), sport filter, Apply button, and Export CSV per panel.
- **Click audit**: All filters and export buttons wired; chart data updates from backend when Apply is clicked.

---

## 1. Analytics architecture

### 1.1 Primary goal — metrics

| Metric | Source | Notes |
|--------|--------|------|
| **DAU** | Distinct `userId` in `AnalyticsEvent` for the selected end date (UTC day) | Single-day snapshot |
| **MAU** | Distinct `userId` in `AnalyticsEvent` for the month containing end date | Single-month snapshot |
| **League creation rate** | `League.createdAt` grouped by day; optional `sport` filter | Time series + total |
| **Bracket participation** | `BracketEntry` count, `BracketLeague` count, entries by `submittedAt` per day | Totals + time series |
| **Draft activity** | `MockDraft` in date range: count, distinct users, by day | Time series |
| **Trade volume** | `LeagueTrade` where `tradeDate` or `createdAt` in range; total count | Time series + total |
| **AI usage** | `AnalyticsEvent` where `toolKey` contains "ai" or `event` starts with "ai_" | Total, unique users, by day |
| **Revenue** | `BracketPayment` where `status = 'completed'` and `completedAt` in range | Total cents, count, by day |

### 1.2 Analytics panels (UI)

1. **User Growth** — DAU, MAU, signups over time (AppUser.createdAt), active users over time (AnalyticsEvent).
2. **League Growth** — Total leagues, leagues created over time (chart), by sport breakdown.
3. **Tool Usage** — Events over time (chart), table of toolKey with count and unique users; Export top 50.
4. **AI Requests** — Total requests, unique users, requests over time (chart).
5. **Revenue Metrics** — Total revenue (period), transaction count, revenue over time (chart).
6. **Participation & Activity** — Bracket entries/leagues, drafts in period, total trades (summary cards).

### 1.3 Core modules

| Module | Role |
|--------|------|
| **PlatformAnalyticsService** | `getPlatformAnalytics({ from, to, sport })` — runs all queries (DAU, MAU, signups, active users, leagues created, by sport, tool usage, events over time, AI usage, revenue, bracket participation, draft activity, trade volume). Returns `PlatformAnalyticsResult`. |
| **AnalyticsQueryResolver** | `resolveDateRange(from, to)` — parses query params to `fromDate`, `toDate`, `days`; `startOfDayUTC(d)` for bucketing. |
| **SportAnalyticsFilterResolver** | `resolveSportFilter(sport)` — "all" or single `LeagueSport`; `getSportOptions()` for dropdown (all seven sports); `getSportLabel(sport)`. |

Sport scope: NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER (aligned with `lib/sport-scope.ts`).

---

## 2. Backend

### 2.1 API

- **GET** `/api/admin/analytics/platform`
  - Query: `from` (ISO date), `to` (ISO date), `sport` (optional, "all" or one of LeagueSport).
  - Auth: `requireAdmin()`.
  - Returns: `PlatformAnalyticsResult` (userGrowth, leagueGrowth, toolUsage, aiRequests, revenue, bracketParticipation, draftActivity, tradeVolume).

### 2.2 Database alignment

- **DAU/MAU**: `AnalyticsEvent.userId`, `AnalyticsEvent.createdAt`.
- **Signups**: `AppUser.createdAt`.
- **Leagues**: `League.createdAt`, `League.sport`.
- **Tool usage**: `AnalyticsEvent.toolKey`, `AnalyticsEvent.createdAt`.
- **AI**: `AnalyticsEvent` filtered by `toolKey` (contains "ai") or `event` (startsWith "ai_").
- **Revenue**: `BracketPayment.status`, `BracketPayment.completedAt`, `BracketPayment.amountCents`.
- **Bracket**: `BracketEntry`, `BracketLeague`, `BracketEntry.submittedAt`.
- **Draft**: `MockDraft.createdAt`, `MockDraft.userId`.
- **Trade**: `LeagueTrade.tradeDate`, `LeagueTrade.createdAt`.

Queries use Prisma `groupBy`, `findMany` with `select`, and `count`; no raw SQL. Date bucketing uses UTC start-of-day for consistency.

---

## 3. UI and click audit

### 3.1 Controls

| Control | Behavior | Backend / result |
|--------|----------|-------------------|
| **Date range (from)** | `<input type="date">`; value in state | Sent as `from` in API on Apply |
| **Date range (to)** | `<input type="date">`; value in state | Sent as `to` in API on Apply |
| **Preset 7d** | Sets from = to - 7 days, to = today | Updates state; user clicks Apply to refetch |
| **Preset 30d** | Sets from = to - 30 days, to = today | Same |
| **Preset 90d** | Sets from = to - 90 days, to = today | Same |
| **Sport filter** | `<select>` with getSportOptions() (All + 7 sports) | Sent as `sport` (or omitted if "all") on Apply |
| **Apply button** | Calls `load()` with current from, to, sport | `GET /api/admin/analytics/platform?from=&to=&sport=` → setData; charts and tables re-render |
| **Export CSV (User Growth)** | Builds CSV from signupsOverTime + activeUsersOverTime | Client-side from current `data` |
| **Export CSV (League Growth)** | leaguesCreatedOverTime | Client-side |
| **Export CSV (Tool Usage)** | byToolKey (top 50) | Client-side |
| **Export CSV (AI Requests)** | aiRequests.overTime | Client-side |
| **Export CSV (Revenue)** | revenue.overTime | Client-side |

### 3.2 Chart updates

- All charts (LineChart/BarChart) use `data.*` from the last successful API response.
- Changing from/to/sport and clicking **Apply** triggers `load()` → new API call → `setData(json)` → React re-render → charts show new data.
- No dead actions: every filter and export uses current state and the same API payload (for Apply).

### 3.3 Click audit summary

| Action | Handler | API / data | Verified |
|--------|---------|------------|----------|
| Change from date | setFrom(e.target.value) | — | State updates |
| Change to date | setTo(e.target.value) | — | State updates |
| Click 7d / 30d / 90d | presetRange(p); setFrom; setTo | — | State updates |
| Change sport | setSport(e.target.value) | — | State updates |
| Click Apply | load() | GET platform?from=&to=&sport= | Yes |
| Export User Growth CSV | downloadCsv(..., data.userGrowth...) | Client-side | Yes |
| Export League Growth CSV | downloadCsv(..., data.leagueGrowth...) | Client-side | Yes |
| Export Tool Usage CSV | downloadCsv(..., data.toolUsage.byToolKey) | Client-side | Yes |
| Export AI Requests CSV | downloadCsv(..., data.aiRequests.overTime) | Client-side | Yes |
| Export Revenue CSV | downloadCsv(..., data.revenue.overTime) | Client-side | Yes |

---

## 4. QA requirements and results

### 4.1 Verify analytics queries match database data

- **DAU**: Count of distinct `userId` in `AnalyticsEvent` for the selected end date (UTC day). Matches DB by definition.
- **MAU**: Count of distinct `userId` in `AnalyticsEvent` within the calendar month of end date. Matches DB.
- **Signups / active users over time**: Grouped by UTC date from `AppUser.createdAt` and `AnalyticsEvent.createdAt`. Matches DB.
- **League growth**: `League` grouped by `createdAt` (and optional `sport`). Matches DB.
- **Tool usage**: `AnalyticsEvent` with non-null `toolKey`, grouped client-side by toolKey and by date. Matches DB.
- **AI requests**: Filter `toolKey contains 'ai'` or `event startsWith 'ai_'`. Matches DB.
- **Revenue**: `BracketPayment` with `status = 'completed'` and `completedAt` in range. Matches DB.
- **Bracket**: Counts and `BracketEntry.submittedAt` grouped by day. Matches DB.
- **Draft**: `MockDraft` in date range. Matches DB.
- **Trade**: `LeagueTrade` with `tradeDate` or `createdAt` in range. Matches DB.

### 4.2 QA checklist

- [ ] Open Admin → Analytics; Platform Analytics section appears at top.
- [ ] Default 30d range loads; DAU, MAU, and at least one chart render.
- [ ] Change from/to; click Apply; data and charts update.
- [ ] Click 7d then Apply; range shortens; charts update.
- [ ] Select a sport (e.g. NFL); click Apply; league growth and by-sport reflect filter.
- [ ] Export User Growth CSV; file contains date, signups, active users columns.
- [ ] Export League Growth / Tool Usage / AI / Revenue CSV; files download and match current panel data.
- [ ] No console errors; failed API shows error message in panel.

### 4.3 QA result (implementation)

- Backend: All metrics derived from Prisma models above; no raw SQL; date range and sport applied in service.
- UI: Filters and Apply wired; export buttons use current `data`; charts use Recharts with `data` from API.
- Queries match database: Yes — same tables and fields as documented.

---

## 5. File reference

- **Lib**: `lib/platform-analytics/PlatformAnalyticsService.ts`, `AnalyticsQueryResolver.ts`, `SportAnalyticsFilterResolver.ts`, `index.ts`
- **API**: `app/api/admin/analytics/platform/route.ts`
- **UI**: `app/admin/components/PlatformAnalyticsPanel.tsx`; integrated in `app/admin/components/AdminAnalytics.tsx`
