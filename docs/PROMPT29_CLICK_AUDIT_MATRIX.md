# Prompt 29 Click Audit Matrix

Meta Insights UI + AI Integration mandatory workflow audit.

Scope includes every button, dropdown, toggle, tab, link, modal action, transition, preview update, submit path, success redirect path, and error path related to:

- `/app/meta-insights`
- `/app/strategy-meta`
- related entry links (`/app/home`, `/waiver-ai`, War Room links)

Columns:

- **Handler/State**: event handler and key state updates
- **API Wiring**: backend endpoint and critical query params
- **Reload/Cache**: verification of refresh, re-fetch, and cache behavior
- **Result**: Pass/Fixed/Not applicable

| ID | UI element | Component | Route | Handler/State | API wiring | Reload/Cache | Result |
|---|---|---|---|---|---|---|---|
| M01 | App home entry card "Meta insights" | `FinalDashboardClient` | `/app/home` | Link navigation | None | Route transition to dashboard | Pass |
| M02 | Waiver header link "Meta insights" | `app/waiver-ai/page.tsx` | `/waiver-ai` | Link navigation with sport query | None | Route transition with sport context | Fixed |
| M03 | Meta page nav "App home" | `app/app/meta-insights/page.tsx` | `/app/meta-insights` | Link navigation | None | Route transition | Pass |
| M04 | Meta page nav "Leagues" | `app/app/meta-insights/page.tsx` | `/app/meta-insights` | Link navigation | None | Route transition | Pass |
| M05 | Meta page nav "Mock draft" | `app/app/meta-insights/page.tsx` | `/app/meta-insights` | Link navigation | None | Route transition | Pass |
| M06 | URL deep-link sport init | `MetaInsightsDashboard` | `/app/meta-insights` | `useEffect(searchParams)` -> `setSport(normalizeToSupportedSport(...))` | Drives all child API params | Initializes correct panel context | Fixed |
| M07 | URL deep-link timeframe init | `MetaInsightsDashboard` | `/app/meta-insights` | `useEffect(searchParams)` -> `setTimeframe(...)` | Drives trend/snapshot/summary requests | Initializes correct panel window | Fixed |
| M08 | URL deep-link tab init | `MetaInsightsDashboard` | `/app/meta-insights` | `useEffect(searchParams)` -> `setMetaTab(...)` | Drives snapshot meta type | Loads target tab on open | Fixed |
| M09 | URL deep-link leagueFormat init | `MetaInsightsDashboard` | `/app/meta-insights` | `useEffect(searchParams)` -> `setLeagueFormat(...)` | Drives strategy endpoint filter | Loads target strategy segment | Fixed |
| M10 | Sport dropdown | `MetaInsightsDashboard` | `/app/meta-insights` | `onChange` -> `setSport(normalizeToSupportedSport(value))` | `/api/player-trend`, `/api/strategy-meta`, `/api/global-meta` | Re-fetch on dependency change | Pass |
| M11 | League format dropdown | `MetaInsightsDashboard` | `/app/meta-insights` | `onChange` -> `setLeagueFormat(value)` | `/api/strategy-meta?leagueFormat=` | Re-fetch strategy panel | Pass |
| M12 | Timeframe dropdown | `TimeframeFilter` + parent | `/app/meta-insights` | `onChange` -> `setTimeframe(value)` | `/api/player-trend`, `/api/strategy-meta`, `/api/global-meta` | Re-fetch + AI summary reset | Pass |
| M13 | Refresh button | `RefreshButton` + parent | `/app/meta-insights` | `onClick` -> `setRefreshKey(k+1)` | Child panels re-hit their APIs | Key remount + effect reload | Pass |
| M14 | Tab button "Draft meta" | `MetaTypeTabs` | `/app/meta-insights` | `onClick` -> `setMetaTab('draft')` | `/api/global-meta?metaType=DraftMeta` | Snapshot panel refetch | Pass |
| M15 | Tab button "Waiver meta" | `MetaTypeTabs` | `/app/meta-insights` | `setMetaTab('waiver')` | `/api/global-meta?metaType=WaiverMeta` | Snapshot panel refetch | Pass |
| M16 | Tab button "Trade meta" | `MetaTypeTabs` | `/app/meta-insights` | `setMetaTab('trade')` | `/api/global-meta?metaType=TradeMeta` | Snapshot panel refetch | Pass |
| M17 | Tab button "Roster meta" | `MetaTypeTabs` | `/app/meta-insights` | `setMetaTab('roster')` | `/api/global-meta?metaType=RosterMeta` | Snapshot panel refetch | Pass |
| M18 | Tab button "Strategy meta" | `MetaTypeTabs` | `/app/meta-insights` | `setMetaTab('strategy')` | `/api/global-meta?metaType=StrategyMeta` | Snapshot panel refetch | Pass |
| M19 | AI Explain button open | `AIExplainTrendButton` | `/app/meta-insights` | `handleClick` -> `setOpen(true)`, fetch summary when uncached | `/api/global-meta?summary=ai&sport=&timeframe=` | `cache: no-store` verified | Pass |
| M20 | AI Explain button close | `AIExplainTrendButton` | `/app/meta-insights` | `handleClick` when open -> `setOpen(false)` | None | Immediate dialog close | Pass |
| M21 | AI summary reset on filter change | `AIExplainTrendButton` | `/app/meta-insights` | `useEffect([sport,timeframe])` clears summary/topTrends/error + closes dialog | Next click uses current params | Prevents stale explain content | Fixed |
| M22 | Snapshot fetch lifecycle | `MetaSnapshotPanel` | `/app/meta-insights` | `useEffect` updates `loading/error/snapshots` | `/api/global-meta?sport=&metaType=&timeframe=` | `cache: no-store` verified | Fixed |
| M23 | Snapshot error UI | `MetaSnapshotPanel` | `/app/meta-insights` | `setError` on API error/catch | Same endpoint | Error text renders | Pass |
| M24 | Player panel add/drop toggle | `PlayerTrendPanel` | `/app/meta-insights` | `onClick` -> `setShowAddDropToggle(v=>!v)` | None | UI preview updates in place | Pass |
| M25 | Player panel toggle prop sync | `PlayerTrendPanel` | `/app/meta-insights` | `useEffect([showAddDrop])` syncs local toggle state | None | Prevents stale toggle state | Fixed |
| M26 | Player row "Details" open | `PlayerTrendPanel` | `/app/meta-insights` | `onClick` -> `setDetailPlayer(row)` | Data from fetched row | Dialog opens with row metrics | Pass |
| M27 | Player detail "Close" | `PlayerTrendPanel` | `/app/meta-insights` | `onClick` -> `setDetailPlayer(null)` | None | Dialog closes cleanly | Pass |
| M28 | Player panel fetch | `PlayerTrendPanel` | `/app/meta-insights` | `useEffect` sets loading/error/data/detail reset | `/api/player-trend?list=&sport=&timeframe=&limit=` | `cache: no-store` verified | Fixed |
| M29 | Player panel error path | `PlayerTrendPanel` | `/app/meta-insights` | `res.error` or `catch` -> `setError` | Same endpoint | Error card visible | Pass |
| M30 | Player link "Trend feed" | `PlayerTrendPanel` | `/app/meta-insights` | Link to trend feed with sport/timeframe | None | Context-preserving navigation | Pass |
| M31 | Player link "Meta Insights" | `PlayerTrendPanel` | `/app/meta-insights` | Link self-navigation | None | Correct route target | Pass |
| M32 | Player link "Waiver AI" | `PlayerTrendPanel` | `/app/meta-insights` | Link navigation | None | Correct route target | Pass |
| M33 | Player detail link "See in Waiver AI" | `PlayerTrendPanel` | `/app/meta-insights` | Link with `highlight` query | None | Context preserved to waiver page | Pass |
| M34 | Strategy success toggle | `StrategyMetaPanel` | `/app/meta-insights` | `onClick` -> `setShowSuccessRate(v=>!v)` | None | Column/bar toggles update | Pass |
| M35 | Strategy toggle prop sync | `StrategyMetaPanel` | `/app/meta-insights` | `useEffect([initialShowSuccess])` syncs local state | None | Prevents stale toggle state | Fixed |
| M36 | Strategy row details open/toggle | `StrategyMetaPanel` | `/app/meta-insights` | `setDetailRow(row)` or null on same row | Data from fetched row | Dialog open/close toggle | Pass |
| M37 | Strategy detail close button | `StrategyMetaPanel` | `/app/meta-insights` | `onClick` -> `setDetailRow(null)` | None | Dialog closes | Pass |
| M38 | Strategy panel fetch | `StrategyMetaPanel` | `/app/meta-insights` | `useEffect` loading/error/data/detail reset | `/api/strategy-meta?sport=&leagueFormat=&timeframe=` | `cache: no-store` verified | Pass |
| M39 | Strategy panel error path | `StrategyMetaPanel` | `/app/meta-insights` | `res.error` or `catch` -> `setError` | Same endpoint | Error card visible | Pass |
| M40 | Strategy link "Strategy meta dashboard" | `StrategyMetaPanel` | `/app/meta-insights` | Link navigation | None | Opens `/app/strategy-meta` | Pass |
| M41 | Strategy link "War Room" | `StrategyMetaPanel` | `/app/meta-insights` | Link navigation | None | Opens `/af-legacy` | Pass |
| M42 | Strategy link "Mock draft" | `StrategyMetaPanel` | `/app/meta-insights` | Link navigation | None | Opens `/mock-draft-simulator` | Pass |
| M43 | Strategy link "Rankings" | `StrategyMetaPanel` | `/app/meta-insights` | Link navigation | None | Opens `/rankings` | Pass |
| M44 | War Room trend player drill-down | `WarRoomMetaWidget` | `/app/meta-insights` | `onClick` -> `setDetailPlayer(row)` toggle | Data from fetched row | Detail dialog reflects live row | Fixed |
| M45 | War Room strategy drill-down | `WarRoomMetaWidget` | `/app/meta-insights` | `onClick` -> `setDetailStrategy(row)` toggle | Data from fetched row | Detail dialog reflects live row | Pass |
| M46 | War Room fetch lifecycle | `WarRoomMetaWidget` | `/app/meta-insights` | `useEffect` loading/error/trending/strategies/detail resets | `/api/player-trend?list=hottest` + `/api/strategy-meta` | `cache: no-store`; refresh aware | Pass |
| M47 | War Room error path | `WarRoomMetaWidget` | `/app/meta-insights` | `setError` on API error/catch | Same endpoints | Error card visible | Pass |
| M48 | War Room detail link "Open player trend context" | `WarRoomMetaWidget` | `/app/meta-insights` | Link with sport/timeframe query | None | Context-preserving navigation | Fixed |
| M49 | War Room link "View full strategy meta" | `WarRoomMetaWidget` | `/app/meta-insights` | Link navigation | None | Correct route target | Pass |
| M50 | War Room link "Strategy dashboard" | `WarRoomMetaWidget` | `/app/meta-insights` | Link with sport/timeframe query | None | Correct deep-link target | Pass |
| M51 | War Room link "Mock draft" | `WarRoomMetaWidget` | `/app/meta-insights` | Link navigation | None | Correct route target | Pass |
| M52 | Strategy page nav "App home" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | Link navigation | None | Correct route target | Pass |
| M53 | Strategy page nav "Meta insights" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | Link navigation | None | Correct route target | Pass |
| M54 | Strategy page nav "Mock draft" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | Link navigation | None | Correct route target | Pass |
| M55 | Strategy page sport dropdown | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onChange` -> `setSport(normalizeToSupportedSport(...))` | `/api/meta-analysis?sport=` | Re-fetch via `load` callback deps | Pass |
| M56 | Strategy page league format dropdown | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onChange` -> `setLeagueFormat(value)` | `/api/meta-analysis?leagueFormat=` | Re-fetch via `load` callback deps | Pass |
| M57 | Strategy page timeframe dropdown | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onChange` -> `setTimeframe(value)` | `/api/meta-analysis?timeframe=&windowDays=` | Re-fetch via `load` callback deps | Pass |
| M58 | Strategy page refresh button | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onClick` -> `load()` | `/api/meta-analysis` | `cache: no-store` verified | Pass |
| M59 | Strategy page success graph toggle | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onClick` -> `setShowSuccessRateBars(v=>!v)` | None | Draft table bars show/hide | Pass |
| M60 | Strategy page tab "Draft strategy widgets" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onClick` -> `setActiveWidgetTab('draft')` | None | Section switch immediate | Pass |
| M61 | Strategy page tab "Roster strategy widgets" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onClick` -> `setActiveWidgetTab('roster')` | None | Section switch immediate | Pass |
| M62 | Strategy page draft row details | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `setDetailShift(row)` or toggle close | Data from loaded analysis | Details dialog stable across refresh | Pass |
| M63 | Strategy page detail close | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `onClick` -> `setDetailShift(null)` | None | Dialog closes | Pass |
| M64 | Strategy page detail link "Open mock draft context" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | Link with sport query | None | Context-preserving navigation | Pass |
| M65 | Strategy page detail link "Open War Room" | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | Link navigation | None | Correct route target | Pass |
| M66 | Strategy page load error path | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `catch` -> `setError('Failed to load meta analysis')` | `/api/meta-analysis` | Error text visible, reload available | Pass |
| M67 | Strategy page deep-link init sport/timeframe/format | `strategy-meta-engine/MetaInsightsPage` | `/app/strategy-meta` | `useEffect(searchParams)` setters | Drives `/api/meta-analysis` params | Opens with intended state | Pass |
| M68 | Submit actions in Prompt 29 scope | All Prompt 29 UI surfaces | `/app/meta-insights`, `/app/strategy-meta` | No submit handlers present (read-only analytics UI) | None | Not applicable | Not applicable |
| M69 | Success redirect in Prompt 29 scope | All Prompt 29 UI surfaces | `/app/meta-insights`, `/app/strategy-meta` | No post-submit success redirects in read-only flows | None | Not applicable | Not applicable |
| M70 | Preview vs saved state consistency | All Prompt 29 UI surfaces | `/app/meta-insights`, `/app/strategy-meta` | UI previews derive directly from fetched API payloads | `/api/player-trend`, `/api/strategy-meta`, `/api/global-meta`, `/api/meta-analysis` | Re-fetch on filters/refresh prevents mismatch | Pass |

## Fix summary tied to matrix

- Added deep-link state hydration on Meta Insights dashboard (`M06-M09`).
- Added cache-bypass fetches and dialog reset behavior to remove stale UI (`M21`, `M22`, `M28`).
- Added War Room trend drill-down and trend-context link (`M44`, `M48`).
- Added Waiver page direct Meta Insights entry link (`M02`).
- Verified no single-sport hardcoding in audited interactions; all sport selectors and links use normalized multi-sport context.

## Test evidence

- `npx playwright test e2e/global-meta-click-audit.spec.ts e2e/player-trend-click-audit.spec.ts e2e/strategy-meta-click-audit.spec.ts` -> 9 passed
- `npm run typecheck` -> passed
- `npm run test -- __tests__/strategy-meta-analyzer.test.ts` -> passed

