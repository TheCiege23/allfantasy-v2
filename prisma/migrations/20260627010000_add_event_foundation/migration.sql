-- G15.1 Event Foundation: domain_events (append-only normalized event log) +
-- event_outbox (transactional-outbox dispatch state).
--
-- SAFETY:
--  * Purely ADDITIVE — two new tables + indexes. No FK, no changes to existing
--    tables, no data touched. Existing functionality is unaffected.
--  * IDEMPOTENT — IF NOT EXISTS everywhere; safe to re-run / cross-env drift.
--  * The live Neon DB has drifted from schema.prisma in unrelated ways, so a full
--    `prisma migrate dev` would emit destructive DROPs. This file is hand-authored
--    and applied scoped via `prisma db execute`, then recorded with
--    `prisma migrate resolve --applied 20260627010000_add_event_foundation`.

CREATE TABLE IF NOT EXISTS "domain_events" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sport" TEXT,
  "leagueConcept" TEXT,
  "tenantId" TEXT NOT NULL DEFAULT 'allfantasy',
  "leagueId" TEXT,
  "seasonId" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'system',
  "actorId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'unknown',
  "correlationId" TEXT,
  "causationId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "period" JSONB,
  "subjects" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "domain_events_eventId_key" ON "domain_events" ("eventId");
CREATE UNIQUE INDEX IF NOT EXISTS "domain_events_idempotencyKey_key" ON "domain_events" ("idempotencyKey");
CREATE INDEX IF NOT EXISTS "domain_events_leagueId_occurredAt_idx" ON "domain_events" ("leagueId", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_seasonId_occurredAt_idx" ON "domain_events" ("seasonId", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_type_occurredAt_idx" ON "domain_events" ("type", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_tenantId_occurredAt_idx" ON "domain_events" ("tenantId", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_correlationId_idx" ON "domain_events" ("correlationId");

CREATE TABLE IF NOT EXISTS "event_outbox" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "dispatchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_outbox_eventId_key" ON "event_outbox" ("eventId");
CREATE INDEX IF NOT EXISTS "event_outbox_status_availableAt_idx" ON "event_outbox" ("status", "availableAt");
