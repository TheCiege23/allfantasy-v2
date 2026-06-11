-- CreateTable: WorldCupPlayer
-- Stores verified roster/squad data for World Cup teams synced from provider.
-- Intentionally separate from the existing InjuryReportRecord table (which stores
-- per-player injury events) so player identity and injury state stay loosely coupled.

CREATE TABLE "world_cup_players" (
    "id" TEXT NOT NULL,
    "provider_player_id" VARCHAR(64) NOT NULL,
    "source_provider" VARCHAR(32) NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "short_name" VARCHAR(64),
    "position" VARCHAR(32),
    "position_code" VARCHAR(8),
    "shirt_number" INTEGER,
    "birth_date" TIMESTAMP(3),
    "age" INTEGER,
    "club" VARCHAR(64),
    "nationality" VARCHAR(64),
    "photo_url" TEXT,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source_payload" JSONB,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_cup_players_pkey" PRIMARY KEY ("id")
);

-- Unique: one canonical player row per provider+player combo
CREATE UNIQUE INDEX "uniq_wc_player_provider"
    ON "world_cup_players"("provider_player_id", "source_provider");

CREATE INDEX "world_cup_players_team_id_idx"
    ON "world_cup_players"("team_id");

CREATE INDEX "world_cup_players_team_position_idx"
    ON "world_cup_players"("team_id", "position_code");

CREATE INDEX "world_cup_players_name_idx"
    ON "world_cup_players"("name");

CREATE INDEX "world_cup_players_captain_idx"
    ON "world_cup_players"("is_captain");

-- FK to world_cup_teams
ALTER TABLE "world_cup_players"
    ADD CONSTRAINT "world_cup_players_team_id_fkey"
    FOREIGN KEY ("team_id")
    REFERENCES "world_cup_teams"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
