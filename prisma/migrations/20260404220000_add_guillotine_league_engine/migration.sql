-- Guillotine survival engine: league flags, roster elimination, season + logs + releases + AI

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineMode" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineEndgame" TEXT DEFAULT 'last_team_standing';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineEndgameThreshold" INTEGER DEFAULT 1;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineEliminationsPerPeriod" INTEGER DEFAULT 1;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineProtectedWeek1" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineAcceleratedWeeks" TEXT DEFAULT '[]';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineTiebreaker" TEXT DEFAULT 'lowest_bench_points';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineSamePeriodPickups" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineWaiverDelay" INTEGER DEFAULT 0;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineRosterExpansion" JSONB DEFAULT '[]';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "guillotineFinalStageScoring" TEXT DEFAULT 'cumulative';

ALTER TABLE "redraft_rosters" ADD COLUMN IF NOT EXISTS "isEliminated" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "guillotine_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "redraftSeasonId" TEXT,
    "sport" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'setup',
    "totalTeamsStarted" INTEGER NOT NULL,
    "currentTeamsActive" INTEGER NOT NULL,
    "currentScoringPeriod" INTEGER NOT NULL DEFAULT 0,
    "isInFinalStage" BOOLEAN NOT NULL DEFAULT false,
    "finalStageStartPeriod" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guillotine_seasons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_seasons_redraftSeasonId_key" ON "guillotine_seasons"("redraftSeasonId");
CREATE INDEX IF NOT EXISTS "guillotine_seasons_leagueId_idx" ON "guillotine_seasons"("leagueId");

ALTER TABLE "guillotine_seasons" DROP CONSTRAINT IF EXISTS "guillotine_seasons_leagueId_fkey";
ALTER TABLE "guillotine_seasons" ADD CONSTRAINT "guillotine_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guillotine_seasons" DROP CONSTRAINT IF EXISTS "guillotine_seasons_redraftSeasonId_fkey";
ALTER TABLE "guillotine_seasons" ADD CONSTRAINT "guillotine_seasons_redraftSeasonId_fkey" FOREIGN KEY ("redraftSeasonId") REFERENCES "redraft_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "guillotine_eliminations" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eliminatedRosterId" TEXT NOT NULL,
    "eliminatedTeamName" TEXT NOT NULL,
    "eliminatedOwnerId" TEXT NOT NULL,
    "scoringPeriod" INTEGER NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "rankAmongActive" INTEGER NOT NULL,
    "marginBelowSafe" DOUBLE PRECISION NOT NULL,
    "wasTiebreaker" BOOLEAN NOT NULL DEFAULT false,
    "tiebreakerType" TEXT,
    "tiedWithRosterId" TEXT,
    "aiEliminationSummary" TEXT,
    "aiCollapseReason" TEXT,
    "eliminatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guillotine_eliminations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guillotine_eliminations_seasonId_scoringPeriod_idx" ON "guillotine_eliminations"("seasonId", "scoringPeriod");
CREATE INDEX IF NOT EXISTS "guillotine_eliminations_leagueId_idx" ON "guillotine_eliminations"("leagueId");

ALTER TABLE "guillotine_eliminations" DROP CONSTRAINT IF EXISTS "guillotine_eliminations_seasonId_fkey";
ALTER TABLE "guillotine_eliminations" ADD CONSTRAINT "guillotine_eliminations_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "guillotine_survival_logs" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "scoringPeriod" INTEGER NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "rankAmongActive" INTEGER NOT NULL,
    "teamsActiveThisPeriod" INTEGER NOT NULL,
    "survivalStatus" TEXT NOT NULL,
    "marginAboveChopLine" DOUBLE PRECISION NOT NULL,
    "wasInDangerZone" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "guillotine_survival_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_survival_logs_seasonId_rosterId_scoringPeriod_key" ON "guillotine_survival_logs"("seasonId", "rosterId", "scoringPeriod");
CREATE INDEX IF NOT EXISTS "guillotine_survival_logs_seasonId_scoringPeriod_idx" ON "guillotine_survival_logs"("seasonId", "scoringPeriod");
CREATE INDEX IF NOT EXISTS "guillotine_survival_logs_rosterId_idx" ON "guillotine_survival_logs"("rosterId");

ALTER TABLE "guillotine_survival_logs" DROP CONSTRAINT IF EXISTS "guillotine_survival_logs_seasonId_fkey";
ALTER TABLE "guillotine_survival_logs" ADD CONSTRAINT "guillotine_survival_logs_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guillotine_survival_logs" DROP CONSTRAINT IF EXISTS "guillotine_survival_logs_rosterId_fkey";
ALTER TABLE "guillotine_survival_logs" ADD CONSTRAINT "guillotine_survival_logs_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "guillotine_waiver_releases" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "eliminatedRosterId" TEXT NOT NULL,
    "scoringPeriod" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "sport" TEXT NOT NULL,
    "releaseStatus" TEXT NOT NULL DEFAULT 'pending',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "claimedByRosterId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "winningBid" DOUBLE PRECISION,
    CONSTRAINT "guillotine_waiver_releases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guillotine_waiver_releases_seasonId_releaseStatus_idx" ON "guillotine_waiver_releases"("seasonId", "releaseStatus");
CREATE INDEX IF NOT EXISTS "guillotine_waiver_releases_leagueId_scoringPeriod_idx" ON "guillotine_waiver_releases"("leagueId", "scoringPeriod");

ALTER TABLE "guillotine_waiver_releases" DROP CONSTRAINT IF EXISTS "guillotine_waiver_releases_seasonId_fkey";
ALTER TABLE "guillotine_waiver_releases" ADD CONSTRAINT "guillotine_waiver_releases_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "guillotine_ai_insights" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "scoringPeriod" INTEGER,
    "rosterId" TEXT,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "narrative" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guillotine_ai_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "guillotine_ai_insights_seasonId_type_idx" ON "guillotine_ai_insights"("seasonId", "type");
CREATE INDEX IF NOT EXISTS "guillotine_ai_insights_rosterId_type_idx" ON "guillotine_ai_insights"("rosterId", "type");

ALTER TABLE "guillotine_ai_insights" DROP CONSTRAINT IF EXISTS "guillotine_ai_insights_leagueId_fkey";
ALTER TABLE "guillotine_ai_insights" ADD CONSTRAINT "guillotine_ai_insights_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guillotine_ai_insights" DROP CONSTRAINT IF EXISTS "guillotine_ai_insights_seasonId_fkey";
ALTER TABLE "guillotine_ai_insights" ADD CONSTRAINT "guillotine_ai_insights_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "guillotine_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
