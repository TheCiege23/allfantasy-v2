-- Upgrade Creator League System (PROMPT 141)
-- Adds creator community metadata, featured ranking, branded league media,
-- persisted recap fields, invite metadata, and analytics indexes.

ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "creatorType" VARCHAR(32);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "communitySummary" TEXT;
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "communityVisibility" VARCHAR(16) NOT NULL DEFAULT 'public';
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "featuredRank" INTEGER;
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "featuredAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "creator_profiles_featuredRank_idx" ON "creator_profiles"("featuredRank");

ALTER TABLE "creator_leagues" ADD COLUMN IF NOT EXISTS "coverImageUrl" VARCHAR(512);
ALTER TABLE "creator_leagues" ADD COLUMN IF NOT EXISTS "communitySummary" TEXT;
ALTER TABLE "creator_leagues" ADD COLUMN IF NOT EXISTS "latestRecapTitle" VARCHAR(160);
ALTER TABLE "creator_leagues" ADD COLUMN IF NOT EXISTS "latestRecapSummary" TEXT;
ALTER TABLE "creator_leagues" ADD COLUMN IF NOT EXISTS "latestCommentary" TEXT;

ALTER TABLE "creator_invites" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
CREATE INDEX IF NOT EXISTS "creator_invites_creatorLeagueId_createdAt_idx"
  ON "creator_invites"("creatorLeagueId", "createdAt");

CREATE INDEX IF NOT EXISTS "creator_league_members_creatorLeagueId_joinedAt_idx"
  ON "creator_league_members"("creatorLeagueId", "joinedAt");

CREATE INDEX IF NOT EXISTS "creator_analytics_events_creatorId_eventType_createdAt_idx"
  ON "creator_analytics_events"("creatorId", "eventType", "createdAt");

UPDATE "creator_profiles"
SET "communityVisibility" = COALESCE(NULLIF("visibility", ''), 'public')
WHERE "communityVisibility" IS NULL OR "communityVisibility" = '';

UPDATE "creator_leagues"
SET "communitySummary" = "description"
WHERE "communitySummary" IS NULL AND "description" IS NOT NULL;
