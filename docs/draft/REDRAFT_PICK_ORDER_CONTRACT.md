# REDRAFT PICK ORDER CONTRACT

## Scope

Phase 4 Slice 1 hardens draft pick order truth for live redraft drafts.

In-scope behavior:

- Snake order is deterministic by overall index.
- Third-round reversal (3RR) is deterministic by overall index.
- Linear order is deterministic by overall index.
- Current on-the-clock pointer is derived from picks, not UI state.
- Overall-to-round/pick/slot mapping is stable.
- Pause/resume and timer reset do not mutate order.
- Skip and undo preserve order integrity.

Out-of-scope behavior for this slice:

- Timer and auto-pick strategy tuning.
- Queue optimization and AI recommendation logic.
- UX enhancements unrelated to order semantics.

## Data Model Contract

Entities/tables:

- `draft_session`
- `draft_pick`
- `draft_settings` (or equivalent league draft config storage)

Required fields consumed by order engine:

- Session: `draftType`, `rounds`, `teamCount`, `thirdRoundReversal`, `status`, `timerSeconds`, `timerEndAt`, `pausedRemainingSeconds`, `version`.
- Picks: `overall`, `round`, `slot`, `rosterId`, `position`, `playerName`, `createdAt`.
- Slot order: deterministic `slot` -> `rosterId` mapping.

Index and integrity expectations:

- Unique `(sessionId, overall)` across `draft_pick`.
- Session pick reads ordered by ascending `overall`.
- `overall` must be positive integer and contiguous under normal commit path.

Relationship expectations:

- `draft_session` owns `draft_pick` rows.
- Session completion is reached when next open pick cannot be resolved within `rounds * teamCount`.

## Backend Logic Contract

Canonical order function:

- `getSlotInRoundForOverall({ overall, teamCount, draftType, thirdRoundReversal })` is the single source of truth for slot direction and reversal behavior.

Current pointer function:

- `resolveCurrentOnTheClock({ totalPicks, picks, teamCount, draftType, thirdRoundReversal, slotOrder })` resolves next open overall and owner.

Session snapshot contract:

- Snapshot builders must derive `currentPick` from persisted picks and order settings.
- Snapshot must not trust stale client pointer state.

Control action invariants:

- `pause` and `resume` may update timer/status only.
- `reset_timer` may update timer only.
- `skip_pick` commits a pick entry and advances pointer to next overall.
- `undo_pick` removes only the latest committed pick and re-resolves pointer.

## API Contract

### Session Read

Endpoint:

- `GET /api/leagues/:leagueId/draft/session`

Success shape (minimum required fields):

- `session.currentPick.overall`
- `session.currentPick.round`
- `session.currentPick.slot`
- `session.currentPick.rosterId`
- `session.currentPick.pickLabel`
- `session.picks[]` sorted by `overall`

Failure handling:

- `401` unauthenticated
- `403` league access denied
- `404` session not found

### Pick Submit

Endpoint:

- `POST /api/leagues/:leagueId/draft/pick`

Validation:

- Reject pick when roster is off-clock unless commissioner override policy allows.
- Reject duplicate drafted players except explicit skip marker semantics.
- Reject when session state disallows drafting.

Success:

- Persisted pick includes canonical `overall`, `round`, `slot`, `pickLabel`.
- Subsequent session snapshot returns next current pick.

Failure handling:

- `400` validation failure / state mismatch
- `409` roster configuration incomplete (when applicable)

### Controls

Endpoint:

- `POST /api/leagues/:leagueId/draft/controls`

Supported actions in this contract:

- `pause`, `resume`, `reset_timer`, `skip_pick`, `undo_pick`

Validation:

- Commissioner or authorized actor required.
- Action must apply to active session state.

Success:

- Response includes updated session snapshot with pointer integrity maintained.

## UI State Contract

Draft room pointer display requirements:

- On-clock team, round/pick label, and progress must derive from session snapshot.
- UI must treat `currentPick = null` as completed or not-started depending on `status`.
- Pause/resume visual state changes must not alter displayed order when picks are unchanged.

Mobile-first UX states:

- Loading: show skeleton for on-clock panel and picks list.
- Partial failure: retain last known pointer with stale indicator and retry affordance.
- Stale data: show non-blocking stale badge and refresh control.

## Realtime Contract

Events:

- `draft.pick.created`
- `draft.pick.undone`
- `draft.session.updated`

Payload minimum:

- `leagueId`, `sessionId`, `version`
- `currentPick` snapshot payload
- Action metadata (`source`, `action`)

Emit conditions:

- Emit after successful pick commit, skip, undo, pause/resume, timer reset.

Dedupe/idempotency:

- Clients apply updates only when `version` is newer than local snapshot.

## Automation and Job Ownership Contract

Owner:

- Live draft engine service layer owns pointer resolution and snapshot publication.

Cadence:

- Event-driven on pick/control mutations.
- Poll fallback permitted for clients.

Retry/backoff:

- Realtime publish failures retry with bounded attempts and jitter.

Recovery path:

- Canonical fallback is a fresh session snapshot rebuild from persisted picks.

## Entitlement Contract

AI entitlements:

- Not required for pick order correctness in this slice.
- If AI helpers are unavailable, order behavior remains identical.

## Acceptance Checklist

- Snake order proven across multiple rounds.
- 3RR proven through at least round 5.
- Linear order proven across multiple rounds.
- Current pointer proven for empty, in-progress, and complete states.
- Overall mapping proven for representative indices (including 13 and 25 in 12-team formats).
- Pause/resume and timer reset proven not to mutate pointer.
- Skip and undo proven to preserve order integrity.
