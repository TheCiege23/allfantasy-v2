-- Step 3C: server-backed waiver watchlist (waiver_watchlists).
--
-- SAFETY:
--  * Purely ADDITIVE — creates one new table + two indexes only. No existing table
--    gains/loses a column; no foreign keys. Existing production data is untouched.
--  * IDEMPOTENT — every statement is IF NOT EXISTS; safe to re-run.
--  * The live Neon database has drifted from schema.prisma in unrelated ways, so a full
--    `prisma migrate dev` / `db push` would emit destructive DROPs. This file is hand-authored
--    and applied scoped via `prisma db execute`, then recorded with `prisma migrate resolve
--    --applied`. Do NOT regenerate via `migrate dev` against the production datasource.

CREATE TABLE IF NOT EXISTS "waiver_watchlists" (
  "id" TEXT NOT NULL,
  "leagueId" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "playerId" VARCHAR(64) NOT NULL,
  "sport" VARCHAR(16),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "waiver_watchlists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "waiver_watchlists_leagueId_userId_playerId_key"
  ON "waiver_watchlists" ("leagueId", "userId", "playerId");

CREATE INDEX IF NOT EXISTS "waiver_watchlists_leagueId_userId_idx"
  ON "waiver_watchlists" ("leagueId", "userId");
