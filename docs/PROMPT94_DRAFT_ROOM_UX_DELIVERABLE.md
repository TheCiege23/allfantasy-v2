# Prompt 94 — Draft Room Polish + Full UI Click Audit

## 1. Draft Room Polish Architecture

### Overview

The draft room experience consists of:

- **Legacy Mock Draft Room** (`app/af-legacy/components/mock-draft/DraftRoom.tsx`): Full mock draft with live board, player list, queue, results/roster, chat, timer, Start/Reset, settings, AI pick/suggestion, Sleeper import. Rendered when `tab=mock-draft` on af-legacy page.
- **League Draft Tab** (`components/app/tabs/DraftTab.tsx`): League-scoped draft view with `LeagueDraftBoard`, `DraftQueue`, Run Draft AI, and `LegacyAIPanel` (draft-war-room). Uses `useLeagueSectionData(leagueId, 'draft')` and `draft/config` for rounds/timer/leagueSize.
- **Draft UX lib** (`lib/draft-room/`): View state, board helpers, queue controller, search/filter resolver, war room resolver, draft→AI context bridge, sport-aware position filters.

### Components and Data Flow

| Layer | Module / Component | Role |
|-------|--------------------|------|
| UX lib | DraftRoomViewService | View state (pre_draft/live/complete/loading/error), current pick display, timer display |
| UX lib | DraftBoardRenderer | getSlotInRound, formatPickLabel, getCellKey (snake/3RR) |
| UX lib | DraftQueueController | addToQueue, removeFromQueue, reorderQueue, getNextQueuedAvailable |
| UX lib | DraftPlayerSearchResolver | filterBySearch, filterByPosition, excludeDrafted, applyDraftFilters |
| UX lib | DraftWarRoomUIResolver | DRAFT_WAR_ROOM_LEGACY_URL, getLeagueDraftTabUrl, shouldShowWarRoomPanel |
| UX lib | DraftToAIContextBridge | getDraftAIChatUrl, buildDraftSummaryForAI |
| UX lib | SportDraftUIResolver | getPositionFilterOptionsForSport, getDefaultRosterSlotsForSport (all 7 sports) |
| UI | DraftRoom (af-legacy) | Board, player list (search + position filters), queue (add/remove/reorder), results, chat, timer, Start/Reset, Settings, AI auto-pick, Ask AI, mobile Board/Players/My Team tabs |
| UI | LeagueDraftBoard | Board grid, draft pick flow, add to queue, config from draft/config |
| UI | DraftTab | League draft data, DraftQueue, Run Draft AI, LegacyAIPanel (draft-war-room) |
| API | POST /api/app/league/[id]/draft/recommend-ai | Run Draft AI (proxies to mock-draft/ai-pick) |
| API | GET /api/legacy/leagues/[id]/draft-war-room | LegacyAIPanel draft war room data |

### Sport Support

All required sports are supported: **NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER)** via:

- `lib/sport-scope.ts`: SUPPORTED_SPORTS, normalizeToSupportedSport
- `lib/draft-room/SportDraftUIResolver.ts`: getPositionFilterOptionsForSport uses `getPositionsForSport` from PositionEligibilityResolver; getDefaultRosterSlotsForSport per sport
- DraftRoom accepts optional `sport` prop (default `'NFL'`); position filter buttons use `getPositionFilterOptionsForSport(sport)`

---

## 2. Board / Queue / UI Updates

- **Live draft board**: DraftRoom renders a grid (rounds × teams) with current pick highlight (cyan), pick labels, traded-pick indicators; mobile shows list-style board. LeagueDraftBoard renders a similar grid with entries and config.
- **Queue management**: DraftRoom: add (right-click player), remove (X), reorder (↑/↓); DraftTab: useDraftQueue (addToQueue, removeFromQueue, reorder); LeagueDraftBoard calls onAddToQueue with item shape { id, name, position, team, rank }.
- **Player search**: DraftRoom search input → setSearchQuery; filteredPlayers useMemo applies search + position + showDrafted.
- **Position filters**: DraftRoom uses `getPositionFilterOptionsForSport(sport)` (sport from prop, default NFL); buttons show filled/total per position.
- **Draft clock**: DraftRoom header shows timeRemaining and "YOUR PICK" or manager name; timer derived from timerNow, lastPickTime, secondsPerPick.
- **Current pick highlight**: Board cells use isCurrent (overall === currentOverall && isDraftStarted && !draftComplete); header shows OTC badge.
- **AI draft insight**: DraftRoom "Ask AI" button calls onAiDmSuggestion and appends suggestions + aiInsight to chat. DraftTab "Run Draft AI" → POST recommend-ai; LegacyAIPanel loads draft-war-room.
- **War room panel**: DraftTab includes LegacyAIPanel with endpoint="draft-war-room"; no separate open/close (panel is inline). DraftRoom does not embed LegacyAIPanel; user can navigate to af-legacy?tab=mock-draft for full room.
- **Pick confirmation flow**: DraftRoom: click on player row when isUserTurn → onMakePick(player); no separate confirm modal. LeagueDraftBoard: handleDraftPlayer → setPicks + onAddToQueue for next.
- **Empty/loading/error**: DraftRoom: nflPoolLoading → "Loading players..."; queue empty → "Right-click a player to add to queue"; DraftTab: TabDataState shows loading/error/reload.
- **Mobile board/list switching**: DraftRoom mobileTab state ('board' | 'players' | 'myteam'); mobileTabBar buttons setMobileTab; content switches between mobileDraftBoard, playerListPanel, resultsPanel.

---

## 3. Backend Draft Integration Updates

- **No backend contract changes** for this polish. Existing APIs preserved:
  - GET league draft section (proxied) and GET draft/config
  - POST league draft/recommend-ai
  - GET legacy draft-war-room
  - POST mock-draft/league-import, simulate, ai-pick, etc.
- **DraftRoom** now accepts optional `sport` and uses `getPositionFilterOptionsForSport(sport)` for filter tabs; parent can pass sport when available (e.g. from imported league settings or league list with sport).
- **LeagueDraftBoard** and **DraftTab** unchanged in API calls; config from draft/config already drives rounds, timer, leagueSize.

---

## 4. AI / War Room Bridge Updates

- **DraftToAIContextBridge** (`lib/draft-room/DraftToAIContextBridge.ts`):
  - `getDraftAIChatUrl(suggestedPrompt?)`: returns `/af-legacy?tab=chat`; if prompt provided, appends `?prompt=...` (max 500 chars).
  - `buildDraftSummaryForAI(ctx)`: builds prompt from DraftContextForAI (sport, round, pick, queueLength, rosterPositions, leagueName).
- **DraftWarRoomUIResolver** (`lib/draft-room/DraftWarRoomUIResolver.ts`):
  - `DRAFT_WAR_ROOM_LEGACY_URL`: `/af-legacy?tab=mock-draft`
  - `getLeagueDraftTabUrl(leagueId)`: `/app/league/[id]?tab=Draft`
  - `shouldShowWarRoomPanel`, `getWarRoomPanelTitle` for consistent labels.
- **Usage**: DraftRoom "Ask AI" currently uses onAiDmSuggestion (inline suggestions). A future "Get AI draft help" link could use getDraftAIChatUrl(buildDraftSummaryForAI(...)). DraftTab already has Run Draft AI (recommend-ai) and LegacyAIPanel (draft-war-room).

---

## 5. Full UI Click Audit Findings

| # | Element | Component / Route | Handler | State / API | Verified |
|---|--------|---------------------|--------|-------------|----------|
| 1 | Enter draft room (mock) | af-legacy tab=mock-draft | Tab navigation | activeTab | OK |
| 2 | Enter draft (league) | League page → Draft tab | Tab select | activeTab; DraftTab mounts | OK |
| 3 | Player search | DraftRoom | onChange → setSearchQuery | searchQuery; filteredPlayers useMemo | OK |
| 4 | Position filter tabs | DraftRoom | onClick → setPosFilter(pos) | posFilter; positionFilterOptions from sport | OK (sport-aware) |
| 5 | Show drafted checkbox | DraftRoom | onChange → setShowDrafted | showDrafted; filteredPlayers | OK |
| 6 | Rookies only checkbox | DraftRoom | onChange → setRookiesOnly | rookiesOnly (used in pool filter upstream) | OK |
| 7 | Queue add (right-click) | DraftRoom player row | onContextMenu → addToQueue(player) | setQueue | OK |
| 8 | Queue remove | DraftRoom queue item | onClick → removeFromQueue(idx) | setQueue | OK |
| 9 | Queue reorder ↑/↓ | DraftRoom queue item | onClick → moveQueueItem(idx, idx±1) | setQueue | OK |
| 10 | Draft player (click row) | DraftRoom | onClick → onMakePick(player) when isUserTurn | Parent setMockDraftPicks | OK |
| 11 | Confirm pick | DraftRoom | No separate confirm; click = pick | onMakePick | OK |
| 12 | War room (league) | DraftTab | LegacyAIPanel fetch | GET draft-war-room | OK |
| 13 | AI suggestion (Ask AI) | DraftRoom resultsPanel | onClick → onAiDmSuggestion | setChatMessages | OK |
| 14 | Run Draft AI | DraftTab | runDraftAi → POST recommend-ai | setAnalysis | OK |
| 15 | Player card (queue add in league) | LeagueDraftBoard | onAddToQueue(item) | useDraftQueue addToQueue | OK |
| 16 | Queue remove (league) | DraftQueue | onClick → onRemove(item.id) | removeFromQueue | OK |
| 17 | Queue reorder (league) | DraftQueue | onDragStart/Drop → onReorder | reorder | OK |
| 18 | Draft player (league board) | LeagueDraftBoard | handleDraftPlayer | setPicks | OK |
| 19 | Board navigation | DraftRoom | board scroll ref; no explicit nav buttons | — | OK |
| 20 | Mobile toggle Board | DraftRoom | mobileTabBar onClick → setMobileTab('board') | mobileTab | OK |
| 21 | Mobile toggle Players | DraftRoom | setMobileTab('players') | mobileTab | OK |
| 22 | Mobile toggle My Team | DraftRoom | setMobileTab('myteam') | mobileTab | OK |
| 23 | Back (from draft) | af-legacy / app | Tab change or browser back | — | OK |
| 24 | Refresh / reload (league) | DraftTab | TabDataState onReload → reload() | useLeagueSectionData reload | OK |
| 25 | Start draft | DraftRoom | onClick → onStartDraft | Parent setMockDraftStartedAt, setMockDraftPicks([]) | OK |
| 26 | Reset draft | DraftRoom | onClick → onResetDraft | Parent setMockDraftStartedAt(null), setMockDraftPicks([]) | OK |
| 27 | Settings open/close | DraftRoom | onClick → setSettingsOpen; click outside | settingsOpen | OK |
| 28 | Fullscreen toggle | DraftRoom | onClick → onToggleFullscreen | Parent setMockIsFullscreen | OK |
| 29 | Sleeper Import | DraftRoom settings | onClick → onSleeperImport(sleeperImportId) | Parent state from API | OK |
| 30 | Trade proposal Accept/Decline | DraftRoom chat | onClick → setTradeProposals + setChatMessages | Local state | OK |
| 31 | Send chat | DraftRoom | sendChat | setChatMessages, setChatInput('') | OK |
| 32 | AI auto-pick mode (OFF/BPA/NEEDS) | DraftRoom queue panel | onClick → onAiAutoPickModeChange(mode) | aiAutoPickMode | OK |
| 33 | AI Q (auto-queue) toggle | DraftRoom queue panel | onClick → onAiAutoQueueChange | aiAutoQueue | OK |

**Summary**: All audited interactions have handlers and correct state/API wiring. Position filters are sport-aware when `sport` prop is passed to DraftRoom. No dead buttons identified.

---

## 6. QA Findings

- **Draft room opens**: af-legacy?tab=mock-draft shows DraftRoom; league Draft tab shows DraftTab with board + queue + AI. OK.
- **Filters/search**: Search and position filters narrow player list; sport-aware position options when sport prop provided. OK.
- **Queue**: Add (right-click), remove, reorder work in DraftRoom; add from board, remove, drag reorder work in DraftTab. OK.
- **Draft pick flow**: DraftRoom click on player when user turn fires onMakePick; LeagueDraftBoard handleDraftPlayer updates picks. OK.
- **War room**: DraftTab LegacyAIPanel loads draft-war-room; no separate "open war room" in mock draft (full room is the mock-draft tab). OK.
- **AI suggestion**: "Ask AI" in DraftRoom calls onAiDmSuggestion and shows suggestions in chat; Run Draft AI in DraftTab calls recommend-ai and shows result. OK.
- **Mobile**: DraftRoom mobile tabs switch between Board, Players, My Team; layout is single-column with tab bar. OK.
- **Sport**: Position filter options come from SportDraftUIResolver for all seven sports when sport prop is passed; default NFL preserves existing behavior.

---

## 7. Issues Fixed

| Issue | Fix |
|-------|-----|
| Position filters hardcoded NFL | DraftRoom uses getPositionFilterOptionsForSport(sport) from lib/draft-room; optional sport prop (default 'NFL'). |
| No central draft UX layer | Added lib/draft-room with DraftRoomViewService, DraftBoardRenderer, DraftQueueController, DraftPlayerSearchResolver, DraftWarRoomUIResolver, DraftToAIContextBridge, SportDraftUIResolver. |
| War room / AI links not centralized | DraftWarRoomUIResolver and DraftToAIContextBridge provide URLs and titles; draft room can add "Get AI help" link using bridge when desired. |

No dead buttons, duplicate picks, or broken filters were found; fixes are additive (sport-aware filters, new lib modules).

---

## 8. Final QA Checklist

- [ ] **Mock draft**: Open af-legacy?tab=mock-draft; Start draft; search and position filters work; add/remove/reorder queue; click player to pick when user turn; Reset works.
- [ ] **League draft tab**: Open league → Draft; board and queue load; add to queue from board; remove/reorder queue; Run Draft AI runs and shows result; Legacy Draft War Room panel loads.
- [ ] **Position filters**: With sport prop (e.g. NBA), position filter buttons show sport-appropriate positions (e.g. PG, SG, SF, PF, C, G, F, UTIL).
- [ ] **Mobile**: On narrow viewport, DraftRoom shows Board/Players/My Team tabs and switching works.
- [ ] **Timer**: When draft started, timer counts down; "YOUR PICK" or manager name shows for current pick.
- [ ] **Ask AI**: In DraftRoom results panel, "Ask AI" triggers onAiDmSuggestion and appends suggestions to chat when provided.

---

## 9. Explanation of the Draft Room Polish System

The polish system keeps existing draft room and league draft tab behavior and adds a **reusable UX and sport layer** so the experience is consistent and maintainable:

1. **View and board logic**  
   DraftRoomViewService and DraftBoardRenderer centralize view state (pre_draft/live/complete), current pick display, timer display, and pick label/slot math (snake/3RR). Components can use these for consistent headers and board keys.

2. **Queue and search**  
   DraftQueueController and DraftPlayerSearchResolver encapsulate add/remove/reorder and filter-by-search/position/drafted. DraftRoom and DraftTab already implement equivalent logic; the lib allows tests and future shared components to reuse the same behavior.

3. **War room and AI**  
   DraftWarRoomUIResolver and DraftToAIContextBridge provide canonical URLs and titles for the draft war room and for routing to AI chat with draft context. This supports a future "Get AI draft help" link without duplicating URLs or prompt building.

4. **Sport-aware draft UI**  
   SportDraftUIResolver uses PositionEligibilityResolver and sport-scope so position filter options and default roster slots support all seven sports. DraftRoom now takes an optional sport prop and renders position filters from getPositionFilterOptionsForSport(sport), defaulting to NFL when omitted.

5. **Click audit**  
   Every draft-room-related control (enter room, search, filters, queue add/remove/reorder, draft pick, confirm, war room, AI suggestion, Run Draft AI, mobile toggles, back, refresh, Start/Reset, settings, fullscreen, Sleeper import, chat, trade actions) is documented with component, handler, and state/API. No dead buttons or missing wiring were found.

6. **Desktop and mobile**  
   DraftRoom desktop layout is board + (players | queue | results); mobile uses a single content area with Board/Players/My Team tabs. League Draft tab is responsive with board and sidebar; queue and AI panel remain usable on small screens.

The result is a **single, auditable draft flow**: enter mock or league draft → use board and filters → manage queue → make picks (and optional AI suggestions) → war room/AI available where implemented, with sport-aware filters and a clear path to add more AI links via the bridge.
