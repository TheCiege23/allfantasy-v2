-- =============================================================================
-- supabase_ensure_dynasty_tables.sql
-- Dynasty league tables for history, continuity, storylines, and picks.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- Dynasty league championship history
CREATE TABLE IF NOT EXISTS "dynasty_championship_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "championRosterId" TEXT,
  "championOwnerName" TEXT,
  "championTeamName" TEXT,
  "runnerUpRosterId" TEXT,
  "runnerUpOwnerName" TEXT,
  "finalScore" TEXT,
  "playoffMvpPlayerId" TEXT,
  "playoffMvpPlayerName" TEXT,
  "regularSeasonMvpPlayerId" TEXT,
  "regularSeasonMvpPlayerName" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_championship_history_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_championship_history_league_season_key"
  ON "dynasty_championship_history" ("leagueId", "season");

-- Dynasty team season records (historical W-L-T per team per season)
CREATE TABLE IF NOT EXISTS "dynasty_team_season_records" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "rosterId" TEXT NOT NULL,
  "ownerId" TEXT,
  "ownerName" TEXT,
  "teamName" TEXT,
  "wins" INTEGER DEFAULT 0,
  "losses" INTEGER DEFAULT 0,
  "ties" INTEGER DEFAULT 0,
  "pointsFor" DOUBLE PRECISION DEFAULT 0,
  "pointsAgainst" DOUBLE PRECISION DEFAULT 0,
  "playoffSeed" INTEGER,
  "finishPosition" INTEGER,
  "regularSeasonRank" INTEGER,
  "maxPointsFor" DOUBLE PRECISION DEFAULT 0,
  "tradeCount" INTEGER DEFAULT 0,
  "waiverMoveCount" INTEGER DEFAULT 0,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_team_season_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dynasty_team_season_records_league_idx"
  ON "dynasty_team_season_records" ("leagueId", "season");
CREATE INDEX IF NOT EXISTS "dynasty_team_season_records_owner_idx"
  ON "dynasty_team_season_records" ("ownerId");

-- Dynasty future draft picks (tradable multi-year picks)
CREATE TABLE IF NOT EXISTS "dynasty_future_picks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "round" INTEGER NOT NULL,
  "pickType" TEXT DEFAULT 'rookie',
  "originalOwnerId" TEXT NOT NULL,
  "originalOwnerName" TEXT,
  "currentOwnerId" TEXT NOT NULL,
  "currentOwnerName" TEXT,
  "isUsed" BOOLEAN DEFAULT false,
  "usedOnPlayerId" TEXT,
  "usedOnPlayerName" TEXT,
  "isTradeable" BOOLEAN DEFAULT true,
  "tradeHistory" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_future_picks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_future_picks_unique_key"
  ON "dynasty_future_picks" ("leagueId", "season", "round", "pickType", "originalOwnerId");
CREATE INDEX IF NOT EXISTS "dynasty_future_picks_owner_idx"
  ON "dynasty_future_picks" ("currentOwnerId");

-- Dynasty storylines (AI-generated narratives across seasons)
CREATE TABLE IF NOT EXISTS "dynasty_storylines" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "week" INTEGER,
  "storyType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "participants" TEXT[] DEFAULT '{}',
  "tags" TEXT[] DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "isPublished" BOOLEAN DEFAULT false,
  "publishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_storylines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dynasty_storylines_league_idx"
  ON "dynasty_storylines" ("leagueId", "season");
CREATE INDEX IF NOT EXISTS "dynasty_storylines_type_idx"
  ON "dynasty_storylines" ("storyType");

-- Dynasty team arcs (tracked team trajectories across seasons)
CREATE TABLE IF NOT EXISTS "dynasty_team_arcs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "arc" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION DEFAULT 0.5,
  "narrative" TEXT,
  "previousArc" TEXT,
  "championshipCount" INTEGER DEFAULT 0,
  "lastChampionshipYear" INTEGER,
  "consecutivePlayoffApps" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_team_arcs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_team_arcs_league_owner_season_key"
  ON "dynasty_team_arcs" ("leagueId", "ownerId", "season");

-- Dynasty rivalries (detected repeated head-to-head matchups with history)
CREATE TABLE IF NOT EXISTS "dynasty_rivalries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "team1OwnerId" TEXT NOT NULL,
  "team2OwnerId" TEXT NOT NULL,
  "team1Name" TEXT,
  "team2Name" TEXT,
  "totalMatchups" INTEGER DEFAULT 0,
  "team1Wins" INTEGER DEFAULT 0,
  "team2Wins" INTEGER DEFAULT 0,
  "rivalryLabel" TEXT,
  "intensity" DOUBLE PRECISION DEFAULT 0,
  "lastMatchupSeason" INTEGER,
  "lastMatchupWeek" INTEGER,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_rivalries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_rivalries_pair_key"
  ON "dynasty_rivalries" ("leagueId", "team1OwnerId", "team2OwnerId");

-- Dynasty offseason phase log (tracks phase transitions)
CREATE TABLE IF NOT EXISTS "dynasty_phase_log" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "fromPhase" TEXT NOT NULL,
  "toPhase" TEXT NOT NULL,
  "reason" TEXT,
  "triggeredBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_phase_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dynasty_phase_log_league_idx"
  ON "dynasty_phase_log" ("leagueId", "season");

-- Dynasty trade history (extended trade log with narrative metadata)
CREATE TABLE IF NOT EXISTS "dynasty_trade_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "week" INTEGER,
  "team1OwnerId" TEXT NOT NULL,
  "team2OwnerId" TEXT NOT NULL,
  "team1Gets" JSONB NOT NULL DEFAULT '[]',
  "team2Gets" JSONB NOT NULL DEFAULT '[]',
  "team1Arc" TEXT,
  "team2Arc" TEXT,
  "aiAnalysis" JSONB,
  "storyTitle" TEXT,
  "storyBody" TEXT,
  "tradeGrade" TEXT,
  "status" TEXT DEFAULT 'completed',
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_trade_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dynasty_trade_history_league_idx"
  ON "dynasty_trade_history" ("leagueId", "season");
