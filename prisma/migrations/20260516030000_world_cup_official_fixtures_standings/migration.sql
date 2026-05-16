-- Store provider-backed official World Cup fixtures separately from bracket pick matches.
-- Group-stage fixtures are not bracket picks, so they must not be forced into world_cup_bracket_matches.

CREATE TABLE "world_cup_official_fixtures" (
  "id" TEXT NOT NULL,
  "provider_name" VARCHAR(32) NOT NULL,
  "provider_fixture_id" VARCHAR(64) NOT NULL,
  "season_year" INTEGER NOT NULL,
  "tournament_key" TEXT NOT NULL DEFAULT 'fifa_world_cup',
  "round" TEXT,
  "stage" TEXT,
  "group_name" TEXT,
  "starts_at" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "api_status_short" TEXT,
  "elapsed_minute" INTEGER,
  "injury_time" INTEGER,
  "period" TEXT,
  "venue_name" TEXT,
  "venue_city" TEXT,
  "home_team_id" TEXT,
  "away_team_id" TEXT,
  "winner_team_id" TEXT,
  "home_provider_id" VARCHAR(64),
  "away_provider_id" VARCHAR(64),
  "winner_provider_id" VARCHAR(64),
  "home_team_name" TEXT,
  "away_team_name" TEXT,
  "winner_team_name" TEXT,
  "home_team_logo" TEXT,
  "away_team_logo" TEXT,
  "home_score" INTEGER,
  "away_score" INTEGER,
  "home_penalty_score" INTEGER,
  "away_penalty_score" INTEGER,
  "source_payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "world_cup_official_fixtures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "world_cup_official_fixtures_provider_name_season_year_provider_fixture_id_key"
  ON "world_cup_official_fixtures"("provider_name", "season_year", "provider_fixture_id");
CREATE INDEX "world_cup_official_fixtures_season_year_tournament_key_idx" ON "world_cup_official_fixtures"("season_year", "tournament_key");
CREATE INDEX "world_cup_official_fixtures_starts_at_idx" ON "world_cup_official_fixtures"("starts_at");
CREATE INDEX "world_cup_official_fixtures_round_idx" ON "world_cup_official_fixtures"("round");
CREATE INDEX "world_cup_official_fixtures_stage_idx" ON "world_cup_official_fixtures"("stage");
CREATE INDEX "world_cup_official_fixtures_group_name_idx" ON "world_cup_official_fixtures"("group_name");
CREATE INDEX "world_cup_official_fixtures_status_idx" ON "world_cup_official_fixtures"("status");
CREATE INDEX "world_cup_official_fixtures_home_team_id_idx" ON "world_cup_official_fixtures"("home_team_id");
CREATE INDEX "world_cup_official_fixtures_away_team_id_idx" ON "world_cup_official_fixtures"("away_team_id");

ALTER TABLE "world_cup_official_fixtures"
  ADD CONSTRAINT "world_cup_official_fixtures_home_team_id_fkey"
  FOREIGN KEY ("home_team_id") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_official_fixtures"
  ADD CONSTRAINT "world_cup_official_fixtures_away_team_id_fkey"
  FOREIGN KEY ("away_team_id") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "world_cup_official_fixtures"
  ADD CONSTRAINT "world_cup_official_fixtures_winner_team_id_fkey"
  FOREIGN KEY ("winner_team_id") REFERENCES "world_cup_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "world_cup_official_group_standings" (
  "id" TEXT NOT NULL,
  "provider_name" VARCHAR(32) NOT NULL,
  "season_year" INTEGER NOT NULL,
  "tournament_key" TEXT NOT NULL DEFAULT 'fifa_world_cup',
  "group_name" VARCHAR(8) NOT NULL,
  "team_id" TEXT NOT NULL,
  "provider_team_id" VARCHAR(64),
  "team_name" TEXT NOT NULL,
  "actual_rank" INTEGER,
  "points" INTEGER NOT NULL DEFAULT 0,
  "goal_difference" INTEGER NOT NULL DEFAULT 0,
  "goals_for" INTEGER NOT NULL DEFAULT 0,
  "goals_against" INTEGER NOT NULL DEFAULT 0,
  "played" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "is_third_place_advancer" BOOLEAN NOT NULL DEFAULT false,
  "source_payload" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "world_cup_official_group_standings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "world_cup_official_group_standings_provider_name_season_year_group_name_team_id_key"
  ON "world_cup_official_group_standings"("provider_name", "season_year", "group_name", "team_id");
CREATE INDEX "world_cup_official_group_standings_season_year_tournament_key_idx" ON "world_cup_official_group_standings"("season_year", "tournament_key");
CREATE INDEX "world_cup_official_group_standings_team_id_idx" ON "world_cup_official_group_standings"("team_id");
CREATE INDEX "world_cup_official_group_standings_group_name_actual_rank_idx" ON "world_cup_official_group_standings"("group_name", "actual_rank");
CREATE INDEX "world_cup_official_group_standings_is_third_place_advancer_idx" ON "world_cup_official_group_standings"("is_third_place_advancer");

ALTER TABLE "world_cup_official_group_standings"
  ADD CONSTRAINT "world_cup_official_group_standings_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "world_cup_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
