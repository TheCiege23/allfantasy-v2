-- =============================================================================
-- supabase_ensure_chimmy_enhancements.sql
-- Tables for Chimmy AI enhancements: weekly briefings, league health,
-- dynasty outlook, injury feeds, and proactive messaging.
-- =============================================================================

-- Weekly briefing cache (generated per manager per week)
CREATE TABLE IF NOT EXISTS "chimmy_weekly_briefings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "week" INTEGER NOT NULL,
  "season" INTEGER NOT NULL,
  "content" JSONB NOT NULL DEFAULT '{}',
  "isDelivered" BOOLEAN DEFAULT false,
  "deliveredAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chimmy_weekly_briefings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "chimmy_weekly_briefings_key"
  ON "chimmy_weekly_briefings" ("leagueId", "teamId", "week", "season");

-- League health snapshots (commissioner dashboard data)
CREATE TABLE IF NOT EXISTS "league_health_snapshots" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "week" INTEGER NOT NULL,
  "totalManagers" INTEGER DEFAULT 0,
  "activeManagers" INTEGER DEFAULT 0,
  "lineupSetRate" DOUBLE PRECISION DEFAULT 0,
  "tradeActivity" INTEGER DEFAULT 0,
  "waiverActivity" INTEGER DEFAULT 0,
  "chatActivity" INTEGER DEFAULT 0,
  "healthScore" INTEGER DEFAULT 0,
  "healthLabel" TEXT DEFAULT 'healthy',
  "recommendations" TEXT[] DEFAULT '{}',
  "inactiveManagers" TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_health_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "league_health_snapshots_league_idx"
  ON "league_health_snapshots" ("leagueId", "season");

-- Dynasty manager outlook cache (3-5 year projections per manager)
CREATE TABLE IF NOT EXISTS "dynasty_manager_outlooks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "season" INTEGER NOT NULL,
  "teamPhase" TEXT NOT NULL,
  "confidenceLevel" INTEGER DEFAULT 50,
  "rosterAnalysis" JSONB DEFAULT '{}',
  "draftCapital" JSONB DEFAULT '{}',
  "activityPatterns" JSONB DEFAULT '{}',
  "yearProjections" JSONB DEFAULT '[]',
  "recommendations" JSONB DEFAULT '{}',
  "narrative" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dynasty_manager_outlooks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "dynasty_manager_outlooks_key"
  ON "dynasty_manager_outlooks" ("leagueId", "managerId", "season");

-- Proactive chimmy messages (scheduled DMs to managers)
CREATE TABLE IF NOT EXISTS "chimmy_proactive_messages" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}',
  "isDelivered" BOOLEAN DEFAULT false,
  "deliveredAt" TIMESTAMPTZ,
  "scheduledFor" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chimmy_proactive_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "chimmy_proactive_messages_user_idx"
  ON "chimmy_proactive_messages" ("userId", "isDelivered");
CREATE INDEX IF NOT EXISTS "chimmy_proactive_messages_league_idx"
  ON "chimmy_proactive_messages" ("leagueId");

-- Injury alert feed cache (aggregated injury news)
CREATE TABLE IF NOT EXISTS "injury_alert_feed" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playerId" TEXT NOT NULL,
  "playerName" TEXT,
  "team" TEXT,
  "position" TEXT,
  "status" TEXT NOT NULL,
  "impact" TEXT DEFAULT 'medium',
  "source" TEXT,
  "reportedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "injury_alert_feed_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "injury_alert_feed_player_idx"
  ON "injury_alert_feed" ("playerId");
CREATE INDEX IF NOT EXISTS "injury_alert_feed_recent_idx"
  ON "injury_alert_feed" ("reportedAt" DESC);

-- Social card generation log
CREATE TABLE IF NOT EXISTS "chimmy_social_cards" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT,
  "cardType" TEXT NOT NULL,
  "content" JSONB DEFAULT '{}',
  "imageUrl" TEXT,
  "isGenerated" BOOLEAN DEFAULT false,
  "generatedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chimmy_social_cards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "chimmy_social_cards_league_idx"
  ON "chimmy_social_cards" ("leagueId");
