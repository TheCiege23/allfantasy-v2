-- IDP Salary Cap engine (GM layer on IDP / redraft)

CREATE TABLE IF NOT EXISTS "idp_cap_configs" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "totalCap" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "isHardCap" BOOLEAN NOT NULL DEFAULT true,
    "capFloorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "capFloor" DOUBLE PRECISION,
    "capRolloverEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inSeasonHoldbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inSeasonHoldbackPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "franchiseTagEnabled" BOOLEAN NOT NULL DEFAULT false,
    "franchiseTagValue" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "draftSalaryMethod" TEXT NOT NULL DEFAULT 'auction',
    "snakeScaleHighSalary" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "snakeScaleLowSalary" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "snakeScaleCurve" TEXT NOT NULL DEFAULT 'linear',
    "auctionDefaultContractYears" INTEGER NOT NULL DEFAULT 1,
    "snakeTopPickContractYears" INTEGER NOT NULL DEFAULT 3,
    "snakeMidPickContractYears" INTEGER NOT NULL DEFAULT 2,
    "snakeLatePickContractYears" INTEGER NOT NULL DEFAULT 1,
    "isDynastyMode" BOOLEAN NOT NULL DEFAULT false,
    "contractsCarryOver" BOOLEAN NOT NULL DEFAULT false,
    "season" INTEGER NOT NULL DEFAULT 2025,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idp_cap_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idp_cap_configs_leagueId_key" ON "idp_cap_configs"("leagueId");
CREATE INDEX IF NOT EXISTS "idp_cap_configs_leagueId_idx" ON "idp_cap_configs"("leagueId");

ALTER TABLE "idp_cap_configs" DROP CONSTRAINT IF EXISTS "idp_cap_configs_leagueId_fkey";
ALTER TABLE "idp_cap_configs" ADD CONSTRAINT "idp_cap_configs_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "idp_salary_records" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isDefensive" BOOLEAN NOT NULL DEFAULT false,
    "salary" DOUBLE PRECISION NOT NULL,
    "contractYears" INTEGER NOT NULL DEFAULT 1,
    "yearsRemaining" INTEGER NOT NULL DEFAULT 1,
    "contractStartYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "acquisitionMethod" TEXT NOT NULL,
    "isFranchiseTagged" BOOLEAN NOT NULL DEFAULT false,
    "hasBeenExtended" BOOLEAN NOT NULL DEFAULT false,
    "extensionBoostPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "cutPenaltyCurrent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idp_salary_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idp_salary_records_leagueId_rosterId_playerId_key" ON "idp_salary_records"("leagueId", "rosterId", "playerId");
CREATE INDEX IF NOT EXISTS "idp_salary_records_leagueId_rosterId_idx" ON "idp_salary_records"("leagueId", "rosterId");
CREATE INDEX IF NOT EXISTS "idp_salary_records_leagueId_status_idx" ON "idp_salary_records"("leagueId", "status");

ALTER TABLE "idp_salary_records" DROP CONSTRAINT IF EXISTS "idp_salary_records_leagueId_fkey";
ALTER TABLE "idp_salary_records" ADD CONSTRAINT "idp_salary_records_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "idp_cap_configs"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "idp_salary_records" DROP CONSTRAINT IF EXISTS "idp_salary_records_rosterId_fkey";
ALTER TABLE "idp_salary_records" ADD CONSTRAINT "idp_salary_records_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "idp_dead_money" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "salaryRecordId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "currentYearDead" DOUBLE PRECISION NOT NULL,
    "futureYearsDead" DOUBLE PRECISION NOT NULL,
    "totalDeadMoney" DOUBLE PRECISION NOT NULL,
    "yearsRemainingAtCut" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idp_dead_money_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idp_dead_money_leagueId_rosterId_idx" ON "idp_dead_money"("leagueId", "rosterId");

ALTER TABLE "idp_dead_money" DROP CONSTRAINT IF EXISTS "idp_dead_money_leagueId_fkey";
ALTER TABLE "idp_dead_money" ADD CONSTRAINT "idp_dead_money_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "idp_cap_configs"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "idp_dead_money" DROP CONSTRAINT IF EXISTS "idp_dead_money_rosterId_fkey";
ALTER TABLE "idp_dead_money" ADD CONSTRAINT "idp_dead_money_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "idp_dead_money" DROP CONSTRAINT IF EXISTS "idp_dead_money_salaryRecordId_fkey";
ALTER TABLE "idp_dead_money" ADD CONSTRAINT "idp_dead_money_salaryRecordId_fkey" FOREIGN KEY ("salaryRecordId") REFERENCES "idp_salary_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "idp_cap_projections" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "projectionYear" INTEGER NOT NULL,
    "committedSalary" DOUBLE PRECISION NOT NULL,
    "deadCapHits" DOUBLE PRECISION NOT NULL,
    "totalCapUsed" DOUBLE PRECISION NOT NULL,
    "availableCap" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idp_cap_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idp_cap_projections_leagueId_rosterId_projectionYear_key" ON "idp_cap_projections"("leagueId", "rosterId", "projectionYear");
CREATE INDEX IF NOT EXISTS "idp_cap_projections_leagueId_rosterId_idx" ON "idp_cap_projections"("leagueId", "rosterId");

ALTER TABLE "idp_cap_projections" DROP CONSTRAINT IF EXISTS "idp_cap_projections_leagueId_fkey";
ALTER TABLE "idp_cap_projections" ADD CONSTRAINT "idp_cap_projections_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "idp_cap_configs"("leagueId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "idp_cap_projections" DROP CONSTRAINT IF EXISTS "idp_cap_projections_rosterId_fkey";
ALTER TABLE "idp_cap_projections" ADD CONSTRAINT "idp_cap_projections_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "idp_cap_transactions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "isDefensive" BOOLEAN NOT NULL DEFAULT false,
    "transactionType" TEXT NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "contractYears" INTEGER,
    "deadMoneyCreated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capImpact" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "season" INTEGER NOT NULL,
    "week" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idp_cap_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idp_cap_transactions_leagueId_rosterId_idx" ON "idp_cap_transactions"("leagueId", "rosterId");
CREATE INDEX IF NOT EXISTS "idp_cap_transactions_leagueId_transactionType_idx" ON "idp_cap_transactions"("leagueId", "transactionType");
