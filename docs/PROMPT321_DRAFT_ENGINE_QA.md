# PROMPT 321 — Draft Engine QA

## Objective

Ensure the draft never breaks. Verify pick order, timers, auto-pick, traded picks, AI picks, and queue system; fix issues found.

---

## Areas verified

### 1. Pick order

- **Snake / linear / auction:** Order is computed in `DraftOrderService.getSlotInRoundForOverall` (snake/linear) and used by `CurrentOnTheClockResolver` and `getRosterIdForOverall`.
- **3RR (third-round reversal):** Standard 3RR is “round 2 and 3 reversed, then normal snake from round 4” (1-12, 12-1, 12-1, 1-12, 12-1, …). **Fix applied:** Logic was updated so round 4 is normal (not reversed). Same formula used in `DraftOrderService` and `keeper/KeeperDraftOrder.getRoundSlotForRoster` for consistency.
- **Keeper locks:** Use the same snake/3RR logic for round/slot and resolve owner via `resolvePickOwner` (traded picks).

### 2. Timers

- **Server-authoritative:** `DraftTimerService` uses `timerEndAt` (UTC) when running and `pausedRemainingSeconds` when paused. No client-only timer for enforcement.
- **Slow draft:** `computeTimerStateWithPauseWindow` supports overnight pause window; inside the window the timer does not count down.
- **Reset / set length:** `resetTimer`, `setTimerSeconds` in `DraftSessionService`; commissioner controls in `app/api/leagues/[leagueId]/draft/controls/route.ts`.

### 3. Auto-pick

- **Trigger:** When the user is on the clock and the timer has expired, the client can call `POST .../draft/autopick-expired` with the first available player from their queue (when autopick from queue is enabled).
- **Fix applied:** “On the clock” for autopick now uses the **resolved owner** (after traded picks). If the pick was traded, the new owner (not the original slot owner) can submit the autopick. Same rosterId check used for validation and for “you are not on the clock”.
- **Commissioner force autopick:** `force_autopick` in draft controls submits a pick on behalf of the current slot; uses same submission path and resolved owner.

### 4. Traded picks

- **Ownership:** `PickOwnershipResolver.resolvePickOwner(round, slot, slotOrder, tradedPicks)` returns the current owner (newRosterId/newOwnerName when the pick was traded).
- **Fixes applied:**
  - **Pick submission:** Validation now uses the resolved owner as “on the clock” (`onClockRosterId = resolvedOwner?.rosterId ?? current.rosterId`). The new owner of a traded pick can submit; the original slot owner is no longer incorrectly rejected.
  - **Snapshot:** `buildSessionSnapshot` now resolves the current pick owner from `tradedPicks` and sets `currentPick.rosterId` and `currentPick.displayName` to the resolved owner. So the UI and “who is on the clock” are correct after trades.
  - **Autopick-expired:** Uses resolved owner to decide who can call the autopick endpoint (new owner after trade).

### 5. AI picks (orphan / AI manager)

- **Flow:** Commissioner triggers AI pick via `POST .../draft/ai-pick` when the current on-the-clock roster is an orphan and orphan AI manager is enabled. `OrphanAIManagerService.executeDraftPickForOrphan` uses CPU or AI drafter and submits via `submitPick`.
- **Current pick:** Snapshot’s `currentPick.rosterId` is now the resolved owner; if an orphan acquired the pick via trade, they are correctly identified as on the clock and the commissioner can trigger the AI pick for that orphan.

### 6. Queue system

- **GET/PUT:** `app/api/leagues/[leagueId]/draft/queue/route.ts` — GET returns the current user’s queue for the session; PUT saves order (array of `playerName`, `position`, `team`, `playerId`), capped at 50.
- **Autopick from queue:** Autopick-expired uses the first available (not already drafted) player from the user’s queue. Queue is keyed by `sessionId` and `userId`; no change needed for traded picks (queue is per user; the user on the clock is the one whose queue is used after the fix above).
- **AI reorder:** Separate endpoint for queue reorder by AI; uses same queue storage.

---

## Fixes applied (summary)

| Area | File(s) | Change |
|------|--------|--------|
| **Traded picks – submission** | `lib/live-draft-engine/PickSubmissionService.ts` | Use resolved owner as `currentOnClockRosterId` in `validatePickSubmission` so the new owner of a traded pick can submit. |
| **Traded picks – snapshot** | `lib/live-draft-engine/DraftSessionService.ts` | After `resolveCurrentOnTheClock`, resolve owner from `tradedPicks` and set `currentPick.rosterId` / `displayName` so UI and APIs see the correct “on the clock” owner. |
| **Traded picks – autopick** | `app/api/leagues/[leagueId]/draft/autopick-expired/route.ts` | Use `resolvePickOwner` and allow the resolved owner (not only slot-order owner) to call autopick when on the clock. |
| **3RR pick order** | `lib/live-draft-engine/DraftOrderService.ts` | 3RR: reversed rounds = 2, 3, 5, 7, 9… (round 4 normal). Replaced previous formula that reversed round 4. |
| **3RR keeper** | `lib/live-draft-engine/keeper/KeeperDraftOrder.ts` | Same 3RR formula in `getRoundSlotForRoster` so keeper locks and round/slot match the main draft order. |

---

## Reference

- **Pick order:** `lib/live-draft-engine/DraftOrderService.ts`, `CurrentOnTheClockResolver.ts`
- **Ownership (trades):** `lib/live-draft-engine/PickOwnershipResolver.ts`
- **Timers:** `lib/live-draft-engine/DraftTimerService.ts`
- **Submission:** `lib/live-draft-engine/PickSubmissionService.ts`, `PickValidation.ts`
- **Snapshot:** `lib/live-draft-engine/DraftSessionService.ts` (`buildSessionSnapshot`)
- **Queue:** `app/api/leagues/[leagueId]/draft/queue/route.ts`, `app/api/leagues/[leagueId]/draft/autopick-expired/route.ts`
- **AI/orphan:** `lib/orphan-ai-manager/OrphanAIManagerService.ts`, `app/api/leagues/[leagueId]/draft/ai-pick/route.ts`
- **Commissioner controls:** `app/api/leagues/[leagueId]/draft/controls/route.ts`
