CREATE TABLE IF NOT EXISTS "sports_players" (
  "id" VARCHAR(128) NOT NULL,
  "sport" VARCHAR(16) NOT NULL,
  "name" VARCHAR(128) NOT NULL,
  "team" VARCHAR(32) NOT NULL,
  "position" VARCHAR(32) NOT NULL,
  "stats" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "projections" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "adp" DOUBLE PRECISION,
  "dynasty_value" INTEGER,
  "injury_status" VARCHAR(32),
  "injury_notes" TEXT,
  "news" JSONB,
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data_source" VARCHAR(32) NOT NULL,
  CONSTRAINT "sports_players_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sports_players_sport_team_idx" ON "sports_players" ("sport", "team");
CREATE INDEX IF NOT EXISTS "sports_players_sport_position_idx" ON "sports_players" ("sport", "position");
CREATE INDEX IF NOT EXISTS "sports_players_sport_name_idx" ON "sports_players" ("sport", "name");
CREATE INDEX IF NOT EXISTS "sports_players_last_updated_idx" ON "sports_players" ("last_updated");

CREATE TABLE IF NOT EXISTS "injury_reports" (
  "id" TEXT NOT NULL,
  "sport" VARCHAR(16) NOT NULL,
  "player_id" VARCHAR(128) NOT NULL,
  "player_name" VARCHAR(128) NOT NULL,
  "team" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL,
  "body_part" VARCHAR(64),
  "notes" TEXT,
  "practice" VARCHAR(32),
  "game_status" VARCHAR(32),
  "report_date" TIMESTAMP(3) NOT NULL,
  "week" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "injury_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_injury_reports_player_report_status" ON "injury_reports" ("sport", "player_id", "report_date", "status");
CREATE INDEX IF NOT EXISTS "injury_reports_sport_week_report_date_idx" ON "injury_reports" ("sport", "week", "report_date");
CREATE INDEX IF NOT EXISTS "injury_reports_sport_player_report_date_idx" ON "injury_reports" ("sport", "player_id", "report_date");

ALTER TABLE "game_schedules" ADD COLUMN IF NOT EXISTS "venue" VARCHAR(128);
ALTER TABLE "game_schedules" ADD COLUMN IF NOT EXISTS "weather" JSONB;
ALTER TABLE "game_schedules" ADD COLUMN IF NOT EXISTS "home_score" INTEGER;
ALTER TABLE "game_schedules" ADD COLUMN IF NOT EXISTS "away_score" INTEGER;

CREATE TABLE IF NOT EXISTS "adp_data" (
  "id" TEXT NOT NULL,
  "sport" VARCHAR(16) NOT NULL,
  "format" VARCHAR(32) NOT NULL,
  "scoring" VARCHAR(32) NOT NULL,
  "player_id" VARCHAR(128) NOT NULL,
  "player_name" VARCHAR(128) NOT NULL,
  "position" VARCHAR(32) NOT NULL,
  "team" VARCHAR(32) NOT NULL,
  "adp" DOUBLE PRECISION NOT NULL,
  "adp_change" DOUBLE PRECISION,
  "week" INTEGER NOT NULL,
  "season" INTEGER NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "adp_data_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_adp_data_player_period_source" ON "adp_data" ("sport", "format", "scoring", "player_id", "week", "season", "source");
CREATE INDEX IF NOT EXISTS "adp_data_sport_format_scoring_week_season_idx" ON "adp_data" ("sport", "format", "scoring", "week", "season");
CREATE INDEX IF NOT EXISTS "adp_data_player_created_idx" ON "adp_data" ("player_id", "created_at");

CREATE TABLE IF NOT EXISTS "player_news" (
  "id" TEXT NOT NULL,
  "sport" VARCHAR(16) NOT NULL,
  "player_id" VARCHAR(128),
  "player_name" VARCHAR(128) NOT NULL,
  "team" VARCHAR(32),
  "headline" VARCHAR(256) NOT NULL,
  "body" TEXT NOT NULL,
  "impact" VARCHAR(16) NOT NULL,
  "fantasy_relevant" BOOLEAN NOT NULL DEFAULT false,
  "source" VARCHAR(32) NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_news_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_player_news_dedupe" ON "player_news" ("sport", "player_name", "headline", "published_at");
CREATE INDEX IF NOT EXISTS "player_news_sport_published_idx" ON "player_news" ("sport", "published_at");
CREATE INDEX IF NOT EXISTS "player_news_player_published_idx" ON "player_news" ("player_id", "published_at");

CREATE TABLE IF NOT EXISTS "api_rate_limits" (
  "id" TEXT NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "endpoint" VARCHAR(128) NOT NULL,
  "calls_made" INTEGER NOT NULL DEFAULT 0,
  "calls_limit" INTEGER NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "window_end" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_api_rate_limits_window" ON "api_rate_limits" ("provider", "endpoint", "window_start", "window_end");
CREATE INDEX IF NOT EXISTS "api_rate_limits_provider_window_idx" ON "api_rate_limits" ("provider", "window_start", "window_end");

CREATE TABLE IF NOT EXISTS "api_call_log" (
  "id" TEXT NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "endpoint" VARCHAR(128) NOT NULL,
  "status" INTEGER NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "error" TEXT,
  "cached" BOOLEAN NOT NULL DEFAULT false,
  "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_call_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_call_log_provider_called_idx" ON "api_call_log" ("provider", "called_at");
CREATE INDEX IF NOT EXISTS "api_call_log_provider_endpoint_called_idx" ON "api_call_log" ("provider", "endpoint", "called_at");
