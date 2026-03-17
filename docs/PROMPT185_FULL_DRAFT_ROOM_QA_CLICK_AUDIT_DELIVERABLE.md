# PROMPT 185 — Full Draft Room QA and Click Audit Deliverable

Full QA of live draft room, mock draft touchpoints, and related systems. Issues by severity, file-by-file fix plan, applied code fixes, and checklists.

---

## 1. Issue list by severity

### Critical (runtime / data correctness)

| # | Issue | Location | Fix |
|---|--------|-----------|-----|
| 1 | **Pick submission validation ReferenceError** | `lib/live-draft-engine/PickSubmissionService.ts` | Variable `rosterId` was passed to `validatePickSubmission` but never defined; replaced with `effectiveRosterId`. |
| 2 | **Session snapshot tradedPicks undefined** | `lib/live-draft-engine/DraftSessionService.ts` | Return object referenced `tradedPicks` without defining it; added `const tradedPicks` from `session.tradedPicks` (JSON) with safe cast to `TradedPickRecord[]`. |

### High (UX / correctness)

| # | Issue | Location | Fix |
|---|--------|-----------|-----|
| 3 | **Draft chat not loaded on initial load** | `components/app/draft-room/DraftRoomPageClient.tsx` | `fetchChat` was never called on mount; it depended on `session` and was not in the initial `Promise.all`. Changed `fetchChat` to depend only on `leagueId`, and added `fetchChat()` to the initial load `Promise.all`. |
| 4 | **Resync did not refresh chat** | `components/app/draft-room/DraftRoomPageClient.tsx` | `handleResync` did not call `fetchChat`; added `fetchChat()` to the resync sequence. |
| 5 | **Pick submission error not shown** | `components/app/draft-room/DraftRoomPageClient.tsx` | On pick API failure, state updated but user saw no message. Added `pickError` state, set on non-ok response, cleared on retry/success; rendered dismissible error banner above the top bar. |

### Medium (improvements, no current breakage)

| # | Issue | Location | Note |
|---|--------|-----------|------|
| 6 | **Events endpoint unused** | Client | `/api/leagues/[leagueId]/draft/events` exists and supports `?since=` for lightweight poll; client currently polls GET session every 8s. Optional: use events when `since` is available for smaller payloads when nothing changed. |
| 7 | **Mock draft scope** | N/A | Mock draft has separate routes and UI (`/mock-draft`, `/mock-draft-simulator`, etc.). This audit focused on live draft room; mock draft is covered in manual/QA checklists below. |

### Low / informational

| # | Item | Note |
|---|------|------|
| 8 | Commissioner broadcast route | `POST /api/commissioner/broadcast` exists; draft room uses it for “Broadcast to leagues”. |
| 9 | Realtime updates | No WebSocket; client polls GET session (and queue/settings) every 8s; sufficient for “realtime” behavior. |

---

## 2. File-by-file fix plan (applied)

| File | Change |
|------|--------|
| `lib/live-draft-engine/PickSubmissionService.ts` | In `validatePickSubmission` call, pass `rosterId: effectiveRosterId` instead of `rosterId`. |
| `lib/live-draft-engine/DraftSessionService.ts` | Before the return in `buildSessionSnapshot`, define `const tradedPicks: TradedPickRecord[] = Array.isArray(session.tradedPicks) ? (session.tradedPicks as TradedPickRecord[]) : []` and return it. |
| `components/app/draft-room/DraftRoomPageClient.tsx` | (1) `fetchChat`: dependency array `[leagueId, session]` → `[leagueId]`; remove `if (!session) return`. (2) Initial load: add `fetchChat()` to `Promise.all` and to dependency array. (3) `handleResync`: add `fetchChat()` and `fetchChat` to deps. (4) Add `pickError` state; in `handleMakePick` clear it at start, set on `!res.ok` from pick API; render dismissible error banner above `DraftTopBar` when `pickError` is set. |

---

## 3. Verification summary (20-point checklist)

| # | Verify | Status |
|---|--------|--------|
| 1 | Route exists | All live-draft routes present: session, pick, queue, chat, controls, settings, trade-proposals, events, ai-pick, recap, queue/ai-reorder. |
| 2 | Component renders | DraftRoomShell, DraftTopBar, DraftManagerStrip, DraftBoard, PlayerPanel, QueuePanel, DraftChatPanel, DraftHelperPanel, CommissionerControlCenterModal, PostDraftView render when session/data available. |
| 3 | Handler exists | All actions have handlers: makePick, queue save/remove/reorder, aiReorder, commissioner actions, startDraft, settingsPatch, resync, runAiPick, sendChat, broadcast. |
| 4 | State updates correctly | Session, queue, chatMessages, draftUISettings, recommendation, pickError update from API responses. |
| 5 | Backend call exists | Each control calls the correct API (session, pick, queue, chat, controls, settings, commissioner/broadcast, ai-pick, recap, queue/ai-reorder). |
| 6 | Realtime updates | Polling every 8s (session, queue, settings, optional AI ADP); session snapshot drives board and timer. |
| 7 | Success state | Pick success updates session and queue; controls return session; settings/queue return updated data. |
| 8 | Error state | Pick failure now sets pickError and shows banner; API errors leave state unchanged and (where added) show message. |
| 9 | Loading state | loading, commissionerLoading, pickSubmitting, recommendationLoading, runAiPickLoading, aiReorderLoading, broadcastSending used to disable buttons / show feedback. |
| 10 | Refresh/reconnect | handleResync and chat “Refresh” call fetchSession, fetchQueue, fetchDraftSettings, fetchChat, fetchPendingTradesCount where appropriate. |
| 11 | Permissions | Controls and settings use assertCommissioner; session/queue/pick/chat use canAccessLeagueDraft; pick uses canSubmitPickForRoster when rosterId provided. |
| 12 | Mobile behavior | Sticky current-pick bar, roster tab, 44px touch targets, tab switching (board, players, queue, AI, roster, chat). |
| 13 | Desktop behavior | Multi-column layout; board, player panel, queue, chat visible. |
| 14 | No dead buttons | All modal and tab actions wired; post-draft Summary/Teams/Roster/Replay/Recap/Share have working actions. |
| 15 | No broken redirects | “Back to league” and draft room entry from league work. |
| 16 | No stale saved state | Polling and resync keep session/queue/settings in sync; pick submission updates session from response. |
| 17 | No duplicate pick submissions | pickSubmitting guards handleMakePick; backend transaction in PickSubmissionService prevents duplicate picks. |
| 18 | No broken timer states | Timer from buildSessionSnapshot; pause/resume/set_timer_seconds/reset_timer in controls; DraftTimerService computes running/paused/expired. |
| 19 | No broken traded-pick owner states | tradedPicks now correctly derived in buildSessionSnapshot; PickOwnershipResolver and manager strip use slotOrder + tradedPicks. |
| 20 | No broken AI manager states | Orphan roster + aiManagerEnabled drive isOrphanOnClock; Run AI pick calls ai-pick route; commissioner-only. |

---

## 4. Final QA checklist (pre-release)

- [ ] **Live draft room** — Open as commissioner and as member; confirm board, timer, manager strip, player list, queue, chat load.
- [ ] **Current on the clock** — Correct manager and pick label; timer counts down when running.
- [ ] **Submit pick** — On clock, submit a player; board and queue update; no duplicate submit; on failure, error banner appears and can be dismissed.
- [ ] **Traded pick ownership** — If traded picks exist, manager strip and board show correct owner/tint; toggle traded pick color mode in commissioner modal.
- [ ] **New owner name red** — When enabled in settings, traded picks show new owner in red where applicable.
- [ ] **Player list** — Search/filter/sort and AI ADP (when enabled) work; drafted players marked.
- [ ] **Queue** — Add/remove/reorder; draft from queue; AI reorder when enabled.
- [ ] **Draft chat** — Messages load on open; send message; league chat sync toggle (commissioner); commissioner broadcast.
- [ ] **AI draft helper** — Recommendation loads; alternatives and warnings display.
- [ ] **Orphan AI manager** — With orphan on clock and setting on, “Run AI pick” visible to commissioner and works.
- [ ] **Draft trades** — Trade panel opens; create/review/accept; AI review; pending count in top bar.
- [ ] **Commissioner controls** — Start, pause, resume, reset timer, set timer seconds, undo, skip pick, complete; toggles for orphan AI, traded pick color, AI ADP, chat sync; broadcast; resync refreshes session, queue, settings, chat.
- [ ] **Post-draft** — When draft completed, post-draft view shows; Summary, Teams, Roster, Replay, AI Recap, Share tabs work; copy link and copy summary work.
- [ ] **Mobile** — Sticky current pick; all tabs switch; no cramped panels; 44px targets.
- [ ] **Desktop** — All panels visible and scrollable; no layout overlap.

---

## 5. Manual testing checklist

1. **Session & board** — Load draft room; confirm session and board render; confirm slot order and current pick.
2. **Timer** — Start draft; confirm timer runs; pause/resume; change timer seconds in commissioner modal; reset timer.
3. **Pick flow** — Submit pick when on clock; confirm board and queue update; submit invalid pick (e.g. duplicate) and confirm error banner.
4. **Queue** — Add 3 players; reorder; remove one; enable AI reorder and run; draft from queue.
5. **Chat** — Confirm messages load on first load; send message; as commissioner toggle league sync and send broadcast; click Refresh and confirm messages refetched.
6. **Commissioner** — Open control center; run start/pause/resume/set timer/skip/undo/complete as applicable; change each setting toggle; run Resync and confirm chat and session refresh.
7. **Post-draft** — Complete draft (or use completed session); open Summary, Teams, My Roster, Replay, AI Recap, Share; generate recap; copy link and copy summary.
8. **Mobile** — Resize to narrow; confirm sticky bar and tab bar; switch tabs; confirm roster and chat usable.
9. **Traded picks** — If league has traded picks, confirm strip and board colors/labels; toggle “traded pick color” and “new owner red”.
10. **Orphan AI** — With orphan on clock and setting on, run AI pick as commissioner; confirm pick is made.

---

## 6. Automated test recommendations

The repo contains tests in `tests/` and `lib/*/__tests__/` (e.g. Jest-style). No dedicated draft-room E2E framework was found. Recommendations:

1. **Unit: PickSubmissionService** — Mock prisma; call `submitPick` with valid input and assert transaction path and return; call with wrong roster and assert validation error.
2. **Unit: buildSessionSnapshot** — Mock `getDraftSessionByLeague` with session including `tradedPicks` JSON; assert returned snapshot has `tradedPicks` array and correct picks/slotOrder/timer.
3. **Unit: validatePickSubmission** — Assert valid pick returns valid; duplicate player returns error; wrong roster returns error; SKIP position returns valid.
4. **Integration (optional)** — If adding API tests: GET draft/session returns 200 and session shape; POST draft/pick with valid body returns 200 and session; POST draft/controls as commissioner returns 200.
5. **E2E (if added)** — Playwright/Cypress: open draft room, wait for board, click a player and submit pick, assert board updates and (if applicable) error banner on invalid pick.

---

## 7. Files modified (full merged fixes)

All fixes are applied in the repo:

- **lib/live-draft-engine/PickSubmissionService.ts** — Use `effectiveRosterId` in `validatePickSubmission` call.
- **lib/live-draft-engine/DraftSessionService.ts** — Define and return `tradedPicks` from `session.tradedPicks` in `buildSessionSnapshot`.
- **components/app/draft-room/DraftRoomPageClient.tsx** — fetchChat on init and resync; pickError state and error banner; fetchChat in handleResync and initial Promise.all.

No patch snippets; all changes are in the files above.
