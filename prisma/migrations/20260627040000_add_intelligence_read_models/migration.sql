-- G15.4 Intelligence read models: league + manager snapshots, plus a processed-event
-- ledger that makes INCREMENTAL projections idempotent under at-least-once delivery.
--
-- SAFETY:
--  * Purely ADDITIVE — three new tables + indexes. No FK, no changes to existing tables.
--  * IDEMPOTENT — IF NOT EXISTS everywhere.
--  * All read models are DISPOSABLE: rebuildable from domain_events. Business behavior
--    does not depend on them.
--  * Apply with the Neon DIRECT (non-pooled) host, then
--    `prisma migrate resolve --applied 20260627040000_add_intelligence_read_models`.

CREATE TABLE IF NOT EXISTS "intelligence_league_snapshot" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'allfantasy',
  "sport" TEXT,
  "leagueConcept" TEXT,
  "firstEventAt" TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3),
  "totalEvents" INTEGER NOT NULL DEFAULT 0,
  "tradeCount" INTEGER NOT NULL DEFAULT 0,
  "waiverCount" INTEGER NOT NULL DEFAULT 0,
  "lineupCount" INTEGER NOT NULL DEFAULT 0,
  "draftCount" INTEGER NOT NULL DEFAULT 0,
  "scoringCount" INTEGER NOT NULL DEFAULT 0,
  "governanceCount" INTEGER NOT NULL DEFAULT 0,
  "lifecycleCount" INTEGER NOT NULL DEFAULT 0,
  "otherCount" INTEGER NOT NULL DEFAULT 0,
  "openTradeProposals" INTEGER NOT NULL DEFAULT 0,
  "lastTradeAt" TIMESTAMP(3),
  "lastWaiverAt" TIMESTAMP(3),
  "lastLineupAt" TIMESTAMP(3),
  "lastDraftAt" TIMESTAMP(3),
  "lastScoringAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intelligence_league_snapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "intelligence_league_snapshot_leagueId_key" ON "intelligence_league_snapshot" ("leagueId");
CREATE INDEX IF NOT EXISTS "intelligence_league_snapshot_tenantId_lastActivityAt_idx" ON "intelligence_league_snapshot" ("tenantId", "lastActivityAt");

CREATE TABLE IF NOT EXISTS "intelligence_manager_snapshot" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "managerKey" TEXT NOT NULL,
  "lastActiveAt" TIMESTAMP(3),
  "totalActions" INTEGER NOT NULL DEFAULT 0,
  "tradeActions" INTEGER NOT NULL DEFAULT 0,
  "waiverActions" INTEGER NOT NULL DEFAULT 0,
  "lineupActions" INTEGER NOT NULL DEFAULT 0,
  "otherActions" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intelligence_manager_snapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "intelligence_manager_snapshot_leagueId_managerKey_key" ON "intelligence_manager_snapshot" ("leagueId", "managerKey");

-- Idempotency ledger: one row per (projection, eventId). INSERT ON CONFLICT DO NOTHING
-- before applying an increment makes re-delivered events no-ops.
CREATE TABLE IF NOT EXISTS "intelligence_processed_event" (
  "id" TEXT NOT NULL,
  "projection" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intelligence_processed_event_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "intelligence_processed_event_projection_eventId_key" ON "intelligence_processed_event" ("projection", "eventId");
