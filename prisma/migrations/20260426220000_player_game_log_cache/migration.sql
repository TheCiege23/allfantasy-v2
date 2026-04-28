-- CreateTable: player_game_log_cache
-- DB-first cache for per-player weekly game log payloads (Sleeper NFL stats).
-- Eliminates live Sleeper API calls on every PlayerDetailModal open.

CREATE TABLE IF NOT EXISTS "player_game_log_cache" (
  "id" TEXT NOT NULL,
  "player_id" VARCHAR(128) NOT NULL,
  "sport" VARCHAR(16) NOT NULL,
  "season" VARCHAR(16) NOT NULL,
  "season_type" VARCHAR(24) NOT NULL DEFAULT 'regular',
  "payload" JSONB NOT NULL,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_game_log_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_player_game_log_cache"
  ON "player_game_log_cache"("player_id", "sport", "season", "season_type");

CREATE INDEX IF NOT EXISTS "player_game_log_cache_player_id_sport_idx"
  ON "player_game_log_cache"("player_id", "sport");

CREATE INDEX IF NOT EXISTS "player_game_log_cache_expires_at_idx"
  ON "player_game_log_cache"("expires_at");
