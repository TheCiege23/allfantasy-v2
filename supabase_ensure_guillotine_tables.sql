-- =============================================================================
-- supabase_ensure_guillotine_tables.sql
-- All Guillotine League tables for Supabase.
-- =============================================================================

-- GuillotineLeagueConfig
CREATE TABLE IF NOT EXISTS "guillotine_league_configs" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "eliminationStartWeek" INTEGER DEFAULT 1,
  "eliminationEndWeek" INTEGER DEFAULT 18,
  "teamsPerChop" INTEGER DEFAULT 1,
  "correctionWindow" TEXT DEFAULT 'immediate',
  "customCutoffDayOfWeek" INTEGER,
  "customCutoffTimeUtc" TEXT,
  "statCorrectionHours" INTEGER DEFAULT 48,
  "tiebreakerOrder" TEXT DEFAULT 'lowest_bench_points,lowest_cumulative,lowest_projected',
  "dangerMarginPoints" DOUBLE PRECISION DEFAULT 10.0,
  "rosterReleaseTiming" TEXT DEFAULT 'next_waiver_run',
  "commissionerOverride" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_league_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "guillotine_league_configs_leagueId_key" ON "guillotine_league_configs" ("leagueId");

-- GuillotineRosterState
CREATE TABLE IF NOT EXISTS "guillotine_roster_states" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "choppedAt" TIMESTAMPTZ,
  "choppedInPeriod" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_roster_states_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_roster_states_leagueId_idx" ON "guillotine_roster_states" ("leagueId");

-- GuillotinePeriodScore
CREATE TABLE IF NOT EXISTS "guillotine_period_scores" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "weekOrPeriod" INTEGER NOT NULL,
  "season" INTEGER,
  "points" DOUBLE PRECISION DEFAULT 0,
  "benchPoints" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_period_scores_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_period_scores_leagueId_week_idx" ON "guillotine_period_scores" ("leagueId", "weekOrPeriod");

-- GuillotineEventLog
CREATE TABLE IF NOT EXISTS "guillotine_event_logs" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_event_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_event_logs_leagueId_idx" ON "guillotine_event_logs" ("leagueId");

-- GuillotineSeason
CREATE TABLE IF NOT EXISTS "guillotine_seasons" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "redraftSeasonId" TEXT,
  "sport" TEXT,
  "season" INTEGER,
  "status" TEXT DEFAULT 'active',
  "totalTeamsStarted" INTEGER DEFAULT 0,
  "currentTeamsActive" INTEGER DEFAULT 0,
  "currentScoringPeriod" INTEGER DEFAULT 0,
  "isInFinalStage" BOOLEAN DEFAULT false,
  "finalStageStartPeriod" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_seasons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_seasons_leagueId_idx" ON "guillotine_seasons" ("leagueId");

-- GuillotineElimination
CREATE TABLE IF NOT EXISTS "guillotine_eliminations" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "eliminatedRosterId" TEXT NOT NULL,
  "eliminatedTeamName" TEXT,
  "eliminatedOwnerId" TEXT,
  "scoringPeriod" INTEGER NOT NULL,
  "finalScore" DOUBLE PRECISION DEFAULT 0,
  "rankAmongActive" INTEGER,
  "marginBelowSafe" DOUBLE PRECISION,
  "wasTiebreaker" BOOLEAN DEFAULT false,
  "tiebreakerType" TEXT,
  "tiedWithRosterId" TEXT,
  "aiEliminationSummary" TEXT,
  "aiCollapseReason" TEXT,
  "eliminatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_eliminations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_eliminations_seasonId_idx" ON "guillotine_eliminations" ("seasonId");
CREATE INDEX IF NOT EXISTS "guillotine_eliminations_leagueId_period_idx" ON "guillotine_eliminations" ("leagueId", "scoringPeriod");

-- GuillotineSurvivalLog
CREATE TABLE IF NOT EXISTS "guillotine_survival_logs" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "scoringPeriod" INTEGER NOT NULL,
  "totalScore" DOUBLE PRECISION DEFAULT 0,
  "rankAmongActive" INTEGER,
  "teamsActiveThisPeriod" INTEGER,
  "survivalStatus" TEXT DEFAULT 'survived',
  "marginAboveChopLine" DOUBLE PRECISION,
  "wasInDangerZone" BOOLEAN DEFAULT false,
  CONSTRAINT "guillotine_survival_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_survival_logs_seasonId_period_idx" ON "guillotine_survival_logs" ("seasonId", "scoringPeriod");

-- GuillotineWaiverRelease
CREATE TABLE IF NOT EXISTS "guillotine_waiver_releases" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "eliminatedRosterId" TEXT NOT NULL,
  "scoringPeriod" INTEGER NOT NULL,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT,
  "position" TEXT,
  "team" TEXT,
  "sport" TEXT,
  "releaseStatus" TEXT DEFAULT 'pending',
  "availableAt" TIMESTAMPTZ,
  "claimedByRosterId" TEXT,
  "claimedAt" TIMESTAMPTZ,
  "winningBid" DOUBLE PRECISION,
  CONSTRAINT "guillotine_waiver_releases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_waiver_releases_leagueId_period_idx" ON "guillotine_waiver_releases" ("leagueId", "scoringPeriod");

-- GuillotineAIInsight
CREATE TABLE IF NOT EXISTS "guillotine_ai_insights" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "seasonId" TEXT,
  "scoringPeriod" INTEGER,
  "rosterId" TEXT,
  "type" TEXT NOT NULL,
  "content" TEXT,
  "narrative" TEXT,
  "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guillotine_ai_insights_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "guillotine_ai_insights_leagueId_idx" ON "guillotine_ai_insights" ("leagueId");

-- League-level guillotine columns
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
