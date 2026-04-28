# DraftState Contract (DB-First)

## Purpose
Define a canonical, read-only DraftState contract for live draft room state so all UI-backed routes answer the same state questions from one DB-backed source.

This package is non-invasive:
- No runtime behavior changes.
- No draft mechanics changes.
- No API response shape changes.
- No migrations.
- No new DraftState table yet.

## Current Problem
The current draft base has split state authority between:
- Canonical stack: `DraftSession` + `DraftPick` (plus service-derived snapshot fields).
- Legacy/parallel stack: `DraftRoomStateRow` + `DraftRoomPickRecord` (+ `DraftRoomUserQueue`, `MockDraftRoom`).

That allows multiple paths to answer the same state questions:
- Is draft live/paused/completed?
- Who is on the clock?
- What pick is current?
- How much time remains?
- Which picks are complete?
- Which board should render?

## Canonical Source Recommendation
Use these as canonical read sources for draft room state:
- `DraftSession`
- `DraftPick`
- `DraftPickAuditLog` (when history/audit evidence is needed)
- `DraftAutopickSetting` (when per-roster autopick policy is needed)
- `LeagueSettings` (when league timer/order settings are needed)

## Legacy/Deprecated Runtime Sources
These remain present during transition but should be treated as deprecated runtime state sources:
- `DraftRoomStateRow`
- `DraftRoomPickRecord`
- `DraftRoomUserQueue`
- `MockDraftRoom`

## Proposed Canonical DraftState Read Shape
The read contract to standardize across draft routes/services:

```ts
export type DraftState = {
  leagueId: string
  draftId: string
  status: 'scheduled' | 'live' | 'paused' | 'completed'

  currentPickNumber: number | null
  currentRound: number | null
  currentTeamId: string | null
  currentManagerId: string | null

  startedAt: string | null
  pausedAt: string | null
  resumedAt: string | null

  pickTimerSeconds: number | null
  currentPickStartedAt: string | null
  timerEndAt: string | null
  pausedRemainingSeconds: number | null

  draftType: 'snake' | 'linear' | 'auction'
  thirdRoundReversalEnabled: boolean
  timezone: string | null

  totalTeams: number
  totalRounds: number
  picksMade: number
  nextPick: {
    overall: number | null
    round: number | null
    slot: number | null
  }
}
```

Notes:
- `currentPickNumber` replaces ad-hoc/non-schema assumptions like `DraftSession.currentPick`.
- Fields may be derived by resolver logic from `DraftSession + DraftPick`; they do not require new columns in this phase.

## Timer Rules
Timer interpretation should be single-source and deterministic:
- `scheduled`: draft not started yet; timer not running.
- `live`: timer runs from `timerEndAt` or equivalent derived timer state.
- `paused`: timer is frozen; `pausedRemainingSeconds` is authoritative.
- `completed`: timer is terminal/inactive.
- Overnight freeze (if configured/supported):
  - Freeze remaining time while inside pause window.
  - Resume from preserved remaining seconds when outside pause window.

## Single-Board Invariant
- Draft room renders one board from canonical DraftState.
- Start/resume transitions update canonical state.
- Start/resume must not route users into a different state source/board.

## Migration Plan (Contract-First)
1. Build a read-only DraftState resolver from `DraftSession + DraftPick`.
2. Migrate routes/services to read from the resolver.
3. Optionally add a DraftState projection table if read performance/shape stability requires it.
4. Stop live writes to legacy draft room state tables.
5. Remove/deprecate legacy runtime dependence after parity tests.

## Safe Implementation Order
1. Freeze this DraftState contract and route matrix.
2. Implement `lib/draft/getCanonicalDraftState.ts` as read-only.
3. Switch draft read paths to resolver output (no response-shape changes).
4. Audit and remove active legacy writes only after parity checks.
5. Decide whether projection storage is needed.

## DB-First Boundary Reminder
- External APIs are ingestion/sync sources only.
- Draft room user-facing routes should render from DB-backed contract reads.

---

## Migration Status (as of 2026-04-27)

### Step 1 complete — canonical state exposed for parity/debug

`getCanonicalDraftState` runs on every `GET /api/leagues/[leagueId]/draft/session` request.  
`canonicalDraftState` and `canonicalDraftStateParity` are now included in the response unconditionally
(when the canonical check does not throw). These are **additive fields only** — all pre-existing
`session.*` fields are unchanged and still the authoritative source for rendering.

#### Render authority during this phase

| Concern | Authority |
|---|---|
| Draft status (live/paused/completed) | `session.status` (legacy `buildSessionSnapshot`) |
| On-clock pick / round | `session.currentPick` + `buildDraftRoomCoreState(session)` |
| Timer end timestamp | `session.timer.timerEndAt` → `DraftTopBar` |
| Board picks | `session.picks` |
| Team order / slotOrder | `session.slotOrder` |
| Canonical state | `canonicalDraftState` — stored in `canonicalDraftStateRef` only, **never drives renders** |

#### Client implementation

`DraftRoomPageClient.canonicalDraftStateRef` is a plain React ref (no state, no re-renders).
`fetchSession` updates the ref after each session poll and emits a dev-only console warning when
`status`, `currentPickNumber`, or `picksMade` diverge from legacy:

```
[draft-room/canonical-parity] client-visible drift { leagueId, parity, canonical }
```

#### Gate for next migration step

Before `session.status` is overridden with canonical status:

1. Run the app against a real draft and perform all of these without seeing drift warnings:
   - Load draft room (scheduled)
   - Start draft
   - Pause draft
   - Resume draft
   - Make a pick (including autopick and commissioner pick)
2. Zero drift in all scenarios → proceed to controlled override of `status` in `mergeDraftSessionSnapshot`.
3. Any drift → investigate parity mismatch root cause first.

