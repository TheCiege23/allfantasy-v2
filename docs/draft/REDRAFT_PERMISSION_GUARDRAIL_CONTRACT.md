# REDRAFT Permission and Guardrail Contract

## Scope

This contract defines permission and guardrail mechanics for live redraft drafting routes and draft-room control surfaces.

In-scope mechanics:

- Server-side authorization and action gates for draft session lifecycle, commissioner controls, pick submission, and queue mutation.
- Frontend visibility assumptions for commissioner-only controls and AI/War Room access hints.
- Queue ownership invariants.
- Existing AI/War Room entitlement boundaries where currently implemented.

Out of scope:

- UI redesign, visual presentation changes, or interaction rewrites.
- Player pool data/image pipeline changes.
- War Room recommendation algorithm changes.

## Data Model Block

Primary entities and ownership fields used by guardrails:

- `draft_session`

  Ownership anchor: `league_id`.

  Lifecycle anchor: `status` (`pre_draft`, `in_progress`, `paused`, `completed`).

- `roster`

  Ownership anchor: `platform_user_id` mapped to authenticated app user.

- `draft_pick`

  Permission context: `roster_id`, `overall`, `round`, `source`.

- `draft_queue`

  Ownership key: composite `session_id + user_id`.

  Queue write ownership is always derived from server session user id.

Index/uniqueness expectation:

- `draft_queue(session_id, user_id)` must remain unique; all updates are upserts by this key.

## API Block

### `POST /api/leagues/{leagueId}/draft/session`

Authorization:

- Requires authenticated user.
- Requires commissioner role (`assertCommissioner`).

Behavior:

- Non-commissioner `POST` requests are rejected with `403`.
- `action: ensure|create|start` remains commissioner-only.

### `POST /api/leagues/{leagueId}/draft/controls`

Authorization:

- Requires authenticated user.
- Requires elevated commissioner control gate (`assertLeagueActionGate(..., 'draft_commissioner_control')`).

Control-specific guards:

- `pause`, `resume`, `reset_timer` require `commissionerPauseControlsEnabled !== false`.
- `force_autopick` requires `commissionerForceAutoPickEnabled === true`.

Behavior:

- Non-commissioner attempts to `pause|resume|reset_timer|undo_pick|skip_pick|force_autopick` are rejected by server gate.
- Disabled commissioner controls return `400` with explicit disabled messaging.

### `POST /api/leagues/{leagueId}/draft/pick`

Authorization:

- Requires authenticated user.
- Requires draft access (`canAccessLeagueDraft`).
- Requires roster submission permission (`canSubmitPickForRoster`) and lifecycle action gate (`draft_pick`).

Roster guardrails:

- Non-commissioner can only submit for on-clock roster.
- Non-commissioner cannot submit for another roster id.
- Commissioner may submit with elevated source semantics when applicable.

### `PUT /api/leagues/{leagueId}/draft/queue`

Authorization:

- Requires authenticated user.
- Requires draft access (`canAccessLeagueDraft`).

Ownership semantics:

- Queue writes are always persisted under authenticated `userId` from session.
- Request body cannot override target queue owner.

Success shape:

- `{ ok: true, leagueId, queue, removedUnavailable }`.

## Realtime/Event Block

Permission mechanics do not add new realtime channels.

Current behavior:

- Control and pick actions may fan out through existing draft notification/intelligence publishers after authorization succeeds.
- Guardrail failures (`401/403/400`) are terminal for the request and do not emit success-side draft action events.

## Automation/Jobs Block

No new job owners introduced by this slice.

Interaction with existing automation:

- Commissioner controls and pick submission authorization execute before automation side-effects.
- Guardrail failure prevents downstream automation triggers for the rejected action.

## Server-Side Permission Rules

Order of enforcement expectation:

1. Authentication (`401` if no session user).
2. League access/role gate (`403` for non-members or insufficient role).
3. Action/lifecycle gate (`403` or lifecycle-specific gate status).
4. Action-specific settings gates (`400` for disabled commissioner toggles).
5. Domain validation (e.g., invalid roster for current pick).

Hard rule:

- Frontend control visibility is never sufficient authorization; backend must reject unauthorized actions independently.

## Frontend Visibility Rules

Current UI assumptions:

- Commissioner-only controls are exposed when draft-room prop `isCommissioner` is true.
- Non-commissioners may still attempt manual API calls; server remains source of truth and must deny.
- AI panel presents locked state copy when computed AI access is unavailable.

## Commissioner Controls Contract

Allowed control family remains:

- `start`, `pause`, `resume`, `reset_timer`, `undo_pick`, `force_autopick`, `complete`, `set_timer_seconds`, `skip_pick`, `resolve_auction`, `auction_tick`, `slow_tick`, `keeper_tick`, `reset_draft`.

Guardrail semantics:

- Commissioner role required for all control actions.
- Pause family toggles (`pause|resume|reset_timer`) obey `commissionerPauseControlsEnabled`.
- `force_autopick` obeys `commissionerForceAutoPickEnabled`.

## Member Controls Contract

Members may:

- View session and queue when `canAccessLeagueDraft` allows.
- Submit picks only when roster ownership/on-clock constraints and lifecycle gate allow.

Members may not:

- Start draft session or execute commissioner control actions.
- Submit picks for another roster id unless route explicitly elevates commissioner source (not applicable to non-commissioners).

## Queue Ownership Contract

Queue ownership is user-scoped.

Invariants:

- Upsert key is server-derived `sessionId_userId` using authenticated user id.
- Request payload cannot mutate another user's queue by passing alternate identifiers.
- Cross-user queue mutation requires an explicit new server endpoint with elevated commissioner authorization (none exists in this slice).

## Entitlement Block (AI/War Room Boundaries)

Current, testable boundaries in this slice:

- Draft-room AI panel computes access as subscription entitlement OR positive token balance.
- When computed access is false, locked-state messaging/CTAs are shown.
- War Room popup mount is currently not entitlement-gated in client render path.

Fallback behavior:

- AI panel lock state provides upgrade/token purchase pathways.
- Server-side route-level draft auth still applies independently of entitlement UI state.

## Non-Goals

This slice does not:

- Introduce new role types or permission tables.
- Change player ranking/recommendation logic.
- Alter draft board visuals or War Room presentation.
- Add cross-user queue override behavior.
