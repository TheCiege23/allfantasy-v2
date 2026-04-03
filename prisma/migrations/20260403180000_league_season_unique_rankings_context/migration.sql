-- League: one row per (user, platform, platformLeagueId, season)
-- Backfill null seasons before enforcing NOT NULL
UPDATE "leagues" SET "season" = EXTRACT(YEAR FROM CURRENT_DATE)::int WHERE "season" IS NULL;

-- Drop old unique constraint
DROP INDEX IF EXISTS "leagues_userId_platform_platformLeagueId_key";

-- Add composite unique including season
CREATE UNIQUE INDEX "leagues_userId_platform_platformLeagueId_season_key" ON "leagues"("userId", "platform", "platformLeagueId", "season");

-- Default for new rows
ALTER TABLE "leagues" ALTER COLUMN "season" SET DEFAULT 2024;
ALTER TABLE "leagues" ALTER COLUMN "season" SET NOT NULL;

-- User profile: rankings context JSON (post-import aggregation)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "rankingsContext" JSONB;
