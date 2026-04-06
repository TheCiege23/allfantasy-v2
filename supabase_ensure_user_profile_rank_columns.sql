-- -----------------------------------------------------------------------------
-- Idempotent: ensure showcase rank columns exist on user_profiles (Supabase may
-- predate Prisma migrations). Run in SQL editor before relying on /api/user/rank.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- -----------------------------------------------------------------------------

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_tier" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_total" BIGINT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_level" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_wins" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_losses" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_championships" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_playoff_appearances" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_seasons_played" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_leagues_played" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_calculated_at" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "league_import_detail_pending" BOOLEAN NOT NULL DEFAULT false;
