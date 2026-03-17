# PROMPT 189 — AllFantasy Slow Draft Engine (Deliverable)

## Overview

Slow drafts support **long timers**, **async participation**, **overnight pause windows**, commissioner pause/resume, **queue/autopick**, and **reconnect-safe state**. Mechanics are deterministic first; AI is optional (advisory only). Supported sports: NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Timer Rules

| Rule | Implementation |
|------|----------------|
| **Long pick timers** | `timerSeconds` on session can be any value (e.g. 3600 = 1h, 86400 = 24h). Display uses `formatTimerRemaining()`: "Xh Ym" when ≥ 1h, "M:SS" when < 1h. |
| **Server-authoritative** | `timerEndAt` (UTC) when running; client computes remaining from server time. Polling keeps state fresh. |
| **Overnight pause window** | When `timerMode === 'overnight_pause'` and `slowDraftPauseWindow` is set (start, end, timezone), `computeTimerStateWithPauseWindow()` returns status `'paused'` and remainingSeconds `null` while current local time (in that TZ) is inside the window. Timer does not count down during the window. |
| **Commissioner pause/resume** | Existing controls: pause stores `pausedRemainingSeconds`; resume restarts timer from that value. |
| **Reconnect-safe** | GET session returns full snapshot including timer, currentPick, picks; client polls (POLL_MS). No stale on-the-clock state when reconnecting. |

---

## Automation vs AI Notes

| Feature | Deterministic / Rules-based | AI Optional |
|--------|-----------------------------|-------------|
| Long timers | ✅ `timerSeconds` + display | — |
| Async participation | ✅ Queue, autopick-expired, reconnect | — |
| Pause overnight | ✅ `slowDraftPauseWindow` + `computeTimerStateWithPauseWindow` | — |
| Commissioner pause/resume | ✅ Existing | — |
| Queue / autopick | ✅ DraftQueue, POST autopick-expired, client "Use queue" | — |
| Reconnect-safe state | ✅ Snapshot + poll | — |
| Pick ownership (traded picks) | ✅ Existing PickOwnershipResolver | — |
| Player cards (images/stats/logos) | ✅ Draft asset pipeline (PROMPT 187/195) | — |
| "Best pick right now" | — | ✅ Existing draft/recommend or helper panel |
| Away-mode queue reorder | — | ✅ AI queue reorder (existing) |
| Overnight roster strategy note | — | ✅ Could be added to helper/recap |
| Pick recap | — | ✅ Existing draft/recap |

**Notifications:** Not implemented. No UI that promises notifications (e.g. "You will be notified when it's your pick") so there are no dead expectations. If notification infrastructure is added later, it can be wired without changing slow-draft mechanics.

---

## Routes / Services

### Backend

| Path | Label | Description |
|------|--------|-------------|
| `lib/draft-defaults/DraftUISettingsResolver.ts` | [UPDATED] | `SlowDraftPauseWindow`, `slowDraftPauseWindow` in settings; get/update |
| `lib/live-draft-engine/DraftTimerService.ts` | [UPDATED] | `isInsidePauseWindow`, `computeTimerStateWithPauseWindow`, `formatTimerRemaining` |
| `lib/live-draft-engine/types.ts` | [UPDATED] | `DraftSessionSnapshot.isSlowDraft` |
| `lib/live-draft-engine/DraftSessionService.ts` | [UPDATED] | buildSessionSnapshot: load UI settings, apply pause window to timer, set `isSlowDraft` |
| `app/api/leagues/[leagueId]/draft/autopick-expired/route.ts` | [NEW] | POST: submit first available from user's queue when timer expired and user on clock |
| `app/api/leagues/[leagueId]/draft/settings/route.ts` | [UPDATED] | PATCH accepts `slowDraftPauseWindow` |

### Frontend

| Path | Label | Description |
|------|--------|-------------|
| `components/app/draft-room/DraftTopBar.tsx` | [UPDATED] | `formatTimerRemaining` for display; "Use queue" button when timer expired + on clock + queue has items |
| `components/app/draft-room/DraftRoomPageClient.tsx` | [UPDATED] | `handleAutopickExpired`, `autopickExpiredLoading`, pass `showUseQueue` / `onUseQueue` to top bar |
| `components/app/settings/DraftSettingsPanel.tsx` | [UPDATED] | When timer mode = overnight_pause, show pause window inputs (start, end, timezone) |

---

## UI Changes

- **Timer display:** Long timers show "Xh Ym" (e.g. "23h 45m"); under 1h shows "M:SS". Paused with no remaining shows "Paused".
- **Use queue:** When timer status is expired, current user is on clock, and queue has at least one available player, a "Use queue" button appears in the top bar; it calls POST autopick-expired.
- **Slow draft settings:** Commissioner can set overnight pause window (start, end, timezone) when Timer mode = "Overnight pause".
- **No notification UI:** No "Enable notifications" or "You will be notified" so no dead expectations.

---

## Mandatory Click Audit (QA Checklist)

- [ ] **Timer behavior over long windows** — Set timer to 1h+; start draft; verify display shows "Xh Ym" and countdown decreases; leave and reconnect, verify remaining is correct (server-authoritative).
- [ ] **Pause windows work** — Set overnight pause (e.g. 22:00–08:00, America/New_York); during that local window, timer shows "Paused" and does not count down.
- [ ] **Submit pick works** — Make a pick manually; verify it appears on board and next manager is on clock.
- [ ] **Queue/autopick works** — Add players to queue; when on clock (or when timer expired), click "Use queue" and verify first available is submitted; or enable "Auto-pick from queue" and let client auto-submit when on clock.
- [ ] **Notifications do not create dead UI** — Confirm there is no "Turn on notifications" or "You will be notified" that does nothing.
- [ ] **No stale on-the-clock state** — Reconnect after another manager picks; verify current pick and timer reflect server state (poll returns fresh snapshot).

---

## File Manifest (Summary)

**New:** `app/api/leagues/[leagueId]/draft/autopick-expired/route.ts`

**Updated:**  
`lib/draft-defaults/DraftUISettingsResolver.ts`,  
`lib/live-draft-engine/DraftTimerService.ts`, `lib/live-draft-engine/types.ts`, `lib/live-draft-engine/DraftSessionService.ts`,  
`app/api/leagues/[leagueId]/draft/settings/route.ts`,  
`components/app/draft-room/DraftTopBar.tsx`, `components/app/draft-room/DraftRoomPageClient.tsx`,  
`components/app/settings/DraftSettingsPanel.tsx`
