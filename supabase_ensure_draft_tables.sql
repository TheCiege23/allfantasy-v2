-- =============================================================================
-- supabase_ensure_draft_tables.sql
-- Draft system tables for AI Managers, pick animations, and subscription gating.
-- Safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- AI Manager profiles (up to 4 per league, act as independent drafters)
CREATE TABLE IF NOT EXISTS "ai_manager_profiles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "teamSlot" INTEGER NOT NULL,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "personality" TEXT DEFAULT 'balanced',
  "aggressiveness" DOUBLE PRECISION DEFAULT 0.5,
  "reachTendency" DOUBLE PRECISION DEFAULT 0.3,
  "randomness" DOUBLE PRECISION DEFAULT 0.2,
  "strategyNotes" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_manager_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_manager_profiles_league_idx"
  ON "ai_manager_profiles" ("leagueId");
CREATE INDEX IF NOT EXISTS "ai_manager_profiles_draft_idx"
  ON "ai_manager_profiles" ("draftSessionId");

-- AI Manager personality presets
-- Personalities: balanced, zero_rb, hero_rb, elite_qb, upside_chaser, win_now, youth_build, position_scarcity

-- 1st round pick analysis cache (for animation display)
CREATE TABLE IF NOT EXISTS "draft_pick_analysis" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "draftSessionId" TEXT NOT NULL,
  "pickId" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "pick" INTEGER NOT NULL,
  "overall" INTEGER NOT NULL,
  "playerName" TEXT NOT NULL,
  "position" TEXT,
  "team" TEXT,
  "grade" TEXT,
  "headline" TEXT,
  "reasoning" TEXT,
  "adpDiff" DOUBLE PRECISION DEFAULT 0,
  "positionalRank" INTEGER,
  "positionLabel" TEXT,
  "keyStats" JSONB DEFAULT '[]',
  "comparisons" TEXT[],
  "isAIGenerated" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "draft_pick_analysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "draft_pick_analysis_draft_idx"
  ON "draft_pick_analysis" ("draftSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "draft_pick_analysis_pick_key"
  ON "draft_pick_analysis" ("draftSessionId", "pickId");

-- Subscription feature gates (AF Pro vs AF Commissioner)
CREATE TABLE IF NOT EXISTS "subscription_feature_gates" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "subscriptionTier" TEXT NOT NULL, -- 'af_pro' or 'af_commissioner'
  "featureId" TEXT NOT NULL,
  "isEnabled" BOOLEAN DEFAULT true,
  "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ,
  CONSTRAINT "subscription_feature_gates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_feature_gates_user_feature_key"
  ON "subscription_feature_gates" ("userId", "featureId");
CREATE INDEX IF NOT EXISTS "subscription_feature_gates_tier_idx"
  ON "subscription_feature_gates" ("subscriptionTier");

-- Draft 3RR flag and snake settings (add to existing draft_sessions if not present)
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "thirdRoundReversal" BOOLEAN DEFAULT false;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "draftVariant" TEXT DEFAULT 'snake';
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "aiManagerCount" INTEGER DEFAULT 0;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "firstRoundAnimationEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "slowDraftHoursPerPick" INTEGER;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "overnightPauseEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "overnightPauseStart" TEXT; -- e.g., "22:00"
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "overnightPauseEnd" TEXT; -- e.g., "08:00"
