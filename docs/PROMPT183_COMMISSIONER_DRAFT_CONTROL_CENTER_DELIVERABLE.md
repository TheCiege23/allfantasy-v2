# PROMPT 183 — Commissioner Draft Control Center Deliverable

Commissioner control center for live drafts: backend control routes, control panel UI, permission model, and QA checklist.

---

## Supported sports

NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (aligned with `lib/sport-scope.ts`).

---

## Controls summary

| Control | Route / API | Notes |
|--------|-------------|--------|
| **Start draft** | `POST /api/leagues/[leagueId]/draft/session` (`action: 'start'`) | Commissioner only; pre_draft → in_progress |
| **Pause draft** | `POST .../draft/controls` `action: 'pause'` | Commissioner only |
| **Resume draft** | `POST .../draft/controls` `action: 'resume'` | Commissioner only |
| **Force auto-pick** | `POST .../draft/controls` `action: 'force_autopick'` + `playerName`, `position` | Commissioner only; optional `team`, `byeWeek`, `rosterId` |
| **Skip pick** | `POST .../draft/controls` `action: 'skip_pick'` | Commissioner only; submits "(Skipped)" / SKIP (league rules may allow) |
| **Edit timer** | `POST .../draft/controls` `action: 'set_timer_seconds'` + `seconds` (0–300), optional `resetCurrentTimer` | Commissioner only |
| **Reset timer** | `POST .../draft/controls` `action: 'reset_timer'` | Commissioner only |
| **Undo last pick** | `POST .../draft/controls` `action: 'undo_pick'` | Commissioner only |
| **Complete draft** | `POST .../draft/controls` `action: 'complete'` | Commissioner only; finalizes rosters |
| **Orphan team AI manager** | `PATCH .../draft/settings` `orphanTeamAiManagerEnabled` | Commissioner only |
| **Traded pick color mode** | `PATCH .../draft/settings` `tradedPickColorModeEnabled` | Commissioner only |
| **AI ADP** | `PATCH .../draft/settings` `aiAdpEnabled` | Commissioner only |
| **Live draft ↔ league chat sync** | `PATCH .../draft/settings` `liveDraftChatSyncEnabled` | Commissioner only |
| **Commissioner broadcast** | Opens broadcast modal (existing flow) | Commissioner only (modal entry) |
| **Draft settings modal** | Commissioner Control Center modal | All toggles + flow actions in one modal |
| **Emergency resync/reload** | Client-side: refetch session, draft settings, queue, pending trades | No API; refreshes local state |

---

## Backend

### Control route

- **File:** `app/api/leagues/[leagueId]/draft/controls/route.ts`
- **Method:** POST
- **Auth:** Session required; **commissioner only** via `assertCommissioner(leagueId, userId)` (403 if not commissioner).
- **Body:** `{ action: string, ...payload }`
- **Allowed actions:** `pause`, `resume`, `reset_timer`, `undo_pick`, `force_autopick`, `complete`, `set_timer_seconds`, `skip_pick`
- **Payload:**
  - `set_timer_seconds`: `seconds` (0–300), optional `resetCurrentTimer` (default true)
  - `force_autopick`: `playerName`, `position`; optional `team`, `byeWeek`, `rosterId`
- **Response:** `{ ok, action?, session? }` — successful control actions return updated `session` snapshot so the client can update UI.

### Session / start

- **File:** `app/api/leagues/[leagueId]/draft/session/route.ts`
- **Start draft:** POST with `action: 'start'`; commissioner only.

### Draft settings

- **File:** `app/api/leagues/[leagueId]/draft/settings/route.ts`
- **PATCH:** Partial `DraftUISettings`; commissioner only. Used for orphan AI, traded pick color, AI ADP, live draft chat sync.

### Services

- **DraftSessionService:** `pauseDraftSession`, `resumeDraftSession`, `resetTimer`, `setTimerSeconds`, `undoLastPick`, `completeDraftSession`, `buildSessionSnapshot`
- **PickSubmissionService:** `submitPick` (source `'commissioner'` for skip_pick and force_autopick)
- **PickValidation:** Allows `position === 'SKIP'` for skip pick (no duplicate-player check)

---

## Frontend — Control panel UI

### Commissioner Control Center modal

- **File:** `components/app/draft-room/CommissionerControlCenterModal.tsx`
- **When shown:** Commissioner clicks the Commissioner control in the draft top bar; only rendered when `showCommissionerModal && isCommissioner`.
- **Sections:**
  1. **Draft flow** — Start draft (pre_draft), Pause, Resume, Reset timer, Undo last pick, Skip pick, Complete draft (contextual by status).
  2. **Edit timer** — Number input 0–300 seconds + “Set timer” (calls `set_timer_seconds` with `resetCurrentTimer: true`).
  3. **Draft settings** — Toggles: Orphan team AI manager, Traded pick color mode, AI ADP, Live draft ↔ league chat sync (each PATCHes draft settings).
  4. **Tools** — “Broadcast to leagues” (opens broadcast modal), “Resync / Reload” (refetches session, settings, queue, pending trades).
- **Wiring:** `DraftRoomPageClient` passes `onAction` (accepts `(action, payload)` and POSTs to controls), `onSettingsPatch` (PATCH settings), `onStartDraft`, `onBroadcast`, `onResync`, and loading state.

### Commissioner button

- **DraftTopBar:** `onCommissionerOpen` is set only when `isCommissioner`; clicking opens the Commissioner Control Center modal.

### Force auto-pick

- **Modal:** No dedicated “Force auto-pick” button in modal (would require picking a player). Force auto-pick is supported by the controls API; commissioners can use it from the board or a future “first available by ADP” action.

---

## Permission notes

- **All commissioner actions are permission-gated:** Controls route, session start, and draft settings PATCH all call `assertCommissioner(leagueId, userId)`. Non-commissioners receive 403.
- **UI:** Commissioner button and Commissioner Control Center modal are only shown when `isCommissioner` is true (from page props, which are derived from server-side league membership/role).
- **No dead controls:** Every control in the modal is wired to the above APIs or to client-side resync; state changes persist (session in DB, settings in DB) and the client updates from the returned session or refetched settings.

---

## QA checklist (mandatory click audit)

- [ ] **Permission-gating:** As a non-commissioner, no Commissioner button is visible; direct POST to `/api/leagues/[leagueId]/draft/controls` returns 403.
- [ ] **Permission-gating:** As commissioner, Commissioner button is visible and opens the control center modal.
- [ ] **State persistence:** After pause, resume, set timer, skip pick, or undo, session state in DB matches UI; after changing any draft setting toggle, PATCH response or refetch shows updated settings.
- [ ] **Affected UIs update:** After any control action that returns `session`, draft room board and timer update without full page reload; after settings patch, toggles and dependent UI (e.g. traded pick colors, AI ADP) reflect new values.
- [ ] **No dead controls:** Each of Start draft, Pause, Resume, Reset timer, Undo last pick, Skip pick, Complete draft, Set timer, and each settings toggle performs the expected API call and updates UI or shows error.
- [ ] **Mobile commissioner flow:** On a narrow viewport, open draft room as commissioner, open Commissioner control center, execute at least one flow action (e.g. pause/resume) and one settings toggle; confirm layout and actions work.
- [ ] **Desktop commissioner flow:** Same on desktop viewport; confirm modal and all sections are usable.
- [ ] **Resync / Reload:** “Resync / Reload” refetches session, draft settings, queue, and pending trades count; board and sidebar reflect current data.
- [ ] **Broadcast:** “Broadcast to leagues” closes the control center and opens the broadcast modal (existing flow).
- [ ] **Skip pick:** Skip pick creates a “(Skipped)” pick and advances the draft; no duplicate-player validation on SKIP.
- [ ] **Edit timer:** Set timer 0–300 seconds; timer value and (if in progress/paused) current countdown reflect the new value when `resetCurrentTimer` is true.

---

## File reference

| Area | Path |
|------|------|
| Controls API | `app/api/leagues/[leagueId]/draft/controls/route.ts` |
| Session (start) | `app/api/leagues/[leagueId]/draft/session/route.ts` |
| Draft settings | `app/api/leagues/[leagueId]/draft/settings/route.ts` |
| DraftSessionService | `lib/live-draft-engine/DraftSessionService.ts` |
| PickSubmissionService / PickValidation | `lib/live-draft-engine/` |
| Commissioner modal | `components/app/draft-room/CommissionerControlCenterModal.tsx` |
| Draft room client (wiring) | `components/app/draft-room/DraftRoomPageClient.tsx` |
| Draft top bar (commissioner button) | `components/app/draft-room/DraftTopBar.tsx` |
| Draft room exports | `components/app/draft-room/index.ts` |
