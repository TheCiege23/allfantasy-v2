-- =============================================================================
-- supabase_ensure_keeper_tables.sql
-- Keeper league tables for keeper tracking, eligibility, and history.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- Keeper declarations (per-season keeper selections by each team)
CREATE TABLE IF NOT EXISTS "keeper_declarations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "rosterId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT,
  "position" TEXT,
  "team" TEXT,

  -- Cost tracking
  "keeperCostRound" INTEGER,
  "keeperCostAuctionValue" DOUBLE PRECISION,
  "costMode" TEXT DEFAULT 'round_penalty',

  -- Eligibility
  "yearsKept" INTEGER DEFAULT 1,
  "maxKeepYears" INTEGER,
  "acquisitionType" TEXT,
  "originalDraftRound" INTEGER,
  "isEligible" BOOLEAN DEFAULT true,
  "ineligibleReason" TEXT,

  -- Status
  "status" TEXT DEFAULT 'pending',
  "lockedAt" TIMESTAMPTZ,
  "lockedBy" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "keeper_declarations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "keeper_declarations_league_season_idx"
  ON "keeper_declarations" ("leagueId", "season");
CREATE INDEX IF NOT EXISTS "keeper_declarations_roster_idx"
  ON "keeper_declarations" ("rosterId");
CREATE UNIQUE INDEX IF NOT EXISTS "keeper_declarations_player_key"
  ON "keeper_declarations" ("leagueId", "season", "rosterId", "playerId");

-- Keeper history (tracks which players were kept each season)
CREATE TABLE IF NOT EXISTS "keeper_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "ownerId" TEXT NOT NULL,
  "ownerName" TEXT,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT,
  "position" TEXT,
  "keeperCostRound" INTEGER,
  "keeperCostAuctionValue" DOUBLE PRECISION,
  "yearsKept" INTEGER DEFAULT 1,
  "wasSuccessful" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "keeper_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "keeper_history_league_season_idx"
  ON "keeper_history" ("leagueId", "season");

-- Keeper league config (commissioner settings for keeper rules)
CREATE TABLE IF NOT EXISTS "keeper_league_config" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "maxKeepers" INTEGER DEFAULT 3,
  "costMode" TEXT DEFAULT 'round_penalty',
  "inflationRate" INTEGER DEFAULT 1,
  "maxKeepYears" INTEGER,
  "waiverPickupsKeeperEligible" BOOLEAN DEFAULT true,
  "tradePlayersKeeperEligible" BOOLEAN DEFAULT true,
  "undraftedKeeperRound" INTEGER,
  "keeperDeadlineDaysBeforeDraft" INTEGER DEFAULT 3,
  "requireCommissionerApproval" BOOLEAN DEFAULT false,
  "keeperSelectionOpen" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "keeper_league_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "keeper_league_config_league_key"
  ON "keeper_league_config" ("leagueId");
