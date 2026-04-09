-- =============================================================================
-- supabase_ensure_commissioner_blind_mode.sql
-- Commissioner participation + blind mode fields.
-- =============================================================================

-- Commissioner plays as a regular player (blind mode active)
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorCommissionerPlays" BOOLEAN DEFAULT false;

-- Scope field for challenges (main_island vs exile)
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "scope" TEXT DEFAULT 'main_island';

-- Index for exile-scoped challenges
CREATE INDEX IF NOT EXISTS "survivor_challenges_scope_idx" ON "survivor_challenges" ("leagueId", "scope");
