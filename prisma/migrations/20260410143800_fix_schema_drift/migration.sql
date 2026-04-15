-- Fix schema drift: add missing columns and tables that schema.prisma expects but DB lacks

-- 1. SportsDataCache: missing sport, dataType, updatedAt
ALTER TABLE "SportsDataCache"
ADD COLUMN IF NOT EXISTS "sport" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "dataType" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "SportsDataCache_sport_dataType_expiresAt_idx" ON "SportsDataCache"("sport", "dataType", "expiresAt");

-- 2. UserProfile: missing legacy rank fields
ALTER TABLE "user_profiles"
ADD COLUMN IF NOT EXISTS "legacyCareerLevel" INTEGER,
ADD COLUMN IF NOT EXISTS "legacyCareerTier" INTEGER,
ADD COLUMN IF NOT EXISTS "legacyCareerTierName" TEXT,
ADD COLUMN IF NOT EXISTS "legacyCareerXp" BIGINT,
ADD COLUMN IF NOT EXISTS "legacyRankUpdatedAt" TIMESTAMP(3);

-- 3. DispersalDraft (@@map supplemental_drafts)
CREATE TABLE IF NOT EXISTS "supplemental_drafts" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "scenario" VARCHAR(32) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "participantRosterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "passedRosterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "draftOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentPickIndex" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 0,
    "picksPerRound" INTEGER NOT NULL DEFAULT 0,
    "sourceRosterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assetPool" JSONB NOT NULL DEFAULT '[]',
    "orderMode" VARCHAR(24) NOT NULL DEFAULT 'randomized',
    "draftType" VARCHAR(16) NOT NULL DEFAULT 'linear',
    "pickTimeSeconds" INTEGER NOT NULL DEFAULT 120,
    "autoPickOnTimeout" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplemental_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplemental_drafts_leagueId_status_idx" ON "supplemental_drafts"("leagueId", "status");

-- 4. DispersalDraftPick (@@map supplemental_draft_picks)
CREATE TABLE IF NOT EXISTS "supplemental_draft_picks" (
    "id" TEXT NOT NULL,
    "supplementalDraftId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "pickInRound" INTEGER NOT NULL,
    "rosterId" TEXT NOT NULL,
    "assetType" VARCHAR(24),
    "assetId" VARCHAR(128),
    "assetDisplayName" VARCHAR(256),
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "isAutoPick" BOOLEAN NOT NULL DEFAULT false,
    "pickedAt" TIMESTAMP(3),

    CONSTRAINT "supplemental_draft_picks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "supplemental_draft_picks_draftId_pickNumber_key" ON "supplemental_draft_picks"("supplementalDraftId", "pickNumber");
CREATE INDEX IF NOT EXISTS "supplemental_draft_picks_draftId_rosterId_idx" ON "supplemental_draft_picks"("supplementalDraftId", "rosterId");

-- 5. DispersalDraftRoster (@@map dispersal_draft_rosters)
CREATE TABLE IF NOT EXISTS "dispersal_draft_rosters" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "players" JSONB NOT NULL DEFAULT '[]',
    "draftSlot" INTEGER,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "ineligibilityReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispersal_draft_rosters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispersal_draft_rosters_draftId_userId_key" ON "dispersal_draft_rosters"("draftId", "userId");
CREATE INDEX IF NOT EXISTS "dispersal_draft_rosters_draftId_idx" ON "dispersal_draft_rosters"("draftId");

-- 6. DispersalAssetPool (@@map dispersal_asset_pool)
CREATE TABLE IF NOT EXISTS "dispersal_asset_pool" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerPosition" TEXT,
    "playerTeam" TEXT,
    "playerAge" INTEGER,
    "sourceRosterId" TEXT,
    "sourcePlatform" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "pickedInPickId" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispersal_asset_pool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispersal_asset_pool_draftId_playerId_key" ON "dispersal_asset_pool"("draftId", "playerId");
CREATE INDEX IF NOT EXISTS "dispersal_asset_pool_draftId_idx" ON "dispersal_asset_pool"("draftId");
CREATE INDEX IF NOT EXISTS "dispersal_asset_pool_isAvailable_idx" ON "dispersal_asset_pool"("isAvailable");

-- 7. DispersalDraftParticipant (@@map dispersal_draft_participants)
CREATE TABLE IF NOT EXISTS "dispersal_draft_participants" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "teamName" TEXT,
    "draftSlot" INTEGER,
    "isCommissioner" BOOLEAN NOT NULL DEFAULT false,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isOnTheClock" BOOLEAN NOT NULL DEFAULT false,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispersal_draft_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dispersal_draft_participants_draftId_userId_key" ON "dispersal_draft_participants"("draftId", "userId");
CREATE INDEX IF NOT EXISTS "dispersal_draft_participants_draftId_idx" ON "dispersal_draft_participants"("draftId");

-- Foreign keys
ALTER TABLE "supplemental_drafts" ADD CONSTRAINT "supplemental_drafts_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplemental_drafts" ADD CONSTRAINT "supplemental_drafts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplemental_draft_picks" ADD CONSTRAINT "supplemental_draft_picks_supplementalDraftId_fkey" FOREIGN KEY ("supplementalDraftId") REFERENCES "supplemental_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispersal_draft_rosters" ADD CONSTRAINT "dispersal_draft_rosters_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "supplemental_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispersal_asset_pool" ADD CONSTRAINT "dispersal_asset_pool_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "supplemental_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispersal_draft_participants" ADD CONSTRAINT "dispersal_draft_participants_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "supplemental_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
