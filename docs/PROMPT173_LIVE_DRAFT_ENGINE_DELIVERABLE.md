# PROMPT 173 — Live Draft Engine Backend Deliverable

**Date:** 2025-03-14  
**Scope:** Production-ready live draft backend: session, picks, timer, order, validation, commissioner controls, queue, events, traded-pick ownership, roster assignment.

---

## Schema / migration changes

- **New models (Prisma):**
  - **DraftSession** — one per league; `leagueId` (unique), `status` (pre_draft | in_progress | paused | completed), `draftType`, `rounds`, `teamCount`, `thirdRoundReversal`, `timerSeconds`, `timerEndAt`, `pausedRemainingSeconds`, `slotOrder` (JSON), `version`.
  - **DraftPick** — per pick; `sessionId`, `overall`, `round`, `slot`, `rosterId`, `displayName`, `playerName`, `position`, `team`, `byeWeek`, `playerId`, `tradedPickMeta` (JSON), `source`.
  - **DraftQueue** — per user per session; `sessionId`, `userId`, `order` (JSON array of queue entries).
- **League** — added relation `draftSessions DraftSession[]`.
- **Migration:** `prisma/migrations/20260345000000_add_live_draft_engine/migration.sql`.

---

## Route list

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/leagues/[leagueId]/draft/session` | Full session snapshot (reconnect/resync). Auth: canAccessLeagueDraft. |
| POST | `/api/leagues/[leagueId]/draft/session` | Create or start session. Auth: commissioner. Body: `{ action: 'ensure' | 'create' | 'start' }`. |
| POST | `/api/leagues/[leagueId]/draft/pick` | Submit pick. Auth: canAccessLeagueDraft; submit permission for roster. Body: `playerName`, `position`, optional `team`, `byeWeek`, `playerId`, `rosterId`, `tradedPicks`. |
| GET | `/api/leagues/[leagueId]/draft/queue` | Current user's queue. Auth: canAccessLeagueDraft. |
| PUT | `/api/leagues/[leagueId]/draft/queue` | Save queue. Auth: canAccessLeagueDraft. Body: `{ queue: QueueEntry[] }`. |
| POST | `/api/leagues/[leagueId]/draft/controls` | Commissioner: pause, resume, reset_timer, undo_pick, force_autopick, complete. Auth: commissioner. |
| GET | `/api/leagues/[leagueId]/draft/events` | Poll for updates. Query: `?since=ISO timestamp`. Returns `{ updated, updatedAt, session }` when changed. Auth: canAccessLeagueDraft. |
| GET | `/api/commissioner/leagues/[leagueId]/draft` | [UPDATED] Sleeper draft state (read-only) or commissioner view. |
| POST | `/api/commissioner/leagues/[leagueId]/draft` | [UPDATED] Commissioner controls; delegates to live-draft engine when session exists (pause, resume, reset_timer, undo_pick, assign_pick). |

---

## Realtime event list

No WebSocket in this implementation. Realtime behavior:

- **Polling:** Client polls `GET /api/leagues/[leagueId]/draft/session` or `GET .../draft/events?since=<updatedAt>`.
- **After submit:** Response includes full `session` snapshot; client can replace local state.
- **Event semantics (logical):** Implemented as session state changes; no separate event table. Client can infer:
  - `session_created` — session created (POST session action=ensure/create).
  - `session_started` — status → in_progress (POST session action=start).
  - `session_paused` / `session_resumed` — controls.
  - `pick_submitted` — new pick in `session.picks`; `session.currentPick` advances.
  - `pick_undone` — last pick removed.
  - `timer_reset` — controls reset_timer.
  - `session_completed` — controls complete.

---

## Backend QA checklist

- [ ] **No duplicate picks:** PickValidation uses `validateUniquePlayer`; SubmitPick runs in a transaction and re-checks pick count before insert.
- [ ] **No race on simultaneous submit:** Pick submission uses `prisma.$transaction` and compares `locked.picks.length === picksCount` before creating the next pick.
- [ ] **Reconnect restores state:** GET session returns full snapshot (picks, currentPick, timer, slotOrder); client can replace state.
- [ ] **Commissioner actions permission-checked:** All controls route and commissioner draft POST use `assertCommissioner(leagueId, userId)`.
- [ ] **Timer state reliable:** DraftTimerService computes from `timerEndAt` (UTC) when status=in_progress; when paused, `pausedRemainingSeconds` is stored and returned.
- [ ] **Pick ownership reflects trades:** PickOwnershipResolver resolves owner per (round, slot) from `tradedPicks`; `tradedPickMeta` (newOwnerName, showNewOwnerInRed, tintColor) set only when trade exists; otherwise no override.
- [ ] **No dead draft routes:** All listed routes are implemented and wired; commissioner POST delegates to live-draft engine when session exists.

---

## File manifest ([NEW] / [UPDATED])

| Label | Relative path |
|-------|----------------|
| [UPDATED] | prisma/schema.prisma |
| [NEW] | prisma/migrations/20260345000000_add_live_draft_engine/migration.sql |
| [NEW] | lib/live-draft-engine/types.ts |
| [NEW] | lib/live-draft-engine/DraftOrderService.ts |
| [NEW] | lib/live-draft-engine/DraftTimerService.ts |
| [NEW] | lib/live-draft-engine/CurrentOnTheClockResolver.ts |
| [NEW] | lib/live-draft-engine/PickValidation.ts |
| [NEW] | lib/live-draft-engine/PickOwnershipResolver.ts |
| [NEW] | lib/live-draft-engine/DraftSessionService.ts |
| [NEW] | lib/live-draft-engine/PickSubmissionService.ts |
| [NEW] | lib/live-draft-engine/RosterAssignmentService.ts |
| [NEW] | lib/live-draft-engine/auth.ts |
| [NEW] | lib/live-draft-engine/index.ts |
| [NEW] | app/api/leagues/[leagueId]/draft/session/route.ts |
| [NEW] | app/api/leagues/[leagueId]/draft/pick/route.ts |
| [NEW] | app/api/leagues/[leagueId]/draft/queue/route.ts |
| [NEW] | app/api/leagues/[leagueId]/draft/controls/route.ts |
| [NEW] | app/api/leagues/[leagueId]/draft/events/route.ts |
| [UPDATED] | app/api/commissioner/leagues/[leagueId]/draft/route.ts |
| [UPDATED] | lib/live-draft-engine/PickValidation.ts (removed unused import) |

---

*End of deliverable. All files are merged; run migration and QA as above.*
