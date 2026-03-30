-- PROMPT 251 PR-4 (D2): Stripe webhook idempotency ledger.
-- Safe/idempotent migration for environments that may already have partial objects.

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" VARCHAR(128) NOT NULL,
    "purchaseType" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stripe_webhook_events_eventId_key"
ON "stripe_webhook_events"("eventId");

CREATE INDEX IF NOT EXISTS "stripe_webhook_events_type_idx"
ON "stripe_webhook_events"("type");

CREATE INDEX IF NOT EXISTS "stripe_webhook_events_status_idx"
ON "stripe_webhook_events"("status");

CREATE INDEX IF NOT EXISTS "stripe_webhook_events_processedAt_idx"
ON "stripe_webhook_events"("processedAt");
