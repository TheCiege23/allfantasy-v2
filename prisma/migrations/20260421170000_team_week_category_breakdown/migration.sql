-- H2H-category scoring: per-week category breakdown on TeamWeekResult.
-- Null for existing points-mode rows; populated by weeklyProcessor + matchupEngine
-- when league settings.scoring_mode = 'h2h_category'.
ALTER TABLE "team_week_results" ADD COLUMN IF NOT EXISTS "categoryBreakdown" JSONB;
