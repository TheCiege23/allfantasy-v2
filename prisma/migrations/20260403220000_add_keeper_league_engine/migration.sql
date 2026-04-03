-- Keeper league engine: league config, roster flags, keeper tables

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperCount" INTEGER DEFAULT 3;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperCostSystem" TEXT DEFAULT 'round_based';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperMaxYears" INTEGER DEFAULT 3;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperWaiverAllowed" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperEligibilityRule" TEXT DEFAULT 'any';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperMinRoundsHeld" INTEGER DEFAULT 0;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperRoundPenalty" INTEGER DEFAULT 1;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperInflationRate" INTEGER DEFAULT 1;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperAuctionPctIncrease" DOUBLE PRECISION DEFAULT 0.2;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperSelectionDeadline" TIMESTAMP(3);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperPhaseActive" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "dynastySeasonPhase" TEXT DEFAULT 'regular';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperConflictRule" TEXT DEFAULT 'player_chooses';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "keeperMissedDeadlineRule" TEXT DEFAULT 'auto_no_keepers';

ALTER TABLE "redraft_roster_players" ADD COLUMN IF NOT EXISTS "acquisitionType" TEXT NOT NULL DEFAULT 'drafted';
ALTER TABLE "redraft_roster_players" ADD COLUMN IF NOT EXISTS "isKept" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "keeper_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "sport" TEXT NOT NULL,
    "originalDraftRound" INTEGER,
    "originalDraftYear" INTEGER NOT NULL,
    "originalAuctionPrice" DOUBLE PRECISION,
    "yearsKept" INTEGER NOT NULL DEFAULT 1,
    "costRound" INTEGER,
    "costAuctionValue" DOUBLE PRECISION,
    "costLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "acquisitionType" TEXT NOT NULL DEFAULT 'drafted',
    CONSTRAINT "keeper_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "keeper_records_seasonId_rosterId_playerId_key" ON "keeper_records"("seasonId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "keeper_records_leagueId_seasonId_idx" ON "keeper_records"("leagueId", "seasonId");
CREATE INDEX IF NOT EXISTS "keeper_records_rosterId_seasonId_idx" ON "keeper_records"("rosterId", "seasonId");

ALTER TABLE "keeper_records" DROP CONSTRAINT IF EXISTS "keeper_records_leagueId_fkey";
ALTER TABLE "keeper_records" ADD CONSTRAINT "keeper_records_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_records" DROP CONSTRAINT IF EXISTS "keeper_records_seasonId_fkey";
ALTER TABLE "keeper_records" ADD CONSTRAINT "keeper_records_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_records" DROP CONSTRAINT IF EXISTS "keeper_records_rosterId_fkey";
ALTER TABLE "keeper_records" ADD CONSTRAINT "keeper_records_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "keeper_selection_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "totalTeams" INTEGER NOT NULL,
    "teamsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "teamsLocked" INTEGER NOT NULL DEFAULT 0,
    "conflictsDetected" JSONB,
    "conflictsResolved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "keeper_selection_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "keeper_selection_sessions_seasonId_key" ON "keeper_selection_sessions"("seasonId");
CREATE INDEX IF NOT EXISTS "keeper_selection_sessions_leagueId_idx" ON "keeper_selection_sessions"("leagueId");

ALTER TABLE "keeper_selection_sessions" DROP CONSTRAINT IF EXISTS "keeper_selection_sessions_leagueId_fkey";
ALTER TABLE "keeper_selection_sessions" ADD CONSTRAINT "keeper_selection_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_selection_sessions" DROP CONSTRAINT IF EXISTS "keeper_selection_sessions_seasonId_fkey";
ALTER TABLE "keeper_selection_sessions" ADD CONSTRAINT "keeper_selection_sessions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "keeper_eligibilities" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "ineligibleReason" TEXT,
    "yearsKept" INTEGER NOT NULL DEFAULT 0,
    "projectedCost" TEXT,
    "projectedCostRound" INTEGER,
    "projectedCostAuction" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "keeper_eligibilities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "keeper_eligibilities_seasonId_rosterId_playerId_key" ON "keeper_eligibilities"("seasonId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "keeper_eligibilities_leagueId_seasonId_idx" ON "keeper_eligibilities"("leagueId", "seasonId");

ALTER TABLE "keeper_eligibilities" DROP CONSTRAINT IF EXISTS "keeper_eligibilities_leagueId_fkey";
ALTER TABLE "keeper_eligibilities" ADD CONSTRAINT "keeper_eligibilities_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_eligibilities" DROP CONSTRAINT IF EXISTS "keeper_eligibilities_seasonId_fkey";
ALTER TABLE "keeper_eligibilities" ADD CONSTRAINT "keeper_eligibilities_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "keeper_pick_adjustments" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "keeperRecordId" TEXT NOT NULL,
    "pickRoundForfeited" INTEGER NOT NULL,
    "pickSlotForfeited" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',
    CONSTRAINT "keeper_pick_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "keeper_pick_adjustments_seasonId_rosterId_idx" ON "keeper_pick_adjustments"("seasonId", "rosterId");

ALTER TABLE "keeper_pick_adjustments" DROP CONSTRAINT IF EXISTS "keeper_pick_adjustments_leagueId_fkey";
ALTER TABLE "keeper_pick_adjustments" ADD CONSTRAINT "keeper_pick_adjustments_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_pick_adjustments" DROP CONSTRAINT IF EXISTS "keeper_pick_adjustments_seasonId_fkey";
ALTER TABLE "keeper_pick_adjustments" ADD CONSTRAINT "keeper_pick_adjustments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_pick_adjustments" DROP CONSTRAINT IF EXISTS "keeper_pick_adjustments_keeperRecordId_fkey";
ALTER TABLE "keeper_pick_adjustments" ADD CONSTRAINT "keeper_pick_adjustments_keeperRecordId_fkey" FOREIGN KEY ("keeperRecordId") REFERENCES "keeper_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "keeper_audit_logs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT,
    "detail" JSONB,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "keeper_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "keeper_audit_logs_leagueId_seasonId_idx" ON "keeper_audit_logs"("leagueId", "seasonId");

ALTER TABLE "keeper_audit_logs" DROP CONSTRAINT IF EXISTS "keeper_audit_logs_leagueId_fkey";
ALTER TABLE "keeper_audit_logs" ADD CONSTRAINT "keeper_audit_logs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "keeper_audit_logs" DROP CONSTRAINT IF EXISTS "keeper_audit_logs_seasonId_fkey";
ALTER TABLE "keeper_audit_logs" ADD CONSTRAINT "keeper_audit_logs_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
