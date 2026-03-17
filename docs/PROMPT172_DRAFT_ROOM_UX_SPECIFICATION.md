# PROMPT 172 — AllFantasy Draft Room UX Specification

**Date:** 2025-03-14  
**Purpose:** Premium live draft room and mock draft room UX definition.  
**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.  
**Constraint:** No use of other platforms’ brand names, assets, copy, or proprietary styling.

---

## 1. Route Map

| Route | Type | Purpose | Auth |
|-------|------|---------|------|
| `/app/league/[leagueId]/draft` | Live draft | Canonical live draft room for a league. | Member |
| `/app/league/[leagueId]/draft/settings` | Sub-route or modal | Draft room settings (toggles, timer, chat sync). | Member (commissioner for some) |
| `/mock-draft` | Mock | Mock draft lobby: new mock, recent mocks, share. | User |
| `/mock-draft/setup` | Mock | Optional dedicated setup step (sport, type, teams, timer, AI). | User |
| `/mock-draft/room/[draftId]` | Mock | Active mock draft room (single-user or future multi-user). | Owner / share |
| `/mock-draft/share/[shareId]` | Mock | Public read-only shared mock draft view. | Public |
| `/mock-draft/recap/[draftId]` | Mock | Post-draft recap for a saved mock. | User |
| `/draft-helper` | Landing | SEO/tool landing; CTA to `/mock-draft` or league draft. | Public |
| `/leagues/[leagueId]` (Draft tab) | League hub | Inline Draft tab; can deep-link to `/app/league/[leagueId]/draft`. | Member |

**API routes (reference for UX):**

- Draft session: `GET/POST /api/leagues/[leagueId]/draft/session` (or equivalent) — load/save draft state.
- Picks: `GET /api/.../draft/picks`, `POST /api/.../draft/pick`.
- Queue: `GET/PUT /api/.../draft/queue`.
- Config: `GET /api/app/league/[id]/draft/config`.
- ADP: `GET /api/mock-draft/adp` (sport, type, pool).
- AI: `POST /api/mock-draft/ai-pick`, recommend-ai proxy.
- Commissioner: `POST /api/commissioner/leagues/[leagueId]/draft` (pause/resume/undo/assign).
- Chat: league chat channel scoped to draft when “draft chat ↔ league chat” on.
- Mock: create, save, simulate, share, retrospective as in audit.

---

## 2. Screen Inventory

| Screen | Route / Context | Description |
|--------|------------------|-------------|
| **Live draft room** | `/app/league/[leagueId]/draft` | Single primary screen: top bar + manager strip + board + player panel + queue + chat + AI. Sub-views: board focus, player focus, queue focus. |
| **Live draft settings** | Modal or `/app/league/[leagueId]/draft/settings` | Toggles (traded pick color, new owner name, AI ADP, AI queue reorder, orphan AI, chat sync, auto-pick, timer mode, soft/overnight pause). |
| **Mock draft lobby** | `/mock-draft` | List of saved mocks, “New mock draft” CTA, league selector, share links. |
| **Mock draft setup** | `/mock-draft/setup` or inline in lobby | Sport, league type, draft type, # teams, rounds, timer, AI on/off, league link (optional). |
| **Mock draft room** | `/mock-draft/room/[draftId]` | Same layout as live draft room but mock context: no league chat sync, isolated chat, save/pause/restore. |
| **Mock draft recap** | `/mock-draft/recap/[draftId]` | Post-draft summary: rounds, picks by team, grades, share CTA. |
| **Shared mock view** | `/mock-draft/share/[shareId]` | Read-only board + picks; no queue/chat/edit. |
| **Draft helper landing** | `/draft-helper` | Marketing/SEO; CTAs to start mock or go to league draft. |
| **League hub (Draft tab)** | `/leagues/[leagueId]` tab=Draft | Entry to draft; shows “Open draft room” or pre-draft board/config. |

---

## 3. Component Inventory

### 3.1 Shell and layout

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **DraftRoomShell** | Overall layout: top bar, manager strip, main grid (board + panels), responsive breakpoints. | Live, Mock room |
| **DraftTopBar** | League name, draft type, sport, timer status, current pick, manager on clock, commissioner controls (if applicable). | Live, Mock room |
| **DraftManagerStrip** | Horizontal row of manager cards in draft order; assigned color; active highlight; traded-pick visual mode. | Live, Mock room |
| **DraftMainGrid** | Responsive grid: board (primary), player panel, queue panel, chat panel, AI panel(s). | Live, Mock room |

### 3.2 Draft board

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **DraftBoard** | Grid of pick cells (e.g. 1.01, 1.02 …); round × slot. | Live, Mock room |
| **DraftBoardCell** | Single cell: pick label, drafted player, bye week, traded-pick owner; optional color tint (traded-pick color mode); optional “new owner name in red.” | Live, Mock room |
| **DraftBoardRoundHeader** | Round label (e.g. “Round 1”). | Live, Mock room |
| **DraftBoardSlotHeader** | Slot/team column header (optional). | Live, Mock room |

### 3.3 Player panel

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **PlayerPanel** | Container: filters, sort, search, list, current roster summary. | Live, Mock room |
| **PlayerFilters** | Position filter, team filter, search (player/team). | Live, Mock room |
| **PlayerSortControls** | ADP, name, optional custom sort. | Live, Mock room |
| **PlayerList** | Scrollable list of available players; bye week where applicable; AI-adjusted ADP toggle support. | Live, Mock room |
| **PlayerRow** | Single player: name, position, team, ADP, bye; actions: add to queue, draft (when on clock). | Live, Mock room |
| **CurrentRosterView** | Current user (or selected manager) drafted roster. | Live, Mock room |

### 3.4 Queue panel

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **QueuePanel** | Container: queue list, “AI reorder,” “Auto-pick from queue,” “Away mode,” explanations. | Live, Mock room |
| **QueueList** | Drag-and-drop ordered list of queued players. | Live, Mock room |
| **QueueItem** | Single item: player, remove, drag handle; optional AI explanation. | Live, Mock room |
| **QueueActions** | Buttons: AI reorder, Auto-pick from queue, Away mode. | Live, Mock room |

### 3.5 Chat panel

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **DraftChatPanel** | Container: message list, composer, “league chat” vs “mock only” badge. | Live, Mock room |
| **DraftChatMessageList** | Messages; supports text, GIFs, links, images, short videos, memes; @mentions; last-active/last-seen where allowed. | Live, Mock room |
| **DraftChatComposer** | Input, send, optional media; @mention trigger; “Hand off to AI” action. | Live, Mock room |
| **CommissionerBroadcast** | Commissioner-only: @everyone to selected leagues they manage. | Live only |

### 3.6 AI panels and actions

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **DraftHelperPanel** | Entry: “Draft helper” with sub-actions. | Live, Mock room |
| **BestPickCard** | AI “best pick” suggestion + short reason. | Live, Mock room |
| **PositionalNeedCard** | Positional need advice. | Live, Mock room |
| **RosterConstructionCard** | Roster construction advice. | Live, Mock room |
| **ReachStealWarningCard** | Reach/steal warning. | Live, Mock room |
| **PickTradeEvaluationCard** | Pick trade evaluation (accept/decline context). | Live, Mock room |
| **OrphanAIManagerToggle** | Enable/disable AI manager for orphan teams. | Live (commissioner) |
| **AIQueueOptimizationCard** | “AI reorder queue” result summary. | Live, Mock room |
| **AIMockSimulationMode** | Toggle or flow for “AI mock draft simulation” (run full mock with AI). | Mock room |
| **HandOffToAIChat** | CTA to open private AI chat with draft context. | Live, Mock room |

### 3.7 Commissioner and settings

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **CommissionerDraftControls** | Pause, resume, reset timer, undo pick, assign pick, reorder (when supported). | Live, commissioner |
| **DraftRoomSettingsModal** | All toggles: traded pick color mode, show new owner name in red, AI ADP, AI queue reorder, orphan AI manager, draft chat ↔ league chat, auto-pick behavior, timer mode, pause overnight/soft timer. | Live, Mock room (user subset) |

### 3.8 Mock-specific

| Component | Responsibility | Used in |
|-----------|----------------|--------|
| **MockDraftLobby** | List saved mocks, new mock, share. | `/mock-draft` |
| **MockDraftSetupForm** | Sport, type, teams, rounds, timer, AI; league link. | Mock setup |
| **MockDraftRecapView** | Recap summary, share CTA. | Mock recap |
| **SharedMockView** | Read-only board + picks. | Share page |

---

## 4. State Matrix

| State slice | Source | Scope | Persisted | Realtime |
|-------------|--------|--------|-----------|----------|
| **Draft session** | Backend / context | League or mock | Yes (live: backend; mock: MockDraft) | Yes (live) |
| **Draft config** | Backend (draft/config, league settings) | League | Yes | No (refresh) |
| **Picks** | Backend / event stream | Session | Yes | Yes (live) |
| **Current pick index / on-clock** | Derived + server | Session | Yes | Yes |
| **Timer** | Server-authoritative (live) or client (mock) | Session | Yes (live) | Yes (live) |
| **Manager order** | Backend / config | Session | Yes | Yes (if reorder) |
| **Traded picks** | Backend (league traded_picks) | League | Yes | Refresh |
| **User queue** | Backend (draft/queue) | User + session | Yes | Optional |
| **Available players / ADP** | Backend (adp, player pool) | Session | No (fetch) | No |
| **AI suggestions** | Backend (ai-pick) | Ephemeral | No | No |
| **Chat messages** | Backend (league chat or mock chat) | League or mock | Yes | Yes |
| **Settings (toggles)** | Backend (user/league settings) | User or league | Yes | No |
| **Commissioner controls** | Backend (commissioner draft POST) | League | Yes | Yes |
| **UI view state** | Client | Tab/panel focus, modals, sort/filter | No (or localStorage) | No |
| **Empty / loading / error** | Client + API | Per component | No | No |

---

## 5. Interaction Matrix (Mandatory Click Audit)

For each interaction: route, component, CTA, expected state change, backend dependency, realtime dependency, empty/loading/error, mobile/desktop.

### 5.1 Top bar and session

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| View league name | Draft room | DraftTopBar | — | — | Config/league | No | Show league name or “—” | — | — | Truncate | Full |
| View draft type | Draft room | DraftTopBar | — | — | Config | No | “Snake” / “Linear” / “Auction” | — | — | Icon + short | Full label |
| View sport | Draft room | DraftTopBar | — | — | Config | No | Sport code/name | — | — | Icon | Icon + label |
| View timer | Draft room | DraftTopBar | — | Countdown or “Paused” | Session/timer API | Yes (live) | “—:—” or “Paused” | Skeleton | Stale/error message | Compact | Full |
| View current pick | Draft room | DraftTopBar | — | e.g. “Pick 3.04” | Picks/session | Yes | “—”; “Draft complete” when done | — | — | Short | Full |
| View manager on clock | Draft room | DraftTopBar | — | Manager name + highlight | Session | Yes | “—” | — | — | Truncate | Full |
| Open commissioner controls | Draft room | DraftTopBar | “Commissioner” or icon | Open commissioner controls menu/modal | Commissioner role | No | Hidden if not commissioner | — | — | Bottom sheet | Dropdown/modal |
| Pause draft | Draft room | CommissionerDraftControls | “Pause” | Draft paused; timer stops | POST commissioner draft | Yes | — | Spinner on button | Toast + retry | Same | Same |
| Resume draft | Draft room | CommissionerDraftControls | “Resume” | Draft resumes; timer runs | POST commissioner draft | Yes | — | Spinner | Toast + retry | Same | Same |
| Reset timer | Draft room | CommissionerDraftControls | “Reset timer” | Timer reset to full per-pick | POST commissioner draft | Yes | — | Spinner | Toast + retry | Same | Same |
| Undo last pick | Draft room | CommissionerDraftControls | “Undo pick” | Last pick removed; order reverts | POST commissioner draft | Yes | Disabled if no picks | Spinner | Toast + retry | Same | Same |
| Assign pick (missed) | Draft room | CommissionerDraftControls | “Assign pick” | Modal: assign player to slot | POST commissioner draft | Yes | — | Spinner | Toast + retry | Modal | Modal |

### 5.2 Manager strip

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| View managers in order | Draft room | DraftManagerStrip | — | Display order 1..N | Session/config | Yes (if reorder) | Placeholder “Team 1”… | Skeleton | — | Horizontal scroll | Full row |
| View active manager | Draft room | DraftManagerStrip | — | Highlight current slot | Session | Yes | — | — | — | Ring + label | Same |
| View traded-pick color | Draft room | DraftManagerStrip / cell | — | Tint per settings | Config (traded picks) | No | No tint | — | — | Same | Same |
| Tap manager card | Draft room | DraftManagerStrip | Card | Optional: focus roster for that manager | Local | No | — | — | — | Expand or sheet | Tooltip or sidebar |

### 5.3 Draft board

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| View pick cells | Draft room | DraftBoard | — | Grid 1.01 … R.N | Picks | Yes | Empty cells | Skeleton grid | — | Scroll both axes | Full grid |
| View drafted player in cell | Draft room | DraftBoardCell | — | Player name, position, team | Picks | Yes | “—” | — | — | Abbreviate | Full |
| View bye week | Draft room | DraftBoardCell | — | e.g. “BYE 7” | ADP/player | No | — | — | — | Small badge | Same |
| View traded-pick owner | Draft room | DraftBoardCell | — | New owner or tint (per settings) | Traded picks | No | Normal cell | — | — | Initials or tint | Name or tint |
| Toggle traded-pick color mode | Settings | DraftRoomSettingsModal | “Traded pick color mode” | Cells tint by acquiring manager | User/league settings | No | — | — | — | Toggle | Toggle |
| Toggle “new owner name in red” | Settings | DraftRoomSettingsModal | “Show new owner name in red” | Text indicator in cell | User/league settings | No | — | — | — | Toggle | Toggle |
| Tap cell (optional) | Draft room | DraftBoardCell | Cell | Player detail popover/sheet | Picks + player | No | — | — | — | Bottom sheet | Popover |

### 5.4 Player panel

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| View available players | Draft room | PlayerList | — | Sorted/filtered list | ADP / player pool | No | “No players match” | List skeleton | Error message + retry | Scroll list | Same |
| Sort by ADP | Draft room | PlayerSortControls | “ADP” | List re-sorted by ADP | — | No | — | — | — | Segmented control | Dropdown |
| Sort by name | Draft room | PlayerSortControls | “Name” | List re-sorted by name | — | No | — | — | — | Same | Same |
| Filter by position | Draft room | PlayerFilters | Position dropdown | List filtered | — | No | “No players” | — | — | Chips or sheet | Dropdown |
| Filter by team | Draft room | PlayerFilters | Team dropdown | List filtered | — | No | “No players” | — | — | Same | Same |
| Search player/team | Draft room | PlayerFilters | Search input | List filtered | — | No | “No results” | — | — | Full-width | Same |
| Toggle AI-adjusted ADP | Draft room | PlayerPanel | “AI ADP” toggle | List shows AI-adjusted ADP when on | Config + optional API | No | — | — | — | Toggle | Toggle |
| Add to queue | Draft room | PlayerRow | “Add to queue” | Player appended to queue | Queue API (optional) | Optional | — | Button loading | Toast | Icon | Button |
| Draft player (on clock) | Draft room | PlayerRow | “Draft” | Pick recorded; board + roster update | POST pick | Yes | — | Button loading | Toast + retry | Primary button | Same |
| View current roster | Draft room | CurrentRosterView | — | Show my (or selected) drafted roster | Picks | Yes | “No picks yet” | — | — | Collapsible | Sidebar or panel |

### 5.5 Queue panel

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| View queue | Draft room | QueueList | — | Ordered list | Queue API | Optional | “Queue is empty” | — | — | Scroll | Same |
| Drag/reorder queue | Draft room | QueueItem | Drag handle | Order updated | PUT queue | Optional | — | — | Toast | Long-press drag | Drag |
| Remove from queue | Draft room | QueueItem | Remove icon | Item removed | PUT queue | Optional | — | — | — | Tap | Click |
| AI reorder queue | Draft room | QueueActions | “AI reorder” | Queue reordered by AI suggestion | POST ai-pick or queue/reorder | No | Disabled if empty | Spinner | Toast | Button | Same |
| Toggle auto-pick from queue | Draft room | QueueActions | “Auto-pick from queue” | When on clock, top of queue auto-picked | Local + pick API | Yes | — | — | — | Toggle | Toggle |
| Away mode | Draft room | QueueActions | “Away mode” | Auto-pick from queue + optional AI fallback | Local + pick API | Yes | — | — | — | Toggle | Toggle |
| View queue explanation | Draft room | QueueItem / panel | “Why?” or icon | Show AI explanation for position | AI API (cached) | No | “—” | — | — | Expand row | Tooltip |

### 5.6 Chat panel

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| View messages | Draft room | DraftChatMessageList | — | Chronological messages | Chat API | Yes | “No messages yet” | Skeleton | Error + retry | Scroll | Same |
| Send text | Draft room | DraftChatComposer | Send | Message appended; delivered | POST chat | Yes | — | Send disabled | Toast | Same | Same |
| Send GIF/link/image/video | Draft room | DraftChatComposer | Attach / paste | Message with media | POST chat + media | Yes | — | Upload state | Toast | Picker | Same |
| @mention | Draft room | DraftChatComposer | “@” | Mention selector; message with mention | POST chat | Yes | — | — | — | Inline suggest | Same |
| Commissioner @everyone | Draft room | CommissionerBroadcast | “@everyone” + leagues | Broadcast to selected leagues | POST chat/broadcast | Yes | — | Spinner | Toast | Modal | Modal |
| Hand off to AI chat | Draft room | DraftChatComposer | “Hand off to AI” | Navigate or open private AI chat with draft context | AI context API | No | — | — | — | New view / sheet | Side panel or new tab |
| View last-active / last-seen | Draft room | DraftChatMessageList | — | Timestamp where allowed | Chat presence | Yes | “—” | — | — | Small text | Same |
| Mock chat (isolated) | Mock room | DraftChatPanel | — | Chat only in mock session; no league sync | Mock chat API | Yes | Same | Same | Same | Same | Same |

### 5.7 AI panels and actions

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| Open draft helper | Draft room | DraftHelperPanel | “Draft helper” | Expand or open AI panel | — | No | — | — | — | Sheet | Panel |
| View best pick | Draft room | BestPickCard | — | Show top suggestion + reason | POST ai-pick | No | “Ask for suggestion” | Card skeleton | Retry | Card | Same |
| Refresh best pick | Draft room | BestPickCard | “Refresh” | New suggestion | POST ai-pick | No | — | Spinner | Toast | Icon | Same |
| Positional need | Draft room | PositionalNeedCard | — | Show need by position | POST ai-pick / needs | No | “—” | Skeleton | — | Collapse | Same |
| Roster construction | Draft room | RosterConstructionCard | — | Advice text | POST ai-pick | No | “—” | Skeleton | — | Same | Same |
| Reach/steal warning | Draft room | ReachStealWarningCard | — | Warning + player if applicable | POST ai-pick / predict | No | “—” | — | — | Inline | Same |
| Pick trade evaluation | Draft room | PickTradeEvaluationCard | — | Accept/decline context + value | POST trade eval | No | “—” | Skeleton | — | Card | Same |
| Orphan AI manager | Settings / commissioner | OrphanAIManagerToggle | Toggle | Orphan teams use AI to pick | League settings | No | — | — | — | Toggle | Toggle |
| AI queue optimization | Draft room | QueueActions + card | “AI reorder” | Queue reordered; optional explanation | POST ai-pick queue | No | — | Spinner | Toast | Same | Same |
| AI mock simulation mode | Mock room | AIMockSimulationMode | Toggle / “Run AI mock” | Full mock run with AI picks | POST simulate | No | — | Progress | Toast | Same | Same |

### 5.8 Settings and toggles

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| Open settings | Draft room | DraftTopBar or shell | “Settings” / gear | Open DraftRoomSettingsModal | — | No | — | — | — | Full-screen modal | Modal |
| Traded pick color mode | Settings | DraftRoomSettingsModal | Toggle | Persist; board cells tint when on | PATCH settings | No | — | — | Toast | Toggle | Toggle |
| Show new owner name in red | Settings | DraftRoomSettingsModal | Toggle | Persist; cells show red text when on | PATCH settings | No | — | — | — | Toggle | Toggle |
| AI ADP on/off | Settings | DraftRoomSettingsModal | Toggle | Player list uses AI-adjusted ADP | PATCH settings | No | — | — | — | Toggle | Toggle |
| AI queue reorder on/off | Settings | DraftRoomSettingsModal | Toggle | “AI reorder” available / default behavior | PATCH settings | No | — | — | — | Toggle | Toggle |
| Orphan AI manager on/off | Settings | DraftRoomSettingsModal | Toggle | Commissioner: orphan slots use AI | PATCH league settings | No | — | — | — | Toggle | Toggle |
| Draft chat ↔ league chat | Settings | DraftRoomSettingsModal | Toggle | Live draft chat syncs to league channel | PATCH settings | No | — | — | — | Toggle | Toggle |
| Auto-pick behavior | Settings | DraftRoomSettingsModal | Select | Queue-first / BPA / need-based | PATCH settings | No | — | — | — | Picker | Dropdown |
| Timer mode | Settings | DraftRoomSettingsModal | Select | Standard / soft / pause overnight (if supported) | PATCH config | No | — | — | — | Picker | Dropdown |
| Save settings | Settings | DraftRoomSettingsModal | “Save” | All toggles persisted | PATCH | No | — | Button loading | Toast | Button | Same |
| Cancel settings | Settings | DraftRoomSettingsModal | “Cancel” | Modal closed; no persist | — | No | — | — | — | Same | Same |

### 5.9 Mock-specific

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| New mock draft | `/mock-draft` | MockDraftLobby | “New mock draft” | Navigate to setup or room | POST create | No | — | — | Toast | Same | Same |
| Open saved mock | `/mock-draft` | MockDraftLobby | List item | Navigate to mock room or recap | GET mock | No | “No mocks yet” | — | — | Same | Same |
| Start mock (from setup) | Mock setup | MockDraftSetupForm | “Start” | Create + enter room | POST create | No | — | Button loading | Toast | Same | Same |
| Save mock (mid-draft) | Mock room | DraftTopBar or actions | “Save” | Persist picks to MockDraft | POST save | No | — | Spinner | Toast | Same | Same |
| Copy share link | Mock lobby/recap | MockDraftLobby / recap | “Share” | Copy URL to clipboard | — | No | — | — | — | Same | Same |
| View shared mock | `/mock-draft/share/[shareId]` | SharedMockView | — | Read-only board + picks | GET share | No | “Invalid link” | Skeleton | 404 message | Same | Same |

### 5.10 Navigation and entry

| Interaction | Route | Component | CTA | State change | Backend | Realtime | Empty | Loading | Error | Mobile | Desktop |
|-------------|--------|-----------|-----|--------------|---------|----------|-------|---------|-------|--------|---------|
| Open draft room from league | `/leagues/[leagueId]` | Draft tab / link | “Open draft room” | Navigate to `/app/league/[leagueId]/draft` | — | No | — | — | — | Same | Same |
| Go to mock draft | `/draft-helper` or home | CTA | “Start mock draft” | Navigate to `/mock-draft` | — | No | — | — | — | Same | Same |
| Leave draft room | Draft room | Shell | “Leave” / back | Navigate back; optional “Are you sure?” if on clock | — | No | — | — | — | Back + confirm | Same |

---

## 6. Recommended Visual Hierarchy

1. **Primary (always visible)**  
   - **Timer + current pick + manager on clock** — single line or compact block in top bar; highest emphasis (size/color) so everyone knows whose turn and how much time.

2. **Secondary (glanceable)**  
   - **Draft board** — main grid; pick labels (1.01, 1.02) and drafted player names; traded-pick tint or red owner text per settings.  
   - **Manager strip** — draft order and “who is on the clock” at a glance; consistent with board column order.

3. **Tertiary (task-focused)**  
   - **Player panel** — primary action = “draft” or “add to queue”; list density high; filters/sort compact but clear.  
   - **Queue panel** — ordered list; drag handle and “AI reorder” / “Auto-pick” prominent.  
   - **Chat** — always visible; compact message list; composer sticky at bottom.

4. **Supporting**  
   - **AI panels** — cards (best pick, need, reach/steal, trade eval) in a rail or collapsible section; not covering board.  
   - **Commissioner controls** — grouped in top bar or one “Commissioner” dropdown; destructive (undo) with confirmation.

5. **Chrome**  
   - **League name, draft type, sport** — top bar left; secondary to timer/pick.  
   - **Settings** — gear or “Settings” in top bar; opens modal.

6. **Color and emphasis**  
   - **On-clock manager**: distinct highlight (ring, background, or accent).  
   - **Traded picks**: tint = acquiring manager color when “traded pick color mode” on; optional red text for “new owner name.”  
   - **Danger**: Undo pick, leave while on clock — use destructive style and confirm.  
   - **Success**: Pick submitted, queue saved — brief success toast or checkmark.

---

## 7. Recommended Mobile Behavior

- **Single-column or tabbed content**: Top bar and manager strip stay fixed or collapse to compact strip; main area = one of: Board | Players | Queue | Chat. Tabs or bottom nav to switch. Board can be “pinch/zoom” or horizontal scroll for rounds.
- **Touch targets**: Buttons and list rows ≥ 44px; drag handle large enough for reorder.
- **Modals**: Settings and commissioner actions as full-screen or bottom sheet; “Save” / “Cancel” sticky.
- **Keyboard**: Composer and search get focus; optional “Done” to dismiss keyboard and keep context.
- **Notifications**: Optional push when “on deck” or “on clock” (backend-dependent).
- **Offline**: Show last-known state; queue and picks sync when back online; clear “Reconnecting” state.

---

## 8. Recommended Desktop Behavior

- **Multi-column layout**: Top bar full width; below: manager strip full width; main area = board (left, ~50–60%) + right column stack: player panel (scroll), queue (scroll), chat (scroll). AI cards in right column or collapsible rail.
- **Board**: Full grid visible without horizontal scroll when rounds ≤ 20; otherwise horizontal scroll. Sticky round/slot headers.
- **Hover**: Player row hover = “Add to queue” / “Draft” emphasis; queue item = drag handle and remove; cell = optional tooltip (player, bye, traded owner).
- **Shortcuts** (optional): e.g. focus search, focus queue, “Draft top of queue,” open AI panel.
- **Resize**: Panels resizable or breakpoints so chat/queue don’t disappear; minimum widths for list readability.
- **Multiple windows**: Same session in two tabs stays in sync via realtime; no duplicate pick submission (server-authoritative).

---

*End of UX specification. No implementation code; design and interaction definitions only.*
