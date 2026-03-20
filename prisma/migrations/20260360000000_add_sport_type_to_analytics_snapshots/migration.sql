ALTER TABLE "rankings_snapshots"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "draft_prediction_snapshots"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "draft_retrospectives"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "league_draft_calibrations"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "season_forecast_snapshots"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "dynasty_projection_snapshots"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

ALTER TABLE "team_window_profiles"
ADD COLUMN IF NOT EXISTS "sportType" VARCHAR(16);

UPDATE "rankings_snapshots" rs
SET "sportType" = COALESCE(
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = rs."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = rs."leagueId" LIMIT 1)
)
WHERE rs."sportType" IS NULL;

UPDATE "draft_prediction_snapshots" dps
SET "sportType" = COALESCE(
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = dps."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = dps."leagueId" LIMIT 1)
)
WHERE dps."sportType" IS NULL;

UPDATE "league_draft_calibrations" ldc
SET "sportType" = COALESCE(
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = ldc."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = ldc."leagueId" LIMIT 1)
)
WHERE ldc."sportType" IS NULL;

UPDATE "season_forecast_snapshots" sfs
SET "sportType" = COALESCE(
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = sfs."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = sfs."leagueId" LIMIT 1)
)
WHERE sfs."sportType" IS NULL;

UPDATE "dynasty_projection_snapshots" dps
SET "sportType" = COALESCE(
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = dps."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = dps."leagueId" LIMIT 1)
)
WHERE dps."sportType" IS NULL;

UPDATE "team_window_profiles" twp
SET "sportType" = COALESCE(
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = twp."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = twp."leagueId" LIMIT 1)
)
WHERE twp."sportType" IS NULL;

UPDATE "draft_retrospectives" dr
SET "sportType" = COALESCE(
  (SELECT dps."sportType" FROM "draft_prediction_snapshots" dps WHERE dps."id" = dr."snapshotId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."id" = dr."leagueId" LIMIT 1),
  (SELECT l."sport"::text FROM "leagues" l WHERE l."platformLeagueId" = dr."leagueId" LIMIT 1)
)
WHERE dr."sportType" IS NULL;

CREATE INDEX IF NOT EXISTS "rankings_snapshots_leagueId_sportType_season_week_idx"
  ON "rankings_snapshots" ("leagueId", "sportType", "season", "week");

CREATE INDEX IF NOT EXISTS "rankings_snapshots_sportType_season_week_idx"
  ON "rankings_snapshots" ("sportType", "season", "week");

CREATE INDEX IF NOT EXISTS "draft_prediction_snapshots_leagueId_sportType_season_idx"
  ON "draft_prediction_snapshots" ("leagueId", "sportType", "season");

CREATE INDEX IF NOT EXISTS "draft_prediction_snapshots_sportType_season_idx"
  ON "draft_prediction_snapshots" ("sportType", "season");

CREATE INDEX IF NOT EXISTS "draft_retrospectives_leagueId_sportType_season_idx"
  ON "draft_retrospectives" ("leagueId", "sportType", "season");

CREATE INDEX IF NOT EXISTS "draft_retrospectives_sportType_season_idx"
  ON "draft_retrospectives" ("sportType", "season");

CREATE INDEX IF NOT EXISTS "league_draft_calibrations_leagueId_sportType_season_idx"
  ON "league_draft_calibrations" ("leagueId", "sportType", "season");

CREATE INDEX IF NOT EXISTS "league_draft_calibrations_sportType_season_idx"
  ON "league_draft_calibrations" ("sportType", "season");

CREATE INDEX IF NOT EXISTS "season_forecast_snapshots_leagueId_sportType_season_week_idx"
  ON "season_forecast_snapshots" ("leagueId", "sportType", "season", "week");

CREATE INDEX IF NOT EXISTS "season_forecast_snapshots_sportType_season_week_idx"
  ON "season_forecast_snapshots" ("sportType", "season", "week");

CREATE INDEX IF NOT EXISTS "dynasty_projection_snapshots_leagueId_sportType_season_idx"
  ON "dynasty_projection_snapshots" ("leagueId", "sportType", "season");

CREATE INDEX IF NOT EXISTS "dynasty_projection_snapshots_sportType_season_idx"
  ON "dynasty_projection_snapshots" ("sportType", "season");

CREATE INDEX IF NOT EXISTS "team_window_profiles_leagueId_sportType_season_idx"
  ON "team_window_profiles" ("leagueId", "sportType", "season");

CREATE INDEX IF NOT EXISTS "team_window_profiles_sportType_season_idx"
  ON "team_window_profiles" ("sportType", "season");
