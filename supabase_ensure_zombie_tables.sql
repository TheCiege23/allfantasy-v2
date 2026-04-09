-- =============================================================================
-- supabase_ensure_zombie_tables.sql
-- Zombie League tables for Supabase. Safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- Add any missing league-level zombie columns
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "leagueVariant" TEXT;

-- ZombieLeagueConfig (already exists from alter_all, ensure columns)
CREATE TABLE IF NOT EXISTS "zombie_league_configs" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "whispererSelection" TEXT DEFAULT 'random',
  "infectionLossToWhisperer" BOOLEAN DEFAULT true,
  "infectionLossToZombie" BOOLEAN DEFAULT true,
  "serumReviveCount" INTEGER DEFAULT 2,
  "ambushCountPerWeek" INTEGER DEFAULT 1,
  "zombieTradeBlocked" BOOLEAN DEFAULT true,
  "isPaid" BOOLEAN DEFAULT false,
  "buyInAmount" DOUBLE PRECISION DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_league_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_league_configs_leagueId_key" ON "zombie_league_configs" ("leagueId");

-- ZombieLeague
CREATE TABLE IF NOT EXISTS "zombie_leagues" (
  "id" TEXT NOT NULL,
  "universeId" TEXT,
  "levelId" TEXT,
  "leagueId" TEXT,
  "name" TEXT,
  "slug" TEXT,
  "sport" TEXT,
  "season" INTEGER,
  "status" TEXT DEFAULT 'active',
  "teamCount" INTEGER DEFAULT 12,
  "currentTeamCount" INTEGER DEFAULT 12,
  "whispererSelectionMode" TEXT DEFAULT 'random',
  "whispererAmbushCount" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_leagues_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "zombie_leagues_leagueId_key" ON "zombie_leagues" ("leagueId");

-- ZombieLeagueTeam
CREATE TABLE IF NOT EXISTS "zombie_league_teams" (
  "id" TEXT NOT NULL,
  "zombieLeagueId" TEXT NOT NULL,
  "rosterIdFK" TEXT,
  "status" TEXT DEFAULT 'Survivor',
  "weekBecameZombie" INTEGER,
  "killedByRosterId" TEXT,
  "revivedAt" TIMESTAMPTZ,
  "weekKilledBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_league_teams_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "zombie_league_teams_leagueId_idx" ON "zombie_league_teams" ("zombieLeagueId");

-- ZombieUniverse
CREATE TABLE IF NOT EXISTS "zombie_universes" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "sport" TEXT,
  "status" TEXT DEFAULT 'setup',
  "settings" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_universes_pkey" PRIMARY KEY ("id")
);

-- ZombieInfectionEvent
CREATE TABLE IF NOT EXISTS "zombie_infection_events" (
  "id" TEXT NOT NULL,
  "zombieLeagueId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "infectorUserId" TEXT,
  "infectorStatus" TEXT,
  "victimUserId" TEXT,
  "victimPriorStatus" TEXT,
  "victimNewStatus" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zombie_infection_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "zombie_infection_events_leagueId_idx" ON "zombie_infection_events" ("zombieLeagueId");
