-- -----------------------------------------------------------------------------
-- Idempotent: ensure sport_type exists on tables that may predate the column.
-- When CREATE TABLE IF NOT EXISTS skips (table already there), new columns are not
-- applied — indexes on sport_type then fail with 42703.
-- Run as part of full baseline, or standalone after partial migrations.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- -----------------------------------------------------------------------------

ALTER TABLE "rankings_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "roster_templates" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "scoring_templates" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "sport_feature_flags" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "schedule_templates" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "season_calendars" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "game_schedules" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "player_game_stats" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "team_game_stats" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "stat_ingestion_jobs" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(12);
ALTER TABLE "waiver_claims" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "waiver_transactions" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_picks" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_prediction_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "draft_retrospectives" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "league_draft_calibrations" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "season_forecast_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "dynasty_projection_snapshots" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
ALTER TABLE "team_window_profiles" ADD COLUMN IF NOT EXISTS "sport_type" VARCHAR(16);
