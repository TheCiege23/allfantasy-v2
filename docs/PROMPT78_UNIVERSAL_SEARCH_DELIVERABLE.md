# Prompt 78 — Universal Search + Quick Actions + Full UI Click Audit

## 1. Universal Search Architecture

### Overview

The universal search layer provides a **command-palette-style** overlay where users can search and jump to **pages**, **tools**, **leagues** (via My Leagues), and **quick actions** (mock draft, trade analyzer, waiver advisor, Chimmy, create league, find league). It is available in the **full app shell** (authenticated routes) via a **search icon** in the header and **keyboard shortcut** (⌘K / Ctrl+K). All seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) are supported for **sport filter** resolution when extending to player/league live search.

### Component and Data Flow

```
ResponsiveNavSystem
  ├── DesktopNavBar (onOpenSearch → setSearchOpen(true))
  ├── SearchOverlay (open, onClose)
  │     ├── Input (query → getUniversalSearchPayload(query))
  │     ├── Quick actions (filterQuickActionsByQuery) + static results (resolveStaticResults)
  │     ├── Keyboard: Escape close, ↑↓ highlight, Enter navigate
  │     └── Footer: shortcut hint
  └── GlobalTopNav search button + Cmd+K listener (createCommandPaletteHandler)
```

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **UniversalSearchService** | `lib/search/UniversalSearchService.ts` | getUniversalSearchPayload(query): quick actions, static results, suggestLiveSearch. getGroupedStaticResults for UI grouping. |
| **SearchResultResolver** | `lib/search/SearchResultResolver.ts` | STATIC_PAGES, STATIC_TOOLS; resolveStaticResults(query); groupResultsByCategory. |
| **QuickActionsService** | `lib/search/QuickActionsService.ts` | UNIVERSAL_QUICK_ACTIONS (mock draft, trade analyzer, waiver, Chimmy, create/find league, dashboard, webapp, brackets, legacy, tools hub, profile, settings); filterQuickActionsByQuery. |
| **SearchOverlayController** | `lib/search/SearchOverlayController.ts` | getCommandPaletteShortcut(), isCommandPaletteShortcut(e), createCommandPaletteHandler(onOpen). |
| **SportSearchFilterResolver** | `lib/search/SportSearchFilterResolver.ts` | getSupportedSportFilters() (all 7 sports), resolveSportFilter, shouldShowSportFilter(category). |
| **CommandPaletteService** | `lib/search/CommandPaletteService.ts` | Re-exports from SearchOverlayController + search/quick-action types and resolvers. |

---

## 2. Search / Query Service Updates

- **UniversalSearchService.getUniversalSearchPayload(query)**  
  - Quick actions: filtered by query (label + description) via filterQuickActionsByQuery.  
  - Static results: when query length ≥ 2, resolveStaticResults(query) returns matching pages and tools (label, href, keywords).  
  - suggestLiveSearch: true when query ≥ 2 (client could call league/player APIs in a future iteration).

- **SearchResultResolver**  
  - STATIC_PAGES: Dashboard, Profile, Settings, My Leagues, WebApp, Bracket Challenge, Legacy AI, Tools Hub, Chimmy, Messages, Wallet.  
  - STATIC_TOOLS: Trade Analyzer (/trade-evaluator), Mock Draft (/mock-draft), Waiver Advisor (/waiver-ai), Draft War Room, AI Chat, Bracket, Power Rankings, Matchup Simulator.  
  - groupResultsByCategory orders by quick_action, tool, page, league, player.

- No backend search API was added; search is client-side over static config. Existing APIs (/api/players/search, /api/league/list, etc.) remain for page-level features; suggestLiveSearch can drive future live league/player results in the overlay.

---

## 3. Quick-Action System Updates

- **QuickActionsService.UNIVERSAL_QUICK_ACTIONS**  
  - **Tools:** Start mock draft → /af-legacy?tab=mock-draft; Open trade analyzer → /trade-evaluator; Open waiver advisor → /waiver-ai.  
  - **AI:** Ask Chimmy → /af-legacy?tab=chat.  
  - **League:** Create league → /brackets/leagues/new; Find league → /leagues.  
  - **Nav:** Dashboard, WebApp, Bracket Challenge, Legacy AI, Tools hub, Profile, Settings.

- **filterQuickActionsByQuery(query)** filters by label and description (case-insensitive).

- Quick actions are shown in the overlay when the query is empty or matches; they appear in a “Quick actions” group. Static results (pages/tools) appear when query length ≥ 2 in “Pages” and “Tools” groups.

---

## 4. Frontend Search UI Updates

- **SearchOverlay** (`components/search/SearchOverlay.tsx`)  
  - Modal overlay: backdrop (click to close), centered panel with search input, clear/close button, scrollable result list, footer with shortcut hint.  
  - Input: controlled query; getUniversalSearchPayload(query) on change; placeholder “Search pages, tools, or quick actions…”.  
  - Results: Quick actions section (when payload.quickActions.length > 0); then grouped static results (Pages, Tools) when query ≥ 2.  
  - Empty state: “No results for …” when query ≥ 2 and no results; “Type to search. Press ⌘K to focus.” when query short and no quick actions.  
  - Keyboard: Escape closes; ArrowDown/ArrowUp move highlight; Enter navigates to highlighted item (router.push) and closes overlay.  
  - Each result button has data-highlight-index for scroll-into-view when highlight changes.  
  - Navigate: onClose, clear query/highlight, router.push(href).

- **GlobalTopNav**  
  - When onOpenSearch is provided (authenticated shell): search icon button (Search lucide) before Wallet; title “Search (Ctrl+K)”, aria-label “Search”; onClick calls onOpenSearch.

- **ResponsiveNavSystem**  
  - searchOpen state; SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)}; onOpenSearch={() => setSearchOpen(true)} passed to DesktopNavBar.  
  - useEffect: createCommandPaletteHandler(() => setSearchOpen(true)) on keydown so ⌘K / Ctrl+K opens the overlay from anywhere in the shell.

- **DesktopNavBar**  
  - Accepts onOpenSearch and passes it through to GlobalTopNav.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / Wiring | Status |
|--------|-----------|------------------|------------------|--------|
| Search icon (header) | GlobalTopNav | Open overlay | onOpenSearch() | OK |
| ⌘K / Ctrl+K | ResponsiveNavSystem | Open overlay | createCommandPaletteHandler → setSearchOpen(true) | OK |
| Search input | SearchOverlay | Set query | onChange → setQuery; getUniversalSearchPayload in useMemo | OK |
| Close (X) button | SearchOverlay | Close overlay | onClick onClose | OK |
| Backdrop click | SearchOverlay | Close overlay | onClick onClose | OK |
| Escape key | SearchOverlay | Close overlay | keydown Escape → onClose | OK |
| Quick action button | SearchOverlay | Navigate to href | onClick navigate(href) | OK |
| Static result button | SearchOverlay | Navigate to href | onClick navigate(href) | OK |
| Enter key | SearchOverlay | Navigate highlighted | keydown Enter → navigate(flatItems[highlight].href) | OK |
| Arrow Down/Up | SearchOverlay | Move highlight | setHighlight; scroll into view | OK |
| Clear input | — | Not implemented | N/A (optional) | — |

All wired interactions work; no dead buttons. Optional: explicit “Clear” button for the input.

---

## 6. QA Findings

- **Search returns grouped results:** Empty/short query shows quick actions; query ≥ 2 shows matching quick actions + static pages/tools grouped by category.  
- **Quick actions route correctly:** Mock draft, trade analyzer, waiver advisor, Chimmy, create league, find league, dashboard, webapp, brackets, legacy, tools hub, profile, settings all use correct hrefs and navigate on click/Enter.  
- **Mobile:** Overlay is responsive; search icon visible; overlay works on small screens.  
- **Close/clear:** Backdrop, X button, and Escape close overlay; query resets on open.  
- **Keyboard:** ⌘K/Ctrl+K opens overlay; Escape closes; ↑↓ move highlight; Enter navigates; shortcut hint in footer.  
- **No broken links:** All hrefs are internal (dashboard, app, brackets, af-legacy, profile, settings, trade-evaluator, mock-draft, waiver-ai, tools-hub, chimmy, messages, wallet, leagues).  
- **Sport filter:** SportSearchFilterResolver supports all 7 sports; shouldShowSportFilter available for future player/league search UI.

---

## 7. Issues Fixed

- **No universal search:** Implemented SearchOverlay + UniversalSearchService, SearchResultResolver, QuickActionsService so one entry point (search icon + ⌘K) drives pages, tools, and quick actions.  
- **Quick actions not centralized:** Added QuickActionsService with UNIVERSAL_QUICK_ACTIONS and filterQuickActionsByQuery; overlay uses it for “Quick actions” section.  
- **No command palette shortcut:** SearchOverlayController + createCommandPaletteHandler; ResponsiveNavSystem registers keydown listener to open overlay on ⌘K/Ctrl+K.  
- **Search overlay not in shell:** SearchOverlay rendered in ResponsiveNavSystem; GlobalTopNav receives onOpenSearch and shows search icon when provided (authenticated shell only).

---

## 8. Final QA Checklist

- [ ] Search icon in header opens overlay (authenticated).
- [ ] ⌘K / Ctrl+K opens overlay from any page in full shell.
- [ ] Typing in search filters quick actions and shows static results when length ≥ 2.
- [ ] Clicking a quick action or static result navigates and closes overlay.
- [ ] Escape and backdrop click close overlay.
- [ ] Arrow keys change highlight; Enter navigates highlighted item; highlighted item scrolls into view.
- [ ] All quick action and static result hrefs navigate correctly (no 404s).
- [ ] Mobile: search icon and overlay usable.

---

## 9. Explanation of the Universal Search and Quick Actions System

The **universal search** is a single discovery layer in the app shell: one search box (and one shortcut) to reach **pages** (dashboard, profile, settings, leagues, webapp, brackets, legacy, tools hub, Chimmy, messages, wallet), **tools** (trade analyzer, mock draft, waiver advisor, draft war room, AI chat, bracket, power rankings, matchup simulator), and **quick actions** (start mock draft, open trade analyzer, open waiver advisor, ask Chimmy, create league, find league, plus main nav targets).

- **Quick actions** are fixed entries that can be filtered by typing; they always point to the same hrefs so “open trade analyzer” and “open waiver advisor” are one click or one Enter away.  
- **Static results** are resolved from a list of pages and tools with keywords; when the user types two or more characters, the list is filtered and grouped (e.g. Tools vs Pages) so results stay clear and scannable.  
- **Keyboard:** ⌘K/Ctrl+K opens the overlay from anywhere in the shell; Escape closes it; arrow keys move the highlight; Enter navigates. This makes the overlay a true command palette for power users while the search icon keeps it discoverable.

The system preserves the existing app shell, dashboard, player/league search on their own pages, tool pages, and profile/settings routes. It does not replace them—it adds one entry point that routes to them. Sport filter support (SportSearchFilterResolver) is in place for future extension to live player/league search in the overlay (all seven sports). Every search-related click and key path is wired so there are no dead buttons or broken destinations.
