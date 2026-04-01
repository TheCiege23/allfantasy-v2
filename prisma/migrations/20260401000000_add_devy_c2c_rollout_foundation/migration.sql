ALTER TABLE "DevyPlayer"
ADD COLUMN IF NOT EXISTS "sport" VARCHAR(8) NOT NULL DEFAULT 'NCAAF',
ADD COLUMN IF NOT EXISTS "headshotUrl" TEXT,
ADD COLUMN IF NOT EXISTS "jerseyNumber" VARCHAR(16),
ADD COLUMN IF NOT EXISTS "classYearLabel" VARCHAR(16),
ADD COLUMN IF NOT EXISTS "portalStatus" VARCHAR(24),
ADD COLUMN IF NOT EXISTS "draftGrade" VARCHAR(24),
ADD COLUMN IF NOT EXISTS "projectedC2CPoints" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "c2cPointsSeason" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "c2cPointsWeek" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "stockTrendDelta" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "nextGameLabel" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "statsPayload" JSONB;

CREATE INDEX IF NOT EXISTS "DevyPlayer_sport_idx" ON "DevyPlayer"("sport");
CREATE INDEX IF NOT EXISTS "DevyPlayer_sport_draftEligibleYear_idx" ON "DevyPlayer"("sport", "draftEligibleYear");
CREATE INDEX IF NOT EXISTS "DevyPlayer_portalStatus_idx" ON "DevyPlayer"("portalStatus");

ALTER TABLE "devy_league_configs"
ADD COLUMN IF NOT EXISTS "devyIRSlots" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "devyScoringEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "collegeSports" JSONB;

ALTER TABLE "devy_rights"
ADD COLUMN IF NOT EXISTS "slotCategory" VARCHAR(16) NOT NULL DEFAULT 'DEVY',
ADD COLUMN IF NOT EXISTS "c2cLineupRole" VARCHAR(16);

CREATE INDEX IF NOT EXISTS "devy_rights_leagueId_rosterId_slotCategory_idx"
ON "devy_rights"("leagueId", "rosterId", "slotCategory");

CREATE TABLE IF NOT EXISTS "c2c_league_configs" (
  "id" TEXT NOT NULL,
  "leagueId" VARCHAR(64) NOT NULL,
  "dynastyOnly" BOOLEAN NOT NULL DEFAULT true,
  "supportsMergedCollegeAndProAssets" BOOLEAN NOT NULL DEFAULT true,
  "supportsCollegeScoring" BOOLEAN NOT NULL DEFAULT true,
  "supportsBestBall" BOOLEAN NOT NULL DEFAULT true,
  "supportsSnakeDraft" BOOLEAN NOT NULL DEFAULT true,
  "supportsLinearDraft" BOOLEAN NOT NULL DEFAULT true,
  "supportsTaxi" BOOLEAN NOT NULL DEFAULT true,
  "supportsFuturePicks" BOOLEAN NOT NULL DEFAULT true,
  "supportsTradeableCollegeAssets" BOOLEAN NOT NULL DEFAULT true,
  "supportsTradeableCollegePicks" BOOLEAN NOT NULL DEFAULT true,
  "supportsTradeableRookiePicks" BOOLEAN NOT NULL DEFAULT true,
  "supportsPromotionRules" BOOLEAN NOT NULL DEFAULT true,
  "startupFormat" VARCHAR(24) NOT NULL DEFAULT 'merged',
  "mergedStartupDraft" BOOLEAN NOT NULL DEFAULT true,
  "separateStartupCollegeDraft" BOOLEAN NOT NULL DEFAULT false,
  "collegeRosterSize" INTEGER NOT NULL DEFAULT 20,
  "collegeSports" JSONB,
  "collegeScoringSystem" VARCHAR(24) NOT NULL DEFAULT 'ppr',
  "mixProPlayers" BOOLEAN NOT NULL DEFAULT true,
  "collegeActiveLineupSlots" JSONB,
  "taxiSize" INTEGER NOT NULL DEFAULT 6,
  "rookieDraftRounds" INTEGER NOT NULL DEFAULT 4,
  "collegeDraftRounds" INTEGER NOT NULL DEFAULT 6,
  "bestBallPro" BOOLEAN NOT NULL DEFAULT true,
  "bestBallCollege" BOOLEAN NOT NULL DEFAULT false,
  "promotionTiming" VARCHAR(48) NOT NULL DEFAULT 'manager_choice_before_rookie_draft',
  "maxPromotionsPerYear" INTEGER,
  "earlyDeclareBehavior" VARCHAR(24) NOT NULL DEFAULT 'allow',
  "returnToSchoolHandling" VARCHAR(32) NOT NULL DEFAULT 'restore_rights',
  "rookiePickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
  "collegePickTradeRules" VARCHAR(24) NOT NULL DEFAULT 'allowed',
  "collegeScoringUntilDeadline" BOOLEAN NOT NULL DEFAULT true,
  "standingsModel" VARCHAR(24) NOT NULL DEFAULT 'unified',
  "mergedRookieCollegeDraft" BOOLEAN NOT NULL DEFAULT false,
  "nflCollegeExcludeKDST" BOOLEAN NOT NULL DEFAULT true,
  "proLineupSlots" JSONB,
  "proBenchSize" INTEGER NOT NULL DEFAULT 12,
  "proIRSize" INTEGER NOT NULL DEFAULT 3,
  "startupDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
  "rookieDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
  "collegeDraftType" VARCHAR(16) NOT NULL DEFAULT 'snake',
  "rookiePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
  "collegePickOrderMethod" VARCHAR(32) NOT NULL DEFAULT 'reverse_standings',
  "hybridProWeight" INTEGER NOT NULL DEFAULT 60,
  "hybridPlayoffQualification" VARCHAR(32) NOT NULL DEFAULT 'weighted',
  "hybridChampionshipTieBreaker" VARCHAR(32) NOT NULL DEFAULT 'total_points',
  "collegeFAEnabled" BOOLEAN NOT NULL DEFAULT false,
  "collegeFAABSeparate" BOOLEAN NOT NULL DEFAULT false,
  "collegeFAABBudget" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "c2c_league_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "c2c_league_configs_leagueId_key"
ON "c2c_league_configs"("leagueId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'c2c_league_configs_leagueId_fkey'
  ) THEN
    ALTER TABLE "c2c_league_configs"
    ADD CONSTRAINT "c2c_league_configs_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "c2c_league_configs"
ADD COLUMN IF NOT EXISTS "collegeSports" JSONB,
ADD COLUMN IF NOT EXISTS "collegeScoringSystem" VARCHAR(24) NOT NULL DEFAULT 'ppr',
ADD COLUMN IF NOT EXISTS "mixProPlayers" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "c2c_scoring_logs" (
  "id" TEXT NOT NULL,
  "leagueId" VARCHAR(64) NOT NULL,
  "rosterId" VARCHAR(64) NOT NULL,
  "devyPlayerId" VARCHAR(64) NOT NULL,
  "gameId" VARCHAR(64) NOT NULL DEFAULT 'season',
  "season" INTEGER NOT NULL,
  "week" INTEGER NOT NULL,
  "points" DOUBLE PRECISION NOT NULL,
  "scoringSystem" VARCHAR(24) NOT NULL DEFAULT 'ppr',
  "breakdown" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "c2c_scoring_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "c2c_scoring_logs_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "c2c_scoring_logs_leagueId_rosterId_devyPlayerId_season_week_gameId_key"
ON "c2c_scoring_logs"("leagueId", "rosterId", "devyPlayerId", "season", "week", "gameId");

CREATE INDEX IF NOT EXISTS "c2c_scoring_logs_leagueId_week_idx"
ON "c2c_scoring_logs"("leagueId", "week");

CREATE INDEX IF NOT EXISTS "c2c_scoring_logs_rosterId_season_week_idx"
ON "c2c_scoring_logs"("rosterId", "season", "week");

CREATE INDEX IF NOT EXISTS "c2c_scoring_logs_devyPlayerId_season_idx"
ON "c2c_scoring_logs"("devyPlayerId", "season");
