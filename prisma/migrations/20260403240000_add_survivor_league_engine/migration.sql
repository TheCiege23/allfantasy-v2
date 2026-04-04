-- Survivor league engine: League flags, extended survivor tables, new session tables.

DROP INDEX IF EXISTS "survivor_challenges_configId_week_challengeType_key";
DROP INDEX IF EXISTS "survivor_tribal_councils_configId_week_key";

ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorBossResetEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorChallengeMode" TEXT DEFAULT 'auto';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorChatPermissions" TEXT DEFAULT 'strict';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorDailyMessages" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorExileEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorExileReturnTrigger" TEXT DEFAULT 'manual';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorExileReturnWeek" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorFinal3" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolConvertRule" TEXT DEFAULT 'faab';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolCount" INTEGER DEFAULT 9;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolsEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolsExpireAtMerge" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorIdolsTradable" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorJuryStart" TEXT DEFAULT 'post_merge_vote_1';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorMergeAtCount" INTEGER DEFAULT 10;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorMergeTrigger" TEXT DEFAULT 'week';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorMergeWeek" INTEGER DEFAULT 7;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorMode" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorPhase" TEXT DEFAULT 'pre_draft';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorPlayerCount" INTEGER DEFAULT 20;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorRebalanceTrigger" INTEGER DEFAULT 3;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorRevealMode" TEXT DEFAULT 'dramatic_sequential';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorRocksEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorSelfVoteAllowed" BOOLEAN DEFAULT false;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorSwapTrigger" TEXT DEFAULT 'manual';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorSwapWeek" INTEGER;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorTieRule" TEXT DEFAULT 'revote_then_rocks';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorTokenEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorTribeCount" INTEGER DEFAULT 4;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorTribeNaming" TEXT DEFAULT 'auto';
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorTribeSize" INTEGER DEFAULT 5;
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorWeeklyMessages" BOOLEAN DEFAULT true;

ALTER TABLE "survivor_challenge_submissions" ADD COLUMN IF NOT EXISTS "isCorrect" BOOLEAN;
ALTER TABLE "survivor_challenge_submissions" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_challenge_submissions" ADD COLUMN IF NOT EXISTS "leagueId" VARCHAR(64);
ALTER TABLE "survivor_challenge_submissions" ADD COLUMN IF NOT EXISTS "pointsEarned" DOUBLE PRECISION;
ALTER TABLE "survivor_challenge_submissions" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(64);

ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "auditLog" JSONB;
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "challengeNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "closesAt" TIMESTAMP(3);
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "instructions" TEXT NOT NULL DEFAULT '';
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "locksAt" TIMESTAMP(3);
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "penaltyDetails" JSONB;
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "penaltyType" VARCHAR(64);
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "resultSummary" TEXT;
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "rewardAmount" DOUBLE PRECISION;
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "rewardDetails" JSONB;
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "rewardType" VARCHAR(64);
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "scope" VARCHAR(24) NOT NULL DEFAULT 'tribe';
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "status" VARCHAR(24) NOT NULL DEFAULT 'open';
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "submissionMode" VARCHAR(32) NOT NULL DEFAULT 'tribe_chat';
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "type" VARCHAR(64);
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "winnerTribeId" VARCHAR(64);
ALTER TABLE "survivor_challenges" ADD COLUMN IF NOT EXISTS "winnerUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "auditLog" JSONB;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "currentOwnerUserId" VARCHAR(64);
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "expiresAtMerge" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "expiresAtWeek" INTEGER;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isPubliclyKnown" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isSecret" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isTradable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "isUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "originalOwnerUserId" VARCHAR(64);
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "playWindowRule" VARCHAR(32) NOT NULL DEFAULT 'before_reveal';
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "powerCategory" VARCHAR(64);
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "powerDesc" TEXT;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "powerLabel" VARCHAR(160);
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "rarity" VARCHAR(24) NOT NULL DEFAULT 'common';
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "transferHistory" JSONB;
ALTER TABLE "survivor_idols" ADD COLUMN IF NOT EXISTS "usedAtCouncilId" VARCHAR(64);

ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "auditLog" JSONB;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "councilNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "doesNotCountVoteIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "eliminatedName" VARCHAR(160);
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "eliminatedUserId" VARCHAR(64);
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "idolsPlayed" JSONB;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "isRevealed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "isTie" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "nullifiersPlayed" JSONB;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "revealSequence" JSONB;
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "revealStartsAt" TIMESTAMP(3);
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "rockDrawerUserId" VARCHAR(64);
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "status" VARCHAR(24) NOT NULL DEFAULT 'pending';
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "tiePhase" VARCHAR(32);
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "tiePlayerIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "votingDeadline" TIMESTAMP(3);
ALTER TABLE "survivor_tribal_councils" ADD COLUMN IF NOT EXISTS "votingOpensAt" TIMESTAMP(3);

ALTER TABLE "survivor_tribes" ADD COLUMN IF NOT EXISTS "chatChannelId" TEXT;
ALTER TABLE "survivor_tribes" ADD COLUMN IF NOT EXISTS "colorHex" TEXT;
ALTER TABLE "survivor_tribes" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "survivor_tribes" ADD COLUMN IF NOT EXISTS "isMerged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_tribes" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "survivor_tribes" ADD COLUMN IF NOT EXISTS "phase" VARCHAR(24) NOT NULL DEFAULT 'pre_merge';

ALTER TABLE "survivor_votes" DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "doesNotCount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "isDoubleVote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "isLateVote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "leagueId" VARCHAR(64);
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "nullifiedBy" VARCHAR(64);
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "targetName" VARCHAR(160);
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "targetUserId" VARCHAR(64);
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "voterName" VARCHAR(160);
ALTER TABLE "survivor_votes" ADD COLUMN IF NOT EXISTS "voterUserId" VARCHAR(64);

UPDATE "survivor_votes" v SET "leagueId" = c."leagueId" FROM "survivor_tribal_councils" c WHERE v."councilId" = c."id" AND (v."leagueId" IS NULL OR v."leagueId" = '');

CREATE TABLE IF NOT EXISTS "survivor_players" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "tribeId" TEXT,
    "playerState" TEXT NOT NULL DEFAULT 'active',
    "eliminatedWeek" INTEGER,
    "eliminationRound" INTEGER,
    "idolIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenBalance" INTEGER NOT NULL DEFAULT 0,
    "totalTokensEarned" INTEGER NOT NULL DEFAULT 0,
    "hasImmunityThisWeek" BOOLEAN NOT NULL DEFAULT false,
    "immunitySource" TEXT,
    "exileReturnEligible" BOOLEAN NOT NULL DEFAULT false,
    "exileWeeksServed" INTEGER NOT NULL DEFAULT 0,
    "redraftRosterId" TEXT,
    "canAccessTribeChat" BOOLEAN NOT NULL DEFAULT true,
    "canAccessMergeChat" BOOLEAN NOT NULL DEFAULT false,
    "canAccessExileChat" BOOLEAN NOT NULL DEFAULT false,
    "canAccessJuryChat" BOOLEAN NOT NULL DEFAULT false,
    "canAccessFinaleChat" BOOLEAN NOT NULL DEFAULT false,
    "isJuryMember" BOOLEAN NOT NULL DEFAULT false,
    "isFinalist" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_players_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_jury_sessions" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "finalistUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jurorUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionsDeadline" TIMESTAMP(3),
    "votingDeadline" TIMESTAMP(3),
    "winnerId" TEXT,
    "winnerName" TEXT,
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_jury_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_jury_votes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "jurorUserId" TEXT NOT NULL,
    "finalistUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "survivor_jury_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_host_messages" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "tribeId" TEXT,
    "targetUserId" TEXT,
    "messageType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPosted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_host_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_chat_channels" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "tribeId" TEXT,
    "memberUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readOnlyUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_chat_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_tribe_swaps" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "swapType" TEXT NOT NULL DEFAULT 'random_shuffle',
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "newTribes" JSONB,
    "originalTribesRetained" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_tribe_swaps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_token_pool_picks" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "sport" TEXT NOT NULL,
    "pickType" TEXT NOT NULL,
    "pick" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "tokensEarned" INTEGER NOT NULL DEFAULT 0,
    "tokensLost" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_token_pool_picks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_exile_islands" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "bossName" TEXT DEFAULT 'The Exile Boss',
    "bossRosterId" TEXT,
    "bossWinsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bossTokenResetOnWin" BOOLEAN NOT NULL DEFAULT true,
    "chatChannelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survivor_exile_islands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "survivor_exile_weekly_entries" (
    "id" TEXT NOT NULL,
    "exileId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "submittedLineup" JSONB,
    "weeklyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bossScore" DOUBLE PRECISION,
    "bossWon" BOOLEAN NOT NULL DEFAULT false,
    "tokenEarned" INTEGER NOT NULL DEFAULT 0,
    "tokenWiped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "survivor_exile_weekly_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_players_leagueId_playerState_idx" ON "survivor_players"("leagueId", "playerState");
CREATE INDEX IF NOT EXISTS "survivor_players_tribeId_idx" ON "survivor_players"("tribeId");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_players_leagueId_userId_key" ON "survivor_players"("leagueId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_jury_sessions_leagueId_key" ON "survivor_jury_sessions"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_jury_votes_sessionId_idx" ON "survivor_jury_votes"("sessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_jury_votes_sessionId_jurorUserId_key" ON "survivor_jury_votes"("sessionId", "jurorUserId");
CREATE INDEX IF NOT EXISTS "survivor_host_messages_leagueId_channelType_idx" ON "survivor_host_messages"("leagueId", "channelType");
CREATE INDEX IF NOT EXISTS "survivor_chat_channels_leagueId_channelType_idx" ON "survivor_chat_channels"("leagueId", "channelType");
CREATE INDEX IF NOT EXISTS "survivor_tribe_swaps_leagueId_idx" ON "survivor_tribe_swaps"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_token_pool_picks_leagueId_userId_week_idx" ON "survivor_token_pool_picks"("leagueId", "userId", "week");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_islands_leagueId_key" ON "survivor_exile_islands"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_exile_islands_leagueId_idx" ON "survivor_exile_islands"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_exile_weekly_entries_exileId_week_idx" ON "survivor_exile_weekly_entries"("exileId", "week");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_exile_weekly_entries_exileId_userId_week_key" ON "survivor_exile_weekly_entries"("exileId", "userId", "week");

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenge_submissions_challengeId_userId_key" ON "survivor_challenge_submissions"("challengeId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_challenges_configId_week_challengeNumber_challenge_key" ON "survivor_challenges"("configId", "week", "challengeNumber", "challengeType");
CREATE INDEX IF NOT EXISTS "survivor_idols_leagueId_currentOwnerUserId_idx" ON "survivor_idols"("leagueId", "currentOwnerUserId");
CREATE INDEX IF NOT EXISTS "survivor_idols_leagueId_powerType_idx" ON "survivor_idols"("leagueId", "powerType");
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_tribal_councils_configId_week_councilNumber_key" ON "survivor_tribal_councils"("configId", "week", "councilNumber");
CREATE INDEX IF NOT EXISTS "survivor_votes_voterUserId_idx" ON "survivor_votes"("voterUserId");
CREATE INDEX IF NOT EXISTS "survivor_votes_leagueId_idx" ON "survivor_votes"("leagueId");

DO $$ BEGIN
  ALTER TABLE "survivor_players" ADD CONSTRAINT "survivor_players_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_players" ADD CONSTRAINT "survivor_players_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "survivor_tribes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_jury_sessions" ADD CONSTRAINT "survivor_jury_sessions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_jury_votes" ADD CONSTRAINT "survivor_jury_votes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "survivor_jury_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_host_messages" ADD CONSTRAINT "survivor_host_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_chat_channels" ADD CONSTRAINT "survivor_chat_channels_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_tribe_swaps" ADD CONSTRAINT "survivor_tribe_swaps_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_token_pool_picks" ADD CONSTRAINT "survivor_token_pool_picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_exile_islands" ADD CONSTRAINT "survivor_exile_islands_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_exile_weekly_entries" ADD CONSTRAINT "survivor_exile_weekly_entries_exileId_fkey" FOREIGN KEY ("exileId") REFERENCES "survivor_exile_islands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
