-- G15.3b Relay hardening: add claim ownership columns to event_outbox so multiple
-- relay workers can atomically claim disjoint batches (FOR UPDATE SKIP LOCKED + CAS)
-- and so crashed workers' claims can be recovered after a timeout.
--
-- SAFETY:
--  * Additive nullable columns + one index. ADD COLUMN of a nullable column with no
--    default is a metadata-only change in Postgres (no table rewrite, no lock storm).
--  * IDEMPOTENT — IF NOT EXISTS everywhere.
--  * Apply with the Neon DIRECT (non-pooled) host, then
--    `prisma migrate resolve --applied 20260627030000_add_outbox_claim`.

ALTER TABLE "event_outbox" ADD COLUMN IF NOT EXISTS "claimedBy" TEXT;
ALTER TABLE "event_outbox" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);

-- Supports stale-claim recovery scans: WHERE status='claimed' AND "claimedAt" < threshold.
CREATE INDEX IF NOT EXISTS "event_outbox_status_claimedAt_idx" ON "event_outbox" ("status", "claimedAt");
