-- =============================================================================
-- supabase_ensure_survivor_ui_tables.sql
-- UI-specific tables for Survivor League notification preferences and state.
-- Safe to re-run (IF NOT EXISTS everywhere).
-- =============================================================================

-- Survivor notification preferences per user per league
CREATE TABLE IF NOT EXISTS "survivor_notification_preferences" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "challengePosted" BOOLEAN DEFAULT true,
  "challengeClosingSoon" BOOLEAN DEFAULT true,
  "voteReminder" BOOLEAN DEFAULT true,
  "voteReceived" BOOLEAN DEFAULT true,
  "idolReceived" BOOLEAN DEFAULT true,
  "idolExpiring" BOOLEAN DEFAULT true,
  "tribalTonight" BOOLEAN DEFAULT true,
  "mergeAnnounced" BOOLEAN DEFAULT true,
  "exileChallengeLive" BOOLEAN DEFAULT true,
  "tokenEarned" BOOLEAN DEFAULT true,
  "tokenWiped" BOOLEAN DEFAULT true,
  "juryVotingOpen" BOOLEAN DEFAULT true,
  "finalistQuestionReminder" BOOLEAN DEFAULT true,
  "winnerRevealLive" BOOLEAN DEFAULT true,
  "spoilerSafeMode" BOOLEAN DEFAULT false,
  "quietDuringReveal" BOOLEAN DEFAULT true,
  "reducedMotion" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survivor_notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_notification_prefs_league_user_key"
  ON "survivor_notification_preferences" ("leagueId", "userId");

-- Commissioner UI preferences for Survivor leagues
CREATE TABLE IF NOT EXISTS "survivor_commissioner_ui_prefs" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastSettingsTab" TEXT DEFAULT 'setup',
  "autoPostHostMessages" BOOLEAN DEFAULT true,
  "requireApprovalForTwists" BOOLEAN DEFAULT true,
  "showAuditOverlay" BOOLEAN DEFAULT false,
  "challengeApprovalMode" TEXT DEFAULT 'auto',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survivor_commissioner_ui_prefs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_commissioner_ui_prefs_league_user_key"
  ON "survivor_commissioner_ui_prefs" ("leagueId", "userId");

-- Chat read state tracking per user per channel
CREATE TABLE IF NOT EXISTS "survivor_chat_read_states" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unreadCount" INTEGER DEFAULT 0,
  CONSTRAINT "survivor_chat_read_states_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_chat_read_states_channel_user_key"
  ON "survivor_chat_read_states" ("channelId", "userId");

-- Survivor season episode summaries (for Episodes/History screen)
CREATE TABLE IF NOT EXISTS "survivor_episode_summaries" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "title" TEXT,
  "summary" TEXT,
  "challengeTitle" TEXT,
  "winningTribeOrPlayer" TEXT,
  "losingTribeOrPlayer" TEXT,
  "votedOutPlayer" TEXT,
  "idolsPlayed" TEXT[] DEFAULT '{}',
  "twistDescription" TEXT,
  "aiRecap" TEXT,
  "isFinalized" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "survivor_episode_summaries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "survivor_episode_summaries_league_week_key"
  ON "survivor_episode_summaries" ("leagueId", "week");
