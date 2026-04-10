-- =============================================================================
-- supabase_ensure_ai_personality_tables.sql
-- AI Personality Engine tables. Safe to re-run.
-- =============================================================================

-- AI personality assignments (per AI Manager per league)
CREATE TABLE IF NOT EXISTS "ai_personality_assignments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "teamId" TEXT,
  "managerId" TEXT,
  "archetype" TEXT NOT NULL,
  "displayName" TEXT,
  "intensity" DOUBLE PRECISION DEFAULT 0.7,
  "traitOverrides" JSONB DEFAULT '{}',
  "visualOverrides" JSONB DEFAULT '{}',
  "isActive" BOOLEAN DEFAULT true,
  "assignedBy" TEXT DEFAULT 'system',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_personality_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_personality_assignments_league_idx"
  ON "ai_personality_assignments" ("leagueId");

-- AI personality evolution history
CREATE TABLE IF NOT EXISTS "ai_personality_evolution" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "fromArchetype" TEXT NOT NULL,
  "toArchetype" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "reason" TEXT,
  "week" INTEGER,
  "season" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_personality_evolution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_personality_evolution_assignment_idx"
  ON "ai_personality_evolution" ("assignmentId");

-- AI confessional / narrative logs
CREATE TABLE IF NOT EXISTS "ai_confessional_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "archetype" TEXT,
  "week" INTEGER,
  "confessionalType" TEXT DEFAULT 'standard',
  "content" TEXT NOT NULL,
  "context" JSONB DEFAULT '{}',
  "isPublished" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_confessional_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_confessional_logs_league_idx"
  ON "ai_confessional_logs" ("leagueId");

-- AI personality league settings
CREATE TABLE IF NOT EXISTS "ai_personality_settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "personalitiesEnabled" BOOLEAN DEFAULT true,
  "allowEvolution" BOOLEAN DEFAULT false,
  "publicLabels" BOOLEAN DEFAULT true,
  "recapContentEnabled" BOOLEAN DEFAULT true,
  "confessionalContentEnabled" BOOLEAN DEFAULT false,
  "intensityDefault" DOUBLE PRECISION DEFAULT 0.7,
  "chaosLimit" DOUBLE PRECISION DEFAULT 0.5,
  "realismMode" BOOLEAN DEFAULT false,
  "silentMode" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_personality_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_personality_settings_league_key"
  ON "ai_personality_settings" ("leagueId");
