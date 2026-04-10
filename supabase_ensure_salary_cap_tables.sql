-- =============================================================================
-- supabase_ensure_salary_cap_tables.sql
-- Salary cap league tables for snake salary scale, contract tracking,
-- and cap management. Safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- Snake salary scale configuration (per league)
CREATE TABLE IF NOT EXISTS "snake_salary_scale_configs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "curveType" TEXT DEFAULT 'steep',
  "totalCap" DOUBLE PRECISION DEFAULT 250,
  "maxSalary" DOUBLE PRECISION DEFAULT 45,
  "minSalary" DOUBLE PRECISION DEFAULT 1,
  "draftRounds" INTEGER DEFAULT 15,
  "teamCount" INTEGER DEFAULT 12,
  "contractYearsByRound" JSONB DEFAULT '{"1":4,"2":3,"3":3,"4":2,"5":2}',
  "customScale" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "snake_salary_scale_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "snake_salary_scale_configs_league_key"
  ON "snake_salary_scale_configs" ("leagueId");

-- Snake salary scale assignments (generated per draft)
CREATE TABLE IF NOT EXISTS "snake_salary_assignments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "overall" INTEGER NOT NULL,
  "round" INTEGER NOT NULL,
  "pick" INTEGER NOT NULL,
  "salary" DOUBLE PRECISION NOT NULL,
  "contractYears" INTEGER NOT NULL,
  "playerId" TEXT,
  "playerName" TEXT,
  "rosterId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "snake_salary_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "snake_salary_assignments_league_idx"
  ON "snake_salary_assignments" ("leagueId");
CREATE INDEX IF NOT EXISTS "snake_salary_assignments_draft_idx"
  ON "snake_salary_assignments" ("draftSessionId");

-- Add snake-specific columns to player_contracts if not present
ALTER TABLE "player_contracts" ADD COLUMN IF NOT EXISTS "draftPickOverall" INTEGER;
ALTER TABLE "player_contracts" ADD COLUMN IF NOT EXISTS "draftRound" INTEGER;
ALTER TABLE "player_contracts" ADD COLUMN IF NOT EXISTS "contractSource" TEXT DEFAULT 'auction';

-- Salary cap draft type tracking (auction vs snake vs hybrid)
ALTER TABLE "salary_cap_league_configs" ADD COLUMN IF NOT EXISTS "draftMode" TEXT DEFAULT 'auction';
ALTER TABLE "salary_cap_league_configs" ADD COLUMN IF NOT EXISTS "snakeSalaryEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "salary_cap_league_configs" ADD COLUMN IF NOT EXISTS "hybridDraftEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "salary_cap_league_configs" ADD COLUMN IF NOT EXISTS "veteranDraftType" TEXT DEFAULT 'auction';
ALTER TABLE "salary_cap_league_configs" ADD COLUMN IF NOT EXISTS "rookieDraftType" TEXT DEFAULT 'snake';
