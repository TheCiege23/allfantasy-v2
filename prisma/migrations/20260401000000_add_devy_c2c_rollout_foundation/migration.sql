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
