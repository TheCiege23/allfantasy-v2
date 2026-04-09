-- =============================================================================
-- supabase_ensure_survivor_tables.sql
-- Comprehensive idempotent SQL for all Survivor League tables.
-- Safe to re-run. Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS everywhere.
-- Run via: Supabase SQL Editor > New Query > Paste > Run
-- =============================================================================

-- ============================================================
-- SECTION 1: League-level Survivor columns
-- ============================================================
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorMode" BOOLEAN DEFAULT false;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorPhase" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorPlayerCount" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorTribeCount" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorTribeSize" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorTribeNaming" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorMergeWeek" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorMergeTrigger" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorMergeAtCount" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorJuryStart" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorFinal3" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorSwapWeek" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorSwapTrigger" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorIdolsEnabled" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorIdolCount" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorIdolsTradable" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorIdolsExpireAtMerge" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorIdolConvertRule" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorExileEnabled" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorTokenEnabled" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorBossResetEnabled" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorExileReturnWeek" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorExileReturnTrigger" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorSelfVoteAllowed" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorTieRule" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorRocksEnabled" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorRevealMode" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorChallengeMode" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorDailyMessages" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorWeeklyMessages" BOOLEAN;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorChatPermissions" TEXT;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorRebalanceTrigger" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorTokenCap" INTEGER;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "survivorExileHarshTokenLoss" BOOLEAN;

-- ============================================================
-- SECTION 2: SurvivorLeagueConfig
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorLeagueConfig" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "mode" TEXT DEFAULT 'redraft',
  "tribeCount" INTEGER DEFAULT 4,
  "tribeSize" INTEGER DEFAULT 5,
  "tribeFormation" TEXT DEFAULT 'random',
  "mergeTrigger" TEXT DEFAULT 'player_count',
  "mergeWeek" INTEGER,
  "mergePlayerCount" INTEGER DEFAULT 10,
  "juryStartAfterMerge" BOOLEAN DEFAULT true,
  "exileReturnEnabled" BOOLEAN DEFAULT true,
  "exileReturnTokens" INTEGER DEFAULT 3,
  "idolCount" INTEGER DEFAULT 9,
  "idolPowerPool" JSONB,
  "tribeShuffleEnabled" BOOLEAN DEFAULT false,
  "tribeShuffleConsecutiveLosses" INTEGER,
  "tribeShuffleImbalanceThreshold" INTEGER,
  "voteDeadlineDayOfWeek" INTEGER,
  "voteDeadlineTimeUtc" TEXT,
  "selfVoteDisallowed" BOOLEAN DEFAULT true,
  "tribalCouncilDayOfWeek" INTEGER,
  "tribalCouncilTimeUtc" TEXT,
  "minigameFrequency" TEXT DEFAULT 'weekly',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorLeagueConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SurvivorLeagueConfig_leagueId_key" ON "SurvivorLeagueConfig" ("leagueId");

-- ============================================================
-- SECTION 3: SurvivorTribe
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorTribe" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "configId" TEXT,
  "name" TEXT NOT NULL,
  "slotIndex" INTEGER NOT NULL DEFAULT 0,
  "logoUrl" TEXT,
  "colorHex" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "isMerged" BOOLEAN DEFAULT false,
  "phase" TEXT DEFAULT 'pre_merge',
  "chatChannelId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorTribe_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorTribe_leagueId_idx" ON "SurvivorTribe" ("leagueId");

-- ============================================================
-- SECTION 4: SurvivorTribeMember
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorTribeMember" (
  "id" TEXT NOT NULL,
  "tribeId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "isLeader" BOOLEAN DEFAULT false,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorTribeMember_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorTribeMember_tribeId_idx" ON "SurvivorTribeMember" ("tribeId");

-- ============================================================
-- SECTION 5: SurvivorPlayer
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorPlayer" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "tribeId" TEXT,
  "playerState" TEXT DEFAULT 'active',
  "eliminatedWeek" INTEGER,
  "eliminationRound" INTEGER,
  "idolIds" TEXT[] DEFAULT '{}',
  "tokenBalance" INTEGER DEFAULT 0,
  "totalTokensEarned" INTEGER DEFAULT 0,
  "hasImmunityThisWeek" BOOLEAN DEFAULT false,
  "immunitySource" TEXT,
  "exileReturnEligible" BOOLEAN DEFAULT false,
  "exileWeeksServed" INTEGER DEFAULT 0,
  "redraftRosterId" TEXT,
  "canAccessTribeChat" BOOLEAN DEFAULT true,
  "canAccessMergeChat" BOOLEAN DEFAULT false,
  "canAccessExileChat" BOOLEAN DEFAULT false,
  "canAccessJuryChat" BOOLEAN DEFAULT false,
  "canAccessFinaleChat" BOOLEAN DEFAULT false,
  "isJuryMember" BOOLEAN DEFAULT false,
  "isFinalist" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorPlayer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorPlayer_leagueId_idx" ON "SurvivorPlayer" ("leagueId");
CREATE INDEX IF NOT EXISTS "SurvivorPlayer_leagueId_userId_idx" ON "SurvivorPlayer" ("leagueId", "userId");

-- ============================================================
-- SECTION 6: SurvivorIdol
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorIdol" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "configId" TEXT,
  "rosterId" TEXT,
  "playerId" TEXT,
  "powerType" TEXT NOT NULL,
  "powerCategory" TEXT,
  "powerLabel" TEXT,
  "powerDesc" TEXT,
  "currentOwnerUserId" TEXT,
  "originalOwnerUserId" TEXT,
  "isSecret" BOOLEAN DEFAULT true,
  "isPubliclyKnown" BOOLEAN DEFAULT false,
  "isTradable" BOOLEAN DEFAULT false,
  "transferHistory" JSONB DEFAULT '[]',
  "playWindowRule" TEXT,
  "rarity" TEXT,
  "expiresAtMerge" BOOLEAN DEFAULT true,
  "expiresAtWeek" INTEGER,
  "usedAtCouncilId" TEXT,
  "isUsed" BOOLEAN DEFAULT false,
  "status" TEXT DEFAULT 'hidden',
  "assignedAt" TIMESTAMPTZ,
  "usedAt" TIMESTAMPTZ,
  "expiredAt" TIMESTAMPTZ,
  "validUntilPhase" TEXT,
  "auditLog" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorIdol_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorIdol_leagueId_idx" ON "SurvivorIdol" ("leagueId");
CREATE INDEX IF NOT EXISTS "SurvivorIdol_currentOwnerUserId_idx" ON "SurvivorIdol" ("currentOwnerUserId");

-- ============================================================
-- SECTION 7: SurvivorIdolLedgerEntry
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorIdolLedgerEntry" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "idolId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "fromRosterId" TEXT,
  "toRosterId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorIdolLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorIdolLedgerEntry_idolId_idx" ON "SurvivorIdolLedgerEntry" ("idolId");

-- ============================================================
-- SECTION 8: SurvivorTribalCouncil
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorTribalCouncil" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "configId" TEXT,
  "week" INTEGER NOT NULL,
  "councilNumber" INTEGER,
  "phase" TEXT,
  "attendingTribeId" TEXT,
  "status" TEXT DEFAULT 'pending',
  "votingOpensAt" TIMESTAMPTZ,
  "voteDeadlineAt" TIMESTAMPTZ,
  "votingDeadline" TIMESTAMPTZ,
  "revealStartsAt" TIMESTAMPTZ,
  "closedAt" TIMESTAMPTZ,
  "eliminatedRosterId" TEXT,
  "eliminatedUserId" TEXT,
  "eliminatedName" TEXT,
  "isTie" BOOLEAN DEFAULT false,
  "tiePhase" TEXT,
  "tiePlayerIds" TEXT[] DEFAULT '{}',
  "rockDrawerUserId" TEXT,
  "idolsPlayed" JSONB DEFAULT '[]',
  "nullifiersPlayed" JSONB DEFAULT '[]',
  "doesNotCountVoteIds" TEXT[] DEFAULT '{}',
  "revealSequence" JSONB,
  "isRevealed" BOOLEAN DEFAULT false,
  "auditLog" JSONB,
  "tieBreakSeasonPoints" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorTribalCouncil_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorTribalCouncil_leagueId_week_idx" ON "SurvivorTribalCouncil" ("leagueId", "week");

-- ============================================================
-- SECTION 9: SurvivorVote
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorVote" (
  "id" TEXT NOT NULL,
  "councilId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "voterRosterId" TEXT NOT NULL,
  "targetRosterId" TEXT NOT NULL,
  "voterUserId" TEXT,
  "targetUserId" TEXT,
  "voterName" TEXT,
  "targetName" TEXT,
  "isDoubleVote" BOOLEAN DEFAULT false,
  "doesNotCount" BOOLEAN DEFAULT false,
  "nullifiedBy" TEXT,
  "isLateVote" BOOLEAN DEFAULT false,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorVote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorVote_councilId_idx" ON "SurvivorVote" ("councilId");

-- ============================================================
-- SECTION 10: SurvivorChallenge
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorChallenge" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "configId" TEXT,
  "week" INTEGER NOT NULL,
  "challengeNumber" INTEGER,
  "challengeType" TEXT,
  "type" TEXT,
  "title" TEXT,
  "description" TEXT,
  "instructions" TEXT,
  "scope" TEXT,
  "submissionMode" TEXT,
  "configJson" JSONB,
  "lockAt" TIMESTAMPTZ,
  "locksAt" TIMESTAMPTZ,
  "closesAt" TIMESTAMPTZ,
  "status" TEXT DEFAULT 'pending',
  "rewardType" TEXT,
  "rewardAmount" INTEGER,
  "rewardDetails" JSONB,
  "penaltyType" TEXT,
  "penaltyDetails" JSONB,
  "winnerUserIds" TEXT[] DEFAULT '{}',
  "winnerTribeId" TEXT,
  "resultSummary" TEXT,
  "auditLog" JSONB,
  "resultJson" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorChallenge_leagueId_week_idx" ON "SurvivorChallenge" ("leagueId", "week");

-- ============================================================
-- SECTION 11: SurvivorChallengeSubmission
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorChallengeSubmission" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT,
  "rosterId" TEXT,
  "tribeId" TEXT,
  "submission" JSONB,
  "isCorrect" BOOLEAN DEFAULT false,
  "pointsEarned" DOUBLE PRECISION DEFAULT 0,
  "isLocked" BOOLEAN DEFAULT false,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorChallengeSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorChallengeSubmission_challengeId_idx" ON "SurvivorChallengeSubmission" ("challengeId");

-- ============================================================
-- SECTION 12: SurvivorChatChannel
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorChatChannel" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channelType" TEXT NOT NULL,
  "tribeId" TEXT,
  "memberUserIds" TEXT[] DEFAULT '{}',
  "readOnlyUserIds" TEXT[] DEFAULT '{}',
  "isArchived" BOOLEAN DEFAULT false,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorChatChannel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorChatChannel_leagueId_idx" ON "SurvivorChatChannel" ("leagueId");

-- ============================================================
-- SECTION 13: SurvivorChatMessage
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorChatMessage" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "channelType" TEXT,
  "senderUserId" TEXT,
  "senderName" TEXT,
  "senderIsHost" BOOLEAN DEFAULT false,
  "isSystemMessage" BOOLEAN DEFAULT false,
  "content" TEXT NOT NULL,
  "contentType" TEXT DEFAULT 'text',
  "cardData" JSONB,
  "isPinned" BOOLEAN DEFAULT false,
  "pinnedAt" TIMESTAMPTZ,
  "pinnedBy" TEXT,
  "isDeleted" BOOLEAN DEFAULT false,
  "deletedAt" TIMESTAMPTZ,
  "deletedBy" TEXT,
  "editedAt" TIMESTAMPTZ,
  "reactions" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorChatMessage_channelId_createdAt_idx" ON "SurvivorChatMessage" ("channelId", "createdAt");
CREATE INDEX IF NOT EXISTS "SurvivorChatMessage_leagueId_idx" ON "SurvivorChatMessage" ("leagueId");

-- ============================================================
-- SECTION 14: SurvivorGameState
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorGameState" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "phase" TEXT NOT NULL DEFAULT 'pre_draft',
  "currentWeek" INTEGER DEFAULT 0,
  "totalTribalCouncils" INTEGER DEFAULT 0,
  "activeTribeCount" INTEGER DEFAULT 0,
  "activePlayerCount" INTEGER DEFAULT 0,
  "exilePlayerCount" INTEGER DEFAULT 0,
  "juryPlayerCount" INTEGER DEFAULT 0,
  "draftCompletedAt" TIMESTAMPTZ,
  "preMergeStartedAt" TIMESTAMPTZ,
  "mergeTriggeredAt" TIMESTAMPTZ,
  "juryStartedAt" TIMESTAMPTZ,
  "finaleStartedAt" TIMESTAMPTZ,
  "seasonCompletedAt" TIMESTAMPTZ,
  "lastAutomationRun" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorGameState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SurvivorGameState_leagueId_key" ON "SurvivorGameState" ("leagueId");

-- ============================================================
-- SECTION 15: Exile Island tables
-- ============================================================
CREATE TABLE IF NOT EXISTS "ExileIsland" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "currentWeek" INTEGER DEFAULT 0,
  "bossName" TEXT,
  "bossRosterId" TEXT,
  "bossWinsEnabled" BOOLEAN DEFAULT true,
  "bossTokenResetOnWin" BOOLEAN DEFAULT true,
  "chatChannelId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExileIsland_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExileIsland_leagueId_idx" ON "ExileIsland" ("leagueId");

CREATE TABLE IF NOT EXISTS "ExileWeeklyEntry" (
  "id" TEXT NOT NULL,
  "exileId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "submittedLineup" JSONB,
  "weeklyScore" DOUBLE PRECISION DEFAULT 0,
  "bossScore" DOUBLE PRECISION DEFAULT 0,
  "bossWon" BOOLEAN DEFAULT false,
  "tokenEarned" BOOLEAN DEFAULT false,
  "tokenWiped" BOOLEAN DEFAULT false,
  CONSTRAINT "ExileWeeklyEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExileWeeklyEntry_exileId_week_idx" ON "ExileWeeklyEntry" ("exileId", "week");

CREATE TABLE IF NOT EXISTS "SurvivorExileToken" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "tokens" INTEGER DEFAULT 0,
  "lastAwardedWeek" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorExileToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorExileLeague" (
  "id" TEXT NOT NULL,
  "mainLeagueId" TEXT NOT NULL,
  "configId" TEXT,
  "exileLeagueId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorExileLeague_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- SECTION 16: Token Pool + Jury
-- ============================================================
CREATE TABLE IF NOT EXISTS "TokenPoolPick" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "sport" TEXT,
  "pickType" TEXT,
  "pick" JSONB,
  "isCorrect" BOOLEAN DEFAULT false,
  "tokensEarned" INTEGER DEFAULT 0,
  "tokensLost" INTEGER DEFAULT 0,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TokenPoolPick_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TokenPoolPick_leagueId_userId_week_idx" ON "TokenPoolPick" ("leagueId", "userId", "week");

CREATE TABLE IF NOT EXISTS "JurySession" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "finalistUserIds" TEXT[] DEFAULT '{}',
  "jurorUserIds" TEXT[] DEFAULT '{}',
  "questionsDeadline" TIMESTAMPTZ,
  "votingDeadline" TIMESTAMPTZ,
  "votes" JSONB DEFAULT '[]',
  "winnerId" TEXT,
  "winnerName" TEXT,
  "revealedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JurySession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JurySession_leagueId_key" ON "JurySession" ("leagueId");

CREATE TABLE IF NOT EXISTS "JuryVote" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "jurorUserId" TEXT NOT NULL,
  "finalistUserId" TEXT NOT NULL,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isLate" BOOLEAN DEFAULT false,
  CONSTRAINT "JuryVote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "JuryVote_sessionId_idx" ON "JuryVote" ("sessionId");

-- ============================================================
-- SECTION 17: Audit, Notifications, Scoring
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorAuditEntry" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER,
  "category" TEXT,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "targetTribeId" TEXT,
  "relatedEntityId" TEXT,
  "relatedEntityType" TEXT,
  "data" JSONB,
  "isVisibleToCommissioner" BOOLEAN DEFAULT true,
  "isVisibleToPublic" BOOLEAN DEFAULT false,
  "isRevealablePostSeason" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorAuditEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorAuditEntry_leagueId_week_idx" ON "SurvivorAuditEntry" ("leagueId", "week");

CREATE TABLE IF NOT EXISTS "SurvivorWeeklyScore" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "fantasyScore" DOUBLE PRECISION DEFAULT 0,
  "pointBoostApplied" DOUBLE PRECISION DEFAULT 0,
  "pointPenaltyApplied" DOUBLE PRECISION DEFAULT 0,
  "finalScore" DOUBLE PRECISION DEFAULT 0,
  "tribeId" TEXT,
  "countedTowardTribeTotal" BOOLEAN DEFAULT true,
  "wonTribeImmunity" BOOLEAN DEFAULT false,
  "wonIndividualImmunity" BOOLEAN DEFAULT false,
  "isFinalized" BOOLEAN DEFAULT false,
  "finalizedAt" TIMESTAMPTZ,
  "correctionApplied" BOOLEAN DEFAULT false,
  CONSTRAINT "SurvivorWeeklyScore_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorWeeklyScore_leagueId_week_idx" ON "SurvivorWeeklyScore" ("leagueId", "week");

CREATE TABLE IF NOT EXISTS "SurvivorNotification" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "recipientRole" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "deepLinkPath" TEXT,
  "isSpoilerSafe" BOOLEAN DEFAULT false,
  "urgency" TEXT DEFAULT 'medium',
  "status" TEXT DEFAULT 'pending',
  "scheduledFor" TIMESTAMPTZ,
  "sentAt" TIMESTAMPTZ,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorNotification_leagueId_status_idx" ON "SurvivorNotification" ("leagueId", "status");

-- ============================================================
-- SECTION 18: Templates (seed data tables)
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorPowerTemplate" (
  "id" TEXT NOT NULL,
  "powerType" TEXT NOT NULL,
  "powerLabel" TEXT,
  "powerCategory" TEXT,
  "description" TEXT,
  "exactBehavior" TEXT,
  "useWindow" TEXT,
  "phaseValidity" TEXT,
  "targetType" TEXT,
  "isSecret" BOOLEAN DEFAULT true,
  "expirationRule" TEXT,
  "isTradable" BOOLEAN DEFAULT false,
  "riskLevel" TEXT,
  "recommendedFreq" TEXT,
  "maxPerSeason" INTEGER,
  "maxPerPlayer" INTEGER,
  "maxConcurrentLeague" INTEGER,
  "abusePreventionRules" TEXT,
  "revealBehavior" TEXT,
  "aiValidationRequired" BOOLEAN DEFAULT false,
  "auditRequirements" TEXT,
  "isDraftDefault" BOOLEAN DEFAULT false,
  "isAdvanced" BOOLEAN DEFAULT false,
  "isDisadvantage" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorPowerTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorChallengeTemplate" (
  "id" TEXT NOT NULL,
  "challengeKey" TEXT NOT NULL,
  "name" TEXT,
  "theme" TEXT,
  "category" TEXT,
  "scope" TEXT,
  "inputDescription" TEXT,
  "submissionChannel" TEXT,
  "deadlineBehavior" TEXT,
  "tiebreakerRule" TEXT,
  "defaultRewardType" TEXT,
  "defaultPenaltyType" TEXT,
  "affectsImmunity" BOOLEAN DEFAULT false,
  "affectsFaab" BOOLEAN DEFAULT false,
  "grantsIdol" BOOLEAN DEFAULT false,
  "grantsDisadvantage" BOOLEAN DEFAULT false,
  "aiCanAutoGenerate" BOOLEAN DEFAULT true,
  "commissionerApprovalRecommended" BOOLEAN DEFAULT false,
  "phaseValidity" TEXT,
  "sportAdaptation" JSONB,
  "notes" TEXT,
  "extraMetadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorChallengeTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorSeasonArcTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playerCount" INTEGER NOT NULL,
  "tribeCount" INTEGER NOT NULL,
  "description" TEXT,
  "arcSteps" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorSeasonArcTemplate_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- SECTION 19: Misc supporting tables
-- ============================================================
CREATE TABLE IF NOT EXISTS "SurvivorHostMessage" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "channelType" TEXT,
  "tribeId" TEXT,
  "targetUserId" TEXT,
  "messageType" TEXT,
  "content" TEXT,
  "isPosted" BOOLEAN DEFAULT false,
  "postedAt" TIMESTAMPTZ,
  "requiresApproval" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorHostMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorHostMessage_leagueId_idx" ON "SurvivorHostMessage" ("leagueId");

CREATE TABLE IF NOT EXISTS "SurvivorTribeSwap" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER,
  "swapType" TEXT,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "newTribes" JSONB,
  "originalTribesRetained" BOOLEAN DEFAULT false,
  "executedAt" TIMESTAMPTZ,
  CONSTRAINT "SurvivorTribeSwap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorPhaseTransition" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "fromPhase" TEXT,
  "toPhase" TEXT,
  "week" INTEGER,
  "triggeredBy" TEXT,
  "triggeredByUserId" TEXT,
  "notes" TEXT,
  "executedAt" TIMESTAMPTZ,
  CONSTRAINT "SurvivorPhaseTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorSeasonSnapshot" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER,
  "solesurvivor" TEXT,
  "finalStandings" JSONB,
  "totalWeeks" INTEGER,
  "totalTribes" INTEGER,
  "totalTribalCouncils" INTEGER,
  "totalIdolsPlayed" INTEGER DEFAULT 0,
  "totalTokensEarned" INTEGER DEFAULT 0,
  "totalChallenges" INTEGER DEFAULT 0,
  "hadTie" BOOLEAN DEFAULT false,
  "hadRocks" BOOLEAN DEFAULT false,
  "firstElimination" TEXT,
  "mergeWeek" INTEGER,
  "exileReturnees" TEXT[] DEFAULT '{}',
  "juryStartWeek" INTEGER,
  "winnerVoteCount" INTEGER,
  "winnerId" TEXT,
  "episodeSummaries" JSONB,
  "aiSeasonRecap" TEXT,
  "aiChampionArc" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorSeasonSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SurvivorSeasonSnapshot_leagueId_key" ON "SurvivorSeasonSnapshot" ("leagueId");

CREATE TABLE IF NOT EXISTS "SurvivorTribeChatMember" (
  "id" TEXT NOT NULL,
  "tribeId" TEXT NOT NULL,
  "rosterId" TEXT,
  "userId" TEXT,
  "isAiHost" BOOLEAN DEFAULT false,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorTribeChatMember_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorTribeChatMember_tribeId_idx" ON "SurvivorTribeChatMember" ("tribeId");

CREATE TABLE IF NOT EXISTS "SurvivorPowerBalance" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "activePowerCount" INTEGER DEFAULT 0,
  "immunityPowerCount" INTEGER DEFAULT 0,
  "voteControlCount" INTEGER DEFAULT 0,
  "scorePowerCount" INTEGER DEFAULT 0,
  "tribeControlCount" INTEGER DEFAULT 0,
  "infoPowerCount" INTEGER DEFAULT 0,
  "powersByPlayer" JSONB DEFAULT '{}',
  "lastUpdated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorPowerBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SurvivorPowerBalance_leagueId_key" ON "SurvivorPowerBalance" ("leagueId");

CREATE TABLE IF NOT EXISTS "SurvivorTwistEvent" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER,
  "twistType" TEXT,
  "description" TEXT,
  "affectedPlayerIds" TEXT[] DEFAULT '{}',
  "affectedTribeIds" TEXT[] DEFAULT '{}',
  "wasAutoTriggered" BOOLEAN DEFAULT false,
  "commissionerNote" TEXT,
  "executedAt" TIMESTAMPTZ,
  CONSTRAINT "SurvivorTwistEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorJuryMember" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "votedOutWeek" INTEGER,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorJuryMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SurvivorAuditLog" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "configId" TEXT,
  "eventType" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorAuditLog_leagueId_idx" ON "SurvivorAuditLog" ("leagueId");

CREATE TABLE IF NOT EXISTS "SurvivorChatReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurvivorChatReaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SurvivorChatReaction_messageId_idx" ON "SurvivorChatReaction" ("messageId");
