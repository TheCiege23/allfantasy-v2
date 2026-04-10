-- =============================================================================
-- supabase_ensure_redraft_tables.sql
-- Redraft league automation tables for Supabase. Safe to re-run (IF NOT EXISTS).
-- =============================================================================

-- Redraft season configuration (automation settings per season)
CREATE TABLE IF NOT EXISTS "redraft_season_config" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "seasonId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "sport" TEXT NOT NULL,

  -- Waiver configuration
  "waiverType" TEXT DEFAULT 'faab',
  "faabBudget" INTEGER DEFAULT 100,
  "waiverProcessDays" INTEGER[] DEFAULT '{3}',
  "waiverProcessTimeUtc" TEXT DEFAULT '10:00',
  "waiverResetMode" TEXT DEFAULT 'never',
  "freeAgentLockHours" INTEGER DEFAULT 0,
  "continuousWaivers" BOOLEAN DEFAULT false,

  -- Trade configuration
  "tradeDeadlineWeek" INTEGER DEFAULT 11,
  "tradeReviewMode" TEXT DEFAULT 'commissioner',
  "tradeReviewPeriodHours" INTEGER DEFAULT 24,
  "tradeVetoThreshold" INTEGER DEFAULT 4,
  "allowDraftPickTrades" BOOLEAN DEFAULT false,
  "allowFaabTrades" BOOLEAN DEFAULT false,

  -- Playoff configuration
  "playoffTeams" INTEGER DEFAULT 6,
  "playoffStartWeek" INTEGER DEFAULT 15,
  "playoffRoundWeeks" INTEGER DEFAULT 1,
  "consolationBracket" BOOLEAN DEFAULT true,
  "thirdPlaceGame" BOOLEAN DEFAULT false,
  "playoffReseeding" BOOLEAN DEFAULT false,

  -- Scoring configuration
  "matchupFormat" TEXT DEFAULT 'h2h_points',
  "medianScoring" BOOLEAN DEFAULT false,
  "divisionsEnabled" BOOLEAN DEFAULT false,
  "divisionCount" INTEGER DEFAULT 0,

  -- Schedule
  "regularSeasonWeeks" INTEGER DEFAULT 14,
  "scheduleType" TEXT DEFAULT 'round_robin',
  "byeWeeksEnabled" BOOLEAN DEFAULT false,

  -- Automation flags
  "autoProcessWaivers" BOOLEAN DEFAULT true,
  "autoLockLineups" BOOLEAN DEFAULT true,
  "autoAdvanceWeek" BOOLEAN DEFAULT true,
  "autoGeneratePlayoffs" BOOLEAN DEFAULT true,
  "autoApplyStatCorrections" BOOLEAN DEFAULT true,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redraft_season_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "redraft_season_config_seasonId_key"
  ON "redraft_season_config" ("seasonId");
CREATE INDEX IF NOT EXISTS "redraft_season_config_leagueId_idx"
  ON "redraft_season_config" ("leagueId");

-- Redraft automation run log (tracks when automation last ran for each season)
CREATE TABLE IF NOT EXISTS "redraft_automation_runs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "seasonId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "runType" TEXT NOT NULL, -- 'scoring_sync', 'waiver_process', 'week_advance', 'playoff_seed', 'stat_correction'
  "status" TEXT DEFAULT 'complete',
  "processedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationMs" INTEGER,
  "details" JSONB DEFAULT '{}',
  "errors" TEXT[],
  CONSTRAINT "redraft_automation_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "redraft_automation_runs_season_idx"
  ON "redraft_automation_runs" ("seasonId", "week");

-- AI insights storage (for AF Commissioner Subscription features)
CREATE TABLE IF NOT EXISTS "redraft_ai_insights" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "insightType" TEXT NOT NULL, -- 'power_rankings', 'matchup_preview', 'weekly_recap', 'waiver_advice', 'trade_analysis', 'start_sit', 'player_insight'
  "rosterId" TEXT,
  "content" JSONB NOT NULL DEFAULT '{}',
  "modelUsed" TEXT,
  "tokensUsed" INTEGER,
  "isPublished" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redraft_ai_insights_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "redraft_ai_insights_league_week_idx"
  ON "redraft_ai_insights" ("leagueId", "seasonId", "week");
CREATE INDEX IF NOT EXISTS "redraft_ai_insights_type_idx"
  ON "redraft_ai_insights" ("insightType");

-- League notification preferences (per-user per-league)
CREATE TABLE IF NOT EXISTS "league_notification_prefs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameStartReminders" BOOLEAN DEFAULT true,
  "waiverResults" BOOLEAN DEFAULT true,
  "tradeUpdates" BOOLEAN DEFAULT true,
  "injuryAlerts" BOOLEAN DEFAULT true,
  "weeklyRecap" BOOLEAN DEFAULT true,
  "matchupAlerts" BOOLEAN DEFAULT true,
  "playoffAlerts" BOOLEAN DEFAULT true,
  "aiInsights" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_notification_prefs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "league_notification_prefs_league_user_key"
  ON "league_notification_prefs" ("leagueId", "userId");

-- AF Commissioner Subscription tracking
CREATE TABLE IF NOT EXISTS "af_commissioner_subscriptions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT,
  "plan" TEXT DEFAULT 'monthly',
  "status" TEXT DEFAULT 'active',
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ,
  "cancelledAt" TIMESTAMPTZ,
  "stripeSubscriptionId" TEXT,
  "features" TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "af_commissioner_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "af_commissioner_subscriptions_user_idx"
  ON "af_commissioner_subscriptions" ("userId");
CREATE INDEX IF NOT EXISTS "af_commissioner_subscriptions_league_idx"
  ON "af_commissioner_subscriptions" ("leagueId");
