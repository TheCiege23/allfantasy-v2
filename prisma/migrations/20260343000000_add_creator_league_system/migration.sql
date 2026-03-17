-- Creator League System (PROMPT 141): extend CreatorProfile, add CreatorLeague, CreatorInvite, CreatorLeagueMember, CreatorAnalyticsEvent

-- Extend creator_profiles
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(128);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(128);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(512);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "bannerUrl" VARCHAR(512);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "websiteUrl" VARCHAR(512);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "socialHandles" JSONB;
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "verificationBadge" VARCHAR(32);
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "visibility" VARCHAR(16) NOT NULL DEFAULT 'public';
ALTER TABLE "creator_profiles" ADD COLUMN IF NOT EXISTS "branding" JSONB;

UPDATE "creator_profiles" SET "slug" = "handle" WHERE "slug" IS NULL;
ALTER TABLE "creator_profiles" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "creator_profiles_slug_key" ON "creator_profiles"("slug");
CREATE INDEX IF NOT EXISTS "creator_profiles_slug_idx" ON "creator_profiles"("slug");
CREATE INDEX IF NOT EXISTS "creator_profiles_visibility_idx" ON "creator_profiles"("visibility");

-- CreateTable creator_leagues
CREATE TABLE IF NOT EXISTS "creator_leagues" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "leagueId" VARCHAR(64),
    "bracketLeagueId" VARCHAR(64),
    "name" VARCHAR(256) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "sport" VARCHAR(12) NOT NULL,
    "inviteCode" VARCHAR(32) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "maxMembers" INTEGER NOT NULL DEFAULT 100,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "joinDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_leagues_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "creator_leagues_inviteCode_key" ON "creator_leagues"("inviteCode");
CREATE UNIQUE INDEX "creator_leagues_creatorId_slug_key" ON "creator_leagues"("creatorId", "slug");
CREATE INDEX "creator_leagues_creatorId_idx" ON "creator_leagues"("creatorId");
CREATE INDEX "creator_leagues_inviteCode_idx" ON "creator_leagues"("inviteCode");
CREATE INDEX "creator_leagues_sport_idx" ON "creator_leagues"("sport");
CREATE INDEX "creator_leagues_isPublic_idx" ON "creator_leagues"("isPublic");
ALTER TABLE "creator_leagues" ADD CONSTRAINT "creator_leagues_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable creator_invites
CREATE TABLE IF NOT EXISTS "creator_invites" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorLeagueId" TEXT,
    "code" VARCHAR(32) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "creator_invites_code_key" ON "creator_invites"("code");
CREATE INDEX "creator_invites_creatorId_idx" ON "creator_invites"("creatorId");
CREATE INDEX "creator_invites_code_idx" ON "creator_invites"("code");
ALTER TABLE "creator_invites" ADD CONSTRAINT "creator_invites_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_invites" ADD CONSTRAINT "creator_invites_creatorLeagueId_fkey" FOREIGN KEY ("creatorLeagueId") REFERENCES "creator_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable creator_league_members
CREATE TABLE IF NOT EXISTS "creator_league_members" (
    "id" TEXT NOT NULL,
    "creatorLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedViaCode" VARCHAR(32),

    CONSTRAINT "creator_league_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "creator_league_members_creatorLeagueId_userId_key" ON "creator_league_members"("creatorLeagueId", "userId");
CREATE INDEX "creator_league_members_userId_idx" ON "creator_league_members"("userId");
ALTER TABLE "creator_league_members" ADD CONSTRAINT "creator_league_members_creatorLeagueId_fkey" FOREIGN KEY ("creatorLeagueId") REFERENCES "creator_leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable creator_analytics_events
CREATE TABLE IF NOT EXISTS "creator_analytics_events" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "leagueId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_analytics_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "creator_analytics_events_creatorId_createdAt_idx" ON "creator_analytics_events"("creatorId", "createdAt");
CREATE INDEX "creator_analytics_events_eventType_idx" ON "creator_analytics_events"("eventType");
