# Fantasy Core – Future Wiring

**Status:** The items below have been **implemented** (as of the current codebase). This doc remains the reference for where each feature is wired and how it works.

---

## 1. League chat / activity after waiver processing

**Goal:** After waiver run, post to league chat or activity feed (e.g. “Waivers processed – 3 claims awarded”).

**Wire-in point:**
- **File:** `lib/waiver-wire/process-engine.ts`
- **After:** The `for (const claim of ordered)` loop, when `results` is fully built (before `return results`).
- **Action:** Call a small hook, e.g. `onWaiverRunComplete(leagueId, results)`, from a shared module (e.g. `lib/waiver-wire/run-hooks.ts`). That module can stay empty or no-op until you implement:
  - Resolve league chat thread (e.g. by leagueId).
  - Post a message (e.g. “Waivers processed. X claims awarded.”).
  - Or append to an activity feed table/API.

**Dependency:** League chat thread ID or activity feed API must be resolvable by leagueId.

---

## 2. Platform live draft room (Sleeper/ESPN)

**Goal:** Real-time draft room for in-season drafts (picks, timer, autopick) from platform.

**Wire-in points:**
- **Commissioner draft controls:** `app/api/commissioner/leagues/[leagueId]/draft/route.ts`  
  Currently returns `platformSupported: false`. When implementing:
  - Detect platform from league (e.g. `league.platform === 'sleeper'`).
  - Call Sleeper (or ESPN) draft API for pause/resume/reset_timer/undo/assign_pick.
  - Return `platformSupported: true` and real result.
- **Live draft UI:** Either a new route/page (e.g. `/app/league/[leagueId]/draft/live`) that loads platform draft state and subscribes to updates, or extend the existing Draft tab with a “Live draft” mode when `league.draftStatus === 'in_progress'` (or similar from platform).

**Dependencies:** Sleeper/ESPN draft API client, draft state sync (poll or websocket).

---

## 3. Commissioner: force-correct roster, remove manager, transfer commissioner

**Goal:** Allow commissioner to force-correct invalid roster, remove a manager, or transfer commissioner role.

**Wire-in points:**
- **Force-correct:** `app/api/commissioner/leagues/[leagueId]/lineup/route.ts`  
  Currently returns 501 for `forceCorrectRosterId`. Implement:
  - Validate commissioner; validate roster belongs to league.
  - Either call platform API to set lineup, or update local Roster.playerData to a valid lineup (per league rules) and optionally emit an event for sync.
- **Remove manager:** `app/api/commissioner/leagues/[leagueId]/managers/route.ts` (DELETE)  
  Currently returns 501. Implement:
  - Call platform API to remove member (e.g. Sleeper remove roster).
  - Optionally mark Roster as “orphan” or delete local roster row if no longer present on platform.
- **Transfer commissioner:** New endpoint, e.g. `POST /api/commissioner/leagues/[leagueId]/transfer`  
  Body: `{ newCommissionerUserId: string }`. Implement:
  - Assert current user is commissioner; validate new user exists and has roster in league (or is allowed).
  - Update `League.userId` to new commissioner (and optionally write an audit log).
  - Require confirmation (e.g. token or double confirmation) to avoid accidents.

**Dependencies:** Platform APIs for roster/lineup and league membership; audit log if desired.

---

## 4. Broadcast / pin to league chat; moderation (remove message)

**Goal:** Commissioner can send @everyone broadcast, pin announcements, and remove flagged messages.

**Wire-in points:**
- **Broadcast:** `app/api/commissioner/leagues/[leagueId]/chat/route.ts` (action `broadcast`)  
  Currently returns “stored: false” and “when league chat channel is linked”. Implement:
  - Resolve league-scoped thread (e.g. from `League.settings.leagueChatThreadId` or a league_thread table).
  - Call chat service to send message with @everyone or equivalent; store messageId if needed.
- **Pin:** Same route, action `pin`. Implement:
  - Use existing `createPlatformThreadTypedMessage(..., 'pin', { messageId })` (or shared chat pin API) with the league thread ID from settings.
- **Remove message:** Same route, action `remove_message`. Implement:
  - Chat service or DB: soft-delete or hide message by messageId; enforce “only commissioner or moderator” in that route.

**Dependencies:** League–thread association (e.g. `settings.leagueChatThreadId`), chat service supporting send/pin/remove.

---

## 5. NBA/MLB (and NHL) mock draft

**Goal:** Mock draft and ADP work for non-NFL sports.

**Wire-in points:**
- **ADP / player pool:** `app/api/mock-draft/adp/route.ts` and any ADP helpers (e.g. `lib/adp-data`)  
  Add `sport` (or use league.sport). For NBA/MLB, use sport-specific source (e.g. SportsPlayer + rankings by sport, or external ADP API per sport).
- **Simulate:** `app/api/mock-draft/simulate/route.ts`  
  Pass sport into prompt and player pool; ensure OpenAI (or model) receives only players for that sport and position set (e.g. NBA positions).
- **Mock setup:** `components/mock-draft/MockDraftSetup.tsx` already has sport; ensure selected sport flows to create/simulate and recap.

**Dependencies:** ADP/rankings data per sport; position sets per sport in validation and UI.

---

## 6. Duplicate-claim prevention (UI/API)

**Goal:** Prevent user from submitting a second pending claim for the same addPlayerId (optional rule).

**Wire-in points:**
- **API:** `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts` (POST)  
  Before `createClaim`, check: `getClaimsByRoster(roster.id, 'pending')` and if any existing pending claim has same `addPlayerId`, return 409 with message “You already have a pending claim for this player.”
- **UI:** `components/waiver-wire/WaiverWirePage.tsx`  
  When opening the claim drawer for a player, if `claims.some(c => c.addPlayerId === player.id)`, show “Already claimed” and disable or hide Add button.

**Dependencies:** None beyond existing claim-service and UI state.

---

## Summary table

| Item | Primary file(s) | Action when implementing |
|------|------------------|---------------------------|
| Chat/activity after waivers | `lib/waiver-wire/process-engine.ts` | Add hook after loop; implement in `run-hooks` or similar. |
| Platform live draft | `app/api/commissioner/leagues/[leagueId]/draft/route.ts`, new live draft UI | Call platform draft API; add live draft page or mode. |
| Force-correct roster | `app/api/commissioner/leagues/[leagueId]/lineup/route.ts` | Handle `forceCorrectRosterId`; platform or local roster update. |
| Remove manager | `app/api/commissioner/leagues/[leagueId]/managers/route.ts` | Call platform remove; optional local orphan flag. |
| Transfer commissioner | New `POST .../transfer` | Update `League.userId`; add confirmation. |
| Broadcast/pin/remove | `app/api/commissioner/leagues/[leagueId]/chat/route.ts` | Resolve league thread; call chat send/pin/remove. |
| NBA/MLB mock | `app/api/mock-draft/adp`, `simulate`, setup | Add sport to ADP and simulate; sport-specific pools. |
| Duplicate-claim prevention | `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts`, WaiverWirePage | Check pending same addPlayerId; 409 and UI disable. |

All of the above remain **future work**; no implementation is required now. Use this doc to wire them up when in scope.
