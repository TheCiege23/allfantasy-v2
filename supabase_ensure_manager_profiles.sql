-- =============================================================================
-- supabase_ensure_manager_profiles.sql
-- Aggregated per-manager historical stats for AI context and UI display.
-- Rebuilt after each import/backfill.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "league_manager_profiles" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "managerName" TEXT,
  "managerAvatar" TEXT,
  "platformUserId" TEXT,
  "platform" TEXT DEFAULT 'sleeper',
  "totalSeasons" INTEGER DEFAULT 0,
  "totalWins" INTEGER DEFAULT 0,
  "totalLosses" INTEGER DEFAULT 0,
  "totalTies" INTEGER DEFAULT 0,
  "totalPointsFor" DOUBLE PRECISION DEFAULT 0,
  "totalPointsAgainst" DOUBLE PRECISION DEFAULT 0,
  "championships" INTEGER DEFAULT 0,
  "runnerUps" INTEGER DEFAULT 0,
  "playoffAppearances" INTEGER DEFAULT 0,
  "avgFinish" DOUBLE PRECISION,
  "bestFinish" INTEGER,
  "worstFinish" INTEGER,
  "winPct" DOUBLE PRECISION DEFAULT 0,
  "avgPointsPerSeason" DOUBLE PRECISION DEFAULT 0,
  "draftStyle" JSONB DEFAULT '{}',
  "tradeFrequency" DOUBLE PRECISION DEFAULT 0,
  "tradesPerSeason" DOUBLE PRECISION DEFAULT 0,
  "favoritePositions" JSONB DEFAULT '[]',
  "firstRoundHistory" JSONB DEFAULT '[]',
  "headToHeadRecords" JSONB DEFAULT '{}',
  "seasonHistory" JSONB DEFAULT '[]',
  "lastUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_manager_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "league_manager_profiles_league_manager_key"
  ON "league_manager_profiles" ("leagueId", "managerId");
CREATE INDEX IF NOT EXISTS "league_manager_profiles_leagueId_idx"
  ON "league_manager_profiles" ("leagueId");
