ALTER TABLE "sports_players"
  ADD COLUMN IF NOT EXISTS "headshot_url" TEXT,
  ADD COLUMN IF NOT EXISTS "headshot_url_sm" TEXT,
  ADD COLUMN IF NOT EXISTS "headshot_url_lg" TEXT,
  ADD COLUMN IF NOT EXISTS "headshot_source" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT;

CREATE TABLE IF NOT EXISTS "team_assets" (
  "id" TEXT NOT NULL,
  "sport" VARCHAR(16) NOT NULL,
  "team_code" VARCHAR(32) NOT NULL,
  "team_name" VARCHAR(128) NOT NULL,
  "logo_url" TEXT,
  "logo_url_sm" TEXT,
  "logo_url_lg" TEXT,
  "logo_source" VARCHAR(32),
  "primary_color" VARCHAR(32),
  "secondary_color" VARCHAR(32),
  "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_team_assets_sport_team_code"
  ON "team_assets" ("sport", "team_code");

CREATE INDEX IF NOT EXISTS "team_assets_sport_idx"
  ON "team_assets" ("sport");
