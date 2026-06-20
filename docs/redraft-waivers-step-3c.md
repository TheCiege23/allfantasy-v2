# Redraft Waivers Step 3C — Server-backed Watchlist + Claim/Transaction Polish

Builds on Step 3B (`docs/redraft-waivers-ux-hardening.md`, `docs/redraft-waiver-walkthrough.md`).
NFL + NCAAF redraft only. Scope (confirmed): server-backed watchlists + UI, claim reorder/edit
polish, transaction-feed proof/polish, tests + Playwright + docs. **Explicitly excluded:** AF ADP,
War Room waiver recommendations, Chimmy waiver intelligence, provider syncs, new projection
systems, new player-data ingestion.

## 1. Server-backed watchlist

Replaces the previous `localStorage`-only watchlist with a persistent table.

- **Schema:** new `WaiverWatchlist` model (`prisma/schema.prisma`) — `id`, `leagueId`, `userId`,
  `playerId`, `sport?`, `createdAt`; unique `(leagueId, userId, playerId)`; index `(leagueId,
  userId)`. Standalone (no FK relation) to stay purely additive against the drifted live DB.
- **Migration:** `prisma/migrations/20260620000000_add_waiver_watchlists/migration.sql` — purely
  additive + idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`, no FK, no column changes). Applied
  scoped to Neon via `prisma db execute`, recorded with `prisma migrate resolve --applied`
  (NOT `migrate dev`/`db push`, which would emit destructive DROPs against the drifted DB).
- **Service:** `lib/waiver-wire/watchlist-service.ts` — `getWatchlistPlayerIds`, `addToWatchlist`
  (idempotent upsert), `removeFromWatchlist`, `mergeWatchlist` (one-time localStorage migration).
- **API:** `app/api/waiver-wire/leagues/[leagueId]/watchlist/route.ts` — `GET` (own list),
  `POST` (add one, or migrate a `playerIds[]` batch), `DELETE` (remove one). Scoped to the
  authenticated user; league membership (owner or rostered) required.
- **UI:** `WaiverWirePage` now loads the watchlist from the server, performs a one-time migration
  of any legacy `localStorage` entries (then clears them), and toggles optimistically against the
  API (reverting + toasting on failure). Falls back to `localStorage` only if the API is
  unreachable. The watchlist never affects ownership, claims, or eligibility — it only marks and
  boosts tracked players in the list.

## 2. Claim reorder + edit polish

`PendingClaimsList` gains explicit up/down reorder controls
(`waiver-claim-move-up-<id>` / `waiver-claim-move-down-<id>`) alongside the existing inline edit
(drop / FAAB / priority) and cancel. Reorder swaps the claim's `priorityOrder` with its neighbor
via the existing PATCH route (`reorderClaim` in `WaiverWirePage`, optimistic with revert). No
waiver-engine changes.

## 3. Transaction-feed proof/polish

The processed-claims/transactions feed (`WaiverResultsFeed`, shown in the History tab) already
renders added/dropped/FAAB/timestamp; 3C wraps it with a stable `waiver-history-transactions`
testid so the proof is assertable, and continues to surface immediate free-agent add/drops written
by the Step 3B `add-drop` route.

## Tests
- Unit: `__tests__/redraft/waiver-watchlist-service.test.ts` (add/get/remove/merge, prisma mocked).
- Playwright (`e2e/redraft-waiver-walkthrough.spec.ts`, `@db`): adds **6. Watchlist** (server add/
  list/remove persists) and **7. Claim reorder** (priority swap persists) to the existing 3B flow
  suite; the best-effort UI CTA capture remains.

## Commands
```bash
# apply the migration to a fresh/CI database (idempotent)
npx prisma db execute --file prisma/migrations/20260620000000_add_waiver_watchlists/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260620000000_add_waiver_watchlists   # record in _prisma_migrations

# seed + walkthrough (dev/test only)
node --import tsx scripts/seed-redraft-waiver-walkthrough.ts
PLAYWRIGHT_PORT=3103 NEXTAUTH_URL=http://127.0.0.1:3103 \
CLEARSPORTS_API_KEY= CLEARSPORTS_API_BASE= CLEAR_SPORTS_API_KEY= CLEAR_SPORTS_API_BASE= \
npx playwright test e2e/redraft-waiver-walkthrough.spec.ts --project=chromium --workers=1
```

## Migration / Neon SQL status
One additive migration (`20260620000000_add_waiver_watchlists`) — applied to the live Neon DB via
scoped `prisma db execute` and recorded as applied. No destructive changes; no existing table
altered; re-runnable.

## Safety
No provider syncs, no env changes, no production data mutated beyond the additive `waiver_watchlists`
table, no hidden-claim exposure, AI not required for any base waiver/watchlist function.
