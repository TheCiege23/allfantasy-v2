-- T2: immutable per-proposal trade value snapshot (redraft_trade_value_snapshots).
--
-- SAFETY:
--  * Purely ADDITIVE — creates one new table + one unique index + one FK only. No existing table
--    gains/loses a column. Existing production data is untouched.
--  * IDEMPOTENT — IF NOT EXISTS + guarded FK; safe to re-run.
--  * The live Neon database has drifted from schema.prisma in unrelated ways, so a full
--    `prisma migrate dev` / `db push` would emit destructive DROPs. This file is hand-authored and
--    applied scoped via `prisma db execute`, then recorded with `prisma migrate resolve --applied`.
--    Do NOT regenerate via `migrate dev` against the production datasource.

CREATE TABLE IF NOT EXISTS "redraft_trade_value_snapshots" (
  "id" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "payload" JSONB NOT NULL,
  "grade" TEXT NOT NULL,
  "fairnessScore" INTEGER NOT NULL,
  "confidenceScore" INTEGER NOT NULL,
  "valueDifference" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redraft_trade_value_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_trade_value_snapshots_proposalId_key"
  ON "redraft_trade_value_snapshots" ("proposalId");

DO $$ BEGIN
  ALTER TABLE "redraft_trade_value_snapshots"
    ADD CONSTRAINT "redraft_trade_value_snapshots_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "redraft_trade_proposals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
