-- =============================================================================
-- supabase_ensure_news_notifications.sql
-- Player news notification tables. Safe to re-run.
-- =============================================================================

-- Player news notifications (per user, per news event)
CREATE TABLE IF NOT EXISTS "player_news_notifications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "playerName" TEXT NOT NULL,
  "team" TEXT,
  "headline" TEXT NOT NULL,
  "body" TEXT,
  "category" TEXT NOT NULL,
  "impact" TEXT DEFAULT 'medium',
  "sport" TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMPTZ,
  "isPushed" BOOLEAN DEFAULT false,
  "pushedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_news_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "player_news_notifications_user_idx"
  ON "player_news_notifications" ("userId", "isRead");
CREATE INDEX IF NOT EXISTS "player_news_notifications_player_idx"
  ON "player_news_notifications" ("playerName", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "player_news_notifications_recent_idx"
  ON "player_news_notifications" ("createdAt" DESC);

-- X API news ingestion run log
CREATE TABLE IF NOT EXISTS "x_news_ingestion_runs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sport" TEXT,
  "fetched" INTEGER DEFAULT 0,
  "newRecords" INTEGER DEFAULT 0,
  "duplicatesSkipped" INTEGER DEFAULT 0,
  "injuryRecords" INTEGER DEFAULT 0,
  "notificationsSent" INTEGER DEFAULT 0,
  "errors" TEXT[] DEFAULT '{}',
  "runAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "x_news_ingestion_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "x_news_ingestion_runs_recent_idx"
  ON "x_news_ingestion_runs" ("runAt" DESC);
