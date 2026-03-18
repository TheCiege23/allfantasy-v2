# PROMPT 313 — Real-Time System Hardening

## Objective

Ensure draft and chat systems remain reliable: no broken connections, correct ordering, and no lost or duplicate updates.

---

## What Was Checked

| Area | Finding |
|------|--------|
| **WebSocket connections** | Draft room uses **HTTP polling** (no WebSockets). Bracket live uses **SSE** (`EventSource`) when `useSSE` is true. |
| **Reconnect logic** | Draft: N/A (polling). Bracket SSE: previously showed "Connection lost, reconnecting…" but **did not reopen** the stream. |
| **Message ordering** | Draft: server returns full session snapshot; order is server-defined. Chat: full list replaced on each fetch. |
| **Draft pick sync** | Poll returns session snapshot; **race possible**: a late poll could overwrite newer local state with an older snapshot. |
| **Timer sync** | Timer comes from session (`timerEndAt`, `pausedRemainingSeconds`); same race as draft pick sync. |

---

## Fixes Applied

### 1. Draft events route — variable shadowing

- **File:** `app/api/leagues/[leagueId]/draft/events/route.ts`
- **Issue:** Response payload was built in a variable named `session`, shadowing the auth `session` from `getServerSession()`.
- **Change:** Renamed the payload variable to `sessionPayload` and return `{ ..., session: sessionPayload }` so auth `session` is not shadowed and the code is clearer.

### 2. Draft poll race condition (stale overwrites)

- **File:** `components/app/draft-room/DraftRoomPageClient.tsx`
- **Issue:** After a pick or commissioner action, client set `session` from the response. A later poll could return an older snapshot and overwrite that newer state.
- **Change:** When applying `data.session` from `fetchDraftEvents`, update state only if the incoming session is **newer** than the current one:
  - Prefer **version** (numeric): if both exist and incoming `version` is less than current, keep current.
  - Else compare **updatedAt**: if both exist and incoming is older, keep current.
  - Otherwise apply the incoming session.

### 3. Chat missed updates

- **File:** `components/app/draft-room/DraftRoomPageClient.tsx`
- **Issue:** Chat was loaded on mount and after some actions but **not** in the polling loop, so new messages could be missed until the user triggered a refetch.
- **Change:** Added `fetchChat()` to the same poll that runs `fetchDraftEvents`, `fetchQueue`, and `fetchDraftSettings`, so chat stays in sync with draft updates.

### 4. Visibility refetch and single poll runner

- **File:** `components/app/draft-room/DraftRoomPageClient.tsx`
- **Change:**  
  - Refactored polling to use a single `refetchOnceRef` that runs: draft events, queue, settings, **chat**, and optionally AI ADP.  
  - When the tab becomes **visible** again (`visibilitychange` → not hidden), the same refetch runs **once** in addition to the interval, so draft and chat catch up immediately after returning to the tab.

### 5. Bracket SSE reconnect

- **File:** `lib/hooks/useBracketLive.ts`
- **Issue:** On SSE `error`, the hook set "Connection lost, reconnecting…" but never closed or reopened the `EventSource`, so there was no real reconnect.
- **Change:** On error: close the current `EventSource`, clear the ref, then after a delay (`reconnectDelayMs`, 2s) open a new `EventSource` with the same URL and listeners. Reconnect is capped at **5** attempts (`maxReconnectRetries`). Cleanup clears any pending timeout and closes the stream.

---

## Summary of Real-Time Stability Improvements

- **Race conditions:** Draft session is only updated from poll when the response is newer (version/updatedAt); late polls no longer overwrite newer state.
- **Duplicate events:** Draft continues to replace session with a single server snapshot per response; no client-side event merging, so no duplicate-pick logic added.
- **Missed updates:** Chat is included in the draft poll and in the visibility refetch, so new messages appear without requiring a user action.
- **Reconnect:** Bracket SSE now actually reconnects on error (with backoff and max retries).
- **API clarity:** Draft events route no longer shadows the auth `session` variable.

---

## Files Touched

- `app/api/leagues/[leagueId]/draft/events/route.ts` — payload variable rename
- `components/app/draft-room/DraftRoomPageClient.tsx` — stale-session guard, chat in poll, visibility refetch, single refetch ref
- `lib/hooks/useBracketLive.ts` — SSE reconnect with delay and max retries
- `docs/PROMPT313_REALTIME_SYSTEM_HARDENING.md` — this deliverable
