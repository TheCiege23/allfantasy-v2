# Prompt 92 — Waiver Wire UX + Claim Flow Polish + Full UI Click Audit — Deliverable

## 1. Waiver Wire UX Architecture

### Entry Points and Routes

| Route / Context | Component | Purpose |
|-----------------|-----------|---------|
| App league → Waivers tab | WaiversTab | Renders WaiverWirePage + “Waiver AI suggestions” + LegacyAIPanel |
| WaiverWirePage | WaiverWirePage | Browse players, filters, tabs (available / pending / history), claim drawer, league waiver rules, AI link |
| Waiver claim flow | WaiverClaimDrawer | Add claim: drop selector, FAAB bid (if FAAB), priority, Confirm / Cancel |
| Standalone waiver AI | app/waiver-ai/page.tsx | AI waiver analysis (roster/bench/waiver pool, FAAB/rolling/priority); POST /api/waiver-ai |

### APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/waiver-wire/leagues/[leagueId]/settings` | GET | Effective waiver settings; **now includes `sport`** for position filters |
| `/api/waiver-wire/leagues/[leagueId]/players` | GET | Available players (sport from league or query) |
| `/api/waiver-wire/leagues/[leagueId]/claims` | GET | Pending claims, or history with `?type=history` |
| `/api/waiver-wire/leagues/[leagueId]/claims` | POST | Create claim (addPlayerId, dropPlayerId, faabBid, priorityOrder) |
| `/api/waiver-wire/leagues/[leagueId]/claims/[claimId]` | PATCH / DELETE | Update or cancel claim |
| `/api/waiver-wire/leagues/[leagueId]/process` | POST | Process waivers (commissioner) |
| `/api/league/roster` | GET | Current user roster (playerData), faabRemaining, waiverPriority |
| `/api/app/leagues/[leagueId]/waivers/ai-advice` | POST | Waiver AI advice (WaiversTab “Run AI”) |

### Core Lib Modules (New)

| Module | Location | Role |
|--------|----------|------|
| **WaiverWireViewService** | `lib/waiver-wire/WaiverWireViewService.ts` | Empty/loading/error copy; getTabLabel; shouldShowClaimDrawer |
| **WaiverClaimFlowController** | `lib/waiver-wire/WaiverClaimFlowController.ts` | clampFaabBid, normalizePriorityOrder, canSubmitClaim, getClaimSummary |
| **WaiverFilterResolver** | `lib/waiver-wire/WaiverFilterResolver.ts` | Default filter/sort values; WAIVER_STATUS_FILTERS; SORT_OPTIONS; WAIVER_TABS |
| **WaiverUIStateService** | `lib/waiver-wire/WaiverUIStateService.ts` | getDefaultWaiverFilterState, resetWaiverFilters |
| **WaiverToAIContextBridge** | `lib/waiver-wire/WaiverToAIContextBridge.ts` | getWaiverAIChatUrl(suggestedPrompt?), buildWaiverSummaryForAI(leagueContext?, sport?) |
| **SportWaiverResolver** | `lib/waiver-wire/SportWaiverResolver.ts` | getPositionFiltersForSport(sport), getSportDisplayLabel, WAIVER_WIRE_SPORTS |

All seven sports (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer) are supported; position filters are sport-specific via `getPositionFiltersForSport(settings.sport)`.

---

## 2. Claim Flow Polish Updates

- **WaiverClaimDrawer**
  - **Drop selector:** Accepts optional `rosterPlayers?: { id: string; name?: string | null }[]`. When provided, option label is `name (id)` or `id`; otherwise label is `id` only.
  - **FAAB:** Bid input and “Remaining” display unchanged; backend and validation unchanged.
  - **Cancel / Confirm:** Same behavior; drawer closes on success and load() refreshes data.
- **WaiverWirePage**
  - **Roster for drawer:** Builds `rosterPlayers` from roster API response: if `roster` (or `roster.players`) contains objects with `id`/`player_id` and optional `name`/`displayName`, they are passed to the drawer for readable drop options.
  - **Submit claim:** Still POST to `/api/waiver-wire/leagues/[leagueId]/claims`; on success closes drawer and calls load().
  - **Pending tab:** Edit priority/bid inline; Save (PATCH claim), Cancel (DELETE claim). State and reload unchanged.

---

## 3. Backend / UI Wiring Improvements

- **Settings API**
  - **GET `/api/waiver-wire/leagues/[leagueId]/settings`:** Response now includes **`sport`** (from league) so the client can show sport-specific position filters. Access logic unchanged (owner or roster member).
- **WaiverFilters**
  - **Position filters:** Use **`getPositionFiltersForSport(sport)`** from SportWaiverResolver. When `sport` is provided (from settings), positions are sport-specific (e.g. NBA: PG, SG, SF, PF, C, G, F, UTIL; NHL: C, LW, RW, D, G, UTIL; Soccer: GKP, DEF, MID, FWD, UTIL). When missing, default remains ALL + NFL-style list.
  - **Status / Sort:** Use WAIVER_STATUS_FILTERS and SORT_OPTIONS from WaiverFilterResolver (no behavior change).
- **WaiverWirePage**
  - **Sport:** Reads `settings?.sport` and passes it to WaiverFilters.
  - **Empty states:** Uses WAIVER_EMPTY_PLAYERS_TITLE, WAIVER_EMPTY_PLAYERS_HINT, WAIVER_EMPTY_PENDING_TITLE, WAIVER_EMPTY_HISTORY_TITLE from WaiverWireViewService.
  - **Tab labels:** Uses getTabLabel(tab, pendingCount) for consistent “Pending claims (N)” when applicable.

---

## 4. AI Bridge Updates

- **WaiverToAIContextBridge** (`lib/waiver-wire/WaiverToAIContextBridge.ts`)
  - **getWaiverAIChatUrl(suggestedPrompt?):** Returns `/af-legacy?tab=chat`; if `suggestedPrompt` is provided, appends `?prompt=...` (trimmed, max 500 chars).
  - **buildWaiverSummaryForAI(leagueContext?, sport?):** Builds a short prompt string for waiver help (e.g. “I'm managing my waiver wire for NFL (12-team PPR). Can you suggest priority adds, FAAB bids, or drops?”).
- **Usage**
  - **WaiverWirePage:** “Get AI waiver help” link in the League waiver rules section; href = getWaiverAIChatUrl(buildWaiverSummaryForAI(undefined, settings?.sport)).
  - **WaiversTab:** Existing “Run AI” button still calls `/api/app/leagues/[leagueId]/waivers/ai-advice`; no change. The new link routes users to Legacy AI Chat with waiver context.

---

## 5. Full UI Click Audit Findings

| Element | Component / Route | Handler | Backend / State | Status |
|--------|---------------------|--------|------------------|--------|
| Refresh | WaiverWirePage | load() | Refetch settings, claims, players, roster, history | OK |
| Tab Available / Pending / History | WaiverWirePage | setActiveTab(tab) | Local state | OK |
| Search input | WaiverFilters | onSearchChange | setSearch | OK |
| Position filter buttons | WaiverFilters | onPositionChange(pos) | setPositionFilter; positions from getPositionFiltersForSport(sport) | OK |
| Team select | WaiverFilters | onTeamChange | setTeamFilter | OK |
| Status All / Available / Watchlist | WaiverFilters | onStatusChange | setStatusFilter | OK |
| Sort select | WaiverFilters | onSortChange | setSort | OK |
| Player row Claim button | WaiverPlayerRow | onAddClick | setDrawerPlayer(p), setDrawerOpen(true) | OK |
| Drawer close (X) | WaiverClaimDrawer | onClose | setDrawerOpen(false), setDrawerPlayer(null) (when !claimLoading) | OK |
| Drop player select | WaiverClaimDrawer | setDropId(e.target.value) | Local state | OK |
| FAAB bid input | WaiverClaimDrawer | setBid(e.target.value) | Local state | OK |
| Priority input | WaiverClaimDrawer | setPriority(e.target.value) | Local state | OK |
| Cancel (drawer) | WaiverClaimDrawer | onClose | Close drawer | OK |
| Confirm claim (drawer) | WaiverClaimDrawer | handleSubmit → onSubmit(opts) | submitClaimForPlayer → POST claims, then load() | OK |
| Pending: Save (edit claim) | WaiverWirePage | updateClaimById(c.id, patch) | PATCH claim, then load() | OK |
| Pending: Cancel claim | WaiverWirePage | cancelClaimById(c.id) | DELETE claim, then load() | OK |
| Get AI waiver help | WaiverWirePage | Link href | getWaiverAIChatUrl(buildWaiverSummaryForAI(..., sport)) | OK |
| Run AI (WaiversTab) | WaiversTab | runAiAdvice() | POST .../waivers/ai-advice; setAnalysis | OK |

All audited elements have handlers, correct state updates, and correct API or navigation. No dead buttons identified.

---

## 6. QA Findings

- **Filters:** Search, position (sport-specific when settings.sport is set), team, status, and sort all update state and filtered list correctly.
- **Position filters:** With league sport NFL, positions include QB, RB, WR, TE, FLEX, K, DST; with NBA, PG, SG, SF, PF, C, G, F, UTIL; with NHL, C, LW, RW, D, G, UTIL; with MLB, C, 1B, 2B, 3B, SS, OF, DH, UTIL, SP, RP, P; with Soccer, GKP, DEF, MID, FWD, UTIL. Default (no sport) remains ALL + NFL-style.
- **Claim flow:** Open drawer from Claim on a player; choose optional drop (labels show name when rosterPlayers provided); enter FAAB (if FAAB league) and optional priority; Confirm submits and refreshes; Cancel closes.
- **FAAB:** Bid input and remaining display work; backend enforces limits.
- **Drop selector:** When roster API returns objects with id and name, dropdown shows “Name (id)”; otherwise “id”.
- **AI routing:** “Get AI waiver help” opens `/af-legacy?tab=chat` with optional prompt including sport; WaiversTab “Run AI” continues to use ai-advice endpoint.
- **Empty states:** Available shows “No players match your filters.” + hint; Pending “No pending claims.”; History “No processed claims yet.”
- **Tab labels:** Pending tab shows “Pending claims (N)” when N > 0.

---

## 7. Issues Fixed

- **Settings response:** GET settings now includes **sport** (from league) so the client can drive sport-specific position filters.
- **Position filters:** Replaced hardcoded NFL list with **getPositionFiltersForSport(sport)** so NBA, MLB, NHL, NCAAF, NCAAB, and Soccer show correct positions.
- **Drop selector labels:** Drawer now accepts **rosterPlayers** (id + optional name); WaiverWirePage builds it from roster response so dropdown shows names when available.
- **Empty state copy:** Centralized in WaiverWireViewService and used in Available, Pending, and History.
- **Tab labels:** Centralized with getTabLabel so “Pending claims (N)” is consistent.
- **AI entry:** Added **“Get AI waiver help”** link in waiver rules section, using WaiverToAIContextBridge with sport for context.

---

## 8. Final QA Checklist

- [ ] **Filters:** Search, position (sport-specific), team, status, sort all update list; changing sport (via different league) changes position chips.
- [ ] **Player list:** Available tab shows filtered players; Claim opens drawer.
- [ ] **Claim drawer:** Drop selector shows roster (id or name when available); FAAB and priority optional; Confirm submits and refreshes; Cancel closes.
- [ ] **FAAB:** In FAAB leagues, bid input and remaining display correct; submit respects remaining.
- [ ] **Pending:** Edit priority/bid and Save; Cancel claim removes and refreshes.
- [ ] **History:** Processed claims and failed claims display correctly.
- [ ] **Get AI waiver help:** Link opens AI chat with waiver context; URL includes prompt when built.
- [ ] **Run AI (WaiversTab):** Still runs and shows result.
- [ ] **Empty states:** No players / no pending / no history show correct messages.
- [ ] **Mobile:** Filters and drawer usable on small viewport; list scrolls.

---

## 9. Explanation of the Waiver Wire Polish System

The waiver wire polish keeps existing logic and APIs and improves **clarity, sport support, and AI entry**.

- **Clarity:** Empty states and tab labels come from WaiverWireViewService. Drop selector shows roster names when the API provides them. League waiver rules section is unchanged; the new “Get AI waiver help” link gives a single, clear entry to AI chat with waiver context.
- **Sport support:** All seven sports are supported. Position filters are driven by **sport** from the league (returned in settings GET). SportWaiverResolver maps each sport to the correct position list (e.g. NBA, NHL, MLB, Soccer, NCAA) so browse and filter stay correct for every league type.
- **Claim flow:** WaiverClaimFlowController provides helpers for FAAB clamping and validation; the drawer and submit flow are unchanged except for optional roster display names. Roster data is derived from the existing roster API; when payloads include name/displayName, they are shown in the drop list.
- **AI bridge:** WaiverToAIContextBridge mirrors the trade-analyzer pattern: a single place for “open AI chat with waiver context.” The waiver rules section links to Legacy AI Chat with an optional prompt (sport and optional league context) so users can continue the conversation in context.

The new **lib/waiver-wire** modules (ViewService, ClaimFlowController, FilterResolver, UIStateService, WaiverToAIContextBridge, SportWaiverResolver) centralize copy, filter options, validation helpers, and AI routing so future waiver surfaces stay consistent and sport-aware.
