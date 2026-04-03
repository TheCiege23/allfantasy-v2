-- Fix TokenLedger idempotencyKey unique index for Prisma @unique alignment.
-- Legacy: 20260366000000_add_token_system_architecture created a PARTIAL unique index:
--   CREATE UNIQUE INDEX ... ON token_ledger(idempotencyKey) WHERE idempotencyKey IS NOT NULL
-- Prisma db push / migrate expects a standard unique index on the column (same name).
-- Drop the old index first so CREATE UNIQUE INDEX does not conflict on name or definition.

DROP INDEX IF EXISTS "token_ledger_idempotencyKey_key";

CREATE UNIQUE INDEX "token_ledger_idempotencyKey_key" ON "token_ledger"("idempotencyKey");
