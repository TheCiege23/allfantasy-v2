-- Remediation migration: adds columns that were defined in earlier migrations
-- but were never applied to the live Supabase instance (baselined without DDL).
-- All statements are idempotent via ADD COLUMN IF NOT EXISTS.

-- leagues: join code and language (originally in 20260416180000)
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "joinCode" VARCHAR(16);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "language" VARCHAR(16) DEFAULT 'en';
CREATE UNIQUE INDEX IF NOT EXISTS "leagues_joinCode_key" ON "leagues"("joinCode") WHERE "joinCode" IS NOT NULL;

-- user_profiles: legacy career snapshot columns (originally in 20260415150000)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_tier" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_tier_name" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_level" INTEGER;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "legacy_career_xp" BIGINT;

-- survivor_league_configs: season theme label for branding/customization
ALTER TABLE "survivor_league_configs" ADD COLUMN IF NOT EXISTS "seasonThemeLabel" VARCHAR(255);
ALTER TABLE "survivor_league_configs" ADD COLUMN IF NOT EXISTS "regularSeasonEndWeek" INTEGER;
ALTER TABLE "survivor_league_configs" ADD COLUMN IF NOT EXISTS "challengesSystemRun" BOOLEAN DEFAULT true;
ALTER TABLE "survivor_league_configs" ADD COLUMN IF NOT EXISTS "faqSeededAt" TIMESTAMP;
