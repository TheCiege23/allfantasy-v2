# PROMPT 278 — Performance Optimization Deliverable

## Objective

Make the app fast: API calls, DB queries, caching, lazy loading, and **draft room performance (critical)**.

---

## 1. Draft room (critical)

### Events-based polling

- **Before:** Every 8s the client called `GET /api/leagues/[leagueId]/draft/session`, which ran `buildSessionSnapshot` (full session + picks + UI settings + orphan resolution) every time.
- **After:** Poll uses `GET /api/leagues/[leagueId]/draft/events?since=<lastUpdatedAt>`. The server first does a **lightweight** query: `DraftSession.findUnique({ where: { leagueId }, select: { updatedAt: true } })`. Only when `updatedAt > since` does it run `buildSessionSnapshot` and return the full session. When nothing changed, the response is small and no heavy work is done.
- **Files:** `components/app/draft-room/DraftRoomPageClient.tsx` (new `fetchDraftEvents(since)`, poll uses it); `app/api/leagues/[leagueId]/draft/events/route.ts` (enriched response with `currentUserRosterId`, `orphanRosterIds`, `aiManagerEnabled`, `orphanDrafterMode` so client can use it like GET session).

### Fewer initial requests

- **Before:** Draft room used `useLeagueSectionData(leagueId, 'draft')` (proxied to `/api/mock-draft/adp`) **and** `fetchDraftPool()` (GET draft/pool). Both could provide player list; the client preferred the normalized pool.
- **After:** Draft room uses **only** `fetchDraftPool()` for the player list. `useLeagueSectionData` for the draft section is no longer used in the draft room, so one fewer API call on load.
- **File:** `DraftRoomPageClient.tsx` — removed `useLeagueSectionData`, use `draftPool` only; `poolLoading` derived from `loading && draftPool === null`.

### Cache-Control on draft APIs

- **GET draft/pool:** Already had `Cache-Control: private, max-age=60, stale-while-revalidate=120` so clients/CDN can reuse responses briefly.
- **GET draft/settings:** Added `Cache-Control: private, max-age=30, stale-while-revalidate=60` so repeated polls don’t always hit the server.
- **Files:** `app/api/leagues/[leagueId]/draft/pool/route.ts` (unchanged), `app/api/leagues/[leagueId]/draft/settings/route.ts` (header set on GET response).

### Component memoization

- **PlayerPanel** and **DraftBoard** are wrapped in `React.memo` so parent re-renders (e.g. from poll or state updates) don’t re-render these heavy trees when their props are referentially unchanged.
- **Files:** `components/app/draft-room/PlayerPanel.tsx`, `components/app/draft-room/DraftBoard.tsx`.

### Visibility-based poll throttling

- When the draft room tab is **hidden** (Page Visibility API), the poll interval is increased from 8s to 30s (`POLL_MS_BACKGROUND`). When the tab becomes visible again, polling returns to 8s. This reduces API and client work when the user is not viewing the draft.
- **File:** `DraftRoomPageClient.tsx` — `visibilitychange` listener and `pollInterval` state.

### Stale `updatedAt` from no-change response

- When the events endpoint returns `{ updated: false, updatedAt }` (no session change), the client now updates `session.updatedAt` to this value. The next poll then sends the correct `since`, so the server continues to do the lightweight check and avoids running `buildSessionSnapshot` until the draft actually changes.
- **File:** `DraftRoomPageClient.tsx` — `fetchDraftEvents` stores `data.updatedAt` when `data.updated === false`.

---

## 2. API / DB

- **Draft session GET:** Still `force-dynamic`; no server-side cache so data is always fresh. The main gain is the **events** endpoint reducing work on no-change polls.
- **Draft pool:** Uses existing in-memory/DB caching in `getLiveADP` (e.g. `adpCache`, `sportsDataCache`) where applicable; pool route adds HTTP Cache-Control for client/browser reuse.
- **DB:** `DraftPick` has `@@index([sessionId])`; session is loaded by `leagueId`. No schema changes in this pass.

---

## 3. Caching

- **Client:** Draft room benefits from Cache-Control on pool and settings (browser can reuse responses within max-age/stale-while-revalidate).
- **Server:** No new server-side cache layer; events endpoint avoids redundant heavy work by checking `updatedAt` first.

---

## 4. Lazy loading

- **Draft room:** Heavy panels (PlayerPanel, DraftBoard) are memoized to avoid unnecessary re-renders. Chat and helper panels are not lazy-loaded (they are always mounted in the shell); further lazy loading would require tab-based or visibility-based rendering in the shell.

---

## 5. Summary

| Area              | Change                                                                 |
|-------------------|------------------------------------------------------------------------|
| Draft room poll   | Use `draft/events?since=` for lightweight check; full session only when updated. |
| Draft room poll   | Visibility-based interval: 8s when tab visible, 30s when hidden.       |
| Draft room poll   | Client stores `updatedAt` from no-change response so next `since` is correct. |
| Draft room load   | Single source for player list (draft pool only); removed duplicate draft section fetch. |
| Draft APIs        | Cache-Control on pool (60s) and settings (30s) GET responses.         |
| Draft components  | `React.memo` on PlayerPanel and DraftBoard.                           |

These changes reduce server work during idle polling, reduce client work and network calls on draft room load and refresh, and lower load when the draft tab is in the background.
