-- Duplicate-manager fraud hardening: two new additive tables.
-- identity_signals: append-only hashed IP/device/user-agent fingerprints
--   captured at signup/login/league-join, used to compare managers within a
--   league without ever storing raw IP/UA (see lib/identity/IdentityFingerprint.ts).
-- household_exceptions: commissioner-approved "these are different real people
--   sharing a household" pairs that suppress duplicate-manager escalation for
--   a specific pair (optionally scoped to one league).
--
-- SAFETY:
--  * Purely ADDITIVE — two new tables + indexes + FKs to app_users. No changes
--    to any existing table.
--  * IDEMPOTENT — IF NOT EXISTS everywhere.
--  * Apply with the Neon DIRECT (non-pooled) host:
--      prisma db execute --schema prisma/schema.prisma --file <this file>
--    then `prisma migrate resolve --applied 20260705000000_add_identity_signals_household_exceptions`.

CREATE TABLE IF NOT EXISTS "identity_signals" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "deviceId" TEXT,
  "context" TEXT NOT NULL,
  "contextId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "identity_signals_userId_idx" ON "identity_signals" ("userId");
CREATE INDEX IF NOT EXISTS "identity_signals_ipHash_idx" ON "identity_signals" ("ipHash");
CREATE INDEX IF NOT EXISTS "identity_signals_userAgentHash_idx" ON "identity_signals" ("userAgentHash");
CREATE INDEX IF NOT EXISTS "identity_signals_deviceId_idx" ON "identity_signals" ("deviceId");
CREATE INDEX IF NOT EXISTS "identity_signals_contextId_idx" ON "identity_signals" ("contextId");

DO $$ BEGIN
  ALTER TABLE "identity_signals"
    ADD CONSTRAINT "identity_signals_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "household_exceptions" (
  "id" TEXT NOT NULL,
  "appUserIdA" TEXT NOT NULL,
  "appUserIdB" TEXT NOT NULL,
  "leagueId" TEXT,
  "reason" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "household_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "household_exceptions_appUserIdA_appUserIdB_leagueId_key" ON "household_exceptions" ("appUserIdA", "appUserIdB", "leagueId");
CREATE INDEX IF NOT EXISTS "household_exceptions_appUserIdA_idx" ON "household_exceptions" ("appUserIdA");
CREATE INDEX IF NOT EXISTS "household_exceptions_appUserIdB_idx" ON "household_exceptions" ("appUserIdB");
CREATE INDEX IF NOT EXISTS "household_exceptions_leagueId_idx" ON "household_exceptions" ("leagueId");

DO $$ BEGIN
  ALTER TABLE "household_exceptions"
    ADD CONSTRAINT "household_exceptions_appUserIdA_fkey"
    FOREIGN KEY ("appUserIdA") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "household_exceptions"
    ADD CONSTRAINT "household_exceptions_appUserIdB_fkey"
    FOREIGN KEY ("appUserIdB") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
