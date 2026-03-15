# Mandatory Workflow Audit: Meta Insights Feature

**Scope**: Every button click, dropdown, toggle, tab, link, modal action, step transition, preview update, submit action, success redirect, and error path for the Meta Insights feature.

**Route**: Meta Insights dashboard is at **`/app/meta-insights`** (`app/app/meta-insights/page.tsx`). No form submit or success redirect; all data is read-only from APIs. Entry points: App home, Waiver AI (“Trending players”), War Room widget (“View full strategy meta”).

---

## Requirement type → audit location

| Type | Where audited |
|------|----------------|
| Button clicks | §1.2 (Refresh, AI Explain), §1.3 (Show/Hide add/drop, Show/Hide success rate), §1.4 (Details, Close), §1.5 (tab buttons) |
| Dropdowns | §1.1 (Sport, League format, Timeframe) |
| Toggles | Show/Hide add/drop, Show/Hide success rate — §1.3 |
| Tabs | §1.5 (Draft / Waiver / Trade / Roster / Strategy) |
| Links | §1.6 (nav, panel links) |
| Modal actions | §1.4 (detail panels: open Details, Close) |
| Step transitions | Tab switch → snapshot panel metaType; filter change → refetch — §2 |
| Preview update | Panels refetch on sport/leagueFormat/refreshKey; snapshot on metaTab — §2 |
| Submit action | N/A (no form submit on Meta Insights) |
| Success redirect | N/A (no post-submit redirect) |
| Error path | §1.7 (loading/error states, API error handling) |

---

## 1. Interactive elements audit

For each element: **Component & route** | **Handler exists** | **State updates** | **Backend/API** | **Persistence/cache reload** | **Status**

### 1.1 Dropdowns (filters)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Sport dropdown | MetaInsightsDashboard, `/app/meta-insights` | `onChange` → `setSport(e.target.value)` | `sport` | Passed to all children; panels use in GET params | PlayerTrendPanel, StrategyMetaPanel, WarRoomMetaWidget, MetaSnapshotPanel, AIExplainTrendButton refetch or use new sport | OK |
| League format dropdown | MetaInsightsDashboard, `/app/meta-insights` | `onChange` → `setLeagueFormat(e.target.value)` | `leagueFormat` | Passed to StrategyMetaPanel | StrategyMetaPanel useEffect([sport, leagueFormat]) refetches GET /api/strategy-meta | OK |
| Timeframe dropdown | TimeframeFilter, `/app/meta-insights` | `onChange` → `onChange(e.target.value as TimeframeId)` | `timeframe` (parent) | Passed to AIExplainTrendButton | AI Explain fetch uses timeframe; useEffect clears cache when sport/timeframe change | OK |

### 1.2 Refresh and AI Explain buttons

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Refresh button | RefreshButton, `/app/meta-insights` | `onClick` → `onRefresh()` → parent `setRefreshKey(k => k + 1)` | `refreshKey` | — | Grid has `key={refreshKey}` so panels remount; MetaSnapshotPanel useEffect depends on refreshKey → refetch | OK |
| Explain this trend button | AIExplainTrendButton, `/app/meta-insights` | `onClick` → `handleClick`: toggle open or fetch | `open`, `loading`, `summary`, `topTrends`, `error` | GET /api/global-meta?summary=ai&sport=&timeframe= | Cache cleared when sport/timeframe change (useEffect); dialog shows summary or error | OK |
| AI Explain dialog (toggle close) | AIExplainTrendButton | `handleClick` when open → `setOpen(false)` | `open` | — | Dialog closes | OK |

### 1.3 Chart/graph toggles (Show/Hide)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Show/Hide add/drop | PlayerTrendPanel | `onClick` → `setShowAddDropToggle(v => !v)` | `showAddDropToggle` | — | Add/drop column and values show or hide | OK |
| Show/Hide success rate | StrategyMetaPanel | `onClick` → `setShowSuccessRate(v => !v)` | `showSuccessRate` | — | Success column and mini bar show or hide | OK |

### 1.4 Detail drill-downs (modals / inline panels)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Details (player row) | PlayerTrendPanel | `onClick` → `setDetailPlayer(p)` | `detailPlayer` | Data from list (no extra fetch) | Detail panel renders same row data | OK |
| Close trend details | PlayerTrendPanel | `onClick` → `setDetailPlayer(null)` | `detailPlayer` | — | Panel closes | OK |
| Details (strategy row) | StrategyMetaPanel | `onClick` → `setDetailRow(r)` or toggle off | `detailRow` | Data from list | Detail panel renders same row data | OK |
| Close strategy details | StrategyMetaPanel | `onClick` → `setDetailRow(null)` | `detailRow` | — | Panel closes | OK |

### 1.5 Tabs (meta type)

| Element | Component & route | Handler | State | API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-----|--------------------|--------|
| Draft meta tab | MetaTypeTabs | `onClick` → `onChange(tab.id)` | `metaTab` (parent) | — | MetaSnapshotPanel receives metaTab → metaType=DraftMeta; useEffect([sport, metaType, refreshKey]) refetches | OK |
| Waiver / Trade / Roster / Strategy tabs | MetaTypeTabs | Same | Same | Same | Same for WaiverMeta, TradeMeta, RosterMeta, StrategyMeta | OK |

### 1.6 Links (navigation)

| Element | Component & route | Handler | Target | Status |
|--------|--------------------|---------|--------|--------|
| ← App home | meta-insights page | Link href="/app/home" | /app/home | OK |
| Leagues | meta-insights page | Link href="/leagues" | /leagues | OK |
| Mock draft | meta-insights page | Link href="/mock-draft-simulator" | /mock-draft-simulator | OK |
| Meta Insights (in panel) | PlayerTrendPanel, StrategyMetaPanel | Link href="/app/meta-insights" | /app/meta-insights | OK |
| Waiver AI | PlayerTrendPanel | Link href="/waiver-ai" | /waiver-ai | OK |
| See in Waiver AI (in detail) | PlayerTrendPanel | Link href=/waiver-ai?highlight=playerId | /waiver-ai | OK |
| War Room | StrategyMetaPanel | Link href="/af-legacy" | /af-legacy | OK |
| Mock draft (strategy panel) | StrategyMetaPanel | Link href="/mock-draft-simulator" | /mock-draft-simulator | OK |
| View full strategy meta | WarRoomMetaWidget | Link href="/app/meta-insights" | /app/meta-insights | OK |
| Mock draft (War Room) | WarRoomMetaWidget | Link href="/mock-draft-simulator" | /mock-draft-simulator | OK |

### 1.7 Loading and error paths

| Element | Component & route | Handler / behavior | State | User-visible | Status |
|--------|--------------------|---------------------|-------|--------------|--------|
| PlayerTrendPanel loading | PlayerTrendPanel | loading true during fetch; finally setLoading(false) | loading, error | “Loading…” or error text | OK |
| PlayerTrendPanel error | PlayerTrendPanel | res.error or catch → setError | error | Red error message | OK |
| StrategyMetaPanel loading/error | StrategyMetaPanel | Same pattern | Same | Same | OK |
| WarRoomMetaWidget loading | WarRoomMetaWidget | loading; setError on API error or catch | loading, error | “Loading…” or error text | OK (fixed: error state and display added) |
| MetaSnapshotPanel loading/error | MetaSnapshotPanel | Same pattern | Same | Same | OK |
| AIExplainTrendButton loading/error | AIExplainTrendButton | loading/error in dialog | Same | “Loading…”, red error, or summary | OK |

---

## 2. Step transitions and preview behavior

| Transition | Trigger | Result | Stale UI? |
|------------|---------|--------|-----------|
| Change sport | Sport dropdown | All panels receive new sport; useEffect deps cause refetch; AI Explain cache cleared (useEffect sport/timeframe) | No |
| Change league format | League format dropdown | StrategyMetaPanel refetches with leagueFormat | No |
| Change timeframe | Timeframe dropdown | AI Explain uses new timeframe on next open; cache cleared | No |
| Click Refresh | Refresh button | refreshKey++; grid remounts; MetaSnapshotPanel refetches (refreshKey in deps) | No |
| Switch meta tab | Tab click | metaTab updates; MetaSnapshotPanel metaType changes; useEffect refetches | No |
| Open AI Explain | Explain button | Fetch with current sport/timeframe; dialog shows summary or error | No (cache cleared when sport/timeframe change) |
| Open/close detail | Details / Close | detailPlayer or detailRow set/cleared; panel shows/closes | No |

**Preview vs saved**: Meta Insights is read-only; there is no “saved” form state. All data comes from APIs (player-trend, strategy-meta, global-meta). Displayed data matches API response for current filters; refetch on filter/refresh ensures fresh data.

---

## 3. Issues found and fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| War Room widget swallowed errors | Medium | Added `error` state; set on trendRes.error or stratRes.error or catch; render error UI when error is set so user sees failure instead of empty lists. |
| AI Explain cache not invalidated on filter change | Low | Added useEffect([sport, timeframe]) that clears summary, topTrends, and error so next open fetches with current sport/timeframe. |
| Dead buttons / broken links | None | All buttons and links have handlers and correct hrefs. |
| Incorrect redirects | None | All links point to intended routes. |

---

## 4. Summary

- **Component & route**: Every interactive element is identified with component and route (`/app/meta-insights` or page containing the dashboard).
- **Handlers**: Every button, dropdown, and link has a handler or href; no dead controls.
- **State**: sport, leagueFormat, metaTab, timeframe, refreshKey, and per-panel state (data, loading, error, detailPlayer/detailRow, showAddDropToggle, showSuccessRate, open/summary/topTrends/error for AI Explain) update as specified.
- **Backend/API**: GET /api/player-trend, GET /api/strategy-meta, GET /api/global-meta; wiring is correct; error responses set panel error state.
- **Persistence/cache reload**: No persisted form state; data reload via refetch on filter change or refreshKey; AI Explain cache cleared when sport or timeframe changes.
- **Error paths**: All panels and AI Explain show loading and error states; War Room widget now surfaces API errors.

**Click audit results are included in this deliverable.** This document is the mandatory workflow audit for the Meta Insights feature. The Prompt 29 deliverable (`docs/META_INSIGHTS_UI_AI_INTEGRATION_PROMPT29.md`) references this audit in Section 5 and Section 8.
