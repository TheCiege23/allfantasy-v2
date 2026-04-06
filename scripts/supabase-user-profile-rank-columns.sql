-- user_profiles: rank snapshot + career totals (maps to UserProfile in prisma/schema.prisma)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_tier" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_total" BIGINT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "xp_level" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_wins" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_losses" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_championships" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_playoff_appearances" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_seasons_played" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "career_leagues_played" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rank_calculated_at" TIMESTAMPTZ;

-- leagues: per-season career stats from Sleeper import (maps to League @@map("leagues"))
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_wins" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_losses" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_ties" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_points_for" DOUBLE PRECISION;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_points_against" DOUBLE PRECISION;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_made_playoffs" BOOLEAN;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_won_championship" BOOLEAN;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "import_final_standing" INTEGER;
