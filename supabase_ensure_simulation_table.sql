-- =============================================================================
-- supabase_ensure_simulation_table.sql
-- Admin league simulation run tracking table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "league_simulation_runs" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leagueType" TEXT NOT NULL,
  "leagueVariant" TEXT,
  "sport" TEXT,
  "status" TEXT NOT NULL DEFAULT 'running',
  "report" JSONB,
  "weeksSimulated" INTEGER DEFAULT 0,
  "playerCount" INTEGER DEFAULT 0,
  "champion" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ,
  CONSTRAINT "league_simulation_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "league_simulation_runs_leagueId_idx" ON "league_simulation_runs" ("leagueId");
CREATE INDEX IF NOT EXISTS "league_simulation_runs_userId_idx" ON "league_simulation_runs" ("userId");
