-- Survivor backend: game state machine, notifications, chat messages, commissioner log, snapshots, weekly score bridge
-- Idempotent FK/constraints: safe to re-run after a failed/partial apply (P3009/P3018 recovery).

CREATE TABLE IF NOT EXISTS "survivor_game_states" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'pre_draft',
    "currentWeek" INTEGER NOT NULL DEFAULT 0,
    "totalTribalCouncils" INTEGER NOT NULL DEFAULT 0,
    "activeTribeCount" INTEGER NOT NULL DEFAULT 0,
    "activePlayerCount" INTEGER NOT NULL DEFAULT 0,
    "exilePlayerCount" INTEGER NOT NULL DEFAULT 0,
    "juryPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "draftCompletedAt" TIMESTAMP(3),
    "preMergeStartedAt" TIMESTAMP(3),
    "mergeTriggeredAt" TIMESTAMP(3),
    "juryStartedAt" TIMESTAMP(3),
    "finaleStartedAt" TIMESTAMP(3),
    "seasonCompletedAt" TIMESTAMP(3),
    "weekStartedAt" TIMESTAMP(3),
    "weekScoringLockedAt" TIMESTAMP(3),
    "weekScoringFinalAt" TIMESTAMP(3),
    "activeChallengeId" TEXT,
    "challengeLockedAt" TIMESTAMP(3),
    "challengeResultAt" TIMESTAMP(3),
    "activeCouncilId" TEXT,
    "tribalOpenedAt" TIMESTAMP(3),
    "tribalDeadline" TIMESTAMP(3),
    "tribalRevealAt" TIMESTAMP(3),
    "tribalCompleteAt" TIMESTAMP(3),
    "immuneTribeId" TEXT,
    "immunePlayerId" TEXT,
    "needsChallengeLock" BOOLEAN NOT NULL DEFAULT false,
    "needsWaiverProcess" BOOLEAN NOT NULL DEFAULT false,
    "needsExileScore" BOOLEAN NOT NULL DEFAULT false,
    "needsTribalLock" BOOLEAN NOT NULL DEFAULT false,
    "needsPhaseAdvance" BOOLEAN NOT NULL DEFAULT false,
    "needsWeeklyRecap" BOOLEAN NOT NULL DEFAULT false,
    "needsPowerRankings" BOOLEAN NOT NULL DEFAULT false,
    "lastAutomationRun" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_game_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_game_states_leagueId_key" ON "survivor_game_states"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_game_states_phase_idx" ON "survivor_game_states"("phase");

DO $$ BEGIN
  ALTER TABLE "survivor_game_states" ADD CONSTRAINT "survivor_game_states_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_phase_transitions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "fromPhase" TEXT NOT NULL,
    "toPhase" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "notes" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_phase_transitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_phase_transitions_leagueId_idx" ON "survivor_phase_transitions"("leagueId");
DO $$ BEGIN
  ALTER TABLE "survivor_phase_transitions" ADD CONSTRAINT "survivor_phase_transitions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_notifications" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "recipientUserId" TEXT,
    "recipientRole" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLinkPath" TEXT,
    "isSpoilerSafe" BOOLEAN NOT NULL DEFAULT true,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_notifications_leagueId_status_idx" ON "survivor_notifications"("leagueId", "status");
CREATE INDEX IF NOT EXISTS "survivor_notifications_recipientUserId_status_idx" ON "survivor_notifications"("recipientUserId", "status");
DO $$ BEGIN
  ALTER TABLE "survivor_notifications" ADD CONSTRAINT "survivor_notifications_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_chat_messages" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderIsHost" BOOLEAN NOT NULL DEFAULT false,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "cardData" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_chat_messages_channelId_createdAt_idx" ON "survivor_chat_messages"("channelId", "createdAt");
CREATE INDEX IF NOT EXISTS "survivor_chat_messages_leagueId_channelType_idx" ON "survivor_chat_messages"("leagueId", "channelType");
DO $$ BEGIN
  ALTER TABLE "survivor_chat_messages" ADD CONSTRAINT "survivor_chat_messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "survivor_chat_messages" ADD CONSTRAINT "survivor_chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "survivor_chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_chat_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_chat_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_chat_reactions_messageId_userId_emoji_key" ON "survivor_chat_reactions"("messageId", "userId", "emoji");
DO $$ BEGIN
  ALTER TABLE "survivor_chat_reactions" ADD CONSTRAINT "survivor_chat_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "survivor_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_commissioner_actions" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "week" INTEGER,
    "actionType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetTribeId" TEXT,
    "description" TEXT NOT NULL,
    "previousState" JSONB,
    "newState" JSONB,
    "wasConfirmed" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_commissioner_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survivor_commissioner_actions_leagueId_idx" ON "survivor_commissioner_actions"("leagueId");
CREATE INDEX IF NOT EXISTS "survivor_commissioner_actions_commissionerId_idx" ON "survivor_commissioner_actions"("commissionerId");
DO $$ BEGIN
  ALTER TABLE "survivor_commissioner_actions" ADD CONSTRAINT "survivor_commissioner_actions_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_season_snapshots" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "season" INTEGER NOT NULL,
    "solesurvivor" JSONB NOT NULL,
    "finalStandings" JSONB NOT NULL,
    "totalWeeks" INTEGER NOT NULL,
    "totalTribes" INTEGER NOT NULL,
    "totalTribalCouncils" INTEGER NOT NULL,
    "totalIdolsPlayed" INTEGER NOT NULL,
    "totalTokensEarned" INTEGER NOT NULL,
    "totalChallenges" INTEGER NOT NULL,
    "hadTie" BOOLEAN NOT NULL,
    "hadRocks" BOOLEAN NOT NULL,
    "firstElimination" JSONB NOT NULL,
    "mergeWeek" INTEGER NOT NULL,
    "exileReturnees" JSONB NOT NULL,
    "juryStartWeek" INTEGER NOT NULL,
    "winnerVoteCount" INTEGER NOT NULL,
    "winnerId" TEXT NOT NULL,
    "episodeSummaries" JSONB NOT NULL,
    "aiSeasonRecap" TEXT,
    "aiChampionArc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "survivor_season_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_season_snapshots_leagueId_key" ON "survivor_season_snapshots"("leagueId");
DO $$ BEGIN
  ALTER TABLE "survivor_season_snapshots" ADD CONSTRAINT "survivor_season_snapshots_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "survivor_weekly_scores" (
    "id" TEXT NOT NULL,
    "leagueId" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "fantasyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointBoostApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointPenaltyApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tribeId" TEXT,
    "countedTowardTribeTotal" BOOLEAN NOT NULL DEFAULT true,
    "wonTribeImmunity" BOOLEAN NOT NULL DEFAULT false,
    "wonIndividualImmunity" BOOLEAN NOT NULL DEFAULT false,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "correctionApplied" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "survivor_weekly_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "survivor_weekly_scores_leagueId_userId_week_key" ON "survivor_weekly_scores"("leagueId", "userId", "week");
CREATE INDEX IF NOT EXISTS "survivor_weekly_scores_leagueId_week_idx" ON "survivor_weekly_scores"("leagueId", "week");
DO $$ BEGIN
  ALTER TABLE "survivor_weekly_scores" ADD CONSTRAINT "survivor_weekly_scores_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Repair AppUser <-> ZombieUniverse relation back-references (required by Prisma)
ALTER TABLE "zombie_universes" ADD COLUMN IF NOT EXISTS "commissionedByUserId" TEXT;
ALTER TABLE "zombie_universes" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
DO $$ BEGIN
  ALTER TABLE "zombie_universes" ADD CONSTRAINT "zombie_universes_commissionedByUserId_fkey" FOREIGN KEY ("commissionedByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "zombie_universes" ADD CONSTRAINT "zombie_universes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
