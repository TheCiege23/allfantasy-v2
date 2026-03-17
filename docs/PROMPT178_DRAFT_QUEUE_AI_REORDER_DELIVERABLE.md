# PROMPT 178 — Draft Queue and AI Queue Reorder System Deliverable

## Overview

Draft queue system with **personal queue**, **manual ordering**, **auto-pick support**, and **optional AI queue optimization**. Supports all seven sports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Queue Features

| Feature | Implementation |
|--------|-----------------|
| **Personal queue** | Per-user queue stored in `DraftQueue` (sessionId + userId). |
| **Add / remove player** | Add from player list; remove via X on queue row. Remove uses index in displayed (filtered) queue and updates full queue + persist. |
| **Drag/drop reorder** | QueuePanel list items are draggable; `onReorder(fromIndex, toIndex)` reorders filtered queue and persists. |
| **Auto-pick from queue** | When user is on clock and "Auto-pick from queue" or "Away mode" is on: first picks from queue (first available); if queue empty, falls back to first available by ADP (or AI ADP when enabled). |
| **Away mode** | Checkbox in QueuePanel; when on, same auto-pick behavior as above. |
| **Queue persistence** | GET/PUT `/api/leagues/[leagueId]/draft/queue`; queue refetched on poll and after prune. |
| **AI reorder** | POST `/api/leagues/[leagueId]/draft/queue/ai-reorder`; reorders by roster need; commissioner can enable/disable via draft settings (`aiQueueReorderEnabled`). |
| **Queue explanation** | AI reorder returns `explanation`; shown in QueuePanel below toggles. |
| **Auto-refresh when drafted** | Queue is filtered by `draftedNames`; when others draft a queued player, queue is pruned and persisted; queue is also refetched on each poll. |

---

## Autopick Rules

- **Queue has players:** Auto-pick uses the first **available** (not yet drafted) player in the queue.
- **Queue empty:** Fallback to first available player by ADP (or AI ADP when league has AI ADP enabled).
- **AI queue reorder:** When enabled in draft settings, "AI reorder" button is shown; user can click to reorder queue by roster need. User can disable AI reorder in draft settings at any time (toggle hides the button).

---

## Backend

### Routes

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| GET | `/api/leagues/[leagueId]/draft/queue` | canAccessLeagueDraft | Return current user's queue for the league's draft session. |
| PUT | `/api/leagues/[leagueId]/draft/queue` | canAccessLeagueDraft | Save queue (body: `{ queue: QueueEntry[] }`). Max 50 entries. |
| POST | `/api/leagues/[leagueId]/draft/queue/ai-reorder` | canAccessLeagueDraft | Reorder queue by roster need. Body: optional `{ queue }` (default load from DB). Returns `{ reordered, explanation }`. |

### Session enhancement

- **GET `/api/leagues/[leagueId]/draft/session`** now includes **`currentUserRosterId`** in the session object so the client can know "am I on the clock?" and drive auto-pick.

### Services

- **`lib/live-draft-engine/auth.ts`**: Added `getCurrentUserRosterIdForLeague(leagueId, userId)` for draft room and auto-pick.
- **`lib/draft-queue-engine/reorder-by-need.ts`**: `reorderQueueByNeed({ queue, rosterPositions, sport })` — reorders queue by position need (roster counts); returns `{ reordered, explanation }`. Sport-agnostic position weights.

---

## Frontend

### Draft room

- **Queue source:** Queue is refetched on initial load and on each poll (with session and settings).
- **Display:** Queue list shows only **available** players (filtered by `draftedNames`). When others draft a queued player, queue is pruned and the filtered list is persisted.
- **Remove:** Index is in the displayed (filtered) list; handler finds that entry in the full queue and removes it, then saves.
- **Reorder:** Drag/drop reorders the filtered list; the new order is saved as the user's queue (drafted players are dropped from saved queue when pruned).
- **AI reorder:** When `draftUISettings.aiQueueReorderEnabled`, "AI reorder" button is shown. On click, POST to ai-reorder with current (filtered) queue; on success, state is updated and queue is saved; `explanation` is shown in the panel.
- **Auto-pick:** When `currentUserRosterId === currentPick.rosterId` and (`autoPickFromQueue` or `awayMode`) and not `pickSubmitting`, after a short delay the client either picks `nextQueuedAvailable` or, if queue is empty, the first available player by ADP (or AI ADP). Prevents double-fire via ref.

### QueuePanel

- Props: `queue`, `canDraft`, `onRemove`, `onReorder`, `onDraftFromQueue`, `onAiReorder`, `aiReorderLoading`, `autoPickFromQueue`, `onAutoPickFromQueueChange`, `awayMode`, `onAwayModeChange`, `nextQueuedAvailable`, `aiReorderExplanation`.
- Shows AI reorder explanation when present.

---

## Mandatory Click Audit

- [ ] **Add to queue:** Add a player from the player list; they appear in the queue and persist after refresh.
- [ ] **Remove:** Remove a player from the queue; list updates and persists.
- [ ] **Reorder:** Drag an item to a new position; order updates and persists.
- [ ] **Queue saves correctly:** After add/remove/reorder, reload or re-open draft room and confirm queue matches.
- [ ] **Auto-pick uses queue:** With "Auto-pick from queue" on, when it’s your turn and the queue has an available player, that player is picked automatically.
- [ ] **AI reorder toggle:** With AI queue reorder enabled in draft settings, "AI reorder" appears; after reorder, explanation is shown; with it disabled, button is hidden.
- [ ] **Queue updates when players drafted:** When another manager drafts a player in your queue, that player disappears from your queue and the updated queue is persisted (and refetched on poll).
- [ ] **No dead queue actions:** Add, remove, reorder, AI reorder, and draft-from-queue all remain functional; no dead buttons or silent failures.

---

## Files Touched

- **Auth:** `lib/live-draft-engine/auth.ts` — `getCurrentUserRosterIdForLeague`.
- **Session:** `app/api/leagues/[leagueId]/draft/session/route.ts` — add `currentUserRosterId` to GET response.
- **Queue:** `app/api/leagues/[leagueId]/draft/queue/route.ts` — unchanged (already GET/PUT).
- **AI reorder:** `app/api/leagues/[leagueId]/draft/queue/ai-reorder/route.ts` — new.
- **Engine:** `lib/draft-queue-engine/reorder-by-need.ts`, `lib/draft-queue-engine/index.ts` — new.
- **Draft room:** `components/app/draft-room/DraftRoomPageClient.tsx` — queue filter, refetch on poll, prune and persist, currentUserRosterId, isCurrentUserOnClock, nextQueuedAvailable, handleAiReorderQueue, handleRemoveFromQueue/handleReorderQueue for filtered list, auto-pick effect (queue first, then ADP fallback), pass queueFiltered and explanation to QueuePanel.
- **Queue UI:** `components/app/draft-room/QueuePanel.tsx` — `aiReorderExplanation` prop and display.

---

## QA Checklist (concise)

1. Add to queue → persists and shows after refresh.
2. Remove from queue → updates and persists.
3. Drag reorder → order updates and persists.
4. Auto-pick from queue → when on clock and queue has available player, that player is auto-picked.
5. Queue empty + auto-pick → first available by ADP (or AI ADP) is picked.
6. AI reorder → button visible when enabled; reorder runs and explanation appears; queue saves.
7. AI reorder disabled in settings → button hidden.
8. Another manager drafts a player in your queue → player removed from queue and queue saved/refreshed.
9. No dead actions: all queue and draft-from-queue actions work.
