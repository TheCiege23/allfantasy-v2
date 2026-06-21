-- T3: append-only normalized trade-market event ledger (redraft_trade_market_events).
--
-- SAFETY:
--  * Purely ADDITIVE — one new table + unique key + three indexes. No existing table changes; no FK.
--    Existing production data is untouched.
--  * IDEMPOTENT — IF NOT EXISTS everywhere; safe to re-run.
--  * The live Neon database has drifted from schema.prisma in unrelated ways, so a full
--    `prisma migrate dev` / `db push` would emit destructive DROPs. This file is hand-authored and
--    applied scoped via `prisma db execute`, then recorded with `prisma migrate resolve --applied`.

CREATE TABLE IF NOT EXISTS "redraft_trade_market_events" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "tradeProposalId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "statusAtEvent" TEXT,
  "sport" TEXT,
  "grade" TEXT,
  "fairnessScore" INTEGER,
  "confidenceScore" INTEGER,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redraft_trade_market_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_trade_market_events_idempotencyKey_key"
  ON "redraft_trade_market_events" ("idempotencyKey");

CREATE INDEX IF NOT EXISTS "redraft_trade_market_events_leagueId_createdAt_idx"
  ON "redraft_trade_market_events" ("leagueId", "createdAt");

CREATE INDEX IF NOT EXISTS "redraft_trade_market_events_tradeProposalId_idx"
  ON "redraft_trade_market_events" ("tradeProposalId");

CREATE INDEX IF NOT EXISTS "redraft_trade_market_events_eventType_idx"
  ON "redraft_trade_market_events" ("eventType");
