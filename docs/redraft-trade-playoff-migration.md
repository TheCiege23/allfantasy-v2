# Redraft Trade + Playoff Route Migration

## Decision
We will keep both route families active temporarily, but treat legacy trade routes as compatibility-only.

## Route Status
- Legacy compatibility route:
  - `GET|POST|PATCH /api/redraft/trades`
  - Backed by `redraft_league_trades`.
  - Returns `meta.legacy=true` and replacement endpoint hints.
- New normalized routes:
  - `GET|POST /api/redraft/trade-proposals`
  - `POST /api/redraft/trade-votes`
  - `POST /api/redraft/playoffs/generate`
  - Backed by normalized proposal/vote/decision + playoff seed/round/matchup tables.

## Coexistence Policy (Current)
1. New UI and service-layer callers must use normalized routes.
2. Legacy route remains compatibility-only; active UI callers have been cut over to normalized routes.
3. No direct third-party data APIs are introduced in these routes; reads and writes stay DB-first.

## Current Status
- UI cutover complete: no active UI calls to `/api/redraft/trades` remain.
- Legacy endpoint is retained for compatibility/integrity workflows only.

## Migration Plan
1. Phase 1: Coexist (now)
- New redraft tab features call normalized routes.
- Legacy route emits migration metadata.

2. Phase 2: Parity hardening
- Mirror any missing side effects from legacy (`capEngine`, collusion queue) into normalized accept flow.
- Add backfill/bridge job for active legacy pending trades if needed.

3. Phase 3: Cutover
- Update all internal callers to normalized routes.
- Mark `/api/redraft/trades` as deprecated in release notes.

4. Phase 4: Removal
- Remove legacy route and old table dependencies after one full release cycle with no legacy traffic.

## Verification Checklist
- Proposal creation/listing works via normalized endpoints.
- Vote/decision resolution works (accept/reject/veto/cancel/expiry).
- Bracket generation persists seeds, rounds, matchups, and progression links.
- Legacy route still responds with compatibility data and migration metadata.
