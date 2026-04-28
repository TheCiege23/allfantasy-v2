# REDRAFT TIMER QUEUE AUTOPICK CONTRACT

## Scope

Phase 4 Slice 2 hardens timer, queue, and auto-pick mechanics for live redraft drafts.

In-scope behavior:

- Timer status and remaining seconds are derived server-side from canonical session fields.
- Queue ownership and queue persistence are user-scoped and roster-resolved.
- Expired-pick automation applies queue-first auto-pick semantics with deterministic fallbacks.
- Commissioner force auto-pick follows explicit settings gates.
- Pause, resume, and reset timer actions update clock state without mutating pick order pointer.

Out-of-scope behavior for this slice:

- UI redesign and presentation changes.
- Player data ingestion, enrichment, or image/headshot pipeline changes.
- War Room or AI recommendation presentation changes.
- Unrelated draft features outside timer, queue, and auto-pick mechanics.

## Timer Truth Rules

Canonical timer source fields:

- `draft_session.status`
- `draft_session.timerSeconds`
- `draft_session.timerEndAt`
- `draft_session.pausedRemainingSeconds`
- `draft_session.overnightFrozenPickSeconds` (when overnight pause is active)

Rules:

- `pre_draft` and `completed` resolve to no active live timer state.
- `in_progress` resolves to `running` or `expired` based on `timerEndAt` relative to server time.
- `paused` resolves from `pausedRemainingSeconds` (or equivalent frozen value in overnight mode).
- Remaining seconds must not be negative.

## Queue Ownership Rules

Queue ownership and storage:

- Queue rows are keyed by league + user identity and consumed by the on-clock roster's resolved user.
- Orphan/non-user rosters cannot consume user queues.
- Queue order is persisted as an ordered array of normalized entries.

Queue sanitization:

- Empty names or positions are removed.
- Duplicates are deduped by normalized player name + position.
- Already drafted players are ignored during queue auto-pick.
- Position-ineligible entries are skipped by eligible-position filtering.

## Autopick Eligibility Rules

Base eligibility:

- Session must exist and be `in_progress`.
- Draft type must be supported (`snake` and `linear` only for expired-pick processor).
- Timer must be expired under canonical timer computation.
- `autoPickEnabled` must be true in draft UI settings.
- `cpuAutoPick` must not be explicitly disabled for session automation.

Selection order:

- First attempt: queue-first, top-most legal and undrafted entry.
- If queue-first fails:
  - `autopick_behavior = skip`: commit skip pick.
  - otherwise: best-available/need-based fallback candidate path.

Safety:

- Auto-pick must not submit already drafted players.
- Concurrency guard must re-check session version and timer freshness before fallback submission.

## Pause Resume Reset Rules

Pause:

- Moves session to paused state and preserves remaining seconds.

Resume:

- Recomputes `timerEndAt` from preserved remaining seconds using server time.

Reset timer:

- Re-anchors timer from configured duration for the active pick context.

Pointer invariants:

- `pause`, `resume`, and `reset_timer` do not commit picks.
- `currentPick` pointer remains unchanged when pick list is unchanged.

## Force Autopick Rules

Control gate:

- Commissioner action required.
- `commissionerForceAutoPickEnabled` must be true.

Selection:

- Requested player can be used only if valid and available.
- Otherwise force auto-pick falls back to queue-first candidate then best available.
- Submitted pick must still pass standard pick validation and roster ownership checks.

## Non-goals

- No UI/UX redesign.
- No player data source or image pipeline changes.
- No War Room/AI presentation changes.
- No modifications to unrelated draft routes, features, or tests.
