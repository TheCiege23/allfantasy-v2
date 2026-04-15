-- Legacy tournament waitlist + staff (co-commissioner permissions)
CREATE TABLE IF NOT EXISTS "legacy_tournament_waitlist_entries" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_tournament_waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "legacy_tournament_waitlist_entries_tournamentId_userId_key"
  ON "legacy_tournament_waitlist_entries"("tournamentId", "userId");

CREATE INDEX IF NOT EXISTS "legacy_tournament_waitlist_entries_tournamentId_createdAt_idx"
  ON "legacy_tournament_waitlist_entries"("tournamentId", "createdAt");

CREATE TABLE IF NOT EXISTS "legacy_tournament_staff" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_tournament_staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "legacy_tournament_staff_tournamentId_userId_key"
  ON "legacy_tournament_staff"("tournamentId", "userId");

CREATE INDEX IF NOT EXISTS "legacy_tournament_staff_tournamentId_idx"
  ON "legacy_tournament_staff"("tournamentId");

CREATE INDEX IF NOT EXISTS "legacy_tournament_staff_userId_idx"
  ON "legacy_tournament_staff"("userId");

DO $$ BEGIN
  ALTER TABLE "legacy_tournament_waitlist_entries"
    ADD CONSTRAINT "legacy_tournament_waitlist_entries_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "legacy_tournament_waitlist_entries"
    ADD CONSTRAINT "legacy_tournament_waitlist_entries_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "legacy_tournament_staff"
    ADD CONSTRAINT "legacy_tournament_staff_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "legacy_tournament_staff"
    ADD CONSTRAINT "legacy_tournament_staff_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
