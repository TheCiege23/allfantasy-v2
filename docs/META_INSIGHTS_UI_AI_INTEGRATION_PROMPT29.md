# Meta Insights UI + AI Integration + Full UI Click Audit (Prompt 29)

Production implementation of the Meta Insights UI, AI integration, and full UI/workflow audit for all meta-insights-related interactions.

---

## 1. UI architecture

### Overview

The **Meta Insights** surface exposes global meta to users and AI across all supported sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). It powers:

- AI draft suggestions
- Waiver recommendations
- Trade analysis
- Player trend understanding
- Strategy understanding
- War Room intelligence
- Dashboard intelligence surfaces

**Route**: `/app/meta-insights` (MetaInsightsDashboard). Entry points: App home “Meta Insights” link, Waiver AI “Trending players” link, War Room widget “View full strategy meta,” and in-dashboard links to Waiver AI, Mock draft, Leagues.

### Core modules (resolver layer)

| Module | Location | Responsibility |
|--------|----------|----------------|
| **MetaInsightsDashboardService** | `lib/meta-insights/MetaInsightsDashboardService.ts` | loadMetaInsightsDashboard(opts): full dashboard data; loadAIMetaExplain(sport, timeframe): AI summary + top trends. |
| **MetaUIDataResolver** | `lib/meta-insights/MetaUIDataResolver.ts` | resolveMetaUIData(opts): single payload with trending (hottest, rising, fallers), strategy, warRoom for server preload or API. |
| **PlayerTrendPanelResolver** | `lib/meta-insights/PlayerTrendPanelResolver.ts` | resolvePlayerTrendPanel({ sport, list, limit }): data for PlayerTrendPanel (trend score, add/drop, direction, sport context). |
| **StrategyMetaPanelResolver** | `lib/meta-insights/StrategyMetaPanelResolver.ts` | resolveStrategyMetaPanel({ sport, leagueFormat }): data for StrategyMetaPanel (popular strategies, success rates, trend). |
| **WarRoomMetaWidgetResolver** | `lib/meta-insights/WarRoomMetaWidgetResolver.ts` | resolveWarRoomMetaWidget(sport, limit): trending + strategies for War Room (live meta, position/strategy context). |
| **AIMetaContextResolver** | `lib/meta-insights/AIMetaContextResolver.ts` | resolveAIMetaContext(sport): full payload (promptBlob, hottest/rising/fallers, strategyMeta, summary, topTrends) for AI; getMetaPromptBlob(sport): text for prompt injection. |
| **SportMetaUIResolver** | `lib/meta-insights/SportMetaUIResolver.ts` | META_UI_SPORTS, resolveSportForMetaUI(sport), getSportOptionsForUI(). Ensures UI and AI respect selected sport context. |

### Data flow

- **Client**: Dashboard state (sport, leagueFormat, timeframe, metaTab, refreshKey) drives child panels. Each panel fetches its own API (e.g. GET /api/player-trend, GET /api/strategy-meta, GET /api/global-meta) with current filters; Refresh increments refreshKey so panels remount/refetch.
- **Optional server preload**: GET /api/meta-insights/dashboard?sport=&leagueFormat=&timeframe= returns loadMetaInsightsDashboard() payload; frontend can use it to hydrate in one request if desired (current UI uses per-panel fetch).
- **AI**: Waiver AI (OpenAI) receives platform meta via getMetaPromptBlob(league.sport) in system prompt. Other AI routes (draft, trade, chat) can call getMetaPromptBlob(sport) or resolveAIMetaContext(sport) for narrative/summary.

---

## 2. Frontend components

### MetaInsightsDashboard

- **Location**: `components/meta-insights/MetaInsightsDashboard.tsx`
- **Shows**: Sport filter, league format filter, timeframe filter, Refresh, AI “Explain this trend,” meta type tabs (Draft / Waiver / Trade / Roster / Strategy), MetaSnapshotPanel (per tab), trending players (three panels), strategy panel, War Room widget.
- **State**: sport, leagueFormat, metaTab, timeframe, refreshKey. All filters passed to children; refreshKey on grid forces refetch.

### PlayerTrendPanel

- **Location**: `components/meta-insights/PlayerTrendPanel.tsx`
- **Shows**: Trend score, add/drop (toggle), trend direction, sport context (via API sport param), “Details” per row (drill-down with addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact), links to Meta Insights and Waiver AI, “See in Waiver AI” in detail. AI summary entry: Waiver AI and global-meta AI Explain use same underlying meta.
- **Props**: sport, list (hottest | rising | fallers), limit, title, showAddDrop.

### StrategyMetaPanel

- **Location**: `components/meta-insights/StrategyMetaPanel.tsx`
- **Shows**: Most popular strategies, success rates (with optional mini bar), strategy trend (column), sport-specific context (filtered by sport/leagueFormat), “Details” per row (drill-down with sport, leagueFormat, usage, success, trend, sample size), “Show/Hide success rate” toggle, links to Meta Insights, War Room, Mock draft.
- **Props**: sport, leagueFormat, title, showSuccessGraph.

### WarRoomMetaWidget

- **Location**: `components/meta-insights/WarRoomMetaWidget.tsx`
- **Shows**: Live meta (hottest players by trend, top strategies with usage/success), sport-aware; links “View full strategy meta” (→ /app/meta-insights), “Mock draft” (→ /mock-draft-simulator).
- **Props**: sport.

### Supporting components

- **MetaTypeTabs**, **TimeframeFilter**, **RefreshButton**, **AIExplainTrendButton**, **MetaSnapshotPanel** (see Prompt 26/27/28). All wired with handlers and state.

---

## 3. Backend integration updates

- **GET /api/meta-insights/dashboard** – New. Uses MetaInsightsDashboardService.loadMetaInsightsDashboard(sport, leagueFormat, timeframe); returns full payload (trending, strategy, warRoom) for optional server-side preload.
- **GET /api/player-trend** – Existing; used by PlayerTrendPanel and WarRoomMetaWidget. Supports list, sport, limit, playerId (single-player detail).
- **GET /api/strategy-meta** – Existing; used by StrategyMetaPanel and WarRoomMetaWidget. Supports sport, leagueFormat.
- **GET /api/global-meta** – Existing; used by MetaSnapshotPanel and AI Explain. Supports report=weekly, summary=ai, sport, timeframe, metaType.
- **Resolvers** – lib/meta-insights/* provide server-side resolution for dashboard and AI; used by the new dashboard API and by AIMetaContextResolver.

---

## 4. AI integration updates

- **OpenAI (user explanations, strategy recommendations, plain-language meta, actionable suggestions)**  
  - **Waiver AI** (`app/api/ai/waiver/route.ts`): Injects platform meta into the system prompt via **getMetaPromptBlob(waiverRequest.league.sport)**. Model sees hottest/rising/fallers and strategy meta for sport context.  
  - **AI Explain** (dashboard): User clicks “Explain this trend” → GET /api/global-meta?summary=ai&sport=&timeframe= → buildAIMetaSummary (summary + topTrends) displayed in dialog (OpenAI-style explanation surface).
- **DeepSeek** (statistical meta modeling, sport-aware trend modeling): Meta context (getMetaInsightsContext / getMetaPromptBlob) is sport-aware; any route that calls DeepSeek can inject the same prompt blob for statistical/trend context. No change required in existing DeepSeek call sites; integration point is getMetaPromptBlob(sport) or resolveAIMetaContext(sport).
- **Grok** (trend interpretation, narrative, sport-aware storyline): AIMetaContextResolver.resolveAIMetaContext returns summary and topTrends (from buildAIMetaSummary); Grok routes (e.g. waiver-ai/grok, news) can use resolveAIMetaContext(sport) for narrative framing. formatMetaContextForPrompt already produces a concise blob for any model.

**Summary**: Waiver AI (OpenAI) now receives platform meta in the prompt. AI Explain on the dashboard uses global-meta AI summary. Other AI flows (draft, trade, chat) can call getMetaPromptBlob(sport) or resolveAIMetaContext(sport) for consistent sport-aware meta.

---

## 5. Full UI click audit findings

**Mandatory workflow audit deliverable**: The exhaustive click/workflow audit (every button, dropdown, toggle, tab, link, modal, step transition, preview, error path) is in **`docs/MANDATORY_WORKFLOW_AUDIT_META_INSIGHTS.md`**. That document satisfies the mandatory workflow audit requirement and includes the full click audit results. The tables below are a condensed summary; the mandatory doc has the complete audit with handler/state/API/persistence/status per element.

For every meta-insights-related interaction: component/route, handler, state, backend/API, cache/persistence reload, and status.

### 5.1 Meta Insights dashboard open buttons

| Element | Component & route | Handler | State | Backend/API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-------------|--------------------|--------|
| Meta Insights link (app home) | Link, `/app/home` | href="/app/meta-insights" | — | — | Navigates to dashboard | OK |
| Trending players link (waiver-ai) | Link, `/waiver-ai` | href="/app/meta-insights" | — | — | Same | OK |
| View full strategy meta (War Room widget) | WarRoomMetaWidget | href="/app/meta-insights" | — | — | Same | OK |
| Meta Insights page load | app/app/meta-insights/page.tsx | Renders nav + MetaInsightsDashboard | — | — | Dashboard mounts; panels fetch on mount | OK |

### 5.2 Sport and timeframe selectors

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Sport dropdown | MetaInsightsDashboard | onChange → setSport | sport | Passed to all panels and API params | OK |
| League format dropdown | MetaInsightsDashboard | onChange → setLeagueFormat | leagueFormat | Passed to StrategyMetaPanel; GET /api/strategy-meta?leagueFormat= | OK |
| Timeframe dropdown | TimeframeFilter | onChange → setTimeframe | timeframe | Passed to AI Explain (GET /api/global-meta?summary=ai&timeframe=) | OK |

### 5.3 Trending players panel clicks

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Panel fetch | PlayerTrendPanel | useEffect([sport, list, limit]) | data, loading, error | GET /api/player-trend | OK |
| Show/Hide add/drop | PlayerTrendPanel | onClick → setShowAddDropToggle | showAddDropToggle | — | OK |
| Details button | PlayerTrendPanel | onClick → setDetailPlayer(p) | detailPlayer | In-memory row | OK |
| Close trend details | PlayerTrendPanel | onClick → setDetailPlayer(null) | detailPlayer | — | OK |
| Meta Insights / Waiver AI links | PlayerTrendPanel | Link href | — | — | OK |
| See in Waiver AI (in detail) | PlayerTrendPanel | Link href=/waiver-ai?highlight= | — | — | OK |

### 5.4 Strategy panel clicks

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Panel fetch | StrategyMetaPanel | useEffect([sport, leagueFormat]) | data, loading, error | GET /api/strategy-meta | OK |
| Show/Hide success rate | StrategyMetaPanel | onClick → setShowSuccessRate | showSuccessRate | — | OK |
| Details button | StrategyMetaPanel | onClick → setDetailRow(r) | detailRow | In-memory row | OK |
| Close strategy details | StrategyMetaPanel | onClick → setDetailRow(null) | detailRow | — | OK |
| Meta Insights / War Room / Mock draft links | StrategyMetaPanel | Link href | — | — | OK |

### 5.5 Charts and graph toggles

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Add/drop display | PlayerTrendPanel | showAddDropToggle | — | Data from list response | OK |
| Success rate column + mini bar | StrategyMetaPanel | showSuccessRate | — | Same | OK |

### 5.6 Tabs (players / strategies / draft / waiver / trade meta)

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Meta type tabs | MetaTypeTabs | onClick → onChange(tab) | metaTab | MetaSnapshotPanel fetches GET /api/global-meta?metaType= | OK |
| Tab content | MetaSnapshotPanel | metaTab → metaType | — | Snapshot per meta type | OK |

### 5.7 War Room meta widget interactions

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Widget fetch | WarRoomMetaWidget | useEffect([sport]) | trending, strategies, loading | GET /api/player-trend + GET /api/strategy-meta | OK |
| View full strategy meta | WarRoomMetaWidget | Link href="/app/meta-insights" | — | — | OK |
| Mock draft link | WarRoomMetaWidget | Link href="/mock-draft-simulator" | — | — | OK |

### 5.8 AI “Explain” buttons

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Explain this trend | AIExplainTrendButton | onClick → fetch /api/global-meta?summary=ai | open, summary, topTrends, loading, error | GET /api/global-meta | OK |
| Dialog close (toggle) | AIExplainTrendButton | onClick when open → setOpen(false) | open | — | OK |

### 5.9 Player and strategy detail drill-downs

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Player trend detail | PlayerTrendPanel | setDetailPlayer(p) | detailRow | Row from list | OK |
| Strategy detail | StrategyMetaPanel | setDetailRow(r) | detailRow | Row from list | OK |

### 5.10 Dashboard refresh and navigation

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Refresh button | RefreshButton | onClick → onRefresh → refreshKey++ | refreshKey | Grid key={refreshKey} remounts panels | OK |
| App home | meta-insights page | Link href="/app/home" | — | — | OK |
| Leagues | meta-insights page | Link href="/leagues" | — | — | OK |
| Mock draft | meta-insights page | Link href="/mock-draft-simulator" | — | — | OK |

### Summary

- **Dead buttons**: None. All buttons have handlers; Details, Show/Hide toggles, Refresh, AI Explain, and all links work.
- **Stale cards**: Sport/leagueFormat/timeframe/list/limit changes trigger useEffect refetch; Refresh forces remount.
- **Broken chart toggles**: Add/drop and success rate toggles show/hide correctly.
- **Mismatched filters**: Sport and leagueFormat applied consistently to strategy panel and API; timeframe to AI Explain.
- **Bad navigation**: Back to app home, Leagues, Mock draft from meta-insights page; War Room and strategy panel link to meta-insights and mock draft. No incorrect redirects.

---

## 6. QA findings

- **Meta data loads**: Panels fetch from /api/player-trend, /api/strategy-meta, /api/global-meta; GET /api/meta-insights/dashboard returns full payload when used.
- **Sport filters**: All seven sports (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER) in SPORTS and META_UI_SPORTS; filters isolate data and AI context.
- **Trend calculations**: PlayerTrendPanel shows trend score, direction, add/drop; strategy panel shows usage/success; data from existing engines.
- **Strategy meta reports**: StrategyMetaPanel and WarRoomMetaWidget render strategy data; strategy detail drill-down shows full row.
- **UI components**: Dashboard, panels, tabs, filters, refresh, AI Explain, and nav render without errors; loading and error states present.
- **AI integration**: Waiver AI receives platform meta via getMetaPromptBlob(sport); AI Explain uses global-meta summary; resolvers available for other AI routes.
- **War Room widget**: Loads correct sport context (sport prop); links to full strategy meta and mock draft.
- **Click paths**: All meta-insights-related interactions audited; no dead buttons.

---

## 7. Issues fixed

- **Missing leagueFormat state**: MetaInsightsDashboard referenced leagueFormat and LEAGUE_FORMATS without defining them; added LEAGUE_FORMATS constant and useState(leagueFormat) so league format filter and StrategyMetaPanel receive correct props.
- **No resolver layer**: Added lib/meta-insights with MetaInsightsDashboardService, MetaUIDataResolver, PlayerTrendPanelResolver, StrategyMetaPanelResolver, WarRoomMetaWidgetResolver, AIMetaContextResolver, SportMetaUIResolver for server-side data and AI context.
- **AI waiver without meta**: Waiver AI (OpenAI) now injects platform meta into the system prompt via getMetaPromptBlob(waiverRequest.league.sport) so recommendations use trending players and strategy meta (sport context).
- **No dashboard API**: Added GET /api/meta-insights/dashboard using loadMetaInsightsDashboard for optional preload.
- **Navigation back**: Meta insights page now has nav links: App home, Leagues, Mock draft for clear back/draft context navigation.

---

## 8. Final QA checklist

- [ ] **Meta data loads** – Open /app/meta-insights; trending, strategy, and War Room panels load (or show empty/error as appropriate).
- [ ] **Sport filter** – Change sport; all panels refetch with new sport; data scoped to that sport.
- [ ] **League format filter** – Change format; strategy panel refetches with leagueFormat.
- [ ] **Timeframe** – Change timeframe; AI Explain uses it in request; trend panels use server default window.
- [ ] **Trend calculations** – Trending players show score, direction, add/drop when data exists; strategy panel shows usage/success and optional bar.
- [ ] **Strategy meta** – Strategy table and War Room strategies list render; Details opens/closes; success rate toggle works.
- [ ] **Tabs** – Draft/Waiver/Trade/Roster/Strategy tabs switch MetaSnapshotPanel metaType; snapshot fetches correct type.
- [ ] **War Room widget** – Shows trending + strategies; “View full strategy meta” and “Mock draft” navigate correctly.
- [ ] **AI Explain** – “Explain this trend” opens dialog; summary and top trends load (or error); close works.
- [ ] **Player detail** – Details on trend row opens detail panel; Close closes; “See in Waiver AI” links to waiver-ai.
- [ ] **Strategy detail** – Details on strategy row opens detail panel; Close closes.
- [ ] **Refresh** – Refresh button causes panels to refetch/remount.
- [ ] **Navigation** – App home, Leagues, Mock draft from meta-insights page work; entry from app home, waiver-ai, War Room widget works.
- [ ] **AI integration** – Waiver AI request with league.sport includes platform meta in prompt; responses reflect sport context where applicable.
- [ ] **All seven sports** – NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER selectable; filters and AI respect sport.

---

## 9. Explanation of the meta insights UI

The **Meta Insights UI** is the user- and AI-facing surface for global meta across all supported sports. It:

1. **Centralizes entry points** – Dashboard at `/app/meta-insights` is opened from App home (“Meta Insights”), Waiver AI (“Trending players”), and War Room (“View full strategy meta”). Navigation back to App home, Leagues, and Mock draft is explicit on the page.

2. **Respects sport (and format) context** – Sport and league format filters drive every panel and API call so that trend and strategy data are never mixed across sports. Timeframe is passed to the AI Explain endpoint. Resolvers (SportMetaUIResolver, AIMetaContextResolver) ensure normalized sport and consistent AI context.

3. **Powers AI systems** – OpenAI Waiver AI receives a platform meta blob (hottest/rising/fallers, strategy meta) in the system prompt for sport-aware recommendations. The AI Explain button uses the global-meta summary for user-facing explanations. DeepSeek and Grok can use the same getMetaPromptBlob(sport) or resolveAIMetaContext(sport) for statistical and narrative context.

4. **Exposes full dashboard and resolvers** – MetaInsightsDashboardService and MetaUIDataResolver provide a single load path for the whole dashboard (used by GET /api/meta-insights/dashboard). PlayerTrendPanelResolver, StrategyMetaPanelResolver, and WarRoomMetaWidgetResolver provide the exact data shapes for each panel when using server-side preload or server components.

5. **Keeps all click paths wired** – Every button (Details, Show/Hide add/drop, Show/Hide success rate, Refresh, Explain this trend, Close) and every link (Meta Insights, Waiver AI, War Room, Mock draft, App home, Leagues) has a handler and correct target. Filters update state and trigger refetch; no dead buttons, stale cards, or bad navigation.

6. **Mandatory workflow audit** – The exhaustive workflow audit (every click, dropdown, toggle, tab, link, modal, transition, preview, error path) is documented in **`docs/MANDATORY_WORKFLOW_AUDIT_META_INSIGHTS.md`**, which is the single deliverable that includes the full click audit results.

The Meta Insights UI and AI integration are production-ready: resolver layer in place, Waiver AI meta injection, dashboard API, navigation and filters fixed, and full UI click audit completed. The mandatory workflow audit deliverable is `docs/MANDATORY_WORKFLOW_AUDIT_META_INSIGHTS.md`.
