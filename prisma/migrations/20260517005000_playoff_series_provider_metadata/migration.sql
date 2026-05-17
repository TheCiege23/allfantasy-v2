ALTER TABLE "playoff_bracket_series"
  ADD COLUMN "home_team_wins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "away_team_wins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "series_summary" TEXT,
  ADD COLUMN "next_game_at" TIMESTAMP(3),
  ADD COLUMN "venue" TEXT,
  ADD COLUMN "broadcast_network" TEXT,
  ADD COLUMN "live_home_score" INTEGER,
  ADD COLUMN "live_away_score" INTEGER,
  ADD COLUMN "live_status" TEXT,
  ADD COLUMN "provider_games_json" JSONB,
  ADD COLUMN "last_synced_at" TIMESTAMP(3);
