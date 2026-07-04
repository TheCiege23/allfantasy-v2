-- Phase 3.3 Historical Intelligence: intelligence_league_snapshot_history —
-- an INSERT-only rolling ledger enabling real trend comparison, distinct from
-- intelligence_league_snapshot (a single upserted current-state row per league).
--
-- SAFETY:
--  * Purely ADDITIVE — one new table + indexes. No FK, no changes to any
--    existing table, no data touched.
--  * IDEMPOTENT — IF NOT EXISTS everywhere.
--  * DISPOSABLE: rebuildable from domain_events; business behavior must not
--    depend on it existing.
--  * Apply with the Neon DIRECT (non-pooled) host:
--      prisma db execute --schema prisma/schema.prisma --file <this file>
--    then `prisma migrate resolve --applied 20260703140000_add_intelligence_league_history`.

CREATE TABLE IF NOT EXISTS "intelligence_league_snapshot_history" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'allfantasy',
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leagueEngagementScore" INTEGER NOT NULL,
  "leagueEngagementTier" TEXT NOT NULL,
  "tradeActivityRate" DOUBLE PRECISION NOT NULL,
  "waiverActivityRate" DOUBLE PRECISION NOT NULL,
  "draftActivityRate" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "intelligence_league_snapshot_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "intelligence_league_snapshot_history_leagueId_capturedAt_idx" ON "intelligence_league_snapshot_history" ("leagueId", "capturedAt");
CREATE INDEX IF NOT EXISTS "intelligence_league_snapshot_history_tenantId_capturedAt_idx" ON "intelligence_league_snapshot_history" ("tenantId", "capturedAt");
