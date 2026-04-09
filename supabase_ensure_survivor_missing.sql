-- =============================================================================
-- supabase_ensure_survivor_missing.sql
-- Creates ONLY the Survivor tables that don't yet exist in Supabase.
-- Uses snake_case to match existing convention from init migration.
-- Safe to re-run (IF NOT EXISTS everywhere).
-- =============================================================================

-- survivor_players
CREATE TABLE IF NOT EXISTS "survivor_players" (
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
  CONSTRAINT "survivor_players_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_players_leagueId_idx" ON "survivor_players" ("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_players_leagueId_userId_idx" ON "survivor_players" ("leagueId", "userId");

-- survivor_chat_channels
CREATE TABLE IF NOT EXISTS "survivor_chat_channels" (
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
  CONSTRAINT "survivor_chat_channels_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_chat_channels_leagueId_idx" ON "survivor_chat_channels" ("leagueId");

-- survivor_chat_messages
CREATE TABLE IF NOT EXISTS "survivor_chat_messages" (
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
  CONSTRAINT "survivor_chat_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_chat_messages_channelId_createdAt_idx" ON "survivor_chat_messages" ("channelId", "createdAt");
CREATE INDEX IF NOT EXISTS "survivor_chat_messages_leagueId_idx" ON "survivor_chat_messages" ("leagueId");

-- survivor_chat_reactions
CREATE TABLE IF NOT EXISTS "survivor_chat_reactions" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survivor_chat_reactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_chat_reactions_messageId_idx" ON "survivor_chat_reactions" ("messageId");

-- survivor_game_states
CREATE TABLE IF NOT EXISTS "survivor_game_states" (
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
  "weekStartedAt" TIMESTAMPTZ,
  "weekScoringLockedAt" TIMESTAMPTZ,
  "weekScoringFinalAt" TIMESTAMPTZ,
  "activeChallengeId" TEXT,
  "challengeLockedAt" TIMESTAMPTZ,
  "challengeResultAt" TIMESTAMPTZ,
  "activeCouncilId" TEXT,
  "tribalOpenedAt" TIMESTAMPTZ,
  "tribalDeadline" TIMESTAMPTZ,
  "tribalRevealAt" TIMESTAMPTZ,
  "tribalCompleteAt" TIMESTAMPTZ,
  "immuneTribeId" TEXT,
  "immunePlayerId" TEXT,
  "needsChallengeLock" BOOLEAN DEFAULT false,
  "needsWaiverProcess" BOOLEAN DEFAULT false,
  "needsExileScore" BOOLEAN DEFAULT false,
  "needsTribalLock" BOOLEAN DEFAULT false,
  "needsPhaseAdvance" BOOLEAN DEFAULT false,
  "needsWeeklyRecap" BOOLEAN DEFAULT false,
  "needsPowerRankings" BOOLEAN DEFAULT false,
  "lastAutomationRun" TIMESTAMPTZ,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survivor_game_states_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_game_states_leagueId_key" ON "survivor_game_states" ("leagueId");

-- survivor_host_messages
CREATE TABLE IF NOT EXISTS "survivor_host_messages" (
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
  CONSTRAINT "survivor_host_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_host_messages_leagueId_idx" ON "survivor_host_messages" ("leagueId");

-- survivor_phase_transitions
CREATE TABLE IF NOT EXISTS "survivor_phase_transitions" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "fromPhase" TEXT,
  "toPhase" TEXT,
  "week" INTEGER,
  "triggeredBy" TEXT,
  "triggeredByUserId" TEXT,
  "notes" TEXT,
  "executedAt" TIMESTAMPTZ,
  CONSTRAINT "survivor_phase_transitions_pkey" PRIMARY KEY ("id")
);

-- survivor_notifications
CREATE TABLE IF NOT EXISTS "survivor_notifications" (
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
  CONSTRAINT "survivor_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_notifications_leagueId_status_idx" ON "survivor_notifications" ("leagueId", "status");

-- survivor_weekly_scores
CREATE TABLE IF NOT EXISTS "survivor_weekly_scores" (
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
  CONSTRAINT "survivor_weekly_scores_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_weekly_scores_leagueId_week_idx" ON "survivor_weekly_scores" ("leagueId", "week");

-- survivor_season_snapshots
CREATE TABLE IF NOT EXISTS "survivor_season_snapshots" (
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
  CONSTRAINT "survivor_season_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_season_snapshots_leagueId_key" ON "survivor_season_snapshots" ("leagueId");

-- survivor_audit_entries
CREATE TABLE IF NOT EXISTS "survivor_audit_entries" (
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
  CONSTRAINT "survivor_audit_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "survivor_audit_entries_leagueId_week_idx" ON "survivor_audit_entries" ("leagueId", "week");

-- survivor_power_templates (seed data table)
CREATE TABLE IF NOT EXISTS "survivor_power_templates" (
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
  CONSTRAINT "survivor_power_templates_pkey" PRIMARY KEY ("id")
);

-- survivor_challenge_templates (seed data table)
CREATE TABLE IF NOT EXISTS "survivor_challenge_templates" (
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
  CONSTRAINT "survivor_challenge_templates_pkey" PRIMARY KEY ("id")
);

-- survivor_season_arc_templates
CREATE TABLE IF NOT EXISTS "survivor_season_arc_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "playerCount" INTEGER NOT NULL,
  "tribeCount" INTEGER NOT NULL,
  "description" TEXT,
  "arcSteps" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survivor_season_arc_templates_pkey" PRIMARY KEY ("id")
);

-- survivor_tribe_swaps
CREATE TABLE IF NOT EXISTS "survivor_tribe_swaps" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER,
  "swapType" TEXT,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "newTribes" JSONB,
  "originalTribesRetained" BOOLEAN DEFAULT false,
  "executedAt" TIMESTAMPTZ,
  CONSTRAINT "survivor_tribe_swaps_pkey" PRIMARY KEY ("id")
);

-- survivor_power_balances
CREATE TABLE IF NOT EXISTS "survivor_power_balances" (
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
  CONSTRAINT "survivor_power_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_power_balances_leagueId_key" ON "survivor_power_balances" ("leagueId");

-- survivor_twist_events
CREATE TABLE IF NOT EXISTS "survivor_twist_events" (
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
  CONSTRAINT "survivor_twist_events_pkey" PRIMARY KEY ("id")
);

-- exile_islands
CREATE TABLE IF NOT EXISTS "exile_islands" (
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
  CONSTRAINT "exile_islands_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "exile_islands_leagueId_idx" ON "exile_islands" ("leagueId");

-- exile_weekly_entries
CREATE TABLE IF NOT EXISTS "exile_weekly_entries" (
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
  CONSTRAINT "exile_weekly_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "exile_weekly_entries_exileId_week_idx" ON "exile_weekly_entries" ("exileId", "week");

-- token_pool_picks
CREATE TABLE IF NOT EXISTS "token_pool_picks" (
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
  CONSTRAINT "token_pool_picks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "token_pool_picks_leagueId_userId_week_idx" ON "token_pool_picks" ("leagueId", "userId", "week");

-- jury_sessions
CREATE TABLE IF NOT EXISTS "jury_sessions" (
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
  CONSTRAINT "jury_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "jury_sessions_leagueId_key" ON "jury_sessions" ("leagueId");

-- jury_votes
CREATE TABLE IF NOT EXISTS "jury_votes" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "jurorUserId" TEXT NOT NULL,
  "finalistUserId" TEXT NOT NULL,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isLate" BOOLEAN DEFAULT false,
  CONSTRAINT "jury_votes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "jury_votes_sessionId_idx" ON "jury_votes" ("sessionId");

-- Add missing columns to League table for survivor
-- (League table already exists, just add columns)
DO $$ BEGIN
  ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "survivorMode" BOOLEAN DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
