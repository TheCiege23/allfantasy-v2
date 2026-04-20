-- Waiver engine v2: claim provenance, run/result audit, league state, extended settings.

ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "faabResetType" VARCHAR(32);
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "waiverOrderResetPolicy" VARCHAR(48);
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "claimLimitPerWeek" INTEGER;
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "postGameWaiverBehavior" VARCHAR(48);
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "processingDays" JSONB;
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "freeAgentWindowRules" JSONB;
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "dropRestrictions" JSONB;
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "commissionerOverrideRules" JSONB;
ALTER TABLE "league_waiver_settings" ADD COLUMN IF NOT EXISTS "specialtyConceptOverrides" JSONB;

ALTER TABLE "waiver_claims" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "waiver_claims" ADD COLUMN IF NOT EXISTS "claimType" VARCHAR(24) NOT NULL DEFAULT 'add_drop';
ALTER TABLE "waiver_claims" ADD COLUMN IF NOT EXISTS "processingWindow" VARCHAR(64);
ALTER TABLE "waiver_claims" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE INDEX IF NOT EXISTS "waiver_claims_userId_idx" ON "waiver_claims"("userId");

ALTER TABLE "waiver_transactions" ADD COLUMN IF NOT EXISTS "waiverRunId" TEXT;
ALTER TABLE "waiver_transactions" ADD COLUMN IF NOT EXISTS "waiverPriorityAfter" INTEGER;

CREATE INDEX IF NOT EXISTS "waiver_transactions_waiverRunId_idx" ON "waiver_transactions"("waiverRunId");

CREATE TABLE IF NOT EXISTS "waiver_runs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "runType" VARCHAR(24) NOT NULL DEFAULT 'scheduled',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(24) NOT NULL DEFAULT 'completed',
    "processedByUserId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waiver_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "waiver_runs_leagueId_runAt_idx" ON "waiver_runs"("leagueId", "runAt");

CREATE TABLE IF NOT EXISTS "waiver_results" (
    "id" TEXT NOT NULL,
    "waiverRunId" TEXT NOT NULL,
    "claimId" TEXT,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "addPlayerId" TEXT NOT NULL,
    "dropPlayerId" TEXT,
    "faabDelta" INTEGER,
    "priorityBefore" INTEGER,
    "priorityAfter" INTEGER,
    "rosterApplied" BOOLEAN NOT NULL DEFAULT false,
    "resultType" VARCHAR(24) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waiver_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "waiver_results_leagueId_createdAt_idx" ON "waiver_results"("leagueId", "createdAt");
CREATE INDEX IF NOT EXISTS "waiver_results_waiverRunId_idx" ON "waiver_results"("waiverRunId");
CREATE INDEX IF NOT EXISTS "waiver_results_claimId_idx" ON "waiver_results"("claimId");

ALTER TABLE "waiver_results" ADD CONSTRAINT "waiver_results_waiverRunId_fkey" FOREIGN KEY ("waiverRunId") REFERENCES "waiver_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waiver_results" ADD CONSTRAINT "waiver_results_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "waiver_results" ADD CONSTRAINT "waiver_results_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "waiver_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "waiver_runs" ADD CONSTRAINT "waiver_runs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waiver_transactions" ADD CONSTRAINT "waiver_transactions_waiverRunId_fkey" FOREIGN KEY ("waiverRunId") REFERENCES "waiver_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "league_waiver_state" (
    "leagueId" TEXT NOT NULL,
    "currentPriorityOrder" JSONB,
    "faabState" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "processingLocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "league_waiver_state_pkey" PRIMARY KEY ("leagueId")
);

ALTER TABLE "league_waiver_state" ADD CONSTRAINT "league_waiver_state_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waiver_claims" ADD CONSTRAINT "waiver_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
