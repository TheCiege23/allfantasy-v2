-- =============================================================================
-- supabase_ensure_exile_draft_tables.sql
-- Exile Island team draft system: waiver claims + team rosters + idol expiry.
-- =============================================================================

-- Exile team waiver claims
CREATE TABLE IF NOT EXISTS "exile_team_claims" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "exileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "claimedPlayerId" TEXT NOT NULL,
  "claimedPlayerName" TEXT,
  "claimedPlayerPosition" TEXT,
  "claimedPlayerTeam" TEXT,
  "claimedPlayerTeamId" TEXT,
  "sport" TEXT NOT NULL,
  "isKeyPosition" BOOLEAN DEFAULT false,
  "wonTeam" BOOLEAN DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exile_team_claims_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "exile_team_claims_leagueId_week_idx"
  ON "exile_team_claims" ("leagueId", "week");
CREATE INDEX IF NOT EXISTS "exile_team_claims_userId_week_idx"
  ON "exile_team_claims" ("userId", "week");

-- Exile team rosters (completed team assignments per week)
CREATE TABLE IF NOT EXISTS "exile_team_rosters" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "exileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "teamId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "keyPlayerId" TEXT,
  "keyPlayerName" TEXT,
  "keyPlayerPosition" TEXT,
  "players" JSONB DEFAULT '[]',
  "totalPoints" DOUBLE PRECISION DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "isBossTeam" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exile_team_rosters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "exile_team_rosters_league_user_week_key"
  ON "exile_team_rosters" ("leagueId", "userId", "week");
CREATE INDEX IF NOT EXISTS "exile_team_rosters_leagueId_week_idx"
  ON "exile_team_rosters" ("leagueId", "week");

-- Add idol expiry week to League model
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolExpiryWeek" INTEGER;

-- Add mini-game frequency tracking
ALTER TABLE "survivor_league_configs" ADD COLUMN IF NOT EXISTS "minigamesPerWeek" INTEGER DEFAULT 1;
