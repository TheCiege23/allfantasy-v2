-- PROMPT 3: Devy lifecycle, rights, audit, commissioner overrides.

ALTER TABLE "devy_league_configs"
  ADD COLUMN IF NOT EXISTS "promotionTiming" VARCHAR(48) NOT NULL DEFAULT 'manager_choice_before_rookie_draft',
  ADD COLUMN IF NOT EXISTS "supplementalDevyFAEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rightsExpirationEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "devy_rights" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "rosterId" VARCHAR(64) NOT NULL,
    "devyPlayerId" VARCHAR(64) NOT NULL,
    "state" VARCHAR(32) NOT NULL,
    "seasonYear" INTEGER,
    "promotedProPlayerId" VARCHAR(64),
    "promotedAt" TIMESTAMP(3),
    "managerPromotedAt" TIMESTAMP(3),
    "returnedToSchoolAt" TIMESTAMP(3),
    "sourceConfidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_rights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devy_rights_leagueId_rosterId_devyPlayerId_key" ON "devy_rights"("leagueId", "rosterId", "devyPlayerId");
CREATE INDEX "devy_rights_leagueId_idx" ON "devy_rights"("leagueId");
CREATE INDEX "devy_rights_rosterId_idx" ON "devy_rights"("rosterId");
CREATE INDEX "devy_rights_devyPlayerId_idx" ON "devy_rights"("devyPlayerId");
CREATE INDEX "devy_rights_state_idx" ON "devy_rights"("state");
CREATE INDEX "devy_rights_leagueId_state_idx" ON "devy_rights"("leagueId", "state");

ALTER TABLE "devy_rights" ADD CONSTRAINT "devy_rights_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devy_rights" ADD CONSTRAINT "devy_rights_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_lifecycle_events" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(48) NOT NULL,
    "rosterId" VARCHAR(64),
    "devyPlayerId" VARCHAR(64),
    "proPlayerId" VARCHAR(64),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "devy_lifecycle_events_leagueId_idx" ON "devy_lifecycle_events"("leagueId");
CREATE INDEX "devy_lifecycle_events_leagueId_eventType_idx" ON "devy_lifecycle_events"("leagueId", "eventType");
CREATE INDEX "devy_lifecycle_events_createdAt_idx" ON "devy_lifecycle_events"("createdAt");

ALTER TABLE "devy_lifecycle_events" ADD CONSTRAINT "devy_lifecycle_events_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "devy_commissioner_overrides" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "devyPlayerId" VARCHAR(64) NOT NULL,
    "proPlayerId" VARCHAR(64),
    "action" VARCHAR(32) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(64),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devy_commissioner_overrides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "devy_commissioner_overrides_leagueId_idx" ON "devy_commissioner_overrides"("leagueId");
CREATE INDEX "devy_commissioner_overrides_status_idx" ON "devy_commissioner_overrides"("status");

ALTER TABLE "devy_commissioner_overrides" ADD CONSTRAINT "devy_commissioner_overrides_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
