-- Phase 1: ADP consensus metadata on adp_data rows.
ALTER TABLE "adp_data"
  ADD COLUMN IF NOT EXISTS "provider_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "adp_spread" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "confidence_score" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "provider_breakdown" JSONB;

CREATE INDEX IF NOT EXISTS "adp_data_source_sport_format_scoring_period_idx"
  ON "adp_data"("source", "sport", "format", "scoring", "season", "week");
