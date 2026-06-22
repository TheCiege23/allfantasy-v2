-- T8: native trade block + interest (redraft_trade_block_items, redraft_trade_interests).
--
-- SAFETY:
--  * Purely ADDITIVE — two new tables + indexes only. No existing table changes; no FK.
--    Existing production data is untouched.
--  * IDEMPOTENT — IF NOT EXISTS everywhere; safe to re-run.
--  * Live Neon has drifted from schema.prisma in unrelated ways, so a full `prisma migrate dev` /
--    `db push` would emit destructive DROPs. Hand-authored + applied via `prisma db execute`, then
--    recorded with `prisma migrate resolve --applied`.

CREATE TABLE IF NOT EXISTS "redraft_trade_block_items" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "position" TEXT,
  "team" TEXT,
  "askingForPositions" JSONB NOT NULL DEFAULT '[]',
  "wantsFaab" BOOLEAN NOT NULL DEFAULT false,
  "wantsDraftPicks" BOOLEAN NOT NULL DEFAULT false,
  "packagePreference" TEXT,
  "note" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'league',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "redraft_trade_block_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "redraft_trade_block_items_leagueId_rosterId_playerId_key"
  ON "redraft_trade_block_items" ("leagueId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "redraft_trade_block_items_leagueId_status_idx" ON "redraft_trade_block_items" ("leagueId", "status");
CREATE INDEX IF NOT EXISTS "redraft_trade_block_items_rosterId_status_idx" ON "redraft_trade_block_items" ("rosterId", "status");
CREATE INDEX IF NOT EXISTS "redraft_trade_block_items_playerId_status_idx" ON "redraft_trade_block_items" ("playerId", "status");

CREATE TABLE IF NOT EXISTS "redraft_trade_interests" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "fromRosterId" TEXT NOT NULL,
  "targetRosterId" TEXT,
  "playerId" TEXT,
  "playerName" TEXT,
  "position" TEXT,
  "interestType" TEXT NOT NULL,
  "note" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'private',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redraft_trade_interests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "redraft_trade_interests_leagueId_status_idx" ON "redraft_trade_interests" ("leagueId", "status");
CREATE INDEX IF NOT EXISTS "redraft_trade_interests_fromRosterId_status_idx" ON "redraft_trade_interests" ("fromRosterId", "status");
CREATE INDEX IF NOT EXISTS "redraft_trade_interests_playerId_status_idx" ON "redraft_trade_interests" ("playerId", "status");
