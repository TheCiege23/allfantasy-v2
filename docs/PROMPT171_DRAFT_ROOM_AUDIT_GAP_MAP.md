# PROMPT 171 — AllFantasy Draft Room Repository Audit and Gap Map

**Date:** 2025-03-14  
**Scope:** Draft rooms, mock drafts, draft boards, players, queues, timers, commissioner controls, AI draft logic, chat, traded picks, roster construction.  
**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Repository Map (Draft-Related)

### 1.1 Routes and Pages

| Route / Page | Purpose | Notes |
|--------------|---------|--------|
| **app/mock-draft/page.tsx** | Mock draft lobby | Server: loads leagues + saved MockDraft; renders `MockDraftLobbyPage`. |
| **app/mock-draft/share/[shareId]/page.tsx** | Shared mock draft view | Public share by `shareId`. |
| **app/mock-draft-simulator/page.tsx** | Standalone simulator | Renders `MockDraftSimulatorWrapper` only (no lobby). |
| **app/draft-helper/page.tsx** | Draft helper landing | **SEO only** — `AIToolSeoLanding`; no draft UI. |
| **app/af-legacy/page.tsx** (tab=mock-draft) | Full DraftRoom (legacy) | Renders `DraftRoom` with all state in parent; timer, picks, managers, AI, chat, traded picks, Sleeper import. |
| **app/app/league/[leagueId]/page.tsx** | League hub | Tabs include "Draft"; no dedicated `/draft` child route. |
| **app/leagues/[leagueId]/page.tsx** | Legacy league page | Tabs: Overview, Team, …, **Draft**, …; Draft tab content is inline (DraftTab). |
| **app/leagues/[leagueId]/** | No `draft` segment | **No** `/leagues/[leagueId]/draft` route — invite link from LeagueDraftBoard is **dead**. |

### 1.2 API Routes

| Path | Method | Purpose |
|------|--------|---------|
| **/api/mock-draft/adp** | GET | ADP data (type, pool, sport, limit). NFL-only for non-FFC; other sports return empty. |
| **/api/mock-draft/create** | POST | Create empty MockDraft row; returns draftId + config. |
| **/api/mock-draft/save** | POST | Save/update mock draft results + metadata. |
| **/api/mock-draft/simulate** | POST | Full mock run (leagueId, rounds, draftType, autopickMode, etc.); saves to MockDraft. |
| **/api/mock-draft/simulate-v2** | POST | Alternate simulate flow. |
| **/api/mock-draft/ai-pick** | POST | AI pick/suggestion: `action` = pick, dm-suggestion, etc. |
| **/api/mock-draft/league-import** | POST | Import Sleeper league (managers, rosters, traded_picks) for mock. |
| **/api/mock-draft/retrospective** | POST | Post-draft retrospective. |
| **/api/mock-draft/share** | (share logic) | Share mock draft. |
| **/api/mock-draft/needs** | — | Team needs. |
| **/api/mock-draft/predict-board** | — | Board forecast / volatility. |
| **/api/mock-draft/snipe-radar** | — | Snipe alerts. |
| **/api/mock-draft/board-drift** | — | Board drift. |
| **/api/mock-draft/pick-path** | — | Pick path. |
| **/api/mock-draft/manager-dna** | — | Manager DNA. |
| **/api/mock-draft/trade-propose** | — | Trade proposals. |
| **/api/mock-draft/trade-simulate** | — | Simulate draft after pick trade. |
| **/api/mock-draft/trade-action** | — | Execute trade action. |
| **/api/mock-draft/trade-optimizer** | — | Trade optimizer. |
| **/api/mock-draft/trade-sim** | — | Trade sim. |
| **/api/mock-draft/update-weekly** | — | Weekly update. |
| **/api/app/league/[id]/draft** | GET | Proxies to `/api/mock-draft/adp` (no leagueId passed). |
| **/api/app/league/[id]/draft/config** | GET | Draft room config via `getDraftConfigForLeague`. |
| **/api/app/league/[id]/draft/recommend-ai** | POST | Proxies to `/api/mock-draft/ai-pick`. |
| **/api/commissioner/leagues/[leagueId]/draft** | GET | Sleeper draft state (drafts, picks) — read-only. |
| **/api/commissioner/leagues/[leagueId]/draft** | POST | **Stub:** pause/resume/reset_timer/undo_pick/assign_pick/reorder; returns `platformSupported: false`. |
| **/api/legacy/draft-war-room** | GET | Draft war room data (leagueId, userId, draftId, overallPick, round). |
| **/api/legacy/leagues/[leagueId]/draft-war-room** | GET | Proxy to legacy draft-war-room. |
| **/api/legacy/draft/recommendation-refresh** | — | Recommendation refresh. |
| **/api/leagues/[leagueId]/draft-grades** | GET/POST | Draft grades compute/upsert/read. |

### 1.3 Libraries

| Path | Purpose |
|------|---------|
| **lib/mock-draft/types.ts** | MockDraftConfig, MockDraftPick, MockDraftMetadata. |
| **lib/mock-draft/draft-engine.ts** | Snake/linear/auction slot math, validation, roster constraints, auction helpers. |
| **lib/mock-draft/manager-dna.ts** | Manager DNA. |
| **lib/mock-draft/retrospective.ts** | Retrospective. |
| **lib/mock-draft/board-drift.ts** | Board drift. |
| **lib/mock-draft/adp-realtime-adjuster.ts** | Realtime ADP adjustments. |
| **lib/mock-draft-simulator/MockDraftEngine.ts** | Run full mock (AI picks, user queue). |
| **lib/mock-draft-simulator/DraftAIManager.ts** | makeAIPick. |
| **lib/mock-draft-simulator/MetaDraftPredictor.ts** | Meta predictor. |
| **lib/mock-draft-simulator/types.ts** | Simulator types. |
| **lib/draft-room/** | View service, board renderer, queue controller, player search, war room resolver, AI bridge, sport UI. |
| **lib/draft-room/DraftRoomViewService.ts** | View state / timer / current pick display. |
| **lib/draft-room/DraftBoardRenderer.ts** | Pick cell / slot / format. |
| **lib/draft-room/DraftQueueController.ts** | Queue add/remove/reorder, next queued. |
| **lib/draft-room/DraftPlayerSearchResolver.ts** | Filter/search players. |
| **lib/draft-room/SportDraftUIResolver.ts** | Position filters + default roster slots per sport (all 7). |
| **lib/draft-room/DraftWarRoomUIResolver.ts** | War room URL / panel title. |
| **lib/draft-room/DraftToAIContextBridge.ts** | Draft context for AI/chat. |
| **lib/draft-defaults/** | Draft config, presets, order rules, player pool, league bootstrap, room config. |
| **lib/draft-defaults/DraftRoomConfigResolver.ts** | getDraftConfigForLeague (rounds, timer, snake/linear, 3RR, autopick, queue limit, etc.). |
| **lib/adp-data.ts** | getLiveADP, fetchFFCADP; ADPEntry (bye, etc.); NFL-focused. |
| **lib/multi-platform-adp.ts** | Multi-platform ADP; CSV-based. |
| **lib/rankings-engine/draft-grades.ts** | Draft grades. |
| **lib/ai-tool-layer/DraftAIAdapter.ts** | Draft AI adapter. |

### 1.4 Components

| Component | Location | Role |
|-----------|----------|------|
| **DraftRoom** | app/af-legacy/components/mock-draft/DraftRoom.tsx | Full draft room UI: board, timer, managers, picks, queue, chat, AI (Ask AI, autopick), traded picks, Sleeper import, 3RR, snake/linear/auction. |
| **MockDraftBoard** | app/af-legacy/components/mock-draft/MockDraftBoard.tsx | War-room style: Manager DNA, Pick Forecast, Snipe Radar (used in af-legacy context). |
| **LeagueDraftBoard** | components/app/draft/LeagueDraftBoard.tsx | Board + timer + picks + “Make pick” + undo/reset; **local state only**; no persistence; invite link = `/leagues/:id/draft` (dead). |
| **DraftQueue** | components/app/draft/DraftQueue.tsx | Queue list + drag reorder + remove. |
| **useDraftQueue** | components/app/draft/useDraftQueue.ts | Client-only queue state; **no persistence**. |
| **DraftTab** | components/app/tabs/DraftTab.tsx | League draft tab: LeagueDraftBoard + DraftQueue (hardcoded sample queue) + Run Draft AI + LegacyAIPanel (draft-war-room). |
| **DraftSettingsPanel** | components/app/settings/DraftSettingsPanel.tsx | Read-only draft config display; **no save**. |
| **MockDraftLobbyPage** | components/mock-draft/MockDraftLobbyPage.tsx | Lobby: new mock, recent mocks, share; renders MockDraftSimulatorWrapper. |
| **MockDraftSimulatorWrapper** | components/mock-draft/MockDraftSimulatorWrapper.tsx | Setup → MockDraftSimulatorClient or MockDraftRecap. |
| **MockDraftSetup** | components/mock-draft/MockDraftSetup.tsx | Config form; onStart → simulator. |
| **MockDraftRecap** | components/mock-draft/MockDraftRecap.tsx | Post-draft recap. |
| **MockDraftSimulatorClient** | components/MockDraftSimulatorClient.tsx | Large client: league select, simulate, playback, board, ADP, AI, trades, predict-board, snipe radar, autopick mode. |
| **AIDraftAssistantPanel** | components/mock-draft/AIDraftAssistantPanel.tsx | AI suggestion panel. |
| **PickAutocomplete** | components/PickAutocomplete.tsx | Pick autocomplete. |
| **DraftGradesCard** | components/DraftGradesCard.tsx | Draft grades card. |
| **Rankings/DraftGradesSection** | components/rankings/DraftGradesSection.tsx | Draft grades section. |

### 1.5 Hooks and State

| Hook / State | Purpose |
|--------------|---------|
| **useMockDraftEngine** | Client: completedPickIndex, advance/pause/resume/reset, saveResults → POST /api/mock-draft/save. |
| **useAIDraftAssistant** | fetchSuggestion → POST /api/mock-draft/ai-pick; positional run + roster warnings. |
| **useLeagueSectionData** | Fetches `/api/app/league/:id/:section`; DraftTab uses `draft` (→ ADP) and `draft/config`. |
| **useDraftGrades** | Draft grades. |
| **DraftRoom state (af-legacy)** | All in af-legacy page: mockDraftPicks, mockManagers, mockNflPool, mockTimerNow, mockTradedPicks, etc. |
| **LeagueDraftBoard state** | Local: picks, tickBase, isPaused, numTeams, numRounds, secondsPerPick; no API. |

### 1.6 Realtime / Websocket

- **No** dedicated WebSocket or SSE for draft. Chat in DraftRoom is **local state only** (chatMessages, sendChat); no backend persistence or realtime.  
- RealtimeMessageService (chat-core) is polling-based; comment notes “Backend does not yet expose WebSocket/SSE”.

### 1.7 Persistence and Data Model

- **MockDraft** (Prisma): id, shareId, leagueId (optional), userId, rounds, results (Json), proposals (Json), metadata (Json), timestamps.  
- **League.settings** (JSON): draft_rounds, draft_type, draft_timer_seconds, draft_third_round_reversal, draft_autopick_behavior, draft_queue_size_limit, etc. — used by DraftRoomConfigResolver.  
- Commissioner draft GET reads from **Sleeper** (getLeagueDrafts, getDraftPicks).  
- **Traded picks**: From Sleeper `traded_picks` via league-import; passed into DraftRoom as `tradedPicks`; displayed on board (round/slot ownership).

---

## 2. Current Draft Architecture Summary

- **Two main draft UIs:**
  1. **Legacy DraftRoom** (af-legacy, tab=mock-draft): Single-page state in af-legacy; full board, timer, managers, queue, chat, AI (onAiPick, onAiDmSuggestion → ai-pick), traded picks, Sleeper import, 3RR, snake/linear/auction. No URL-backed draft session; refresh loses state.
  2. **App league Draft tab** (leagues/[leagueId] or app/league/[leagueId]): DraftTab shows LeagueDraftBoard (local picks only), DraftQueue (client-only, hardcoded initial), Run Draft AI (recommend-ai → ai-pick), LegacyAIPanel (draft-war-room). Draft “section” data = ADP (GET draft → mock-draft/adp); draft/config from DraftRoomConfigResolver.

- **Mock draft flows:**
  - **/mock-draft**: Lobby (saved mocks + new) → MockDraftSimulatorWrapper → MockDraftSetup or MockDraftSimulatorClient; save via useMockDraftEngine → /api/mock-draft/save.
  - **/mock-draft-simulator**: Same wrapper without lobby.
  - **/af-legacy?tab=mock-draft**: DraftRoom; no save to MockDraft (state only in memory).

- **Draft order:** Snake/linear/auction in lib/mock-draft/draft-engine.ts and mock-draft-simulator; 3RR in DraftRoom (af-legacy). Commissioner POST draft (pause/resume/undo/assign) is stubbed; Sleeper is read-only for draft control.

- **Player pool / ADP:** NFL-focused (getLiveADP, fetchFFCADP, multi-platform-adp). ADP API returns empty for non-NFL with message. Sport-aware UI (SportDraftUIResolver) supports all 7 sports; player data for non-NFL draft is a gap.

- **Queue:** useDraftQueue and DraftQueue are client-only; DraftTab uses hardcoded initial queue; no persistence across reload or across draft/mock views.

- **Chat:** DraftRoom has in-room chat (local state); no backend or realtime.

- **Traded picks:** Shown in DraftRoom when league imported from Sleeper; mock-draft trade-propose / trade-simulate / trade-action APIs exist.

- **Bye week:** ADPEntry has `bye` in adp-data; used in waiver scoring; not prominently surfaced in draft board UI.

---

## 3. Live Draft Readiness Assessment

| Area | Status | Notes |
|------|--------|--------|
| **Draft route** | ❌ | No dedicated live draft route (e.g. `/leagues/[id]/draft` or `/app/league/[id]/draft`). LeagueDraftBoard “invite link” points to non-existent route. |
| **Realtime sync** | ❌ | No WebSocket/SSE; no multi-device or multi-user live sync. |
| **Timer** | ⚠️ | Timer exists in LeagueDraftBoard and DraftRoom (client clock); no server-authoritative timer; no sync across clients. |
| **Picks persistence** | ❌ | LeagueDraftBoard picks are local only; not saved to backend. Commissioner GET reads Sleeper only. |
| **Commissioner controls** | ❌ | POST pause/resume/undo/assign/reorder returns “not wired”; Sleeper API is read-only for draft control. |
| **Draft order** | ⚠️ | Snake/linear/3RR in UI; order not persisted per draft session for AllFantasy-native drafts. |
| **Queue** | ❌ | Queue not persisted; not synced to backend or across tabs. |
| **Chat** | ❌ | In-room chat is local only; no persistence or realtime. |
| **Orphan/empty team** | ⚠️ | CommissionerTab has set_orphan_seeking; autopick_behavior in config; no explicit “empty seat” handling in draft room. |
| **Roster persistence** | ❌ | Drafted roster from LeagueDraftBoard not written to league/roster API. |
| **Mobile** | ⚠️ | DraftRoom has mobile tab (board/players/myteam); no dedicated mobile draft route or responsive audit. |

**Verdict:** **Not ready** for premium live draft. Missing: dedicated live draft route, server-backed draft state, realtime sync, commissioner controls wiring, persisted queue and picks, and roster persistence.

---

## 4. Mock Draft Readiness Assessment

| Area | Status | Notes |
|------|--------|--------|
| **Entry points** | ✅ | /mock-draft (lobby), /mock-draft-simulator, af-legacy mock-draft tab. |
| **Create / save** | ✅ | create + save APIs; MockDraft with metadata; useMockDraftEngine.saveResults. |
| **Simulate** | ✅ | simulate + simulate-v2; AI picks via DraftAIManager; validation via draft-engine. |
| **AI suggestions** | ✅ | ai-pick (dm-suggestion, pick); useAIDraftAssistant; AIDraftAssistantPanel. |
| **Board / playback** | ✅ | MockDraftSimulatorClient: board, playback, predict-board, snipe-radar, manager-dna. |
| **Traded picks** | ✅ | league-import returns traded_picks; DraftRoom displays; trade-propose, trade-simulate, trade-action. |
| **Queue** | ⚠️ | Queue in simulator/client; not persisted; DraftTab queue is separate and hardcoded. |
| **Sport scope** | ⚠️ | UI supports 7 sports (SportDraftUIResolver); ADP/player pool is NFL-only. |
| **Share** | ✅ | shareId, share route, /mock-draft/share/[shareId]. |
| **Recap** | ✅ | MockDraftRecap; retrospective API. |
| **Draft types** | ✅ | Snake/linear/auction in types and draft-engine; 3RR in DraftRoom. |
| **Timer** | ✅ | Client timer in DraftRoom and simulator; no server timer needed for single-user mock. |

**Verdict:** **Mostly ready** for single-user mock drafts (NFL). Gaps: queue persistence, multi-sport ADP/pool, and unifying two mock flows (af-legacy vs /mock-draft) for consistent UX.

---

## 5. Gap List

- **Routes**
  - No `/leagues/[leagueId]/draft` or `/app/league/[leagueId]/draft` for live draft; invite link dead.
  - Draft-helper page is SEO-only; no draft tool UI.

- **State and persistence**
  - LeagueDraftBoard: picks and timer are local only; no save or reload.
  - useDraftQueue / DraftQueue: no persistence; DraftTab initial queue is hardcoded.
  - DraftRoom (af-legacy): full state in parent; no URL or DB restore; refresh loses draft.

- **Realtime**
  - No WebSocket/SSE for draft or chat; no multi-user live sync.

- **Commissioner**
  - POST /api/commissioner/leagues/[leagueId]/draft is stub (platformSupported: false).
  - DraftSettingsPanel is read-only; no commissioner override save.

- **Backend**
  - GET /api/app/league/:id/draft does not pass leagueId to ADP (generic ADP only).
  - No backend “draft session” entity for AllFantasy-native live drafts (only Sleeper read + MockDraft for mocks).

- **Sport**
  - ADP and simulate are NFL-focused; non-NFL sports get empty ADP and no player pool.

- **Chat**
  - DraftRoom chat is local only; no integration with bracket/league chat or persistence.

- **Bye week**
  - Bye in ADP data; not displayed in draft board.

- **Orphan/empty team**
  - No explicit “empty team autopick” or “replace with AI” flow in live draft room.

- **Duplicate / split flows**
  - Two mock experiences: af-legacy DraftRoom vs /mock-draft MockDraftSimulatorClient; different UX and state model.

---

## 6. Risk List

- **State desync:** Multiple clients in same “draft” would diverge (no server authority; no realtime).
- **Race conditions:** Timer and “make pick” are client-only; no locking or server-side pick validation for live draft.
- **Dead interactions:** “Copy invite” in LeagueDraftBoard points to non-existent route; “Run Draft AI” body may not match ai-pick contract (proxied as-is).
- **Data loss:** Refresh or tab close in DraftRoom or LeagueDraftBoard loses all picks and queue.
- **Commissioner expectation:** UI or docs that imply pause/undo/assign work; they are stubbed.
- **Multi-sport:** Using draft/ADP for non-NFL leagues returns empty data; silent or confusing UX.
- **Queue:** Claim that “queue persists across draft and mock views” (DraftQueue copy) is false; no shared persistence.

---

## 7. Recommended Implementation Order

1. **Unify and expose draft route**
   - Add `/app/league/[leagueId]/draft` (or `/leagues/[leagueId]/draft`) as the canonical live draft page; fix invite link. Optionally redirect draft-helper to mock-draft or this route.

2. **Draft session and persistence**
   - Introduce a draft session (DB or service) for AllFantasy-native drafts: draft id, league id, status, order, current pick, timer end, picks array. Persist LeagueDraftBoard picks and commissioner-controlled state to this session.

3. **Queue persistence**
   - Persist user draft queue per league (or per draft session); load in DraftTab and DraftRoom/MockDraftSimulatorClient so “queue across views” is real.

4. **Realtime**
   - Add WebSocket or SSE channel for draft session: pick events, timer sync, commissioner actions. Use for live draft and optionally for mock “spectate” or multi-user mock.

5. **Commissioner controls**
   - Wire POST commissioner draft to platform where possible (e.g. Sleeper if ever supported); or implement AllFantasy-native draft control (pause/resume/timer/undo/assign) against the new draft session.

6. **Roster and grades**
   - On draft complete, persist drafted roster to league/roster (or mark draft complete and let existing roster sync handle it). Keep draft-grades integration.

7. **Chat**
   - Add draft-scoped chat (backend store + optional realtime) and plug into DraftRoom; align with existing chat/bracket patterns if applicable.

8. **Mock consolidation**
   - Align af-legacy DraftRoom and /mock-draft flow: shared queue, shared save/restore (MockDraft), and optionally single “mock draft” entry (lobby or league tab) to reduce duplicate code and UX split.

9. **Multi-sport**
   - Extend ADP and player pool (and simulate) for NHL, NBA, MLB, NCAAB, NCAAF, SOCCER so draft room and mock drafts work for all supported sports.

10. **Bye week and polish**
    - Surface bye week in draft board/player list where ADP has it. Orphan/empty team handling (autopick or “replace with AI”) in live draft.

---

## 8. Mandatory Click Audit Summary

| Element | Component / Route | Handler | Backend | Realtime/Refresh | State Reload | Flag |
|--------|--------------------|--------|--------|-------------------|-------------|------|
| Run Draft AI | DraftTab | runDraftAi | POST recommend-ai → ai-pick | No | N/A | OK |
| Draft config | DraftTab, DraftSettingsPanel | useLeagueSectionData('draft/config') | GET draft/config | No | Yes | OK |
| Draft section data | DraftTab | useLeagueSectionData('draft') | GET draft → mock-draft/adp | No | Yes | leagueId not passed to ADP |
| Add to queue | LeagueDraftBoard, DraftQueue | addToQueue | None | No | No | **Dead persistence** |
| Make pick | LeagueDraftBoard | handleDraftPlayer | None | No | No | **Dead persistence** |
| Undo / Reset | LeagueDraftBoard | handleUndoLastPick, handleResetDraft | None | No | No | Local only |
| Copy invite | LeagueDraftBoard | handleCopyInvite | N/A | N/A | N/A | **Dead link** (/leagues/:id/draft) |
| Ask AI / AI pick | DraftRoom (af-legacy) | onAiDmSuggestion, onAiPick | POST ai-pick | No | N/A | OK |
| Send chat | DraftRoom | sendChat | None | No | No | **Local only** |
| Start/Reset draft | DraftRoom | onStartDraft, onResetDraft | None | No | No | **State lost on refresh** |
| Sleeper import | DraftRoom | onSleeperImport | POST league-import | No | Yes (state) | OK |
| Save mock results | useMockDraftEngine | saveResults | POST save | No | Yes (MockDraft) | OK |
| Commissioner draft GET | — | — | Sleeper read | No | Yes | OK (read-only) |
| Commissioner draft POST | — | — | Stub | N/A | N/A | **Stub** |
| Legacy Draft War Room | DraftTab | LegacyAIPanel | GET draft-war-room | No | Yes | OK |

---

*End of audit. No code implemented; recommendations only.*
