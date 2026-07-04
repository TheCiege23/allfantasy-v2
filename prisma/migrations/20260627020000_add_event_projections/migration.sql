-- G15.3 Event Projections: event_audit_feed (first read model) +
-- intelligence_projection_checkpoint (per-projection cursor for rebuild/operations).
--
-- SAFETY:
--  * Purely ADDITIVE — two new tables + indexes. No FK, no changes to existing tables,
--    no data touched. The audit feed is a DISPOSABLE read model (rebuildable from
--    domain_events); business behavior does not depend on it.
--  * IDEMPOTENT — IF NOT EXISTS everywhere.
--  * Apply with the Neon DIRECT (non-pooled) host:
--      prisma db execute --schema prisma/schema.prisma --file <this file>
--    then `prisma migrate resolve --applied 20260627020000_add_event_projections`.

CREATE TABLE IF NOT EXISTS "event_audit_feed" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'allfantasy',
  "leagueId" TEXT,
  "seasonId" TEXT,
  "type" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "sport" TEXT,
  "leagueConcept" TEXT,
  "actorType" TEXT,
  "actorId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_audit_feed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_audit_feed_eventId_key" ON "event_audit_feed" ("eventId");
CREATE INDEX IF NOT EXISTS "event_audit_feed_leagueId_occurredAt_idx" ON "event_audit_feed" ("leagueId", "occurredAt");
CREATE INDEX IF NOT EXISTS "event_audit_feed_tenantId_occurredAt_idx" ON "event_audit_feed" ("tenantId", "occurredAt");
CREATE INDEX IF NOT EXISTS "event_audit_feed_type_idx" ON "event_audit_feed" ("type");

CREATE TABLE IF NOT EXISTS "intelligence_projection_checkpoint" (
  "id" TEXT NOT NULL,
  "projection" TEXT NOT NULL,
  "lastEventId" TEXT,
  "lastOccurredAt" TIMESTAMP(3),
  "eventsProcessed" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intelligence_projection_checkpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "intelligence_projection_checkpoint_projection_key" ON "intelligence_projection_checkpoint" ("projection");
