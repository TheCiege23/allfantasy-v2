-- Best ball engine: league config, templates, optimized lineups, contests

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bestBallVariant" TEXT DEFAULT 'standard';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bestBallMode" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbWaiversEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbTradesEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbFaEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbIrEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbTaxiEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbScoringPeriod" TEXT DEFAULT 'weekly';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbMatchupFormat" TEXT DEFAULT 'h2h';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbTiebreaker" TEXT DEFAULT 'points_for';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbOptimizerTiming" TEXT DEFAULT 'period_end';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "bbContestId" TEXT;

CREATE TABLE IF NOT EXISTS "best_ball_sport_templates" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'standard',
    "rosterSize" INTEGER NOT NULL,
    "startCount" INTEGER NOT NULL,
    "lineupSlots" JSONB NOT NULL,
    "scoringPeriod" TEXT NOT NULL,
    "scoringWeeks" INTEGER,
    "tiebreaker" TEXT NOT NULL DEFAULT 'points_for',
    "lockRule" TEXT NOT NULL DEFAULT 'game_start',
    "depthRequirements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_sport_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "best_ball_sport_templates_sport_variant_key" ON "best_ball_sport_templates"("sport", "variant");

CREATE TABLE IF NOT EXISTS "best_ball_contests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'tournament',
    "status" TEXT NOT NULL DEFAULT 'open',
    "podSize" INTEGER NOT NULL DEFAULT 12,
    "rosterSize" INTEGER NOT NULL DEFAULT 18,
    "rounds" INTEGER NOT NULL DEFAULT 1,
    "advancersPerPod" INTEGER NOT NULL DEFAULT 1,
    "draftType" TEXT NOT NULL DEFAULT 'snake',
    "draftSpeed" TEXT NOT NULL DEFAULT 'slow',
    "entryType" TEXT NOT NULL DEFAULT 'single',
    "maxEntriesPerUser" INTEGER,
    "totalEntries" INTEGER,
    "scoringPeriod" TEXT NOT NULL DEFAULT 'weekly',
    "cumulativeScoring" BOOLEAN NOT NULL DEFAULT true,
    "resetBetweenRounds" BOOLEAN NOT NULL DEFAULT false,
    "draftStartsAt" TIMESTAMP(3),
    "contestStartsAt" TIMESTAMP(3),
    "contestEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_contests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "best_ball_contests_sport_status_idx" ON "best_ball_contests"("sport", "status");

ALTER TABLE "leagues" DROP CONSTRAINT IF EXISTS "leagues_bbContestId_fkey";
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_bbContestId_fkey" FOREIGN KEY ("bbContestId") REFERENCES "best_ball_contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "best_ball_pods" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL DEFAULT 1,
    "podNumber" INTEGER NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "draftSessionId" TEXT,
    "advancers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_pods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "best_ball_pods_contestId_roundNumber_podNumber_key" ON "best_ball_pods"("contestId", "roundNumber", "podNumber");
CREATE INDEX IF NOT EXISTS "best_ball_pods_contestId_idx" ON "best_ball_pods"("contestId");

ALTER TABLE "best_ball_pods" DROP CONSTRAINT IF EXISTS "best_ball_pods_contestId_fkey";
ALTER TABLE "best_ball_pods" ADD CONSTRAINT "best_ball_pods_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "best_ball_entries" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "podId" TEXT,
    "userId" TEXT NOT NULL,
    "entryName" TEXT,
    "entryNumber" INTEGER NOT NULL DEFAULT 1,
    "podRank" INTEGER,
    "overallRank" INTEGER,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvanced" BOOLEAN NOT NULL DEFAULT false,
    "roster" JSONB,
    "weeklyScores" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "best_ball_entries_contestId_podId_idx" ON "best_ball_entries"("contestId", "podId");
CREATE INDEX IF NOT EXISTS "best_ball_entries_userId_idx" ON "best_ball_entries"("userId");

ALTER TABLE "best_ball_entries" DROP CONSTRAINT IF EXISTS "best_ball_entries_contestId_fkey";
ALTER TABLE "best_ball_entries" ADD CONSTRAINT "best_ball_entries_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "best_ball_entries" DROP CONSTRAINT IF EXISTS "best_ball_entries_podId_fkey";
ALTER TABLE "best_ball_entries" ADD CONSTRAINT "best_ball_entries_podId_fkey" FOREIGN KEY ("podId") REFERENCES "best_ball_pods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "best_ball_optimized_lineups" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "seasonId" TEXT,
    "rosterId" TEXT,
    "contestId" TEXT,
    "entryId" TEXT,
    "week" INTEGER NOT NULL,
    "scoringPeriod" TEXT NOT NULL DEFAULT 'weekly',
    "starterIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "benchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineupBreakdown" JSONB NOT NULL,
    "alternateExists" BOOLEAN NOT NULL DEFAULT false,
    "alternateLineup" JSONB,
    "optimizerLog" JSONB,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_optimized_lineups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "best_ball_optimized_lineups_seasonId_week_idx" ON "best_ball_optimized_lineups"("seasonId", "week");
CREATE INDEX IF NOT EXISTS "best_ball_optimized_lineups_rosterId_idx" ON "best_ball_optimized_lineups"("rosterId");
CREATE INDEX IF NOT EXISTS "best_ball_optimized_lineups_contestId_entryId_idx" ON "best_ball_optimized_lineups"("contestId", "entryId");

ALTER TABLE "best_ball_optimized_lineups" DROP CONSTRAINT IF EXISTS "best_ball_optimized_lineups_leagueId_fkey";
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "best_ball_optimized_lineups" DROP CONSTRAINT IF EXISTS "best_ball_optimized_lineups_seasonId_fkey";
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "redraft_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "best_ball_optimized_lineups" DROP CONSTRAINT IF EXISTS "best_ball_optimized_lineups_rosterId_fkey";
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "redraft_rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "best_ball_optimized_lineups" DROP CONSTRAINT IF EXISTS "best_ball_optimized_lineups_contestId_fkey";
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "best_ball_optimized_lineups" DROP CONSTRAINT IF EXISTS "best_ball_optimized_lineups_entryId_fkey";
ALTER TABLE "best_ball_optimized_lineups" ADD CONSTRAINT "best_ball_optimized_lineups_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "best_ball_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "best_ball_roster_validations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT,
    "contestId" TEXT,
    "rosterId" TEXT,
    "entryId" TEXT,
    "isValid" BOOLEAN NOT NULL,
    "warnings" JSONB NOT NULL,
    "criticalErrors" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_roster_validations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "best_ball_roster_validations_seasonId_rosterId_idx" ON "best_ball_roster_validations"("seasonId", "rosterId");
CREATE INDEX IF NOT EXISTS "best_ball_roster_validations_contestId_entryId_idx" ON "best_ball_roster_validations"("contestId", "entryId");

ALTER TABLE "best_ball_roster_validations" DROP CONSTRAINT IF EXISTS "best_ball_roster_validations_leagueId_fkey";
ALTER TABLE "best_ball_roster_validations" ADD CONSTRAINT "best_ball_roster_validations_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "best_ball_ai_insights" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT,
    "contestId" TEXT,
    "rosterId" TEXT,
    "entryId" TEXT,
    "week" INTEGER,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "narrative" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "best_ball_ai_insights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "best_ball_ai_insights_leagueId_type_idx" ON "best_ball_ai_insights"("leagueId", "type");
CREATE INDEX IF NOT EXISTS "best_ball_ai_insights_contestId_type_idx" ON "best_ball_ai_insights"("contestId", "type");

ALTER TABLE "best_ball_ai_insights" DROP CONSTRAINT IF EXISTS "best_ball_ai_insights_leagueId_fkey";
ALTER TABLE "best_ball_ai_insights" ADD CONSTRAINT "best_ball_ai_insights_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "best_ball_ai_insights" DROP CONSTRAINT IF EXISTS "best_ball_ai_insights_contestId_fkey";
ALTER TABLE "best_ball_ai_insights" ADD CONSTRAINT "best_ball_ai_insights_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "best_ball_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
