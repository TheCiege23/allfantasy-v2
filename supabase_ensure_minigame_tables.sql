-- =============================================================================
-- supabase_ensure_minigame_tables.sql
-- Reusable mini-game engine tables. Safe to re-run.
-- =============================================================================

-- Mini-game instances (live games per league per week)
CREATE TABLE IF NOT EXISTS "minigame_instances" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "definitionId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "phase" TEXT,
  "state" TEXT DEFAULT 'scheduled',
  "participantIds" TEXT[] DEFAULT '{}',
  "startedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  "lockedAt" TIMESTAMPTZ,
  "winnerId" TEXT,
  "winnerIds" TEXT[] DEFAULT '{}',
  "results" JSONB DEFAULT '[]',
  "metadata" JSONB DEFAULT '{}',
  "overrideReason" TEXT,
  "overrideBy" TEXT,
  "randomSeed" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_instances_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "minigame_instances_league_idx"
  ON "minigame_instances" ("leagueId", "week");

-- Mini-game participant inputs
CREATE TABLE IF NOT EXISTS "minigame_inputs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "instanceId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "displayName" TEXT,
  "inputs" JSONB NOT NULL DEFAULT '{}',
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_inputs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "minigame_inputs_instance_idx"
  ON "minigame_inputs" ("instanceId");

-- Mini-game results (resolved outcomes)
CREATE TABLE IF NOT EXISTS "minigame_results" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "instanceId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "displayName" TEXT,
  "score" DOUBLE PRECISION DEFAULT 0,
  "rank" INTEGER DEFAULT 0,
  "isWinner" BOOLEAN DEFAULT false,
  "isSafe" BOOLEAN DEFAULT false,
  "breakdown" JSONB DEFAULT '[]',
  "tiebrokenBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_results_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "minigame_results_instance_idx"
  ON "minigame_results" ("instanceId");

-- Mini-game reward assignments
CREATE TABLE IF NOT EXISTS "minigame_rewards" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "instanceId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "rewardType" TEXT NOT NULL,
  "description" TEXT,
  "expiresAtWeek" INTEGER,
  "metadata" JSONB DEFAULT '{}',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_rewards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "minigame_rewards_instance_idx"
  ON "minigame_rewards" ("instanceId");

-- Mini-game penalty assignments
CREATE TABLE IF NOT EXISTS "minigame_penalties" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "instanceId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "penaltyType" TEXT NOT NULL,
  "description" TEXT,
  "expiresAtWeek" INTEGER,
  "metadata" JSONB DEFAULT '{}',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_penalties_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "minigame_penalties_instance_idx"
  ON "minigame_penalties" ("instanceId");

-- Mini-game audit log
CREATE TABLE IF NOT EXISTS "minigame_audit_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "instanceId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT,
  "details" TEXT,
  "previousState" TEXT,
  "newState" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "minigame_audit_logs_instance_idx"
  ON "minigame_audit_logs" ("instanceId");

-- Mini-game league settings (commissioner config)
CREATE TABLE IF NOT EXISTS "minigame_league_settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "autoSelectEnabled" BOOLEAN DEFAULT true,
  "manualSelectionEnabled" BOOLEAN DEFAULT true,
  "randomModifierAllowed" BOOLEAN DEFAULT true,
  "defaultRandomWeight" DOUBLE PRECISION DEFAULT 0.1,
  "revealTiming" TEXT DEFAULT 'immediate',
  "aiHostEnabled" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "minigame_league_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "minigame_league_settings_league_key"
  ON "minigame_league_settings" ("leagueId");
