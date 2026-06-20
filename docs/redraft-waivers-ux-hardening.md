# Redraft Waivers UX Hardening (Step 3B)

Builds on Step 3A (`docs/redraft-players-waivers-deep-build.md`). NFL + NCAAF redraft only; no
other league type touched. No provider syncs, no production writes, no env changes, no fabricated
stats/ADP/projections/media. The waiver processing engine, FAAB/priority, transaction logging,
history feed, claim routes, and available-player API already existed and were **reused, not
rebuilt**.

## What existed before 3B

- Waiver processing engine + FAAB/priority resolution, scheduled processing, commissioner
  override, idempotency (`lib/waiver-wire/process-engine.ts`, `scheduled-waiver-process.ts`).
- Claim create/edit/cancel routes; commissioner-scoped pending visibility; history feed
  (`getProcessedClaimsAndTransactions` → `waiverClaim` + `waiverTransaction`).
- `assertWaiverClaimEligibility`, `getEffectiveLeagueWaiverSettings` (`normalizedWaiverType`,
  `instantFaAfterClear`), `createClaim`, pure roster helpers (`roster-utils`).
- `PendingClaimsList` already supports editing drop target + FAAB + **priority (reorder)** and
  cancelling a pending claim.
- Watchlist stored in `localStorage`.

## What 3B added

### 1. Free-agent immediate add/drop
- `lib/waiver-wire/free-agent-service.ts` — `executeImmediateAddDrop`: a **single-roster**
  add/drop that reuses `assertWaiverClaimEligibility` + pure roster helpers and writes the same
  `waiverTransaction` row the processor writes. It does **not** invoke the league-wide processor,
  so other teams' pending claims are never touched or exposed.
- `app/api/waiver-wire/leagues/[leagueId]/add-drop/route.ts` — POST. Auth + league/roster gates,
  then: immediate add allowed only for FCFS or `instantFaAfterClear` leagues; otherwise returns
  `WAIVER_REQUIRED` so the client routes to the claim drawer. Returns the resulting transaction +
  updated roster ids.
- `lib/waiver-wire/addDropErrors.ts` — structured, drop-aware error codes:
  `PLAYER_UNAVAILABLE`, `PLAYER_ALREADY_ROSTERED`, `ROSTER_FULL`, `DROP_REQUIRED`, `INVALID_DROP`,
  `PLAYER_LOCKED`, `WAIVER_REQUIRED`, `LEAGUE_NOT_ACTIVE`, `UNAUTHORIZED`, `VALIDATION_FAILED`
  (a roster-limit message is `DROP_REQUIRED` with no drop, `ROSTER_FULL` with one).
- UI (`WaiverPlayerRow`, `WaiverWirePage`): an **Add** CTA for immediate-eligible leagues
  (open spot → direct add; full roster → drawer collects the drop). Action-scoped per-row loading,
  optimistic roster update with rollback on failure, `WAIVER_REQUIRED` falls back to the claim
  drawer, friendly structured-error toasts.

### 2. Transaction feed proof
- After a successful add/drop (or claim mutation), `refreshAfterMutation` refetches the history
  feed, which already includes the new `waiverTransaction` (added/dropped/team/timestamp). Other
  teams' pending claims remain hidden — the claims GET route scopes pending to the caller's roster
  (or commissioner). Covered by `__tests__/waiver-claims-route-scope.test.ts`.

### 3. Claim management UX
- Create / edit (drop + FAAB) / cancel / **reorder via priority** are wired through the existing
  `PendingClaimsList` + claim routes; mutations now use the targeted refresh. Server error
  messages are surfaced to the user; 3A's structured claim codes remain available on the routes.

### 4. Watchlist
- Audited: currently `localStorage` only. A server-backed watchlist needs a new table + additive
  migration, which is out of scope for a UX-hardening slice — **kept on `localStorage` and
  deferred to Step 3C** (documented, not faked). Watchlisted players still surface and receive a
  ranking boost; the watchlist never affects ownership or claims.

### 5. Performance
- Replaced the full-shell `load()` after every mutation with `refreshAfterMutation` (claims +
  history + roster only — no 200-row player-pool refetch, no global loading spinner). Search/
  filter/sort stay local + debounced (3A). Draft-room player-pool latency is unaffected (no
  draft-room code touched).

### 6. NCAAF
- All new copy is sport-neutral ("Add" / "Claim"); the add-drop route is sport-agnostic
  (`league.sport`). Limited-data labels from 3A still apply; missing CFBD projections/stats are
  labeled, never invented.

## Tests added
- `__tests__/redraft/add-drop-errors.test.ts` — structured error mapping (drop-aware) + statuses.
- `__tests__/redraft/waiver-add-drop-ux.test.tsx` — Add vs Claim CTA, action-loading disable,
  already-claimed Pending, NCAAF-neutral render.

## Out of scope (unchanged)
AF ADP history engine, CFBD provider sync/parity, provider media/headshot/logo backfill, deep
War Room waiver intelligence, deep Chimmy waiver intelligence, waiver-engine rewrite, and all
non-redraft league types.

## Manual smoke checklist
- NFL FCFS or instant-FA league → Players/Waivers shows **Add** on free agents; adding with an
  open spot rosters the player without a full page reload and a transaction appears in History.
- Full roster → **Add** opens the drawer to pick a drop; confirming completes the add/drop.
- FAAB/priority league → CTA is **Claim**; submitting queues a claim; an immediate add attempt
  returns `WAIVER_REQUIRED` and opens the claim drawer.
- Edit a pending claim's drop/FAAB/priority and cancel it; the queue updates without a shell reload.
- Trigger errors (duplicate, locked player, full roster with no drop) and confirm friendly copy.
- NCAAF league → same flows, limited-data labels where projections/stats are missing, no NFL-only
  copy.
- Other teams' pending claims are never visible.

## Safety
No production writes, no provider syncs, no env changes, no exposure of hidden pending claims, no
fabricated data, and AI is not required for any base waiver/add-drop function.
