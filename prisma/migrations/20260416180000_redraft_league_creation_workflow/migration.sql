-- Redraft-only league creation workflow: normalized rows + join code / language on leagues.

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "joinCode" VARCHAR(16);
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "language" VARCHAR(16) DEFAULT 'en';

CREATE UNIQUE INDEX IF NOT EXISTS "leagues_joinCode_key" ON "leagues"("joinCode") WHERE "joinCode" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "redraft_league_extended_settings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "commissionerTradeReviewType" TEXT NOT NULL DEFAULT 'commissioner',
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "scoringTypeDefault" TEXT,
    "waiverTypeDefault" TEXT,
    "rosterPresetKey" TEXT,
    "playoffPresetKey" TEXT,
    "draftTimerSecondsDefault" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowInviteLinks" BOOLEAN NOT NULL DEFAULT true,
    "settingsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "redraft_league_extended_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_league_extended_settings_leagueId_key" ON "redraft_league_extended_settings"("leagueId");

CREATE TABLE IF NOT EXISTS "redraft_league_draft_profiles" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "draftType" TEXT NOT NULL,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "rounds" INTEGER NOT NULL DEFAULT 15,
    "timerSeconds" INTEGER,
    "orderMode" TEXT,
    "auctionBudget" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "draftStatus" TEXT NOT NULL DEFAULT 'pre_draft',
    "configJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "redraft_league_draft_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_league_draft_profiles_leagueId_key" ON "redraft_league_draft_profiles"("leagueId");

CREATE TABLE IF NOT EXISTS "redraft_league_homepage_states" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "activeTab" TEXT NOT NULL DEFAULT 'overview',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "draftRoomEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "homepageConfigJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "redraft_league_homepage_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_league_homepage_states_leagueId_key" ON "redraft_league_homepage_states"("leagueId");

CREATE TABLE IF NOT EXISTS "redraft_league_sport_integrations" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "sportVariant" TEXT,
    "standingsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "schedulesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "injuriesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weatherEnabled" BOOLEAN NOT NULL DEFAULT false,
    "playerPoolSource" TEXT,
    "gameFeedSource" TEXT,
    "integrationConfigJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "redraft_league_sport_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_league_sport_integrations_leagueId_key" ON "redraft_league_sport_integrations"("leagueId");

CREATE TABLE IF NOT EXISTS "redraft_league_chat_rooms" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "roomType" TEXT NOT NULL DEFAULT 'league',
    "title" TEXT NOT NULL DEFAULT 'League chat',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redraft_league_chat_rooms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "redraft_league_chat_rooms_leagueId_idx" ON "redraft_league_chat_rooms"("leagueId");

CREATE TABLE IF NOT EXISTS "league_entry_slots" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "rosterId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "league_entry_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "league_entry_slots_leagueId_slotNumber_key" ON "league_entry_slots"("leagueId", "slotNumber");
CREATE INDEX IF NOT EXISTS "league_entry_slots_leagueId_idx" ON "league_entry_slots"("leagueId");

CREATE TABLE IF NOT EXISTS "redraft_league_members" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COMMISSIONER',
    "teamNumber" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "redraft_league_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "redraft_league_members_leagueId_userId_key" ON "redraft_league_members"("leagueId", "userId");
CREATE INDEX IF NOT EXISTS "redraft_league_members_userId_idx" ON "redraft_league_members"("userId");

ALTER TABLE "redraft_league_extended_settings" ADD CONSTRAINT "redraft_league_extended_settings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redraft_league_draft_profiles" ADD CONSTRAINT "redraft_league_draft_profiles_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redraft_league_homepage_states" ADD CONSTRAINT "redraft_league_homepage_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redraft_league_sport_integrations" ADD CONSTRAINT "redraft_league_sport_integrations_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redraft_league_chat_rooms" ADD CONSTRAINT "redraft_league_chat_rooms_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_entry_slots" ADD CONSTRAINT "league_entry_slots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redraft_league_members" ADD CONSTRAINT "redraft_league_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
